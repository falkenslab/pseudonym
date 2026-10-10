<h1>
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="https://raw.githubusercontent.com/falkenslab/pseudonym/main/docs/static/img/logo-dark.svg">
    <img src="https://raw.githubusercontent.com/falkenslab/pseudonym/main/docs/static/img/logo.svg" alt="" height="48" align="top">
  </picture>
  pseudonym
</h1>

[![npm](https://img.shields.io/npm/v/@falkenslab/pseudonym?logo=npm)](https://www.npmjs.com/package/@falkenslab/pseudonym)
[![types](https://img.shields.io/npm/types/@falkenslab/pseudonym)](https://www.npmjs.com/package/@falkenslab/pseudonym)
[![node](https://img.shields.io/node/v/@falkenslab/pseudonym)](https://nodejs.org/)
[![license](https://img.shields.io/npm/l/@falkenslab/pseudonym)](https://github.com/falkenslab/pseudonym/blob/main/LICENSE)
[![docs](https://img.shields.io/badge/docs-falkenslab.github.io%2Fpseudonym-db2777)](https://falkenslab.github.io/pseudonym/)

A pseudonymization library for AI tools. Your program passes each person through the library and sends `A-7K3F9Q` instead of a name, an email or an id; the person running your program resolves the alias on their own machine with `pseudonym whois A-7K3F9Q`.

**Documentation: [falkenslab.github.io/pseudonym](https://falkenslab.github.io/pseudonym/)**: guides, the CLI, security and privacy, and the API reference.

## Install

Node.js 20 or later, ESM only, with TypeScript types and no runtime dependencies.

```sh
npm install @falkenslab/pseudonym             # in your program
npm install --global @falkenslab/pseudonym    # the pseudonym command, for the people who run it
```

## Quick start

```ts
import { remember, resolve, redact } from "@falkenslab/pseudonym";

const service = "moodle@campus.example.org";

// Before a result reaches the model: people become aliases (one call for a whole list).
const aliases = await remember(users.map((user) => ({
  service,
  identifiers: { institutionalId: user.idnumber, email: user.email, serviceUserId: String(user.id) },
  displayName: user.fullname,
})));                                                   // ["A-7K3F9Q", ...]

// A write tool gets an alias back from the model.
const userId = await resolve("A-7K3F9Q", { service });  // keep it on your side

// Text people wrote: known names, emails, cards, IBANs and the ids and phones of your countries out.
const { text } = await redact(post.message, { service });
```

- The alias is an HMAC of the person's strongest identifier under a key that never leaves the machine: stable, and impossible to undo without the key.
- A local encrypted directory keeps each person's first alias and lets the person in charge resolve it offline.
- Aliases are per service by default, so a model can't join what it learns about someone in different services.

[Integrating it](https://falkenslab.github.io/pseudonym/docs/guides/integrating) walks through it step by step, and [examples/classroom-mcp](https://github.com/falkenslab/pseudonym/tree/main/examples/classroom-mcp) is a complete MCP server that uses it.

## The CLI

For the person in charge, never for an agent:

```sh
pseudonym whois A-7K3F9Q                  # who an alias is
pseudonym alias "ana perez"               # someone's aliases
pseudonym redact < post.txt               # a text safe to paste into a chat
pseudonym reveal < answer.txt             # the model's answer, with names
pseudonym remember --csv class.csv --only-aliases   # a class export, as aliases
pseudonym key export > pseudonym-key.txt  # back up the key, once
```

See [the CLI](https://falkenslab.github.io/pseudonym/docs/cli/overview) for every command.

## Before you use it

- **It's pseudonymization, not anonymization**: the data stays personal data for whoever holds the key, and what people write about themselves can still identify them. Redaction doesn't catch street addresses, birth dates, people outside the directory, or ids without a check digit.
- **Keep agents away from the key**: an agent on the same machine that can read the key folder or run `pseudonym` could undo it. Deny both in its client; the documentation gives [tested rules for Claude Code and their limits](https://falkenslab.github.io/pseudonym/docs/security/keeping-agents-away).
- **Back up the key**: losing it loses every way back, by design.

Read [what it protects against](https://falkenslab.github.io/pseudonym/docs/security/threat-model) and [the legal frame](https://falkenslab.github.io/pseudonym/docs/security/gdpr) before sending real people's data anywhere.

## Contributing

The design lives in `.minispec/` (start with `core/project.md` and `decisions/`); each planned feature has a note there and an issue here.

```sh
npm install
npm run typecheck && npm run lint && npm test
npm run build                  # dist/, with types; the CLI is dist/cli.js
npm run docs:install && npm run docs:start   # the documentation site, locally
```

## License

MIT, Falkenslab.
