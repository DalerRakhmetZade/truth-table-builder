"use strict";

/* ---------------------------------------------------------------------------
   Truth Table Builder — app logic (vanilla JS, no dependencies)
   Model:
     state = {
       tables: [ {
         id, title, varCount, varNames,
         columns: [ { id, expr, cells: { [rowIndex]: 'T'|'F' }, overridden, error } ]
       } ]
     }
   Variable columns are generated per table, not stored in `columns`.
--------------------------------------------------------------------------- */

const DEFAULT_VAR_NAMES = ["p","q","r","s","t","u","v","w","x","y","z","a","b","c"];
const STORAGE_KEY = "truthTableBuilder.v1";

/* ------------------------------ version / about -------------------------- */
const APP_VERSION = "1.1.0";
// Version history (newest first). Single source of truth for the About dialog;
// mirrored in CHANGELOG.md. Each entry: { version, date (YYYY-MM-DD), changes[] }.
const CHANGELOG = [
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

const ROW_WARN_THRESHOLD = 1024; // 2^10

function defaultName(i) {
  return i < DEFAULT_VAR_NAMES.length ? DEFAULT_VAR_NAMES[i] : "v" + (i + 1);
}
// Resize a names array to length n, filling new slots with sensible defaults.
function syncVarNames(names, n) {
  const out = (names || []).slice(0, n);
  for (let i = out.length; i < n; i++) out.push(defaultName(i));
  return out;
}

let nextTableId = 1;
let nextColId = 1;
let lastFocusedInput = null;

function makeTable(title) {
  const id = nextTableId++;
  return {
    id: id,
    title: title || ("Table " + id),
    varCount: 2,
    varNames: syncVarNames([], 2),
    columns: [],
  };
}

// New columns default to Practice mode so the answer is never auto-revealed.
function makeColumn() {
  return { id: nextColId++, expr: "", cells: {}, overridden: false, practice: true, results: {} };
}

let state = loadState() || { tables: [makeTable("Table 1")] };
// normalize ids/counters and varNames after load
state.tables.forEach((t) => {
  if (typeof t.varCount !== "number" || t.varCount < 1) t.varCount = 1;
  if (!Array.isArray(t.columns)) t.columns = [];
  t.varNames = syncVarNames(t.varNames, t.varCount);
  if (typeof t.id !== "number") t.id = nextTableId;
  nextTableId = Math.max(nextTableId, t.id + 1);
  t.columns.forEach((c) => { nextColId = Math.max(nextColId, (c.id || 0) + 1); });
});

/* ----------------------------- persistence ------------------------------ */
function saveState() {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch (e) {}
}
function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const s = JSON.parse(raw);
    // migrate old single-table format -> { tables: [...] }
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
  } catch (e) { return null; }
}

/* --------------------------- row generation ----------------------------- */
// Returns array of assignments keyed by variable name.
// Row 0 = all true; first var is most significant.
function generateRows(names) {
  const n = names.length;
  const total = 1 << n;
  const rows = [];
  for (let i = 0; i < total; i++) {
    const row = {};
    for (let b = 0; b < n; b++) {
      // most-significant bit -> first variable; true at top
      const bit = (i >> (n - 1 - b)) & 1;
      row[names[b]] = bit === 0; // 0 => true so top row is all-true
    }
    rows.push(row);
  }
  return rows;
}

/* ------------------------------ tokenizer ------------------------------- */
const T = { VAR: "VAR", NOT: "NOT", AND: "AND", OR: "OR", XOR: "XOR",
            IMP: "IMP", IFF: "IFF", LP: "LP", RP: "RP", CONST: "CONST" };

function tokenize(input, varSet) {
  varSet = varSet || new Set();
  const tokens = [];
  let i = 0;
  const s = input;
  while (i < s.length) {
    const ch = s[i];
    if (ch === " " || ch === "\t") { i++; continue; }

    // multi-char ASCII operators
    if (s.startsWith("<->", i)) { tokens.push({ t: T.IFF }); i += 3; continue; }
    if (s.startsWith("->", i))  { tokens.push({ t: T.IMP }); i += 2; continue; }

    switch (ch) {
      case "¬": case "~": case "!": tokens.push({ t: T.NOT }); i++; continue;
      case "∧": case "&": case "*": case ".": tokens.push({ t: T.AND }); i++; continue;
      case "∨": case "|": case "+": tokens.push({ t: T.OR }); i++; continue;
      case "⊕": case "^": tokens.push({ t: T.XOR }); i++; continue;
      case "→": tokens.push({ t: T.IMP }); i++; continue;
      case "↔": case "=": tokens.push({ t: T.IFF }); i++; continue;
      case "(": tokens.push({ t: T.LP }); i++; continue;
      case ")": tokens.push({ t: T.RP }); i++; continue;
    }

    // constants
    if (ch === "1") { tokens.push({ t: T.CONST, v: true }); i++; continue; }
    if (ch === "0") { tokens.push({ t: T.CONST, v: false }); i++; continue; }

    // identifier: variable name (may be multi-character)
    if (/[A-Za-z_]/.test(ch)) {
      let j = i + 1;
      while (j < s.length && /[A-Za-z0-9_]/.test(s[j])) j++;
      const name = s.slice(i, j);
      i = j;
      if (varSet.has(name)) { tokens.push({ t: T.VAR, name: name }); continue; }
      if (name === "T") { tokens.push({ t: T.CONST, v: true }); continue; }
      if (name === "F") { tokens.push({ t: T.CONST, v: false }); continue; }
      throw new Error("Unknown variable “" + name + "”");
    }
    throw new Error("Unexpected character: " + ch);
  }
  return tokens;
}

/* ------------------------------ parser ----------------------------------
   Grammar (precedence low -> high):
     iff   := imp ( '↔' imp )*            (left-assoc)
     imp   := or  ( '→' imp )?            (right-assoc)
     or    := and ( ('∨'|'⊕') and )*      (left-assoc)
     and   := unary ( '∧' unary )*        (left-assoc)
     unary := '¬' unary | primary
     primary := VAR | CONST | '(' iff ')'
------------------------------------------------------------------------- */
function parse(tokens) {
  let pos = 0;
  const peek = () => tokens[pos];
  const next = () => tokens[pos++];
  const expect = (t) => {
    const tok = next();
    if (!tok || tok.t !== t) throw new Error("Expected " + t);
    return tok;
  };

  function parseIff() {
    let left = parseImp();
    while (peek() && peek().t === T.IFF) { next(); const right = parseImp(); left = { op: "IFF", l: left, r: right }; }
    return left;
  }
  function parseImp() {
    const left = parseOr();
    if (peek() && peek().t === T.IMP) { next(); const right = parseImp(); return { op: "IMP", l: left, r: right }; }
    return left;
  }
  function parseOr() {
    let left = parseAnd();
    while (peek() && (peek().t === T.OR || peek().t === T.XOR)) {
      const op = next().t === T.OR ? "OR" : "XOR";
      const right = parseAnd();
      left = { op, l: left, r: right };
    }
    return left;
  }
  function parseAnd() {
    let left = parseUnary();
    while (peek() && peek().t === T.AND) { next(); const right = parseUnary(); left = { op: "AND", l: left, r: right }; }
    return left;
  }
  function parseUnary() {
    if (peek() && peek().t === T.NOT) { next(); return { op: "NOT", e: parseUnary() }; }
    return parsePrimary();
  }
  function parsePrimary() {
    const tok = peek();
    if (!tok) throw new Error("Unexpected end of expression");
    if (tok.t === T.VAR) { next(); return { op: "VAR", name: tok.name }; }
    if (tok.t === T.CONST) { next(); return { op: "CONST", v: tok.v }; }
    if (tok.t === T.LP) { next(); const e = parseIff(); expect(T.RP); return e; }
    throw new Error("Unexpected token");
  }

  const ast = parseIff();
  if (pos !== tokens.length) throw new Error("Trailing tokens");
  return ast;
}

function compile(expr, varList) {
  const trimmed = (expr || "").trim();
  if (!trimmed) return null;
  const ast = parse(tokenize(trimmed, new Set(varList || [])));
  const vars = new Set();
  collectVars(ast, vars);
  return { ast, vars };
}
function collectVars(node, set) {
  if (!node) return;
  if (node.op === "VAR") set.add(node.name);
  else if (node.op === "NOT") collectVars(node.e, set);
  else if (node.l) { collectVars(node.l, set); collectVars(node.r, set); }
}

function evalAst(node, env) {
  switch (node.op) {
    case "CONST": return node.v;
    case "VAR": {
      if (!(node.name in env)) throw new Error("Unknown variable " + node.name);
      return env[node.name];
    }
    case "NOT": return !evalAst(node.e, env);
    case "AND": return evalAst(node.l, env) && evalAst(node.r, env);
    case "OR":  return evalAst(node.l, env) || evalAst(node.r, env);
    case "XOR": return evalAst(node.l, env) !== evalAst(node.r, env);
    case "IMP": return !evalAst(node.l, env) || evalAst(node.r, env);
    case "IFF": return evalAst(node.l, env) === evalAst(node.r, env);
  }
  throw new Error("Bad node");
}

/* ------------------------------ rendering -------------------------------- */
const tablesEl = document.getElementById("tables");
const warnEl = document.getElementById("warn");

function getTable(id) { return state.tables.find((t) => t.id === Number(id)); }
function getCol(table, id) { return table.columns.find((c) => c.id === Number(id)); }

function render() {
  tablesEl.innerHTML = state.tables.map(renderTable).join("");
  saveState();
}

function renderTable(table) {
  const varList = table.varNames;
  const rows = generateRows(varList);
  const tid = table.id;

  // pre-compile expression columns
  table.columns.forEach((col) => {
    col.error = null;
    col.compiled = null;
    if (col.overridden) return;
    if (!col.expr || !col.expr.trim()) return;
    try {
      const c = compile(col.expr, varList);
      if (c) col.compiled = c;
    } catch (e) { col.error = e.message; }
  });

  const big = rows.length > ROW_WARN_THRESHOLD;

  let h = '<div class="card" data-table="' + tid + '">';

  // top bar: title + controls
  h += '<div class="card-bar">' +
        '<input type="text" class="title-input" data-table="' + tid + '" ' +
          'value="' + escapeAttr(table.title || "") + '" placeholder="Untitled table" />' +
        '<div class="group"><label>Variables</label>' +
          '<input type="number" class="varcount-input" data-table="' + tid + '" ' +
          'min="1" max="14" value="' + table.varCount + '" /></div>' +
        '<div class="group">' +
          '<button class="primary" data-action="addcol" data-table="' + tid + '">+ Column</button>' +
          '<button class="ghost" data-action="clear" data-table="' + tid + '">Clear</button>' +
          '<button class="ghost" data-action="copy" data-table="' + tid + '">Copy</button>' +
          '<button class="ghost remove-table" data-action="removetable" data-table="' + tid + '">Remove</button>' +
        '</div>' +
      '</div>';

  h += '<div class="card-warn' + (big ? " show" : "") + '">' +
        (big ? ("Heads up: " + varList.length + " variables = " + rows.length +
          " rows. Large tables may be slow.") : "") + '</div>';

  h += '<div class="card-body"><table><thead><tr>';
  varList.forEach((v, vi) => {
    h += '<th class="var-col"><input type="text" class="var-input" ' +
         'data-table="' + tid + '" data-var="' + vi + '" value="' + escapeAttr(v) + '" ' +
         'title="Rename variable" maxlength="12" /></th>';
  });
  table.columns.forEach((col) => {
    const cls = col.error ? "expr-input invalid" : "expr-input";
    let metaCls = "meta", metaTxt = "";
    if (col.error) { metaCls = "meta error"; metaTxt = escapeHtml(col.error); }
    else if (col.overridden) { metaCls = "meta overridden"; metaTxt = "manual"; }

    let controls = "";
    if (col.compiled) {
      const on = !!col.practice;
      controls = '<div class="practice-controls">' +
        '<div class="seg" role="group" aria-label="Column mode">' +
          '<button class="seg-btn' + (on ? "" : " active") + '" data-action="setmode" data-mode="auto" ' +
            'data-table="' + tid + '" data-col="' + col.id + '" title="Auto-fill the column">Auto</button>' +
          '<button class="seg-btn' + (on ? " active" : "") + '" data-action="setmode" data-mode="practice" ' +
            'data-table="' + tid + '" data-col="' + col.id + '" title="Fill it in yourself, then check">Practice</button>' +
        '</div>';
      if (on) {
        controls += '<button class="mini" data-action="check" data-table="' + tid + '" data-col="' + col.id + '">Check</button>' +
          '<button class="mini ghost" data-action="reveal" data-table="' + tid + '" data-col="' + col.id + '">Reveal</button>';
      }
      controls += "</div>";
    }
    const coach = col.compiled && col.practice
      ? '<div class="coach ' + (col.summaryKind || "") + '" data-table="' + tid + '" data-col="' + col.id + '">' +
          (col.summary || "&nbsp;") + "</div>"
      : "";

    h += '<th><div class="col-head"><div class="head-row">' +
          '<input type="text" class="' + cls + '" data-table="' + tid + '" data-col="' + col.id + '" ' +
            'value="' + escapeAttr(col.expr || "") + '" placeholder="expr or blank" />' +
          '<button class="remove" data-table="' + tid + '" data-remove="' + col.id + '" ' +
            'title="Remove column">✕</button>' +
          '</div><div class="' + metaCls + '">' + metaTxt + '</div>' +
          controls + coach + '</div></th>';
  });
  h += "</tr></thead><tbody>";

  rows.forEach((row, ri) => {
    h += "<tr>";
    varList.forEach((v) => {
      const val = row[v];
      h += '<td class="var-cell ' + (val ? "t" : "f") + '"><span class="cell">' +
           (val ? "T" : "F") + "</span></td>";
    });
    table.columns.forEach((col) => {
      const isAuto = col.compiled && !col.overridden && !col.practice;
      const isPractice = col.compiled && col.practice;
      if (isAuto) {
        let display = "", cls = "";
        try {
          const val = evalAst(col.compiled.ast, row);
          display = val ? "T" : "F"; cls = val ? "t" : "f";
        } catch (e) { display = ""; }
        h += '<td class="' + cls + '" data-table="' + tid + '" data-col="' + col.id + '" ' +
             'data-row="' + ri + '" data-editable="0"><span class="cell">' + display + "</span></td>";
      } else if (isPractice) {
        const guess = col.cells && col.cells[ri] ? String(col.cells[ri]) : "";
        const res = col.results ? col.results[ri] : undefined;
        const resCls = res === "correct" ? " correct" : res === "incorrect" ? " incorrect"
                     : res === "revealed" ? " revealed" : "";
        h += '<td class="prac-cell' + resCls + '" data-table="' + tid + '" data-col="' + col.id + '" ' +
             'data-row="' + ri + '" data-editable="0">' +
             '<input class="practice-input" maxlength="1" autocomplete="off" spellcheck="false" ' +
               'aria-label="T or F" data-table="' + tid + '" data-col="' + col.id + '" data-row="' + ri + '" ' +
               'value="' + escapeAttr(guess) + '" /><span class="mark" aria-hidden="true"></span></td>';
      } else {
        let display = "", cls = "";
        const stored = col.cells ? col.cells[ri] : undefined;
        if (stored === "T") { display = "T"; cls = "t"; }
        else if (stored === "F") { display = "F"; cls = "f"; }
        h += '<td class="' + cls + '" data-table="' + tid + '" data-col="' + col.id + '" ' +
             'data-row="' + ri + '" data-editable="1"><span class="cell">' + display + "</span></td>";
      }
    });
    h += "</tr>";
  });
  h += "</tbody></table>";

  if (table.columns.length === 0) {
    const a = escapeHtml(varList[0] || "p"), b = escapeHtml(varList[1] || "q");
    h += '<div class="empty">Add a column to start testing propositions — e.g. ' +
         a + ' → (' + b + ' ∧ ¬' + a + ')</div>';
  }
  h += "</div></div>";
  return h;
}

function escapeHtml(s) {
  return String(s).replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" }[c]));
}
function escapeAttr(s) {
  return String(s).replace(/[&"<>]/g, (c) => ({ "&": "&amp;", '"': "&quot;", "<": "&lt;", ">": "&gt;" }[c]));
}
function escapeRegExp(s) { return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"); }
// Grade typed guesses in a practice column against the correct expression values.
// Returns counts and a per-row result map ('correct' | 'incorrect' | 'blank').
function gradeColumn(compiledAst, rows, cells) {
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
// Replace whole-identifier occurrences of oldName with newName in an expression.
function renameInExpr(expr, oldName, newName) {
  if (!expr) return expr;
  const re = new RegExp("(^|[^A-Za-z0-9_])" + escapeRegExp(oldName) + "(?![A-Za-z0-9_])", "g");
  return expr.replace(re, (m, pre) => pre + newName);
}

/* ------------------------------ interactions ----------------------------- */
// cell toggle
tablesEl.addEventListener("click", (e) => {
  const td = e.target.closest("td");
  if (!td || td.dataset.col === undefined || td.dataset.row === undefined) return;
  if (td.dataset.editable !== "1") return;
  const table = getTable(td.dataset.table); if (!table) return;
  const col = getCol(table, td.dataset.col); if (!col) return;
  const ri = Number(td.dataset.row);
  if (!col.cells) col.cells = {};
  const cur = col.cells[ri];
  if (cur === "T") col.cells[ri] = "F";
  else if (cur === "F") delete col.cells[ri];
  else col.cells[ri] = "T";
  render();
});

// expression typing + live title editing + practice-cell entry
tablesEl.addEventListener("input", (e) => {
  const pcell = e.target.closest("input.practice-input");
  if (pcell) { handlePracticeInput(pcell); return; }
  const title = e.target.closest("input.title-input");
  if (title) {
    const table = getTable(title.dataset.table);
    if (table) { table.title = title.value; saveState(); }
    return;
  }
  const input = e.target.closest("input.expr-input");
  if (!input) return;
  const table = getTable(input.dataset.table); if (!table) return;
  const col = getCol(table, input.dataset.col); if (!col) return;
  col.expr = input.value;
  col.overridden = false;
  liveUpdateColumn(table, col, input);
  saveState();
});

function coachEl(table, col) {
  return tablesEl.querySelector('.coach[data-table="' + table.id + '"][data-col="' + col.id + '"]');
}
function setCoach(table, col, msg, kind) {
  col.summary = msg || "";
  col.summaryKind = kind || "";
  const el = coachEl(table, col);
  if (el) { el.innerHTML = msg ? escapeHtml(msg) : "&nbsp;"; el.className = "coach " + (kind || ""); }
}

// Restrict practice cells to T/F (t/f allowed); coach on anything else.
function handlePracticeInput(input) {
  const table = getTable(input.dataset.table); if (!table) return;
  const col = getCol(table, input.dataset.col); if (!col) return;
  const ri = Number(input.dataset.row);
  col.cells = col.cells || {};
  let v = input.value;
  if (v.length > 1) v = v.slice(-1); // keep only the most recent character

  if (v === "") {
    delete col.cells[ri];
    input.value = "";
    setCoach(table, col, "", "");
  } else if (/^[tTfF]$/.test(v)) {
    col.cells[ri] = v; // keep case until Check uppercases it
    input.value = v;
    setCoach(table, col, "", "");
  } else {
    input.value = col.cells[ri] || ""; // reject the invalid character
    setCoach(table, col, "Only T or F allowed.", "warn");
  }
  // editing a cell clears its previous check result/color
  if (col.results) delete col.results[ri];
  const td = input.closest("td");
  if (td) td.classList.remove("correct", "incorrect", "revealed");
  saveState();
}

function handleCheck(table, col) {
  if (!col || !col.compiled) return;
  const rows = generateRows(table.varNames);
  col.cells = col.cells || {};
  Object.keys(col.cells).forEach((k) => {
    if (col.cells[k]) col.cells[k] = String(col.cells[k]).toUpperCase();
  });
  const g = gradeColumn(col.compiled.ast, rows, col.cells);
  col.results = g.results;
  if (g.incorrect === 0 && g.blank === 0) {
    col.summary = "All " + g.total + " correct! 🎉"; col.summaryKind = "ok";
  } else {
    col.summary = g.correct + "/" + g.total + " correct" +
      (g.incorrect ? " · " + g.incorrect + " to fix" : "") +
      (g.blank ? " · " + g.blank + " blank" : "");
    col.summaryKind = g.incorrect ? "warn" : "info";
  }
  render();
}

function handleReveal(table, col) {
  if (!col || !col.compiled) return;
  const rows = generateRows(table.varNames);
  col.cells = col.cells || {};
  col.results = {};
  rows.forEach((row, ri) => {
    col.cells[ri] = evalAst(col.compiled.ast, row) ? "T" : "F";
    col.results[ri] = "revealed";
  });
  col.summary = "Answers revealed."; col.summaryKind = "info";
  render();
}

tablesEl.addEventListener("focusin", (e) => {
  const input = e.target.closest("input.expr-input");
  if (input) lastFocusedInput = input;
});

tablesEl.addEventListener("focusout", (e) => {
  const input = e.target.closest("input.expr-input");
  if (input) render();
});

function liveUpdateColumn(table, col, input) {
  const varList = table.varNames;
  const rows = generateRows(varList);
  let error = null, compiled = null;
  if (col.expr && col.expr.trim()) {
    try { const c = compile(col.expr, varList); if (c) compiled = c; }
    catch (err) { error = err.message; }
  }
  input.classList.toggle("invalid", !!error);
  const meta = input.closest(".col-head").querySelector(".meta");
  if (error) { meta.textContent = error; meta.className = "meta error"; }
  else { meta.textContent = ""; meta.className = "meta"; }

  // Never reveal answers while a column is in practice mode. The full render on
  // blur lays out the (empty) practice cells; here we just avoid live-filling.
  if (col.practice) return;

  const tds = tablesEl.querySelectorAll('td[data-table="' + table.id + '"][data-col="' + col.id + '"]');
  tds.forEach((td) => {
    const ri = Number(td.dataset.row);
    if (compiled) {
      let val; try { val = evalAst(compiled.ast, rows[ri]); } catch (e) { return; }
      td.dataset.editable = "0";
      td.className = val ? "t" : "f";
      td.querySelector(".cell").textContent = val ? "T" : "F";
    } else {
      // invalid or empty expression: revert to manual stored values
      const stored = col.cells ? col.cells[ri] : undefined;
      td.dataset.editable = "1";
      td.className = stored === "T" ? "t" : stored === "F" ? "f" : "";
      td.querySelector(".cell").textContent = stored === "T" ? "T" : stored === "F" ? "F" : "";
    }
  });
}

// remove column
tablesEl.addEventListener("click", (e) => {
  const btn = e.target.closest("button.remove");
  if (!btn) return;
  const table = getTable(btn.dataset.table); if (!table) return;
  table.columns = table.columns.filter((c) => c.id !== Number(btn.dataset.remove));
  render();
});

// double-click a computed cell -> freeze values into manual override mode
tablesEl.addEventListener("dblclick", (e) => {
  const td = e.target.closest("td");
  if (!td || td.dataset.col === undefined) return;
  if (td.dataset.editable === "1") return;
  const table = getTable(td.dataset.table); if (!table) return;
  const col = getCol(table, td.dataset.col); if (!col) return;
  const rows = generateRows(table.varNames);
  col.cells = col.cells || {};
  if (col.compiled) {
    rows.forEach((row, ri) => {
      try { col.cells[ri] = evalAst(col.compiled.ast, row) ? "T" : "F"; } catch (e) {}
    });
  }
  col.overridden = true;
  render();
});

// per-table action buttons (add column / clear / copy / remove table)
tablesEl.addEventListener("click", (e) => {
  const btn = e.target.closest("button[data-action]");
  if (!btn) return;
  const table = getTable(btn.dataset.table); if (!table) return;
  const act = btn.dataset.action;
  if (act === "addcol") {
    table.columns.push(makeColumn());
    render();
    const inputs = tablesEl.querySelectorAll('input.expr-input[data-table="' + table.id + '"]');
    if (inputs.length) inputs[inputs.length - 1].focus();
  } else if (act === "clear") {
    table.columns.forEach((c) => {
      c.cells = {}; c.overridden = false; c.results = {}; c.summary = ""; c.summaryKind = "";
    });
    render();
  } else if (act === "copy") {
    copyTableText(table, btn);
  } else if (act === "removetable") {
    if (!confirm("Remove “" + (table.title || "this table") + "”?")) return;
    state.tables = state.tables.filter((t) => t.id !== table.id);
    if (state.tables.length === 0) state.tables.push(makeTable("Table 1"));
    render();
  } else if (act === "setmode") {
    const col = getCol(table, btn.dataset.col); if (!col) return;
    const wantPractice = btn.dataset.mode === "practice";
    if (!!col.practice === wantPractice) return;
    col.practice = wantPractice;
    col.results = {};
    col.summary = ""; col.summaryKind = "";
    render();
  } else if (act === "check") {
    handleCheck(table, getCol(table, btn.dataset.col));
  } else if (act === "reveal") {
    handleReveal(table, getCol(table, btn.dataset.col));
  }
});

// rename variables & change variable count (commit on blur/Enter)
tablesEl.addEventListener("change", (e) => {
  const vinput = e.target.closest("input.var-input");
  if (vinput) { handleRename(vinput); return; }
  const vc = e.target.closest("input.varcount-input");
  if (vc) { handleVarCount(vc); return; }
});

function handleRename(input) {
  const table = getTable(input.dataset.table); if (!table) return;
  const vi = Number(input.dataset.var);
  const oldName = table.varNames[vi];
  const newName = input.value.trim();
  const valid = /^[A-Za-z_][A-Za-z0-9_]*$/.test(newName);
  const dupe = table.varNames.some((nm, i) => i !== vi && nm === newName);
  if (!valid || dupe) {
    warnEl.textContent = !valid
      ? "Invalid name “" + newName + "”. Use a letter/underscore, then letters, digits or underscores (no spaces or operators)."
      : "“" + newName + "” is already used by another variable in this table.";
    warnEl.classList.add("show");
    render();
    return;
  }
  if (newName === oldName) return;
  warnEl.classList.remove("show");
  table.columns.forEach((col) => {
    col.expr = renameInExpr(col.expr, oldName, newName);
  });
  table.varNames[vi] = newName;
  render();
}

function handleVarCount(input) {
  const table = getTable(input.dataset.table); if (!table) return;
  let n = parseInt(input.value, 10);
  if (isNaN(n) || n < 1) n = 1;
  if (n > 14) n = 14;
  table.varCount = n;
  table.varNames = syncVarNames(table.varNames, n);
  render();
}

/* ------------------------------ global controls -------------------------- */
document.getElementById("addTable").addEventListener("click", () => {
  const t = makeTable("Table " + (state.tables.length + 1));
  state.tables.push(t);
  render();
  const titles = tablesEl.querySelectorAll('input.title-input[data-table="' + t.id + '"]');
  if (titles.length) { titles[0].focus(); titles[0].select(); }
});

document.getElementById("resetAll").addEventListener("click", () => {
  if (!confirm("Reset everything (all tables and columns)?")) return;
  nextTableId = 1; nextColId = 1;
  state = { tables: [makeTable("Table 1")] };
  render();
});

// symbol insert toolbar (global; inserts into the focused expression field)
document.getElementById("symbols").addEventListener("mousedown", (e) => {
  if (e.target.closest("button[data-sym]")) e.preventDefault();
});
document.getElementById("symbols").addEventListener("click", (e) => {
  const btn = e.target.closest("button[data-sym]");
  if (!btn) return;
  const sym = btn.dataset.sym;
  const input = lastFocusedInput && document.body.contains(lastFocusedInput) ? lastFocusedInput : null;
  if (!input) { alert("Click into an expression field first, then insert a symbol."); return; }
  const start = input.selectionStart, end = input.selectionEnd;
  input.value = input.value.slice(0, start) + sym + input.value.slice(end);
  const pos = start + sym.length;
  input.setSelectionRange(pos, pos);
  input.focus();
  input.dispatchEvent(new Event("input", { bubbles: true }));
});

/* ------------------------------ copy as text ----------------------------- */
function copyTableText(table, btn) {
  const text = tableToText(table);
  navigator.clipboard.writeText(text).then(
    () => flashCopy(btn, true),
    () => fallbackCopy(text, btn)
  );
}
function flashCopy(btn, ok) {
  const orig = btn.textContent;
  btn.textContent = ok ? "Copied!" : "Failed";
  setTimeout(() => (btn.textContent = orig), 1200);
}
function fallbackCopy(text, btn) {
  const ta = document.createElement("textarea");
  ta.value = text; document.body.appendChild(ta); ta.select();
  try { document.execCommand("copy"); flashCopy(btn, true); } catch (e) { flashCopy(btn, false); }
  document.body.removeChild(ta);
}

function tableToText(table) {
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

/* ------------------------------ keyboard --------------------------------- */
document.addEventListener("keydown", (e) => {
  if (e.key === "Enter") {
    const input = e.target.closest &&
      e.target.closest("input.expr-input, input.var-input, input.varcount-input, input.title-input");
    if (input) input.blur();
  }
});

/* ------------------------------ about dialog ----------------------------- */
function initAbout() {
  const versionLabel = document.getElementById("versionLabel");
  const aboutVersion = document.getElementById("aboutVersion");
  if (versionLabel) versionLabel.textContent = "v" + APP_VERSION;
  if (aboutVersion) aboutVersion.textContent = "v" + APP_VERSION;

  const changelogEl = document.getElementById("changelog");
  if (changelogEl) changelogEl.innerHTML = renderChangelog(CHANGELOG);

  const dialog = document.getElementById("aboutDialog");
  const openBtn = document.getElementById("aboutBtn");
  const closeBtn = document.getElementById("aboutClose");
  if (!dialog || !openBtn) return;

  openBtn.addEventListener("click", () => {
    if (typeof dialog.showModal === "function") dialog.showModal();
    else dialog.setAttribute("open", "");
  });
  if (closeBtn) closeBtn.addEventListener("click", () => dialog.close());
  // close when clicking the backdrop (outside the dialog content box)
  dialog.addEventListener("click", (e) => {
    const r = dialog.getBoundingClientRect();
    const inside = e.clientX >= r.left && e.clientX <= r.right &&
                   e.clientY >= r.top && e.clientY <= r.bottom;
    if (!inside) dialog.close();
  });
}

function renderChangelog(entries) {
  return entries.map((rel) =>
    '<div class="release">' +
      '<div class="release-head">' +
        '<span class="release-ver">v' + escapeHtml(rel.version) + '</span>' +
        '<span class="release-date">' + escapeHtml(rel.date) + '</span>' +
      '</div><ul>' +
      rel.changes.map((c) => "<li>" + escapeHtml(c) + "</li>").join("") +
      "</ul></div>"
  ).join("");
}

/* ------------------------------ boot ------------------------------------- */
render();
initAbout();
