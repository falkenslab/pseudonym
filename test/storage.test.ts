import assert from "node:assert/strict";
import { existsSync, readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import path from "node:path";
import { afterEach, beforeEach, describe, it } from "node:test";
import { configure, migrate, peopleIn, remember, resolve, reveal, storageMode, whois, type Person } from "../src/directory.js";
import { PseudonymError } from "../src/errors.js";
import { keyFingerprint } from "../src/index.js";
import { redact } from "../src/redact.js";
import { runScript, useTempHome } from "./helpers/home.js";

const service = "moodle@campus.example.org";
const marta: Person = { service, identifiers: { email: "marta.q@school.test", institutionalId: "2024-0031", serviceUserId: "u-1" }, displayName: "Marta Quiroga" };
const ALIAS = /^A-[0-9A-HJKMNP-TV-Z]{6}$/;
const files = (home: string) => readdirSync(home).sort();

describe("plain storage", () => {
  let home: string;
  beforeEach(() => {
    home = useTempHome();
    process.env.PSEUDONYM_STORAGE = "plain";
  });
  afterEach(() => {
    delete process.env.PSEUDONYM_STORAGE;
    configure({});
  });

  it("keeps a readable, versioned directory.json and no key", async () => {
    const alias = await remember(marta);
    assert.match(alias, ALIAS);
    assert.deepEqual(files(home), ["directory.json"]);
    const json = JSON.parse(readFileSync(path.join(home, "directory.json"), "utf8"));
    assert.equal(json.format, "pseudonym-directory");
    assert.equal(json.version, 1);
    assert.equal(json.entries[0].alias, alias);
    assert.equal(json.entries[0].displayName, "Marta Quiroga");
    assert.deepEqual(json.entries[0].matchers.sort(), ["email:marta.q@school.test", "institutionalId:20240031"]);
    assert.deepEqual(json.entries[0].services, [{ service, id: "u-1" }]);
  });

  it("writes it for the user only", { skip: process.platform === "win32" && "%APPDATA% is already per user" }, async () => {
    await remember(marta);
    assert.equal(statSync(path.join(home, "directory.json")).mode & 0o777, 0o600);
  });

  it("remembers, resolves, redacts and reveals as the encrypted storage does", async () => {
    const alias = await remember(marta);
    assert.equal(await remember({ ...marta, identifiers: { email: "MARTA.Q@school.test" } }), alias);
    assert.equal(await remember({ ...marta, identifiers: { email: "new@school.test", serviceUserId: "u-1" } }), alias);
    assert.equal(await resolve(alias.toLowerCase(), { service }), "u-1");
    const { text } = await redact("Marta Quiroga, marta.q@school.test", { service });
    assert.equal(text, `${alias}, [EMAIL_1]`);
    assert.equal((await reveal(`${alias} lo entregó`)).text, "Marta Quiroga lo entregó");
    assert.notEqual(await remember({ ...marta, service: "mail@school.test" }), alias);
  });

  it("keeps aliases stable across processes", async () => {
    const alias = await remember(marta);
    const env = { PSEUDONYM_STORAGE: "plain" };
    const cli = await runScript("src/cli.ts", ["remember", "--service", service, "--name", "Marta Quiroga", "--email", "marta.q@school.test"], home, undefined, env);
    assert.equal(cli.stdout, `${alias}\n`, cli.stderr);
    assert.match((await runScript("src/cli.ts", ["whois", alias], home, undefined, env)).stdout, /^Marta Quiroga/);
    assert.deepEqual(files(home), ["directory.json"]);
  });

  it("loses nothing when two processes remember at once", async () => {
    const env = { PSEUDONYM_STORAGE: "plain" };
    await Promise.all([runScript("test/helpers/remember.ts", ["a", "15"], home, undefined, env), runScript("test/helpers/remember.ts", ["b", "15"], home, undefined, env)]);
    assert.equal((await peopleIn(service)).length, 30);
    assert.deepEqual(files(home), ["directory.json"]);
  });

  it("has no key: keyFingerprint and pseudonym key refuse", async () => {
    await assert.rejects(keyFingerprint(), (error: unknown) => error instanceof PseudonymError && /plain/.test(error.message));
    const result = await runScript("src/cli.ts", ["key", "fingerprint"], home, undefined, { PSEUDONYM_STORAGE: "plain" });
    assert.equal(result.status, 1);
    assert.match(result.stderr, /no key/);
    assert.deepEqual(files(home), []);
  });

  it("refuses a corrupt or foreign file without touching it", async () => {
    writeFileSync(path.join(home, "directory.json"), "{ not json");
    await assert.rejects(remember(marta), PseudonymError);
    writeFileSync(path.join(home, "directory.json"), JSON.stringify({ format: "something-else", entries: [] }));
    await assert.rejects(whois("A-000000"), PseudonymError);
    assert.equal(readFileSync(path.join(home, "directory.json"), "utf8"), JSON.stringify({ format: "something-else", entries: [] }));
  });
});

describe("storage configuration", () => {
  let home: string;
  beforeEach(() => {
    home = useTempHome();
  });
  afterEach(() => {
    delete process.env.PSEUDONYM_STORAGE;
    configure({});
  });

  it("is encrypted by default, configure() overrides the environment, and unknown values are refused", () => {
    assert.equal(storageMode(), "encrypted");
    process.env.PSEUDONYM_STORAGE = "plain";
    assert.equal(storageMode(), "plain");
    configure({ storage: "encrypted" });
    assert.equal(storageMode(), "encrypted");
    assert.throws(() => configure({ storage: "zip" as "plain" }), PseudonymError);
    configure({});
    process.env.PSEUDONYM_STORAGE = "zip";
    assert.throws(() => storageMode(), PseudonymError);
  });

  it("never switches: a folder holding the other mode's directory is an error, untouched", async () => {
    configure({ storage: "plain" });
    await remember(marta);
    const before = readFileSync(path.join(home, "directory.json"));
    configure({ storage: "encrypted" });
    await assert.rejects(remember(marta), (error: unknown) => error instanceof PseudonymError && /PSEUDONYM_STORAGE=plain/.test(error.message));
    assert.deepEqual(files(home), ["directory.json"]);
    assert.deepEqual(readFileSync(path.join(home, "directory.json")), before);

    const other = useTempHome();
    await remember(marta);
    configure({ storage: "plain" });
    await assert.rejects(whois("A-000000"), (error: unknown) => error instanceof PseudonymError && /migrate --to plain/.test(error.message));
    writeFileSync(path.join(other, "directory.json"), "{}");
    configure({});
    await assert.rejects(whois("A-000000"), (error: unknown) => error instanceof PseudonymError && /both/.test(error.message));
  });
});

describe("migrate", () => {
  let home: string;
  beforeEach(() => {
    home = useTempHome();
  });
  afterEach(() => {
    delete process.env.PSEUDONYM_STORAGE;
    configure({});
  });

  it("turns an encrypted directory into a plain one with the same aliases, keeping the original", async () => {
    const [a, b] = await remember([marta, { service, identifiers: { email: "hugo@school.test" }, displayName: "Hugo Estrella" }]);
    const result = await migrate("plain");
    assert.deepEqual({ people: result.people, lostMatchers: result.lostMatchers, unmatchable: result.unmatchable }, { people: 2, lostMatchers: 2, unmatchable: 1 });
    assert.ok(existsSync(result.backup));
    assert.ok(!existsSync(path.join(home, "directory.enc")));
    configure({ storage: "plain" });
    assert.equal((await whois(a!))?.displayName, "Marta Quiroga");
    assert.equal(await resolve(a!, { service }), "u-1");
    assert.equal(await remember({ ...marta, identifiers: { serviceUserId: "u-1" } }), a);
    assert.equal((await whois(b!))?.displayName, "Hugo Estrella");
  });

  it("turns a plain directory into an encrypted one, matching by email again", async () => {
    configure({ storage: "plain" });
    const alias = await remember(marta);
    configure({});
    const result = await migrate("encrypted");
    assert.equal(result.people, 1);
    assert.ok(existsSync(result.backup));
    assert.equal(await remember({ ...marta, identifiers: { email: "marta.q@school.test" } }), alias);
    assert.ok(existsSync(path.join(home, "key")));
  });

  it("refuses when there is nothing to convert or the target exists", async () => {
    await assert.rejects(migrate("plain"), /no encrypted directory/);
    await remember(marta);
    writeFileSync(path.join(home, "directory.json"), "{}");
    await assert.rejects(migrate("plain"), /already exists/);
    assert.ok(existsSync(path.join(home, "directory.enc")));
  });

  it("asks to confirm on the command line, and says what to set next", async () => {
    await remember(marta);
    const refused = await runScript("src/cli.ts", ["migrate", "--to", "plain"], home);
    assert.equal(refused.status, 1);
    assert.match(refused.stderr, /--yes/);
    assert.ok(existsSync(path.join(home, "directory.enc")));
    const done = await runScript("src/cli.ts", ["migrate", "--to", "plain", "--yes"], home);
    assert.equal(done.status, 0, done.stderr);
    assert.match(done.stdout, /Converted 1 person to plain storage/);
    assert.match(done.stderr, /PSEUDONYM_STORAGE=plain/);
    assert.ok(existsSync(path.join(home, "directory.json")));
  });
});
