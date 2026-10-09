// The encrypted directory of people met (ADR-003): one file, rewritten whole under a lock, that keeps each
// person's first alias, recognizes them by any identifier without storing it, and says who an alias is.
import { createCipheriv, createDecipheriv, createHmac, randomBytes } from "node:crypto";
import { readFile, rename, stat, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { ALIAS_LENGTH, aliasFor, linkingOn, normalizeIdentifiers, type Identifier, type Identifiers } from "./aliases.js";
import { PseudonymError } from "./errors.js";
import { ensureHome, homeDir, isCode, loadKey, subkey } from "./home.js";
import { fold } from "./text.js";

/** A person as a caller knows them in one service. */
export interface Person {
  /** Where the person was met, such as `moodle@<site host>`: part of the alias unless linking is on. */
  service: string;
  identifiers: Identifiers;
  /** The name the person in charge sees in `pseudonym whois`; never sent anywhere. */
  displayName: string;
  /** One alias across services for this person (default: `PSEUDONYM_LINK=true`, else off). */
  link?: boolean;
}

export interface ServiceId {
  service: string;
  id?: string;
}

export interface Entry {
  alias: string;
  displayName: string;
  services: ServiceId[];
  /** HMACs of the email and institutional id: they recognize a person without storing the identifier. */
  matchers: string[];
  /** Aliases linked into this one: they resolve to this entry. */
  links: string[];
  firstSeen: string;
  lastSeen: string;
}

interface Data {
  entries: Entry[];
}

interface Keys {
  aliases: Buffer;
  directory: Buffer;
  matchers: Buffer;
}

// File layout: MAGIC, VERSION, 12-byte nonce, 16-byte GCM tag, ciphertext of the JSON. MAGIC and VERSION are
// authenticated as additional data, so a changed header fails like a changed body.
const MAGIC = Buffer.from("PSEUDONYM-DIRECTORY");
const VERSION = 1;
const HEADER = Buffer.concat([MAGIC, Buffer.from([VERSION])]);

const directoryPath = () => path.join(homeDir(), "directory.enc");
const lockPath = () => path.join(homeDir(), "directory.lock");

const LOCK_STALE_MS = 10_000;
const LOCK_TIMEOUT_MS = 15_000;
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/** Counters for tests: how many times the file was written. */
export const stats = { writes: 0 };

async function keys(): Promise<Keys> {
  const key = await loadKey();
  return { aliases: subkey(key, "aliases"), directory: subkey(key, "directory"), matchers: subkey(key, "matchers") };
}

const unreadable = () =>
  new PseudonymError(
    `The directory in ${homeDir()} can't be read: it was written with another key, or the file was modified. Nothing was changed. If the key changed, restore the right one with "pseudonym key import".`,
  );

async function read(k: Keys): Promise<Data> {
  let file: Buffer;
  try {
    file = await readFile(directoryPath());
  } catch (error) {
    if (isCode(error, "ENOENT")) return { entries: [] };
    throw error;
  }
  if (file.length < HEADER.length + 28 || !file.subarray(0, MAGIC.length).equals(MAGIC)) throw unreadable();
  if (file[MAGIC.length] !== VERSION) {
    throw new PseudonymError(`The directory in ${homeDir()} was written by a newer version of pseudonym: update it.`);
  }
  const nonce = file.subarray(HEADER.length, HEADER.length + 12);
  const tag = file.subarray(HEADER.length + 12, HEADER.length + 28);
  try {
    const decipher = createDecipheriv("aes-256-gcm", k.directory, nonce);
    decipher.setAAD(HEADER);
    decipher.setAuthTag(tag);
    const plain = Buffer.concat([decipher.update(file.subarray(HEADER.length + 28)), decipher.final()]);
    return JSON.parse(plain.toString("utf8")) as Data;
  } catch {
    throw unreadable();
  }
}

/** AES-256-GCM with a fresh nonce, to a temporary file renamed over the old one: a crash never leaves half a file. */
async function write(k: Keys, data: Data): Promise<void> {
  const nonce = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", k.directory, nonce);
  cipher.setAAD(HEADER);
  const body = Buffer.concat([cipher.update(JSON.stringify(data), "utf8"), cipher.final()]);
  const temporary = `${directoryPath()}.${process.pid}.${randomBytes(4).toString("hex")}.tmp`;
  await writeFile(temporary, Buffer.concat([HEADER, nonce, cipher.getAuthTag(), body]), { mode: 0o600 });
  // Windows refuses the rename while another process (an antivirus, a reader) has the file open: retry.
  for (let attempt = 0; ; attempt++) {
    try {
      await rename(temporary, directoryPath());
      break;
    } catch (error) {
      if (!isCode(error, "EPERM", "EBUSY", "EACCES") || attempt >= 20) {
        await unlink(temporary).catch(() => undefined);
        throw error;
      }
      await sleep(25 * (attempt + 1));
    }
  }
  stats.writes++;
}

/**
 * Runs `change` on the directory under the lock file and writes the result. A lock older than LOCK_STALE_MS
 * is taken as left by a crashed process and broken (changes hold it for milliseconds).
 */
async function update<T>(change: (data: Data, k: Keys) => T): Promise<T> {
  const k = await keys();
  await ensureHome();
  const started = Date.now();
  for (;;) {
    try {
      await writeFile(lockPath(), String(process.pid), { flag: "wx" });
      break;
    } catch (error) {
      if (!isCode(error, "EEXIST", "EPERM")) throw error;
    }
    const age = await stat(lockPath()).then((s) => Date.now() - s.mtimeMs, () => 0);
    if (age > LOCK_STALE_MS) await unlink(lockPath()).catch(() => undefined);
    else if (Date.now() - started > LOCK_TIMEOUT_MS) {
      throw new PseudonymError(`The directory in ${homeDir()} is locked by another program. Try again; if it persists, delete ${lockPath()}.`);
    } else await sleep(10 + Math.random() * 30);
  }
  try {
    const data = await read(k);
    const result = change(data, k);
    await write(k, data);
    return result;
  } finally {
    await unlink(lockPath()).catch(() => undefined);
  }
}

/** The directory as it is now, without the lock: writes replace the file whole, so a read never sees half of one. */
async function snapshot(): Promise<{ data: Data; k: Keys }> {
  const k = await keys();
  return { data: await read(k), k };
}

const matcher = (k: Keys, identifier: Identifier) =>
  createHmac("sha256", k.matchers).update(JSON.stringify([identifier.kind, identifier.value])).digest("base64url");

const hasService = (entry: Entry, service: string) => entry.services.some((s) => s.service === service);

function find(data: Data, alias: string): Entry | undefined {
  const wanted = alias.trim().toUpperCase();
  return data.entries.find((entry) => entry.alias === wanted || entry.links.includes(wanted));
}

function checkPerson(person: Person): void {
  if (typeof person?.service !== "string" || !person.service.trim()) throw new PseudonymError("A person needs a service, such as \"moodle@<site host>\".");
  if (typeof person.displayName !== "string") throw new PseudonymError("A person needs a displayName.");
}

function rememberOne(data: Data, k: Keys, person: Person, now: string): string {
  const identifiers = normalizeIdentifiers(person.identifiers);
  const link = linkingOn(person.link);
  // Without linking, only entries already met in this service count: the same email elsewhere is someone
  // the model must not be able to join with this one (ADR-002).
  const candidates = link ? data.entries : data.entries.filter((entry) => hasService(entry, person.service));
  const serviceUserId = identifiers.find((i) => i.kind === "serviceUserId")?.value;

  const matched = identifiers.map((identifier) => {
    if (identifier.kind === "serviceUserId") {
      return candidates.find((entry) => entry.services.some((s) => s.service === person.service && s.id === identifier.value));
    }
    const m = matcher(k, identifier);
    return candidates.find((entry) => entry.matchers.includes(m));
  });
  // Identifiers are strongest first: the first match wins, and other people matched are never merged into it.
  const winner = matched.find((entry) => entry !== undefined);

  if (winner) {
    const others = new Set(matched.filter((entry) => entry && entry !== winner).map((entry) => entry!.alias));
    for (const other of others) {
      process.emitWarning(`The identifiers given for one person match two people in the directory, ${winner.alias} and ${other}: kept ${winner.alias}, merged nothing.`, "PseudonymWarning");
    }
    winner.displayName = person.displayName;
    winner.lastSeen = now;
    const own = winner.services.find((s) => s.service === person.service);
    if (!own) winner.services.push(serviceUserId ? { service: person.service, id: serviceUserId } : { service: person.service });
    else if (serviceUserId) own.id = serviceUserId;
    identifiers.forEach((identifier, i) => {
      if (identifier.kind === "serviceUserId" || matched[i]) return;
      winner.matchers.push(matcher(k, identifier));
    });
    return winner.alias;
  }

  const best = identifiers[0]!;
  const taken = (alias: string) => data.entries.some((entry) => entry.alias === alias || entry.links.includes(alias));
  let alias = aliasFor(k.aliases, person.service, best, link);
  for (let length = ALIAS_LENGTH + 1; taken(alias); length++) alias = aliasFor(k.aliases, person.service, best, link, length);
  data.entries.push({
    alias,
    displayName: person.displayName,
    services: [serviceUserId ? { service: person.service, id: serviceUserId } : { service: person.service }],
    matchers: identifiers.filter((i) => i.kind !== "serviceUserId").map((i) => matcher(k, i)),
    links: [],
    firstSeen: now,
    lastSeen: now,
  });
  return alias;
}

/**
 * The alias of a person. A person already in the directory for that service keeps their first alias, even if
 * an identifier changed; someone new gets one computed from their strongest identifier.
 */
export function remember(person: Person): Promise<string>;
/**
 * The alias of each person in a list, in the same order, with one write to the directory for the whole list:
 * prefer it whenever a result holds several people.
 */
export function remember(people: Person[]): Promise<string[]>;
export async function remember(input: Person | Person[]): Promise<string | string[]> {
  const people = Array.isArray(input) ? input : [input];
  people.forEach(checkPerson);
  if (people.length === 0) return [];
  const now = new Date().toISOString();
  const aliases = await update((data, k) => people.map((person) => rememberOne(data, k, person, now)));
  return Array.isArray(input) ? aliases : aliases[0]!;
}

/**
 * The service user id behind an alias, for a write tool that receives an alias from the model. Follows
 * links. Keep the result on your side: it's for calling your own service, never for the model.
 */
export async function resolve(alias: string, options: { service: string }): Promise<string> {
  const { data } = await snapshot();
  const entry = find(data, alias);
  if (!entry) throw new PseudonymError(`Unknown alias ${alias.trim()}: nobody with it is in the directory.`);
  const id = entry.services.find((s) => s.service === options.service)?.id;
  if (id === undefined) throw new PseudonymError(`${entry.alias} has no user id for ${options.service}: remember the person there with a serviceUserId first.`);
  return id;
}

/** Who an alias is (following links), or undefined. */
export async function whois(alias: string): Promise<Entry | undefined> {
  return find((await snapshot()).data, alias);
}

/** Everyone whose display name contains `name`, ignoring case and accents. */
export async function aliasOf(name: string): Promise<Entry[]> {
  const wanted = fold(name.trim());
  if (!wanted) return [];
  return (await snapshot()).data.entries.filter((entry) => fold(entry.displayName).includes(wanted));
}

/** Everyone met in a service. */
export async function peopleIn(service: string): Promise<Entry[]> {
  return (await snapshot()).data.entries.filter((entry) => hasService(entry, service));
}

/** Every service in the directory with how many people it has, most people first. */
export async function services(): Promise<{ service: string; people: number }[]> {
  const counts = new Map<string, number>();
  for (const entry of (await snapshot()).data.entries) {
    for (const { service } of entry.services) counts.set(service, (counts.get(service) ?? 0) + 1);
  }
  return [...counts].map(([service, people]) => ({ service, people })).sort((a, b) => b.people - a.people || a.service.localeCompare(b.service));
}

// An alias as it may appear in a model's text: any case, as a whole word (not inside another code).
const ALIAS_IN_TEXT = /(?<![\p{L}\p{N}-])A-[0-9A-HJKMNP-TV-Z]{6,12}(?![\p{L}\p{N}])/giu;

/**
 * `text` with every alias the directory knows (linked ones included) replaced by the person's display name,
 * or "Name (A-…)" with `withAlias`. For the person in charge only: the result holds names in clear.
 */
export async function reveal(text: string, withAlias = false): Promise<{ text: string; revealed: number; unknown: number }> {
  const { data } = await snapshot();
  let revealed = 0;
  let unknown = 0;
  const result = text.replace(ALIAS_IN_TEXT, (alias) => {
    const entry = find(data, alias);
    if (!entry) {
      unknown++;
      return alias;
    }
    revealed++;
    return withAlias ? `${entry.displayName} (${alias.toUpperCase()})` : entry.displayName;
  });
  return { text: result, revealed, unknown };
}

/** Marks `b` as the same person as `a`: `a` is kept, `b` resolves to it from now on. Returns `a`'s alias. */
export async function link(a: string, b: string): Promise<string> {
  return update((data) => {
    const kept = find(data, a);
    const merged = find(data, b);
    if (!kept) throw new PseudonymError(`Unknown alias ${a.trim()}.`);
    if (!merged) throw new PseudonymError(`Unknown alias ${b.trim()}.`);
    if (kept === merged) return kept.alias;
    kept.links.push(merged.alias, ...merged.links);
    for (const service of merged.services) {
      const own = kept.services.find((s) => s.service === service.service);
      if (!own) kept.services.push(service);
      else own.id ??= service.id;
    }
    kept.matchers.push(...merged.matchers.filter((m) => !kept.matchers.includes(m)));
    if (merged.firstSeen < kept.firstSeen) kept.firstSeen = merged.firstSeen;
    if (merged.lastSeen > kept.lastSeen) kept.lastSeen = merged.lastSeen;
    data.entries.splice(data.entries.indexOf(merged), 1);
    return kept.alias;
  });
}

/** Removes a person (erasure). Meeting them again gives the same alias, recomputed. Returns whether they were there. */
export async function forget(alias: string): Promise<boolean> {
  return update((data) => {
    const entry = find(data, alias);
    if (entry) data.entries.splice(data.entries.indexOf(entry), 1);
    return entry !== undefined;
  });
}

/** Removes everyone not seen since `date` (retention). Returns how many. */
export async function prune(date: Date): Promise<number> {
  const limit = date.toISOString();
  return update((data) => {
    const before = data.entries.length;
    data.entries = data.entries.filter((entry) => entry.lastSeen >= limit);
    return before - data.entries.length;
  });
}

export { directoryPath };
