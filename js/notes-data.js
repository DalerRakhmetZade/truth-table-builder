// ============================================================================
// Study Notes — content (hand-authored)
// ----------------------------------------------------------------------------
// This file IS the cheat sheet. To add material, just append to NOTES below.
// There is no editor and nothing is persisted — edit this file directly.
//
// A section:
//   {
//     id: "kebab-id",              // unique, used for the TOC anchor
//     title: "Section Title",
//     blurb: "optional one-liner shown under the title",   // optional
//     cards: [ ...cards ],
//   }
//
// A card is ONE of these shapes (set `kind`):
//   • equivalence / rule:
//       { kind: "equiv", name: "Name", lhs: "LHS", rhs: "RHS", note: "..." }
//       → renders   Name:  LHS ≡ RHS   (note is optional, shown muted)
//     For a law with several forms, use `rows` instead of lhs/rhs:
//       { kind: "equiv", name: "Name", rows: [ {lhs,rhs}, {lhs,rhs} ], note }
//   • algorithm step:
//       { kind: "step", n: 1, title: "...", detail: "...",
//         examples: [ { from: "P → Q", to: "¬P ∨ Q" }, ... ] }
//   • prose:
//       { kind: "text", title: "optional", body: "paragraph text" }
//   • inference rule:
//       { kind: "infer", name: "Modus ponens",
//         premises: ["A", "A → B"], conclusion: "B", note: "..." }
//       → renders   Name:  A , A → B  ⊢  B   (note is optional, shown muted)
//
// TEMPLATE — copy a block and fill it in:
//   {
//     id: "my-topic",
//     title: "My Topic",
//     cards: [
//       { kind: "equiv", name: "Some rule", lhs: "P ∧ Q", rhs: "Q ∧ P" },
//     ],
//   },
// ============================================================================

export const NOTES = [
  {
    id: "logical-forms",
    title: "Logical Forms",
    blurb: "Starting from an implication P → Q.",
    cards: [
      { kind: "equiv", name: "Converse", lhs: "P → Q", rhs: "Q → P", note: "swap the two sides" },
      { kind: "equiv", name: "Inverse", lhs: "P → Q", rhs: "¬P → ¬Q", note: "negate both sides" },
      { kind: "equiv", name: "Contrapositive", lhs: "P → Q", rhs: "¬Q → ¬P", note: "swap and negate — equivalent to the original" },
    ],
  },
  {
    id: "equivalence-laws",
    title: "Equivalence Laws",
    blurb: "The core rewriting rules. Many come in an ∧ form and an ∨ form.",
    cards: [
      { kind: "equiv", name: "Commutative", rows: [
        { lhs: "P ∧ Q", rhs: "Q ∧ P" },
        { lhs: "P ∨ Q", rhs: "Q ∨ P" },
      ], note: "order doesn't matter" },
      { kind: "equiv", name: "Associative", rows: [
        { lhs: "(P ∧ Q) ∧ R", rhs: "P ∧ (Q ∧ R)" },
        { lhs: "(P ∨ Q) ∨ R", rhs: "P ∨ (Q ∨ R)" },
      ], note: "grouping doesn't matter" },
      { kind: "equiv", name: "Distributive", rows: [
        { lhs: "P ∧ (Q ∨ R)", rhs: "(P ∧ Q) ∨ (P ∧ R)" },
        { lhs: "P ∨ (Q ∧ R)", rhs: "(P ∨ Q) ∧ (P ∨ R)" },
      ] },
      { kind: "equiv", name: "De Morgan", rows: [
        { lhs: "¬(P ∧ Q)", rhs: "¬P ∨ ¬Q" },
        { lhs: "¬(P ∨ Q)", rhs: "¬P ∧ ¬Q" },
      ], note: "a negation flips ∧ ↔ ∨" },
      { kind: "equiv", name: "Double negation", lhs: "¬(¬P)", rhs: "P" },
      { kind: "equiv", name: "Implication", lhs: "P → Q", rhs: "¬P ∨ Q" },
      { kind: "equiv", name: "Biconditional", lhs: "P ↔ Q", rhs: "(P → Q) ∧ (Q → P)" },
      { kind: "equiv", name: "Exclusive or (XOR)", lhs: "P ⊕ Q", rhs: "(P ∧ ¬Q) ∨ (¬P ∧ Q)", note: "also (P ∨ Q) ∧ ¬(P ∧ Q)" },
    ],
  },
  {
    id: "inference-rules",
    title: "Inference Rules",
    blurb: "Valid moves for reasoning forward: from the premises, conclude the result (⊢).",
    cards: [
      { kind: "infer", name: "Modus ponens", premises: ["A", "A → B"], conclusion: "B",
        note: "Forward reasoning: it's raining, and rain implies wet ground, so the ground is wet." },
      { kind: "infer", name: "Modus tollens", premises: ["¬B", "A → B"], conclusion: "¬A",
        note: "Modus ponens on the contrapositive: A → B ≡ ¬B → ¬A, then ¬B gives ¬A." },
      { kind: "infer", name: "And-elimination", premises: ["A ∧ B"], conclusion: "A",
        note: "If both are true you can conclude either one alone — likewise A ∧ B ⊢ B." },
    ],
  },
  {
    id: "dnf-cnf",
    title: "Converting to DNF / CNF — the 4-step algorithm",
    blurb: "Apply in order. Most conversions don't need all four steps, but in order they always reach a normal form.",
    cards: [
      {
        kind: "step", n: 1,
        title: "Eliminate every connective except ∧, ∨, ¬",
        detail: "Rewrite → and ↔ (and ⊕ if present) with their equivalences.",
        examples: [
          { from: "P → Q", to: "¬P ∨ Q" },
          { from: "P ↔ Q", to: "(P → Q) ∧ (Q → P)" },
          { from: "P ⊕ Q", to: "(P ∧ ¬Q) ∨ (¬P ∧ Q)" },
        ],
      },
      {
        kind: "step", n: 2,
        title: "Push negations inward (De Morgan)",
        detail: "Move every ¬ in until it applies only to a single variable, never a compound.",
        examples: [
          { from: "¬(P ∧ Q)", to: "¬P ∨ ¬Q" },
          { from: "¬(P ∨ Q)", to: "¬P ∧ ¬Q" },
        ],
      },
      {
        kind: "step", n: 3,
        title: "Eliminate double negations",
        examples: [
          { from: "¬(¬P)", to: "P" },
        ],
      },
      {
        kind: "step", n: 4,
        title: "Distribute to reach the desired form",
        detail: "DNF = an OR of AND-clauses; CNF = an AND of OR-clauses.",
        examples: [
          { from: "DNF: P ∧ (Q ∨ R)", to: "(P ∧ Q) ∨ (P ∧ R)" },
          { from: "CNF: P ∨ (Q ∧ R)", to: "(P ∨ Q) ∧ (P ∨ R)" },
        ],
      },
    ],
  },
];
