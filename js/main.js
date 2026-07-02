// Entry point: initialize state, render, wire events, About dialog, slash menu,
// the Study Notes view, and simple hash routing between Builder and Notes.
import { initState } from "./store.js";
import { render } from "./render.js";
import { initEvents } from "./events.js";
import { initAbout } from "./about.js";
import { initSlashMenu } from "./slashmenu.js";
import { initNotes, resetNotes } from "./notes.js";
import { initFlashcards, resetFlashcards } from "./flashcards.js";

initState();
render();
initEvents();
initAbout();
initSlashMenu();
initNotes();
initFlashcards();

/* ------------------------------ routing ---------------------------------- */
const ROUTES = ["builder", "notes", "flashcards"];
function currentRoute() {
  const r = location.hash.replace(/^#\/?/, "");
  return ROUTES.includes(r) ? r : "builder";
}
function applyRoute() {
  const route = currentRoute();
  const builder = document.getElementById("builder-view");
  const notes = document.getElementById("notes-view");
  const flash = document.getElementById("flashcards-view");
  if (builder) builder.hidden = route !== "builder";
  if (notes) notes.hidden = route !== "notes";
  if (flash) flash.hidden = route !== "flashcards";
  if (route !== "flashcards") document.body.classList.remove("fc-session");
  document.querySelectorAll(".nav-link").forEach((l) =>
    l.classList.toggle("active", l.dataset.route === route));
  if (route === "notes") { resetNotes(); window.scrollTo(0, 0); }
  if (route === "flashcards") { resetFlashcards(); window.scrollTo(0, 0); }
}
window.addEventListener("hashchange", applyRoute);
applyRoute();
