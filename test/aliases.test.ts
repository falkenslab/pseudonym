import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import { describe, it } from "node:test";
import { ALIAS_PATTERN, aliasFor, base32, linkingOn, normalizeIdentifiers } from "../src/aliases.js";
import { PseudonymError } from "../src/errors.js";

const key = randomBytes(32);
const moodle = "moodle@campus.example.org";
const alias = (identifiers: Parameters<typeof normalizeIdentifiers>[0], service = moodle, link = false, k = key) => {
  const [best] = normalizeIdentifiers(identifiers);
  assert.ok(best);
  return aliasFor(k, service, best, link);
};

describe("aliases", () => {
  it("has the documented shape", () => {
    assert.match(alias({ email: "ana@school.test" }), ALIAS_PATTERN);
    assert.equal(alias({ email: "ana@school.test" }).length, 8);
  });

  it("is stable for the same key, and differs with another key", () => {
    assert.equal(alias({ email: "ana@school.test" }), alias({ email: "ana@school.test" }));
    assert.notEqual(alias({ email: "ana@school.test" }), alias({ email: "ana@school.test" }, moodle, false, randomBytes(32)));
  });

  it("is per service unless linking is on", () => {
    assert.notEqual(alias({ email: "ana@school.test" }, moodle), alias({ email: "ana@school.test" }, "mail@school.test"));
    assert.equal(alias({ email: "ana@school.test" }, moodle, true), alias({ email: "ana@school.test" }, "mail@school.test", true));
  });

  it("ignores the email's case and surrounding spaces", () => {
    assert.equal(alias({ email: "  Ana@School.TEST " }), alias({ email: "ana@school.test" }));
  });

  it("ignores the institutional id's case, spaces and hyphens", () => {
    const expected = alias({ institutionalId: "12345678Z" });
    for (const form of ["12345678z", "12345678-Z", "12345678 Z", " 12345678-z "]) assert.equal(alias({ institutionalId: form }), expected);
  });

  it("uses the strongest identifier present, and its kind", () => {
    assert.equal(alias({ institutionalId: "X1", email: "ana@school.test", serviceUserId: "7" }), alias({ institutionalId: "X1" }));
    assert.equal(alias({ email: "ana@school.test", serviceUserId: "7" }), alias({ email: "ana@school.test" }));
    assert.notEqual(alias({ institutionalId: "7" }), alias({ serviceUserId: "7" }));
  });

  it("refuses a person without identifiers, without echoing anything", () => {
    assert.throws(() => normalizeIdentifiers({ email: "  " }), PseudonymError);
  });

  it("lengthens by extending the same prefix", () => {
    const [best] = normalizeIdentifiers({ email: "ana@school.test" });
    assert.ok(best);
    assert.ok(aliasFor(key, moodle, best, false, 7).startsWith(aliasFor(key, moodle, best, false)));
  });

  it("reads PSEUDONYM_LINK only when the caller doesn't say", () => {
    process.env.PSEUDONYM_LINK = "true";
    assert.equal(linkingOn(), true);
    assert.equal(linkingOn(false), false);
    delete process.env.PSEUDONYM_LINK;
    assert.equal(linkingOn(), false);
  });

  it("encodes base32 in Crockford's alphabet", () => {
    assert.equal(base32(Buffer.from([0, 0, 0, 0, 0]), 8), "00000000");
    assert.equal(base32(Buffer.from([0xff, 0xff, 0xff, 0xff, 0xff]), 8), "ZZZZZZZZ");
    assert.equal(base32(Buffer.from([0x08, 0x42, 0x10, 0x84, 0x21]), 8), "11111111");
  });
});
