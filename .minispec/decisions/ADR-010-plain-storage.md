# ADR-010: An optional plain storage, without a key

## Decision

The directory can be kept in two modes. `encrypted` (the default) is ADR-003's: `directory.enc` under AES-256-GCM, aliases and matchers as HMACs under the key (ADR-002). `plain` keeps `directory.json`, readable and versioned, with no key at all: aliases are random and stored, emails and institutional ids are stored in clear to recognize people. The mode comes from `configure({ storage })`, else `PSEUDONYM_STORAGE`, else `encrypted`. A folder holding the other mode's directory is an error; nothing switches or converts by itself. `pseudonym migrate --to plain|encrypted` converts explicitly, keeping aliases and moving the original aside.

## Motivation

Decided with the owner (27 October 2026). Some setups protect the folder with the operating system (permissions, an isolated account or container) and want neither a key to back up nor a file only the library can read. Pseudonymization and encryption are separate concerns: what the model sees is the same in both modes.

In plain mode, an alias derived from the identifier without a key (an unkeyed hash) was rejected: anyone with a list of emails could compute the aliases and undo them. Unkeyed hashes of identifiers as matchers were rejected for the same reason: protection in appearance only. A shared config file in the folder was rejected for an environment variable and a function, like `PSEUDONYM_HOME`.

## Consequences

- One implementation of the directory: an internal store per mode supplies only the file, its encoding, the matcher and new aliases; locking, atomic writes and every operation are shared.
- In plain mode, names and identifiers are on disk unencrypted, protected only by the folder's `0700` / `0600` permissions; the documentation says so wherever the mode is offered. `principles.md` allows clear data only in this mode, chosen explicitly.
- Plain aliases are stable while the person is in the directory; forgotten or pruned and met again, they get a new alias (the encrypted mode recomputes the same one).
- `keyFingerprint()` and `pseudonym key` don't apply in plain mode and say so.
- Migrating to plain can't carry emails and institutional ids (their HMACs don't reverse): people are still recognized by their service ids, and the command says how many can't be.
