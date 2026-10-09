# Directory

## Goal

The local encrypted directory of people met, so aliases survive identifier changes and resolve offline (ADR-003).

## Context

- Needs `key-and-aliases.md`.
- `aliasFor()` alone recomputes; it can't keep a first alias, merge two, or say who an alias is.
- What the first consumer will call (moodle-mcp's `pseudonymous-mode` card): `remember()` with every other person a tool returns, in one call per response, with `service` `moodle@<site host>`, identifiers Moodle's "ID number" field when set, the email, and the Moodle user id as `serviceUserId`, and the full name as `displayName`; `resolve(alias, { service })` when a write tool gets `user: "A-…"` and needs the Moodle user id back; `redact()` for submissions and posts. It bundles the library with esbuild from `file:../pseudonym`, so `dist/` must build from `npm install` (`prepare`) with no runtime dependencies.

## Changes

- `directory.ts`: one file, `directory.enc`, AES-256-GCM with the directory subkey (fresh 12-byte nonce per write, a format version in the header), read and rewritten whole under a lock file (stale locks broken after a timeout). A write goes to a temporary file in the same folder and is renamed over the old one (retried on `EPERM`/`EBUSY`, which Windows gives while an antivirus holds the file), so a crash never leaves a broken directory.
- Entries: alias, display name, service ids (`{ service, id }`), matchers (HMACs with the directory subkey of the email and the institutional id, each with its kind), first and last seen.
- `remember(person | person[])`, person `{ service, identifiers, displayName, link? }` (what callers use): one lock and one write for the whole list, aliases returned in the same order.
  - Without linking, a person only matches entries that already have that service, by service id or matcher: the same email in another service is another alias (ADR-002). With linking, any entry matches, the oldest first.
  - A match returns the entry's alias, updating name, service ids and last seen; else a new entry gets `aliasFor()`'s alias, lengthened by one character on a collision.
  - When the identifiers match different entries, the strongest identifier wins (institutional id, then email, then service user id, as in ADR-002), the entries are never merged, and `process.emitWarning` names both aliases, never the identifiers.
- `resolve(alias, { service })` for callers that take an alias back (a write tool): follows links, and gives the entry's service id for that service, or a `PseudonymError`.
- `whois`, `aliasOf(name)` (case and accent insensitive, as `redact()`), `link(a, b)` (keeps `a`, `b` resolves to it), `forget(alias)`, `prune(olderThan)`.
- Tests: a changed email keeps the alias; the same email in two services gives two aliases unless linked; the institutional id wins a conflict with the email; links; forget then meet again gives the recomputed alias; 300 people in one call make one write; concurrent `remember` from two processes loses nothing; a leftover temporary file doesn't hide the real one; the file has no name, email or id in clear; a tampered file fails closed.

## Acceptance

- Remembering a person in two processes, then `whois` in a third, gives their name.
- A wrong key, or a modified file, makes reads fail with a `PseudonymError`, without touching the file.
- Remembering the same person in two services gives two aliases, and one with linking on.
