#!/usr/bin/env node
/**
 * Publish Radius skills for skills.sh.
 *
 * skills.sh has no upload API. The GitHub repo is the package:
 *   npx skills add danilouli/radius-principle
 *
 * This script validates the plugin, then lists the skills from origin
 * so the CLI telemetry path that skills.sh indexes has a chance to fire.
 *
 * Usage:
 *   node scripts/deploy-skills.mjs
 *   node scripts/deploy-skills.mjs --no-list
 */

import { spawnSync } from "node:child_process";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { skillsInstallCommand, validatePlugin } from "./publish.mjs";

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url));
export const REPO_ROOT = resolve(SCRIPT_DIR, "..");

/**
 * @param {string[]} argv
 */
export function parseArgs(argv) {
  let list = true;
  for (const arg of argv) {
    if (arg === "--help" || arg === "-h") {
      return { help: true, list };
    }
    if (arg === "--no-list") {
      list = false;
      continue;
    }
    throw new Error(`Unknown argument: ${arg}\n\nRun with --help for usage.`);
  }
  return { help: false, list };
}

/**
 * @param {string} origin
 */
export function githubSlug(origin) {
  const match = origin.match(/github\.com[:/](.+?)\/(.+?)(?:\.git)?$/);
  if (!match) {
    return undefined;
  }
  return `${match[1].toLowerCase()}/${match[2].replace(/\.git$/, "").toLowerCase()}`;
}

/**
 * @param {{ cwd?: string, list?: boolean, spawn?: typeof spawnSync }} [options]
 */
export function deploySkills(options = {}) {
  const cwd = options.cwd ?? REPO_ROOT;
  const spawn = options.spawn ?? spawnSync;
  const validated = validatePlugin(cwd);

  const remote = spawn("git", ["remote", "get-url", "origin"], {
    cwd,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });
  const origin = remote.status === 0 ? remote.stdout.trim() : "";
  if (!origin) {
    throw new Error(
      "No origin remote. skills.sh installs from GitHub:\n  npx skills add <owner>/<repo>",
    );
  }

  const slug = githubSlug(origin);
  const installHint = skillsInstallCommand(origin);
  console.log(`Validated radius plugin (${validated.skills.join(", ")}).`);
  console.log(`skills.sh install: ${installHint}`);

  if (options.list === false) {
    return { origin, slug, installHint, listed: false, skills: validated.skills };
  }
  if (!slug) {
    throw new Error(`Origin is not a GitHub URL: ${origin}`);
  }

  const list = spawn("npx", ["--yes", "skills", "add", slug, "--list", "-y"], {
    cwd,
    encoding: "utf8",
    stdio: "inherit",
  });
  if (list.status !== 0) {
    throw new Error(
      `Could not list skills from ${slug}. Push the default branch, then retry.`,
    );
  }
  return { origin, slug, installHint, listed: true, skills: validated.skills };
}

function printHelp() {
  console.log(`Validate the plugin and list skills from GitHub for skills.sh.

Usage
  node scripts/deploy-skills.mjs
  node scripts/deploy-skills.mjs --no-list
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
    deploySkills(args);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(message);
    process.exit(1);
  }
}

if (isExecutedAsMain()) {
  main();
}
