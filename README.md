# pseudonym

Stable aliases for people, so tools can tell a language model about them without names, emails or ids, and the person in charge can always resolve them on their own machine.

Status: early development, not published to npm yet. The design is in `.minispec/` (start with `core/project.md` and the decisions in `decisions/`); the library comes one feature at a time, each one an issue in this repository.

## The idea

A program that sends data about people to a model (an MCP server reading a course's submissions, say) passes each person through this library and sends `A-7K3F9Q` instead of "Lucía Ferrándiz":

- The alias is an HMAC of the person's best identifier (an institutional id, else an email, else the service's own user id) under a key that never leaves the machine: always the same for the same person, impossible to undo without the key.
- Each service gets its own aliases: the same person is one alias in Moodle and another in the mail, unless the program turns cross-service linking on. Linking what a model knows about someone across services is what makes re-identifying them easiest.
- A local encrypted directory remembers who each alias is, so aliases survive an email change and the person running the program can ask `pseudonym whois A-7K3F9Q` in their own terminal, offline.
- Free text (a submission, a forum post) can be redacted too: the directory's people become their aliases, and emails, Spanish phone numbers, DNI, NIE and IBANs become placeholders such as `[EMAIL_1]`.
- One key and one directory per user, shared by every program that uses the library, in `%APPDATA%\pseudonym\` (Windows) or `~/.config/pseudonym/`. `pseudonym key export` and `key import` move the key to another machine; losing it loses every way back, by design.

## What it doesn't do

- **Anonymize.** It's pseudonymization (GDPR art. 4(5)): the data stays personal data for whoever holds the key, and what people write about themselves can still identify them. The institution remains responsible for the legal basis, the agreement with the model's provider and the impact assessment.
- **Find everything in free text.** Street addresses, dates of birth and names of people outside the directory are not detected.
- **Stop an agent that wants to look.** It prevents data from reaching a model by accident. An agent on the same machine that can read the key folder or run the `pseudonym` command could undo it, so the client must deny both (in Claude Code, deny rules for reading `%APPDATA%\pseudonym\` or `~/.config/pseudonym/` and for running `pseudonym`).
- **Run as an MCP server.** It's a library inside each program that sends data to a model, never a tool an agent can call.

## Development

```sh
npm install
npm run typecheck && npm run lint && npm test
npm run build      # dist/, with types; the CLI is dist/cli.js
```

Tests never touch the real key: each one points `PSEUDONYM_HOME` to a temporary folder.

## License

MIT, Falkenslab.
