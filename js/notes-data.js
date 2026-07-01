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
    id: "predicates-quantifiers",
    title: "Predicates & Quantifiers",
    blurb: "Statements about objects in a domain, and the ∀ / ∃ that range over them.",
    cards: [
      { kind: "text", title: "Predicate",
        body: "A function from one or more domain values to a truth value, written P(x), Q(x, y), etc. On its own it isn't true or false — it becomes a proposition once its variables get specific values (e.g. Even(4)) or are bound by a quantifier. Examples: Even(x) means \"x is even\"; Loves(x, y) means \"x loves y.\" A predicate with 0 inputs is just a proposition — what we worked with in propositional logic." },
      { kind: "text", title: "Domain (universe of discourse)",
        body: "The set of objects the variables range over. It must be specified — the same formula can be true over one domain and false over another. Common domains: ℤ (integers), ℕ (natural numbers), ℝ (reals), or a described set like \"all students in the class.\"" },
      { kind: "text", title: "Universal quantifier — ∀",
        body: "∀x P(x) reads \"for all x in the domain, P(x) is true\" (write ∀x∈D. P(x) to name the domain). Think of it as an infinite AND: P(a₁) ∧ P(a₂) ∧ P(a₃) ∧ … over every element. A single counterexample makes it false." },
      { kind: "text", title: "Existential quantifier — ∃",
        body: "∃x P(x) reads \"there exists at least one x in the domain such that P(x) is true.\" Think of it as an infinite OR: P(a₁) ∨ P(a₂) ∨ P(a₃) ∨ … over every element. A single witness makes it true." },
      { kind: "text", title: "Uniqueness — ∃!",
        body: "∃!x P(x) reads \"there exists exactly one x such that P(x)\" — at least one, and no more than one." },
      { kind: "text", title: "Free vs bound variables",
        body: "A variable inside a quantifier's scope is bound — it has no individual identity, just a role. A variable not bound by any quantifier is free. A formula with free variables is still a predicate (not a proposition) — its truth depends on the values the free variables take. A formula with every variable bound is a proposition with a definite truth value. E.g. in ∀x P(x, y), x is bound and y is free." },
      { kind: "text", title: "Ground formula",
        body: "A formula with all variables replaced by specific domain values — it always evaluates to true or false. Example: Even(4) ∧ Prime(4) is a ground formula (and it's false)." },
      { kind: "equiv", name: "Quantifier negation (De Morgan for quantifiers)", rows: [
        { lhs: "¬∀x P(x)", rhs: "∃x ¬P(x)" },
        { lhs: "¬∃x P(x)", rhs: "∀x ¬P(x)" },
      ], note: "to push ¬ inward, flip the quantifier and negate the predicate" },
      { kind: "equiv", name: "Negating nested quantifiers",
        lhs: "¬∀x ∃y P(x, y)", rhs: "∃x ∀y ¬P(x, y)",
        note: "flip every quantifier (∀ ↔ ∃) as the ¬ moves in, then negate the innermost predicate" },
      { kind: "equiv", name: "Finite-domain expansion", rows: [
        { lhs: "∀x P(x)", rhs: "P(a) ∧ P(b) ∧ P(c)" },
        { lhs: "∃x P(x)", rhs: "P(a) ∨ P(b) ∨ P(c)" },
      ], note: "over the domain {a, b, c}: ∀ is a big AND, ∃ is a big OR" },
      { kind: "equiv", name: "Distributing quantifiers", rows: [
        { lhs: "∀x (P(x) ∧ Q(x))", rhs: "∀x P(x) ∧ ∀x Q(x)" },
        { lhs: "∃x (P(x) ∨ Q(x))", rhs: "∃x P(x) ∨ ∃x Q(x)" },
      ], note: "∀ distributes over ∧ and ∃ over ∨ — but NOT ∀ over ∨, nor ∃ over ∧" },
      { kind: "equiv", name: "Same-type quantifiers commute", rows: [
        { lhs: "∀x ∀y P(x, y)", rhs: "∀y ∀x P(x, y)" },
        { lhs: "∃x ∃y P(x, y)", rhs: "∃y ∃x P(x, y)" },
      ], note: "reorder freely when the quantifiers are all ∀ or all ∃" },
      { kind: "infer", name: "Mixed order — one direction only", premises: ["∃y ∀x P(x, y)"], conclusion: "∀x ∃y P(x, y)",
        note: "If a single y works for all x, then each x certainly has some y (the same one). The converse fails, so ∀x ∃y ≢ ∃y ∀x in general." },
      { kind: "text", title: "Order of nested quantifiers matters — think \"outside-in\"",
        body: "The outermost quantifier is fixed first. In ∀x ∃y L(x, y) you pick x first, then find a y that may depend on x — \"everyone has someone.\" In ∃y ∀x L(x, y) you commit to one y first and it must work for every x — \"someone is loved by everyone\" (the stronger claim)." },
    ],
  },
  {
    id: "prenex-normal-form",
    title: "Prenex Normal Form — the 4-step algorithm",
    blurb: "All quantifiers pulled to the front, leaving a quantifier-free body (the matrix). Apply the steps in order.",
    cards: [
      { kind: "text", title: "What it is",
        body: "A formula is in prenex normal form when every quantifier sits at the front and the remaining body — the matrix — is quantifier-free, e.g. ∀x ∃y (P(x) ∨ ¬Q(y)). Converting to it is good practice: it exercises implication elimination, De Morgan's for quantifiers, and variable renaming all at once." },
      { kind: "step", n: 1,
        title: "Eliminate implications",
        detail: "Rewrite → (and ↔, ⊕) with their equivalences so only ∧, ∨, ¬ remain.",
        examples: [ { from: "P → Q", to: "¬P ∨ Q" } ] },
      { kind: "step", n: 2,
        title: "Push negations inward",
        detail: "Use De Morgan's for ∧/∨ and for quantifiers, until every ¬ applies only to a predicate.",
        examples: [
          { from: "¬(P ∧ Q)", to: "¬P ∨ ¬Q" },
          { from: "¬∀x P(x)", to: "∃x ¬P(x)" },
          { from: "¬∃x P(x)", to: "∀x ¬P(x)" },
        ] },
      { kind: "step", n: 3,
        title: "Rename variables to avoid capture",
        detail: "Give bound variables fresh names so pulling a quantifier out never captures a variable used elsewhere.",
        examples: [ { from: "∀x P(x) ∧ ∃x Q(x)", to: "∀x P(x) ∧ ∃z Q(z)" } ] },
      { kind: "step", n: 4,
        title: "Pull quantifiers to the front",
        detail: "Move each quantifier outward to the head of the formula, preserving order, leaving a quantifier-free matrix.",
        examples: [ { from: "∀x P(x) ∧ ∃z Q(z)", to: "∀x ∃z (P(x) ∧ Q(z))" } ] },
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
