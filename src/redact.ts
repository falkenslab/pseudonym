// Free text made safe to send (ADR-005): the directory's people in a service become their aliases, then
// contact and identity data matched by checked patterns become placeholders. No detection beyond that.
import { peopleIn, type Entry } from "./directory.js";
import { fold } from "./text.js";

/** What `redact()` returns: the text safe to send, and how many replacements of each kind it made. */
export interface Redacted {
  text: string;
  /** How many replacements of each kind were made: counts, never the values. */
  replaced: { names: number; emails: number; phones: number; ids: number; ibans: number };
}

interface Name {
  folded: string;
  alias: string;
  /** A first name alone: replaced only when the text capitalizes it. */
  alone: boolean;
}

const escape = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const isCapital = (char: string) => char !== char.toLowerCase();

/**
 * The names to look for. A full name is used when no one else in the service has it; a first name alone (or a
 * one-word display name) when exactly one person has it. Shared names are left out: an alias on the wrong
 * person is worse than a name left in.
 */
function namesOf(people: Entry[]): Name[] {
  const count = new Map<string, number>();
  const bump = (key: string) => count.set(key, (count.get(key) ?? 0) + 1);
  const words = people.map((entry) => fold(entry.displayName).trim().split(/\s+/).filter(Boolean));
  for (const parts of words) {
    if (parts.length > 1) bump(`full:${parts.join(" ")}`);
    if (parts[0]) bump(`first:${parts[0]}`);
  }
  const names: Name[] = [];
  people.forEach((entry, i) => {
    const parts = words[i] ?? [];
    if (parts.length > 1 && count.get(`full:${parts.join(" ")}`) === 1) names.push({ folded: parts.join(" "), alias: entry.alias, alone: false });
    if (parts[0] && count.get(`first:${parts[0]}`) === 1) names.push({ folded: parts[0], alias: entry.alias, alone: true });
  });
  return names.sort((a, b) => b.folded.length - a.folded.length);
}

/** Replaces known names, longest first, as whole words found in a folded copy (positions are the same). */
function replaceNames(text: string, names: Name[]): { text: string; count: number } {
  const folded = fold(text);
  const found: { start: number; end: number; alias: string }[] = [];
  const free = (start: number, end: number) => found.every((f) => end <= f.start || start >= f.end);
  for (const name of names) {
    // \b is ASCII-only even with the u flag (\bÍker never matches): letters and digits are spelled out.
    const pattern = new RegExp(`(?<![\\p{L}\\p{N}])${name.folded.split(" ").map(escape).join("\\s+")}(?![\\p{L}\\p{N}])`, "gu");
    for (const match of folded.matchAll(pattern)) {
      const start = match.index;
      const end = start + match[0].length;
      if (name.alone && !isCapital(text[start] ?? "")) continue;
      if (free(start, end)) found.push({ start, end, alias: name.alias });
    }
  }
  found.sort((a, b) => a.start - b.start);
  let out = "";
  let last = 0;
  for (const f of found) {
    out += text.slice(last, f.start) + f.alias;
    last = f.end;
  }
  return { text: out + text.slice(last), count: found.length };
}

/** `text` with each match of a global `regex` replaced by what `replace` returns for it. */
function replaceMatches(text: string, regex: RegExp, replace: (match: RegExpMatchArray) => string): string {
  let out = "";
  let last = 0;
  for (const match of text.matchAll(regex)) {
    out += text.slice(last, match.index) + replace(match);
    last = (match.index ?? 0) + match[0].length;
  }
  return out + text.slice(last);
}

const LETTERS = "TRWAGMYFPDXBNJZSQVHLCKE";

interface Pattern {
  kind: "EMAIL" | "DNI" | "NIE" | "IBAN" | "PHONE";
  counter: keyof Redacted["replaced"];
  regex: RegExp;
  valid: (match: RegExpMatchArray) => boolean;
  /** The same value written differently gets the same placeholder. */
  key: (value: string) => string;
}

const compact = (value: string) => value.replace(/[\s-]/g, "").toUpperCase();

// In this order: the IBAN before the phone, whose pattern would take an IBAN's digit groups.
const PATTERNS: Pattern[] = [
  { kind: "EMAIL", counter: "emails", regex: /[\p{L}0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/giu, valid: () => true, key: (v) => v.toLowerCase() },
  { kind: "DNI", counter: "ids", regex: /\b(\d{8})[ -]?([A-Z])\b/g, valid: (m) => LETTERS[Number(m[1]) % 23] === m[2], key: compact },
  {
    kind: "NIE",
    counter: "ids",
    regex: /\b([XYZ])[ -]?(\d{7})[ -]?([A-Z])\b/g,
    valid: (m) => LETTERS[Number(`${"XYZ".indexOf(m[1] ?? "")}${m[2]}`) % 23] === m[3],
    key: compact,
  },
  {
    kind: "IBAN",
    counter: "ibans",
    regex: /\bES\d{2}(?:[ ]?\d{4}){5}\b/g,
    // ISO 13616: the country and check digits moved to the end, letters as numbers (E=14, S=28), mod 97 is 1.
    valid: (m) => {
      const iban = m[0].replace(/ /g, "");
      return BigInt(`${iban.slice(4)}1428${iban.slice(2, 4)}`) % 97n === 1n;
    },
    key: compact,
  },
  {
    kind: "PHONE",
    counter: "phones",
    regex: /(?<![\w.])(?:\+34[ ]?)?[6789]\d{1,2}(?:[ ]?\d{2,3}){2,4}(?!\w|\.\d)/g,
    valid: (m) => m[0].replace(/\D/g, "").replace(/^34(?=\d{9}$)/, "").length === 9,
    key: (v) => v.replace(/\D/g, "").replace(/^34(?=\d{9}$)/, ""),
  },
];

/**
 * Free text with the directory's people in `service` replaced by their aliases (full names, case and accent
 * insensitive; a first name alone only when one person has it and the text capitalizes it), then emails,
 * Spanish phones, DNI, NIE and ES IBANs replaced by placeholders such as `[EMAIL_1]`, the same value the same
 * placeholder within the call. Street addresses, birth dates and people outside the directory are not
 * detected. The result carries counts, never the values replaced.
 */
export async function redact(text: string, options: { service: string }): Promise<Redacted> {
  const names = replaceNames(text, namesOf(await peopleIn(options.service)));
  const replaced: Redacted["replaced"] = { names: names.count, emails: 0, phones: 0, ids: 0, ibans: 0 };
  const placeholders = new Map<string, string>();
  const numbers = new Map<string, number>();
  let out = names.text;
  for (const pattern of PATTERNS) {
    out = replaceMatches(out, pattern.regex, (match) => {
      if (!pattern.valid(match)) return match[0];
      replaced[pattern.counter]++;
      const key = `${pattern.kind}:${pattern.key(match[0])}`;
      let placeholder = placeholders.get(key);
      if (!placeholder) {
        const n = (numbers.get(pattern.kind) ?? 0) + 1;
        numbers.set(pattern.kind, n);
        placeholder = `[${pattern.kind}_${n}]`;
        placeholders.set(key, placeholder);
      }
      return placeholder;
    });
  }
  return { text: out, replaced };
}
