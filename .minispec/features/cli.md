# CLI

## Goal

The `pseudonym` command for the person in charge: resolve aliases, curate the directory, move the key.

## Context

- Needs `directory.md`; today it prints its usage only.
- Never something an agent may run: the README says how to deny it in the client.

## Changes

- `whois <alias>`, `alias "<name>"` (every match, with its services), `link`, `forget`, `prune --older-than <n>(d|m|y)`.
- `key fingerprint` (8 characters of a hash of the key); `key export` (the key as base64, on stdout only when asked, with a warning on stderr); `key import <base64>` (refuses to replace a different existing key without `--force`, and says the directory then needs the old key).
- `aliases --service <s>` exports that service's people as CSV (alias, name) to a file given with `--out`, never to stdout by default.
- Exit codes: 0 found or done, 1 error, 2 not found.
- README: what the library is, installation, the CLI, the backup of the key, the client permissions that keep an agent away from the folder and the command.

## Acceptance

- After a caller remembers someone, `pseudonym whois <alias>` prints their name; an unknown alias exits 2.
- `key export` on one folder and `key import` on an empty one give the same fingerprint and the same aliases.
- No command prints the key except `key export`.
