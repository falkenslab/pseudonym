# Key and aliases

## Goal

The shared key and `aliasFor()`: the same person always gets the same alias from the same key (ADR-002, ADR-003).

## Context

- Nothing exists yet but the CLI's usage and `PseudonymError`.
- Callers pass a service and the identifiers they have; the library picks the best.

## Changes

- `home.ts`: the folder (`%APPDATA%\pseudonym\`, `~/.config/pseudonym/`, `PSEUDONYM_HOME`), created with user-only permissions; `key` (32 random bytes) created on first use with the `used` marker; missing key with the marker: `PseudonymError` naming `key import`. Subkeys with HKDF-SHA256 (`info` "pseudonym/aliases", "pseudonym/directory").
- `aliases.ts`: identifiers `{ institutionalId?, email?, serviceUserId? }` normalized (trimmed, lower case for emails); the best one with its kind enters HMAC-SHA256 with the aliases subkey, plus the service unless linking is on; `A-` and 6 characters of Crockford's base32 (`0-9A-Z` without `I`, `L`, `O`, `U`), upper case.
- Linking: `PSEUDONYM_LINK=true` or `aliasFor({ link: true })` leaves the service out of the HMAC; off by default (ADR-002).
- `index.ts`: `aliasFor({ service, identifiers, link? })`, `keyFingerprint()`.
- Tests: stable across calls and processes; another key, another alias; per service unless linked; the email's case and spaces don't matter; the refusal when the key is gone after use; no key or identifier in any error message.

## Acceptance

- `aliasFor` gives the same alias in two processes with the same `PSEUDONYM_HOME`, and a different one with another.
- Deleting `key` after use makes the next call fail with a message naming `key import`; nothing is regenerated.
- The folder and the key file are readable by the user only (POSIX mode 600; on Windows, `%APPDATA%` is already per user: no ACL work).
