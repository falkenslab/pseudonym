// The server's tools. Each one passes every person through pseudonym where it builds its result, so the model
// sees aliases (A-7K3F9Q) and never a name, email or id; a write tool takes an alias back with resolve().
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { PseudonymError, redact, remember, resolve, type Person } from "@falkenslab/pseudonym";
import { z } from "zod";
import { ACTIVITIES, createCourse, SERVICE, type Student } from "./course.js";

const asPerson = (student: Student): Person => ({
  service: SERVICE,
  identifiers: { institutionalId: student.studentNumber, email: student.email, serviceUserId: student.lmsId },
  displayName: student.fullName,
});

const average = (student: Student) => {
  const grades = Object.values(student.grades);
  return grades.length ? Math.round((grades.reduce((a, b) => a + b, 0) / grades.length) * 100) / 100 : null;
};

const reply = (value: unknown) => ({ content: [{ type: "text" as const, text: JSON.stringify(value, null, 2) }] });

// A PseudonymError (an unknown alias) goes back to the model as a readable error, so it can correct itself.
const failure = (error: unknown) => {
  if (!(error instanceof PseudonymError)) throw error;
  return { content: [{ type: "text" as const, text: error.message }], isError: true };
};

export function createServer(course = createCourse()): McpServer {
  const server = new McpServer({ name: "classroom", version: "0.0.0" });
  const byLmsId = (id: string) => course.students.find((s) => s.lmsId === id);

  /** Everyone's alias, in one call (one write to the directory), keyed by LMS id. */
  async function aliases(): Promise<Map<string, string>> {
    const list = await remember(course.students.map(asPerson));
    return new Map(course.students.map((student, i) => [student.lmsId, list[i]!]));
  }

  server.registerTool(
    "list_students",
    {
      title: "List the students",
      description: "Every student of the course with their grades. Students are identified by alias (A-…): use the alias to refer to them in other tools.",
      inputSchema: {},
      annotations: { readOnlyHint: true },
    },
    async () => {
      const alias = await aliases();
      return reply(course.students.map((s) => ({ student: alias.get(s.lmsId), grades: s.grades, average: average(s) })));
    },
  );

  server.registerTool(
    "read_forum",
    {
      title: "Read the course forum",
      description: "The forum's posts, newest last. Authors are aliases; names of classmates, emails, phones, ids and bank accounts in the text are replaced.",
      inputSchema: {},
      annotations: { readOnlyHint: true },
    },
    async () => {
      // Remember everyone first: redact() only knows the names of people already in the directory.
      const alias = await aliases();
      const posts = [];
      for (const post of course.posts) {
        posts.push({ author: alias.get(post.authorLmsId), date: post.date, text: (await redact(post.text, { service: SERVICE })).text });
      }
      return reply(posts);
    },
  );

  server.registerTool(
    "student_summary",
    {
      title: "A student's grades",
      description: "One student's grades and average, by alias.",
      inputSchema: { student: z.string().describe("The student's alias, as list_students gives it (A-…)") },
      annotations: { readOnlyHint: true },
    },
    async ({ student }) => {
      try {
        const found = byLmsId(await resolve(student, { service: SERVICE }));
        if (!found) throw new PseudonymError(`${student} is not in this course.`);
        return reply({ student, grades: found.grades, average: average(found) });
      } catch (error) {
        return failure(error);
      }
    },
  );

  server.registerTool(
    "grade_student",
    {
      title: "Grade a student",
      description: "Set a student's grade for an activity, by alias. Changes the gradebook: confirm with the teacher first.",
      inputSchema: {
        student: z.string().describe("The student's alias, as list_students gives it (A-…)"),
        activity: z.enum(ACTIVITIES),
        grade: z.number().min(0).max(10),
      },
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true },
    },
    async ({ student, activity, grade }) => {
      try {
        // The model only knows the alias: resolve() turns it into the LMS id the write needs, on our side.
        const found = byLmsId(await resolve(student, { service: SERVICE }));
        if (!found) throw new PseudonymError(`${student} is not in this course.`);
        found.grades[activity] = grade;
        return reply({ student, activity, grade, average: average(found) });
      } catch (error) {
        return failure(error);
      }
    },
  );

  return server;
}
