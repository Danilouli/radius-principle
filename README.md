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

This repository *is* the package. There is no separate registry upload.

```bash
npm test
npm run publish          # validate + install locally
npm run publish:push     # same, then git push origin
```

`npm run publish` with no `origin` remote prints the `gh repo create` command. After the repo is public:

```bash
npx skills add <owner>/<repo>
```

That installs the three skills for agents that use the skills CLI (Cursor, Claude Code, Codex, and others). In Cursor, the plugin install above is what gives you the `/radius:` prefix.

## Check drift from a shell

```bash
npm run check-expect -- --expect path/to/expect.yml
npm run check-expect -- --expect path/to/expect.yml --base origin/main --json
```

The checker scores files and `-/+` sizes. `/radius:drift` still reads diffs for intent and listed symbols.

## Layout

```
plugin.json                 Agent Plugins manifest (name: radius)
.cursor-plugin/plugin.json  Cursor plugin manifest
skills/expect/              /radius:expect
skills/impl/                /radius:impl
skills/drift/               /radius:drift + scripts/check-expect.mjs
examples/                   canonical expect.yml
site/                       manifesto website
scripts/                    install-local + publish
```
