import test from "node:test";
import assert from "node:assert/strict";
import { compile, evalAst } from "../js/parser.js";
import { generateRows, gradeColumn, tableToText } from "../js/logic.js";
import { makeColumn } from "../js/store.js";

function answers(expr, names) {
  const rows = generateRows(names);
  const c = compile(expr, names);
  return rows.map((r) => (evalAst(c.ast, r) ? "T" : "F"));
}

test("makeColumn defaults to practice mode", () => {
  assert.equal(makeColumn().practice, true);
});

test("gradeColumn: all correct", () => {
  const names = ["p", "q"];
  const rows = generateRows(names);
  const c = compile("p ∧ q", names);
  const correct = answers("p ∧ q", names);
  const cells = {}; correct.forEach((v, i) => (cells[i] = v));
  const g = gradeColumn(c.ast, rows, cells);
  assert.equal(g.total, 4);
  assert.equal(g.correct, 4);
  assert.equal(g.incorrect, 0);
  assert.equal(g.blank, 0);
});

test("gradeColumn: counts correct, incorrect, blank", () => {
  const names = ["p", "q"];
  const rows = generateRows(names);
  const c = compile("p ∨ q", names); // answers: T T T F
  const cells = { 0: "T", 1: "F", 3: "F" };
  const g = gradeColumn(c.ast, rows, cells);
  assert.equal(g.correct, 2);
  assert.equal(g.incorrect, 1);
  assert.equal(g.blank, 1);
  assert.deepEqual(g.results, { 0: "correct", 1: "incorrect", 2: "blank", 3: "correct" });
});

test("gradeColumn: lowercase guesses are accepted (case-insensitive)", () => {
  const names = ["p"];
  const rows = generateRows(names);
  const c = compile("¬p", names); // answers: F T
  const cells = { 0: "f", 1: "t" };
  const g = gradeColumn(c.ast, rows, cells);
  assert.equal(g.correct, 2);
  assert.equal(g.incorrect, 0);
});

test("gradeColumn: empty cells map -> all blank", () => {
  const names = ["p", "q"];
  const rows = generateRows(names);
  const c = compile("p → q", names);
  const g = gradeColumn(c.ast, rows, {});
  assert.equal(g.blank, 4);
  assert.equal(g.correct, 0);
  assert.equal(g.incorrect, 0);
});

test("tableToText shows guesses (uppercased) for a practice column", () => {
  const t = {
    title: "Practice", varNames: ["p", "q"], varCount: 2,
    columns: [{ id: 1, expr: "p & q", cells: { 0: "t", 1: "f" }, practice: true }],
  };
  const txt = tableToText(t);
  const dataRows = txt.split("\n").filter((l) => /^\|/.test(l)).slice(1);
  const col = dataRows.map((l) => l.split("|").map((s) => s.trim())[3]);
  assert.deepEqual(col, ["T", "F", "", ""]);
});
