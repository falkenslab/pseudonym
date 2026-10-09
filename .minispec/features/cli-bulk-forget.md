# CLI: forget a whole service, or everyone

Issue: [#11](https://github.com/falkenslab/pseudonym/issues/11)

## Goal

`pseudonym forget --service <service>` and `pseudonym forget --all` remove many people from the directory at once, after a confirmation.

## Context

- Today `forget <alias>` removes one person and `prune --older-than` removes by age; closing a course or wiping the directory means forgetting people one by one, or deleting the file by hand.
- Needs `cli-redact-reveal.md` (`pseudonym services`, to see what there is to forget).

## Changes

- `forget --service <service>`: people met only in that service are removed; people also met in others keep their entry, without that service's id. Prints how many were removed and how many kept.
- `forget --all`: empties the directory. The key stays, so a person met again gets the same alias back; to start over with new aliases, the documented way is still deleting the whole folder.
- Confirmation, since neither can be undone: on a terminal, the person types the service's name (or `all`); without a terminal, `--yes` is required, otherwise exit 1 without changing anything.
- In the library: `forgetService(service)` and `forgetAll()` in `src/directory.ts`, internal like `forget`.
- Tests: forget a service with people in one and in two services; forget all keeps the key and gives the same alias when met again; without `--yes` and without a terminal nothing changes.
- Docs: `cli/tidying-the-directory.md` (closing a course, wiping the directory), `cli/reference.md`, `security/gdpr.md` (erasure: what the directory forgets and what it can't).

## Acceptance

- After `forget --service S --yes`, `pseudonym services` no longer lists S, and people of other services are untouched.
- After `forget --all --yes`, the directory is empty and `key fingerprint` is unchanged.
- Without `--yes` and without a terminal, both exit 1 and change nothing.
