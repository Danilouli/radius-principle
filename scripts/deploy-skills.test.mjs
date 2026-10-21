import assert from "node:assert/strict";
import { test } from "node:test";

import { githubSlug, parseArgs } from "./deploy-skills.mjs";

test("parseArgs accepts --no-list", () => {
  assert.deepEqual(parseArgs(["--no-list"]), { help: false, list: false });
});

test("githubSlug reads https and ssh remotes", () => {
  assert.equal(
    githubSlug("https://github.com/Danilouli/radius-principle.git"),
    "danilouli/radius-principle",
  );
  assert.equal(
    githubSlug("git@github.com:Danilouli/radius-principle.git"),
    "danilouli/radius-principle",
  );
});
