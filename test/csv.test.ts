import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { csvLine, parseCsv } from "../src/csv.js";

describe("csv", () => {
  it("reads plain rows, with their line numbers", () => {
    assert.deepEqual(parseCsv("a,b\n1,2\n"), [
      { line: 1, fields: ["a", "b"] },
      { line: 2, fields: ["1", "2"] },
    ]);
  });

  it("reads quoted fields with commas, doubled quotes and line breaks", () => {
    const rows = parseCsv('name,note\r\n"Pérez, Ana","says ""hi""\r\nand bye"\r\nHugo,\r\n');
    assert.deepEqual(rows, [
      { line: 1, fields: ["name", "note"] },
      { line: 2, fields: ["Pérez, Ana", 'says "hi"\r\nand bye'] },
      { line: 4, fields: ["Hugo", ""] },
    ]);
  });

  it("skips a byte order mark and empty lines, and reads a last line without a break", () => {
    assert.deepEqual(parseCsv("﻿a\n\nb"), [
      { line: 1, fields: ["a"] },
      { line: 3, fields: ["b"] },
    ]);
  });

  it("writes what it reads", () => {
    const fields = ["Pérez, Ana", 'says "hi"', "two\nlines", "plain"];
    assert.equal(csvLine(fields), '"Pérez, Ana","says ""hi""","two\nlines",plain');
    assert.deepEqual(parseCsv(csvLine(fields))[0]?.fields, fields);
  });
});
