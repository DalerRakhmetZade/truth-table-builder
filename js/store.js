// Runtime app state, id counters, factories, and persistence.
import { migrateState, normalizeState, syncVarNames } from "./logic.js";

export const STORAGE_KEY = "truthTableBuilder.v1";

let nextTableId = 1;
let nextColId = 1;

// Shared mutable runtime singletons.
export const app = { state: null, lastFocusedInput: null };

export function makeTable(title) {
  const id = nextTableId++;
  return {
    id: id,
    title: title || ("Table " + id),
    varCount: 2,
    varNames: syncVarNames([], 2),
    columns: [],
  };
}

// New columns default to Practice mode so the answer is never auto-revealed.
export function makeColumn() {
  return { id: nextColId++, expr: "", cells: {}, overridden: false, practice: true, results: {} };
}

export function getTable(id) { return app.state.tables.find((t) => t.id === Number(id)); }
export function getCol(table, id) { return table.columns.find((c) => c.id === Number(id)); }

export function saveState() {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(app.state)); } catch (e) {}
}

function loadStored() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return migrateState(JSON.parse(raw));
  } catch (e) { return null; }
}

export function initState() {
  app.state = loadStored() || { tables: [makeTable("Table 1")] };
  const norm = normalizeState(app.state);
  nextTableId = Math.max(nextTableId, norm.nextTableId);
  nextColId = Math.max(nextColId, norm.nextColId);
}

export function resetState() {
  nextTableId = 1;
  nextColId = 1;
  app.state = { tables: [makeTable("Table 1")] };
}
