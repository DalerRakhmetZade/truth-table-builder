// Flashcards view. Landing shows deck tiles (one per group + an "All cards" deck).
// Opening a deck offers two modes: Study (flip through cards) and Quiz (multiple
// choice, auto-graded to a real percentage). Best quiz scores per deck are kept in
// localStorage. Content comes from flashcards-data.js; quiz logic from quiz.js.
import { FLASHCARDS } from "./flashcards-data.js";
import { deckById, buildQuiz, scoreQuiz, makeRng, shuffle } from "./quiz.js";
import { escapeHtml } from "./logic.js";

const BEST_KEY = "truthTableBuilder.flash.v1";
const SWIPE_THRESHOLD = 90;

let rootEl = null;
// view: "landing" | "deck" | "study" | "studydone" | "quiz" | "result"
let view = "landing";
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
function deckList() {
  const decks = FLASHCARDS.map((g) => ({ id: g.id, title: g.title, count: g.cards.length }));
  const total = decks.reduce((n, d) => n + d.count, 0);
  return [{ id: "all", title: "All cards", count: total, wide: true }, ...decks];
}

function tileHtml(d) {
  const best = bestFor(d.id);
  const bestChip = best != null
    ? '<span class="fc-best' + (best === 100 ? " full" : "") + '">Best ' + best + "%</span>"
    : "";
  return '<button class="fc-tile' + (d.wide ? " wide" : "") + '" data-deck="' + escapeHtml(d.id) + '">' +
    '<span class="fc-tile-title">' + escapeHtml(d.title) + "</span>" +
    '<span class="fc-tile-meta">' +
      '<span class="fc-tile-count">' + d.count + (d.count === 1 ? " card" : " cards") + "</span>" +
      bestChip +
    "</span>" +
  "</button>";
}

function renderLanding() {
  view = "landing";
  deck = null;
  setSession(false);
  rootEl.innerHTML =
    '<p class="fc-intro">Pick a deck, then <strong>Study</strong> the cards or take a <strong>Quiz</strong>. ' +
    "Score 100% and you've got it cold.</p>" +
    '<div class="fc-tiles">' + deckList().map(tileHtml).join("") + "</div>";
}

/* ------------------------------- deck menu ------------------------------- */
function renderDeckMenu() {
  view = "deck";
  setSession(false);
  const best = bestFor(deck.id);
  rootEl.innerHTML =
    '<button class="fc-back" data-action="fc-home">← All decks</button>' +
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
    '<div class="fc-study-bar">' +
      '<span class="fc-progress">' + studySeen.size + " / " + studyTotal + " seen</span>" +
      '<span class="fc-stats">' +
        '<span class="fc-stat cleared" title="Cleared — you knew these">✓ ' + studyCleared + "</span>" +
        '<span class="fc-stat review" title="Waiting to come back">↻ ' + studyReview.size + "</span>" +
      "</span>" +
      '<button class="fc-mini" data-action="fc-shuffle">Shuffle</button>' +
    "</div>" +
    '<div class="fc-study-body">' +
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
function flingCard(remembered) {
  if (studyBusy || !studyQueue.length) return;
  const el = rootEl.querySelector('[data-role="swipe"]');
  if (!el) { gradeCard(remembered); return; }
  studyBusy = true;
  const dir = remembered ? 1 : -1;
  el.classList.add(remembered ? "swipe-right" : "swipe-left");
  el.style.setProperty("--swipe-progress", "1");
  el.style.transition = "transform 0.28s ease-out, opacity 0.28s ease-out";
  el.style.transform = "translateX(" + (dir * (window.innerWidth || 600)) + "px) rotate(" + (dir * 10) + "deg)";
  el.style.opacity = "0";
  setTimeout(() => { studyBusy = false; gradeCard(remembered); }, 240);
}

/* ---- pointer-drag swipe controller ---- */
let drag = null;

function onPointerDown(e) {
  if (view !== "study" || studyBusy) return;
  const el = e.target.closest('[data-role="swipe"]');
  if (!el || e.target.closest("button")) return;
  drag = { startX: e.clientX, startY: e.clientY, dx: 0, decided: false, horizontal: false, moved: false, el };
}

function onPointerMove(e) {
  if (!drag) return;
  const dx = e.clientX - drag.startX;
  const dy = e.clientY - drag.startY;
  if (!drag.decided && (Math.abs(dx) > 8 || Math.abs(dy) > 8)) {
    drag.decided = true;
    drag.horizontal = Math.abs(dx) > Math.abs(dy);
  }
  if (drag.decided && drag.horizontal) {
    if (e.cancelable) e.preventDefault();
    drag.dx = dx;
    drag.moved = true;
    drag.el.style.transform = "translateX(" + dx + "px) rotate(" + (dx * 0.04) + "deg)";
    drag.el.classList.toggle("swipe-right", dx > 0);
    drag.el.classList.toggle("swipe-left", dx < 0);
    drag.el.style.setProperty("--swipe-progress", String(Math.min(Math.abs(dx) / SWIPE_THRESHOLD, 1)));
  }
}

function onPointerUp() {
  if (!drag) return;
  const d = drag;
  drag = null;
  if (d.decided && d.horizontal && Math.abs(d.dx) >= SWIPE_THRESHOLD) {
    flingCard(d.dx > 0);
  } else if (!d.decided) {
    flipStudy();                         // treated as a tap
  } else {
    d.el.style.transition = "transform 0.2s ease";
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
  if (tile) { deck = deckById(tile.dataset.deck); renderDeckMenu(); window.scrollTo(0, 0); return; }

  // quiz option (study no longer uses options)
  const opt = e.target.closest(".fc-option");
  if (opt && !opt.disabled && view === "quiz") { chooseOption(Number(opt.dataset.opt)); return; }

  const act = e.target.closest("[data-action]");
  if (!act) return;
  switch (act.dataset.action) {
    case "fc-home": renderLanding(); break;
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
