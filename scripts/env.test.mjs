import assert from "node:assert/strict";
import { test } from "node:test";

import { applyEnv, parseEnvText } from "./env.mjs";

test("parseEnvText reads keys, quotes, export, and comments", () => {
  const parsed = parseEnvText(`
# comment
CLOUDFLARE_API_TOKEN=cfat_example
CLOUDFLARE_ACCOUNT_ID="abc123"
export OTHER=ok
not a line
=missing-key
`);
  assert.equal(parsed.CLOUDFLARE_API_TOKEN, "cfat_example");
  assert.equal(parsed.CLOUDFLARE_ACCOUNT_ID, "abc123");
  assert.equal(parsed.OTHER, "ok");
  assert.equal(parsed["not a line"], undefined);
});

test("applyEnv does not overwrite a key that is already set", () => {
  /** @type {Record<string, string | undefined>} */
  const env = { CLOUDFLARE_API_TOKEN: "from-ci" };
  applyEnv(env, { CLOUDFLARE_API_TOKEN: "from-file", CLOUDFLARE_ACCOUNT_ID: "acct" });
  assert.equal(env.CLOUDFLARE_API_TOKEN, "from-ci");
  assert.equal(env.CLOUDFLARE_ACCOUNT_ID, "acct");
});
