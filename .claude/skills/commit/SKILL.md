---
name: commit
description: Create smart, atomic commits for pseudonym following the repo's conventions (Conventional Commits, English messages, grouped by logical change). Use whenever the user asks to commit, or when finishing a piece of work that should be committed.
---

# Smart commits for pseudonym

Only commit when the user asked for it. Never push from this skill unless the user also asked to push.

## 1. Understand what changed

Run `git status --short` and `git diff --stat`, then read the diffs. Other sessions or the user may have changed files too: commit only what belongs to the work at hand, and mention anything unrelated instead of sweeping it in. Never commit `dist/`, `node_modules/`, secrets (`.env`, tokens), a key or a directory file, nor test fixtures holding a real name, email or institutional id.

## 2. Verify

Run the `update-docs` skill first when the change touches `src/` or the package scripts: the documentation must describe it before it's committed. Then run the `verify` skill. Do not commit a tree that fails typecheck, lint or tests, nor a visible change without its documentation.

## 3. Group into atomic commits

One logical change per commit, ordered so each commit builds on the previous ones (nothing imports something introduced by a later commit). Typical groups: a feature or fix together with its tests and documentation, a refactor/move on its own, `.minispec/` changes that aren't part of a feature on their own, dependency/tooling changes on their own.

- Stage by path (`git add <paths>`), never `git add -A` blindly; check `git status --short` after staging.
- When one file mixes two concerns, split the hunks: `printf 'y\nn\n' | git add -p <file>` (answers per hunk), then check with `git diff --cached`.
- Use `git mv` for moves so history follows the rename, and keep pure renames free of content changes.

## 4. Write the message

Format: `type(scope): description` or `type: description`, lowercase type, no trailing period. Types: `feat`, `fix`, `refactor`, `docs`, `chore`, `build`, `test`. Scopes, when one fits: `aliases`, `directory`, `home`, `cli`, `api`, `minispec`, `deps`, `release`.

- **Language: English** for the subject and body (ADR-004).
- Breaking API change: add `!` after the type/scope (`feat(api)!: ...`) and say in the body what breaks and what to use instead. A change that makes existing aliases or an existing directory unreadable is breaking even if no signature changed.
- The body explains *why* (the problem, the constraint, the decision), not a line-by-line list of what changed. Wrap at ~80 columns.
- The commit that completes a MiniSpec feature or fix (the one that deletes its note) says `Closes #N` for its issue, when it has one.
- End the message with the attribution trailer that the session's instructions require for commits (do not invent your own).
- Pass the message through a HEREDOC to keep formatting.

## 5. Finish

Run `git status --short` (must be clean unless you deliberately left unrelated changes) and `git log --oneline -n <commits made>`. Report the commits created. Never use `--no-verify`, `--amend` on pushed commits, or force-push.
