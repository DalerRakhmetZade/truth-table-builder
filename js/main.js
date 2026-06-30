// Entry point: initialize state, render, wire events, About dialog, slash menu,
// the Study Notes view, and simple hash routing between Builder and Notes.
import { initState } from "./store.js";
import { render } from "./render.js";
import { initEvents } from "./events.js";
import { initAbout } from "./about.js";
import { initSlashMenu } from "./slashmenu.js";
import { initNotes, resetNotes } from "./notes.js";

initState();
render();
initEvents();
initAbout();
initSlashMenu();
initNotes();

/* ------------------------------ routing ---------------------------------- */
function currentRoute() {
  return location.hash.replace(/^#\/?/, "") === "notes" ? "notes" : "builder";
}
function applyRoute() {
  const route = currentRoute();
  const builder = document.getElementById("builder-view");
  const notes = document.getElementById("notes-view");
  if (builder) builder.hidden = route === "notes";
  if (notes) notes.hidden = route !== "notes";
  document.querySelectorAll("#appNav .nav-link").forEach((l) =>
    l.classList.toggle("active", l.dataset.route === route));
  if (route === "notes") { resetNotes(); window.scrollTo(0, 0); }
}
window.addEventListener("hashchange", applyRoute);
applyRoute();
