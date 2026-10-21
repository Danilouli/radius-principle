#!/usr/bin/env node
/**
 * Validate the radius plugin, install it locally, and optionally push.
 *
 * skills.sh has no publish API. GitHub is the package: once this repo is on
 * origin, install is `npx skills add <owner>/<repo>`.
 *
 * Usage:
 *   node scripts/publish.mjs
 *   node scripts/publish.mjs --dry-run
 *   node scripts/publish.mjs --no-local
 *   node scripts/publish.mjs --push
 */

import { spawnSync } from "node:child_process";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { installLocal } from "./install-local.mjs";
import { parseExpect } from "../skills/drift/scripts/check-expect.mjs";

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url));
export const REPO_ROOT = resolve(SCRIPT_DIR, "..");
const SKILLS_DIR = join(REPO_ROOT, "skills");
const EXPECTED_SKILLS = ["expect", "impl", "drift"];

/**
 * @param {string[]} argv
 */
export function parseArgs(argv) {
  let dryRun = false;
  let local = true;
  let push = false;
  for (const arg of argv) {
    if (arg === "--help" || arg === "-h") {
      return { help: true, dryRun, local, push };
    }
    if (arg === "--dry-run") {
      dryRun = true;
      continue;
    }
    if (arg === "--no-local") {
      local = false;
      continue;
    }
    if (arg === "--push") {
      push = true;
      continue;
    }
    throw new Error(`Unknown argument: ${arg}\n\nRun with --help for usage.`);
  }
  return { help: false, dryRun, local, push };
}

/**
 * @param {string} contents
 */
export function readSkillFrontmatterName(contents) {
  const match = contents.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!match) {
    return undefined;
  }
  const nameLine = match[1].match(/^name:\s*(.+)\s*$/m);
  if (!nameLine) {
    return undefined;
  }
  return nameLine[1].trim();
}

/**
 * @param {string} [repoRoot]
 */
export function validatePlugin(repoRoot = REPO_ROOT) {
  const pluginPath = join(repoRoot, "plugin.json");
  if (!existsSync(pluginPath)) {
    throw new Error("Missing plugin.json");
  }
  const plugin = JSON.parse(readFileSync(pluginPath, "utf8"));
  if (plugin.name !== "radius") {
    throw new Error(`plugin.json name must be "radius" (got ${plugin.name})`);
  }
  if (plugin.$schema !== "https://agent-plugins.org/schemas/1.0.0/plugin.schema.json") {
    throw new Error("plugin.json $schema must be the Agent Plugins 1.0.0 schema");
  }

  const cursorPluginPath = join(repoRoot, ".cursor-plugin", "plugin.json");
  if (existsSync(cursorPluginPath)) {
    const cursorPlugin = JSON.parse(readFileSync(cursorPluginPath, "utf8"));
    if (cursorPlugin.name !== "radius") {
      throw new Error(`.cursor-plugin/plugin.json name must be "radius"`);
    }
  }

  const skillDirs = readdirSync(join(repoRoot, "skills"), { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort();
  for (const id of EXPECTED_SKILLS) {
    if (!skillDirs.includes(id)) {
      throw new Error(`Missing skill directory: skills/${id}`);
    }
  }
  for (const id of skillDirs) {
    const skillMdPath = join(repoRoot, "skills", id, "SKILL.md");
    if (!existsSync(skillMdPath)) {
      throw new Error(`Missing SKILL.md for ${id}`);
    }
    const name = readSkillFrontmatterName(readFileSync(skillMdPath, "utf8"));
    if (name !== id) {
      throw new Error(`SKILL.md name "${name}" does not match directory "${id}"`);
    }
  }

  const examplePath = join(repoRoot, "examples", "acquire-lock.expect.yml");
  const example = parseExpect(readFileSync(examplePath, "utf8"));
  if (!example.files["src/lock.ts"] || example.legacy) {
    throw new Error("examples/acquire-lock.expect.yml is not a valid canonical expect");
  }

  const checker = join(SKILLS_DIR, "drift", "scripts", "check-expect.mjs");
  if (!existsSync(checker)) {
    throw new Error("Missing drift checker script");
  }
  const validator = join(SKILLS_DIR, "expect", "scripts", "validate-expect.mjs");
  if (!existsSync(validator)) {
    throw new Error("Missing expect validator script");
  }

  return { plugin, skills: skillDirs };
}

/**
 * @param {{ dryRun?: boolean, local?: boolean, push?: boolean, repoRoot?: string }} [options]
 */
export function publish(options = {}) {
  const repoRoot = options.repoRoot ?? REPO_ROOT;
  const dryRun = options.dryRun === true;
  const local = options.local !== false;
  const push = options.push === true;

  const validated = validatePlugin(repoRoot);
  console.log(`Validated radius plugin (${validated.skills.join(", ")}).`);

  if (local) {
    installLocal({ repoRoot, dryRun });
  }

  const remote = git(["remote", "get-url", "origin"], {
    cwd: repoRoot,
    capture: true,
    allowFail: true,
  });
  const origin = remote.status === 0 ? remote.stdout.trim() : "";
  const installHint = origin
    ? skillsInstallCommand(origin)
    : "npx skills add <owner>/<repo>";

  if (push) {
    if (!origin) {
      throw new Error(
        "No origin remote. Create one first, e.g.\n  gh repo create radius --public --source=. --remote=origin --push",
      );
    }
    if (dryRun) {
      console.log(`Dry run: would push to ${origin}`);
    } else {
      git(["push", "origin", "HEAD"], { cwd: repoRoot });
      console.log(`Pushed to ${origin}`);
    }
  } else if (!origin) {
    console.log(`
No git remote yet. This repo is the package.
  gh repo create radius --public --source=. --remote=origin --push
Then others install with:
  npx skills add <owner>/radius
`);
  } else {
    console.log(`
GitHub install (after git push):
  ${installHint}
`);
  }

  return { origin, installHint, skills: validated.skills };
}

/**
 * @param {string} origin
 */
export function skillsInstallCommand(origin) {
  const match = origin.match(/github\.com[:/](.+?)\/(.+?)(?:\.git)?$/);
  if (!match) {
    return `npx skills add ${origin}`;
  }
  return `npx skills add ${match[1]}/${match[2].replace(/\.git$/, "")}`;
}

function printHelp() {
  console.log(`Validate, install locally, and optionally push the radius plugin.

Usage
  node scripts/publish.mjs
  node scripts/publish.mjs --dry-run
  node scripts/publish.mjs --no-local
  node scripts/publish.mjs --push
`);
}

/**
 * @param {string[]} args
 * @param {{ cwd: string, capture?: boolean, allowFail?: boolean }} options
 */
function git(args, options) {
  const result = spawnSync("git", args, {
    cwd: options.cwd,
    encoding: "utf8",
    stdio: options.capture ? ["ignore", "pipe", "pipe"] : "inherit",
  });
  if (!options.allowFail && result.status !== 0) {
    const detail = [result.stderr, result.stdout].filter(Boolean).join("\n").trim();
    throw new Error(`git ${args.join(" ")} failed${detail ? `:\n${detail}` : ""}`);
  }
  return result;
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
    publish(args);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(message);
    process.exit(1);
  }
}

if (isExecutedAsMain()) {
  main();
}
