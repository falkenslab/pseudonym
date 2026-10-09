import assert from "node:assert/strict";
import { readFileSync, statSync, unlinkSync, writeFileSync } from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";
import { PseudonymError } from "../src/errors.js";
import { homeDir, loadKey } from "../src/home.js";
import { keyFingerprint } from "../src/index.js";
import { runScript, useTempHome } from "./helpers/home.js";

describe("home", () => {
  it("takes the folder from PSEUDONYM_HOME", () => {
    const dir = useTempHome();
    assert.equal(homeDir(), path.resolve(dir));
  });

  it("creates a 32-byte key on first use and keeps it", async () => {
    const dir = useTempHome();
    const key = await loadKey();
    assert.equal(key.length, 32);
    assert.deepEqual(await loadKey(), key);
    assert.deepEqual(readFileSync(path.join(dir, "key")), key);
  });

  it("makes the folder and the key readable by the user only", { skip: process.platform === "win32" && "%APPDATA% is already per user" }, async () => {
    const dir = useTempHome();
    await loadKey();
    assert.equal(statSync(dir).mode & 0o077, 0);
    assert.equal(statSync(path.join(dir, "key")).mode & 0o777, 0o600);
  });

  it("refuses to work when the key is gone after use, and regenerates nothing", async () => {
    const dir = useTempHome();
    await loadKey();
    unlinkSync(path.join(dir, "key"));
    await assert.rejects(loadKey(), (error: unknown) => error instanceof PseudonymError && /key import/.test(error.message));
    await assert.rejects(keyFingerprint(), PseudonymError);
  });

  it("refuses a damaged key without revealing it", async () => {
    const dir = useTempHome();
    writeFileSync(path.join(dir, "key"), "not a key");
    await assert.rejects(loadKey(), (error: unknown) => error instanceof PseudonymError && !error.message.includes("not a key"));
  });

  it("gives a fingerprint of 8 base32 characters that doesn't contain the key", async () => {
    useTempHome();
    const fingerprint = await keyFingerprint();
    assert.match(fingerprint, /^[0-9A-HJKMNP-TV-Z]{8}$/);
    assert.equal(await keyFingerprint(), fingerprint);
    assert.ok(!(await loadKey()).toString("base64").includes(fingerprint));
  });

  it("gives the same alias in two processes with the same folder, and another with another folder", async () => {
    const dir = useTempHome();
    const args = ["moodle@campus.example.org", "ana@school.test"];
    const [first, second] = await Promise.all([runScript("test/helpers/alias.ts", args, dir), runScript("test/helpers/alias.ts", args, dir)]);
    assert.equal(first.stderr, "");
    assert.match(first.stdout, /^A-\w{6}\n$/);
    assert.equal(first.stdout, second.stdout);
    const other = await runScript("test/helpers/alias.ts", args, useTempHome());
    assert.notEqual(other.stdout, first.stdout);
  });

  it("ends with one key when several processes create it at once", async () => {
    const dir = useTempHome();
    const runs = await Promise.all(Array.from({ length: 10 }, () => runScript("test/helpers/alias.ts", ["s", "ana@school.test"], dir)));
    for (const run of runs) assert.equal(run.stderr, "");
    assert.equal(new Set(runs.map((run) => run.stdout)).size, 1);
  });
});
