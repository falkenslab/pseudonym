import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { PseudonymError } from "../src/errors.js";
import { luhn, mod97 } from "../src/patterns.js";
import { redact } from "../src/redact.js";
import { buildDataset } from "./fixtures/spanish-texts.js";
import { fixtures, generators } from "./fixtures/country-texts.js";
import type { Country } from "../src/patterns.js";
import { useTempHome } from "./helpers/home.js";

const service = "classroom@example-school.test";
const spike = buildDataset();

describe("redact, by country", () => {
  useTempHome();

  for (const fixture of fixtures()) {
    it(`${fixture.name}: removes every expected value with its countries enabled`, async () => {
      for (const sample of fixture.samples) {
        const { text } = await redact(sample.text, { service, countries: fixture.countries });
        for (const entity of sample.entities) {
          assert.ok(!text.includes(entity.value), `${sample.id}: ${entity.kind} ${entity.value} survived in "${text}"`);
          // A German health insurance number can also pass as an id card number: either label is right.
          const kind = entity.kind === "DE_KVNR" || entity.kind === "DE_IDCARD" ? "DE_(?:KVNR|IDCARD)" : entity.kind;
          assert.match(text, new RegExp(`\\[${kind}_\\d+\\]`), `${sample.id}: no [${entity.kind}_n] placeholder in "${text}"`);
        }
      }
    });

    it(`${fixture.name}: leaves texts without personal data unchanged`, async () => {
      for (const clean of fixture.clean) {
        assert.equal((await redact(clean, { service, countries: fixture.countries })).text, clean);
      }
    });
  }

  it("leaves other countries' ids alone with the default, but not cards and IBANs", async () => {
    for (const fixture of fixtures().filter((f) => !f.countries.includes("ES"))) {
      for (const sample of fixture.samples) {
        const { text } = await redact(sample.text, { service });
        for (const entity of sample.entities) {
          const universal = entity.kind === "CARD" || entity.kind === "IBAN";
          assert.equal(text.includes(entity.value), !universal, `${sample.id}: ${entity.kind} with the default countries`);
        }
      }
    }
  });

  it("keeps the spike's results with the default countries", async () => {
    for (const sample of spike) {
      const before = await redact(sample.text, { service, countries: ["ES"] });
      const byDefault = await redact(sample.text, { service });
      assert.equal(byDefault.text, before.text);
    }
  });

  it("doesn't touch the spike's texts without personal data with every country on", async () => {
    const all = ["ES", "US", "CA", "DE", "MX", "CL", "AR", "BR", "PT"] as const;
    let changed = 0;
    for (const sample of spike.filter((s) => s.entities.length === 0)) {
      if ((await redact(sample.text, { service, countries: all })).text !== sample.text) changed++;
    }
    assert.ok(changed <= 1, `${changed} clean texts changed`);
  });

  it("counts cards apart, and national ids in ids", async () => {
    const { replaced } = await redact("4111 1111 1111 1111 and SSN 123-45-6789", { service, countries: ["US"] });
    assert.equal(replaced.cards, 1);
    assert.equal(replaced.ids, 1);
  });

  it("gives a value written two ways one placeholder", async () => {
    const { text } = await redact("4111 1111 1111 1111 or 4111-1111-1111-1111", { service });
    assert.equal(text, "[CARD_1] or [CARD_1]");
  });

  it("refuses an unknown country without echoing anything else", async () => {
    await assert.rejects(redact("text", { service, countries: ["XX" as "ES"] }), (error: unknown) => error instanceof PseudonymError && /"XX"/.test(error.message));
    assert.equal((await redact("SSN 123-45-6789", { service, countries: ["us"] })).text, "SSN [US_SSN_1]");
  });

  it("checks with Luhn and mod 97 as specified", () => {
    assert.equal(luhn("4111111111111111"), true);
    assert.equal(luhn("4111111111111112"), false);
    assert.equal(mod97("GB82WEST12345698765432"), true);
    assert.equal(mod97("GB82WEST12345698765433"), false);
  });
});

describe("redact, generated values", () => {
  useTempHome();

  // Hundreds of values per kind from other seeds, so rare check digits (a RUT ending in K, a CUIT or NIF whose
  // remainder maps to 0) are covered too.
  const kinds: { kind: string; countries: Country[]; make: (g: ReturnType<typeof generators>, i: number) => string }[] = [
    { kind: "CARD", countries: ["ES"], make: (g, i) => g.card(["4", "51", "37", "6011"][i % 4]!, i % 4 === 2 ? 15 : 16, i % 4 === 2 ? [4, 6, 5] : [4, 4, 4, 4], i % 2 ? " " : "-") },
    { kind: "IBAN", countries: ["ES"], make: (g, i) => (i % 2 ? g.iban("DE", g.digits(18), true) : g.iban("GB", `NWBK${g.digits(14)}`, false)) },
    { kind: "ES_NSS", countries: ["ES"], make: (g) => g.nss() },
    { kind: "US_SSN", countries: ["US"], make: (g) => g.ssn() },
    { kind: "US_ITIN", countries: ["US"], make: (g) => g.itin() },
    { kind: "CA_SIN", countries: ["CA"], make: (g, i) => g.sin(i % 2 ? " " : "-") },
    { kind: "PHONE", countries: ["US"], make: (g, i) => g.nanp(i) },
    { kind: "DE_TAXID", countries: ["DE"], make: (g) => g.steuerId() },
    { kind: "DE_SVNR", countries: ["DE"], make: (g) => g.svnr() },
    { kind: "DE_KVNR", countries: ["DE"], make: (g) => g.kvnr() },
    { kind: "MX_CURP", countries: ["MX"], make: (g) => g.curp() },
    { kind: "CL_RUT", countries: ["CL"], make: (g) => g.rut() },
    { kind: "AR_CUIT", countries: ["AR"], make: (g) => g.cuit() },
    { kind: "BR_CPF", countries: ["BR"], make: (g) => g.cpf() },
    { kind: "PT_NIF", countries: ["PT"], make: (g) => g.nif() },
  ];

  for (const { kind, countries, make } of kinds) {
    it(`finds every generated ${kind}`, async () => {
      const g = generators(kind.length * 7919);
      for (let i = 0; i < 300; i++) {
        const value = make(g, i);
        const { text } = await redact(`value: ${value}.`, { service, countries });
        assert.ok(!text.includes(value), `${kind} ${value} survived: "${text}"`);
      }
    });
  }
});
