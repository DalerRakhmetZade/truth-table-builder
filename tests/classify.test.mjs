import test from "node:test";
import assert from "node:assert/strict";
import { compile, evalAst } from "../js/parser.js";
import { columnTruth, classify, equivalenceGroups } from "../js/logic.js";

const N = ["p", "q"];
const truth = (expr, names) => columnTruth(compile(expr, names).ast, names);

test("classify: tautology (always true)", () => {
  assert.equal(classify(truth("p ∨ ¬p", ["p"])), "tautology");
  assert.equal(classify(truth("p → p", ["p"])), "tautology");
  assert.equal(classify(truth("(p → q) ∨ (q → p)", N)), "tautology");
});

test("classify: unsatisfiable (always false)", () => {
  assert.equal(classify(truth("p ∧ ¬p", ["p"])), "unsatisfiable");
  assert.equal(classify(truth("p ↔ ¬p", ["p"])), "unsatisfiable");
});

test("classify: satisfiable / contingent (sometimes true)", () => {
  assert.equal(classify(truth("p ∧ q", N)), "satisfiable");
  assert.equal(classify(truth("p → q", N)), "satisfiable");
});

test("⊤ and ⊥ parse as constants true/false", () => {
  assert.equal(classify(truth("⊤", [])), "tautology");
  assert.equal(classify(truth("⊥", [])), "unsatisfiable");
  assert.equal(evalAst(compile("p ∨ ⊤", ["p"]).ast, { p: false }), true);
  assert.equal(evalAst(compile("p ∧ ⊥", ["p"]).ast, { p: true }), false);
});

test("equivalenceGroups: groups identical truth columns, labels A/B…", () => {
  const items = [
    { id: 1, truth: truth("p → q", N) },         // T F T T
    { id: 2, truth: truth("¬q → ¬p", N) },        // contrapositive ≡ #1
    { id: 3, truth: truth("p ∧ q", N) },          // unique
    { id: 4, truth: truth("q → p", N) },          // converse
    { id: 5, truth: truth("¬p → ¬q", N) },        // inverse ≡ #4
  ];
  const g = equivalenceGroups(items);
  assert.equal(g.get(1), g.get(2));   // p→q ≡ contrapositive
  assert.equal(g.get(4), g.get(5));   // converse ≡ inverse
  assert.notEqual(g.get(1), g.get(4)); // the two groups differ
  assert.equal(g.has(3), false);       // singleton not labelled
  assert.equal(g.get(1), "A");         // first group is A
  assert.equal(g.get(4), "B");
});

test("equivalenceGroups: no groups when all distinct", () => {
  const items = [
    { id: 1, truth: truth("p ∧ q", N) },
    { id: 2, truth: truth("p ∨ q", N) },
  ];
  assert.equal(equivalenceGroups(items).size, 0);
});
