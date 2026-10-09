// Free text made safe to send (ADR-005, ADR-008): the directory's people in a service become their aliases,
// then contact and identity data matched by checked patterns become placeholders. No detection beyond that.
import { peopleIn, type Entry } from "./directory.js";
import { PseudonymError } from "./errors.js";
import { COUNTRIES, PATTERNS, type Country } from "./patterns.js";
import { fold } from "./text.js";

export { COUNTRIES, type Country } from "./patterns.js";

/** What `redact()` returns: the text safe to send, and how many replacements of each kind it made. */
export interface Redacted {
  text: string;
  /** How many replacements of each kind were made: counts, never the values. National ids of every country count in `ids`. */
  replaced: { names: number; emails: number; phones: number; ids: number; ibans: number; cards: number };
}

/** Options of `redact()`. */
export interface RedactOptions {
  /** Whose names to replace: the directory's people met in this service. */
  service: string;
  /**
   * Whose national ids and phones to look for, as ISO 3166 codes (see `COUNTRIES`). Default `["ES"]`. Payment
   * cards and IBANs of any country are always looked for.
   */
  countries?: readonly (Country | Lowercase<Country>)[];
}

/** The countries asked for, upper-cased, or a `PseudonymError` naming an unknown one. */
export function checkCountries(countries: readonly string[]): Set<Country> {
  const wanted = new Set<Country>();
  for (const code of countries) {
    const upper = code.toUpperCase();
    if (!(COUNTRIES as readonly string[]).includes(upper)) {
      throw new PseudonymError(`Unknown country "${code}" for redaction. Known: ${COUNTRIES.join(", ")}.`);
    }
    wanted.add(upper as Country);
  }
  return wanted;
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

/**
 * Free text with the directory's people in `service` replaced by their aliases (full names, case and accent
 * insensitive; a first name alone only when one person has it and the text capitalizes it), then contact and
 * identity data replaced by placeholders such as `[EMAIL_1]` or `[US_SSN_1]`, the same value the same
 * placeholder within the call: emails, payment cards and IBANs always; national ids and phones of the
 * `countries` asked for (Spain by default), each checked with its check digit or impossible ranges. Street
 * addresses, birth dates and people outside the directory are not detected. The result carries counts, never
 * the values replaced. Throws a `PseudonymError` for an unknown country.
 */
export async function redact(text: string, options: RedactOptions): Promise<Redacted> {
  const countries = checkCountries(options.countries ?? ["ES"]);
  const names = replaceNames(text, namesOf(await peopleIn(options.service)));
  const replaced: Redacted["replaced"] = { names: names.count, emails: 0, phones: 0, ids: 0, ibans: 0, cards: 0 };
  const placeholders = new Map<string, string>();
  const numbers = new Map<string, number>();
  let out = names.text;
  for (const pattern of PATTERNS) {
    if (pattern.countries && !pattern.countries.some((c) => countries.has(c))) continue;
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
