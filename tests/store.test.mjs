import test from "node:test";
import assert from "node:assert/strict";
import { makeTable, makeColumn, initState, resetState, app } from "../js/store.js";

// minimal localStorage stub for store persistence
function stubStorage(value) {
  globalThis.localStorage = {
    _v: value,
    getItem() { return this._v; },
    setItem(_k, v) { this._v = v; },
  };
}

test("makeTable has a sane default title matching its id", () => {
  const t = makeTable();
  assert.equal(typeof t.id, "number");
  assert.equal(t.title, "Table " + t.id);
  assert.equal(t.varCount, 2);
  assert.deepEqual(t.varNames, ["P", "Q"]);
  assert.deepEqual(t.columns, []);
});

test("new columns default to Practice mode (answers not revealed)", () => {
  const col = makeColumn();
  assert.equal(col.practice, true);
  assert.equal(col.expr, "");
  assert.deepEqual(col.cells, {});
});

test("initState with empty storage yields one table", () => {
  stubStorage(null);
  initState();
  assert.equal(app.state.tables.length, 1);
  assert.equal(app.state.tables[0].title, "Table 1");
});

test("initState migrates old single-table storage", () => {
  stubStorage(JSON.stringify({
    varCount: 2, varNames: ["p", "q"],
    columns: [{ id: 1, expr: "p & q", cells: {}, overridden: false }],
  }));
  initState();
  assert.equal(app.state.tables.length, 1);
  assert.equal(app.state.tables[0].columns[0].expr, "p & q");
});

test("resetState restores a single fresh table", () => {
  stubStorage(null);
  initState();
  app.state.tables.push(makeTable("Extra"));
  resetState();
  assert.equal(app.state.tables.length, 1);
  assert.equal(app.state.tables[0].title, "Table 1");
});
