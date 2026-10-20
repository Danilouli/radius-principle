import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { test } from "node:test";

import {
  compareExpect,
  isExpectPath,
  normalizeNumstatPath,
  parseExpect,
  parseNumstat,
  scoreFile,
  splitKeyValue,
} from "./check-expect.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const examplePath = join(here, "../../../examples/acquire-lock.expect.yml");

test("parses the canonical example", () => {
  const expectFile = parseExpect(readFileSync(examplePath, "utf8"));
  assert.equal(expectFile.legacy, false);
  assert.match(expectFile.desc ?? "", /acquireLock/);
  assert.equal(expectFile.files["src/lock.ts"].plus, 40);
  assert.equal(expectFile.files["src/lock.ts"].minus, 0);
  assert.equal(expectFile.files["src/lock.ts"].symbols.acquireLock, "create");
  assert.equal(expectFile.files["src/run.ts"].symbols.run, "update");
});

test("parses legacy root-path expects", () => {
  const expectFile = parseExpect(`
src/lock.ts:
  change: New helper.
  "-": 0
  "+": 40
src/run.ts:
  change: Call it.
  "-": 12
  "+": 8
`);
  assert.equal(expectFile.legacy, true);
  assert.equal(expectFile.files["src/lock.ts"].desc, "New helper.");
  assert.equal(expectFile.files["src/run.ts"].plus, 8);
});

test("parses folded desc", () => {
  const expectFile = parseExpect(`
desc: >-
  Extract acquireLock so setup
  and teardown share one callback.
files:
  src/lock.ts:
    desc: New helper.
    "-": 0
    "+": 40
`);
  assert.equal(
    expectFile.desc,
    "Extract acquireLock so setup and teardown share one callback.",
  );
});

test("splitKeyValue handles quoted +/- keys", () => {
  assert.deepEqual(splitKeyValue('"-": 12'), { key: "-", rest: "12" });
  assert.deepEqual(splitKeyValue('"+": 8'), { key: "+", rest: "8" });
});

test("numstat rename uses the new path", () => {
  assert.equal(
    normalizeNumstatPath("src/{lock.ts => mutex.ts}"),
    "src/mutex.ts",
  );
  const rows = parseNumstat("40\t0\tsrc/lock.ts\n8\t12\tsrc/run.ts\n");
  assert.equal(rows[0].plus, 40);
  assert.equal(rows[1].minus, 12);
});

test("compareExpect scores match / missing / extra / over-under", () => {
  const expectFile = parseExpect(readFileSync(examplePath, "utf8"));
  const match = compareExpect(expectFile, [
    { path: "src/lock.ts", plus: 42, minus: 0 },
    { path: "src/run.ts", plus: 8, minus: 12 },
  ]);
  assert.equal(match.verdict, "matches");
  assert.equal(match.listed[0].status, "match");

  const missing = compareExpect(expectFile, [{ path: "src/lock.ts", plus: 40, minus: 0 }]);
  assert.equal(missing.verdict, "drifted");
  assert.equal(missing.listed.find((row) => row.path === "src/run.ts")?.status, "missing");

  const extra = compareExpect(expectFile, [
    { path: "src/lock.ts", plus: 40, minus: 0 },
    { path: "src/run.ts", plus: 8, minus: 12 },
    { path: "docs/note.md", plus: 4, minus: 0 },
    { path: "expect.yml", plus: 20, minus: 0 },
    { path: "blast.yml", plus: 20, minus: 0 },
  ]);
  assert.equal(extra.verdict, "close");
  assert.equal(extra.extra.length, 1);
  assert.equal(extra.extra[0].path, "docs/note.md");
  assert.equal(isExpectPath("expect.yml"), true);
  assert.equal(isExpectPath("blast.yml"), true);

  const blown = compareExpect(expectFile, [
    { path: "src/lock.ts", plus: 200, minus: 0 },
    { path: "src/run.ts", plus: 8, minus: 12 },
  ]);
  assert.equal(blown.verdict, "drifted");
  assert.equal(
    scoreFile(expectFile.files["src/lock.ts"], { path: "src/lock.ts", plus: 200, minus: 0 }),
    "over/under",
  );
});
