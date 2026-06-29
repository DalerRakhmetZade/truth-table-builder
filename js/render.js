// Rendering: builds the table cards' HTML from app state.
import { tablesEl } from "./dom.js";
import { app, saveState } from "./store.js";
import { compile, evalAst } from "./parser.js";
import { generateRows, escapeHtml, escapeAttr, ROW_WARN_THRESHOLD } from "./logic.js";

export function render() {
  if (!app.state.tables.length) {
    tablesEl.innerHTML =
      '<div class="empty no-tables">No tables yet. Click <strong>+ Add table</strong> above to start.</div>';
  } else {
    const n = app.state.tables.length;
    tablesEl.innerHTML = app.state.tables.map((t, i) => renderTable(t, i, n)).join("");
  }
  saveState();
}

export function renderTable(table, index = 0, total = 1) {
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

  // reorder arrows (only when there's more than one table)
  let reorder = "";
  if (total > 1) {
    const upDis = index === 0 ? " disabled" : "";
    const downDis = index === total - 1 ? " disabled" : "";
    reorder = '<div class="reorder">' +
      '<button class="icon-btn" data-action="moveup" data-table="' + tid + '" ' +
        'title="Move table up" aria-label="Move table up"' + upDis + '>▲</button>' +
      '<button class="icon-btn" data-action="movedown" data-table="' + tid + '" ' +
        'title="Move table down" aria-label="Move table down"' + downDis + '>▼</button>' +
    '</div>';
  }

  // top bar: title + controls
  h += '<div class="card-bar">' +
        reorder +
        '<input type="text" class="title-input" data-table="' + tid + '" ' +
          'value="' + escapeAttr(table.title || "") + '" placeholder="Untitled table" />' +
        '<div class="group"><label>Variables</label>' +
          '<input type="number" class="varcount-input" data-table="' + tid + '" ' +
          'min="1" max="14" value="' + table.varCount + '" /></div>' +
        '<div class="group">' +
          '<button class="primary" data-action="addcol" data-table="' + tid + '">+ Column</button>' +
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
