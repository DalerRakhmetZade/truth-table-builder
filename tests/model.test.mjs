import test from "node:test";
import assert from "node:assert/strict";
import { load } from "./harness.mjs";

test("generateRows: count, ordering, MSB-first, top all-true", () => {
  const api = load();
  const rows = api.generateRows(["p", "q"]);
  assert.equal(rows.length, 4);
  // top row all true, bottom row all false
  assert.deepEqual(rows[0], { p: true, q: true });
  assert.deepEqual(rows[3], { p: false, q: false });
  // first variable (p) is most significant -> changes slowest
  assert.deepEqual(rows.map((r) => r.p), [true, true, false, false]);
  assert.deepEqual(rows.map((r) => r.q), [true, false, true, false]);
});

test("generateRows: 3 variables = 8 rows", () => {
  const api = load();
  assert.equal(api.generateRows(["a", "b", "c"]).length, 8);
});

test("syncVarNames grows with defaults and shrinks preserving names", () => {
  const api = load();
  assert.deepEqual(api.syncVarNames([], 3), ["p", "q", "r"]);
  // grow: keep existing, append defaults
  assert.deepEqual(api.syncVarNames(["x"], 3), ["x", "q", "r"]);
  // shrink: truncate
  assert.deepEqual(api.syncVarNames(["a", "b", "c", "d"], 2), ["a", "b"]);
  // null input is safe
  assert.deepEqual(api.syncVarNames(null, 2), ["p", "q"]);
});

test("defaultName falls back past the alphabet list", () => {
  const api = load();
  assert.equal(api.defaultName(0), "p");
  assert.equal(api.defaultName(13), "c");
  assert.equal(api.defaultName(14), "v15");
});

test("makeTable has a sane default title matching its id", () => {
  const api = load();
  const t = api.makeTable();
  assert.equal(typeof t.id, "number");
  assert.equal(t.title, "Table " + t.id);
  assert.equal(t.varCount, 2);
  assert.deepEqual(t.varNames, ["p", "q"]);
  assert.deepEqual(t.columns, []);
});

test("default state has one table when storage empty", () => {
  const api = load(null);
  const s = api.getState();
  assert.equal(s.tables.length, 1);
  assert.equal(s.tables[0].title, "Table 1");
});

test("loadState migrates the old single-table format", () => {
  const old = JSON.stringify({
    varCount: 3,
    varNames: ["a", "b", "c"],
    columns: [{ id: 1, expr: "a & b", cells: {}, overridden: false }],
  });
  const api = load(old);
  const s = api.getState();
  assert.equal(s.tables.length, 1);
  const t = s.tables[0];
  assert.equal(t.varCount, 3);
  assert.deepEqual(t.varNames, ["a", "b", "c"]);
  assert.equal(t.columns[0].expr, "a & b");
});

test("loadState passes through the new multi-table format", () => {
  const data = JSON.stringify({
    tables: [
      { id: 5, title: "First", varCount: 2, varNames: ["p", "q"], columns: [] },
      { id: 6, title: "Second", varCount: 1, varNames: ["x"], columns: [] },
    ],
  });
  const api = load(data);
  const s = api.getState();
  assert.equal(s.tables.length, 2);
  assert.equal(s.tables[1].title, "Second");
});

test("normalization repairs malformed loaded tables", () => {
  const data = JSON.stringify({ tables: [{ id: 2, title: "Broken" }] }); // no varCount/columns/varNames
  const api = load(data);
  const t = api.getState().tables[0];
  assert.ok(Array.isArray(t.columns));
  assert.ok(t.varCount >= 1);
  assert.ok(Array.isArray(t.varNames) && t.varNames.length === t.varCount);
});

test("renameInExpr replaces whole identifiers only", () => {
  const api = load();
  assert.equal(api.renameInExpr("p → (q ∧ ¬p)", "p", "rain"), "rain → (q ∧ ¬rain)");
  // must not touch a substring inside a longer identifier
  assert.equal(api.renameInExpr("pq ∧ p", "p", "x"), "pq ∧ x");
  assert.equal(api.renameInExpr("p1 ∧ p", "p", "x"), "p1 ∧ x");
  // empty/blank passthrough
  assert.equal(api.renameInExpr("", "p", "x"), "");
});

test("tableToText: includes title, headers, auto + manual cells", () => {
  const api = load();
  const t = api.makeTable("My Table");
  t.varCount = 2;
  t.varNames = ["p", "q"];
  t.columns = [
    { id: 1, expr: "p -> q", cells: {}, overridden: false },
    { id: 2, expr: "", cells: { 0: "T", 3: "F" }, overridden: false },
  ];
  const txt = api.tableToText(t);
  const lines = txt.split("\n");
  assert.equal(lines[0], "My Table");
  // header row contains variable names and the expression
  assert.match(txt, /\bp\b/);
  assert.match(txt, /p -> q/);
  // computed column for p->q is T F T T
  const dataRows = lines.filter((l) => /^\|/.test(l)).slice(1); // skip header
  const autoCol = dataRows.map((l) => l.split("|").map((s) => s.trim())[3]);
  assert.deepEqual(autoCol, ["T", "F", "T", "T"]);
  // manual column shows the values the user entered, blank elsewhere
  const manualCol = dataRows.map((l) => l.split("|").map((s) => s.trim())[4]);
  assert.deepEqual(manualCol, ["T", "", "", "F"]);
});

test("overridden column uses manual cells, ignoring the expression", () => {
  const api = load();
  const t = api.makeTable("T");
  t.varNames = ["p", "q"]; t.varCount = 2;
  t.columns = [{ id: 1, expr: "p & q", cells: { 0: "F", 1: "T" }, overridden: true }];
  const txt = api.tableToText(t);
  const dataRows = txt.split("\n").filter((l) => /^\|/.test(l)).slice(1);
  const col = dataRows.map((l) => l.split("|").map((s) => s.trim())[3]);
  assert.deepEqual(col, ["F", "T", "", ""]);
});
