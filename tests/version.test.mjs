import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { APP_VERSION, CHANGELOG, renderChangelog } from "../js/version.js";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..");

test("APP_VERSION is valid semver", () => {
  assert.match(APP_VERSION, /^\d+\.\d+\.\d+$/);
});

test("package.json version matches APP_VERSION", () => {
  const pkg = JSON.parse(readFileSync(join(root, "package.json"), "utf8"));
  assert.equal(pkg.version, APP_VERSION);
});

test("CHANGELOG is non-empty and well-formed", () => {
  assert.ok(Array.isArray(CHANGELOG) && CHANGELOG.length > 0);
  for (const entry of CHANGELOG) {
    assert.match(entry.version, /^\d+\.\d+\.\d+$/, "version is semver");
    assert.match(entry.date, /^\d{4}-\d{2}-\d{2}$/, "date is YYYY-MM-DD");
    assert.ok(Array.isArray(entry.changes) && entry.changes.length > 0, "has changes");
    for (const c of entry.changes) assert.equal(typeof c, "string");
  }
});

test("newest CHANGELOG entry matches APP_VERSION", () => {
  assert.equal(CHANGELOG[0].version, APP_VERSION);
});

test("CHANGELOG versions are unique", () => {
  const versions = CHANGELOG.map((e) => e.version);
  assert.equal(new Set(versions).size, versions.length);
});

test("CHANGELOG.md documents the current version", () => {
  const md = readFileSync(join(root, "CHANGELOG.md"), "utf8");
  assert.ok(md.includes("[" + APP_VERSION + "]"), "CHANGELOG.md has current version heading");
});

test("derived files (package.json + CHANGELOG.md) are in sync with js/version.js", () => {
  // js/version.js is the single source of truth; this fails if the generated
  // files drift. Run `npm run sync-version` to regenerate them.
  assert.doesNotThrow(() =>
    execFileSync("node", [join(root, "scripts/sync-version.mjs"), "--check"], { stdio: "pipe" })
  );
});

test("renderChangelog produces escaped HTML with version + changes", () => {
  const html = renderChangelog([
    { version: "9.9.9", date: "2030-01-01", changes: ["Did <a> thing", "Another"] },
  ]);
  assert.match(html, /v9\.9\.9/);
  assert.match(html, /2030-01-01/);
  assert.match(html, /<li>Did &lt;a&gt; thing<\/li>/);
  assert.match(html, /<li>Another<\/li>/);
});
