---
name: minispec-implement
description: List pending MiniSpec features (.minispec/features/) and implement the chosen one following the MiniSpec reading contract. Use when the user wants to turn a feature spec into code. Accepts an optional feature slug as argument.
---

# MiniSpec: implement a feature

Turn a MiniSpec feature spec into code. MiniSpec is not a codegen pipeline: this
skill just loads the right context and implements the feature like any task.

## Steps

### 1. Pick the feature

- The files in `.minispec/features/` are the **pending / in-progress** work
  (MiniSpec's temporal knowledge). Each `*.md` is a candidate; `fix-*.md` are
  bugfix notes.
- If the user named a feature (argument or message), use that one. Match by slug
  (filename without `.md`); if ambiguous or not found, list and ask.
- If no feature was named, **list the features** with a one-line summary of each
  (read each file's `# title` and `Goal`) and **ask the user which to
  implement**. Do not guess.
- If `.minispec/features/` is empty, tell the user there's nothing pending and
  offer to create one with `/minispec-feature`.

### 2. Load context (reading contract)

Read `.minispec/README.md`, then follow its reading contract:

- Always: `core/project.md`, `core/conventions.md`, `core/principles.md`.
- The chosen `features/<slug>.md`.
- On demand only: `core/architecture.md`, `core/stack.md`, `core/glossary.md`,
  and any `decisions/ADR-*.md` the feature touches.

Do not read the whole `.minispec/` — only what the task needs.

### 3. Implement

- Write code that satisfies the feature's **Changes**, respecting
  `conventions.md` and `principles.md`.
- Stay within scope: no refactors outside the feature (a principle).
- Update the documentation in the same change (the `update-docs` skill): the README, the CLI's usage text and a doc comment on every new export.

### 4. Verify

- Check the result against the feature's **Acceptance** section, point by point.
- Report what passes and what doesn't.

### 5. Close the feature

Closing is part of implementing (the owner's standing rule): once the feature is done and verified, without asking again:

1. Promote anything **permanent** it revealed: a decision → ADR (`/minispec-adr`), a rule → `core/conventions.md`, a term → `core/glossary.md`, a module → `core/architecture.md`.
2. **Delete** `features/<slug>.md`, in the same commit as the implementation (or its last commit), whose message says `Closes #N`. Use the `commit` skill.
3. Push, so the issue closes.

If the feature is only partly done, don't delete the note or close the issue: say what's missing.

### 6. Close its issue with a summary

Every feature and bugfix note has a GitHub issue (label `feature` or `fix`), linked from the `Issue:` line under the note's title (otherwise find it by the file's path in its body, `gh issue list --search`). Once the commit is pushed:

- comment on the issue, in English, a summary of the solution and how it was implemented: what changed for the caller or the person, the design choices (and any deviation from the note, with its reason), how it was verified (tests, counts), and the commits (`gh issue comment N --body-file …`);
- make sure it's closed (`gh issue close N` if the commit didn't close it).

No issue found (or no GitHub remote yet): say so and offer to open one; never close an issue for work that isn't pushed.

## Rules

- Don't invent requirements not in the spec; if the spec is thin, ask before
  coding.
- This skill chooses and implements; it does not rewrite the spec.
- Asked to implement several notes, do them one at a time in dependency order, each closed (note deleted, issue closed with its summary) before starting the next.
