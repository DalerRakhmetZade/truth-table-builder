# Changelog

All notable changes to this project are documented here. This file mirrors the
in-app version history (see the **About** dialog). The format is based on
[Keep a Changelog](https://keepachangelog.com/), and the project follows
[Semantic Versioning](https://semver.org/).

## [1.1.0] — 2026-06-29
### Added
- **Practice mode** — fill in a column's T/F values yourself instead of having
  them auto-filled, then **Check** your answers. New columns start in Practice
  so the answer is never revealed automatically.
- **Auto / Practice** segmented switch per expression column.
- **Check** grades your guesses (✓ / ✗ with a colored ring) and shows a summary
  like "6/8 correct · 1 to fix · 1 blank".
- **Reveal answers** button fills in the correct values on demand.
- Credited CSCI S-20 in the About dialog.

### Changed
- Practice cells accept only `T`/`F` (lowercase is auto-capitalized on Check),
  with a coaching hint for anything else. Correctness is shown by a ring + badge
  rather than the T/F text color, so a correct `F` no longer looks like an error.

## [1.0.0] — 2026-06-29
First public release.

### Added
- Generate truth tables from a chosen number of variables, in standard textbook
  order (top row all-true, first variable most significant).
- Multiple tables, each with its own editable title.
- Inline variable renaming; renames propagate into that table's expressions.
- Expression columns that auto-evaluate, plus manual cell toggling (T / F / blank)
  and a double-click override for computed columns.
- Operators `¬ ∧ ∨ → ↔ ⊕` with ASCII aliases (`~ ! & * . | + ^ -> <-> =`) and
  constants `T/F/1/0`, with a symbol-insert toolbar.
- Copy any table as a plain-text grid.
- Automatic persistence to the browser (`localStorage`).
- About dialog with version history.

[1.1.0]: https://github.com/DalerRakhmetZade/truth-table-builder/releases/tag/v1.1.0
[1.0.0]: https://github.com/DalerRakhmetZade/truth-table-builder/releases/tag/v1.0.0
