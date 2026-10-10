import assert from "node:assert/strict";
import { writeFileSync } from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";
import { remember } from "../src/directory.js";
import { decodeText } from "../src/encoding.js";
import { runScript, useTempHome } from "./helpers/home.js";

// "Esta librería la hizo Fran Vargas: ñ, Á, ü." in three single-byte encodings.
const TEXT = "Esta librería la hizo Fran Vargas: ñ, Á, ü.";
const CP850 = Buffer.from(TEXT.replace("í", "\xa1").replace("ñ", "\xa4").replace("Á", "\xb5").replace("ü", "\x81"), "latin1");
const CP437_IN = Buffer.from("caf\x82 \xa4 \xe0", "latin1"); // café ñ α
const WIN1252 = Buffer.from(TEXT, "latin1"); // Latin-1 and Windows-1252 agree on these letters

describe("decodeText", () => {
  it("keeps valid UTF-8, dropping a byte order mark", () => {
    assert.deepEqual(decodeText(Buffer.from(TEXT)), { text: TEXT, encoding: "utf-8" });
    assert.equal(decodeText(Buffer.concat([Buffer.from([0xef, 0xbb, 0xbf]), Buffer.from(TEXT)])).text, TEXT);
  });

  it("decodes the console's OEM code pages", () => {
    assert.deepEqual(decodeText(CP850, 850), { text: TEXT, encoding: "code page 850" });
    assert.equal(decodeText(CP437_IN, 437).text, "café ñ α");
  });

  it("falls back to Windows-1252 for files and unknown code pages", () => {
    assert.deepEqual(decodeText(WIN1252), { text: TEXT, encoding: "Windows-1252" });
    assert.equal(decodeText(WIN1252, 1252).text, TEXT);
    assert.equal(decodeText(Buffer.from([0x80]), 932).text, "€");
  });

  it("only asks for the code page when the bytes aren't UTF-8", () => {
    let asked = 0;
    decodeText(Buffer.from(TEXT), () => ++asked);
    assert.equal(asked, 0);
    assert.equal(decodeText(CP850, () => 850).text, TEXT);
  });
});

describe("CLI input that isn't UTF-8", () => {
  it("reads a Windows-1252 file and says so, with no replacement characters", async () => {
    const home = useTempHome();
    await remember({ service: "default", identifiers: { email: "fran@school.test" }, displayName: "Fran Vargas" });
    const file = path.join(home, "ansi.txt");
    writeFileSync(file, WIN1252);
    const result = await runScript("src/cli.ts", ["redact", file], home);
    assert.equal(result.status, 0, result.stderr);
    assert.match(result.stdout, /^Esta librería la hizo A-\w+: ñ, Á, ü\.$/);
    assert.match(result.stderr, /isn't UTF-8: read it as Windows-1252/);
  });

  it("reads piped bytes that aren't UTF-8 without replacement characters", async () => {
    const home = useTempHome();
    const result = await runScript("src/cli.ts", ["redact"], home, CP850);
    assert.equal(result.status, 0, result.stderr);
    assert.ok(!result.stdout.includes("�"), result.stdout);
    assert.match(result.stderr, /isn't UTF-8/);
  });
});
