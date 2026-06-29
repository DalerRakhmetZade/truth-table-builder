// App version + changelog data (single source of truth, mirrored in CHANGELOG.md)
// and the changelog renderer for the About dialog.
import { escapeHtml } from "./logic.js";

export const APP_VERSION = "1.3.0";

// Version history (newest first). Each entry: { version, date (YYYY-MM-DD), changes[] }.
export const CHANGELOG = [
  {
    version: "1.3.0",
    date: "2026-06-29",
    changes: [
      "Fresh look: a calmer, Apple-inspired light design across the whole app.",
      "Type “/” inside a formula to pick a symbol — filter by typing, navigate with ↑/↓, Enter to insert.",
      "Friendlier formula error messages that point at the problem, shown only after you finish typing.",
      "Operator buttons now have tooltips (NOT, AND, OR, XOR, IMPLIES, IFF).",
      "Removing a table or a column now asks for confirmation, using an in-app dialog (no browser pop-ups).",
      "Reorder tables with up/down arrows when you have more than one.",
      "You can now delete the last remaining table.",
      "Removed the per-table Clear button — remove individual columns with their ✕ instead.",
      "The “What's new” list is now collapsible by version.",
      "Wider layout so larger tables have more room.",
    ],
  },
  {
    version: "1.2.0",
    date: "2026-06-29",
    changes: [
      "Internal: refactored the app into ES modules (js/) and split the CSS into focused files (css/).",
      "Dev: the app now loads as native modules, so it must be served — added `npm start` (a zero-dependency local server). It no longer opens directly via file://.",
      "Dev: js/version.js is now the single source of truth for the version and changelog; `npm run sync-version` regenerates CHANGELOG.md and package.json.",
      "No user-facing changes — the app behaves exactly as before.",
    ],
  },
  {
    version: "1.1.0",
    date: "2026-06-29",
    changes: [
      "New: Practice mode — fill in a column's T/F values yourself, then Check your answers.",
      "Auto / Practice switch per column; new columns start in Practice so answers aren't revealed.",
      "Check grades your guesses (✓ / ✗ with a ring) and shows a summary like “6/8 correct”.",
      "Reveal answers button fills in the correct values when you want to see them.",
      "Cells accept only T or F (lowercase is auto-capitalized on Check), with a hint if you type anything else.",
      "Credited CSCI S-20 in the About dialog.",
    ],
  },
  {
    version: "1.0.0",
    date: "2026-06-29",
    changes: [
      "First public release.",
      "Generate truth tables from a chosen number of variables (standard textbook order).",
      "Multiple tables, each with its own editable title.",
      "Rename variables inline; renames propagate into that table's expressions.",
      "Add expression columns that auto-evaluate, or toggle cells manually (T / F / blank).",
      "Operators ¬ ∧ ∨ → ↔ ⊕ with ASCII aliases (~ ! & * . | + ^ -> <-> =) and constants T/F/1/0.",
      "Copy any table as a plain-text grid; work auto-saves to your browser.",
      "About dialog with version history.",
    ],
  },
];

export function renderChangelog(entries) {
  return entries.map((rel, i) =>
    '<details class="release"' + (i === 0 ? " open" : "") + '>' +
      '<summary class="release-head">' +
        '<span class="release-ver">v' + escapeHtml(rel.version) + '</span>' +
        '<span class="release-date">' + escapeHtml(rel.date) + '</span>' +
      '</summary><ul>' +
      rel.changes.map((c) => "<li>" + escapeHtml(c) + "</li>").join("") +
      "</ul></details>"
  ).join("");
}
