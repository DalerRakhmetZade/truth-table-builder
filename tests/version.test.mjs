import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { load } from "./harness.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..");
const api = load();

test("APP_VERSION is valid semver", () => {
  assert.match(api.APP_VERSION, /^\d+\.\d+\.\d+$/);
});

test("package.json version matches APP_VERSION", () => {
  const pkg = JSON.parse(readFileSync(join(root, "package.json"), "utf8"));
  assert.equal(pkg.version, api.APP_VERSION);
});

test("CHANGELOG is non-empty and well-formed", () => {
  assert.ok(Array.isArray(api.CHANGELOG) && api.CHANGELOG.length > 0);
  for (const entry of api.CHANGELOG) {
    assert.match(entry.version, /^\d+\.\d+\.\d+$/, "version is semver");
    assert.match(entry.date, /^\d{4}-\d{2}-\d{2}$/, "date is YYYY-MM-DD");
    assert.ok(Array.isArray(entry.changes) && entry.changes.length > 0, "has changes");
    for (const c of entry.changes) assert.equal(typeof c, "string");
  }
});

test("newest CHANGELOG entry matches APP_VERSION", () => {
  assert.equal(api.CHANGELOG[0].version, api.APP_VERSION);
});

test("CHANGELOG versions are unique", () => {
  const versions = api.CHANGELOG.map((e) => e.version);
  assert.equal(new Set(versions).size, versions.length);
});

test("CHANGELOG.md documents the current version", () => {
  const md = readFileSync(join(root, "CHANGELOG.md"), "utf8");
  assert.ok(md.includes("[" + api.APP_VERSION + "]"), "CHANGELOG.md has current version heading");
});

test("renderChangelog produces escaped HTML with version + changes", () => {
  const html = api.renderChangelog([
    { version: "9.9.9", date: "2030-01-01", changes: ["Did <a> thing", "Another"] },
  ]);
  assert.match(html, /v9\.9\.9/);
  assert.match(html, /2030-01-01/);
  assert.match(html, /<li>Did &lt;a&gt; thing<\/li>/); // escaped
  assert.match(html, /<li>Another<\/li>/);
});
