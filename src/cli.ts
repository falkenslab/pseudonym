#!/usr/bin/env node
// The `pseudonym` command, for the person in charge only: it resolves aliases and manages the key.
// Never something an agent should be allowed to run (see the README's client permissions).
import { PseudonymError } from "./index.js";

const USAGE = `Usage: pseudonym <command>

Commands (coming one by one):
  whois <alias>              who an alias is
  alias "<name>"             the alias of a person met before
  link <alias> <alias>       the same person: keep the first alias
  forget <alias>             remove a person from the directory
  prune --older-than <age>   remove people not seen for that long
  key export|import|fingerprint
  help                       this text`;

export function run(args: string[]): number {
  const [command] = args;
  if (!command || command === "help" || command === "--help") {
    console.log(USAGE);
    return 0;
  }
  throw new PseudonymError(`Unknown command "${command}". Run "pseudonym help".`);
}

try {
  process.exitCode = run(process.argv.slice(2));
} catch (error) {
  console.error(error instanceof PseudonymError ? `pseudonym: ${error.message}` : error);
  process.exitCode = 1;
}
