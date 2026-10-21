# Radius Principle

Radius Principle is one idea for **reviewable, predictable agentic changes**. You formalize the expected change *before* an agent writes code, in a non-prose file: `expect.yml`.

Formalizing first gives you:

- **Human comprehension** — see the whole slice before it exists. If it is already too big, split it.
- **Easier review** — a script can show how far the implementation drifted from the expect, so a reviewer focuses on the gaps.
- **Agent guidance** — implement against the expect, not a restated prompt.
- **Conflict anticipation** — two expects that share a file should run sequentially.

## Skills

| Slash command | What it does |
| --- | --- |
| `/radius:expect` | Draft an `expect.yml` from a requirement or conversation. |
| `/radius:impl` | Implement the change to match that expect. |
| `/radius:drift` | Measure how far a branch or PR drifted from the expect. |

This repo is the plugin. The plugin name is `radius`, so Cursor namespaces the skills as `/radius:…`.

Read `expect.yml` yourself before `/radius:impl`. If the first time you see it is inside the implementation PR, you are late.

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

After a human reviews the expect, implement with `/radius:impl`: prefer the listed files and stay close to the line estimates.

A fuller example lives in `examples/acquire-lock.expect.yml`. Legacy files named `blast.yml` still read.

## Install on this machine (Cursor)

Cursor will not load a symlink that points at this repo. Copy the plugin in:

```bash
npm run install-local
```

Then **Developer: Reload Window**. The skills appear as `/radius:expect`, `/radius:impl`, and `/radius:drift`.

Re-run `install-local` after you edit a skill.

## Website

```bash
npm run site
```

The manifesto is a static page in `site/` at http://127.0.0.1:4173.

## Publish

This repository *is* the package. There is no separate skills registry upload. Merging to `main` runs `.github/workflows/deploy.yml`.

```bash
npm test
npm run deploy:skills    # validate, then list skills from GitHub for skills.sh
npm run deploy:site      # Cloudflare Pages (site/)
npm run publish          # validate + install the Cursor plugin locally
npm run publish:push     # same, then git push origin
```

`npm run deploy:site` reads `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID` from the environment, or from `site/.env` (see `site/.env.example`). GitHub Actions uses repository secrets of the same names.

After the default branch is on GitHub:

```bash
npx skills add danilouli/radius-principle
```

That installs the three skills for agents that use the skills CLI (Cursor, Claude Code, Codex, and others). In Cursor, the plugin install above is what gives you the `/radius:` prefix.

## Check drift from a shell

```bash
npm run check-expect -- --expect path/to/expect.yml
npm run check-expect -- --expect path/to/expect.yml --base origin/main --json
```

The checker scores files, `-/+` sizes, and listed symbols (including CSS variables and classes). `/radius:drift` still reads diffs for intent.

```bash
npm run validate-expect -- --expect path/to/expect.yml
```

That check fails when a listed existing path is missing, or an `update` symbol is not in the file.

## Layout

```
plugin.json                 Agent Plugins manifest (name: radius)
.cursor-plugin/plugin.json  Cursor plugin manifest
skills/expect/              /radius:expect + scripts/validate-expect.mjs
skills/impl/                /radius:impl
skills/drift/               /radius:drift + scripts/check-expect.mjs
examples/                   canonical expect.yml
site/                       manifesto website
scripts/                    install-local, publish, deploy
.github/workflows/          deploy on merge to main
```
