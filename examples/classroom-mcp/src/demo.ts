// npm run demo: calls every tool through MCP and prints what a model would read, then the pseudonym commands
// that let the teacher see who is who. The key and the directory go to .pseudonym/ in this folder, unless
// PSEUDONYM_HOME says otherwise, so the demo never touches your real ones.
import path from "node:path";
import { fileURLToPath } from "node:url";

process.env.PSEUDONYM_HOME ??= path.join(path.dirname(fileURLToPath(import.meta.url)), "..", ".pseudonym");
const { connect } = await import("./client.js");

const session = await connect();
const show = async (title: string, name: string, args: Record<string, unknown> = {}) => {
  const result = await session.call(name, args);
  console.log(`\n── ${title}: ${name}(${Object.keys(args).length ? JSON.stringify(args) : ""})${result.isError ? " → error" : ""}`);
  console.log(result.text);
  return result.text;
};

console.log(`What the model reads (the directory is in ${process.env.PSEUDONYM_HOME}):`);
const students = JSON.parse(await show("Every student, by alias", "list_students")) as { student: string }[];
await show("The forum, redacted", "read_forum");
const first = students[0]!.student;
await show("A write, by alias", "grade_student", { student: first, activity: "exam", grade: 9 });
await show("A summary, by alias", "student_summary", { student: first });
await show("An alias that doesn't exist", "student_summary", { student: "A-000000" });
await session.close();

const home = process.env.PSEUDONYM_HOME;
console.log(`
── What only the teacher sees, in their own terminal (never let an agent run these):
   PowerShell:  $env:PSEUDONYM_HOME = "${home}"
   sh:          export PSEUDONYM_HOME="${home}"
   then:        npx pseudonym whois ${first}
                npx pseudonym alias "lucia"
                npx pseudonym aliases --service classroom@example-school.test
                npx pseudonym key fingerprint`);
