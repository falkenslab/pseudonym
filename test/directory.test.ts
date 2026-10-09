import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";
import { aliasOf, forget, link, peopleIn, prune, remember, resolve, stats, whois, type Person } from "../src/directory.js";
import { PseudonymError } from "../src/errors.js";
import { runScript, useTempHome } from "./helpers/home.js";

const moodle = "moodle@campus.example.org";
const mail = "mail@school.test";
const ana = (identifiers: Person["identifiers"], service = moodle, link?: boolean): Person => ({ service, identifiers, displayName: "Ana Pérez", link });

describe("directory", () => {
  it("keeps the first alias when the email changes", async () => {
    useTempHome();
    const first = await remember(ana({ email: "ana@school.test", serviceUserId: "7" }));
    assert.equal(await remember(ana({ email: "ana.perez@school.test", serviceUserId: "7" })), first);
    // And the new email is learned: it recognizes her alone now.
    assert.equal(await remember(ana({ email: "ana.perez@school.test" })), first);
    assert.equal((await whois(first))?.displayName, "Ana Pérez");
  });

  it("gives the same email two aliases in two services, and one when linked", async () => {
    useTempHome();
    const inMoodle = await remember(ana({ email: "ana@school.test" }));
    const inMail = await remember(ana({ email: "ana@school.test" }, mail));
    assert.notEqual(inMail, inMoodle);
    useTempHome();
    const linked = await remember(ana({ email: "ana@school.test" }, moodle, true));
    assert.equal(await remember(ana({ email: "ana@school.test" }, mail, true)), linked);
  });

  it("lets the strongest identifier win a conflict, merging nothing, with a warning", async () => {
    useTempHome();
    const lucia = await remember({ service: moodle, identifiers: { institutionalId: "111A" }, displayName: "Lucía" });
    const hugo = await remember({ service: moodle, identifiers: { email: "hugo@school.test" }, displayName: "Hugo" });
    const warnings: string[] = [];
    const onWarning = (warning: Error) => warnings.push(warning.message);
    process.on("warning", onWarning);
    const alias = await remember({ service: moodle, identifiers: { institutionalId: "111a", email: "hugo@school.test" }, displayName: "Lucía" });
    await new Promise((resolve) => setImmediate(resolve));
    process.off("warning", onWarning);
    assert.equal(alias, lucia);
    assert.equal(await remember({ service: moodle, identifiers: { email: "hugo@school.test" }, displayName: "Hugo" }), hugo);
    assert.equal(warnings.length, 1);
    assert.ok(warnings[0]?.includes(lucia) && warnings[0].includes(hugo) && !warnings[0].includes("hugo@school.test"));
  });

  it("remembers a list with one write, in order", async () => {
    useTempHome();
    const people = Array.from({ length: 300 }, (_, n) => ({ service: moodle, identifiers: { serviceUserId: String(n) }, displayName: `P ${n}` }));
    const before = stats.writes;
    const aliases = await remember(people);
    assert.equal(stats.writes - before, 1);
    assert.equal(new Set(aliases).size, 300);
    assert.equal(await resolve(aliases[42]!, { service: moodle }), "42");
  });

  it("resolves an alias to the service user id, and refuses what it can't", async () => {
    useTempHome();
    const alias = await remember(ana({ email: "ana@school.test", serviceUserId: "7" }));
    assert.equal(await resolve(alias, { service: moodle }), "7");
    assert.equal(await resolve(alias.toLowerCase(), { service: moodle }), "7");
    await assert.rejects(resolve(alias, { service: mail }), PseudonymError);
    await assert.rejects(resolve("A-000000", { service: moodle }), PseudonymError);
  });

  it("links two aliases: the first is kept and the second resolves to it", async () => {
    useTempHome();
    const a = await remember(ana({ email: "ana@school.test", serviceUserId: "7" }));
    const b = await remember(ana({ email: "ana@school.test", serviceUserId: "9" }, mail));
    assert.equal(await link(a, b), a);
    assert.equal((await whois(b))?.alias, a);
    assert.equal(await resolve(b, { service: mail }), "9");
    assert.equal(await remember(ana({ email: "ana@school.test" }, mail)), a);
    await assert.rejects(link(a, "A-000000"), PseudonymError);
  });

  it("forgets a person, and gives the recomputed alias when met again", async () => {
    useTempHome();
    const alias = await remember(ana({ email: "ana@school.test" }));
    assert.equal(await forget(alias), true);
    assert.equal(await whois(alias), undefined);
    assert.equal(await forget(alias), false);
    assert.equal(await remember(ana({ email: "ana@school.test" })), alias);
  });

  it("prunes people not seen since a date", async () => {
    useTempHome();
    await remember(ana({ email: "ana@school.test" }));
    assert.equal(await prune(new Date(Date.now() - 60_000)), 0);
    assert.equal(await prune(new Date(Date.now() + 60_000)), 1);
    assert.deepEqual(await peopleIn(moodle), []);
  });

  it("finds people by name, ignoring case and accents", async () => {
    useTempHome();
    const alias = await remember(ana({ email: "ana@school.test" }));
    assert.deepEqual((await aliasOf("ANA PEREZ")).map((e) => e.alias), [alias]);
    assert.deepEqual(await aliasOf("Lucía"), []);
  });

  it("loses nothing when two processes remember at once", async () => {
    const dir = useTempHome();
    await Promise.all([runScript("test/helpers/remember.ts", ["a", "20"], dir), runScript("test/helpers/remember.ts", ["b", "20"], dir)]);
    assert.equal((await peopleIn(moodle)).length, 40);
  });

  it("keeps no name, email or id in clear in the file", async () => {
    const dir = useTempHome();
    await remember({ service: moodle, identifiers: { institutionalId: "12345678Z", email: "ana@school.test", serviceUserId: "4242" }, displayName: "Ana Pérez" });
    const file = readFileSync(path.join(dir, "directory.enc"));
    for (const secret of ["Ana", "ana@school.test", "12345678Z", "4242", "moodle"]) {
      assert.ok(!file.includes(secret) && !file.toString("latin1").includes(secret), secret);
    }
  });

  it("ignores a temporary file left by a crash", async () => {
    const dir = useTempHome();
    const alias = await remember(ana({ email: "ana@school.test" }));
    writeFileSync(path.join(dir, "directory.enc.999.dead.tmp"), "half a file");
    assert.equal((await whois(alias))?.displayName, "Ana Pérez");
  });

  it("fails closed on a modified file or another key, without touching the file", async () => {
    const dir = useTempHome();
    await remember(ana({ email: "ana@school.test" }));
    const file = path.join(dir, "directory.enc");
    const original = readFileSync(file);
    const tampered = Buffer.from(original);
    tampered[tampered.length - 1]! ^= 1;
    writeFileSync(file, tampered);
    await assert.rejects(remember(ana({ email: "ana@school.test" })), PseudonymError);
    assert.deepEqual(readFileSync(file), tampered);

    writeFileSync(file, original);
    writeFileSync(path.join(dir, "key"), randomBytes(32));
    await assert.rejects(whois("A-000000"), PseudonymError);
    await assert.rejects(remember(ana({ email: "ana@school.test" })), PseudonymError);
    assert.deepEqual(readFileSync(file), original);
  });
});
