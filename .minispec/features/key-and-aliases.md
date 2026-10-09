# Key and aliases

## Goal

The shared key and the alias computation: the same person always gets the same alias from the same key (ADR-002, ADR-003).

## Context

- Nothing exists yet but the CLI's usage and `PseudonymError`.
- Callers pass a service and the identifiers they have; the library picks the best.
- Callers never compute aliases themselves: they call `remember()` (`directory.md`), which keeps first aliases, lengthens on collisions and follows links. `aliasFor()` stays internal.

## Changes

- `home.ts`: the folder (`%APPDATA%\pseudonym\`, `~/.config/pseudonym/`, `PSEUDONYM_HOME`), created with user-only permissions; `key` (32 random bytes) created on first use with the `used` marker, with an exclusive create (`flag: "wx"`, mode `0o600`) so two processes starting at once end with one key (on `EEXIST`, read the one that won); missing key with the marker: `PseudonymError` naming `key import`. Subkeys with HKDF-SHA256 (`info` "pseudonym/aliases", "pseudonym/directory", "pseudonym/fingerprint").
- `aliases.ts`: identifiers `{ institutionalId?, email?, serviceUserId? }` normalized: all trimmed; emails in lower case; institutional ids in upper case without inner spaces or hyphens (`12345678-z` and `12345678 Z` are `12345678Z`), with no format check. The best one with its kind enters HMAC-SHA256 with the aliases subkey, plus the service unless linking is on; `A-` and 6 characters of Crockford's base32 (`0-9A-Z` without `I`, `L`, `O`, `U`), upper case. The normalization is part of every alias: changing it later changes everyone's.
- Linking: `PSEUDONYM_LINK=true` or `link: true` leaves the service out of the HMAC; off by default (ADR-002).
- `index.ts`: `keyFingerprint()`, the first 8 base32 characters of the fingerprint subkey.
- Tests: stable across calls and processes; another key, another alias; per service unless linked; the email's case and spaces don't matter, nor the institutional id's case, spaces and hyphens; two processes creating the key at once share it; the refusal when the key is gone after use; no key or identifier in any error message.

## Acceptance

- `aliasFor` gives the same alias in two processes with the same `PSEUDONYM_HOME`, and a different one with another.
- Deleting `key` after use makes the next call fail with a message naming `key import`; nothing is regenerated.
- The folder and the key file are readable by the user only (POSIX mode 600; on Windows, `%APPDATA%` is already per user: no ACL work).
