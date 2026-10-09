# Stack

- Node.js ≥ 20, ESM, TypeScript (~6.0, as typescript-eslint supports it), strict.
- Cryptography: `node:crypto` (HMAC-SHA256, HKDF-SHA256, AES-256-GCM, `randomBytes`); no runtime dependencies.
- Build: `tsc` to `dist/` with declarations (`tsconfig.build.json`); the CLI is `dist/cli.js`.
- Tests: `node:test` + `node:assert/strict`, run with `tsx --test` against the source.
- Lint: ESLint with typescript-eslint.
