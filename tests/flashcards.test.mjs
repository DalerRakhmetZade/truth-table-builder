import test from "node:test";
import assert from "node:assert/strict";
import { FLASHCARDS } from "../js/flashcards-data.js";
import { MODULES, moduleById, groupsByModule } from "../js/modules.js";
import {
  allCards, moduleCards, deckById, makeRng, shuffle, buildQuestion, buildQuiz, scoreQuiz,
} from "../js/quiz.js";

test("FLASHCARDS is a non-empty array of well-formed groups", () => {
  assert.ok(Array.isArray(FLASHCARDS) && FLASHCARDS.length > 0);
  for (const g of FLASHCARDS) {
    assert.match(g.id, /^[a-z0-9-]+$/, "group id is a kebab anchor: " + g.id);
    assert.equal(typeof g.title, "string");
    assert.ok(Array.isArray(g.cards) && g.cards.length > 0, "group has cards: " + g.id);
  }
});

test("every flashcard group belongs to a defined module", () => {
  const moduleIds = new Set(MODULES.map((m) => m.id));
  for (const g of FLASHCARDS) {
    assert.equal(typeof g.module, "string", g.id + ": needs a module id");
    assert.ok(moduleIds.has(g.module), g.id + ": module '" + g.module + "' is not defined");
  }
});

test("modules are well-formed and groupsByModule buckets in order", () => {
  assert.ok(Array.isArray(MODULES) && MODULES.length > 0);
  for (const m of MODULES) {
    assert.match(m.id, /^[a-z0-9-]+$/, "module id is a kebab anchor: " + m.id);
    assert.equal(typeof m.title, "string");
    assert.equal(moduleById(m.id).title, m.title);
  }
  const bucketed = groupsByModule(FLASHCARDS);
  const flat = bucketed.reduce((n, e) => n + e.groups.length, 0);
  assert.equal(flat, FLASHCARDS.length, "every group is bucketed exactly once");
});

test("deckById resolves module decks and rejects unknown modules", () => {
  const m = MODULES[0].id;
  const deck = deckById("mod:" + m);
  assert.ok(deck && deck.cards.length > 0);
  assert.equal(deck.cards.length, moduleCards(m).length);
  assert.equal(deckById("mod:does-not-exist"), null);
});

test("group ids are unique", () => {
  const ids = FLASHCARDS.map((g) => g.id);
  assert.equal(new Set(ids).size, ids.length);
});

test("card ids are unique across the whole deck", () => {
  const ids = allCards().map((c) => c.id);
  assert.equal(new Set(ids).size, ids.length, "duplicate card id");
});

test("every card is well-formed (q, a, exactly 3 distinct wrong distractors)", () => {
  for (const c of allCards()) {
    assert.ok(typeof c.q === "string" && c.q.trim().length > 0, c.id + ": needs q");
    assert.ok(typeof c.a === "string" && c.a.trim().length > 0, c.id + ": needs a");
    assert.ok(Array.isArray(c.distractors) && c.distractors.length === 3, c.id + ": needs exactly 3 distractors");
    for (const d of c.distractors) {
      assert.ok(typeof d === "string" && d.trim().length > 0, c.id + ": distractor must be a non-empty string");
      assert.notEqual(d, c.a, c.id + ": a distractor equals the answer");
    }
    assert.equal(new Set(c.distractors).size, 3, c.id + ": distractors must be distinct");
    // The full option set (answer + distractors) must have 4 distinct entries.
    assert.equal(new Set([c.a, ...c.distractors]).size, 4, c.id + ": options must all be distinct");
  }
});

test("deckById returns a named group, the 'all' deck, or null", () => {
  const first = FLASHCARDS[0];
  assert.equal(deckById(first.id).title, first.title);
  const all = deckById("all");
  assert.equal(all.title, "All cards");
  assert.equal(all.cards.length, allCards().length);
  assert.equal(deckById("does-not-exist"), null);
});

test("makeRng is deterministic for a given seed", () => {
  const a = makeRng(42), b = makeRng(42);
  const seqA = [a(), a(), a()], seqB = [b(), b(), b()];
  assert.deepEqual(seqA, seqB);
  seqA.forEach((n) => assert.ok(n >= 0 && n < 1));
});

test("shuffle is a permutation and deterministic with a seeded rng", () => {
  const input = [1, 2, 3, 4, 5, 6, 7, 8];
  const s1 = shuffle(input, makeRng(7));
  const s2 = shuffle(input, makeRng(7));
  assert.deepEqual(s1, s2, "same seed -> same order");
  assert.deepEqual([...s1].sort((x, y) => x - y), input, "same multiset");
  assert.deepEqual(input, [1, 2, 3, 4, 5, 6, 7, 8], "input not mutated");
});

test("buildQuestion always yields 4 options containing the answer exactly once", () => {
  for (const c of allCards()) {
    const q = buildQuestion(c, makeRng(c.id.length + 1));
    assert.equal(q.options.length, 4);
    assert.equal(q.options.filter((o) => o === c.a).length, 1, c.id + ": answer appears once");
    assert.equal(q.options[q.correctIndex], c.a, c.id + ": correctIndex points at answer");
  }
});

test("buildQuiz produces one question per card", () => {
  const deck = deckById("all");
  const quiz = buildQuiz(deck.cards, makeRng(99));
  assert.equal(quiz.length, deck.cards.length);
  for (const q of quiz) assert.equal(q.options.length, 4);
});

test("scoreQuiz computes correct / total / percent", () => {
  assert.deepEqual(scoreQuiz([true, true, false, true]), { correct: 3, total: 4, percent: 75 });
  assert.deepEqual(scoreQuiz([]), { correct: 0, total: 0, percent: 0 });
  assert.deepEqual(scoreQuiz([true, true, true]), { correct: 3, total: 3, percent: 100 });
  // Accepts {correct:boolean} shapes too.
  assert.equal(scoreQuiz([{ correct: true }, { correct: false }]).percent, 50);
});
