import test from "node:test";
import assert from "node:assert/strict";
import { SLASH_ITEMS, filterSymbols } from "../js/slashmenu.js";

test("filterSymbols: empty query returns all symbols", () => {
  assert.equal(filterSymbols("").length, SLASH_ITEMS.length);
  assert.equal(filterSymbols(null).length, SLASH_ITEMS.length);
});

test("filterSymbols: matches by name prefix (case-insensitive)", () => {
  assert.deepEqual(filterSymbols("and").map((i) => i.sym), ["∧"]);
  assert.deepEqual(filterSymbols("OR").map((i) => i.sym), ["∨"]);
  assert.deepEqual(filterSymbols("xor").map((i) => i.sym), ["⊕"]);
  assert.deepEqual(filterSymbols("iff").map((i) => i.sym), ["↔"]);
});

test("filterSymbols: matches by alias keyword", () => {
  assert.deepEqual(filterSymbols("negation").map((i) => i.sym), ["¬"]);
  assert.deepEqual(filterSymbols("then").map((i) => i.sym), ["→"]);
  assert.deepEqual(filterSymbols("close").map((i) => i.sym), [")"]);
});

test("filterSymbols: 'o' prefix matches OR and Open paren", () => {
  const syms = filterSymbols("o").map((i) => i.sym).sort();
  assert.deepEqual(syms, ["(", "∨"].sort());
});

test("filterSymbols: no match returns empty", () => {
  assert.deepEqual(filterSymbols("zzz"), []);
});
