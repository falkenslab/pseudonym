# pseudonym

Stable aliases for people, so tools can tell a language model about them without names, emails or ids, and the person in charge can always resolve them on their own machine.

Status: early development, not published. The design is in `.minispec/` (start with `core/project.md` and the decisions); the library comes one feature at a time.

## The idea

A program that sends data about people to a model (an MCP server reading a course's submissions, say) passes each person through this library and sends `A-7K3F9Q` instead of "Lucía Martín":

- The alias is an HMAC of the person's best identifier under a key that never leaves the machine: always the same for the same person, impossible to undo without the key.
- A local encrypted directory remembers who each alias is, so the person running the program can ask `pseudonym whois A-7K3F9Q` in their own terminal.
- One key and one directory per user, shared by every program that uses the library, in `%APPDATA%\pseudonym\` (Windows) or `~/.config/pseudonym/`.

It's pseudonymization, not anonymization: what people write about themselves can still identify them, and the data stays personal data for whoever holds the key.

## Development

```sh
npm install
npm run typecheck && npm run lint && npm test
npm run build      # dist/, with types; the CLI is dist/cli.js
```

## License

MIT, Falkenslab.
