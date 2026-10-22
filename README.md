<div align="center">

<picture>
  <source media="(prefers-color-scheme: dark)" srcset="https://raw.githubusercontent.com/falkenslab/pseudonym/main/docs/static/img/logo-dark.svg">
  <img src="https://raw.githubusercontent.com/falkenslab/pseudonym/main/docs/static/img/logo.svg" alt="pseudonym logo: a question mark between brackets, a person no one can name" width="112"/>
</picture>

# pseudonym

**Let your AI tools talk about people without ever naming them.**<br/>
Each person becomes a stable alias like `A-7K3F9Q`, and only you can turn it back into a name, on your own machine.

[![npm](https://img.shields.io/npm/v/@falkenslab/pseudonym?color=cb3837&logo=npm)](https://www.npmjs.com/package/@falkenslab/pseudonym)
![Node.js 20+](https://img.shields.io/badge/node-20%2B-339933?logo=node.js&logoColor=white)
![TypeScript types](https://img.shields.io/badge/types-TypeScript-3178c6?logo=typescript&logoColor=white)
![No runtime dependencies](https://img.shields.io/badge/dependencies-0-0b0b0b)
[![License: MIT](https://img.shields.io/badge/license-MIT-16a34a)](https://github.com/falkenslab/pseudonym/blob/main/LICENSE)

**[📖 Documentation](https://falkenslab.github.io/pseudonym/)** · [📖 Documentación en español](https://falkenslab.github.io/pseudonym/es/)

</div>

pseudonym is a pseudonymization library for programs that send data about people to a language model, such as an [MCP](https://modelcontextprotocol.io) server reading a course's submissions. Your program passes each person through it and sends `A-7K3F9Q` instead of "Ana Pérez"; free text loses its known names, emails, cards, IBANs and national ids on the way. The alias is an HMAC under a key that never leaves the machine, and a local encrypted directory lets the person in charge ask `pseudonym whois A-7K3F9Q` whenever they need to.

## ✨ Why pseudonym

- 🕶️ **The model never learns who is who.** It can still tell people apart, refer to them and ask your program to act on them, by alias.
- 🔑 **Only you can undo it.** Aliases come from a key on your machine; `pseudonym whois` answers offline, and nobody without the key can reverse them.
- 🧷 **Stable aliases.** The same person always gets the same alias, even after changing their email.
- 🧱 **One alias per service.** A student is one alias in the LMS and another in the mail, so a model can't join what it learns about them.
- ✍️ **Free text too.** Names from the directory, emails, payment cards, IBANs and the checked national ids and phones of nine countries become aliases and placeholders.
- 🧩 **A library, not a server.** It runs inside your program, with no runtime dependencies and no tool an agent could call to undo it.
- 🧭 **Honest about its limits.** It's pseudonymization, not anonymization: the docs say what it doesn't catch and how to keep an agent away from the key.

## 🚀 Quick start

You need [Node.js](https://nodejs.org) 20 or later and an ES module project.

```sh
npm install @falkenslab/pseudonym             # in your program
npm install --global @falkenslab/pseudonym    # the pseudonym command, for the people who run it
```

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
```

The key is created on first use, in `%APPDATA%\pseudonym\` or `~/.config/pseudonym/`. Back it up once with `pseudonym key export`.

## 🧪 A taste of the code

🔌 **In an MCP server**, everyone in a tool's result goes through `remember()`, and the model reads:

```json
[{ "student": "A-9NQWD5", "grades": { "practice1": 8.5 } }, { "student": "A-TA8D1J", "grades": { "practice1": 6 } }]
```

✍️ **Free text** keeps its meaning and loses who wrote it:

```ts
await redact("Soy Marta Quiroga, mi móvil es 612 345 678 y mi SSN 123-45-6789.", { service, countries: ["ES", "US"] });
// "Soy A-9NQWD5, mi móvil es [PHONE_1] y mi SSN [US_SSN_1]."
```

👩‍🏫 **In the person's terminal**, without writing code:

```sh
pseudonym whois A-9NQWD5                                    # who an alias is
pseudonym redact < post.txt                                 # a text safe to paste into a chat
pseudonym reveal < answer.txt                               # the model's answer, with the names back
pseudonym remember --csv class.csv --only-aliases           # a class export, as aliases
```

A complete MCP server that does all of this over a made-up course is in [examples/classroom-mcp](https://github.com/falkenslab/pseudonym/tree/main/examples/classroom-mcp).

## 🧰 What's inside

| Area | For example |
| --- | --- |
| 🧷 Aliases | `remember()` for one person or a list, per service or linked across services, first alias kept |
| 🔙 The way back | `resolve()` for write tools, `pseudonym whois`, `reveal` and `resolve` for the person |
| ✍️ Redaction | `redact()` with names from the directory, cards, IBANs and ids of ES, US, CA, DE, MX, CL, AR, BR and PT |
| 🗂️ The directory | AES-256-GCM, safe across processes, `link`, `forget` (one, a service, everyone), `prune` |
| 🔑 The key | Created on first use, `key export`, `key import`, `key fingerprint`, refuses to work if it goes missing |
| 💻 The CLI | Everything above without code, CSV in and out, `--json` for scripts |

The [API reference](https://falkenslab.github.io/pseudonym/docs/api) and the [command reference](https://falkenslab.github.io/pseudonym/docs/cli/reference) list it all.

## 📚 Documentation

- **[Integrating it](https://falkenslab.github.io/pseudonym/docs/guides/integrating)**: where the calls go in your program, step by step.
- **[Redacting free text](https://falkenslab.github.io/pseudonym/docs/guides/redaction)**: what's replaced in each country, and what isn't.
- **[The CLI](https://falkenslab.github.io/pseudonym/docs/cli/overview)**: resolving aliases, redacting by hand, the key and the directory.
- **[What it protects against](https://falkenslab.github.io/pseudonym/docs/security/threat-model)**: the threat model and the [GDPR frame](https://falkenslab.github.io/pseudonym/docs/security/gdpr).
- **[Keeping agents away from the key](https://falkenslab.github.io/pseudonym/docs/security/keeping-agents-away)**: tested Claude Code rules, and what they can't stop.
- **[How it works inside](https://falkenslab.github.io/pseudonym/docs/security/how-it-works)**: HMAC, HKDF, AES-GCM and the directory's file.

## 🛠️ Developing

`npm install`, then `npm run typecheck && npm run lint && npm test`; `npm run docs:start` previews the documentation site. The design decisions are in [.minispec/](https://github.com/falkenslab/pseudonym/tree/main/.minispec), and each planned change has a note there and an issue here.

<div align="center">

Made with 💖 by Falken's Lab Team

</div>
