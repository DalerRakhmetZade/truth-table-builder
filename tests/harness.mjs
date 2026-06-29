// Test harness: loads app.js, stubs a minimal DOM, and exposes the pure logic
// so it can be tested in Node without a browser.
//
// app.js attaches DOM event listeners and calls render() on load; the stubs
// below satisfy those calls so the module's pure functions can be captured and
// exercised in isolation.
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const APP_JS = join(here, "..", "app.js");

function fakeElement() {
  const el = {
    _value: "",
    dataset: {},
    classList: { add() {}, remove() {}, toggle() {} },
    style: {},
    addEventListener() {},
    removeEventListener() {},
    querySelector() { return fakeElement(); },
    querySelectorAll() { return []; },
    closest() { return null; },
    focus() {},
    select() {},
    setSelectionRange() {},
    dispatchEvent() {},
    appendChild() {},
    removeChild() {},
  };
  Object.defineProperty(el, "innerHTML", { get() { return el._html || ""; }, set(v) { el._html = v; } });
  Object.defineProperty(el, "value", { get() { return el._value; }, set(v) { el._value = v; } });
  return el;
}

/**
 * Load a fresh instance of the app logic.
 * @param {string|null} localStorageRaw  value returned by localStorage.getItem (for migration tests)
 * @returns {object} the exposed API
 */
export function load(localStorageRaw = null) {
  let js = readFileSync(APP_JS, "utf8");

  // Provide DOM/browser stubs on globalThis for the duration of eval.
  const store = { value: localStorageRaw };
  globalThis.localStorage = {
    getItem() { return store.value; },
    setItem(_k, v) { store.value = v; },
  };
  globalThis.document = {
    getElementById() { return fakeElement(); },
    createElement() { return fakeElement(); },
    addEventListener() {},
    body: { contains() { return false; }, appendChild() {}, removeChild() {} },
    querySelectorAll() { return []; },
  };
  globalThis.window = globalThis.window || {};
  if (!globalThis.navigator || !globalThis.navigator.clipboard) {
    try {
      Object.defineProperty(globalThis, "navigator", {
        value: { clipboard: { writeText() { return Promise.resolve(); } } },
        configurable: true,
      });
    } catch (e) { /* real navigator present and frozen; not used during load */ }
  }
  globalThis.confirm = () => true;
  globalThis.alert = () => {};

  // Append an export object that captures the in-scope functions/state.
  js += `
  ;globalThis.__TT__ = {
    tokenize, parse, compile, evalAst, collectVars,
    generateRows, syncVarNames, defaultName, makeTable,
    loadState, saveState, tableToText, renameInExpr, escapeRegExp,
    getState: () => state,
  };`;

  // Indirect eval so the program runs at global scope.
  (0, eval)(js);
  const api = globalThis.__TT__;
  api._storage = store;
  return api;
}

/** Convenience: compute the T/F column string for an expression over given var names. */
export function column(api, expr, names) {
  const rows = api.generateRows(names);
  const c = api.compile(expr, names);
  return rows.map((r) => (api.evalAst(c.ast, r) ? "T" : "F")).join("");
}
