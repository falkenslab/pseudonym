import assert from "node:assert/strict";
import { existsSync, readdirSync, readFileSync, unlinkSync } from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";
import { remember } from "../src/directory.js";
import { runScript, useTempHome } from "./helpers/home.js";

const service = "moodle@campus.example.org";
const cli = (home: string, args: string[], input?: string) => runScript("src/cli.ts", args, home, input);
const ana = { service, identifiers: { email: "ana@school.test", serviceUserId: "7" }, displayName: "Ana Pérez" };

describe("pseudonym CLI", () => {
  it("prints its usage", async () => {
    const result = await cli(useTempHome(), ["help"]);
    assert.equal(result.status, 0);
    assert.match(result.stdout, /pseudonym <command>/);
  });

  it("explains an unknown command on stderr, with a failing exit code", async () => {
    const result = await cli(useTempHome(), ["nope"]);
    assert.equal(result.status, 1);
    assert.match(result.stderr, /Unknown command "nope"/);
    assert.equal(result.stdout, "");
  });

  it("says who an alias is, from another process, and exits 2 for an unknown one", async () => {
    const home = useTempHome();
    const alias = await remember(ana);
    const found = await cli(home, ["whois", alias.toLowerCase()]);
    assert.equal(found.status, 0);
    assert.match(found.stdout, /^Ana Pérez\n/);
    assert.match(found.stdout, new RegExp(service));
    const unknown = await cli(home, ["whois", "A-000000"]);
    assert.equal(unknown.status, 2);
    assert.equal(unknown.stdout, "");
  });

  it("finds aliases by name, ignoring case and accents", async () => {
    const home = useTempHome();
    const alias = await remember(ana);
    const found = await cli(home, ["alias", "ana", "perez"]);
    assert.equal(found.status, 0);
    assert.match(found.stdout, new RegExp(`^${alias}  Ana Pérez  \\(${service}\\)`));
    assert.equal((await cli(home, ["alias", "Lucía"])).status, 2);
  });

  it("lists a service's people as CSV on stdout, with a warning on stderr", async () => {
    const home = useTempHome();
    const [a, b] = await remember([ana, { service, identifiers: { email: "x@school.test" }, displayName: 'Pérez, "Ana"' }]);
    const result = await cli(home, ["aliases", "--service", service]);
    assert.equal(result.status, 0);
    assert.equal(result.stdout, `alias,name\n${a},Ana Pérez\n${b},"Pérez, ""Ana"""\n`);
    assert.match(result.stderr, /names in clear/);
    assert.deepEqual(readdirSync(home).filter((file) => file.endsWith(".csv")), []);
  });

  it("links and forgets, and exits 2 for unknown aliases", async () => {
    const home = useTempHome();
    const a = await remember(ana);
    const b = await remember({ ...ana, service: "mail@school.test" });
    assert.equal((await cli(home, ["link", a, "A-000000"])).status, 2);
    assert.equal((await cli(home, ["link", a, b])).status, 0);
    assert.match((await cli(home, ["whois", b])).stdout, new RegExp(`alias ${a}`));
    assert.equal((await cli(home, ["forget", a])).status, 0);
    assert.equal((await cli(home, ["forget", a])).status, 2);
  });

  it("prunes by age, and refuses an age it can't read", async () => {
    const home = useTempHome();
    await remember(ana);
    const kept = await cli(home, ["prune", "--older-than", "30d"]);
    assert.equal(kept.status, 0);
    assert.match(kept.stdout, /Removed 0 people/);
    assert.equal((await cli(home, ["prune", "--older-than", "soon"])).status, 1);
  });

  it("moves the key: export, then import on an empty folder gives the same fingerprint and aliases", async () => {
    const first = useTempHome();
    const alias = await remember(ana);
    const exported = await cli(first, ["key", "export"]);
    assert.equal(exported.status, 0);
    assert.match(exported.stderr, /whoever has it/);
    const key = exported.stdout.trim();
    assert.equal(Buffer.from(key, "base64").length, 32);

    const second = useTempHome();
    assert.equal((await cli(second, ["key", "fingerprint"])).status, 2);
    const imported = await cli(second, ["key", "import"], `${key}\n`);
    assert.equal(imported.status, 0, imported.stderr);
    assert.equal((await cli(second, ["key", "fingerprint"])).stdout, (await cli(first, ["key", "fingerprint"])).stdout);
    assert.equal(await remember(ana), alias);
    for (const output of [imported.stdout, imported.stderr]) assert.ok(!output.includes(key));
  });

  it("brings a lost key back with key import, and the directory with it", async () => {
    const home = useTempHome();
    const alias = await remember(ana);
    const key = (await cli(home, ["key", "export"])).stdout;
    unlinkSync(path.join(home, "key"));
    assert.equal((await cli(home, ["whois", alias])).status, 1);
    assert.equal((await cli(home, ["key", "import"], key)).status, 0);
    assert.match((await cli(home, ["whois", alias])).stdout, /^Ana Pérez/);
  });

  it("refuses to replace a different key without --force, and keeps the old directory with it", async () => {
    const home = useTempHome();
    await remember(ana);
    const before = (await cli(home, ["key", "fingerprint"])).stdout;
    const directory = readFileSync(path.join(home, "directory.enc"));
    const other = Buffer.alloc(32, 7).toString("base64");

    const refused = await cli(home, ["key", "import"], other);
    assert.equal(refused.status, 1);
    assert.match(refused.stderr, /--force/);
    assert.equal((await cli(home, ["key", "fingerprint"])).stdout, before);

    const forced = await cli(home, ["key", "import", "--force"], other);
    assert.equal(forced.status, 0, forced.stderr);
    assert.notEqual((await cli(home, ["key", "fingerprint"])).stdout, before);
    assert.ok(!existsSync(path.join(home, "directory.enc")));
    const backups = readdirSync(home).filter((file) => file.endsWith(".bak"));
    assert.equal(backups.length, 1);
    assert.deepEqual(readFileSync(path.join(home, backups[0]!)), directory);
  });

  it("never takes the key as an argument, nor echoes it in an error", async () => {
    const home = useTempHome();
    const key = Buffer.alloc(32, 9).toString("base64");
    const result = await cli(home, ["key", "import", key]);
    assert.equal(result.status, 1);
    assert.match(result.stderr, /stdin/);
    assert.ok(!result.stderr.includes(key));
    assert.equal((await cli(home, ["key", "import"], "not a key")).status, 1);
  });
});
