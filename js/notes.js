// Study Notes view. Modules -> Topics -> cards. The landing shows MODULE tiles;
// opening a module shows its topic tiles; opening a topic shows its cards. Typing
// in the search box shows matching rules across ALL modules. Content comes from
// notes-data.js; module metadata from modules.js.
import { NOTES } from "./notes-data.js";
import { MODULES, moduleById, modulesWithGroups } from "./modules.js";
import { escapeHtml } from "./logic.js";

let activeModule = null;
let activeGroup = null;
let query = "";
let contentEl = null;
let emptyEl = null;

function groupsForModule(id) {
  const entry = modulesWithGroups(NOTES).find((e) => e.module.id === id);
  return entry ? entry.groups : [];
}
function equivRows(card) {
  return card.rows && card.rows.length ? card.rows : [{ lhs: card.lhs, rhs: card.rhs }];
}

function cardSearchText(card) {
  if (card.kind === "step") {
    return ((card.title || "") + " " + (card.detail || "") + " " +
      (card.examples || []).map((e) => e.from + " " + e.to).join(" ")).toLowerCase();
  }
  if (card.kind === "text") return ((card.title || "") + " " + (card.body || "")).toLowerCase();
  if (card.kind === "infer") {
    return ((card.name || "") + " " + (card.premises || []).join(" ") + " " +
      (card.conclusion || "") + " " + (card.note || "")).toLowerCase();
  }
  if (card.kind === "map") {
    return ((card.name || "") + " " +
      (card.rows || []).map((r) => r.from + " " + r.to).join(" ") + " " +
      (card.note || "")).toLowerCase();
  }
  const rows = equivRows(card).map((r) => r.lhs + " " + r.rhs).join(" ");
  return ((card.name || "") + " " + rows + " " + (card.note || "")).toLowerCase();
}

function cardHtml(card) {
  if (card.kind === "step") {
    const ex = (card.examples || []).map((e) =>
      '<div class="note-equiv small">' +
        '<code class="formula">' + escapeHtml(e.from) + "</code>" +
        '<span class="equiv-sign">→</span>' +
        '<code class="formula">' + escapeHtml(e.to) + "</code>" +
      "</div>").join("");
    return '<div class="note-card step">' +
      '<div class="note-step-head"><span class="note-step-n">' + (card.n != null ? card.n : "") + "</span>" +
        '<span class="note-name">' + escapeHtml(card.title || "") + "</span></div>" +
      (card.detail ? '<div class="note-note">' + escapeHtml(card.detail) + "</div>" : "") +
      (ex ? '<div class="note-examples">' + ex + "</div>" : "") +
    "</div>";
  }
  if (card.kind === "text") {
    return '<div class="note-card">' +
      (card.title ? '<div class="note-name">' + escapeHtml(card.title) + "</div>" : "") +
      '<div class="note-note">' + escapeHtml(card.body || "") + "</div>" +
    "</div>";
  }
  if (card.kind === "map") {
    const rows = (card.rows || []).map((r) =>
      '<div class="note-map-row">' +
        '<code class="formula">' + escapeHtml(r.from) + "</code>" +
        '<span class="note-map-arrow">→</span>' +
        '<span class="note-map-to">' + escapeHtml(r.to) + "</span>" +
      "</div>").join("");
    return '<div class="note-card">' +
      '<div class="note-name">' + escapeHtml(card.name || "") + "</div>" +
      '<div class="note-map">' + rows + "</div>" +
      (card.note ? '<div class="note-note">' + escapeHtml(card.note) + "</div>" : "") +
    "</div>";
  }
  if (card.kind === "infer") {
    const prem = (card.premises || []).map((p) =>
      '<code class="formula">' + escapeHtml(p) + "</code>").join('<span class="infer-sep">,</span>');
    return '<div class="note-card">' +
      '<div class="note-name">' + escapeHtml(card.name || "") + "</div>" +
      '<div class="note-equiv">' + prem +
        '<span class="equiv-sign">⊢</span>' +
        '<code class="formula">' + escapeHtml(card.conclusion || "") + "</code>" +
      "</div>" +
      (card.note ? '<div class="note-note">' + escapeHtml(card.note) + "</div>" : "") +
    "</div>";
  }
  return '<div class="note-card">' +
    '<div class="note-name">' + escapeHtml(card.name || "") + "</div>" +
    equivRows(card).map((r) =>
      '<div class="note-equiv">' +
        '<code class="formula">' + escapeHtml(r.lhs) + "</code>" +
        '<span class="equiv-sign">≡</span>' +
        '<code class="formula">' + escapeHtml(r.rhs) + "</code>" +
      "</div>").join("") +
    (card.note ? '<div class="note-note">' + escapeHtml(card.note) + "</div>" : "") +
  "</div>";
}

function tileCountLabel(sec) {
  if (sec.tileLabel) return sec.tileLabel;
  // Definitions / prose (text cards) aren't rules — don't count them.
  const items = sec.cards.filter((c) => (c.kind || "equiv") !== "text");
  const n = items.length;
  if (!n) return "Open";
  const allSteps = items.every((c) => c.kind === "step");
  const noun = allSteps ? "step" : "rule";
  return n + " " + noun + (n === 1 ? "" : "s");
}

function tileHtml(sec) {
  return '<button class="note-tile" data-group="' + escapeHtml(sec.id) + '">' +
    '<span class="tile-title">' + escapeHtml(sec.title) + "</span>" +
    (sec.blurb ? '<span class="tile-blurb">' + escapeHtml(sec.blurb) + "</span>" : "") +
    '<span class="tile-count">' + escapeHtml(tileCountLabel(sec)) + ' →</span>' +
  "</button>";
}

function moduleTileHtml(entry) {
  const n = entry.groups.length;
  const empty = n === 0;
  const meta = empty ? "Coming soon" : n + (n === 1 ? " topic" : " topics") + " →";
  return '<button class="note-tile module-tile' + (empty ? " disabled" : "") + '"' +
    (empty ? "" : ' data-module="' + escapeHtml(entry.module.id) + '"') +
    (empty ? " disabled" : "") + ">" +
    '<span class="tile-title">' + escapeHtml(entry.module.title) + "</span>" +
    (entry.module.blurb ? '<span class="tile-blurb">' + escapeHtml(entry.module.blurb) + "</span>" : "") +
    '<span class="tile-count">' + escapeHtml(meta) + "</span>" +
  "</button>";
}

function renderLanding() {
  // The module list is the entry point — always shown, including empty modules.
  const entries = modulesWithGroups(NOTES);
  contentEl.innerHTML = '<div class="note-tiles">' + entries.map(moduleTileHtml).join("") + "</div>";
  if (emptyEl) emptyEl.style.display = "none";
}

function renderModule(id) {
  const mod = moduleById(id);
  const groups = groupsForModule(id);
  if (!mod || !groups.length) { activeModule = null; renderLanding(); return; }
  contentEl.innerHTML =
    '<button class="notes-back" data-action="notes-modules">← All modules</button>' +
    '<h3 class="note-section-title">' + escapeHtml(mod.title) + "</h3>" +
    (mod.blurb ? '<p class="note-section-blurb">' + escapeHtml(mod.blurb) + "</p>" : "") +
    '<div class="note-tiles">' + groups.map(tileHtml).join("") + "</div>";
  if (emptyEl) emptyEl.style.display = "none";
}

function renderDetail(id) {
  const sec = NOTES.find((s) => s.id === id);
  if (!sec) { renderLanding(); return; }
  contentEl.innerHTML =
    '<button class="notes-back" data-action="notes-back">← ' +
      escapeHtml((moduleById(sec.module) && moduleById(sec.module).title) || "All notes") + "</button>" +
    '<section class="note-section">' +
      '<h3 class="note-section-title">' + escapeHtml(sec.title) + "</h3>" +
      (sec.blurb ? '<p class="note-section-blurb">' + escapeHtml(sec.blurb) + "</p>" : "") +
      '<div class="note-cards">' + sec.cards.map(cardHtml).join("") + "</div>" +
    "</section>";
  if (emptyEl) emptyEl.style.display = "none";
}

function renderResults(q) {
  let html = "";
  let any = false;
  for (const sec of NOTES) {
    const matches = sec.cards.filter((c) =>
      cardSearchText(c).includes(q) || sec.title.toLowerCase().includes(q));
    if (!matches.length) continue;
    any = true;
    html += '<section class="note-section">' +
      '<h3 class="note-section-title">' + escapeHtml(sec.title) + "</h3>" +
      '<div class="note-cards">' + matches.map(cardHtml).join("") + "</div>" +
    "</section>";
  }
  contentEl.innerHTML = html;
  if (emptyEl) emptyEl.style.display = any ? "none" : "block";
}

function rerender() {
  const q = query.trim().toLowerCase();
  if (q) renderResults(q);
  else if (activeGroup) renderDetail(activeGroup);
  else if (activeModule) renderModule(activeModule);
  else renderLanding();
}

export function resetNotes() {
  activeModule = null;
  activeGroup = null;
  query = "";
  const search = document.getElementById("notes-search");
  if (search) search.value = "";
  rerender();
}

export function initNotes() {
  contentEl = document.getElementById("notes-content");
  emptyEl = document.getElementById("notes-empty");
  const search = document.getElementById("notes-search");
  if (!contentEl) return;

  contentEl.addEventListener("click", (e) => {
    const moduleTile = e.target.closest(".module-tile");
    if (moduleTile) {
      if (moduleTile.classList.contains("disabled") || !moduleTile.dataset.module) return;
      activeModule = moduleTile.dataset.module; activeGroup = null; rerender(); window.scrollTo(0, 0); return;
    }
    const tile = e.target.closest(".note-tile");
    if (tile) { activeGroup = tile.dataset.group; rerender(); window.scrollTo(0, 0); return; }
    const toModules = e.target.closest('[data-action="notes-modules"]');
    if (toModules) { activeModule = null; activeGroup = null; rerender(); window.scrollTo(0, 0); return; }
    const back = e.target.closest('[data-action="notes-back"]');
    if (back) { activeGroup = null; rerender(); window.scrollTo(0, 0); return; }
  });

  if (search) {
    search.addEventListener("input", () => { query = search.value; rerender(); });
  }

  rerender();
}
