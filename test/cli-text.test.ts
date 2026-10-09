import assert from "node:assert/strict";
import { writeFileSync } from "node:fs";
import path from "node:path";
import { beforeEach, describe, it } from "node:test";
import { link, remember } from "../src/directory.js";
import { runScript, useTempHome } from "./helpers/home.js";

const moodle = "moodle@campus.example.org";
const cli = (home: string, args: string[], input?: string, env?: Record<string, string>) => runScript("src/cli.ts", args, home, input, env);
const marta = { service: moodle, identifiers: { email: "marta.q@school.test", serviceUserId: "1" }, displayName: "Marta Quiroga" };
const POST = "Hola, soy Marta Quiroga. Mi móvil es 612 345 678 y mi correo marta.q@mail.example.test.\r\nGracias\r\n";

describe("pseudonym services", () => {
  let home: string;
  beforeEach(() => {
    home = useTempHome();
  });

  it("lists services with their number of people, as text and as JSON", async () => {
    await remember([marta, { ...marta, identifiers: { serviceUserId: "2" }, displayName: "Hugo Estrella" }, { ...marta, service: "mail@school.test" }]);
    const text = await cli(home, ["services"]);
    assert.equal(text.stdout, `${moodle}  2 people\nmail@school.test  1 person\n`);
    const json = await cli(home, ["services", "--json"]);
    assert.deepEqual(JSON.parse(json.stdout), [{ service: moodle, people: 2 }, { service: "mail@school.test", people: 1 }]);
  });

  it("says when the directory is empty", async () => {
    const result = await cli(home, ["services"]);
    assert.equal(result.status, 0);
    assert.equal(result.stdout, "");
    assert.match(result.stderr, /no people yet/);
  });
});

describe("pseudonym redact", () => {
  let home: string;
  beforeEach(() => {
    home = useTempHome();
  });

  it("redacts stdin and a file the same way, keeping the line endings, with the counts on stderr", async () => {
    const alias = await remember(marta);
    const file = path.join(home, "post.txt");
    writeFileSync(file, POST);
    const fromStdin = await cli(home, ["redact", "--service", moodle], POST);
    const fromFile = await cli(home, ["redact", "--service", moodle, file]);
    const fromDash = await cli(home, ["redact", "--service", moodle, "-"], POST);
    assert.equal(fromStdin.status, 0);
    assert.equal(fromStdin.stdout, `Hola, soy ${alias}. Mi móvil es [PHONE_1] y mi correo [EMAIL_1].\r\nGracias\r\n`);
    assert.equal(fromFile.stdout, fromStdin.stdout);
    assert.equal(fromDash.stdout, fromStdin.stdout);
    assert.match(fromStdin.stderr, /Replaced 1 name, 1 email, 1 phone\./);
  });

  it("uses the only service in the directory when none is asked for, and says which", async () => {
    const alias = await remember(marta);
    const result = await cli(home, ["redact"], "Marta Quiroga");
    assert.equal(result.stdout, alias);
    assert.match(result.stderr, new RegExp(`only service in the directory: ${moodle}`));
  });

  it("prefers the default service, and takes PSEUDONYM_SERVICE", async () => {
    const inDefault = await remember({ ...marta, service: "default" });
    const inMoodle = await remember(marta);
    assert.equal((await cli(home, ["redact"], "Marta Quiroga")).stdout, inDefault);
    assert.equal((await cli(home, ["redact"], "Marta Quiroga", { PSEUDONYM_SERVICE: moodle })).stdout, inMoodle);
  });

  it("asks to choose when there are several services and no default", async () => {
    await remember([marta, { ...marta, service: "mail@school.test" }]);
    const result = await cli(home, ["redact"], "Marta Quiroga");
    assert.equal(result.status, 1);
    assert.equal(result.stdout, "");
    assert.match(result.stderr, /several services.*--service.*mail@school\.test/s);
  });

  it("applies only the patterns on an empty directory, or for an unknown service, and says so", async () => {
    const empty = await cli(home, ["redact"], POST);
    assert.equal(empty.status, 0);
    assert.ok(empty.stdout.includes("Marta Quiroga") && empty.stdout.includes("[PHONE_1]"));
    assert.match(empty.stderr, /no people yet/);
    await remember(marta);
    const typo = await cli(home, ["redact", "--service", "moodle@typo"], POST);
    assert.ok(typo.stdout.includes("Marta Quiroga"));
    assert.match(typo.stderr, new RegExp(`nobody in "moodle@typo".*${moodle}`));
  });

  it("looks for other countries' ids with --countries, and counts cards", async () => {
    const text = "SSN 123-45-6789, card 4111 1111 1111 1111, DNI 12345678Z.";
    const byDefault = await cli(home, ["redact"], text);
    assert.equal(byDefault.stdout, "SSN 123-45-6789, card [CARD_1], DNI [DNI_1].");
    const withUs = await cli(home, ["redact", "--countries", "US,es"], text);
    assert.equal(withUs.stdout, "SSN [US_SSN_1], card [CARD_1], DNI [DNI_1].");
    assert.match(withUs.stderr, /Replaced 2 ids, 1 card./);
    const unknown = await cli(home, ["redact", "--countries", "US,XX"], text);
    assert.equal(unknown.status, 1);
    assert.equal(unknown.stdout, "");
    assert.match(unknown.stderr, /Unknown country "XX"/);
  });

  it("exits 1 for a missing file or an unknown option, writing nothing to stdout", async () => {
    const missing = await cli(home, ["redact", path.join(home, "nope.txt")]);
    assert.equal(missing.status, 1);
    assert.equal(missing.stdout, "");
    assert.match(missing.stderr, /no such file/);
    assert.equal((await cli(home, ["redact", "--nope"], "x")).status, 1);
  });
});

describe("pseudonym reveal", () => {
  let home: string;
  beforeEach(() => {
    home = useTempHome();
  });

  it("puts names back for known and linked aliases, leaving unknown aliases and placeholders", async () => {
    const [a, b] = await remember([marta, { ...marta, identifiers: { serviceUserId: "2" }, displayName: "Hugo Estrella" }]);
    const c = await remember({ ...marta, service: "mail@school.test" });
    await link(a!, c);
    const answer = `${a} y ${b!.toLowerCase()} entregaron; ${c} también. A-000000 no existe. Escribe a [EMAIL_1].\n`;
    const result = await cli(home, ["reveal"], answer);
    assert.equal(result.status, 0);
    assert.equal(result.stdout, "Marta Quiroga y Hugo Estrella entregaron; Marta Quiroga también. A-000000 no existe. Escribe a [EMAIL_1].\n");
    assert.match(result.stderr, /Revealed 3 aliases; 1 unknown alias left as is\./);
    assert.match(result.stderr, /names in clear/);
    const withAlias = await cli(home, ["reveal", "--with-alias"], `${a}.`);
    assert.equal(withAlias.stdout, `Marta Quiroga (${a}).`);
  });

  it("only takes whole aliases", async () => {
    const a = await remember(marta);
    // Glued to letters it's part of another word; followed by punctuation it's still the alias.
    assert.equal((await cli(home, ["reveal"], `X${a} ${a}X ${a}-1`)).stdout, `X${a} ${a}X Marta Quiroga-1`);
  });

  it("undoes redact", async () => {
    await remember(marta);
    const redacted = await cli(home, ["redact"], "Hablé con Marta Quiroga ayer.");
    assert.equal((await cli(home, ["reveal"], redacted.stdout)).stdout, "Hablé con Marta Quiroga ayer.");
  });
});
