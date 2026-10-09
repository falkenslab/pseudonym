import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { describe, it } from "node:test";

const cli = (...args: string[]) => spawnSync(process.execPath, ["--import", "tsx", "src/cli.ts", ...args], { encoding: "utf8" });

describe("pseudonym CLI", () => {
  it("prints its usage", () => {
    const result = cli("help");
    assert.equal(result.status, 0);
    assert.match(result.stdout, /pseudonym <command>/);
  });

  it("explains an unknown command on stderr, with a failing exit code", () => {
    const result = cli("nope");
    assert.equal(result.status, 1);
    assert.match(result.stderr, /Unknown command "nope"/);
    assert.equal(result.stdout, "");
  });
});
