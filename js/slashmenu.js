// "/" slash command: type "/" inside an expression field to pop up a symbol
// picker. Filter by typing (e.g. "/and"), navigate with ↑/↓, choose with
// Enter/Tab/click, dismiss with Esc.

export const SLASH_ITEMS = [
  { sym: "¬", name: "NOT", keys: ["not", "negation", "~", "!"] },
  { sym: "∧", name: "AND", keys: ["and", "conjunction", "&", "*"] },
  { sym: "∨", name: "OR", keys: ["or", "disjunction", "|"] },
  { sym: "⊕", name: "XOR", keys: ["xor", "exclusive", "^"] },
  { sym: "→", name: "IMPLIES", keys: ["implies", "imp", "then", "->"] },
  { sym: "↔", name: "IFF", keys: ["iff", "biconditional", "equiv", "<->"] },
  { sym: "(", name: "Open paren", keys: ["open", "lparen", "("] },
  { sym: ")", name: "Close paren", keys: ["close", "rparen", ")"] },
];

// Pure: return the items matching a query (prefix match on name or any alias).
export function filterSymbols(query) {
  const q = (query || "").toLowerCase();
  if (!q) return SLASH_ITEMS.slice();
  return SLASH_ITEMS.filter((it) =>
    it.name.toLowerCase().startsWith(q) || it.keys.some((k) => k.startsWith(q)));
}

let menuEl = null;
let activeInput = null;
let slashStart = -1;
let items = [];
let sel = 0;

function ensureMenu() {
  if (menuEl) return menuEl;
  menuEl = document.createElement("div");
  menuEl.className = "slash-menu";
  // keep the field focused when interacting with the menu
  menuEl.addEventListener("mousedown", (e) => e.preventDefault());
  menuEl.addEventListener("click", (e) => {
    const it = e.target.closest("[data-idx]");
    if (it) choose(Number(it.dataset.idx));
  });
  document.body.appendChild(menuEl);
  return menuEl;
}

function isOpen() { return !!activeInput && menuEl && menuEl.classList.contains("show"); }

function close() {
  if (menuEl) menuEl.classList.remove("show");
  activeInput = null; slashStart = -1; items = []; sel = 0;
}

// The query is the run of letters between the "/" and the caret.
function queryFor(input) {
  const caret = input.selectionStart;
  const v = input.value;
  for (let k = caret - 1; k >= 0; k--) {
    const ch = v[k];
    if (ch === "/") return { start: k, query: v.slice(k + 1, caret) };
    if (!/[A-Za-z]/.test(ch)) break;
  }
  return null;
}

function update(input) {
  const q = queryFor(input);
  if (!q) { if (isOpen()) close(); return; }
  const matches = filterSymbols(q.query);
  if (!matches.length) { close(); return; }
  activeInput = input;
  slashStart = q.start;
  items = matches;
  if (sel >= items.length) sel = 0;
  draw();
  position();
}

function draw() {
  const m = ensureMenu();
  m.innerHTML = items.map((it, i) =>
    '<div class="slash-item' + (i === sel ? " active" : "") + '" data-idx="' + i + '">' +
      '<span class="slash-sym">' + it.sym + '</span>' +
      '<span class="slash-name">' + it.name + '</span>' +
    '</div>').join("");
  m.classList.add("show");
  const active = m.querySelector(".slash-item.active");
  if (active) active.scrollIntoView({ block: "nearest" });
}

function position() {
  if (!activeInput || !menuEl) return;
  const r = activeInput.getBoundingClientRect();
  menuEl.style.left = (window.scrollX + r.left) + "px";
  menuEl.style.top = (window.scrollY + r.bottom + 4) + "px";
  menuEl.style.minWidth = r.width + "px";
}

function choose(i) {
  if (!activeInput || !items[i]) return;
  const sym = items[i].sym;
  const input = activeInput;
  const caret = input.selectionStart;
  const before = input.value.slice(0, slashStart);
  const after = input.value.slice(caret);
  input.value = before + sym + after;
  const pos = before.length + sym.length;
  close();
  input.setSelectionRange(pos, pos);
  input.focus();
  input.dispatchEvent(new Event("input", { bubbles: true }));
}

export function initSlashMenu() {
  ensureMenu();
  const tablesEl = document.getElementById("tables");

  tablesEl.addEventListener("input", (e) => {
    const input = e.target.closest("input.expr-input");
    if (!input) { if (isOpen()) close(); return; }
    update(input);
  });

  // Handle navigation before the global Enter-to-blur handler (stopPropagation).
  tablesEl.addEventListener("keydown", (e) => {
    if (!isOpen()) return;
    const input = e.target.closest("input.expr-input");
    if (!input || input !== activeInput) return;
    if (e.key === "ArrowDown") { e.preventDefault(); sel = (sel + 1) % items.length; draw(); }
    else if (e.key === "ArrowUp") { e.preventDefault(); sel = (sel - 1 + items.length) % items.length; draw(); }
    else if (e.key === "Enter" || e.key === "Tab") { e.preventDefault(); e.stopPropagation(); choose(sel); }
    else if (e.key === "Escape") {
      e.preventDefault(); e.stopPropagation();
      // remove the "/query" text so a stray slash isn't left behind
      const caret = input.selectionStart;
      const before = input.value.slice(0, slashStart);
      const after = input.value.slice(caret);
      const pos = before.length;
      input.value = before + after;
      close();
      input.setSelectionRange(pos, pos);
      input.dispatchEvent(new Event("input", { bubbles: true }));
    }
  });

  tablesEl.addEventListener("focusout", (e) => {
    const input = e.target.closest("input.expr-input");
    if (input && input === activeInput) close();
  });

  window.addEventListener("scroll", () => { if (isOpen()) position(); }, true);
}
