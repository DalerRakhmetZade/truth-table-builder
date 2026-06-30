// Study Notes view. Default shows GROUP TILES (a clean gallery); click a tile to
// drill into that group's rules. Typing in the search box shows matching rules
// across all groups. Content comes from notes-data.js.
import { NOTES } from "./notes-data.js";
import { escapeHtml } from "./logic.js";

let activeGroup = null;
let query = "";
let contentEl = null;
let emptyEl = null;

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

function tileHtml(sec) {
  const n = sec.cards.length;
  return '<button class="note-tile" data-group="' + escapeHtml(sec.id) + '">' +
    '<span class="tile-title">' + escapeHtml(sec.title) + "</span>" +
    (sec.blurb ? '<span class="tile-blurb">' + escapeHtml(sec.blurb) + "</span>" : "") +
    '<span class="tile-count">' + n + (n === 1 ? " rule" : " rules") + ' →</span>' +
  "</button>";
}

function renderLanding() {
  contentEl.innerHTML = '<div class="note-tiles">' + NOTES.map(tileHtml).join("") + "</div>";
  if (emptyEl) emptyEl.style.display = "none";
}

function renderDetail(id) {
  const sec = NOTES.find((s) => s.id === id);
  if (!sec) { renderLanding(); return; }
  contentEl.innerHTML =
    '<button class="notes-back" data-action="notes-back">← All notes</button>' +
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
  else renderLanding();
}

export function resetNotes() {
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
    const tile = e.target.closest(".note-tile");
    if (tile) { activeGroup = tile.dataset.group; rerender(); window.scrollTo(0, 0); return; }
    const back = e.target.closest('[data-action="notes-back"]');
    if (back) { activeGroup = null; rerender(); return; }
  });

  if (search) {
    search.addEventListener("input", () => { query = search.value; rerender(); });
  }

  rerender();
}
