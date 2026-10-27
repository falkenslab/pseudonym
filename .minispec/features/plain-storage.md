# Plain JSON directory storage

Issue: [#13](https://github.com/falkenslab/pseudonym/issues/13)

## Goal

An optional `plain` storage mode keeps the directory as readable JSON with no key at all, for setups where the operating system's permissions and isolation protect it; `encrypted` stays the default.

## Context

- Today the key is used three ways (ADR-002, ADR-003): the `directory` subkey encrypts `directory.enc`, the `aliases` subkey computes aliases (HMAC), the `matchers` subkey hashes emails and institutional ids. `keys()` in `src/directory.ts` loads the key, creating `key` and `used`, for every operation.
- Lock, atomic write, matching, links, forget, prune, `resolve`, `reveal` and `redact` don't depend on encryption.
- Decided with the owner (27 October 2026): random persistent aliases and identifiers in clear in plain mode; `PSEUDONYM_STORAGE` plus `configure()`; migration in this note.

## Changes

- `src/directory.ts`: one internal store chosen per operation, with two implementations of the same four things: the file (`directory.enc` / `directory.json`), reading and writing its bytes (AES-256-GCM / JSON), a matcher for an identifier (HMAC / `kind:value` in clear), and a new alias (HMAC, lengthened on collision / random Crockford base32, drawn again on collision). Everything else stays one implementation. Plain mode never calls `loadKey()`.
- Mode: `configure({ storage })` exported from `index.ts`, else `PSEUDONYM_STORAGE` (`encrypted` | `plain`), else `encrypted`. An unknown value, or a folder holding the other mode's directory (or both), is a `PseudonymError` that says what to do; never a silent switch.
- JSON format, versioned: `{ "format": "pseudonym-directory", "version": 1, "entries": [...] }`, entries as today (alias, display name, service ids, matchers, links, first and last seen), pretty-printed, written `0600` through the same temporary file, rename and lock.
- `keyFingerprint()` and `pseudonym key …` in plain mode: a `PseudonymError` (there is no key).
- `pseudonym migrate --to plain|encrypted [--yes]`: writes the other format from the current one, then moves the source aside to `<file>.<date>.bak`; refuses if the target exists; asks to confirm (`--yes` without a terminal); says how many people lose email or institutional-id matching going to plain (HMACs can't be reversed) and to set `PSEUDONYM_STORAGE`. Aliases are kept both ways.
- ADR-010 records the mode; `principles.md`: names and identifiers in clear on disk only in plain mode, chosen explicitly.
- Tests: a plain directory is created with no `key` or `used`; remember, resolve, redact and reveal; aliases stable across processes and calls; concurrent writes from two processes; the file is JSON with `0600` on POSIX; mode mismatches and unknown values fail without touching anything; `keyFingerprint` refuses; migration both ways keeps aliases, backs up the source, refuses an existing target and needs `--yes`; the encrypted mode's tests unchanged.
- Docs (English and Spanish): a "Storage: encrypted or plain" guide (configuration, the JSON format, what it costs in security, migration), and the concepts, how-it-works, threat model, CLI reference and README where they mention the key or the directory.

## Acceptance

- With `PSEUDONYM_STORAGE=plain`, `remember`, `resolve`, `redact`, `reveal` and every CLI command except `key` work, and the folder holds only `directory.json` (and the lock while writing).
- An existing encrypted installation behaves exactly as before.
- `pseudonym migrate` turns one format into the other with the same aliases and leaves the original as a `.bak`.
