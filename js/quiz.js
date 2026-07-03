// Pure, DOM-free helpers for the flashcard quiz. Kept separate from flashcards.js
// so the scoring / question-building logic can be unit-tested directly.
import { FLASHCARDS } from "./flashcards-data.js";

// Every card across all groups, each tagged with its group id/title.
export function allCards() {
  const out = [];
  for (const g of FLASHCARDS) {
    for (const c of g.cards) out.push({ ...c, groupId: g.id, groupTitle: g.title });
  }
  return out;
}

// Cards belonging to a module (groups tagged with that module id).
export function moduleCards(moduleId) {
  const out = [];
  for (const g of FLASHCARDS) {
    if (g.module !== moduleId) continue;
    for (const c of g.cards) out.push({ ...c, groupId: g.id, groupTitle: g.title });
  }
  return out;
}

export function deckById(id) {
  if (id === "all") {
    return { id: "all", title: "All cards", cards: allCards() };
  }
  if (typeof id === "string" && id.indexOf("mod:") === 0) {
    const moduleId = id.slice(4);
    const cards = moduleCards(moduleId);
    if (!cards.length) return null;
    return { id: id, title: "Whole module", cards: cards };
  }
  const g = FLASHCARDS.find((x) => x.id === id);
  if (!g) return null;
  return { id: g.id, title: g.title, cards: g.cards.map((c) => ({ ...c, groupId: g.id, groupTitle: g.title })) };
}

// Small deterministic PRNG (mulberry32) so shuffles/quizzes are reproducible in tests.
export function makeRng(seed) {
  let a = (seed >>> 0) || 1;
  return function () {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Fisher–Yates using an injected rng (defaults to Math.random). Returns a new array.
export function shuffle(arr, rng) {
  const r = rng || Math.random;
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(r() * (i + 1));
    const tmp = a[i]; a[i] = a[j]; a[j] = tmp;
  }
  return a;
}

// Build a multiple-choice question from a card: the correct answer plus its 3
// distractors, shuffled. Returns { card, options, correctIndex }.
export function buildQuestion(card, rng) {
  const options = shuffle([card.a, ...card.distractors], rng);
  return { card, options, correctIndex: options.indexOf(card.a) };
}

// Build a full quiz (one question per card) with a deterministic-if-seeded order.
export function buildQuiz(cards, rng) {
  return shuffle(cards, rng).map((c) => buildQuestion(c, rng));
}

// answers: array of booleans (or {correct:boolean}) — one per answered question.
// Returns { correct, total, percent } with percent rounded to an integer 0–100.
export function scoreQuiz(answers) {
  const total = answers.length;
  const correct = answers.reduce((n, a) => n + ((a === true || (a && a.correct)) ? 1 : 0), 0);
  const percent = total ? Math.round((correct / total) * 100) : 0;
  return { correct, total, percent };
}
