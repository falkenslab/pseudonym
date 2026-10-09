# classroom-mcp

A small MCP server over a made-up course, to see `@falkenslab/pseudonym` where it's meant to live: tools that tell a model about students without the model learning who they are. The teacher, in their own terminal, can always find out with `pseudonym whois`.

Every name, email, id, phone, DNI and IBAN in [src/course.ts](src/course.ts) is invented.

## What it shows

| Tool | What the model gets | Library call |
| --- | --- | --- |
| `list_students` | Every student as an alias (`A-9NQWD5`) with their grades | `remember()` with the whole list, one write |
| `read_forum` | Posts with authors as aliases; classmates' names, emails, phones, DNI and IBAN in the text replaced | `remember()`, then `redact()` per post |
| `student_summary` | One student's grades, asked for by alias | `resolve()` |
| `grade_student` | A grade set by alias; the server writes it with the LMS id | `resolve()` |

Read [src/tools.ts](src/tools.ts): every person goes through the library where the tool builds its result, and the only id that comes back from the model is an alias.

A forum post as the model reads it:

```json
{
  "author": "A-9NQWD5",
  "date": "2026-10-01",
  "text": "Hola, soy A-9NQWD5. ¿Alguien hace la práctica 2 conmigo? Mi móvil es [PHONE_1] y mi correo [EMAIL_1]."
}
```

Two things it shows on purpose:

- Two students are called Lucía, so "Lucía" alone in a post stays as it is: it could be either of them, and the wrong alias would be worse than the name. "LUCÍA FERRÁNDIZ", the full name, is replaced.
- Placeholders are numbered per call: `[EMAIL_1]` in two posts may be two different addresses.

## Run it

From a clone of the repository, install and build the library first, then the example:

```sh
npm install                      # at the repository's root: builds the library
cd examples/classroom-mcp
npm install
npm run demo                     # every tool's output, then the CLI commands to try
npm test                         # no tool output may contain any personal value
```

The demo keeps its key and directory in `examples/classroom-mcp/.pseudonym/` (ignored by git), never in your real folder. To see who is who, as the teacher would, in your own terminal:

```powershell
$env:PSEUDONYM_HOME = "<this folder>\.pseudonym"
npx pseudonym whois A-9NQWD5     # use an alias the demo printed
npx pseudonym alias "lucia"
```

## Try it with Claude Code

Build the server and add it, with a folder of its own for the key and the directory (absolute paths):

```sh
npm run build
claude mcp add classroom -e PSEUDONYM_HOME=/abs/path/to/examples/classroom-mcp/.pseudonym -- node /abs/path/to/examples/classroom-mcp/dist/server.js
```

Run it through `node` and not `npm start`: npm prints to stdout, which is the MCP protocol.

Then, in a Claude Code session, ask for example:

> List the students of the classroom, give the one with the lowest practice1 grade a 5 in the exam, and summarize what the forum is about.

Claude only ever sees aliases. Check who it graded in your own terminal, with `PSEUDONYM_HOME` set as above: `npx pseudonym whois <the alias it used>`. And keep the agent itself away from that folder and the command: see "Keep agents away from the key" in the [library's README](../../README.md#keep-agents-away-from-the-key).

Remove it when done: `claude mcp remove classroom`.

## Files

- [src/course.ts](src/course.ts): the made-up course (what an LMS's API would return).
- [src/tools.ts](src/tools.ts): the MCP server and its four tools.
- [src/server.ts](src/server.ts): the server on stdio, as a client starts it.
- [src/client.ts](src/client.ts): an in-process MCP client, for the demo and the tests.
- [src/demo.ts](src/demo.ts): `npm run demo`.
- [test/tools.test.ts](test/tools.test.ts): the smoke test.
