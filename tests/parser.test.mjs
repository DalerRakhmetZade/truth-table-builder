import test from "node:test";
import assert from "node:assert/strict";
import { load, column } from "./harness.mjs";

const api = load();
const PQ = ["p", "q"];
const PQR = ["p", "q", "r"];

test("single variable and negation", () => {
  assert.equal(column(api, "p", ["p"]), "TF");
  assert.equal(column(api, "¬p", ["p"]), "FT");
  assert.equal(column(api, "~p", ["p"]), "FT");
  assert.equal(column(api, "!p", ["p"]), "FT");
});

test("basic binary operators (symbols)", () => {
  assert.equal(column(api, "p ∧ q", PQ), "TFFF");
  assert.equal(column(api, "p ∨ q", PQ), "TTTF");
  assert.equal(column(api, "p → q", PQ), "TFTT");
  assert.equal(column(api, "p ↔ q", PQ), "TFFT");
  assert.equal(column(api, "p ⊕ q", PQ), "FTTF");
});

test("ASCII aliases match symbol versions", () => {
  assert.equal(column(api, "p & q", PQ), column(api, "p ∧ q", PQ));
  assert.equal(column(api, "p * q", PQ), column(api, "p ∧ q", PQ));
  assert.equal(column(api, "p . q", PQ), column(api, "p ∧ q", PQ));
  assert.equal(column(api, "p | q", PQ), column(api, "p ∨ q", PQ));
  assert.equal(column(api, "p + q", PQ), column(api, "p ∨ q", PQ));
  assert.equal(column(api, "p ^ q", PQ), column(api, "p ⊕ q", PQ));
  assert.equal(column(api, "p -> q", PQ), column(api, "p → q", PQ));
  assert.equal(column(api, "p <-> q", PQ), column(api, "p ↔ q", PQ));
  assert.equal(column(api, "p = q", PQ), column(api, "p ↔ q", PQ));
});

test("precedence: NOT > AND > OR/XOR > IMP > IFF", () => {
  // ¬p ∧ q  ==  (¬p) ∧ q
  assert.equal(column(api, "¬p ∧ q", PQ), column(api, "(¬p) ∧ q", PQ));
  // p ∧ q ∨ r  ==  (p ∧ q) ∨ r
  assert.equal(column(api, "p ∧ q ∨ r", PQR), column(api, "(p ∧ q) ∨ r", PQR));
  // p ∨ q → r  ==  (p ∨ q) → r
  assert.equal(column(api, "p ∨ q → r", PQR), column(api, "(p ∨ q) → r", PQR));
  // p → q ↔ r  ==  (p → q) ↔ r
  assert.equal(column(api, "p → q ↔ r", PQR), column(api, "(p → q) ↔ r", PQR));
});

test("implication is right-associative", () => {
  // p → q → r  ==  p → (q → r), and differs from (p → q) → r
  assert.equal(column(api, "p → q → r", PQR), column(api, "p → (q → r)", PQR));
  assert.notEqual(column(api, "p → q → r", PQR), column(api, "(p → q) → r", PQR));
});

test("iff is left-associative", () => {
  assert.equal(column(api, "p ↔ q ↔ r", PQR), column(api, "(p ↔ q) ↔ r", PQR));
});

test("parentheses and double negation", () => {
  assert.equal(column(api, "¬(p ∨ q)", PQ), "FFFT");
  assert.equal(column(api, "¬¬p", ["p"]), "TF");
  assert.equal(column(api, "¬(p ∧ q)", PQ), "FTTT");
});

test("constants T/F/1/0", () => {
  assert.equal(column(api, "T", []), "T");
  assert.equal(column(api, "F", []), "F");
  assert.equal(column(api, "1", []), "T");
  assert.equal(column(api, "0", []), "F");
  assert.equal(column(api, "p ∨ T", ["p"]), "TT");
  assert.equal(column(api, "p ∧ F", ["p"]), "FF");
});

test("multi-character and digit-bearing variable names", () => {
  assert.equal(column(api, "alpha → beta", ["alpha", "beta"]), column(api, "p → q", PQ));
  assert.equal(column(api, "A1 ⊕ B2", ["A1", "B2"]), column(api, "p ⊕ q", PQ));
  assert.equal(column(api, "is_wet ∧ rain", ["is_wet", "rain"]), column(api, "p ∧ q", PQ));
});

test("empty expression compiles to null", () => {
  assert.equal(api.compile("", PQ), null);
  assert.equal(api.compile("   ", PQ), null);
  assert.equal(api.compile(null, PQ), null);
});

test("errors: unknown variable, trailing tokens, bad parens", () => {
  assert.throws(() => api.compile("p ∧ x", PQ), /Unknown variable/);
  assert.throws(() => api.compile("p q", PQ), /Trailing tokens/);
  assert.throws(() => api.compile("p ∧", PQ), /Unexpected end/);
  assert.throws(() => api.compile("(p ∨ q", PQ), /Expected/);
  assert.throws(() => api.compile("p ∧ )", PQ), /Unexpected token/);
  assert.throws(() => api.compile("@p", PQ), /Unexpected character/);
});

test("collectVars reports referenced variables", () => {
  const c = api.compile("p ∧ (q ∨ ¬p)", PQ);
  assert.deepEqual([...c.vars].sort(), ["p", "q"]);
});
