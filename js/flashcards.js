// Flashcards view. Landing shows "All cards" plus a tile per module; opening a
// module lists its topic decks (and a whole-module deck). Opening any deck offers
// Study (swipe) or Quiz (graded). Best quiz scores per deck are kept in localStorage.
// Content comes from flashcards-data.js; quiz logic from quiz.js; modules from modules.js.
import { FLASHCARDS } from "./flashcards-data.js";
import { MODULES, moduleById, modulesWithGroups } from "./modules.js";
import { deckById, buildQuiz, scoreQuiz, makeRng, shuffle } from "./quiz.js";
import { escapeHtml } from "./logic.js";

const BEST_KEY = "truthTableBuilder.flash.v1";
const SWIPE_THRESHOLD = 90;

let rootEl = null;
// view: "landing" | "module" | "deck" | "study" | "studydone" | "quiz" | "result"
let view = "landing";
let activeModule = null;
let deck = null;

// study state (swipeable flashcard deck)
let studyQueue = [];       // remaining cards; front of the queue is the current card
let studyFlipped = false;
let studyTotal = 0;        // unique cards in the deck
let studyCleared = 0;      // cards marked "got it" (removed for good)
let studySeen = null;      // Set of card ids shown at least once
let studyReview = null;    // Set of card ids currently awaiting another pass
let studyEverReview = null;// Set of card ids that were ever sent to review
let studyBusy = false;     // guard while a card is animating off-screen

function setSession(active) {
  document.body.classList.toggle("fc-session", !!active);
}

// quiz state
let quiz = [];
let quizIndex = 0;
let quizAnswers = [];   // booleans
let quizMissed = [];    // cards answered incorrectly
let quizChosen = null;  // selected option index for the current question (null = unanswered)

/* ------------------------------- best scores ----------------------------- */
function loadBest() {
  try { return JSON.parse(localStorage.getItem(BEST_KEY)) || {}; }
  catch (e) { return {}; }
}
function bestFor(deckId) {
  const b = loadBest()[deckId];
  return typeof b === "number" ? b : null;
}
function recordBest(deckId, percent) {
  try {
    const all = loadBest();
    if (typeof all[deckId] !== "number" || percent > all[deckId]) {
      all[deckId] = percent;
      localStorage.setItem(BEST_KEY, JSON.stringify(all));
    }
  } catch (e) { /* ignore */ }
}

/* --------------------------------- landing ------------------------------- */
function moduleEntries() {
  return modulesWithGroups(FLASHCARDS).map((e) => ({
    module: e.module,
    groups: e.groups,
    count: e.groups.reduce((n, g) => n + g.cards.length, 0),
  }));
}

function tileHtml(d) {
  const best = bestFor(d.id);
  const bestChip = best != null
    ? '<span class="fc-best' + (best === 100 ? " full" : "") + '">Best ' + best + "%</span>"
    : "";
  const meta = d.metaLabel != null ? d.metaLabel
    : d.count + (d.count === 1 ? " card" : " cards");
  const disabled = !!d.disabled;
  const attr = disabled ? " disabled"
    : d.moduleId ? ' data-module="' + escapeHtml(d.moduleId) + '"'
    : ' data-deck="' + escapeHtml(d.id) + '"';
  return '<button class="fc-tile' + (d.wide ? " wide" : "") + (d.moduleId ? " fc-module-tile" : "") +
      (disabled ? " disabled" : "") + '"' + attr + ">" +
    '<span class="fc-tile-title">' + escapeHtml(d.title) + "</span>" +
    '<span class="fc-tile-meta">' +
      '<span class="fc-tile-count">' + escapeHtml(meta) + "</span>" +
      bestChip +
    "</span>" +
  "</button>";
}

function renderLanding() {
  view = "landing";
  deck = null;
  activeModule = null;
  setSession(false);
  const entries = moduleEntries();
  const total = entries.reduce((n, e) => n + e.count, 0);
  const tiles = [{ id: "all", title: "All cards", count: total, wide: true }]
    .map(tileHtml).join("") +
    entries.map((e) => tileHtml({
      moduleId: e.module.id, title: e.module.title, disabled: e.count === 0,
      metaLabel: e.count === 0 ? "Coming soon"
        : e.groups.length + (e.groups.length === 1 ? " topic" : " topics") + " · " + e.count + " cards",
    })).join("");
  rootEl.innerHTML =
    '<p class="fc-intro">Pick a deck, then <strong>Study</strong> the cards or take a <strong>Quiz</strong>. ' +
    "Score 100% and you've got it cold.</p>" +
    '<div class="fc-tiles">' + tiles + "</div>";
}

/* ------------------------------- module view ----------------------------- */
function renderModule(id) {
  const mod = moduleById(id);
  const entry = moduleEntries().find((e) => e.module.id === id);
  if (!mod || !entry) { renderLanding(); return; }
  view = "module";
  activeModule = id;
  deck = null;
  setSession(false);
  const wholeTile = tileHtml({
    id: "mod:" + id, title: "Whole module", wide: true,
    metaLabel: entry.count + " cards · every topic",
  });
  const topicTiles = entry.groups.map((g) =>
    tileHtml({ id: g.id, title: g.title, count: g.cards.length })).join("");
  rootEl.innerHTML =
    '<button class="fc-back" data-action="fc-home">← All decks</button>' +
    '<div class="fc-deck-head">' +
      '<h3 class="fc-deck-title">' + escapeHtml(mod.title) + "</h3>" +
      (mod.blurb ? '<p class="fc-deck-sub">' + escapeHtml(mod.blurb) + "</p>" : "") +
    "</div>" +
    '<div class="fc-tiles">' + wholeTile + topicTiles + "</div>";
}

/* ------------------------------- deck menu ------------------------------- */
function renderDeckMenu() {
  view = "deck";
  setSession(false);
  const best = bestFor(deck.id);
  const backAction = activeModule ? "fc-module" : "fc-home";
  const backLabel = activeModule ? (moduleById(activeModule) && moduleById(activeModule).title) || "Back" : "All decks";
  rootEl.innerHTML =
    '<button class="fc-back" data-action="' + backAction + '">← ' + escapeHtml(backLabel) + "</button>" +
    '<div class="fc-deck-head">' +
      '<h3 class="fc-deck-title">' + escapeHtml(deck.title) + "</h3>" +
      '<p class="fc-deck-sub">' + deck.cards.length + " cards" +
        (best != null ? ' · best quiz score <strong>' + best + "%</strong>" : "") + "</p>" +
    "</div>" +
    '<div class="fc-mode-pick">' +
      '<button class="fc-mode-card" data-action="fc-study">' +
        '<span class="fc-mode-name">Study</span>' +
        '<span class="fc-mode-desc">Flip each card, then swipe — right if you knew it, left to see it again.</span>' +
      "</button>" +
      '<button class="fc-mode-card" data-action="fc-quiz">' +
        '<span class="fc-mode-name">Quiz</span>' +
        '<span class="fc-mode-desc">Multiple choice, graded to a percentage.</span>' +
      "</button>" +
    "</div>";
}

/* --------------------------------- study --------------------------------- */
function startStudy(cards) {
  studyQueue = (cards || deck.cards).slice();
  studyFlipped = false;
  studyTotal = studyQueue.length;
  studyCleared = 0;
  studySeen = new Set();
  studyReview = new Set();
  studyEverReview = new Set();
  studyBusy = false;
  setSession(true);
  renderStudy();
}

function renderStudy() {
  view = "study";
  if (!studyQueue.length) { renderStudyDone(); return; }
  setSession(true);
  const card = studyQueue[0];
  studySeen.add(card.id);
  rootEl.innerHTML =
    '<button class="fc-back" data-action="fc-deck">← ' + escapeHtml(deck.title) + "</button>" +
    '<div class="fc-study-body">' +
      '<div class="fc-study-bar">' +
        '<span class="fc-progress">' + studySeen.size + " / " + studyTotal + " seen</span>" +
        '<button class="fc-mini" data-action="fc-shuffle">Shuffle</button>' +
      "</div>" +
      '<div class="fc-swipe" data-role="swipe">' +
        '<div class="fc-swipe-overlay left">Review</div>' +
        '<div class="fc-swipe-overlay right">Got it</div>' +
        '<div class="fc-card3d' + (studyFlipped ? " flipped" : "") + '" ' +
          'tabindex="0" role="button" aria-label="Flip card">' +
          '<div class="fc-face fc-face-front">' +
            '<span class="fc-face-tag">Question</span>' +
            '<div class="fc-face-q">' + escapeHtml(card.q) + "</div>" +
            '<span class="fc-face-hint">tap to flip</span>' +
          "</div>" +
          '<div class="fc-face fc-face-back">' +
            '<span class="fc-face-tag">Answer</span>' +
            '<div class="fc-face-a">' + escapeHtml(card.a) + "</div>" +
            (card.note ? '<div class="fc-face-note">' + escapeHtml(card.note) + "</div>" : "") +
            '<span class="fc-face-hint">← review · got it →</span>' +
          "</div>" +
        "</div>" +
      "</div>" +
      '<div class="fc-stats">' +
        '<span class="fc-stat cleared" title="Cleared — you knew these">✓ ' + studyCleared + "</span>" +
        '<span class="fc-stat review" title="Waiting to come back">↻ ' + studyReview.size + "</span>" +
      "</div>" +
      '<p class="fc-swipe-caption">Swipe <strong>right</strong> if you got it · <strong>left</strong> to review</p>' +
    "</div>";
}

function renderStudyDone() {
  view = "studydone";
  setSession(true);
  const again = studyEverReview.size;
  const extra = again > 0
    ? "You needed another pass on " + again + (again === 1 ? " card" : " cards") + "."
    : "First-pass perfect — you knew every card.";
  rootEl.innerHTML =
    '<button class="fc-back" data-action="fc-deck">← ' + escapeHtml(deck.title) + "</button>" +
    '<div class="fc-study-body">' +
      '<div class="fc-score full">' +
        '<div class="fc-done-check">✓</div>' +
        '<div class="fc-score-sub">' + studyTotal + (studyTotal === 1 ? " card" : " cards") + " cleared</div>" +
        '<div class="fc-score-verdict">All caught up! ' + extra + "</div>" +
      "</div>" +
      '<div class="fc-result-actions">' +
        '<button class="fc-nav-btn primary" data-action="fc-study">Study again</button>' +
        '<button class="fc-nav-btn" data-action="fc-shuffle-restart">Shuffle &amp; restart</button>' +
        '<button class="fc-nav-btn" data-action="fc-deck">Back to deck</button>' +
      "</div>" +
    "</div>";
}

function flipStudy() {
  if (studyBusy || !studyQueue.length) return;
  studyFlipped = !studyFlipped;
  renderStudy();
}

// remembered=true -> card is cleared for good; false -> it returns at the end.
function gradeCard(remembered) {
  if (studyBusy || !studyQueue.length) return;
  const card = studyQueue.shift();
  if (remembered) {
    studyCleared++;
    studyReview.delete(card.id);
  } else {
    studyReview.add(card.id);
    studyEverReview.add(card.id);
    studyQueue.push(card);
  }
  studyFlipped = false;
  renderStudy();
}

// Animate the current card off-screen, then grade it.
function flingCard(remembered, fromDx) {
  if (studyBusy || !studyQueue.length) return;
  const el = rootEl.querySelector('[data-role="swipe"]');
  if (!el) { gradeCard(remembered); return; }
  studyBusy = true;
  const dir = remembered ? 1 : -1;
  const offX = dir * ((window.innerWidth || 600) + 120);
  el.classList.add(remembered ? "swipe-right" : "swipe-left");
  el.style.setProperty("--swipe-progress", "1");
  // Start from wherever the finger left off, then continue off-screen.
  el.style.transition = "none";
  if (typeof fromDx === "number") {
    el.style.transform = "translateX(" + fromDx + "px) rotate(" + (fromDx * 0.05) + "deg)";
    // force a reflow so the next transform animates from here
    void el.offsetWidth;
  }
  el.style.transition = "transform 0.26s ease-out, opacity 0.26s ease-out";
  el.style.transform = "translateX(" + offX + "px) rotate(" + (dir * 12) + "deg)";
  el.style.opacity = "0";
  setTimeout(() => { studyBusy = false; gradeCard(remembered); }, 230);
}

/* ---- pointer-drag swipe controller ---- */
let drag = null;

function onPointerDown(e) {
  if (view !== "study" || studyBusy) return;
  const el = e.target.closest('[data-role="swipe"]');
  if (!el || e.target.closest("button")) return;
  // Kill any leftover release transition so the card tracks the finger 1:1.
  el.style.transition = "none";
  el.style.willChange = "transform";
  try { el.setPointerCapture(e.pointerId); } catch (err) { /* ignore */ }
  drag = {
    pointerId: e.pointerId, startX: e.clientX, startY: e.clientY,
    dx: 0, decided: false, horizontal: false,
    lastX: e.clientX, lastT: e.timeStamp || performance.now(), vx: 0, el,
  };
}

function onPointerMove(e) {
  if (!drag || e.pointerId !== drag.pointerId) return;
  const dx = e.clientX - drag.startX;
  const dy = e.clientY - drag.startY;
  if (!drag.decided && (Math.abs(dx) > 6 || Math.abs(dy) > 6)) {
    drag.decided = true;
    drag.horizontal = Math.abs(dx) >= Math.abs(dy);
  }
  if (!drag.decided || !drag.horizontal) return;
  if (e.cancelable) e.preventDefault();
  // track velocity (px/ms) for flick detection
  const now = e.timeStamp || performance.now();
  const dt = now - drag.lastT;
  if (dt > 0) drag.vx = (e.clientX - drag.lastX) / dt;
  drag.lastX = e.clientX; drag.lastT = now;
  drag.dx = dx;
  drag.el.style.transform = "translateX(" + dx + "px) rotate(" + (dx * 0.05) + "deg)";
  drag.el.classList.toggle("swipe-right", dx > 0);
  drag.el.classList.toggle("swipe-left", dx < 0);
  drag.el.style.setProperty("--swipe-progress", String(Math.min(Math.abs(dx) / SWIPE_THRESHOLD, 1)));
}

function onPointerUp(e) {
  if (!drag || (e && e.pointerId !== drag.pointerId)) return;
  const d = drag;
  drag = null;
  d.el.style.willChange = "";
  try { d.el.releasePointerCapture(d.pointerId); } catch (err) { /* ignore */ }

  if (!d.decided || !d.horizontal) {
    d.el.style.transition = "";
    d.el.style.transform = "";
    flipStudy();                          // a tap (no real drag) flips the card
    return;
  }
  // Commit on release if dragged far enough OR flicked fast enough.
  const flicked = Math.abs(d.vx) > 0.5 && Math.abs(d.dx) > 24;
  if (Math.abs(d.dx) >= SWIPE_THRESHOLD || flicked) {
    flingCard(d.dx > 0, d.dx);
  } else {
    d.el.style.transition = "transform 0.28s cubic-bezier(0.2, 0.9, 0.3, 1.2)";
    d.el.style.transform = "";
    d.el.classList.remove("swipe-left", "swipe-right");
  }
}

/* ---------------------------------- quiz --------------------------------- */
function startQuiz() {
  quiz = buildQuiz(deck.cards, makeRng(Date.now() & 0xffff));
  quizIndex = 0;
  quizAnswers = [];
  quizMissed = [];
  quizChosen = null;
  renderQuiz();
}

function retryMissed() {
  const cards = quizMissed.slice();
  quiz = buildQuiz(cards, makeRng(Date.now() & 0xffff));
  quizIndex = 0;
  quizAnswers = [];
  quizMissed = [];
  quizChosen = null;
  renderQuiz();
}

function renderQuiz() {
  view = "quiz";
  setSession(true);
  const q = quiz[quizIndex];
  const total = quiz.length;
  const answered = quizChosen !== null;
  const optsHtml = q.options.map((opt, i) => {
    let cls = "fc-option";
    if (answered) {
      if (i === q.correctIndex) cls += " correct";
      else if (i === quizChosen) cls += " wrong";
      else cls += " dim";
    }
    return '<button class="' + cls + '" data-opt="' + i + '"' + (answered ? " disabled" : "") + ">" +
      '<span class="fc-opt-mark"></span>' +
      '<span class="fc-opt-text">' + escapeHtml(opt) + "</span>" +
    "</button>";
  }).join("");

  const feedback = answered
    ? '<div class="fc-feedback ' + (quizChosen === q.correctIndex ? "good" : "bad") + '">' +
        "<strong>" + (quizChosen === q.correctIndex ? "Correct" : "Not quite") + ".</strong> " +
        (quizChosen === q.correctIndex ? "" : "Answer: " + escapeHtml(q.card.a) + ". ") +
        (q.card.note ? escapeHtml(q.card.note) : "") +
      "</div>" +
      '<div class="fc-study-nav"><span></span>' +
        '<button class="fc-nav-btn primary" data-action="fc-qnext">' +
          (quizIndex === total - 1 ? "See score →" : "Next →") + "</button>" +
      "</div>"
    : "";

  rootEl.innerHTML =
    '<button class="fc-back" data-action="fc-deck">← ' + escapeHtml(deck.title) + "</button>" +
    '<div class="fc-quiz-bar">' +
      '<span class="fc-progress">Question ' + (quizIndex + 1) + " / " + total + "</span>" +
      '<span class="fc-progress">Score ' + quizAnswers.filter(Boolean).length + " / " + quizAnswers.length + "</span>" +
    "</div>" +
    '<div class="fc-qbar-track"><div class="fc-qbar-fill" style="width:' +
      Math.round((quizIndex / total) * 100) + '%"></div></div>' +
    '<div class="fc-question">' + escapeHtml(q.card.q) + "</div>" +
    '<div class="fc-options">' + optsHtml + "</div>" +
    feedback;
}

function chooseOption(i) {
  if (quizChosen !== null) return;
  quizChosen = i;
  const q = quiz[quizIndex];
  const correct = i === q.correctIndex;
  quizAnswers.push(correct);
  if (!correct) quizMissed.push(q.card);
  renderQuiz();
}

function nextQuestion() {
  if (quizIndex === quiz.length - 1) { renderResult(); return; }
  quizIndex++;
  quizChosen = null;
  renderQuiz();
}

/* --------------------------------- result -------------------------------- */
function renderResult() {
  view = "result";
  setSession(true);
  const { correct, total, percent } = scoreQuiz(quizAnswers);
  recordBest(deck.id, percent);

  let verdict, vclass;
  if (percent === 100) { verdict = "Mastered — you've got this cold. 🎯"; vclass = "full"; }
  else if (percent >= 80) { verdict = "Almost there — review the misses and go again."; vclass = "high"; }
  else if (percent >= 50) { verdict = "Solid start — keep drilling the tricky ones."; vclass = "mid"; }
  else { verdict = "Study the deck, then come back for another pass."; vclass = "low"; }

  const missedHtml = quizMissed.length
    ? '<div class="fc-missed">' +
        '<h4 class="fc-missed-title">Review these</h4>' +
        quizMissed.map((c) =>
          '<div class="fc-missed-row">' +
            '<div class="fc-missed-q">' + escapeHtml(c.q) + "</div>" +
            '<div class="fc-missed-a">' + escapeHtml(c.a) + "</div>" +
          "</div>").join("") +
      "</div>"
    : '<p class="fc-perfect">No misses — every card correct.</p>';

  rootEl.innerHTML =
    '<button class="fc-back" data-action="fc-deck">← ' + escapeHtml(deck.title) + "</button>" +
    '<div class="fc-score ' + vclass + '">' +
      '<div class="fc-score-pct">' + percent + "%</div>" +
      '<div class="fc-score-sub">' + correct + " / " + total + " correct</div>" +
      '<div class="fc-score-verdict">' + verdict + "</div>" +
    "</div>" +
    missedHtml +
    '<div class="fc-result-actions">' +
      '<button class="fc-nav-btn primary" data-action="fc-quiz">Retry quiz</button>' +
      (quizMissed.length ? '<button class="fc-nav-btn" data-action="fc-retry-missed">Retry missed only</button>' : "") +
      '<button class="fc-nav-btn" data-action="fc-deck">Back to deck</button>' +
    "</div>";
}

/* --------------------------------- events -------------------------------- */
function onClick(e) {
  const tile = e.target.closest(".fc-tile");
  if (tile) {
    if (tile.dataset.module) { renderModule(tile.dataset.module); window.scrollTo(0, 0); return; }
    deck = deckById(tile.dataset.deck); renderDeckMenu(); window.scrollTo(0, 0); return;
  }

  // quiz option (study no longer uses options)
  const opt = e.target.closest(".fc-option");
  if (opt && !opt.disabled && view === "quiz") { chooseOption(Number(opt.dataset.opt)); return; }

  const act = e.target.closest("[data-action]");
  if (!act) return;
  switch (act.dataset.action) {
    case "fc-home": renderLanding(); window.scrollTo(0, 0); break;
    case "fc-module": if (activeModule) { renderModule(activeModule); window.scrollTo(0, 0); } else renderLanding(); break;
    case "fc-deck": renderDeckMenu(); break;
    case "fc-study": startStudy(); break;
    case "fc-quiz": startQuiz(); break;
    case "fc-shuffle": studyQueue = shuffle(studyQueue); studyFlipped = false; renderStudy(); break;
    case "fc-shuffle-restart": startStudy(shuffle(deck.cards)); break;
    case "fc-qnext": nextQuestion(); break;
    case "fc-retry-missed": retryMissed(); break;
  }
}

function onKey(e) {
  if (view !== "study") return;
  if (e.key === " " || e.key === "Enter") {
    if (e.target.closest("button")) return;
    e.preventDefault(); flipStudy();
  } else if (e.key === "ArrowRight") {
    flingCard(true);
  } else if (e.key === "ArrowLeft") {
    flingCard(false);
  }
}

export function resetFlashcards() {
  if (!rootEl) return;
  renderLanding();
  window.scrollTo(0, 0);
}

export function initFlashcards() {
  rootEl = document.getElementById("flashcards-content");
  if (!rootEl) return;
  rootEl.addEventListener("click", onClick);
  rootEl.addEventListener("pointerdown", onPointerDown);
  window.addEventListener("pointermove", onPointerMove, { passive: false });
  window.addEventListener("pointerup", onPointerUp);
  window.addEventListener("pointercancel", onPointerUp);
  document.addEventListener("keydown", onKey);
  renderLanding();
}
