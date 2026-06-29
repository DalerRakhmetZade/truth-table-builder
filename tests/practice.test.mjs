import test from "node:test";
import assert from "node:assert/strict";
import { load } from "./harness.mjs";

const api = load();

// Helper: build the correct answer column for an expression over names.
function answers(expr, names) {
  const rows = api.generateRows(names);
  const c = api.compile(expr, names);
  return rows.map((r) => (api.evalAst(c.ast, r) ? "T" : "F"));
}

test("new columns default to Practice mode (answers not revealed)", () => {
  const col = api.makeColumn();
  assert.equal(col.practice, true);
  assert.equal(col.expr, "");
  assert.deepEqual(col.cells, {});
});

test("gradeColumn: all correct", () => {
  const names = ["p", "q"];
  const rows = api.generateRows(names);
  const c = api.compile("p ∧ q", names);
  const correct = answers("p ∧ q", names);
  const cells = {}; correct.forEach((v, i) => (cells[i] = v));
  const g = api.gradeColumn(c.ast, rows, cells);
  assert.equal(g.total, 4);
  assert.equal(g.correct, 4);
  assert.equal(g.incorrect, 0);
  assert.equal(g.blank, 0);
});

test("gradeColumn: counts correct, incorrect, blank", () => {
  const names = ["p", "q"];
  const rows = api.generateRows(names);
  const c = api.compile("p ∨ q", names); // answers: T T T F
  // guesses: T (ok), X-wrong F (incorrect), blank, F (ok)
  const cells = { 0: "T", 1: "F", 3: "F" };
  const g = api.gradeColumn(c.ast, rows, cells);
  assert.equal(g.correct, 2);   // rows 0 and 3
  assert.equal(g.incorrect, 1); // row 1 (guessed F, answer T)
  assert.equal(g.blank, 1);     // row 2 not answered
  assert.deepEqual(g.results, { 0: "correct", 1: "incorrect", 2: "blank", 3: "correct" });
});

test("gradeColumn: lowercase guesses are accepted (case-insensitive)", () => {
  const names = ["p"];
  const rows = api.generateRows(names);
  const c = api.compile("¬p", names); // answers: F T
  const cells = { 0: "f", 1: "t" };   // lowercase
  const g = api.gradeColumn(c.ast, rows, cells);
  assert.equal(g.correct, 2);
  assert.equal(g.incorrect, 0);
});

test("gradeColumn: empty cells map -> all blank", () => {
  const names = ["p", "q"];
  const rows = api.generateRows(names);
  const c = api.compile("p → q", names);
  const g = api.gradeColumn(c.ast, rows, {});
  assert.equal(g.blank, 4);
  assert.equal(g.correct, 0);
  assert.equal(g.incorrect, 0);
});

test("tableToText shows guesses (uppercased) for a practice column", () => {
  const t = api.makeTable("Practice");
  t.varNames = ["p", "q"]; t.varCount = 2;
  t.columns = [{ id: 1, expr: "p & q", cells: { 0: "t", 1: "f" }, practice: true }];
  const txt = api.tableToText(t);
  const dataRows = txt.split("\n").filter((l) => /^\|/.test(l)).slice(1);
  const col = dataRows.map((l) => l.split("|").map((s) => s.trim())[3]);
  // shows the (uppercased) guesses, not the computed p&q answers (T F F F)
  assert.deepEqual(col, ["T", "F", "", ""]);
});
