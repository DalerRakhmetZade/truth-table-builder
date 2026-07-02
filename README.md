# Discrete Math Study Kit

**Live demo:** [Discrete Math Study Kit](https://dm.r-z.app/)

A lightweight discrete-math study kit — a truth table builder, study notes, and
flashcards. **No build step** and no runtime dependencies — plain ES modules and CSS.

## Running it
The app uses native ES modules, so it must be **served** (browsers block modules
over `file://`). A tiny zero-dependency server is included:

```sh
npm start        # serves on http://localhost:8000
```

Any static server works too (e.g. `python3 -m http.server 8000`).

## Project structure
```
index.html        markup + control bar
css/              base, layout, table, dialog, practice  (linked via <link>)
js/               ES modules:
  parser.js         tokenizer, parser, evaluator        (pure)
  logic.js          helpers, generateRows, gradeColumn,
                    state migration, text export         (pure)
  version.js        APP_VERSION + CHANGELOG data         (pure)
  store.js          runtime state, factories, persistence
  render.js         builds the table HTML
  events.js         all event handlers
  about.js          About dialog wiring
  dom.js            cached DOM references
  main.js           entry point
scripts/serve.mjs static dev server (npm start)
tests/            Node test suite (imports the pure modules directly)
```

The **pure** modules (`parser`, `logic`, `version`) have no DOM or storage
dependencies, so the tests import them directly.

## Features
- Set the number of variables; the full `2^n`-row table is generated in standard
  textbook order (top row all-true, first variable most significant).
- **Multiple tables**, each with its own editable **title**, variable count,
  variable names, and expression columns.
- **Rename variables** by clicking a column header; the rename propagates into
  that table's expressions automatically.
- **Add expression columns** that auto-evaluate, or switch a column to
  **Practice mode** to fill in the T/F values yourself and **Check** your work
  (with a score summary and ✓/✗ feedback); **Reveal** shows the answers.
- You can also toggle cells manually (`T → F → blank`) and double-click a
  computed cell to freeze it into manual-override mode.
- Operators: `¬ ∧ ∨ → ↔ ⊕` with ASCII aliases
  (`~ !`, `& * .`, `| +`, `->`, `<-> =`, `^`) and constants `T/F/1/0`.
  Precedence (high→low): `¬` > `∧` > `∨`/`⊕` > `→` (right-assoc) > `↔`.
- Copy any table as a plain-text grid. Everything is saved to `localStorage`.

## Tests
Pure logic (tokenizer, parser, evaluator, row generation, grading, state
migration, text export) is covered by a Node test suite that imports the
modules directly — no browser required.

```sh
npm test
```

## Versioning
`js/version.js` (the `APP_VERSION` constant + `CHANGELOG` array) is the **single
source of truth**. `CHANGELOG.md` and the `package.json` version are *generated*
from it:

```sh
npm run sync-version          # regenerate CHANGELOG.md + package.json version
npm run sync-version -- --check   # verify they're in sync (used by the tests)
```

To cut a release: bump `APP_VERSION` and add a `CHANGELOG` entry in
`js/version.js`, run `npm run sync-version`, then commit, tag `vX.Y.Z`, and
create the GitHub Release. A test fails if the derived files ever drift.

Requires Node 18+ (uses the built-in `node:test` runner; no dependencies).
