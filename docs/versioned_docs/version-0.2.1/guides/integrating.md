# Integrating it

This guide uses an MCP server as the example, because it's the case the library was written for ([Model Context Protocol](https://modelcontextprotocol.io)); the same applies to any program that sends data about people to a model. [The classroom example](../example/classroom-mcp.md) has all of it working.

## 1. Choose the service

One string per data source instance, stable over time:

```ts
const service = `moodle@${new URL(siteUrl).host}`;
```

## 2. Pass every person through `remember()` where you build results

Do it at the point where your tool turns your data source's response into what the model will read, before anything is serialized:

```ts
import { remember, type Person } from "@falkenslab/pseudonym";

const asPerson = (user: MoodleUser): Person => ({
  service,
  identifiers: {
    institutionalId: user.idnumber || undefined, // empty strings are ignored anyway
    email: user.email,
    serviceUserId: String(user.id),
  },
  displayName: user.fullname,
});

// One call for the whole list: the directory is written once.
const aliases = await remember(participants.map(asPerson));

return participants.map((user, i) => ({
  student: aliases[i],
  lastAccess: user.lastaccess,
  grade: gradeOf(user),
}));
```

- **Pass a list** when you have several people: `remember(people)` returns the aliases in the same order and writes the directory once. Calling it once per person works, but each call locks, reads and rewrites the file.
- **Pass `serviceUserId`** whenever a tool may need to act on the person later: it's what `resolve()` gives back.
- **Leave nothing else in.** Every field that identifies someone (name, email, avatar URL, profile link, a username in a URL) must go or be replaced. The library only replaces what you pass through it.

If the identifiers you pass point to two different people already in the directory (an email that belonged to someone else, say), the strongest identifier wins, nobody is merged, and the library emits a process warning naming both aliases (never the identifiers):

```ts
process.on("warning", (warning) => {
  if (warning.name === "PseudonymWarning") log(warning.message);
});
```

## 3. Take aliases back with `resolve()`

A write tool receives an alias from the model and needs your own id:

```ts
import { resolve, PseudonymError } from "@falkenslab/pseudonym";

async function gradeStudent({ student, grade }: { student: string; grade: number }) {
  try {
    const userId = await resolve(student, { service });
    await moodle.setGrade(Number(userId), grade);
    return { student, grade };
  } catch (error) {
    if (error instanceof PseudonymError) return { isError: true, content: [{ type: "text", text: error.message }] };
    throw error;
  }
}
```

- `resolve()` follows aliases [linked](../cli/tidying-the-directory.md#link-two-aliases) by the person in charge.
- It throws a `PseudonymError` for an unknown alias, or one with no id for that service. Its message never contains an identifier, so it's safe to return to the model, which can then correct itself.
- **Keep its result on your side.** Answer the model with the alias, never with the id.

## 4. Redact free text

Submissions, forum posts and messages carry names and contact data in their text. Remember the people of the context first (the directory only knows names it has met), then redact:

```ts
const aliases = await remember(participants.map(asPerson));
const { text } = await redact(post.message, { service });
```

See [Redacting free text](redaction.md) for what it replaces and what it can't.

## 5. Decide what the person sees

The aliases are for the model. Your program's own interface can still show the person real names: that's your choice (moodle-mcp shows them to the teacher). The person can always resolve an alias with `pseudonym whois`.

## 6. Handle errors

Every error the person can act on is a `PseudonymError` whose message says what to do:

| Situation | What to do |
| --- | --- |
| The key is missing after it was used here | The person restores it with `pseudonym key import` |
| The key is damaged (wrong size) | The same |
| The directory can't be read (another key, or the file was modified) | Nothing was changed; restore the right key |
| The directory was written by a newer version | Update the library |
| The directory is locked by another program for more than 15 s | Try again; a lock left by a crash is broken after 10 s |
| An unknown alias, or one without an id for the service | Tell the model (`resolve`) |
| A person without any identifier, service or display name | A bug in the caller |

Show these to the person or the model; don't retry them in a loop.

## 7. Document what you send

In your own README, tell your users:

- which fields reach the model, and that people go as aliases;
- that it's pseudonymization (GDPR art. 4(5)), not anonymization;
- what redaction doesn't catch (addresses, birth dates, people outside the directory);
- how to keep their agent away from the key and the CLI: link to [Keeping agents away from the key](../security/keeping-agents-away.md).

## Nothing prints

The library never writes to stdout or stderr (inside an MCP server, stdout is the protocol). The only output besides return values and errors is the `PseudonymWarning` above.
