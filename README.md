# Truth Table Builder

A lightweight truth table tool for discrete math. No build step and no runtime
dependencies — just open `index.html` in any browser (or serve the folder).

## Project structure
- `index.html` — markup and the control bar.
- `styles.css` — all styling (light theme, CSS variables).
- `app.js` — application logic: tokenizer, parser, evaluator, rendering, and
  state/persistence.
- `tests/` — Node test suite for the pure logic.

Because the assets are referenced with relative paths, you can open the file
directly (`file://`) or serve the folder with any static server, e.g.:

```sh
python3 -m http.server 8000   # then visit http://localhost:8000
```

## Features
- Set the number of variables; the full `2^n`-row table is generated in standard
  textbook order (top row all-true, first variable most significant).
- **Multiple tables**, each with its own editable **title**, variable count,
  variable names, and expression columns.
- **Rename variables** by clicking a column header; the rename propagates into
  that table's expressions automatically.
- **Add expression columns** that auto-evaluate typed propositions, or click
  cells to toggle `T → F → blank` manually. Double-click a computed cell to
  freeze it into manual-override mode.
- Operators: `¬ ∧ ∨ → ↔ ⊕` with ASCII aliases
  (`~ !`, `& * .`, `| +`, `->`, `<-> =`, `^`) and constants `T/F/1/0`.
  Precedence (high→low): `¬` > `∧` > `∨`/`⊕` > `→` (right-assoc) > `↔`.
- Copy any table as a plain-text grid. Everything is saved to `localStorage`.

## Tests
Pure logic (tokenizer, parser, evaluator, row generation, state migration, text
export) is covered by a Node test suite. The tests load `app.js` against minimal
DOM stubs, so no browser is required.

```sh
npm test
```

Requires Node 18+ (uses the built-in `node:test` runner; no dependencies).
