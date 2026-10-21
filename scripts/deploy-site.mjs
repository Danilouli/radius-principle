#!/usr/bin/env node
/**
 * Deploy the manifesto site to Cloudflare Pages.
 *
 * Locally, loads site/.env if CLOUDFLARE_API_TOKEN / CLOUDFLARE_ACCOUNT_ID
 * are not already in the environment. Never prints those values.
 *
 * Usage:
 *   node scripts/deploy-site.mjs
 *   node scripts/deploy-site.mjs --dry-run
 */

import { spawnSync } from "node:child_process";
import { copyFileSync, existsSync, mkdirSync, readFileSync, rmSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { applyEnv, parseEnvText } from "./env.mjs";

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url));
export const REPO_ROOT = resolve(SCRIPT_DIR, "..");
const SITE_ENV_PATH = join(REPO_ROOT, "site", ".env");
const SITE_ENV_EXAMPLE = "site/.env.example";
const REQUIRED = ["CLOUDFLARE_API_TOKEN", "CLOUDFLARE_ACCOUNT_ID"];
export const SITE_PUBLIC_FILES = ["index.html", "styles.css", "logo.svg"];

/**
 * @param {string[]} argv
 */
export function parseArgs(argv) {
  let dryRun = false;
  for (const arg of argv) {
    if (arg === "--help" || arg === "-h") {
      return { help: true, dryRun };
    }
    if (arg === "--dry-run") {
      dryRun = true;
      continue;
    }
    throw new Error(`Unknown argument: ${arg}\n\nRun with --help for usage.`);
  }
  return { help: false, dryRun };
}

/**
 * @param {NodeJS.ProcessEnv} env
 * @param {{ envPath?: string, exists?: (path: string) => boolean, readFile?: (path: string) => string }} [io]
 */
export function loadSiteCredentials(env, io = {}) {
  const envPath = io.envPath ?? SITE_ENV_PATH;
  const exists = io.exists ?? existsSync;
  const readFile = io.readFile ?? ((path) => readFileSync(path, "utf8"));
  if (exists(envPath)) {
    applyEnv(env, parseEnvText(readFile(envPath)));
  }
  const missing = REQUIRED.filter((key) => !env[key]);
  if (missing.length > 0) {
    throw new Error(
      `Missing ${missing.join(", ")}. Copy ${SITE_ENV_EXAMPLE} to site/.env, or set the variables in the environment.`,
    );
  }
}

/**
 * Copy only public site files into a staging directory so .env never uploads.
 *
 * @param {string} siteDir
 * @param {string} destDir
 */
export function stageSite(siteDir, destDir) {
  rmSync(destDir, { recursive: true, force: true });
  mkdirSync(destDir, { recursive: true });
  for (const file of SITE_PUBLIC_FILES) {
    const from = join(siteDir, file);
    if (!existsSync(from)) {
      throw new Error(`Missing site file: ${file}`);
    }
    copyFileSync(from, join(destDir, file));
  }
  return SITE_PUBLIC_FILES.slice();
}

/**
 * @param {{ dryRun?: boolean, cwd?: string, env?: NodeJS.ProcessEnv, spawn?: typeof spawnSync }} [options]
 */
export function deploySite(options = {}) {
  const cwd = options.cwd ?? REPO_ROOT;
  const env = options.env ?? { ...process.env };
  const spawn = options.spawn ?? spawnSync;
  loadSiteCredentials(env, { envPath: join(cwd, "site", ".env") });
  stageSite(join(cwd, "site"), join(cwd, "site", "dist"));

  if (options.dryRun) {
    return { dryRun: true };
  }

  const wrangler = join(cwd, "node_modules", ".bin", "wrangler");
  const bin = existsSync(wrangler) ? wrangler : "npx";
  const args = existsSync(wrangler)
    ? ["pages", "deploy", "site/dist", "--project-name=radius-principle"]
    : ["--yes", "wrangler", "pages", "deploy", "site/dist", "--project-name=radius-principle"];

  const result = spawn(bin, args, {
    cwd,
    env,
    encoding: "utf8",
    stdio: "inherit",
  });
  if (result.status !== 0) {
    throw new Error("Wrangler deploy failed.");
  }
  return { dryRun: options.dryRun === true };
}

function printHelp() {
  console.log(`Deploy the manifesto site to Cloudflare Pages.

Usage
  node scripts/deploy-site.mjs
  node scripts/deploy-site.mjs --dry-run

Credentials: CLOUDFLARE_API_TOKEN and CLOUDFLARE_ACCOUNT_ID
(from the environment, or site/.env).
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
    deploySite(args);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(message);
    process.exit(1);
  }
}

if (isExecutedAsMain()) {
  main();
}
