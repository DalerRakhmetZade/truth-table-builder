// Entry point: initialize state, render, wire events, set up the About dialog.
import { initState } from "./store.js";
import { render } from "./render.js";
import { initEvents } from "./events.js";
import { initAbout } from "./about.js";
import { initSlashMenu } from "./slashmenu.js";

initState();
render();
initEvents();
initAbout();
initSlashMenu();
