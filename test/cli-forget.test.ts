import assert from "node:assert/strict";
import { beforeEach, describe, it } from "node:test";
import { remember, resolve, whois } from "../src/directory.js";
import { runScript, useTempHome } from "./helpers/home.js";

const moodle = "moodle@campus.example.org";
const mail = "mail@school.test";
const cli = (home: string, args: string[], input?: string) => runScript("src/cli.ts", args, home, input);

describe("pseudonym forget --service / --all", () => {
  let home: string;
  beforeEach(() => {
    home = useTempHome();
  });

  it("forgets people met only in a service, and keeps those also met elsewhere without its id", async () => {
    const [onlyMoodle, both] = await remember([
      { service: moodle, identifiers: { serviceUserId: "1" }, displayName: "Marta Quiroga" },
      { service: moodle, identifiers: { email: "hugo@school.test", serviceUserId: "2" }, displayName: "Hugo Estrella", link: true },
    ]);
    const inMail = await remember({ service: mail, identifiers: { email: "hugo@school.test", serviceUserId: "h" }, displayName: "Hugo Estrella", link: true });
    const other = await remember({ service: mail, identifiers: { serviceUserId: "x" }, displayName: "Irene Valbuena" });
    assert.equal(inMail, both);

    const result = await cli(home, ["forget", "--service", moodle, "--yes"]);
    assert.equal(result.status, 0, result.stderr);
    assert.match(result.stdout, /removed 1 person; 1 person also met in other services kept/);
    assert.equal(await whois(onlyMoodle!), undefined);
    assert.equal((await whois(both!))?.displayName, "Hugo Estrella");
    await assert.rejects(resolve(both!, { service: moodle }));
    assert.equal(await resolve(both!, { service: mail }), "h");
    assert.equal((await whois(other))?.displayName, "Irene Valbuena");
    assert.doesNotMatch((await cli(home, ["services"])).stdout, /moodle/);
  });

  it("forgets everyone, keeps the key, and gives the same alias to someone met again", async () => {
    const person = { service: moodle, identifiers: { email: "marta@school.test" }, displayName: "Marta Quiroga" };
    const alias = await remember(person);
    const before = (await cli(home, ["key", "fingerprint"])).stdout;
    const result = await cli(home, ["forget", "--all", "--yes"]);
    assert.equal(result.status, 0, result.stderr);
    assert.match(result.stdout, /Forgot 1 person/);
    assert.equal((await cli(home, ["services"])).stdout, "");
    assert.equal((await cli(home, ["key", "fingerprint"])).stdout, before);
    assert.equal(await remember(person), alias);
  });

  it("changes nothing without --yes when not on a terminal", async () => {
    const alias = await remember({ service: moodle, identifiers: { serviceUserId: "1" }, displayName: "Marta Quiroga" });
    for (const args of [["forget", "--service", moodle], ["forget", "--all"]]) {
      const result = await cli(home, args);
      assert.equal(result.status, 1);
      assert.match(result.stderr, /--yes/);
    }
    assert.equal((await whois(alias))?.displayName, "Marta Quiroga");
  });

  it("exits 2 for a service it doesn't know, and refuses mixed modes", async () => {
    assert.equal((await cli(home, ["forget", "--service", "nope", "--yes"])).status, 2);
    assert.equal((await cli(home, ["forget", "A-000000", "--all", "--yes"])).status, 1);
    assert.equal((await cli(home, ["forget"])).status, 1);
  });

  it("still forgets one alias", async () => {
    const alias = await remember({ service: moodle, identifiers: { serviceUserId: "1" }, displayName: "Marta Quiroga" });
    assert.equal((await cli(home, ["forget", alias])).status, 0);
    assert.equal((await cli(home, ["forget", alias])).status, 2);
  });
});
