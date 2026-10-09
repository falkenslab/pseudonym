// Remembers `<count>` people named `<prefix> <n>` one call at a time, to race another process.
import { remember } from "../../src/directory.js";

const [prefix = "p", count = "1"] = process.argv.slice(2);
for (let n = 0; n < Number(count); n++) {
  await remember({ service: "moodle@campus.example.org", identifiers: { email: `${prefix}${n}@school.test` }, displayName: `${prefix} ${n}` });
}
