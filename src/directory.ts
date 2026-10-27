// The encrypted directory of people met (ADR-003): one file, rewritten whole under a lock, that keeps each
// person's first alias, recognizes them by any identifier without storing it, and says who an alias is.
import { createCipheriv, createDecipheriv, createHmac, randomBytes } from "node:crypto";
import { readFile, rename, stat, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { ALIAS_LENGTH, aliasFor, base32, linkingOn, normalizeIdentifiers, type Identifier, type Identifiers } from "./aliases.js";
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

/** Where the directory is kept: `encrypted` (the default: AES-256-GCM, aliases and matchers under the key) or `plain`. */
export type StorageMode = "encrypted" | "plain";

/**
 * How one storage mode keeps the directory (ADR-010). The directory's logic is the same for both: only the file,
 * its encoding, how an identifier is recognized and how a new alias is made differ.
 */
interface Store {
  mode: StorageMode;
  file: string;
  decode(bytes: Buffer): Data;
  encode(data: Data): Buffer;
  /** What the directory keeps to recognize an email or an institutional id. */
  matcher(identifier: Identifier): string;
  /** A new person's alias, never one already `taken`. */
  newAlias(service: string, best: Identifier, link: boolean, taken: (alias: string) => boolean): string;
}

// Encrypted file layout: MAGIC, VERSION, 12-byte nonce, 16-byte GCM tag, ciphertext of the JSON. MAGIC and VERSION
// are authenticated as additional data, so a changed header fails like a changed body.
const MAGIC = Buffer.from("PSEUDONYM-DIRECTORY");
const VERSION = 1;
const HEADER = Buffer.concat([MAGIC, Buffer.from([VERSION])]);

// The plain file: readable JSON with a format name and a version, so a future change can be told apart.
const PLAIN_FORMAT = "pseudonym-directory";
const PLAIN_VERSION = 1;

const encryptedPath = () => path.join(homeDir(), "directory.enc");
const plainPath = () => path.join(homeDir(), "directory.json");
const lockPath = () => path.join(homeDir(), "directory.lock");

/** The directory file of the configured mode (`directory.enc` or `directory.json`). */
const directoryPath = () => (storageMode() === "plain" ? plainPath() : encryptedPath());

const LOCK_STALE_MS = 10_000;
const LOCK_TIMEOUT_MS = 15_000;
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/** Counters for tests: how many times the file was written. */
export const stats = { writes: 0 };

let configured: StorageMode | undefined;

const checkMode = (mode: string): StorageMode => {
  if (mode === "encrypted" || mode === "plain") return mode;
  throw new PseudonymError(`Unknown storage "${mode}": use "encrypted" (the default) or "plain".`);
};

/**
 * Chooses how the directory is kept, for this process: `encrypted` (the default) or `plain`, a readable JSON file
 * with no key, which stores names and identifiers unencrypted. It overrides `PSEUDONYM_STORAGE`. A folder that
 * holds the other mode's directory is refused, never converted: see `pseudonym migrate`.
 */
export function configure(options: { storage?: StorageMode }): void {
  configured = options.storage === undefined ? undefined : checkMode(options.storage);
}

/** The storage mode in use: `configure()`, else `PSEUDONYM_STORAGE`, else `encrypted`. */
export function storageMode(): StorageMode {
  return configured ?? (process.env.PSEUDONYM_STORAGE ? checkMode(process.env.PSEUDONYM_STORAGE) : "encrypted");
}

const unreadable = () =>
  new PseudonymError(
    `The directory in ${homeDir()} can't be read: it was written with another key, or the file was modified. Nothing was changed. If the key changed, restore the right one with "pseudonym key import".`,
  );

/** The encrypted store: AES-256-GCM, aliases and matchers as HMACs, all under subkeys of the key (ADR-002, ADR-003). */
async function encryptedStore(): Promise<Store> {
  const key = await loadKey();
  const aliases = subkey(key, "aliases");
  const directory = subkey(key, "directory");
  const matchers = subkey(key, "matchers");
  return {
    mode: "encrypted",
    file: encryptedPath(),
    decode(file) {
      if (file.length < HEADER.length + 28 || !file.subarray(0, MAGIC.length).equals(MAGIC)) throw unreadable();
      if (file[MAGIC.length] !== VERSION) {
        throw new PseudonymError(`The directory in ${homeDir()} was written by a newer version of pseudonym: update it.`);
      }
      const nonce = file.subarray(HEADER.length, HEADER.length + 12);
      const tag = file.subarray(HEADER.length + 12, HEADER.length + 28);
      try {
        const decipher = createDecipheriv("aes-256-gcm", directory, nonce);
        decipher.setAAD(HEADER);
        decipher.setAuthTag(tag);
        const plain = Buffer.concat([decipher.update(file.subarray(HEADER.length + 28)), decipher.final()]);
        return JSON.parse(plain.toString("utf8")) as Data;
      } catch {
        throw unreadable();
      }
    },
    encode(data) {
      const nonce = randomBytes(12);
      const cipher = createCipheriv("aes-256-gcm", directory, nonce);
      cipher.setAAD(HEADER);
      const body = Buffer.concat([cipher.update(JSON.stringify(data), "utf8"), cipher.final()]);
      return Buffer.concat([HEADER, nonce, cipher.getAuthTag(), body]);
    },
    matcher: (identifier) => createHmac("sha256", matchers).update(JSON.stringify([identifier.kind, identifier.value])).digest("base64url"),
    newAlias(service, best, link, taken) {
      let alias = aliasFor(aliases, service, best, link);
      for (let length = ALIAS_LENGTH + 1; taken(alias); length++) alias = aliasFor(aliases, service, best, link, length);
      return alias;
    },
  };
}

/**
 * The plain store: readable JSON, no key. Aliases are random and kept in the directory; identifiers are kept in
 * clear as `kind:value`. Protection is left to the folder's permissions.
 */
function plainStore(): Store {
  return {
    mode: "plain",
    file: plainPath(),
    decode(bytes) {
      let json: { format?: unknown; version?: unknown; entries?: unknown };
      try {
        json = JSON.parse(bytes.toString("utf8"));
      } catch {
        throw new PseudonymError(`The directory in ${plainPath()} isn't valid JSON. Nothing was changed: fix or restore the file.`);
      }
      if (json.format !== PLAIN_FORMAT || !Array.isArray(json.entries)) {
        throw new PseudonymError(`${plainPath()} isn't a pseudonym directory. Nothing was changed.`);
      }
      if (json.version !== PLAIN_VERSION) throw new PseudonymError(`The directory in ${plainPath()} was written by a newer version of pseudonym: update it.`);
      return { entries: json.entries as Entry[] };
    },
    encode: (data) => Buffer.from(`${JSON.stringify({ format: PLAIN_FORMAT, version: PLAIN_VERSION, entries: data.entries }, null, 2)}\n`, "utf8"),
    matcher: (identifier) => `${identifier.kind}:${identifier.value}`,
    newAlias(_service, _best, _link, taken) {
      for (;;) {
        const alias = `A-${base32(randomBytes(8), ALIAS_LENGTH)}`;
        if (!taken(alias)) return alias;
      }
    },
  };
}

const exists = (file: string) => stat(file).then(() => true, (error: unknown) => (isCode(error, "ENOENT") ? false : Promise.reject(error)));

/**
 * The store of the configured mode, after checking the folder agrees: a directory of the other mode, or both, is an
 * error that says what to do. Never a silent switch, and never a conversion.
 */
async function openStore(): Promise<Store> {
  const mode = storageMode();
  const [hasEncrypted, hasPlain] = await Promise.all([exists(encryptedPath()), exists(plainPath())]);
  if (hasEncrypted && hasPlain) {
    throw new PseudonymError(`${homeDir()} holds both an encrypted and a plain directory: keep one (move the other away), then try again.`);
  }
  if (mode === "encrypted" && hasPlain) {
    throw new PseudonymError(
      `${homeDir()} holds a plain directory (directory.json), but the storage is "encrypted". Set PSEUDONYM_STORAGE=plain to use it, or convert it with "pseudonym migrate --to encrypted" (with PSEUDONYM_STORAGE=plain).`,
    );
  }
  if (mode === "plain" && hasEncrypted) {
    throw new PseudonymError(
      `${homeDir()} holds an encrypted directory (directory.enc), but the storage is "plain". Unset PSEUDONYM_STORAGE to use it, or convert it with "pseudonym migrate --to plain".`,
    );
  }
  return mode === "plain" ? plainStore() : encryptedStore();
}

async function read(store: Store): Promise<Data> {
  let bytes: Buffer;
  try {
    bytes = await readFile(store.file);
  } catch (error) {
    if (isCode(error, "ENOENT")) return { entries: [] };
    throw error;
  }
  return store.decode(bytes);
}

/** `bytes` to a temporary file renamed over `file`: a crash never leaves half a file. Readable by the user only. */
async function writeAtomically(file: string, bytes: Buffer): Promise<void> {
  const temporary = `${file}.${process.pid}.${randomBytes(4).toString("hex")}.tmp`;
  await writeFile(temporary, bytes, { mode: 0o600 });
  // Windows refuses the rename while another process (an antivirus, a reader) has the file open: retry.
  for (let attempt = 0; ; attempt++) {
    try {
      await rename(temporary, file);
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

/** Runs `work` under the lock file. A lock older than LOCK_STALE_MS is taken as left by a crashed process and broken. */
async function locked<T>(work: () => Promise<T>): Promise<T> {
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
    return await work();
  } finally {
    await unlink(lockPath()).catch(() => undefined);
  }
}

/** Runs `change` on the directory under the lock and writes the result (changes hold the lock for milliseconds). */
async function update<T>(change: (data: Data, store: Store) => T): Promise<T> {
  const store = await openStore();
  return locked(async () => {
    const data = await read(store);
    const result = change(data, store);
    await writeAtomically(store.file, store.encode(data));
    return result;
  });
}

/** The directory as it is now, without the lock: writes replace the file whole, so a read never sees half of one. */
async function snapshot(): Promise<{ data: Data; store: Store }> {
  const store = await openStore();
  return { data: await read(store), store };
}

/**
 * Converts the directory to the other storage mode (ADR-010): the target is written from the source, then the source
 * is moved aside to `<file>.<date>.bak`, never deleted. Aliases, names, service ids and links are kept. Going to
 * plain, emails and institutional ids can't come along (the encrypted directory only has their HMACs): people
 * without a service id can't be recognized again. Refuses when there is nothing to convert or the target exists.
 */
export async function migrate(to: StorageMode): Promise<{ people: number; unmatchable: number; lostMatchers: number; backup: string }> {
  checkMode(to);
  const [source, target] = to === "plain" ? [encryptedPath(), plainPath()] : [plainPath(), encryptedPath()];
  if (!(await exists(source))) throw new PseudonymError(`There is no ${to === "plain" ? "encrypted" : "plain"} directory in ${homeDir()} to convert.`);
  if (await exists(target)) throw new PseudonymError(`${target} already exists: nothing was changed. Move it away first if it's not needed.`);
  const from = to === "plain" ? await encryptedStore() : plainStore();
  const into = to === "plain" ? plainStore() : await encryptedStore();
  return locked(async () => {
    const data = await read(from);
    let unmatchable = 0;
    let lostMatchers = 0;
    for (const entry of data.entries) {
      if (to === "plain") {
        if (entry.matchers.length) lostMatchers++;
        entry.matchers = [];
        if (!entry.services.some((s) => s.id !== undefined)) unmatchable++;
      } else {
        // Plain matchers are "kind:value": the encrypted store turns them into HMACs under the key.
        entry.matchers = entry.matchers.map((m) => {
          const at = m.indexOf(":");
          return into.matcher({ kind: m.slice(0, at) as Identifier["kind"], value: m.slice(at + 1) });
        });
      }
    }
    await writeAtomically(target, into.encode(data));
    const backup = `${source}.${new Date().toISOString().replace(/[:.]/g, "-")}.bak`;
    await rename(source, backup);
    return { people: data.entries.length, unmatchable, lostMatchers, backup };
  });
}

const hasService = (entry: Entry, service: string) => entry.services.some((s) => s.service === service);

function find(data: Data, alias: string): Entry | undefined {
  const wanted = alias.trim().toUpperCase();
  return data.entries.find((entry) => entry.alias === wanted || entry.links.includes(wanted));
}

function checkPerson(person: Person): void {
  if (typeof person?.service !== "string" || !person.service.trim()) throw new PseudonymError("A person needs a service, such as \"moodle@<site host>\".");
  if (typeof person.displayName !== "string") throw new PseudonymError("A person needs a displayName.");
}

function rememberOne(data: Data, store: Store, person: Person, now: string): string {
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
    const m = store.matcher(identifier);
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
      winner.matchers.push(store.matcher(identifier));
    });
    return winner.alias;
  }

  const best = identifiers[0]!;
  const taken = (alias: string) => data.entries.some((entry) => entry.alias === alias || entry.links.includes(alias));
  const alias = store.newAlias(person.service, best, link, taken);
  data.entries.push({
    alias,
    displayName: person.displayName,
    services: [serviceUserId ? { service: person.service, id: serviceUserId } : { service: person.service }],
    matchers: identifiers.filter((i) => i.kind !== "serviceUserId").map((i) => store.matcher(i)),
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
  const aliases = await update((data, store) => people.map((person) => rememberOne(data, store, person, now)));
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

/**
 * Forgets a whole service (closing a course): people met only there are removed; people also met in other
 * services keep their entry, without that service's id.
 */
export async function forgetService(service: string): Promise<{ removed: number; kept: number }> {
  return update((data) => {
    let removed = 0;
    let kept = 0;
    data.entries = data.entries.filter((entry) => {
      if (!hasService(entry, service)) return true;
      if (entry.services.length === 1) {
        removed++;
        return false;
      }
      entry.services = entry.services.filter((s) => s.service !== service);
      kept++;
      return true;
    });
    return { removed, kept };
  });
}

/** Empties the directory. The key stays: someone met again gets the same alias back. Returns how many were removed. */
export async function forgetAll(): Promise<number> {
  return update((data) => {
    const removed = data.entries.length;
    data.entries = [];
    return removed;
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
