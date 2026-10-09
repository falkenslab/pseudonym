import assert from "node:assert/strict";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { beforeEach, describe, it } from "node:test";
import { connect } from "../src/client.js";
import { createCourse } from "../src/course.js";

const ALIAS = /^A-[0-9A-HJKMNP-TV-Z]{6,7}$/;

// Every personal value in the course: none may reach the model.
function personalValues(): string[] {
  const { students } = createCourse();
  const values = students.flatMap((s) => [s.fullName, s.email, s.studentNumber, s.lmsId, s.fullName.toUpperCase()]);
  return [...values, "612 345 678", "marta.q.personal@mail.example.test", "48392017V", "ES91 2100 0418 4502 0005 1332"];
}

function assertNothingPersonal(text: string) {
  for (const value of personalValues()) assert.ok(!text.includes(value), `leaked: ${value}`);
}

describe("classroom MCP server", () => {
  // A new key and directory for each test, never the real ones.
  beforeEach(() => {
    process.env.PSEUDONYM_HOME = mkdtempSync(path.join(tmpdir(), "classroom-test-"));
  });

  it("lists students by alias only", async () => {
    const session = await connect();
    const result = await session.call("list_students");
    assert.equal(result.isError, false);
    assertNothingPersonal(result.text);
    const students = JSON.parse(result.text) as { student: string }[];
    assert.equal(students.length, 6);
    for (const { student } of students) assert.match(student, ALIAS);
    assert.equal(new Set(students.map((s) => s.student)).size, 6);
    await session.close();
  });

  it("gives the same aliases on every call", async () => {
    const session = await connect();
    assert.equal((await session.call("list_students")).text, (await session.call("list_students")).text);
    await session.close();
  });

  it("reads the forum with authors as aliases and the text redacted", async () => {
    const session = await connect();
    const result = await session.call("read_forum");
    assertNothingPersonal(result.text);
    const posts = JSON.parse(result.text) as { author: string; text: string }[];
    for (const post of posts) assert.match(post.author, ALIAS);
    const all = posts.map((p) => p.text).join("\n");
    for (const placeholder of ["[PHONE_1]", "[EMAIL_1]", "[DNI_1]", "[IBAN_1]"]) assert.ok(all.includes(placeholder), placeholder);
    // Two students are called Lucía: the first name alone stays, the full name doesn't.
    assert.ok(posts[4]?.text.startsWith("Lucía, "));
    await session.close();
  });

  it("grades the right student by alias, and keeps the alias in the answer", async () => {
    const session = await connect();
    const students = JSON.parse((await session.call("list_students")).text) as { student: string }[];
    const pablo = students[3]!.student;
    const result = await session.call("grade_student", { student: pablo, activity: "exam", grade: 6 });
    assert.equal(result.isError, false);
    assertNothingPersonal(result.text);
    assert.equal(session.course.students[3]?.grades.exam, 6);
    assert.equal(session.course.students.filter((s) => s.grades.exam !== undefined).length, 1);
    const summary = JSON.parse((await session.call("student_summary", { student: pablo.toLowerCase() })).text) as { average: number };
    assert.equal(summary.average, 5.5);
    await session.close();
  });

  it("answers an unknown alias with an error the model can read", async () => {
    const session = await connect();
    await session.call("list_students");
    const result = await session.call("grade_student", { student: "A-000000", activity: "exam", grade: 5 });
    assert.equal(result.isError, true);
    assert.match(result.text, /Unknown alias A-000000/);
    assert.equal(session.course.students.filter((s) => s.grades.exam !== undefined).length, 0);
    await session.close();
  });
});
