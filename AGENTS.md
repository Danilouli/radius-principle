# Radius Principle — settled decisions

This file is for agents continuing this repo. Public copy lives in `README.md`. Skills are the source of truth for how `/radius:expect`, `/radius:impl`, and `/radius:drift` behave.

## What Radius Principle is

One principle for reviewable, predictable agentic changes. The load-bearing idea: **write the expectation before the change, and not as prose.** Radius Principle is the practice. `expect.yml` is the artifact.

That prior enables: a human can see and split the slice before code exists; a script can score drift against git; an agent can implement against the file list; two expects that share a file should run sequentially.

The human still reads `expect.yml` before `/radius:impl`. If the first time anyone sees it is inside the impl PR, they are late. Do not merge expect-writing and implementation in one turn.

## v1 surface

Three skills, plugin name `radius`. The spoken name is Radius Principle. The plugin id stays `radius` so that name remains the brand namespace. Do not add a fourth skill. Do not drop impl. Do not add a mega-skill that does all three.

| Slash command | Directory | Job |
| --- | --- | --- |
| `/radius:expect` | `skills/expect/` | Draft `expect.yml` from a requirement or conversation. |
| `/radius:impl` | `skills/impl/` | Implement to match that expect. |
| `/radius:drift` | `skills/drift/` | Measure file/size/symbol drift. Not a general code review. |

Do not name the drift skill `/radius:review` — people will treat it as a PR review.

`blast.yml` is the old filename. Still read it. New writes use `expect.yml`.

## expect.yml (v1)

Canonical shape: top-level `desc`, `files` map of repo-relative paths, per-file `desc`, optional quoted `"-"` / `"+"`, optional `symbols` (`create` | `update` | `delete`, not exhaustive). Example: `examples/acquire-lock.expect.yml`.

Legacy shape (path keys at the root, `change` instead of `desc`): still read; rewrite to canonical when asked to create or update.

Split if the file list does not fit in one head (~8 production files, two intents, or wide fan-out). Sizes are estimates, not a pass/fail. Drift bands: about 2× and ≥20 lines off is a finding; a few lines is not.

## Launch order (do not invert)

1. **Skills as v1** — this repo *is* the package. Rename the artifact before publishing; do not ship `blast.yml` as v1.
2. **Small manifesto website** — ship with the skills, not after. One page: problem, non-prose prior, `expect.yml`, three commands, install.
3. **Tools later** — overlap detection, CI, symbol checks. The checker in `skills/drift/scripts/check-expect.mjs` is enough for v1. Do not invest in more machinery until the format stops moving.

No separate skills registry. `npm run publish` validates and copies to `~/.cursor/plugins/local/radius` (Cursor will not follow a symlink out of that folder). `npm run publish:push` pushes origin. Install for others: `npx skills add <owner>/<repo>`.

## Repo habits

- After editing a skill: `npm test` and `npm run install-local`, then tell the user to reload the Cursor window.
- Keep skills concise. Cross-link the other two slash commands. `disable-model-invocation: true`.
- `starting-notes.txt` is historical scratch; this file and the skills win if they disagree.
- Public manifesto is `site/` (`npm run site` → http://127.0.0.1:4173). Keep it one page. Logo is `site/logo.svg`.
