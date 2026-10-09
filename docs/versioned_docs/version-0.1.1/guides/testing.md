# Testing your integration

## Never touch the real key

Point `PSEUDONYM_HOME` to a new temporary folder before your tests call the library. Each folder gets its own key and directory:

```ts
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { beforeEach } from "node:test";

beforeEach(() => {
  process.env.PSEUDONYM_HOME = mkdtempSync(path.join(tmpdir(), "pseudonym-"));
});
```

The library reads `PSEUDONYM_HOME` on every call, so setting it in `beforeEach` is enough. Child processes you spawn need it in their environment too.

## Don't assert on fixed aliases

Each temporary folder has a new random key, so aliases change between runs. Assert on their shape, or compare two calls:

```ts
const ALIAS = /^A-[0-9A-HJKMNP-TV-Z]{6,12}$/;

const [a] = await remember([person]);
assert.match(a, ALIAS);
assert.equal(await remember(person), a); // stable within the same folder
```

## Assert that nothing personal leaks

The most useful test of an integration: call your tools and check that no personal value from your fixtures appears in their output.

```ts
const personal = students.flatMap((s) => [s.fullName, s.email, s.studentNumber, String(s.id)]);

const output = await callTool("list_students");
for (const value of personal) assert.ok(!output.includes(value), `leaked: ${value}`);
```

Use invented data in fixtures: invented names, and domains such as `example.test` or `example-school.test`.

## Test the way back

For write tools, check that an alias from one tool resolves to the right record, and that an unknown alias is a readable error:

```ts
const [{ student }] = JSON.parse(await callTool("list_students"));
await callTool("grade_student", { student, grade: 6 });
assert.equal(gradebook.get(students[0].id), 6);

const result = await callTool("grade_student", { student: "A-000000", grade: 5 });
assert.equal(result.isError, true);
```

The [classroom example's test](https://github.com/falkenslab/pseudonym/blob/main/examples/classroom-mcp/test/tools.test.ts) does all of this through MCP, with an in-process client.
