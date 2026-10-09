import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { remember } from "../src/directory.js";
import { redact } from "../src/redact.js";
import { buildDataset, NAMES } from "./fixtures/spanish-texts.js";
import { useTempHome } from "./helpers/home.js";

const service = "moodle@campus.example.org";
// Once per process: the fixture's seed advances with every call.
const dataset = buildDataset();

async function meet(...names: string[]): Promise<string[]> {
  return remember(names.map((displayName, n) => ({ service, identifiers: { serviceUserId: String(n) }, displayName })));
}

describe("redact", () => {
  it("removes every expected name, email, phone, DNI, NIE and IBAN from the spike's texts", async () => {
    useTempHome();
    await meet(...NAMES);
    let changedWithoutData = 0;
    for (const sample of dataset) {
      const { text } = await redact(sample.text, { service });
      for (const entity of sample.entities) {
        // Addresses and birth dates are not detected (ADR-005): they must survive, documenting the gap.
        const shouldSurvive = entity.kind === "address" || entity.kind === "birthdate";
        assert.equal(text.includes(entity.value), shouldSurvive, `text ${sample.id}: ${entity.kind}`);
      }
      if (sample.entities.length === 0 && text !== sample.text) {
        changedWithoutData++;
        assert.match(sample.text, /600123456/, `text ${sample.id} changed`);
      }
    }
    assert.ok(changedWithoutData <= 1);
  });

  it("replaces full names ignoring case and accents, as whole words only", async () => {
    useTempHome();
    const [lucia, ana] = await meet("Lucía Martín", "Ana Pérez");
    assert.equal((await redact("Hablé con LUCÍA martin ayer.", { service })).text, `Hablé con ${lucia} ayer.`);
    assert.equal((await redact("Me gusta la banana y la Anaconda.", { service })).text, "Me gusta la banana y la Anaconda.");
    assert.equal((await redact("Ana Pérez, Ana y anapérez.", { service })).text, `${ana}, ${ana} y anapérez.`);
  });

  it("prefers the longest name, and lets accented initials match", async () => {
    useTempHome();
    const [iker] = await meet("Íker Montalbán");
    assert.equal((await redact("Íker Montalbán e Íker.", { service })).text, `${iker} e ${iker}.`);
  });

  it("replaces a first name alone only when one person has it and it's capitalized", async () => {
    useTempHome();
    const [lucia, mar] = await meet("Lucía Martín", "Mar López");
    assert.equal((await redact("Como dijo Lucía, y lucía el sol.", { service })).text, `Como dijo ${lucia}, y lucía el sol.`);
    assert.equal((await redact("Mar fue al mar.", { service })).text, `${mar} fue al mar.`);
    useTempHome();
    await meet("Lucía Martín", "Lucía Gómez");
    assert.equal((await redact("Como dijo Lucía.", { service })).text, "Como dijo Lucía.");
  });

  it("leaves a full name shared by two people alone", async () => {
    useTempHome();
    await meet("Ana Pérez", "Ana Pérez");
    assert.equal((await redact("Ana Pérez entregó.", { service })).text, "Ana Pérez entregó.");
  });

  it("only knows the people of that service", async () => {
    useTempHome();
    await meet("Lucía Martín");
    assert.equal((await redact("Lucía Martín", { service: "mail@school.test" })).text, "Lucía Martín");
  });

  it("gives the same value the same placeholder, numbered per kind, and counts without values", async () => {
    useTempHome();
    const result = await redact("ana@correo.ficticio.es, ANA@correo.ficticio.es y luis@correo.ficticio.es; 612 345 678 o +34 612345678.", { service });
    assert.equal(result.text, "[EMAIL_1], [EMAIL_1] y [EMAIL_2]; [PHONE_1] o [PHONE_1].");
    assert.deepEqual(result.replaced, { names: 0, emails: 3, phones: 2, ids: 0, ibans: 0, cards: 0 });
  });

  it("checks DNI, NIE and IBAN check digits", async () => {
    useTempHome();
    const result = await redact("DNI 12345678Z, falso 12345678A, NIE X1234567L, IBAN ES91 2100 0418 4502 0005 1332, falso ES00 2100 0418 4502 0005 1332.", { service });
    assert.equal(result.text, "DNI [DNI_1], falso 12345678A, NIE [NIE_1], IBAN [IBAN_1], falso ES00 2100 0418 4502 0005 1332.");
    assert.deepEqual(result.replaced, { names: 0, emails: 0, phones: 0, ids: 2, ibans: 1, cards: 0 });
  });
});
