# Changelog

All notable changes to this project are documented here. This file mirrors the
in-app version history (see the **About** dialog). The format is based on
[Keep a Changelog](https://keepachangelog.com/), and the project follows
[Semantic Versioning](https://semver.org/).

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

[1.0.0]: https://github.com/DalerRakhmetZade/truth-table-builder/releases/tag/v1.0.0
