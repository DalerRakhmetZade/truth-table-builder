// Single-source-of-truth sync: regenerate package.json "version" and
// CHANGELOG.md from js/version.js (APP_VERSION + CHANGELOG).
//
// Usage:
//   npm run sync-version          # rewrite the derived files
//   npm run sync-version -- --check   # verify they're in sync (exit 1 if not)
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { APP_VERSION, CHANGELOG } from "../js/version.js";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const REPO = "https://github.com/DalerRakhmetZade/truth-table-builder";
const check = process.argv.includes("--check");

// --- render CHANGELOG.md from the CHANGELOG array ---------------------------
function renderMarkdown() {
  let out =
`# Changelog

All notable changes to this project are documented here. This file is generated
from \`js/version.js\` (run \`npm run sync-version\`) and mirrors the in-app version
history (see the **About** dialog). The format is based on
[Keep a Changelog](https://keepachangelog.com/), and the project follows
[Semantic Versioning](https://semver.org/).

`;
  for (const rel of CHANGELOG) {
    out += `## [${rel.version}] — ${rel.date}\n`;
    for (const c of rel.changes) out += `- ${c}\n`;
    out += "\n";
  }
  for (const rel of CHANGELOG) {
    out += `[${rel.version}]: ${REPO}/releases/tag/v${rel.version}\n`;
  }
  return out;
}

// --- update package.json version (preserving formatting) -------------------
function renderPackageJson(current) {
  const pkg = JSON.parse(current);
  pkg.version = APP_VERSION;
  return JSON.stringify(pkg, null, 2) + "\n";
}

const targets = [
  { path: join(root, "CHANGELOG.md"), next: renderMarkdown() },
  {
    path: join(root, "package.json"),
    next: renderPackageJson(readFileSync(join(root, "package.json"), "utf8")),
  },
];

let drift = false;
for (const t of targets) {
  const current = (() => { try { return readFileSync(t.path, "utf8"); } catch { return null; } })();
  const inSync = current === t.next;
  if (inSync) continue;
  drift = true;
  if (check) {
    console.error(`out of sync: ${t.path}`);
  } else {
    writeFileSync(t.path, t.next);
    console.log(`updated: ${t.path}`);
  }
}

if (check) {
  if (drift) {
    console.error('Run "npm run sync-version" to regenerate derived files.');
    process.exit(1);
  }
  console.log(`In sync at v${APP_VERSION}.`);
} else if (!drift) {
  console.log(`Already in sync at v${APP_VERSION}.`);
}
