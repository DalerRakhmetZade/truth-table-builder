import test from "node:test";
import assert from "node:assert/strict";
import { compile, evalAst, collectVars } from "../js/parser.js";
import { generateRows } from "../js/logic.js";

// Compute the T/F column string for an expression over given var names.
function column(expr, names) {
  const rows = generateRows(names);
  const c = compile(expr, names);
  return rows.map((r) => (evalAst(c.ast, r) ? "T" : "F")).join("");
}

const PQ = ["p", "q"];
const PQR = ["p", "q", "r"];

test("single variable and negation", () => {
  assert.equal(column("p", ["p"]), "TF");
  assert.equal(column("¬p", ["p"]), "FT");
  assert.equal(column("~p", ["p"]), "FT");
  assert.equal(column("!p", ["p"]), "FT");
});

test("basic binary operators (symbols)", () => {
  assert.equal(column("p ∧ q", PQ), "TFFF");
  assert.equal(column("p ∨ q", PQ), "TTTF");
  assert.equal(column("p → q", PQ), "TFTT");
  assert.equal(column("p ↔ q", PQ), "TFFT");
  assert.equal(column("p ⊕ q", PQ), "FTTF");
});

test("ASCII aliases match symbol versions", () => {
  assert.equal(column("p & q", PQ), column("p ∧ q", PQ));
  assert.equal(column("p * q", PQ), column("p ∧ q", PQ));
  assert.equal(column("p . q", PQ), column("p ∧ q", PQ));
  assert.equal(column("p | q", PQ), column("p ∨ q", PQ));
  assert.equal(column("p + q", PQ), column("p ∨ q", PQ));
  assert.equal(column("p ^ q", PQ), column("p ⊕ q", PQ));
  assert.equal(column("p -> q", PQ), column("p → q", PQ));
  assert.equal(column("p <-> q", PQ), column("p ↔ q", PQ));
  assert.equal(column("p = q", PQ), column("p ↔ q", PQ));
});

test("precedence: NOT > AND > OR/XOR > IMP > IFF", () => {
  assert.equal(column("¬p ∧ q", PQ), column("(¬p) ∧ q", PQ));
  assert.equal(column("p ∧ q ∨ r", PQR), column("(p ∧ q) ∨ r", PQR));
  assert.equal(column("p ∨ q → r", PQR), column("(p ∨ q) → r", PQR));
  assert.equal(column("p → q ↔ r", PQR), column("(p → q) ↔ r", PQR));
});

test("implication is right-associative", () => {
  assert.equal(column("p → q → r", PQR), column("p → (q → r)", PQR));
  assert.notEqual(column("p → q → r", PQR), column("(p → q) → r", PQR));
});

test("iff is left-associative", () => {
  assert.equal(column("p ↔ q ↔ r", PQR), column("(p ↔ q) ↔ r", PQR));
});

test("parentheses and double negation", () => {
  assert.equal(column("¬(p ∨ q)", PQ), "FFFT");
  assert.equal(column("¬¬p", ["p"]), "TF");
  assert.equal(column("¬(p ∧ q)", PQ), "FTTT");
});

test("constants T/F/1/0", () => {
  assert.equal(column("T", []), "T");
  assert.equal(column("F", []), "F");
  assert.equal(column("1", []), "T");
  assert.equal(column("0", []), "F");
  assert.equal(column("p ∨ T", ["p"]), "TT");
  assert.equal(column("p ∧ F", ["p"]), "FF");
});

test("multi-character and digit-bearing variable names", () => {
  assert.equal(column("alpha → beta", ["alpha", "beta"]), column("p → q", PQ));
  assert.equal(column("A1 ⊕ B2", ["A1", "B2"]), column("p ⊕ q", PQ));
  assert.equal(column("is_wet ∧ rain", ["is_wet", "rain"]), column("p ∧ q", PQ));
});

test("empty expression compiles to null", () => {
  assert.equal(compile("", PQ), null);
  assert.equal(compile("   ", PQ), null);
  assert.equal(compile(null, PQ), null);
});

test("errors are specific and student-friendly", () => {
  assert.throws(() => compile("p ∧ x", PQ), /isn't one of this table's variables/);
  // trailing term / missing operator
  assert.throws(() => compile("p q", PQ), /did you miss an operator/);
  assert.throws(() => compile("p ¬ q", PQ), /“¬”.*did you miss an operator/);
  // unfinished expression
  assert.throws(() => compile("p ∧", PQ), /looks unfinished/);
  // a variable/value was expected
  assert.throws(() => compile("∧ p", PQ), /a variable or value was expected/);
  // parentheses
  assert.throws(() => compile("(p ∨ q", PQ), /closing parenthesis/);
  assert.throws(() => compile("p ∧ )", PQ), /check your parentheses/);
  // unknown character
  assert.throws(() => compile("@p", PQ), /Unexpected character/);
});

test("collectVars reports referenced variables", () => {
  const c = compile("p ∧ (q ∨ ¬p)", PQ);
  assert.deepEqual([...c.vars].sort(), ["p", "q"]);
});
