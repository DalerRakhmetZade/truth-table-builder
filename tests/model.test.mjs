import test from "node:test";
import assert from "node:assert/strict";
import {
  generateRows, syncVarNames, defaultName, renameInExpr, tableToText,
  migrateState, normalizeState, MAX_VARS,
} from "../js/logic.js";

test("generateRows: count, ordering, MSB-first, top all-true", () => {
  const rows = generateRows(["p", "q"]);
  assert.equal(rows.length, 4);
  assert.deepEqual(rows[0], { p: true, q: true });
  assert.deepEqual(rows[3], { p: false, q: false });
  assert.deepEqual(rows.map((r) => r.p), [true, true, false, false]);
  assert.deepEqual(rows.map((r) => r.q), [true, false, true, false]);
});

test("generateRows: 3 variables = 8 rows", () => {
  assert.equal(generateRows(["a", "b", "c"]).length, 8);
});

test("syncVarNames grows with uppercase defaults and shrinks preserving names", () => {
  assert.deepEqual(syncVarNames([], 3), ["P", "Q", "R"]);
  assert.deepEqual(syncVarNames(["x"], 3), ["x", "Q", "R"]);
  assert.deepEqual(syncVarNames(["a", "b", "c", "d"], 2), ["a", "b"]);
  assert.deepEqual(syncVarNames(null, 2), ["P", "Q"]);
});

test("defaultName: uppercase, skips T and F, falls back past the list", () => {
  assert.equal(defaultName(0), "P");
  assert.equal(defaultName(4), "U");           // 5th default skips T
  assert.ok(!["T", "F"].includes(defaultName(3)));
  assert.equal(defaultName(13), "D");
  assert.equal(defaultName(14), "V15");
});

test("migrateState migrates the old single-table format", () => {
  const old = {
    varCount: 3,
    varNames: ["a", "b", "c"],
    columns: [{ id: 1, expr: "a & b", cells: {}, overridden: false }],
  };
  const s = migrateState(old);
  assert.equal(s.tables.length, 1);
  assert.equal(s.tables[0].varCount, 3);
  assert.deepEqual(s.tables[0].varNames, ["a", "b", "c"]);
  assert.equal(s.tables[0].columns[0].expr, "a & b");
});

test("migrateState passes through the new multi-table format", () => {
  const data = {
    tables: [
      { id: 5, title: "First", varCount: 2, varNames: ["p", "q"], columns: [] },
      { id: 6, title: "Second", varCount: 1, varNames: ["x"], columns: [] },
    ],
  };
  const s = migrateState(data);
  assert.equal(s.tables.length, 2);
  assert.equal(s.tables[1].title, "Second");
});

test("migrateState rejects garbage", () => {
  assert.equal(migrateState(null), null);
  assert.equal(migrateState({ tables: [] }), null);
  assert.equal(migrateState({ foo: "bar" }), null);
});

test("normalizeState repairs malformed tables and reports next ids", () => {
  const state = { tables: [{ id: 2, title: "Broken" }] }; // no varCount/columns/varNames
  const { state: out, nextTableId, nextColId } = normalizeState(state);
  const t = out.tables[0];
  assert.ok(Array.isArray(t.columns));
  assert.ok(t.varCount >= 1);
  assert.ok(Array.isArray(t.varNames) && t.varNames.length === t.varCount);
  assert.equal(nextTableId, 3);
  assert.equal(nextColId, 1);
});

test("normalizeState clamps oversized varCount to MAX_VARS", () => {
  const state = { tables: [{ id: 1, title: "Big", varCount: 14, columns: [] }] };
  const { state: out } = normalizeState(state);
  assert.equal(out.tables[0].varCount, MAX_VARS);
  assert.equal(out.tables[0].varNames.length, MAX_VARS);
});

test("normalizeState upgrades lowercase variable names to uppercase", () => {
  const state = { tables: [{ id: 1, title: "Old", varCount: 2, varNames: ["p", "q"], columns: [] }] };
  const { state: out } = normalizeState(state);
  assert.deepEqual(out.tables[0].varNames, ["P", "Q"]);
});

test("renameInExpr replaces whole identifiers only", () => {
  assert.equal(renameInExpr("p → (q ∧ ¬p)", "p", "rain"), "rain → (q ∧ ¬rain)");
  assert.equal(renameInExpr("pq ∧ p", "p", "x"), "pq ∧ x");
  assert.equal(renameInExpr("p1 ∧ p", "p", "x"), "p1 ∧ x");
  assert.equal(renameInExpr("", "p", "x"), "");
});

test("tableToText: includes title, headers, auto + manual cells", () => {
  const t = {
    title: "My Table", varCount: 2, varNames: ["p", "q"],
    columns: [
      { id: 1, expr: "p -> q", cells: {}, overridden: false },
      { id: 2, expr: "", cells: { 0: "T", 3: "F" }, overridden: false },
    ],
  };
  const txt = tableToText(t);
  const lines = txt.split("\n");
  assert.equal(lines[0], "My Table");
  assert.match(txt, /\bp\b/);
  assert.match(txt, /p -> q/);
  const dataRows = lines.filter((l) => /^\|/.test(l)).slice(1);
  const autoCol = dataRows.map((l) => l.split("|").map((s) => s.trim())[3]);
  assert.deepEqual(autoCol, ["T", "F", "T", "T"]);
  const manualCol = dataRows.map((l) => l.split("|").map((s) => s.trim())[4]);
  assert.deepEqual(manualCol, ["T", "", "", "F"]);
});

test("overridden column uses manual cells, ignoring the expression", () => {
  const t = {
    title: "T", varNames: ["p", "q"], varCount: 2,
    columns: [{ id: 1, expr: "p & q", cells: { 0: "F", 1: "T" }, overridden: true }],
  };
  const txt = tableToText(t);
  const dataRows = txt.split("\n").filter((l) => /^\|/.test(l)).slice(1);
  const col = dataRows.map((l) => l.split("|").map((s) => s.trim())[3]);
  assert.deepEqual(col, ["F", "T", "", ""]);
});
