---
name: update-docs
description: Keep pseudonym's documentation in step with the code - the README, the CLI's usage text, the doc comments of the public API and .minispec/core. Use after ANY change to src/ or the package scripts, before every commit of such a change, and before a release. A change is not done until its documentation is.
---

# Keep the documentation up to date

pseudonym has no documentation site: what callers and the person in charge learn comes from the README, the CLI's own help and the doc comments of what `src/index.ts` exports (they ship in `dist/*.d.ts` and show in the caller's editor). Code that changes what a caller or the person sees, and isn't documented, is unfinished work.

## 1. Find what changed

```
git status --short
git diff --stat
git diff -- src/index.ts src/cli.ts package.json
```

For each change, ask: would a caller (an MCP server using the library) or the person running `pseudonym` notice it? Count as yes:

- a new, removed or renamed export, option, parameter or type field;
- a new or changed CLI command, flag, output or error message;
- a changed default, alias format, file location or on-disk format;
- a fix that changes what someone could rely on;
- new or changed package scripts, requirements (Node version) or install steps.

Internal refactors, tests and comments with no visible effect need no documentation change (but see doc comments below).

## 2. Update the owners

- **Doc comments** on every new or changed export from `src/index.ts`: what it's for and when to use it, not how it's built. Cryptographic choices name their construction and parameters (conventions).
- **The CLI's usage text** (`USAGE` in `src/cli.ts`): every command it implements, with its arguments; drop the "coming one by one" wording for commands that exist.
- **`README.md`** (for callers and the person in charge): what the library does, how a program uses it, the CLI commands. It stays short; touch it when the change adds something a reader would notice at that level, and keep its "Status" line true.
- **`.minispec/core/`** (for future Claude sessions): `architecture.md` when a module appears, moves or changes role (and drop "Nothing is built yet" once it isn't true); `glossary.md` for a new domain term; `project.md` when what the project does or its status changes; a new or updated ADR (`minispec-adr`) when a decision or rule changed. Respect MiniSpec's line limits and don't duplicate what the code says.

Search too: `grep -rn "<the option, command or function>" README.md .minispec src` finds every place that mentions it, so none keeps describing the old behavior.

## 3. Style

- English, technical and concrete, following the `markdown-writing` rules: one line per paragraph and list item, no horizontal rules between sections.
- Change the existing explanation rather than appending a note that contradicts it.

## 4. Commit with the code

The documentation goes in the same commit as the change it describes (or right next to it, `docs: …`, when one commit per concern reads better). When the change completes a MiniSpec feature or fix, its issue's closing comment mentions what was documented.

Report which files you changed, or why none needed to.
