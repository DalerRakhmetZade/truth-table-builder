// Pure helpers: constants, escaping, variable names, row generation, grading,
// state migration/normalization, and plain-text export. No DOM, no storage.
import { compile, evalAst } from "./parser.js";

export const DEFAULT_VAR_NAMES = ["p","q","r","s","t","u","v","w","x","y","z","a","b","c"];
export const ROW_WARN_THRESHOLD = 1024; // 2^10

export function escapeHtml(s) {
  return String(s).replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" }[c]));
}
export function escapeAttr(s) {
  return String(s).replace(/[&"<>]/g, (c) => ({ "&": "&amp;", '"': "&quot;", "<": "&lt;", ">": "&gt;" }[c]));
}
export function escapeRegExp(s) { return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"); }

export function defaultName(i) {
  return i < DEFAULT_VAR_NAMES.length ? DEFAULT_VAR_NAMES[i] : "v" + (i + 1);
}

// Resize a names array to length n, filling new slots with sensible defaults.
export function syncVarNames(names, n) {
  const out = (names || []).slice(0, n);
  for (let i = out.length; i < n; i++) out.push(defaultName(i));
  return out;
}

// Returns array of assignments keyed by variable name.
// Row 0 = all true; first var is most significant.
export function generateRows(names) {
  const n = names.length;
  const total = 1 << n;
  const rows = [];
  for (let i = 0; i < total; i++) {
    const row = {};
    for (let b = 0; b < n; b++) {
      const bit = (i >> (n - 1 - b)) & 1;
      row[names[b]] = bit === 0; // 0 => true so top row is all-true
    }
    rows.push(row);
  }
  return rows;
}

// Replace whole-identifier occurrences of oldName with newName in an expression.
export function renameInExpr(expr, oldName, newName) {
  if (!expr) return expr;
  const re = new RegExp("(^|[^A-Za-z0-9_])" + escapeRegExp(oldName) + "(?![A-Za-z0-9_])", "g");
  return expr.replace(re, (m, pre) => pre + newName);
}

// --- AST -> string ---------------------------------------------------------
// Precedence (high -> low): ¬(5) > ∧(4) > ∨/⊕(3) > →(2, right-assoc) > ↔(1).
const OP_PREC = { NOT: 5, AND: 4, OR: 3, XOR: 3, IMP: 2, IFF: 1 };
const OP_SYMBOL = { AND: "∧", OR: "∨", XOR: "⊕", IMP: "→", IFF: "↔" };

// Print an AST back to a clean expression string, parenthesizing only where
// needed. parsing the result yields an equivalent tree.
export function unparse(node) {
  return print(node).s;
}
function print(node) {
  switch (node.op) {
    case "CONST": return { s: node.v ? "T" : "F", prec: 6 };
    case "VAR": return { s: node.name, prec: 6 };
    case "NOT": {
      const c = print(node.e);
      const inner = c.prec < OP_PREC.NOT ? "(" + c.s + ")" : c.s;
      return { s: "¬" + inner, prec: OP_PREC.NOT };
    }
    default: {
      const p = OP_PREC[node.op];
      const rightAssoc = node.op === "IMP";
      const l = print(node.l);
      const r = print(node.r);
      // left child needs parens if lower precedence, or equal precedence on a
      // right-associative operator; right child is the mirror image.
      const lNeeds = l.prec < p || (l.prec === p && rightAssoc);
      const rNeeds = r.prec < p || (r.prec === p && !rightAssoc);
      const ls = lNeeds ? "(" + l.s + ")" : l.s;
      const rs = rNeeds ? "(" + r.s + ")" : r.s;
      return { s: ls + " " + OP_SYMBOL[node.op] + " " + rs, prec: p };
    }
  }
}

// Given an AST, return the converse/inverse/contrapositive of a top-level
// implication as expression strings, or null if it isn't an implication.
export function implicationForms(ast) {
  if (!ast || ast.op !== "IMP") return null;
  const A = ast.l, B = ast.r;
  const not = (n) => ({ op: "NOT", e: n });
  const imp = (l, r) => ({ op: "IMP", l, r });
  return {
    converse: unparse(imp(B, A)),
    inverse: unparse(imp(not(A), not(B))),
    contrapositive: unparse(imp(not(B), not(A))),
  };
}

// Grade typed guesses in a practice column against the correct expression values.
// Returns counts and a per-row result map ('correct' | 'incorrect' | 'blank').
export function gradeColumn(compiledAst, rows, cells) {
  let correct = 0, incorrect = 0, blank = 0;
  const results = {};
  rows.forEach((row, ri) => {
    const want = evalAst(compiledAst, row) ? "T" : "F";
    const guess = cells && cells[ri] ? String(cells[ri]).toUpperCase() : "";
    if (!guess) { blank++; results[ri] = "blank"; }
    else if (guess === want) { correct++; results[ri] = "correct"; }
    else { incorrect++; results[ri] = "incorrect"; }
  });
  return { correct, incorrect, blank, total: rows.length, results };
}

// Migrate a parsed storage object to the current { tables: [...] } shape.
// Returns the migrated state, or null if it can't be used.
export function migrateState(s) {
  if (!s || typeof s !== "object") return null;
  // old single-table format -> { tables: [...] }
  if (!s.tables && typeof s.varCount === "number" && Array.isArray(s.columns)) {
    return {
      tables: [{
        id: 1,
        title: "Table 1",
        varCount: s.varCount,
        varNames: Array.isArray(s.varNames) ? s.varNames : syncVarNames([], s.varCount),
        columns: s.columns,
      }],
    };
  }
  if (!Array.isArray(s.tables) || s.tables.length === 0) return null;
  return s;
}

// Repair tables in place (varCount/columns/varNames/id) and report the next ids.
export function normalizeState(state) {
  let maxTableId = 0, maxColId = 0;
  (state.tables || []).forEach((t) => {
    if (typeof t.varCount !== "number" || t.varCount < 1) t.varCount = 1;
    if (!Array.isArray(t.columns)) t.columns = [];
    t.varNames = syncVarNames(t.varNames, t.varCount);
    if (typeof t.id !== "number") t.id = maxTableId + 1;
    maxTableId = Math.max(maxTableId, t.id);
    t.columns.forEach((c) => { maxColId = Math.max(maxColId, c.id || 0); });
  });
  return { state, nextTableId: maxTableId + 1, nextColId: maxColId + 1 };
}

// Render a table as a plain-text grid (board-friendly). Pure.
export function tableToText(table) {
  const varList = table.varNames;
  const rows = generateRows(varList);
  const compiledCols = table.columns.map((col) => {
    if (col.overridden) return null;
    if (!col.expr || !col.expr.trim()) return null;
    try { return compile(col.expr, varList); } catch (e) { return null; }
  });
  const headers = varList.concat(table.columns.map((c) => (c.expr && c.expr.trim()) ? c.expr.trim() : "?"));
  const widths = headers.map((h) => Math.max(h.length, 1));

  const matrix = rows.map((row, ri) => {
    const line = varList.map((v) => (row[v] ? "T" : "F"));
    table.columns.forEach((col, ci) => {
      let cell = "";
      const comp = compiledCols[ci];
      if (comp && !col.overridden && !col.practice) {
        try { cell = evalAst(comp.ast, row) ? "T" : "F"; } catch (e) { cell = ""; }
      } else if (col.cells && col.cells[ri]) {
        cell = String(col.cells[ri]).toUpperCase();
      }
      line.push(cell);
    });
    line.forEach((c, i) => { widths[i] = Math.max(widths[i], c.length); });
    return line;
  });

  const pad = (s, w) => {
    const total = w - s.length;
    const left = Math.floor(total / 2);
    return " ".repeat(left) + s + " ".repeat(total - left);
  };
  const sep = "+" + widths.map((w) => "-".repeat(w + 2)).join("+") + "+";
  const fmt = (cells) => "| " + cells.map((c, i) => pad(c, widths[i])).join(" | ") + " |";

  let out = "";
  if (table.title && table.title.trim()) out += table.title.trim() + "\n";
  out += sep + "\n" + fmt(headers) + "\n" + sep + "\n";
  matrix.forEach((line) => { out += fmt(line) + "\n"; });
  out += sep;
  return out;
}
