# pseudonym

Stable aliases for people, for programs that send data about them to a language model. Your program passes each person through the library and sends `A-7K3F9Q` instead of a name, an email or an id; the person running your program resolves the alias on their own machine with `pseudonym whois A-7K3F9Q`.

> **Status: early development.** Nothing is published to npm yet and the API below is the design being implemented, not a released one: [#1](https://github.com/falkenslab/pseudonym/issues/1) key and aliases, [#2](https://github.com/falkenslab/pseudonym/issues/2) directory, [#3](https://github.com/falkenslab/pseudonym/issues/3) redaction, [#4](https://github.com/falkenslab/pseudonym/issues/4) CLI. Names and signatures may still change in `0.x`.

## When to use it

You write an MCP server, an agent tool or any program that puts data about people (students, colleagues, customers) in front of a model, and:

- your code knows which fields are people (a user id, a name, an email in a JSON response);
- the model doesn't need to know who they are, only to tell them apart and refer to them;
- the person using your program does need to know who they are.

It runs inside your program: there is no server to deploy and nothing an agent can call.

## Install

Requires Node.js 20 or later. ESM only, with TypeScript types, and no runtime dependencies.

```sh
npm install @falkenslab/pseudonym        # once published
npm install github:falkenslab/pseudonym  # until then (builds on install)
```

## Quick start

```ts
import { remember, resolve, redact } from "@falkenslab/pseudonym";

const service = "moodle@campus.example.org";

// Replace every person in a result before it reaches the model.
const alias = await remember({
  service,
  identifiers: { institutionalId: user.idnumber, email: user.email, serviceUserId: String(user.id) },
  displayName: user.fullname,
});
return { user: alias, grade: 7.5 }; // { user: "A-7K3F9Q", grade: 7.5 }

// A write tool gets an alias back from the model: turn it into your own id.
const userId = await resolve("A-7K3F9Q", { service });

// Free text written by people: known names, emails, phones, ids and IBANs out.
const { text } = await redact(post.message, { service });
```

## Concepts

- **Service.** A string naming where you met the person, such as `moodle@<site host>` or `mail@<domain>`. You choose it; keep it stable, since it's part of every alias.
- **Identifiers.** `{ institutionalId?, email?, serviceUserId? }`: pass every one you have. The strongest present (institutional id, then email, then your service's user id) makes the alias; all of them let the directory recognize the person later. They are normalized (emails in lower case, institutional ids in upper case without spaces or hyphens) and never stored in clear.
- **Alias.** `A-` plus 6 characters of Crockford's base32 (no `I`, `L`, `O` or `U`), occasionally 7 to avoid a collision. Always treat it as an opaque string.
- **Directory.** A local encrypted file of the people your program has met, shared by every program on the machine that uses the library. It keeps a person's first alias when an identifier changes (a new email) and lets the person look aliases up offline.
- **Per-service aliases.** By default the same person gets a different alias in each service, so a model can't join what it learns about them in Moodle with what it learns in the mail. Pass `link: true` to `remember()` (or set `PSEUDONYM_LINK=true`) only if your program genuinely needs one alias across services.

## API

All functions are exported from the package root; they never print anything (safe inside an MCP server, whose stdout is the protocol).

### `remember(person)` / `remember(people)`

```ts
remember(person: Person): Promise<string>
remember(people: Person[]): Promise<string[]>

interface Person {
  service: string;
  identifiers: { institutionalId?: string; email?: string; serviceUserId?: string };
  displayName: string;
  link?: boolean;
}
```

Returns the person's alias, creating their directory entry or updating its name and last-seen date. With a list, the aliases come back in the same order and the directory is written once: when a tool returns many people, collect them and make one call.

If the identifiers point to two different people in the directory, the strongest identifier wins, the entries are never merged, and a process warning (`process.emitWarning`) names the two aliases.

### `resolve(alias, { service })`

```ts
resolve(alias: string, options: { service: string }): Promise<string>
```

Returns the `serviceUserId` you passed for that person in that service, following any `link` the person made between aliases. Throws a `PseudonymError` if the alias is unknown or has no id for that service. Use it in write tools that receive an alias from the model; never send its result back to the model.

### `redact(text, { service })`

```ts
redact(text: string, options: { service: string }): Promise<{
  text: string;
  replaced: { names: number; emails: number; phones: number; ids: number; ibans: number };
}>
```

For text people wrote (submissions, forum posts, messages):

- the full names of the directory's people in that service become their aliases (case and accent insensitive, whole words);
- a first name alone becomes the alias only when exactly one person in the service has it and it's capitalized in the text;
- emails, Spanish phone numbers, DNI, NIE and Spanish IBANs (validated with their check digits) become placeholders, `[EMAIL_1]`, `[PHONE_1]`, `[DNI_1]`, `[IBAN_1]`, numbered within the call.

`replaced` holds counts, never values. Remember the people of a context before redacting its texts, or their names won't be known. Street addresses, dates of birth and names of people outside the directory are **not** detected.

### `keyFingerprint()`

```ts
keyFingerprint(): Promise<string>
```

A short code of the key, to check that two machines share it. Never logs or returns the key itself.

### `PseudonymError`

Every error the person can act on (a lost key, an unknown alias, a directory that can't be decrypted) is a `PseudonymError` whose message says what to do. Messages never contain a key or an identifier. Show them to the person; don't retry them.

## Integrating it well

- **Pass people through it where you build results**, before anything is serialized for the model. Every name, email, id or avatar URL you leave in is sent as is.
- **Prefer structure over redaction.** `remember()` is exact; `redact()` is a safety net for free text, not a substitute.
- **Keep `resolve()` results on your side.** They are for calling your own APIs.
- **Decide what the person sees.** The alias is for the model; your UI can still show the person real names.
- **Document what you send.** Say in your README which fields reach the model, that it's pseudonymization (GDPR art. 4(5)), not anonymization, and what `redact()` doesn't catch.

## Keep agents away from the key

The library stops data from reaching a model by accident. An agent on the same machine that can read the key folder or run the `pseudonym` command could undo it, so tell your users to deny both in their client. In Claude Code, for instance, in `settings.json`:

```json
{
  "permissions": {
    "deny": [
      "Read(~/.config/pseudonym/**)",
      "Read(~/AppData/Roaming/pseudonym/**)",
      "Bash(pseudonym *)",
      "Bash(npx pseudonym *)"
    ]
  }
}
```

## Where the data lives

One folder per user, shared by every program that uses the library:

- `%APPDATA%\pseudonym\` on Windows, `~/.config/pseudonym/` elsewhere, or `PSEUDONYM_HOME` if set;
- `key`: 32 random bytes created on first use; everything derives from it;
- `directory.enc`: the directory, encrypted with AES-256-GCM.

If the key goes missing after it was used, the library refuses to work and points to `pseudonym key import`, instead of creating a new key that would silently change every alias. Losing the key loses every way back, by design: tell your users to back it up with `pseudonym key export`.

## Testing your integration

Point `PSEUDONYM_HOME` to a temporary folder in your tests, so they never touch the real key or directory:

```ts
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

process.env.PSEUDONYM_HOME = mkdtempSync(path.join(tmpdir(), "pseudonym-"));
```

Each folder gets its own key, so aliases differ between test runs: assert on their shape (`/^A-[0-9A-HJKMNP-TV-Z]{6,7}$/`) or compare two calls, never on a fixed value.

## The CLI, for your users

The person running your program has the `pseudonym` command:

| Command | What it does |
| --- | --- |
| `pseudonym whois <alias>` | Who an alias is |
| `pseudonym alias "<name>"` | The aliases of a person, with their services |
| `pseudonym aliases --service <s>` | A service's people as CSV on stdout |
| `pseudonym link <alias> <alias>` | Mark two aliases as the same person, keeping the first |
| `pseudonym forget <alias>` | Remove a person from the directory |
| `pseudonym prune --older-than <n>(d\|m\|y)` | Remove people not seen for that long |
| `pseudonym key fingerprint` | Show the key's fingerprint |
| `pseudonym key export` | Print the key, to back it up or move it |
| `pseudonym key import` | Read a key from stdin |

It's for the person only: never let an agent run it.

## Contributing

The design lives in `.minispec/` (start with `core/project.md` and `decisions/`); each planned feature has a note there and an issue here.

```sh
npm install
npm run typecheck && npm run lint && npm test
npm run build      # dist/, with types; the CLI is dist/cli.js
```

## License

MIT, Falkenslab.
