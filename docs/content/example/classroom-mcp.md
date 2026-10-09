# The classroom MCP example

[`examples/classroom-mcp`](https://github.com/falkenslab/pseudonym/tree/main/examples/classroom-mcp) is a small MCP server over a made-up course: six students with grades, and a forum whose posts carry names, a phone, emails, a DNI and an IBAN. Every value is invented. It shows each part of the library where a real server would use it.

## The tools

| Tool | What the model gets | Library call |
| --- | --- | --- |
| `list_students` | Every student as an alias, with grades and average | `remember()` with the whole list |
| `read_forum` | Posts with authors as aliases and text redacted | `remember()`, then `redact()` per post |
| `student_summary` | One student's grades, asked for by alias | `resolve()` |
| `grade_student` | A grade set by alias | `resolve()` to the LMS id |

The whole integration is in [`src/tools.ts`](https://github.com/falkenslab/pseudonym/blob/main/examples/classroom-mcp/src/tools.ts). The core of it:

```ts
const asPerson = (student: Student): Person => ({
  service: SERVICE,
  identifiers: { institutionalId: student.studentNumber, email: student.email, serviceUserId: student.lmsId },
  displayName: student.fullName,
});

/** Everyone's alias, in one call (one write to the directory), keyed by LMS id. */
async function aliases(): Promise<Map<string, string>> {
  const list = await remember(course.students.map(asPerson));
  return new Map(course.students.map((student, i) => [student.lmsId, list[i]!]));
}
```

And the way back, in `grade_student`:

```ts
// The model only knows the alias: resolve() turns it into the LMS id the write needs, on our side.
const found = byLmsId(await resolve(student, { service: SERVICE }));
```

## What the model reads

```json
[
  {
    "author": "A-9NQWD5",
    "date": "2026-10-01",
    "text": "Hola, soy A-9NQWD5. ¿Alguien hace la práctica 2 conmigo? Mi móvil es [PHONE_1] y mi correo [EMAIL_1]."
  },
  {
    "author": "A-TA8D1J",
    "date": "2026-10-01",
    "text": "Yo me apunto, A-9NQWD5. A-TA8D1J, del grupo B."
  },
  {
    "author": "A-Q30XC4",
    "date": "2026-10-04",
    "text": "Lucía, ¿me pasas tu parte? Firmado: A-Q30XC4."
  }
]
```

Two students are called Lucía, so "Lucía" alone stays: it could be either of them. The full name, "LUCÍA FERRÁNDIZ", is replaced. That's [the rule for first names](../guides/redaction.md#names-the-directorys-people).

An alias that doesn't exist comes back as an MCP error the model can read:

```text
Unknown alias A-000000: nobody with it is in the directory.
```

## Run it

```bash
npm install                      # at the repository's root: builds the library
cd examples/classroom-mcp
npm install
npm run demo                     # every tool's output, then the CLI commands to try
npm test                         # no tool output may contain any personal value
```

The demo keeps its key and directory in `examples/classroom-mcp/.pseudonym/`, never in your real folder, and ends by printing the `pseudonym` commands that let you play the teacher:

```powershell
$env:PSEUDONYM_HOME = "<the example's folder>\.pseudonym"
npx pseudonym whois A-9NQWD5
```

## Try it with Claude Code

```bash
npm run build
claude mcp add classroom -e PSEUDONYM_HOME=/abs/path/to/examples/classroom-mcp/.pseudonym -- node /abs/path/to/examples/classroom-mcp/dist/server.js
```

Run it through `node`, not `npm start`: npm prints to stdout, which is the MCP protocol.

Then ask, for example: "List the students of the classroom, give the one with the lowest practice1 grade a 5 in the exam, and summarize what the forum is about."

We tried exactly that with `claude -p`: the model only saw aliases, graded `A-4C2Z5W`, and noticed the ambiguous "Lucía" as the one name left in the forum. `whois A-4C2Z5W` in that directory gave Pablo Lorente, who had the lowest grade. Keep your agent away from the example's `.pseudonym/` folder and the CLI as you would from the real ones: see [Keeping agents away from the key](../security/keeping-agents-away.md).

## The test

[`test/tools.test.ts`](https://github.com/falkenslab/pseudonym/blob/main/examples/classroom-mcp/test/tools.test.ts) calls every tool through MCP, with an in-process client and a new `PSEUDONYM_HOME` per test, and checks that no output contains any name, email, student number, LMS id, phone, DNI or IBAN from the data; that aliases are stable; that the right student is graded; and that an unknown alias is an error. It's the pattern described in [Testing your integration](../guides/testing.md).
