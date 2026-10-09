// The contact and identity data redact() replaces after names (ADR-005, ADR-008). A pattern only counts when its
// value passes the check it can be given: a check digit where there is one, impossible ranges and required
// separators where there isn't. Values with neither (bare 9-digit numbers, passports, licences) are left out.

/** Countries whose national ids and phones can be redacted. */
export const COUNTRIES = ["ES", "US", "CA", "DE", "MX", "CL", "AR", "BR", "PT"] as const;
/** An ISO 3166 code of a country in `COUNTRIES`, for `redact()`'s `countries` option. */
export type Country = (typeof COUNTRIES)[number];

export type Counter = "emails" | "phones" | "ids" | "ibans" | "cards";

export interface Pattern {
  /** The placeholder's name: `[KIND_n]`. */
  kind: string;
  counter: Counter;
  /** Only with these countries enabled; none means always. */
  countries?: readonly Country[];
  regex: RegExp;
  valid: (match: RegExpMatchArray) => boolean;
  /** The same value written differently gets the same placeholder. */
  key: (value: string) => string;
}

const digitsOf = (value: string) => value.replace(/\D/g, "");
const compact = (value: string) => value.replace(/[\s./-]/g, "").toUpperCase();
const allSame = (digits: string) => /^(\d)\1*$/.test(digits);

/** Luhn (ISO/IEC 7812-1): doubling every second digit from the right, the sum is a multiple of 10. */
export function luhn(digits: string): boolean {
  let sum = 0;
  for (let i = 0; i < digits.length; i++) {
    let d = Number(digits[digits.length - 1 - i]);
    if (i % 2 === 1) d = d * 2 > 9 ? d * 2 - 9 : d * 2;
    sum += d;
  }
  return sum % 10 === 0;
}

/** ISO 7064 MOD 97-10 as IBANs use it: letters as 10 to 35, the first four characters moved to the end. */
export function mod97(value: string): boolean {
  const rearranged = (value.slice(4) + value.slice(0, 4)).replace(/[A-Z]/g, (c) => String(c.charCodeAt(0) - 55));
  return BigInt(rearranged) % 97n === 1n;
}

/** A digit's cross sum, as the German check digits add the products. */
const crossSum = (n: number) => String(n).split("").reduce((a, d) => a + Number(d), 0);

// --- Payment cards ---------------------------------------------------------------------------------------

/** Issuer prefixes and lengths (ISO/IEC 7812 IINs) of the cards in common use. */
const CARD_ISSUERS: { prefix: RegExp; lengths: number[] }[] = [
  { prefix: /^4/, lengths: [13, 16, 19] }, // Visa
  { prefix: /^(5[1-5]|2(2[2-9][1-9]|2[3-9]\d|[3-6]\d\d|7[01]\d|720))/, lengths: [16] }, // Mastercard
  { prefix: /^3[47]/, lengths: [15] }, // American Express
  { prefix: /^(6011|64[4-9]|65)/, lengths: [16, 17, 18, 19] }, // Discover
  { prefix: /^(30[0-5]|36|38|39)/, lengths: [14, 15, 16, 17, 18, 19] }, // Diners Club
  { prefix: /^35(2[89]|[3-8]\d)/, lengths: [16, 17, 18, 19] }, // JCB
  { prefix: /^62/, lengths: [16, 17, 18, 19] }, // UnionPay
];

function validCard(match: RegExpMatchArray): boolean {
  const separators = new Set(match[0].replace(/\d/g, ""));
  if (separators.size > 1) return false;
  const digits = digitsOf(match[0]);
  return CARD_ISSUERS.some((issuer) => issuer.prefix.test(digits) && issuer.lengths.includes(digits.length)) && luhn(digits);
}

// --- IBAN --------------------------------------------------------------------------------------------------

/** IBAN lengths by country, from the SWIFT IBAN registry. */
const IBAN_LENGTHS: Record<string, number> = {
  AD: 24, AE: 23, AL: 28, AT: 20, AZ: 28, BA: 20, BE: 16, BG: 22, BH: 22, BR: 29, BY: 28, CH: 21, CR: 22, CY: 28, CZ: 24,
  DE: 22, DK: 18, DO: 28, EE: 20, EG: 29, ES: 24, FI: 18, FO: 18, FR: 27, GB: 22, GE: 22, GI: 23, GL: 18, GR: 27, GT: 28,
  HR: 21, HU: 28, IE: 22, IL: 23, IQ: 23, IS: 26, IT: 27, JO: 30, KW: 30, KZ: 20, LB: 28, LC: 32, LI: 21, LT: 20, LU: 20,
  LV: 21, MC: 27, MD: 24, ME: 22, MK: 19, MR: 27, MT: 31, MU: 30, NL: 18, NO: 15, PK: 24, PL: 28, PS: 29, PT: 25, QA: 29,
  RO: 24, RS: 22, SA: 24, SC: 31, SE: 24, SI: 19, SK: 24, SM: 27, ST: 25, SV: 28, TL: 23, TN: 24, TR: 26, UA: 29, VA: 22,
  VG: 24, XK: 20,
};

// One alternative per country, with exactly its length, so a following word in capitals is never swallowed.
const IBAN_REGEX = new RegExp(
  `(?<![\\p{L}\\d])(?:${Object.entries(IBAN_LENGTHS)
    .map(([country, length]) => `${country}\\d{2}(?: ?[A-Z0-9]){${length - 4}}`)
    .join("|")})(?![A-Za-z0-9])`,
  "gu",
);

// --- Spain -------------------------------------------------------------------------------------------------

const DNI_LETTERS = "TRWAGMYFPDXBNJZSQVHLCKE";

/** Número de la Seguridad Social: province (01-53), number, and its control: the number mod 97. */
function validNss(match: RegExpMatchArray): boolean {
  const province = Number(match[1]);
  const number = Number(match[2]);
  if (province < 1 || province > 53) return false;
  const base = number < 10_000_000 ? province * 10_000_000 + number : Number(`${match[1]}${match[2]}`);
  return base % 97 === Number(match[3]);
}

// --- United States and Canada ------------------------------------------------------------------------------

function validSsn(match: RegExpMatchArray): boolean {
  const [area, group, serial] = [Number(match[1]), Number(match[3]), Number(match[4])];
  return area !== 0 && area !== 666 && area < 900 && group !== 0 && serial !== 0;
}

function validItin(match: RegExpMatchArray): boolean {
  const group = Number(match[3]);
  return (group >= 50 && group <= 65) || (group >= 70 && group <= 88) || (group >= 90 && group <= 92) || group >= 94;
}

const validSin = (match: RegExpMatchArray) => !/^[08]/.test(match[1]!) && luhn(`${match[1]}${match[3]}${match[4]}`);

// --- Germany -----------------------------------------------------------------------------------------------

/** Steuerliche Identifikationsnummer: ISO 7064 MOD 11,10 check digit, one digit repeated 2 or 3 times in the first 10. */
function validSteuerId(match: RegExpMatchArray): boolean {
  const digits = digitsOf(match[0]);
  if (digits[0] === "0") return false;
  const counts = new Map<string, number>();
  for (const d of digits.slice(0, 10)) counts.set(d, (counts.get(d) ?? 0) + 1);
  const repeated = [...counts.values()].filter((n) => n > 1);
  if (repeated.length !== 1 || repeated[0]! > 3) return false;
  let product = 10;
  for (const d of digits.slice(0, 10)) {
    let sum = (Number(d) + product) % 10;
    if (sum === 0) sum = 10;
    product = (sum * 2) % 11;
  }
  const check = 11 - product === 10 ? 0 : 11 - product;
  return check === Number(digits[10]);
}

const charValue = (c: string) => (/\d/.test(c) ? Number(c) : c.charCodeAt(0) - 55);

/** Personalausweis number: 9 characters and an ICAO 9303 check digit (weights 7, 3, 1). */
function validIdCard(match: RegExpMatchArray): boolean {
  const value = match[0];
  const sum = value
    .slice(0, 9)
    .split("")
    .reduce((acc, c, i) => acc + charValue(c) * [7, 3, 1][i % 3]!, 0);
  return sum % 10 === Number(value[9]);
}

/** Rentenversicherungsnummer: area, birth date, surname initial, serial and a check digit. */
function validSvnr(match: RegExpMatchArray): boolean {
  const [area, birth, letter, serial, check] = [match[1]!, match[2]!, match[3]!, match[4]!, match[5]!];
  const day = Number(birth.slice(0, 2));
  const month = Number(birth.slice(2, 4));
  if (day < 1 || day > 31 || month < 1 || month > 12) return false;
  const digits = `${area}${birth}${String(letter.charCodeAt(0) - 64).padStart(2, "0")}${serial}`;
  const weights = [2, 1, 2, 5, 7, 1, 2, 1, 2, 1, 2, 1];
  const sum = digits.split("").reduce((acc, d, i) => acc + crossSum(Number(d) * weights[i]!), 0);
  return sum % 10 === Number(check);
}

/** Krankenversichertennummer: a letter (as 01-26) and 8 digits, weights 1 and 2 alternating, cross sums, mod 10. */
function validKvnr(match: RegExpMatchArray): boolean {
  const value = match[0];
  const digits = `${String(value.charCodeAt(0) - 64).padStart(2, "0")}${value.slice(1, 9)}`;
  const sum = digits.split("").reduce((acc, d, i) => acc + crossSum(Number(d) * (i % 2 === 0 ? 1 : 2)), 0);
  return sum % 10 === Number(value[9]);
}

// --- Latin America and Portugal ----------------------------------------------------------------------------

const CURP_STATES = "AS|BC|BS|CC|CL|CM|CS|CH|DF|DG|GT|GR|HG|JC|MC|MN|MS|NT|NL|OC|PL|QT|QR|SP|SL|SR|TC|TS|TL|VZ|YN|ZS|NE";
const CURP_DIGITS = "0123456789ABCDEFGHIJKLMNÑOPQRSTUVWXYZ";

/** CURP: its last digit is 10 minus the weighted sum (18 down to 2) of the first 17, mod 10. */
function validCurp(match: RegExpMatchArray): boolean {
  const value = match[0];
  const sum = value
    .slice(0, 17)
    .split("")
    .reduce((acc, c, i) => acc + CURP_DIGITS.indexOf(c) * (18 - i), 0);
  return (10 - (sum % 10)) % 10 === Number(value[17]);
}

/** RUT: mod 11 with weights 2 to 7 from the right; 10 is K, 11 is 0. */
function validRut(match: RegExpMatchArray): boolean {
  const body = digitsOf(match[1]!);
  if (Number(body) < 1_000_000) return false;
  let sum = 0;
  for (let i = 0; i < body.length; i++) sum += Number(body[body.length - 1 - i]) * (2 + (i % 6));
  const dv = 11 - (sum % 11);
  return (dv === 11 ? "0" : dv === 10 ? "K" : String(dv)) === match[2]!.toUpperCase();
}

/** CUIL/CUIT: mod 11 with weights 5, 4, 3, 2, 7, 6, 5, 4, 3, 2; a remainder of 10 is never issued. */
function validCuit(match: RegExpMatchArray): boolean {
  const digits = digitsOf(match[0]);
  const sum = [5, 4, 3, 2, 7, 6, 5, 4, 3, 2].reduce((acc, w, i) => acc + Number(digits[i]) * w, 0);
  const dv = 11 - (sum % 11);
  return dv !== 10 && (dv === 11 ? 0 : dv) === Number(digits[10]);
}

/** CPF: two mod 11 check digits; numbers of one repeated digit are never issued. */
function validCpf(match: RegExpMatchArray): boolean {
  const digits = digitsOf(match[0]);
  if (allSame(digits)) return false;
  const check = (length: number) => {
    const sum = digits
      .slice(0, length)
      .split("")
      .reduce((acc, d, i) => acc + Number(d) * (length + 1 - i), 0);
    return ((sum * 10) % 11) % 10;
  };
  return check(9) === Number(digits[9]) && check(10) === Number(digits[10]);
}

/** Portuguese NIF: valid first digit, mod 11 with weights 9 down to 2. */
function validNif(match: RegExpMatchArray): boolean {
  const digits = digitsOf(match[0]);
  if (!/^[1235689]/.test(digits) || allSame(digits)) return false;
  const sum = digits
    .slice(0, 8)
    .split("")
    .reduce((acc, d, i) => acc + Number(d) * (9 - i), 0);
  const dv = 11 - (sum % 11);
  return (dv >= 10 ? 0 : dv) === Number(digits[8]);
}

// --- Phones ------------------------------------------------------------------------------------------------

const spanishPhoneKey = (v: string) => digitsOf(v).replace(/^34(?=\d{9}$)/, "");
const nanpKey = (v: string) => digitsOf(v).replace(/^1(?=\d{10}$)/, "");

/**
 * Every pattern, in the order they run: emails first (their digits aren't anyone's id), IBANs before cards
 * (an IBAN's digit groups could pass as a card), ids before phones (phones would take their digit groups).
 */
export const PATTERNS: Pattern[] = [
  { kind: "EMAIL", counter: "emails", regex: /[\p{L}0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/giu, valid: () => true, key: (v) => v.toLowerCase() },
  { kind: "IBAN", counter: "ibans", regex: IBAN_REGEX, valid: (m) => mod97(compact(m[0])), key: compact },
  { kind: "CARD", counter: "cards", regex: /(?<![\p{L}\d-])(?:\d[ -]?){12,18}\d(?![\d-])/gu, valid: validCard, key: digitsOf },

  { kind: "DNI", counter: "ids", countries: ["ES"], regex: /\b(\d{8})[ -]?([A-Z])\b/g, valid: (m) => DNI_LETTERS[Number(m[1]) % 23] === m[2], key: compact },
  {
    kind: "NIE",
    counter: "ids",
    countries: ["ES"],
    regex: /\b([XYZ])[ -]?(\d{7})[ -]?([A-Z])\b/g,
    valid: (m) => DNI_LETTERS[Number(`${"XYZ".indexOf(m[1] ?? "")}${m[2]}`) % 23] === m[3],
    key: compact,
  },
  { kind: "ES_NSS", counter: "ids", countries: ["ES"], regex: /(?<![\d/-])(\d{2})[ /-]?(\d{8})[ /-]?(\d{2})(?![\d/-])/g, valid: validNss, key: digitsOf },

  { kind: "US_SSN", counter: "ids", countries: ["US"], regex: /(?<![\d-])(\d{3})([- ])(\d{2})\2(\d{4})(?![\d-])/g, valid: validSsn, key: digitsOf },
  { kind: "US_ITIN", counter: "ids", countries: ["US"], regex: /(?<![\d-])(9\d{2})([- ])(\d{2})\2(\d{4})(?![\d-])/g, valid: validItin, key: digitsOf },
  { kind: "CA_SIN", counter: "ids", countries: ["CA"], regex: /(?<![\d-])(\d{3})([- ])(\d{3})\2(\d{3})(?![\d-])/g, valid: validSin, key: digitsOf },

  { kind: "DE_TAXID", counter: "ids", countries: ["DE"], regex: /(?<![\d.,-])(?:\d{2} \d{3} \d{3} \d{3}|\d{11})(?![\d-]|[.,]\d)/g, valid: validSteuerId, key: digitsOf },
  // A Krankenversichertennummer can also pass as a Personalausweis number: its usual shape goes first.
  { kind: "DE_KVNR", counter: "ids", countries: ["DE"], regex: /\b[A-Z]\d{9}\b/g, valid: validKvnr, key: compact },
  { kind: "DE_IDCARD", counter: "ids", countries: ["DE"], regex: /\b[CFGHJKLMNPRTVWXYZ][CFGHJKLMNPRTVWXYZ0-9]{8}\d\b/g, valid: validIdCard, key: compact },
  { kind: "DE_SVNR", counter: "ids", countries: ["DE"], regex: /\b(\d{2}) ?(\d{6}) ?([A-Z]) ?(\d{2}) ?(\d)\b/g, valid: validSvnr, key: compact },

  {
    kind: "MX_CURP",
    counter: "ids",
    countries: ["MX"],
    regex: new RegExp(`\\b[A-Z][AEIOUX][A-Z]{2}\\d{6}[HMX](?:${CURP_STATES})[B-DF-HJ-NP-TV-Z]{3}[0-9A-Z]\\d\\b`, "g"),
    valid: validCurp,
    key: compact,
  },
  { kind: "CL_RUT", counter: "ids", countries: ["CL"], regex: /(?<![\d.])(\d{1,2}(?:\.?\d{3}){2})-([\dkK])\b/g, valid: validRut, key: compact },
  { kind: "AR_CUIT", counter: "ids", countries: ["AR"], regex: /(?<![\d-])(?:2[0347]|3[034])-?\d{8}-?\d(?![\d-])/g, valid: validCuit, key: digitsOf },
  { kind: "BR_CPF", counter: "ids", countries: ["BR"], regex: /(?<![\d.-])\d{3}\.?\d{3}\.?\d{3}-?\d{2}(?![\d-]|\.\d)/g, valid: validCpf, key: digitsOf },
  { kind: "PT_NIF", counter: "ids", countries: ["PT"], regex: /(?<![\d.,-])(?:\d{3} \d{3} \d{3}|\d{9})(?![\d-]|[.,]\d)/g, valid: validNif, key: digitsOf },

  {
    kind: "PHONE",
    counter: "phones",
    countries: ["ES"],
    regex: /(?<![\w.])(?:\+34[ ]?)?[6789]\d{1,2}(?:[ ]?\d{2,3}){2,4}(?!\w|\.\d)/g,
    valid: (m) => spanishPhoneKey(m[0]).length === 9,
    key: spanishPhoneKey,
  },
  {
    kind: "PHONE",
    counter: "phones",
    countries: ["US", "CA"],
    regex: /(?<![\w.+])(?:\+1[ .-]?)?(?:\([2-9]\d{2}\) ?|[2-9]\d{2}[ .-])[2-9]\d{2}[ .-]\d{4}(?![\w-]|\.\d)|\+1[2-9]\d{9}(?!\d)/g,
    valid: () => true,
    key: nanpKey,
  },
];
