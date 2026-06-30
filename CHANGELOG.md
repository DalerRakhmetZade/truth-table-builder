# Changelog

All notable changes to this project are documented here. This file is generated
from `js/version.js` (run `npm run sync-version`) and mirrors the in-app version
history (see the **About** dialog). The format is based on
[Keep a Changelog](https://keepachangelog.com/), and the project follows
[Semantic Versioning](https://semver.org/).

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

[1.4.0]: https://github.com/DalerRakhmetZade/truth-table-builder/releases/tag/v1.4.0
[1.3.0]: https://github.com/DalerRakhmetZade/truth-table-builder/releases/tag/v1.3.0
[1.2.0]: https://github.com/DalerRakhmetZade/truth-table-builder/releases/tag/v1.2.0
[1.1.0]: https://github.com/DalerRakhmetZade/truth-table-builder/releases/tag/v1.1.0
[1.0.0]: https://github.com/DalerRakhmetZade/truth-table-builder/releases/tag/v1.0.0
