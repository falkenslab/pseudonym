#!/usr/bin/env node
// The `pseudonym` command, for the person in charge only: it resolves aliases and manages the key.
// Never something an agent should be allowed to run (see the README's client permissions).
import { readFile, rename } from "node:fs/promises";
import { parseArgs } from "node:util";
import { aliasOf, directoryPath, forget, link, peopleIn, prune, remember, reveal, services as listServices, whois, type Entry, type Person } from "./directory.js";
import { PseudonymError } from "./errors.js";
import { createKey, fingerprint, isCode, KEY_BYTES, readKey, replaceKey } from "./home.js";
import { redact } from "./redact.js";
import { readSecret } from "./secret.js";
import { csvField, csvLine, parseCsv } from "./csv.js";

const USAGE = `Usage: pseudonym <command>

Commands:
  whois <alias>                      who an alias is
  alias "<name>"                     the aliases of people with that name, and their services
  aliases [--service <service>]      a service's people as CSV (alias,name) on stdout
  services [--json]                  the services in the directory, and how many people each has
  redact [--service <service>] [file]    a text (file or stdin) with people as aliases and contact data as placeholders
  reveal [--with-alias] [file]       a text (file or stdin) with every known alias replaced by the person's name
  remember --name <name> [--email <email>] [--institutional-id <id>] [--service-user-id <id>]
                                     a person's alias (also --service, --link, --json)
  remember --csv <file> [--only-aliases]
                                     aliases for a whole CSV (name, email, institutional_id, service_user_id)
  resolve <alias> [--service <service>]  the service's id behind an alias (also --json)
  link <alias> <alias>               the same person: keep the first alias, the second resolves to it
  forget <alias>                     remove a person from the directory
  prune --older-than <n>(d|m|y)      remove people not seen for that long
  key fingerprint                    a short code of the key, to compare machines
  key export                         print the key, to back it up or move it
  key import [--force]               read a key from stdin (--force replaces a different one)
  help                               this text

The service, where a command takes one: --service, else PSEUDONYM_SERVICE, else "default".
Exit codes: 0 done, 1 error, 2 not found.`;

const DEFAULT_SERVICE = "default";

const OK = 0;
const NOT_FOUND = 2;

const out = (text: string) => process.stdout.write(`${text}\n`);
const warn = (text: string) => process.stderr.write(`pseudonym: ${text}\n`);

function need(value: string | undefined, what: string): string {
  if (!value) throw new PseudonymError(`Missing ${what}. Run "pseudonym help".`);
  return value;
}

const services = (entry: Entry) => entry.services.map((s) => s.service).join(", ");

function parseAge(age: string): Date {
  const match = /^(\d+)([dmy])$/.exec(age);
  if (!match) throw new PseudonymError(`"${age}" is not an age: use a number and d, m or y, such as 90d or 2y.`);
  const n = Number(match[1]);
  const date = new Date();
  if (match[2] === "d") date.setDate(date.getDate() - n);
  else if (match[2] === "m") date.setMonth(date.getMonth() - n);
  else date.setFullYear(date.getFullYear() - n);
  return date;
}

function option(args: string[], name: string): string | undefined {
  const at = args.indexOf(name);
  return at === -1 ? undefined : need(args[at + 1], `a value for ${name}`);
}

/** Options and positionals of a command, refusing unknown options with a message that says what to run. */
function parse<T extends Record<string, { type: "string" | "boolean" }>>(args: string[], options: T, command: string) {
  try {
    return parseArgs({ args, options, allowPositionals: true, strict: true });
  } catch (error) {
    throw new PseudonymError(`${(error as Error).message.replace(/\. To specify a positional.*$/s, "")} Run "pseudonym help" for "${command}".`);
  }
}

/** The service a person asked for: --service, else PSEUDONYM_SERVICE. */
const requestedService = (flag: string | undefined) => flag || process.env.PSEUDONYM_SERVICE || undefined;

/** The service for commands that write or look up one: the one asked for, else "default". */
const serviceOrDefault = (flag: string | undefined) => requestedService(flag) ?? DEFAULT_SERVICE;

const knownServices = (list: { service: string }[]) => list.map((s) => s.service).join(", ");

/**
 * The service whose people's names `redact` replaces. Asked for: that one, with a warning if the directory
 * doesn't know it. Not asked for: "default" if it has people, else the only service there is, else a choice
 * to make. With nobody in the directory, any name will do: only the patterns apply.
 */
async function serviceForRedact(flag: string | undefined): Promise<string> {
  const list = await listServices();
  const asked = requestedService(flag);
  if (list.length === 0) {
    warn("The directory has no people yet, so no names were replaced: only emails, phones, ids and IBANs.");
    return asked ?? DEFAULT_SERVICE;
  }
  if (asked) {
    if (!list.some((s) => s.service === asked)) {
      warn(`The directory has nobody in "${asked}", so no names were replaced. It knows: ${knownServices(list)}.`);
    }
    return asked;
  }
  if (list.some((s) => s.service === DEFAULT_SERVICE)) return DEFAULT_SERVICE;
  if (list.length === 1) {
    warn(`Using the only service in the directory: ${list[0]!.service}.`);
    return list[0]!.service;
  }
  throw new PseudonymError(`The directory has several services: choose one with --service. It knows: ${knownServices(list)}.`);
}

/** The text to work on: the file given, or stdin when there is none or it's "-". */
async function readInput(file: string | undefined): Promise<string> {
  if (file && file !== "-") {
    try {
      return await readFile(file, "utf8");
    } catch (error) {
      throw new PseudonymError(`Can't read ${file}: ${isCode(error, "ENOENT") ? "no such file" : (error as NodeJS.ErrnoException).code ?? "unreadable"}.`);
    }
  }
  if (process.stdin.isTTY) warn("Reading the text from the terminal: end it with Ctrl+D (Ctrl+Z then Enter on Windows).");
  let text = "";
  for await (const chunk of process.stdin) text += String(chunk);
  return text;
}

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

function replacedSummary(replaced: Awaited<ReturnType<typeof redact>>["replaced"]): string {
  const parts = [
    replaced.names && plural(replaced.names, "name", "names"),
    replaced.emails && plural(replaced.emails, "email", "emails"),
    replaced.phones && plural(replaced.phones, "phone", "phones"),
    replaced.ids && plural(replaced.ids, "id", "ids"),
    replaced.ibans && plural(replaced.ibans, "IBAN", "IBANs"),
  ].filter(Boolean);
  return parts.length ? `Replaced ${parts.join(", ")}.` : "Nothing to replace.";
}

async function redactCommand(args: string[]): Promise<number> {
  const { values, positionals } = parse(args, { service: { type: "string" } }, "redact");
  const text = await readInput(positionals[0]);
  const result = await redact(text, { service: await serviceForRedact(values.service) });
  process.stdout.write(result.text);
  warn(replacedSummary(result.replaced));
  return OK;
}

async function revealCommand(args: string[]): Promise<number> {
  const { values, positionals } = parse(args, { "with-alias": { type: "boolean" } }, "reveal");
  const result = await reveal(await readInput(positionals[0]), values["with-alias"] === true);
  process.stdout.write(result.text);
  const unknown = result.unknown ? `; ${plural(result.unknown, "unknown alias", "unknown aliases")} left as is` : "";
  warn(`Revealed ${plural(result.revealed, "alias", "aliases")}${unknown}.`);
  if (result.revealed) warn("The output holds names in clear: never paste it back to a model, nor where an agent can read it.");
  return OK;
}

// CSV columns the library reads, by their header with case, spaces, hyphens and underscores ignored.
const PERSON_COLUMNS = { name: "name", email: "email", institutionalid: "institutionalId", serviceuserid: "serviceUserId" } as const;
const columnKey = (header: string) => header.toLowerCase().replace(/[\s_-]+/g, "");

/** The people of a CSV, with every row checked before anything is remembered. Errors name lines, never content. */
function peopleFromCsv(text: string, service: string, link: boolean | undefined) {
  const [head, ...rows] = parseCsv(text);
  if (!head) throw new PseudonymError("The CSV is empty: it needs a header line with at least a name column.");
  const role = head.fields.map((header) => PERSON_COLUMNS[columnKey(header) as keyof typeof PERSON_COLUMNS]);
  if (!role.includes("name")) throw new PseudonymError(`The CSV has no "name" column in its header (line ${head.line}).`);
  const people: Person[] = rows.map(({ line, fields }) => {
    const value = (wanted: string) => fields[role.indexOf(wanted as (typeof role)[number])]?.trim() || undefined;
    const identifiers = { email: value("email"), institutionalId: value("institutionalId"), serviceUserId: value("serviceUserId") };
    if (!value("name")) throw new PseudonymError(`Line ${line} has no name: nothing was remembered.`);
    if (!identifiers.email && !identifiers.institutionalId && !identifiers.serviceUserId) {
      throw new PseudonymError(`Line ${line} has no email, institutional_id or service_user_id: nothing was remembered.`);
    }
    return { service, identifiers, displayName: value("name")!, link };
  });
  return { head: head.fields, role, rows: rows.map((r) => r.fields), people };
}

async function rememberCommand(args: string[]): Promise<number> {
  const { values, positionals } = parse(
    args,
    {
      name: { type: "string" },
      email: { type: "string" },
      "institutional-id": { type: "string" },
      "service-user-id": { type: "string" },
      service: { type: "string" },
      link: { type: "boolean" },
      csv: { type: "string" },
      "only-aliases": { type: "boolean" },
      json: { type: "boolean" },
    },
    "remember",
  );
  if (positionals.length) throw new PseudonymError('"remember" takes its data as options: --name, --email… or --csv <file>. Run "pseudonym help".');
  const service = serviceOrDefault(values.service);
  const link = values.link ? true : undefined;

  if (values.csv === undefined) {
    const displayName = need(values.name, "--name (or --csv <file>)");
    const alias = await remember({
      service,
      identifiers: { email: values.email, institutionalId: values["institutional-id"], serviceUserId: values["service-user-id"] },
      displayName,
      link,
    });
    out(values.json ? JSON.stringify({ alias }) : alias);
    return OK;
  }

  const { head, role, rows, people } = peopleFromCsv(await readInput(values.csv), service, link);
  const aliases = people.length ? await remember(people) : [];
  // Without --only-aliases every column is kept; with it, the ones that identify someone are dropped.
  const kept = head.map((_, i) => i).filter((i) => !values["only-aliases"] || role[i] === undefined);
  if (values.json) {
    out(JSON.stringify(rows.map((fields, r) => Object.fromEntries([["alias", aliases[r]], ...kept.map((i) => [head[i], fields[i] ?? ""])]))));
  } else {
    out(csvLine(["alias", ...kept.map((i) => head[i]!)]));
    rows.forEach((fields, r) => out(csvLine([aliases[r]!, ...kept.map((i) => fields[i] ?? "")])));
  }
  warn(`Remembered ${plural(people.length, "person", "people")} in ${service}.`);
  if (!values["only-aliases"]) warn("The output still holds names and identifiers: use --only-aliases for something a model may read.");
  return OK;
}

async function resolveCommand(args: string[]): Promise<number> {
  const { values, positionals } = parse(args, { service: { type: "string" }, json: { type: "boolean" } }, "resolve");
  const alias = need(positionals[0], "an alias").trim().toUpperCase();
  const service = serviceOrDefault(values.service);
  // What resolve() does, with "not found" told apart from real errors (a key or directory problem).
  const entry = await whois(alias);
  const id = entry?.services.find((s) => s.service === service)?.id;
  if (!entry || id === undefined) {
    warn(entry ? `${entry.alias} has no user id in ${service}.` : `Nobody in the directory has the alias ${alias}.`);
    return NOT_FOUND;
  }
  out(values.json ? JSON.stringify({ alias: entry.alias, service, id }) : id);
  return OK;
}

async function servicesCommand(args: string[]): Promise<number> {
  const { values } = parse(args, { json: { type: "boolean" } }, "services");
  const list = await listServices();
  if (values.json) {
    out(JSON.stringify(list));
    return OK;
  }
  if (list.length === 0) {
    warn("The directory has no people yet.");
    return OK;
  }
  for (const { service, people } of list) out(`${service}  ${plural(people, "person", "people")}`);
  return OK;
}

async function importKey(force: boolean): Promise<number> {
  const typed = await readSecret("Paste the key (from \"pseudonym key export\"): ");
  if (typed === undefined) throw new PseudonymError("Cancelled: nothing was imported.");
  const text = typed.trim();
  const key = Buffer.from(text, "base64");
  if (key.length !== KEY_BYTES || key.toString("base64") !== text) {
    throw new PseudonymError(`That isn't a key: "pseudonym key export" prints ${KEY_BYTES} bytes in base64.`);
  }
  const current = await readKey().catch((error: unknown) => {
    if (error instanceof PseudonymError) return null; // damaged: replaceable with --force
    throw error;
  });
  if (current?.equals(key)) {
    out(`That key is already the one in use (fingerprint ${fingerprint(key)}).`);
    return OK;
  }
  if (current === undefined) {
    // No key, or one lost after use: installing it brings the directory back.
    await createKey(key);
    out(`Key imported (fingerprint ${fingerprint(key)}).`);
    return OK;
  }
  if (!force) {
    const which = current ? `fingerprint ${fingerprint(current)}` : "damaged";
    throw new PseudonymError(
      `A different key is already in use (${which}). Every alias and the directory depend on it. To replace it anyway, run "pseudonym key import --force": the current directory will be kept as a backup that only the old key opens.`,
    );
  }
  const backup = `${directoryPath()}.${new Date().toISOString().replace(/[:.]/g, "-")}.bak`;
  const moved = await rename(directoryPath(), backup).then(
    () => true,
    (error: unknown) => {
      if (isCode(error, "ENOENT")) return false;
      throw error;
    },
  );
  await replaceKey(key);
  out(`Key replaced (fingerprint ${fingerprint(key)}).`);
  if (moved) out(`The previous directory is in ${backup}; only the previous key opens it.`);
  return OK;
}

async function keyCommand(args: string[]): Promise<number> {
  const [sub, ...rest] = args;
  if (sub === "import") {
    if (rest.some((arg) => arg !== "--force")) {
      throw new PseudonymError(`"key import" reads the key from stdin, never from the command line, where it would stay in the shell's history.`);
    }
    return importKey(rest.includes("--force"));
  }
  if (sub !== "fingerprint" && sub !== "export") throw new PseudonymError(`Unknown key command "${sub ?? ""}". Run "pseudonym help".`);
  const key = await readKey();
  if (!key) {
    warn("No key yet: one is created the first time a program uses the library, or with \"pseudonym key import\".");
    return NOT_FOUND;
  }
  if (sub === "fingerprint") {
    out(fingerprint(key));
    return OK;
  }
  warn("This is the key: whoever has it can resolve every alias. Keep it somewhere safe, and never where an agent can read it.");
  out(key.toString("base64"));
  return OK;
}

export async function run(args: string[]): Promise<number> {
  const [command, ...rest] = args;
  switch (command) {
    case undefined:
    case "help":
    case "--help":
      out(USAGE);
      return OK;
    case "whois": {
      const entry = await whois(need(rest[0], "an alias"));
      if (!entry) {
        warn(`Nobody in the directory has the alias ${rest[0]}.`);
        return NOT_FOUND;
      }
      out(entry.displayName);
      out(`  alias ${entry.alias}${entry.links.length ? ` (also ${entry.links.join(", ")})` : ""}`);
      out(`  services ${services(entry)}`);
      out(`  first seen ${entry.firstSeen}, last seen ${entry.lastSeen}`);
      return OK;
    }
    case "alias": {
      const entries = await aliasOf(need(rest.join(" "), "a name"));
      if (entries.length === 0) {
        warn(`Nobody in the directory is called "${rest.join(" ")}".`);
        return NOT_FOUND;
      }
      for (const entry of entries) out(`${entry.alias}  ${entry.displayName}  (${services(entry)})`);
      return OK;
    }
    case "services":
      return servicesCommand(rest);
    case "redact":
      return redactCommand(rest);
    case "reveal":
      return revealCommand(rest);
    case "remember":
      return rememberCommand(rest);
    case "resolve":
      return resolveCommand(rest);
    case "aliases": {
      const people = await peopleIn(serviceOrDefault(option(rest, "--service")));
      warn("This list holds names in clear: keep it away from agents, and delete it when done.");
      out("alias,name");
      for (const entry of people) out(`${entry.alias},${csvField(entry.displayName)}`);
      return OK;
    }
    case "link": {
      const a = need(rest[0], "two aliases");
      const b = need(rest[1], "two aliases");
      for (const alias of [a, b]) {
        if (!(await whois(alias))) {
          warn(`Nobody in the directory has the alias ${alias}.`);
          return NOT_FOUND;
        }
      }
      const kept = await link(a, b);
      out(`${kept} kept; ${b.trim().toUpperCase()} now resolves to it.`);
      return OK;
    }
    case "forget": {
      const alias = need(rest[0], "an alias");
      if (!(await forget(alias))) {
        warn(`Nobody in the directory has the alias ${alias}.`);
        return NOT_FOUND;
      }
      out(`Forgot ${alias.trim().toUpperCase()}.`);
      return OK;
    }
    case "prune": {
      const removed = await prune(parseAge(need(option(rest, "--older-than"), "--older-than <n>(d|m|y)")));
      out(`Removed ${removed} ${removed === 1 ? "person" : "people"}.`);
      return OK;
    }
    case "key":
      return keyCommand(rest);
    default:
      throw new PseudonymError(`Unknown command "${command}". Run "pseudonym help".`);
  }
}

try {
  process.exitCode = await run(process.argv.slice(2));
} catch (error) {
  process.stderr.write(`${error instanceof PseudonymError ? `pseudonym: ${error.message}` : String((error as Error)?.stack ?? error)}\n`);
  process.exitCode = 1;
}
