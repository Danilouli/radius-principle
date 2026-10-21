import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";

import { loadSiteCredentials, parseArgs, stageSite } from "./deploy-site.mjs";

test("parseArgs accepts --dry-run", () => {
  assert.deepEqual(parseArgs(["--dry-run"]), { help: false, dryRun: true });
});

test("loadSiteCredentials reads site/.env when the env is empty", () => {
  /** @type {NodeJS.ProcessEnv} */
  const env = {};
  loadSiteCredentials(env, {
    envPath: "/tmp/site.env",
    exists: () => true,
    readFile: () => "CLOUDFLARE_API_TOKEN=tok\nCLOUDFLARE_ACCOUNT_ID=acct\n",
  });
  assert.equal(env.CLOUDFLARE_API_TOKEN, "tok");
  assert.equal(env.CLOUDFLARE_ACCOUNT_ID, "acct");
});

test("loadSiteCredentials fails with a pointer at the example file", () => {
  assert.throws(
    () =>
      loadSiteCredentials(
        {},
        { envPath: "/tmp/missing.env", exists: () => false, readFile: () => "" },
      ),
    /site\/\.env\.example/,
  );
});

test("stageSite copies public files and leaves .env behind", () => {
  const root = mkdtempSync(join(tmpdir(), "radius-site-"));
  const siteDir = join(root, "site");
  const destDir = join(siteDir, "dist");
  mkdirSync(siteDir);
  writeFileSync(join(siteDir, "index.html"), "<html></html>");
  writeFileSync(join(siteDir, "styles.css"), "body{}");
  writeFileSync(join(siteDir, "logo.svg"), "<svg></svg>");
  writeFileSync(join(siteDir, ".env"), "CLOUDFLARE_API_TOKEN=secret");
  const copied = stageSite(siteDir, destDir);
  assert.deepEqual(copied.sort(), ["index.html", "logo.svg", "styles.css"]);
  assert.equal(readFileSync(join(destDir, "index.html"), "utf8"), "<html></html>");
  assert.throws(() => readFileSync(join(destDir, ".env")), /ENOENT/);
  rmSync(root, { recursive: true, force: true });
});
