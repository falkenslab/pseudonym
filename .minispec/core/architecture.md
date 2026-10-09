# Architecture

## Flow

```
caller (an MCP server) --remember / resolve / redact--> index.ts -> aliases.ts (HMAC) + directory.ts (encrypted file) + redact.ts -> home.ts (key, marker, lock)
person's terminal --pseudonym <command>--> cli.ts -> the same modules
```

## Key pieces

- `home.ts` — the shared folder (`%APPDATA%\pseudonym\`, `~/.config/pseudonym/`, or `PSEUDONYM_HOME`): the key (installed by hard-linking a temporary file, so concurrent first runs agree on one), its subkeys (HKDF-SHA256, one `info` per purpose), the marker that a key existed.
- `aliases.ts` — identifiers normalized and turned into aliases (ADR-002).
- `directory.ts` — the encrypted directory (ADR-003): `directory.enc` (AES-256-GCM, header authenticated) rewritten whole under `directory.lock` through a temporary file and a rename; reads take no lock. Matching by any identifier within the service (any service when linking), first alias kept, links, forget (one, a service, all) and prune. Matchers use their own subkey.
- `text.ts` — `fold()`: lower case without accents, same length, shared by name search and redaction.
- `redact.ts` — free text: known names to aliases, then checked patterns to placeholders (ADR-005).
- `csv.ts` — RFC 4180 reading and writing for the CLI, no dependency.
- `index.ts` — the public API callers use; `errors.ts` — `PseudonymError`, shared by every module.
- `cli.ts` — the `pseudonym` bin, for the person only, covering the library without code (ADR-007); the default service (`--service`, `PSEUDONYM_SERVICE`, `default`) lives here, never in the library; `secret.ts` — the key read from stdin, hidden on a terminal (its keystroke logic is a pure function, tested without a terminal).

## Folder map

- `src/` — the library and the CLI.
- `examples/classroom-mcp/` — an MCP server using the library from `file:../..`, with its own `package.json` (the MCP SDK stays out of the library's dependencies), a demo and a smoke test run by `verify`.
- `docs/` — the documentation site (Docusaurus, its own `package.json`), published to GitHub Pages by `.github/workflows/docs.yml`; its API reference is generated from `src/index.ts`'s doc comments, and each release keeps a snapshot in `docs/versioned_docs/`.
- `test/` — tests mirroring `src/`; `test/fixtures/spanish-texts.ts`, the redaction spike's texts with their expected entities.
