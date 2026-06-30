// All DOM event wiring and interaction handlers.
import { tablesEl, warnEl } from "./dom.js";
import { app, getTable, getCol, makeTable, makeColumn, saveState, resetState } from "./store.js";
import { compile, evalAst } from "./parser.js";
import { generateRows, gradeColumn, syncVarNames, renameInExpr, tableToText, MAX_VARS, RESERVED_NAMES } from "./logic.js";
import { render } from "./render.js";
import { confirmDialog, notify } from "./ui.js";

export function initEvents() {
  // cell toggle (manual columns)
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

  tablesEl.addEventListener("focusin", (e) => {
    const input = e.target.closest("input.expr-input");
    if (input) app.lastFocusedInput = input;
  });

  tablesEl.addEventListener("focusout", (e) => {
    const input = e.target.closest("input.expr-input");
    if (input) render();
  });

  // remove column (with confirmation)
  tablesEl.addEventListener("click", async (e) => {
    const btn = e.target.closest("button.remove");
    if (!btn) return;
    const table = getTable(btn.dataset.table); if (!table) return;
    const col = getCol(table, btn.dataset.remove); if (!col) return;
    const label = col.expr && col.expr.trim() ? "“" + col.expr.trim() + "”" : "this column";
    const ok = await confirmDialog("Remove the " + label + " column?",
      { confirmText: "Remove", danger: true });
    if (!ok) return;
    table.columns = table.columns.filter((c) => c.id !== col.id);
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

  // per-table action buttons (add / copy / remove / reorder / mode / check / reveal)
  tablesEl.addEventListener("click", async (e) => {
    const btn = e.target.closest("button[data-action]");
    if (!btn) return;
    const table = getTable(btn.dataset.table); if (!table) return;
    const act = btn.dataset.action;
    if (act === "addcol") {
      table.columns.push(makeColumn());
      render();
      const inputs = tablesEl.querySelectorAll('input.expr-input[data-table="' + table.id + '"]');
      if (inputs.length) inputs[inputs.length - 1].focus();
    } else if (act === "copy") {
      copyTableText(table, btn);
    } else if (act === "removetable") {
      const ok = await confirmDialog("Remove “" + (table.title || "this table") + "”?",
        { confirmText: "Remove", danger: true });
      if (!ok) return;
      app.state.tables = app.state.tables.filter((t) => t.id !== table.id);
      render();
    } else if (act === "moveup" || act === "movedown") {
      const arr = app.state.tables;
      const i = arr.indexOf(table);
      const j = act === "moveup" ? i - 1 : i + 1;
      if (i < 0 || j < 0 || j >= arr.length) return;
      [arr[i], arr[j]] = [arr[j], arr[i]];
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
    } else if (act === "addform") {
      // add the chosen logical form (converse/inverse/contrapositive) as a new
      // Practice-mode column
      const col = makeColumn();
      col.expr = btn.dataset.expr || "";
      table.columns.push(col);
      render();
    }
  });

  // close any open "Logical forms" menu when clicking outside it
  document.addEventListener("click", (e) => {
    if (e.target.closest(".forms-menu")) return;
    tablesEl.querySelectorAll("details.forms-menu[open]").forEach((d) => { d.open = false; });
  });

  // rename variables & change variable count (commit on blur/Enter)
  tablesEl.addEventListener("change", (e) => {
    const vinput = e.target.closest("input.var-input");
    if (vinput) { handleRename(vinput); return; }
    const vc = e.target.closest("input.varcount-input");
    if (vc) { handleVarCount(vc); return; }
  });

  // global controls
  document.getElementById("addTable").addEventListener("click", () => {
    const t = makeTable("Table " + (app.state.tables.length + 1));
    app.state.tables.push(t);
    render();
    const titles = tablesEl.querySelectorAll('input.title-input[data-table="' + t.id + '"]');
    if (titles.length) { titles[0].focus(); titles[0].select(); }
  });

  document.getElementById("resetAll").addEventListener("click", async () => {
    const ok = await confirmDialog("Reset everything (all tables and columns)?",
      { confirmText: "Reset", danger: true });
    if (!ok) return;
    resetState();
    render();
  });

  // symbol insert toolbar (inserts into the focused expression field)
  const symbols = document.getElementById("symbols");
  symbols.addEventListener("mousedown", (e) => {
    if (e.target.closest("button[data-sym]")) e.preventDefault();
  });
  symbols.addEventListener("click", (e) => {
    const btn = e.target.closest("button[data-sym]");
    if (!btn) return;
    const sym = btn.dataset.sym;
    const input = app.lastFocusedInput && document.body.contains(app.lastFocusedInput) ? app.lastFocusedInput : null;
    if (!input) { notify("Click into an expression field first, then insert a symbol."); return; }
    const start = input.selectionStart, end = input.selectionEnd;
    input.value = input.value.slice(0, start) + sym + input.value.slice(end);
    const pos = start + sym.length;
    input.setSelectionRange(pos, pos);
    input.focus();
    input.dispatchEvent(new Event("input", { bubbles: true }));
  });

  // Enter commits the focused field
  document.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      const input = e.target.closest &&
        e.target.closest("input.expr-input, input.var-input, input.varcount-input, input.title-input");
      if (input) input.blur();
    }
  });
}

/* ------------------------------ helpers ---------------------------------- */
function coachEl(table, col) {
  return tablesEl.querySelector('.coach[data-table="' + table.id + '"][data-col="' + col.id + '"]');
}
function setCoach(table, col, msg, kind) {
  col.summary = msg || "";
  col.summaryKind = kind || "";
  const el = coachEl(table, col);
  if (el) { el.textContent = msg || ""; el.className = "coach " + (kind || "") + (msg ? "" : " coach-empty"); }
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

function liveUpdateColumn(table, col, input) {
  const varList = table.varNames;
  const rows = generateRows(varList);
  let compiled = null;
  if (col.expr && col.expr.trim()) {
    try { const c = compile(col.expr, varList); if (c) compiled = c; }
    catch (err) { /* don't surface parse errors while still typing */ }
  }
  // While editing, never show the error styling/text — it's distracting to flash
  // errors on a half-typed expression. The error appears on blur (full render).
  input.classList.remove("invalid");
  const meta = input.closest(".col-head").querySelector(".meta");
  if (meta) { meta.textContent = ""; meta.className = "meta"; }

  // Never reveal answers while a column is in practice mode.
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
      const stored = col.cells ? col.cells[ri] : undefined;
      td.dataset.editable = "1";
      td.className = stored === "T" ? "t" : stored === "F" ? "f" : "";
      td.querySelector(".cell").textContent = stored === "T" ? "T" : stored === "F" ? "F" : "";
    }
  });
}

function handleRename(input) {
  const table = getTable(input.dataset.table); if (!table) return;
  const vi = Number(input.dataset.var);
  const oldName = table.varNames[vi];
  const newName = input.value.trim().toUpperCase(); // variables are uppercase
  const valid = /^[A-Za-z_][A-Za-z0-9_]*$/.test(newName);
  const reserved = RESERVED_NAMES.includes(newName);
  const dupe = table.varNames.some((nm, i) => i !== vi && nm === newName);
  if (!valid || reserved || dupe) {
    warnEl.textContent = !valid
      ? "Invalid name “" + newName + "”. Use a letter/underscore, then letters, digits or underscores (no spaces or operators)."
      : reserved
      ? "“" + newName + "” is reserved for the constant " + (newName === "T" ? "true" : "false") + " — pick another name."
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
  if (n > MAX_VARS) {
    n = MAX_VARS;
    warnEl.textContent = "Up to " + MAX_VARS + " variables — that's already " +
      (1 << MAX_VARS) + " rows, and each extra variable doubles them.";
    warnEl.classList.add("show");
    clearTimeout(handleVarCount._t);
    handleVarCount._t = setTimeout(() => warnEl.classList.remove("show"), 4000);
  } else {
    warnEl.classList.remove("show");
  }
  table.varCount = n;
  table.varNames = syncVarNames(table.varNames, n);
  render();
}

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
