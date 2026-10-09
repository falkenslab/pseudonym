# ADR-003: One shared key and an encrypted directory in the user's folder

## Decision

The key (32 random bytes), the directory and a marker live in one folder per user, shared by every program that uses the library: `%APPDATA%\pseudonym\` on Windows, `~/.config/pseudonym/` elsewhere, `PSEUDONYM_HOME` to override. Readable by the user only. Two subkeys derive from the key with HKDF-SHA256: one for aliases, one for the directory. The directory is one file encrypted with AES-256-GCM, rewritten whole under a file lock; per person: alias, display name, service ids, matchers (HMACs of email and institutional id, never in clear), first and last seen. A person matched by any identifier keeps their first alias.

If the marker exists and the key doesn't, the library refuses to work and says how to restore it (`key import`), instead of creating a key that would silently change every alias.

## Motivation

One folder makes one person the same alias across programs and machines (with `key export | import`), and keeps it away from browser profiles that get deleted. Storing the display name makes `whois` work offline; storing only HMACs of contact identifiers keeps them out of the file even if the key leaks later. Rewriting a small file whole under a lock is simpler and safer than a database for a few thousand entries.

## Consequences

- Losing the key loses every way back, by design; `key export` is the backup, `key fingerprint` the check.
- `forget` and `prune` serve erasure and retention; a forgotten person who comes back gets the same alias (recomputed), only the offline lookup is lost.
- An agent with access to the user's files could read the key: the consumers' READMEs give client permissions that deny that folder and the CLI.
