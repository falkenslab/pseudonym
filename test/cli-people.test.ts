import assert from "node:assert/strict";
import { writeFileSync } from "node:fs";
import path from "node:path";
import { beforeEach, describe, it } from "node:test";
import { parseCsv } from "../src/csv.js";
import { remember } from "../src/directory.js";
import { runScript, useTempHome } from "./helpers/home.js";

const service = "class-2b";
const cli = (home: string, args: string[], input?: string, env?: Record<string, string>) => runScript("src/cli.ts", args, home, input, env);
const CLASS = [
  "Name,Email,Institutional ID,service_user_id,Group",
  'Marta Quiroga,marta.q@school.test,2024-0031,u-1,B',
  '"Ferrándiz, Lucía",lucia.f@school.test,,u-2,"B, mornings"',
  "Hugo Estrella,,2024-0047,,A",
].join("\r\n");
const PERSONAL = ["Marta Quiroga", "marta.q@school.test", "2024-0031", "u-1", "Ferrándiz", "lucia.f@school.test", "u-2", "Hugo Estrella", "2024-0047"];

describe("pseudonym remember", () => {
  let home: string;
  beforeEach(() => {
    home = useTempHome();
  });

  it("gives one person the same alias as the library, in the default service", async () => {
    const result = await cli(home, ["remember", "--name", "Marta Quiroga", "--email", "marta.q@school.test", "--service-user-id", "u-1"]);
    assert.equal(result.status, 0);
    const alias = await remember({ service: "default", identifiers: { email: "marta.q@school.test" }, displayName: "Marta Quiroga" });
    assert.equal(result.stdout, `${alias}\n`);
    const json = await cli(home, ["remember", "--name", "Marta Quiroga", "--email", "marta.q@school.test", "--json"]);
    assert.deepEqual(JSON.parse(json.stdout), { alias });
  });

  it("needs a name and an identifier, and says so without echoing anything", async () => {
    assert.equal((await cli(home, ["remember", "--email", "x@school.test"])).status, 1);
    const noId = await cli(home, ["remember", "--name", "Marta Quiroga"]);
    assert.equal(noId.status, 1);
    assert.ok(!noId.stderr.includes("Marta"));
  });

  it("remembers a whole CSV, keeping its other columns, with the alias first", async () => {
    const file = path.join(home, "class.csv");
    writeFileSync(file, CLASS);
    const result = await cli(home, ["remember", "--csv", file, "--service", service]);
    assert.equal(result.status, 0, result.stderr);
    const rows = parseCsv(result.stdout).map((r) => r.fields);
    assert.deepEqual(rows[0], ["alias", "Name", "Email", "Institutional ID", "service_user_id", "Group"]);
    assert.deepEqual(rows[2]?.slice(1), ["Ferrándiz, Lucía", "lucia.f@school.test", "", "u-2", "B, mornings"]);
    assert.match(result.stderr, /Remembered 3 people in class-2b/);
    // The same people, remembered by the library, get the same aliases.
    const again = await remember({ service, identifiers: { serviceUserId: "u-1" }, displayName: "Marta Quiroga" });
    assert.equal(rows[1]?.[0], again);
  });

  it("drops names and identifiers with --only-aliases, from stdin too", async () => {
    const result = await cli(home, ["remember", "--csv", "-", "--service", service, "--only-aliases"], CLASS);
    const rows = parseCsv(result.stdout).map((r) => r.fields);
    assert.deepEqual(rows[0], ["alias", "Group"]);
    assert.deepEqual(rows.slice(1).map((r) => r[1]), ["B", "B, mornings", "A"]);
    for (const value of PERSONAL) assert.ok(!result.stdout.includes(value), value);
    const json = await cli(home, ["remember", "--csv", "-", "--service", service, "--only-aliases", "--json"], CLASS);
    assert.deepEqual(Object.keys(JSON.parse(json.stdout)[0]), ["alias", "Group"]);
  });

  it("refuses a CSV row without identifiers, naming its line and writing nothing", async () => {
    const result = await cli(home, ["remember", "--csv", "-", "--service", service], `${CLASS}\r\nAna Pérez,,,,C`);
    assert.equal(result.status, 1);
    assert.match(result.stderr, /Line 5 has no email/);
    assert.ok(!result.stderr.includes("Ana"));
    assert.equal(result.stdout, "");
    assert.equal((await cli(home, ["services"])).stdout, "");
  });

  it("lets redact know the people of a CSV", async () => {
    await cli(home, ["remember", "--csv", "-", "--only-aliases"], CLASS);
    const result = await cli(home, ["redact"], "Marta Quiroga y Hugo Estrella");
    assert.match(result.stdout, /^A-\w+ y A-\w+$/);
  });
});

describe("pseudonym resolve", () => {
  let home: string;
  beforeEach(() => {
    home = useTempHome();
  });

  it("gives back the service user id of a CSV row", async () => {
    const out = await cli(home, ["remember", "--csv", "-", "--service", service, "--only-aliases"], CLASS);
    const alias = parseCsv(out.stdout)[1]!.fields[0]!;
    const result = await cli(home, ["resolve", alias.toLowerCase(), "--service", service]);
    assert.equal(result.stdout, "u-1\n");
    const json = await cli(home, ["resolve", alias], undefined, { PSEUDONYM_SERVICE: service });
    assert.deepEqual(JSON.parse((await cli(home, ["resolve", alias, "--json"], undefined, { PSEUDONYM_SERVICE: service })).stdout), { alias, service, id: "u-1" });
    assert.equal(json.stdout, "u-1\n");
  });

  it("exits 2 for an unknown alias, or one without an id in that service", async () => {
    const out = await cli(home, ["remember", "--csv", "-", "--service", service, "--only-aliases"], CLASS);
    const hugo = parseCsv(out.stdout)[3]!.fields[0]!;
    assert.equal((await cli(home, ["resolve", "A-000000", "--service", service])).status, 2);
    const noId = await cli(home, ["resolve", hugo, "--service", service]);
    assert.equal(noId.status, 2);
    assert.match(noId.stderr, /no user id in class-2b/);
    assert.equal((await cli(home, ["resolve", hugo, "--service", "elsewhere"])).status, 2);
  });
});
