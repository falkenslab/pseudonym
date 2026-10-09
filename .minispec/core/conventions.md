# Conventions

- Everything in English: code, comments, `README.md`, `CLAUDE.md`, `.minispec/`, CLI messages, commit messages (ADR-004).
- Commits follow Conventional Commits, one logical change each.
- ESM TypeScript; relative imports inside `src/` use explicit `.js` extensions (NodeNext).
- The public API is what `src/index.ts` exports; everything else is internal.
- The folder for keys and the directory always comes from one function, overridable for tests (`PSEUDONYM_HOME`); tests never touch the real one.
- Errors a person can act on are `PseudonymError`s with a message saying what to do.
- The CLI writes results to stdout and errors to stderr, with a non-zero exit code on failure.
- Tests mirror `src/` under `test/`, with `node:test` through `tsx`; each test gets its own temporary folder.
- Doc comments explain *why*; cryptographic choices name their construction and parameters.
- Documentation Markdown: one line per paragraph and list item, no horizontal rules between sections.
