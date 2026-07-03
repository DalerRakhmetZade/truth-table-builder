# Changelog

All notable changes to this project are documented here. This file is generated
from `js/version.js` (run `npm run sync-version`) and mirrors the in-app version
history (see the **About** dialog). The format is based on
[Keep a Changelog](https://keepachangelog.com/), and the project follows
[Semantic Versioning](https://semver.org/).

## [1.9.0] — 2026-07-02
- Study Notes and Flashcards are now organized into Modules — the landing page lists your modules, and you drill in to a module to reach its topics.
- Flashcards can be studied or quizzed at any scope: a single topic, a whole module, or all cards at once.
- Added two new proof techniques — Proof by Cases and Proving Uniqueness — to both Notes and Flashcards.
- Module 2 is set up as a “Coming soon” placeholder, ready for the next unit of material.

## [1.8.0] — 2026-07-02
- Renamed the app to “Discrete Math Study Kit” — it’s now three tools in one: the Truth Table Builder, Study Notes, and the new Flashcards.
- New “Flashcards” tab: pick a deck, then Study or take a graded Quiz.
- Study is a real swipeable card deck — flip a card, then swipe right if you knew it or left to review; cards you miss come back until you clear them.
- Quiz mode is auto-graded to a real 0–100% score, with a mastery message at 100% and a list of the cards you missed; your best score per deck is remembered.
- Over 100 hand-written flashcards covering every Study Notes topic, from several angles (recognition, application, common mistakes, worked examples).
- Study Notes now also cover Inference Rules, Direct Proofs, Predicates & Quantifiers, and Prenex Normal Form.
- Mobile-first redesign with a bottom tab bar and bigger tap targets, so Notes and Flashcards feel great on a phone.

## [1.7.1] — 2026-06-29
- Fixed: typing a variable in a column expression now matches no matter the case (e.g. P matches P, p, or an older lowercase-stored variable).
- Older tables made before the uppercase update now have their variable names normalized to uppercase on load.

## [1.7.0] — 2026-06-29
- New “Study Notes” tab — a quick-reference cheat sheet you can return to (also at the #notes link).
- Browse by group tiles, then drill into a topic; search finds any rule across all groups.
- Covers Logical Forms, the Equivalence Laws (Commutative, Associative, Distributive, De Morgan, Double negation, Implication, Biconditional, XOR), and the 4-step DNF/CNF conversion algorithm.

## [1.6.0] — 2026-06-29
- Variables are now capital letters (P, Q, R, S, …) by default, matching how they're written in class.
- Variable names are automatically capitalized — no need to change them by hand.
- Expressions are case-insensitive: type p or P, it's the same variable.
- T and F stay reserved for the true/false constants (you can't name a variable T or F).

## [1.5.1] — 2026-06-29
- Capped tables at 5 variables — the row count doubles with each variable (2⁵ = 32 rows), so this keeps tables fast and readable.

## [1.5.0] — 2026-06-29
- Every formula column now shows what kind of proposition it is: ⊤ Tautology (always true), ⊥ Unsatisfiable (always false), or Satisfiable (true in some rows).
- Logically equivalent columns are flagged with a shared “≡” chip — e.g. an implication and its contrapositive line up.
- In Practice mode the category/equivalence are hidden until you Check or Reveal, so they don't spoil the answer.
- Added an “About logic” explainer (tautology, satisfiability, equivalence, and the SAT problem) to the About dialog.
- You can now type ⊤ and ⊥ as the constants true and false.

## [1.4.0] — 2026-06-29
- Implication columns (p → q) now have a “Logical forms ▾” menu to add the Converse, Inverse, and Contrapositive as new columns.
- Each added form starts in Practice mode, so you can fill it in and check it — handy for seeing that the contrapositive matches the original and the converse matches the inverse.

## [1.3.0] — 2026-06-29
- Fresh look: a calmer, Apple-inspired light design across the whole app.
- Type “/” inside a formula to pick a symbol — filter by typing, navigate with ↑/↓, Enter to insert.
- Friendlier formula error messages that point at the problem, shown only after you finish typing.
- Operator buttons now have tooltips (NOT, AND, OR, XOR, IMPLIES, IFF).
- Removing a table or a column now asks for confirmation, using an in-app dialog (no browser pop-ups).
- Reorder tables with up/down arrows when you have more than one.
- You can now delete the last remaining table.
- Removed the per-table Clear button — remove individual columns with their ✕ instead.
- The “What's new” list is now collapsible by version.
- Wider layout so larger tables have more room.

## [1.2.0] — 2026-06-29
- Internal: refactored the app into ES modules (js/) and split the CSS into focused files (css/).
- Dev: the app now loads as native modules, so it must be served — added `npm start` (a zero-dependency local server). It no longer opens directly via file://.
- Dev: js/version.js is now the single source of truth for the version and changelog; `npm run sync-version` regenerates CHANGELOG.md and package.json.
- No user-facing changes — the app behaves exactly as before.

## [1.1.0] — 2026-06-29
- New: Practice mode — fill in a column's T/F values yourself, then Check your answers.
- Auto / Practice switch per column; new columns start in Practice so answers aren't revealed.
- Check grades your guesses (✓ / ✗ with a ring) and shows a summary like “6/8 correct”.
- Reveal answers button fills in the correct values when you want to see them.
- Cells accept only T or F (lowercase is auto-capitalized on Check), with a hint if you type anything else.
- Credited CSCI S-20 in the About dialog.

## [1.0.0] — 2026-06-29
- First public release.
- Generate truth tables from a chosen number of variables (standard textbook order).
- Multiple tables, each with its own editable title.
- Rename variables inline; renames propagate into that table's expressions.
- Add expression columns that auto-evaluate, or toggle cells manually (T / F / blank).
- Operators ¬ ∧ ∨ → ↔ ⊕ with ASCII aliases (~ ! & * . | + ^ -> <-> =) and constants T/F/1/0.
- Copy any table as a plain-text grid; work auto-saves to your browser.
- About dialog with version history.

[1.9.0]: https://github.com/DalerRakhmetZade/truth-table-builder/releases/tag/v1.9.0
[1.8.0]: https://github.com/DalerRakhmetZade/truth-table-builder/releases/tag/v1.8.0
[1.7.1]: https://github.com/DalerRakhmetZade/truth-table-builder/releases/tag/v1.7.1
[1.7.0]: https://github.com/DalerRakhmetZade/truth-table-builder/releases/tag/v1.7.0
[1.6.0]: https://github.com/DalerRakhmetZade/truth-table-builder/releases/tag/v1.6.0
[1.5.1]: https://github.com/DalerRakhmetZade/truth-table-builder/releases/tag/v1.5.1
[1.5.0]: https://github.com/DalerRakhmetZade/truth-table-builder/releases/tag/v1.5.0
[1.4.0]: https://github.com/DalerRakhmetZade/truth-table-builder/releases/tag/v1.4.0
[1.3.0]: https://github.com/DalerRakhmetZade/truth-table-builder/releases/tag/v1.3.0
[1.2.0]: https://github.com/DalerRakhmetZade/truth-table-builder/releases/tag/v1.2.0
[1.1.0]: https://github.com/DalerRakhmetZade/truth-table-builder/releases/tag/v1.1.0
[1.0.0]: https://github.com/DalerRakhmetZade/truth-table-builder/releases/tag/v1.0.0
