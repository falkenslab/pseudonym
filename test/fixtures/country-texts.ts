// Made-up texts in English, German, Spanish and Portuguese for the country patterns (ADR-008). Every id is
// generated here with a valid check digit by code written apart from src/patterns.ts, so a test doesn't confirm
// the implementation with its own arithmetic. Names, domains and numbers are invented; none is meant to be real.
// Each build function has its own seed: call it as many times as needed, it gives the same texts.

import type { Country } from "../../src/patterns.js";

export interface Entity {
  kind: string;
  value: string;
}
export interface Sample {
  id: string;
  text: string;
  /** Values that must be gone once the sample's countries are enabled. */
  entities: Entity[];
}
export interface Fixture {
  name: string;
  countries: Country[];
  samples: Sample[];
  /** Texts without personal data, look-alikes included: they must come out unchanged. */
  clean: string[];
}

function rng(seed: number) {
  return () => ((seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648);
}

export function generators(seed: number) {
  const rand = rng(seed);
  const int = (min: number, max: number) => min + Math.floor(rand() * (max - min + 1));
  const digits = (n: number) => Array.from({ length: n }, () => int(0, 9)).join("");
  const pick = <T>(list: readonly T[]) => list[int(0, list.length - 1)]!;

  const luhnDigit = (body: string) => {
    let sum = 0;
    for (let i = 0; i < body.length; i++) {
      let d = Number(body[body.length - 1 - i]);
      if (i % 2 === 0) d = d * 2 > 9 ? d * 2 - 9 : d * 2;
      sum += d;
    }
    return String((10 - (sum % 10)) % 10);
  };
  const group = (value: string, sizes: number[], sep: string) => {
    const parts: string[] = [];
    let at = 0;
    for (const size of sizes) {
      parts.push(value.slice(at, at + size));
      at += size;
    }
    return parts.join(sep);
  };

  return {
    int,
    digits,
    pick,
    card(prefix: string, length: number, sizes: number[], sep: string) {
      const body = prefix + digits(length - prefix.length - 1);
      return group(body + luhnDigit(body), sizes, sep);
    },
    iban(country: string, bban: string, spaced: boolean) {
      const toDigits = (s: string) => s.replace(/[A-Z]/g, (c) => String(c.charCodeAt(0) - 55));
      const rest = BigInt(toDigits(`${bban}${country}00`)) % 97n;
      const raw = `${country}${String(98n - rest).padStart(2, "0")}${bban}`;
      return spaced ? raw.replace(/(.{4})/g, "$1 ").trim() : raw;
    },
    nss() {
      const province = String(int(1, 52)).padStart(2, "0");
      const number = String(int(10_000_000, 99_999_999));
      const control = String(Number(`${province}${number}`) % 97).padStart(2, "0");
      return `${province}/${number}/${control}`;
    },
    ssn() {
      const area = pick([int(1, 665), int(667, 899)]);
      return `${String(area).padStart(3, "0")}-${String(int(1, 99)).padStart(2, "0")}-${String(int(1, 9999)).padStart(4, "0")}`;
    },
    itin() {
      return `9${digits(2)}-${int(70, 88)}-${String(int(1, 9999)).padStart(4, "0")}`;
    },
    sin(sep: string) {
      const body = `${pick(["1", "2", "3", "4", "5", "6", "7", "9"])}${digits(7)}`;
      return group(body + luhnDigit(body), [3, 3, 3], sep);
    },
    nanp(format: number) {
      const area = `${int(2, 9)}${digits(2)}`;
      const exchange = `${int(2, 9)}${digits(2)}`;
      const line = digits(4);
      return [`(${area}) ${exchange}-${line}`, `${area}-${exchange}-${line}`, `+1 ${area} ${exchange} ${line}`, `${area}.${exchange}.${line}`][format % 4]!;
    },
    steuerId() {
      // 10 digits, the first not 0, exactly one digit twice; then the ISO 7064 MOD 11,10 check digit.
      for (;;) {
        const pool = "0123456789".split("").sort(() => rand() - 0.5).slice(0, 9);
        const twice = pick(pool);
        const ten = [...pool, twice].sort(() => rand() - 0.5);
        if (ten[0] === "0") continue;
        let product = 10;
        for (const d of ten) {
          let sum = (Number(d) + product) % 10;
          if (sum === 0) sum = 10;
          product = (sum * 2) % 11;
        }
        const check = (11 - product) % 10;
        const all = ten.join("") + check;
        return `${all.slice(0, 2)} ${all.slice(2, 5)} ${all.slice(5, 8)} ${all.slice(8)}`;
      }
    },
    idCard() {
      const alphabet = "CFGHJKLMNPRTVWXYZ0123456789";
      const value = pick("CFGHJKLMNPRTVWXYZ".split("")) + Array.from({ length: 8 }, () => pick(alphabet.split(""))).join("");
      const v = (c: string) => (/\d/.test(c) ? Number(c) : c.charCodeAt(0) - 55);
      const sum = value.split("").reduce((acc, c, i) => acc + v(c) * [7, 3, 1][i % 3]!, 0);
      return value + (sum % 10);
    },
    svnr() {
      const area = String(int(10, 89));
      const birth = `${String(int(1, 28)).padStart(2, "0")}${String(int(1, 12)).padStart(2, "0")}${digits(2)}`;
      const letter = pick("ABCDEFGHIJKLMNOPRSTUVWZ".split(""));
      const serial = String(int(0, 49)).padStart(2, "0");
      const numbers = `${area}${birth}${String(letter.charCodeAt(0) - 64).padStart(2, "0")}${serial}`;
      const weights = [2, 1, 2, 5, 7, 1, 2, 1, 2, 1, 2, 1];
      const sum = numbers.split("").reduce((acc, d, i) => acc + String(Number(d) * weights[i]!).split("").reduce((a, x) => a + Number(x), 0), 0);
      return `${area} ${birth} ${letter} ${serial}${sum % 10}`;
    },
    kvnr() {
      const letter = pick("ABCDEFGHIJKLMNOPQRSTUVWXYZ".split(""));
      const body = digits(8);
      const numbers = `${String(letter.charCodeAt(0) - 64).padStart(2, "0")}${body}`;
      const sum = numbers.split("").reduce((acc, d, i) => acc + String(Number(d) * (i % 2 === 0 ? 1 : 2)).split("").reduce((a, x) => a + Number(x), 0), 0);
      return `${letter}${body}${sum % 10}`;
    },
    curp() {
      const consonants = "BCDFGHJKLMNPRSTVZ".split("");
      const head = `${pick(consonants)}${pick("AEIOU".split(""))}${pick(consonants)}${pick(consonants)}`;
      const birth = `${digits(2)}${String(int(1, 12)).padStart(2, "0")}${String(int(1, 28)).padStart(2, "0")}`;
      const body = `${head}${birth}${pick(["H", "M"])}${pick(["DF", "JC", "NL", "PL", "VZ"])}${pick(consonants)}${pick(consonants)}${pick(consonants)}0`;
      const chars = "0123456789ABCDEFGHIJKLMNÑOPQRSTUVWXYZ";
      const sum = body.split("").reduce((acc, c, i) => acc + chars.indexOf(c) * (18 - i), 0);
      return body + ((10 - (sum % 10)) % 10);
    },
    rut() {
      const body = String(int(5_000_000, 25_000_000));
      let sum = 0;
      for (let i = 0; i < body.length; i++) sum += Number(body[body.length - 1 - i]) * (2 + (i % 6));
      const dv = 11 - (sum % 11);
      const check = dv === 11 ? "0" : dv === 10 ? "K" : String(dv);
      return `${body.slice(0, -6)}.${body.slice(-6, -3)}.${body.slice(-3)}-${check}`;
    },
    cuit() {
      for (;;) {
        const first = `${pick(["20", "27", "30"])}${digits(8)}`;
        const sum = [5, 4, 3, 2, 7, 6, 5, 4, 3, 2].reduce((acc, w, i) => acc + Number(first[i]) * w, 0);
        const dv = 11 - (sum % 11);
        if (dv === 10) continue;
        return `${first.slice(0, 2)}-${first.slice(2)}-${dv === 11 ? 0 : dv}`;
      }
    },
    cpf() {
      const nine = digits(9);
      const d = (base: string) => ((base.split("").reduce((acc, x, i) => acc + Number(x) * (base.length + 1 - i), 0) * 10) % 11) % 10;
      const ten = nine + d(nine);
      const all = ten + d(ten);
      return `${all.slice(0, 3)}.${all.slice(3, 6)}.${all.slice(6, 9)}-${all.slice(9)}`;
    },
    nif() {
      const eight = `${pick(["1", "2"])}${digits(7)}`;
      const sum = eight.split("").reduce((acc, x, i) => acc + Number(x) * (9 - i), 0);
      const dv = 11 - (sum % 11);
      return eight + (dv >= 10 ? 0 : dv);
    },
  };
}

/** Texts a person in the United States or Canada might write. */
export function englishFixture(): Fixture {
  const g = generators(20261010);
  const samples: Sample[] = [];
  const add = (id: string, text: string, ...entities: Entity[]) => samples.push({ id, text, entities });
  for (let i = 0; i < 3; i++) {
    const v = g.ssn();
    add(`ssn-${i}`, `For the financial aid form, my SSN is ${v}.`, { kind: "US_SSN", value: v });
  }
  const itin = g.itin();
  add("itin", `I don't have an SSN yet, my ITIN is ${itin}.`, { kind: "US_ITIN", value: itin });
  for (let i = 0; i < 4; i++) {
    const v = g.nanp(i);
    add(`phone-${i}`, `Text me at ${v} if the group meets tomorrow.`, { kind: "PHONE", value: v });
  }
  for (const sep of [" ", "-"]) {
    const v = g.sin(sep);
    add(`sin${sep === " " ? "-space" : "-dash"}`, `My SIN is ${v}, for the co-op placement.`, { kind: "CA_SIN", value: v });
  }
  const visa = g.card("4", 16, [4, 4, 4, 4], " ");
  const amex = g.card("37", 15, [4, 6, 5], " ");
  add("cards", `Charge the field trip to ${visa}, or to my dad's Amex ${amex}.`, { kind: "CARD", value: visa }, { kind: "CARD", value: amex });
  const gb = g.iban("GB", `NWBK${g.digits(14)}`, true);
  add("iban-gb", `Refunds go to ${gb}, please.`, { kind: "IBAN", value: gb });
  return {
    name: "English (US, CA)",
    countries: ["US", "CA"],
    samples,
    clean: [
      "The lab is due 10/15/2026 at 11:59 pm; late work loses 10% a day.",
      "Run `npm install` then `npm test`: version 2.14.3 fixed the build on Node 20.",
      "for (let i = 0; i < 1000000; i++) total += i * 3.14159;",
      "Order 123-4567 shipped; tracking 1Z999AA10123456784.",
      "Invalid on purpose: SSN 666-12-3456, 000-45-6789 and 912-34-5678 are never issued.",
      "Card number 4111 1111 1111 1112 fails the Luhn check, so it isn't a card.",
      "The timestamp 1728547200000 is midnight UTC on October 10, 2024.",
      "ISBN 978-0-306-40615-7, chapter 3, page 212.",
    ],
  };
}

/** Texts a person in Germany might write. */
export function germanFixture(): Fixture {
  const g = generators(20261011);
  const samples: Sample[] = [];
  const add = (id: string, text: string, ...entities: Entity[]) => samples.push({ id, text, entities });
  for (let i = 0; i < 3; i++) {
    const v = g.steuerId();
    add(`taxid-${i}`, `Für das Praktikum brauche ich meine Steuer-ID: ${v}.`, { kind: "DE_TAXID", value: v });
  }
  for (let i = 0; i < 2; i++) {
    const v = g.idCard();
    add(`idcard-${i}`, `Meine Ausweisnummer ist ${v}, falls Sie sie brauchen.`, { kind: "DE_IDCARD", value: v });
  }
  for (let i = 0; i < 2; i++) {
    const v = g.svnr();
    add(`svnr-${i}`, `Sozialversicherungsnummer: ${v}`, { kind: "DE_SVNR", value: v });
  }
  for (let i = 0; i < 2; i++) {
    const v = g.kvnr();
    add(`kvnr-${i}`, `Meine Krankenversichertennummer lautet ${v}.`, { kind: "DE_KVNR", value: v });
  }
  const de = g.iban("DE", g.digits(18), true);
  const mc = g.card("52", 16, [4, 4, 4, 4], "-");
  add("money", `Bitte überweisen Sie auf ${de} oder belasten Sie meine Karte ${mc}.`, { kind: "IBAN", value: de }, { kind: "CARD", value: mc });
  return {
    name: "German (DE)",
    countries: ["DE"],
    samples,
    clean: [
      "Die Abgabe ist am 15.11.2026 um 23:59 Uhr, Raum 2.14.",
      "Rechnung Nr. 2026-0042 über 1.250,00 EUR, zahlbar bis 01.12.2026.",
      "Die Postleitzahl von Berlin-Mitte ist 10115.",
      "Ungültig mit Absicht: Steuer-ID 12 345 678 900 hat eine falsche Prüfziffer.",
      "def summe(n):\n    return n * (n + 1) // 2  # summe(100000) = 5000050000",
      "Version 3.10.2, Build 20261010, Commit 3f9a2c41e8b7.",
    ],
  };
}

/** Texts a person in Mexico, Chile, Argentina, Brazil or Portugal might write. */
export function latamFixture(): Fixture {
  const g = generators(20261012);
  const samples: Sample[] = [];
  const add = (id: string, text: string, ...entities: Entity[]) => samples.push({ id, text, entities });
  for (let i = 0; i < 2; i++) {
    const v = g.curp();
    add(`curp-${i}`, `Para la inscripción, mi CURP es ${v}.`, { kind: "MX_CURP", value: v });
  }
  for (let i = 0; i < 2; i++) {
    const v = g.rut();
    add(`rut-${i}`, `Profe, mi RUT es ${v}, por si lo pide la secretaría.`, { kind: "CL_RUT", value: v });
  }
  for (let i = 0; i < 2; i++) {
    const v = g.cuit();
    add(`cuit-${i}`, `Factura a nombre de mi CUIL ${v}.`, { kind: "AR_CUIT", value: v });
  }
  for (let i = 0; i < 2; i++) {
    const v = g.cpf();
    add(`cpf-${i}`, `Meu CPF é ${v}, para o certificado.`, { kind: "BR_CPF", value: v });
  }
  for (let i = 0; i < 2; i++) {
    const v = g.nif();
    add(`nif-${i}`, `O meu NIF é ${v}, para a fatura.`, { kind: "PT_NIF", value: v });
  }
  const pt = g.iban("PT", g.digits(21), true);
  add("iban-pt", `O IBAN da minha conta é ${pt}.`, { kind: "IBAN", value: pt });
  return {
    name: "Spanish and Portuguese (MX, CL, AR, BR, PT)",
    countries: ["MX", "CL", "AR", "BR", "PT"],
    samples,
    clean: [
      "La entrega vence el 20/12/2026 a las 23:55; el examen es el 2027-01-15.",
      "Inválidos a propósito: el CPF 111.111.111-11 y el RUT 12.345.678-0 no existen.",
      "El resultado es x = 1048576 / 2 = 524288, y el ISBN 978-84-376-0494-7.",
      "SELECT nombre FROM alumnos WHERE curso_id = 20251 ORDER BY 2;",
      "La versión 4.6.5 corrige el error del commit 5d41402abc4b.",
    ],
  };
}

/** Spanish texts with the data Spain adds, and the universal patterns. */
export function spanishExtrasFixture(): Fixture {
  const g = generators(20261013);
  const samples: Sample[] = [];
  const add = (id: string, text: string, ...entities: Entity[]) => samples.push({ id, text, entities });
  for (let i = 0; i < 3; i++) {
    const v = g.nss();
    add(`nss-${i}`, `Para las prácticas, mi número de la Seguridad Social es ${v}.`, { kind: "ES_NSS", value: v });
  }
  const visa = g.card("4", 16, [4, 4, 4, 4], " ");
  add("card", `Pagad la excursión con la tarjeta de mi madre, ${visa}.`, { kind: "CARD", value: visa });
  const fr = g.iban("FR", `${g.digits(10)}${g.digits(11)}${g.digits(2)}`, true);
  add("iban-fr", `Hice Erasmus en Lyon; mi cuenta de allí es ${fr}.`, { kind: "IBAN", value: fr });
  return {
    name: "Spain extras (ES)",
    countries: ["ES"],
    samples,
    clean: ["Tabla: id=123456789012, nota=8.5; el pedido 28/10/2026 llega el lunes."],
  };
}

/** Every fixture. */
export const fixtures = () => [englishFixture(), germanFixture(), latamFixture(), spanishExtrasFixture()];
