# Architecture

## Flow

```
caller (an MCP server) --remember / resolve / redact--> index.ts -> aliases.ts (HMAC) + directory.ts (encrypted file) + redact.ts -> home.ts (key, marker, lock)
person's terminal --pseudonym <command>--> cli.ts -> the same modules
```

## Key pieces

- `home.ts` — the shared folder (`%APPDATA%\pseudonym\`, `~/.config/pseudonym/`, or `PSEUDONYM_HOME`): the key, its subkeys (HKDF), the marker that a key existed, the file lock.
- `aliases.ts` — identifiers normalized and turned into aliases (ADR-002).
- `directory.ts` — the encrypted directory: entries, matching by any identifier, first alias kept, links, forget and prune (ADR-003).
- `redact.ts` — free text: known names to aliases, then checked patterns to placeholders (ADR-005).
- `index.ts` — the public API callers use.
- `cli.ts` — the `pseudonym` bin, for the person only.

## Folder map

- `src/` — the library and the CLI.
- `test/` — tests mirroring `src/`; `test/fixtures/spanish-texts.ts`, the redaction spike's texts with their expected entities.

Nothing is built yet: the modules come with the features in `features/`.
