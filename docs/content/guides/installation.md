# Installation

## Requirements

- Node.js 20 or later.
- An ES module project (`"type": "module"`, or `.mjs` / `.mts` files): the package is ESM only.

It has no runtime dependencies and ships its TypeScript types.

## In your program

```bash
npm install @falkenslab/pseudonym
```

```ts
import { remember, resolve, redact, keyFingerprint, PseudonymError } from "@falkenslab/pseudonym";
```

Everything public is exported from the package root; there are no deep imports. The [API reference](../api/index.md) lists it all.

## For the people who run your program

They need the `pseudonym` command to find out who an alias is and to back up the key:

```bash
npm install --global @falkenslab/pseudonym
pseudonym help
```

Or, without installing it, `npx @falkenslab/pseudonym <command>`. If your program depends on the library, `npx pseudonym <command>` inside your project works too. See [the CLI](../cli/overview.md).

## Nothing to configure

The first time a program calls the library, it creates the key and the folder that holds it:

- `%APPDATA%\pseudonym\` on Windows;
- `~/.config/pseudonym/` on macOS and Linux;
- or the folder in the `PSEUDONYM_HOME` environment variable, if set (tests always set it: see [Testing your integration](testing.md)).

The only other setting is `PSEUDONYM_LINK=true`, which turns [cross-service linking](concepts.md#per-service-aliases-and-linking) on for every call that doesn't say otherwise.

## Next

- [Concepts](concepts.md): services, identifiers, aliases and the directory.
- [Integrating it](integrating.md): where the calls go in your program.
