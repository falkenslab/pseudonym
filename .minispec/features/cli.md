# CLI

## Goal

The `pseudonym` command for the person in charge: resolve aliases, curate the directory, move the key.

## Context

- Needs `directory.md`; today it prints its usage only.
- Never something an agent may run: the README says how to deny it in the client.

## Changes

- `whois <alias>`, `alias "<name>"` (every match, with its services), `link`, `forget`, `prune --older-than <n>(d|m|y)`.
- `key fingerprint` (`keyFingerprint()`); `key export` (the key as base64, on stdout only when asked, with a warning on stderr); `key import` reads the base64 key from stdin (hidden prompt on a terminal, or piped), never as an argument, which would leave it in the shell's history and the process list. It refuses to replace a different existing key without `--force`; with `--force` it moves `directory.enc` aside to `directory.enc.<date>.bak`, which only the old key opens, and says where.
- `aliases --service <s>` writes that service's people as CSV (alias, name) to stdout, with a warning on stderr that it holds names in clear: the person redirects it if they want a file, the library never writes it to disk.
- Exit codes: 0 found or done, 1 error, 2 not found.
- README: what the library is, installation, the CLI, the backup of the key, the client permissions that keep an agent away from the folder and the command.

## Acceptance

- After a caller remembers someone, `pseudonym whois <alias>` prints their name; an unknown alias exits 2.
- `key export` on one folder and `key import` on an empty one give the same fingerprint and the same aliases.
- With the marker and no key, `key import` of the exported key makes the directory readable again.
- `key import --force` with another key leaves the old directory as a `.bak` file, untouched.
- No command prints the key except `key export`, and no command takes it as an argument.
