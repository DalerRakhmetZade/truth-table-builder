import test from "node:test";
import assert from "node:assert/strict";
import { compile, evalAst } from "../js/parser.js";
import { unparse, implicationForms, generateRows } from "../js/logic.js";

// Two expressions are logically equivalent over the given variables?
function equivalent(exprA, exprB, names) {
  const a = compile(exprA, names), b = compile(exprB, names);
  return generateRows(names).every((r) => evalAst(a.ast, r) === evalAst(b.ast, r));
}

test("unparse: simple operators", () => {
  assert.equal(unparse(compile("p → q", ["p", "q"]).ast), "p → q");
  assert.equal(unparse(compile("¬p", ["p"]).ast), "¬p");
  assert.equal(unparse(compile("p ∧ q", ["p", "q"]).ast), "p ∧ q");
});

test("unparse: parenthesizes only where needed", () => {
  const N = ["p", "q", "r"];
  assert.equal(unparse(compile("¬(p ∨ q)", N).ast), "¬(p ∨ q)");
  assert.equal(unparse(compile("¬¬p", ["p"]).ast), "¬¬p");
  // (p ∧ q) ∨ r needs no parens; p ∧ q binds tighter than ∨
  assert.equal(unparse(compile("p ∧ q ∨ r", N).ast), "p ∧ q ∨ r");
  // right-assoc → : left side of a nested implication needs parens
  assert.equal(unparse(compile("(p → q) → r", N).ast), "(p → q) → r");
  // p → q → r is right-assoc, so no parens
  assert.equal(unparse(compile("p → q → r", N).ast), "p → q → r");
});

test("unparse round-trips (re-parsing yields an equivalent tree)", () => {
  const N = ["p", "q", "r"];
  for (const e of ["p → (q ∧ ¬r)", "¬(p ∨ q) ↔ r", "p ⊕ q → r", "(p → q) ∧ (r ∨ ¬p)"]) {
    const printed = unparse(compile(e, N).ast);
    assert.ok(equivalent(e, printed, N), e + "  ==  " + printed);
  }
});

test("implicationForms: p → q", () => {
  const f = implicationForms(compile("p → q", ["p", "q"]).ast);
  assert.deepEqual(f, { converse: "q → p", inverse: "¬p → ¬q", contrapositive: "¬q → ¬p" });
});

test("implicationForms: compound antecedent gets parenthesized under ¬", () => {
  const N = ["p", "q", "r"];
  const f = implicationForms(compile("(p ∨ q) → r", N).ast);
  assert.equal(f.converse, "r → p ∨ q");
  assert.equal(f.inverse, "¬(p ∨ q) → ¬r");
  assert.equal(f.contrapositive, "¬r → ¬(p ∨ q)");
});

test("implicationForms: contrapositive ≡ original, converse ≡ inverse", () => {
  const N = ["p", "q"];
  const f = implicationForms(compile("p → q", N).ast);
  assert.ok(equivalent("p → q", f.contrapositive, N), "contrapositive ≡ original");
  assert.ok(equivalent(f.converse, f.inverse, N), "converse ≡ inverse");
  assert.ok(!equivalent("p → q", f.converse, N), "converse not equivalent to original");
});

test("implicationForms: returns null when not a top-level implication", () => {
  assert.equal(implicationForms(compile("p ∧ q", ["p", "q"]).ast), null);
  assert.equal(implicationForms(compile("¬(p → q)", ["p", "q"]).ast), null);
  assert.equal(implicationForms(compile("p ↔ q", ["p", "q"]).ast), null);
});
