# Radius Principle

Radius Principle is one idea for **reviewable, predictable agentic changes**. You formalize the expected change *before* an agent writes code, in a non-prose file: `expect.yml`.

An agent PR asks you to reconstruct intent from a finished diff. If that PR is the first thing you read, the review is already late. A markdown spec, a requirement, or a ticket is hard to read at a glance, and verifying that an implementation matches that prose is hard. An `expect.yml` names the files and symbols that should change, so you can review that list at a glance. Pair it with the ticket's description.

Formalizing first gives you:

- **Human comprehension** — see every file before any code exists. If the list seems too big, you can split it.
- **A gate** — read the expect, split or drop files, and validate it. That is the first and most important gate. If the first time you see it is inside the implementation PR, you are late.
- **Easier review** — if the contract is missed, `/radius:drift` shows where to look: extra files, blown size, a listed symbol that did not move. Not a general code review.
- **Agent guidance** — `/radius:impl` implements against the contract you validated, and tries to stay close to the estimates.
- **Conflict anticipation** — two expects that share a file, or that update the same symbol, should run one after the other.

The file list has to fit in your head. If it does not, the PR will not either. Split until each expect is one change you can review.

## Skills

| Slash command | What it does |
| --- | --- |
| `/radius:expect` | Draft an `expect.yml` from a requirement or conversation. |
| `/radius:impl` | Implement the change to match that expect. |
| `/radius:drift` | Measure how far a branch or PR drifted from the expect. Not a general code review. |

## expect.yml (v1)

```yaml
desc: "Extract acquireLock so setup and teardown share one release callback."
files:
  src/lock.ts:
    desc: "New helper: acquire and release the path lock."
    "-": 0
    "+": 40
    symbols:
      acquireLock: create
      releaseLock: create
  src/run.ts:
    desc: "Call acquireLock. Drop the inlined lock block."
    "-": 12
    "+": 8
    symbols:
      run: update
```

`desc` is for humans. `files` is the expect. `+` / `-` are expected size, not a pass or fail. `symbols` are not exhaustive: `create`, `update`, or `delete` for names you already care about.

After you validate the expect, `/radius:impl` implements against the listed files and tries to stay close to the estimates.

A fuller example lives in `examples/acquire-lock.expect.yml`. Legacy files named `blast.yml` still read.

## Install

```bash
npx skills add danilouli/radius-principle
```

Then run `/radius:expect`.
