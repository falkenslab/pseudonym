# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## MiniSpec (read first)

Before writing any code, read `.minispec/README.md` and follow its reading contract. As a minimum, always read `.minispec/core/project.md`, `.minispec/core/conventions.md` and `.minispec/core/principles.md`; read the rest of `.minispec/` only on demand (architecture, stack, glossary, the relevant feature or ADR). Keep features small and don't write redundant documentation.

Pending work lives in `.minispec/features/`; the `minispec-implement` skill picks one and implements it, and `minispec-feature`, `minispec-adr` and `minispec-bugfix` create new documents from the templates.

Project management goes through skills in `.claude/skills/`: `commit` (runs `update-docs` and `verify` first), `release` (only when asked), `sync-issues`.

## Commands

- `npm run typecheck` — `tsc --noEmit` over `src/` and `test/`.
- `npm run lint` — ESLint with typescript-eslint.
- `npm test` — every `test/**/*.test.ts` with `node:test` through `tsx`, against the source (no build needed).
- `npx tsx --test test/cli.test.ts` — a single test file.
- `npx tsx --test --test-name-pattern="usage" test/cli.test.ts` — a single test by name.
- `npm run build` — `dist/` with declarations, from `tsconfig.build.json`; the CLI is `dist/cli.js`.
- `npx tsx src/cli.ts <command>` — run the CLI from source.

Run tests from the repository root: the CLI tests spawn `src/cli.ts` by a relative path.

## Things easy to get wrong

- Everything is in English (code, docs, CLI messages, commits), even when the conversation is in another language (ADR-004).
- Tests set `PSEUDONYM_HOME` to their own temporary folder; never let a test or a manual run touch the real `%APPDATA%\pseudonym\` key or directory.
- The CLI is for the person in charge only, never something an agent should run; it keeps results on stdout and errors (`PseudonymError`) on stderr.
- No runtime dependencies, and cryptography only from `node:crypto`.
