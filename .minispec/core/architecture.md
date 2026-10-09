# Architecture

## Flow

```
caller (an MCP server) --remember / resolve / redact--> index.ts -> aliases.ts (HMAC) + directory.ts (encrypted file) + redact.ts -> home.ts (key, marker, lock)
person's terminal --pseudonym <command>--> cli.ts -> the same modules
```

## Key pieces

- `home.ts` — the shared folder (`%APPDATA%\pseudonym\`, `~/.config/pseudonym/`, or `PSEUDONYM_HOME`): the key (installed by hard-linking a temporary file, so concurrent first runs agree on one), its subkeys (HKDF-SHA256, one `info` per purpose), the marker that a key existed.
- `aliases.ts` — identifiers normalized and turned into aliases (ADR-002).
- `directory.ts` — the encrypted directory: entries, matching by any identifier, first alias kept, links, forget and prune (ADR-003).
- `redact.ts` — free text: known names to aliases, then checked patterns to placeholders (ADR-005).
- `index.ts` — the public API callers use; `errors.ts` — `PseudonymError`, shared by every module.
- `cli.ts` — the `pseudonym` bin, for the person only.

## Folder map

- `src/` — the library and the CLI.
- `test/` — tests mirroring `src/`; `test/fixtures/spanish-texts.ts`, the redaction spike's texts with their expected entities.

Modules not built yet come with the notes in `features/`.
