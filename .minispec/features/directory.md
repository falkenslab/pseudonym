# Directory

## Goal

The local encrypted directory of people met, so aliases survive identifier changes and resolve offline (ADR-003).

## Context

- Needs `key-and-aliases.md`.
- `aliasFor()` alone recomputes; it can't keep a first alias, merge two, or say who an alias is.
- What the first consumer will call (moodle-mcp's `pseudonymous-mode` card): `remember()` for every other person a tool returns, with `service` `moodle@<site host>`, identifiers Moodle's "ID number" field when set, the email, and the Moodle user id as `serviceUserId`, and the full name as `displayName`; `resolve(alias)` when a write tool gets `user: "A-…"` and needs the Moodle user id back; `redact()` for submissions and posts. It bundles the library with esbuild from `file:../pseudonym`, so `dist/` must build from `npm install` (`prepare`) with no runtime dependencies.

## Changes

- `directory.ts`: one file, `directory.enc`, AES-256-GCM with the directory subkey (fresh 12-byte nonce per write, a format version in the header), read and rewritten whole under a lock file (stale locks broken after a timeout).
- Entries: alias, display name, service ids (`{ service, id }`), matchers (HMACs of email and institutional id), first and last seen.
- `remember({ service, identifiers, displayName })` (what callers use): matches an entry by any matcher or service id and returns its alias, updating name and last seen; else stores a new entry with `aliasFor()`'s alias, lengthened by one character on a collision.
- `resolve(alias)` for callers that take an alias back (a write tool): the entry's service id for that service, or a `PseudonymError`.
- `whois`, `aliasOf(name)`, `link(a, b)` (keeps `a`, `b` resolves to it), `forget(alias)`, `prune(olderThan)`.
- Tests: a changed email keeps the alias; links; forget then meet again gives the recomputed alias; concurrent `remember` from two processes loses nothing; the file has no name, email or id in clear; a tampered file fails closed.

## Acceptance

- Remembering a person in two processes, then `whois` in a third, gives their name.
- A wrong key, or a modified file, makes reads fail with a `PseudonymError`, without touching the file.
