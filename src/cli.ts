#!/usr/bin/env node
// The `pseudonym` command, for the person in charge only: it resolves aliases and manages the key.
// Never something an agent should be allowed to run (see the README's client permissions).
import { rename } from "node:fs/promises";
import { aliasOf, directoryPath, forget, link, peopleIn, prune, whois, type Entry } from "./directory.js";
import { PseudonymError } from "./errors.js";
import { createKey, fingerprint, isCode, KEY_BYTES, readKey, replaceKey } from "./home.js";
import { readSecret } from "./secret.js";

const USAGE = `Usage: pseudonym <command>

Commands:
  whois <alias>                      who an alias is
  alias "<name>"                     the aliases of people with that name, and their services
  aliases --service <service>        a service's people as CSV (alias,name) on stdout
  link <alias> <alias>               the same person: keep the first alias, the second resolves to it
  forget <alias>                     remove a person from the directory
  prune --older-than <n>(d|m|y)      remove people not seen for that long
  key fingerprint                    a short code of the key, to compare machines
  key export                         print the key, to back it up or move it
  key import [--force]               read a key from stdin (--force replaces a different one)
  help                               this text

Exit codes: 0 done, 1 error, 2 not found.`;

const OK = 0;
const NOT_FOUND = 2;

const out = (text: string) => process.stdout.write(`${text}\n`);
const warn = (text: string) => process.stderr.write(`pseudonym: ${text}\n`);

function need(value: string | undefined, what: string): string {
  if (!value) throw new PseudonymError(`Missing ${what}. Run "pseudonym help".`);
  return value;
}

const services = (entry: Entry) => entry.services.map((s) => s.service).join(", ");

const csv = (value: string) => (/[",\r\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value);

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
    case "aliases": {
      const people = await peopleIn(need(option(rest, "--service"), "--service <service>"));
      warn("This list holds names in clear: keep it away from agents, and delete it when done.");
      out("alias,name");
      for (const entry of people) out(`${entry.alias},${csv(entry.displayName)}`);
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
