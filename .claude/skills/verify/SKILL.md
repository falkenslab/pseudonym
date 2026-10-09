---
name: verify
description: Run the full quality gate for pseudonym (typecheck, lint, tests, build, the classroom example and the documentation site) and report the result. Use before committing, before a release, and after any change under src/, test/, examples/ or docs/.
---

# Verify pseudonym

Run from the repo root, in this order, stopping at the first failure and reporting it:

```
npm run typecheck
npm run lint
npm test
npm run build
(cd examples/classroom-mcp && npm install && npm run typecheck && npm test)
npm run docs:build
```

- `npm run docs:build` builds the documentation site (`docs/`, Docusaurus) and fails on a broken link or anchor; its API reference is generated from `src/`'s doc comments, so it also catches a doc comment that breaks the site. If `docs/node_modules` is missing, run `npm run docs:install` first. Run it whenever `docs/`, `examples/` or anything exported from `src/index.ts` changed; skip it (and say so) only for changes that touch none of them. After it, `grep -rE "\| - \|$" docs/content/api` must print nothing.

Notes:

- The example (`examples/classroom-mcp`) uses the library from `file:../..`, so it sees the build just made: run it after `npm run build`. Its tests must report `fail 0` too, and no tool output may carry a personal value. npm's warning about the library's `prepare` script not being in `allowScripts` is expected (npm can't approve a local dependency).

- `npm test` must report `fail 0`. Quote the pass/fail counts in your report.
- `dist/` is gitignored and `tsc` never deletes stale output. If files were moved or removed under `src/`, run `rm -rf dist` before `npm run build`, otherwise orphaned `.js`/`.d.ts` files linger and hide broken imports.
- After the build, `node dist/cli.js help` must print the usage: it proves the bin runs from the compiled output, not only through `tsx`.
- Tests must never touch the real key or directory (`%APPDATA%\pseudonym\`, `~/.config/pseudonym/`): each one sets `PSEUDONYM_HOME` to its own temporary folder. If that folder's contents changed after a test run, treat it as a failure.
- Every public export should have a doc comment: check what `src/index.ts` exports when it changed.
- Never "fix" a failure by weakening a rule, skipping a test or adding `any`. Find the cause; if the fix is out of scope, report it instead.

Report only: what ran, pass/fail per step, and the exact error for any failure.
