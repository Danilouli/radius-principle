#!/usr/bin/env node
/**
 * Copy this plugin into ~/.cursor/plugins/local/radius so Cursor loads
 * /radius:expect, /radius:impl, and /radius:drift.
 *
 * Cursor does not follow symlinks that point outside that folder, so this
 * copies. Re-run after skill edits, then reload the window.
 *
 * Usage:
 *   node scripts/install-local.mjs
 *   node scripts/install-local.mjs --dry-run
 */

import { cpSync, existsSync, mkdirSync, rmSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url));
export const REPO_ROOT = resolve(SCRIPT_DIR, "..");
export const PLUGIN_NAME = "radius";
const PREVIOUS_PLUGIN_NAME = "expect-method";

const COPY_ENTRIES = [
  "plugin.json",
  ".cursor-plugin",
  "skills",
  "examples",
  "LICENSE",
  "README.md",
];

/**
 * @param {string[]} argv
 */
export function parseArgs(argv) {
  let dryRun = false;
  let dest = join(homedir(), ".cursor", "plugins", "local", PLUGIN_NAME);
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--help" || arg === "-h") {
      return { help: true, dryRun, dest };
    }
    if (arg === "--dry-run") {
      dryRun = true;
      continue;
    }
    if (arg === "--dest") {
      const value = argv[i + 1];
      if (!value || value.startsWith("-")) {
        throw new Error("Missing value for --dest");
      }
      dest = resolve(value);
      i += 1;
      continue;
    }
    throw new Error(`Unknown argument: ${arg}`);
  }
  return { help: false, dryRun, dest };
}

/**
 * @param {{ dest?: string, dryRun?: boolean, repoRoot?: string }} [options]
 */
export function installLocal(options = {}) {
  const repoRoot = options.repoRoot ?? REPO_ROOT;
  const dest = options.dest ?? join(homedir(), ".cursor", "plugins", "local", PLUGIN_NAME);
  const dryRun = options.dryRun === true;

  const missing = COPY_ENTRIES.filter((entry) => {
    if (entry === "README.md") {
      return false;
    }
    return !existsSync(join(repoRoot, entry));
  });
  if (missing.length > 0) {
    throw new Error(`Missing plugin files: ${missing.join(", ")}`);
  }

  if (dryRun) {
    console.log(`Would install ${PLUGIN_NAME} -> ${dest}`);
    for (const entry of COPY_ENTRIES) {
      if (existsSync(join(repoRoot, entry))) {
        console.log(`  ${entry}`);
      }
    }
    return { dest, dryRun: true };
  }

  mkdirSync(dirname(dest), { recursive: true });
  rmSync(dest, { recursive: true, force: true });
  mkdirSync(dest, { recursive: true });
  for (const entry of COPY_ENTRIES) {
    const from = join(repoRoot, entry);
    if (!existsSync(from)) {
      continue;
    }
    cpSync(from, join(dest, entry), { recursive: true });
  }
  const legacyDest = join(homedir(), ".cursor", "plugins", "local", PREVIOUS_PLUGIN_NAME);
  if (resolve(dest) !== resolve(legacyDest) && existsSync(legacyDest)) {
    rmSync(legacyDest, { recursive: true, force: true });
    console.log(`Removed previous plugin at ${legacyDest}`);
  }
  console.log(`Installed ${PLUGIN_NAME} -> ${dest}`);
  console.log("Reload the Cursor window, then run /radius:expect, /radius:impl, or /radius:drift.");
  return { dest, dryRun: false };
}

function printHelp() {
  console.log(`Install the radius plugin into ~/.cursor/plugins/local/radius.

Usage
  node scripts/install-local.mjs
  node scripts/install-local.mjs --dry-run
  node scripts/install-local.mjs --dest /tmp/radius-plugin
`);
}

function isExecutedAsMain() {
  const invoked = process.argv[1];
  if (!invoked) {
    return false;
  }
  return resolve(invoked) === fileURLToPath(import.meta.url);
}

function main() {
  try {
    const args = parseArgs(process.argv.slice(2));
    if (args.help) {
      printHelp();
      process.exit(0);
    }
    installLocal(args);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(message);
    process.exit(1);
  }
}

if (isExecutedAsMain()) {
  main();
}
