// The public API: what callers (MCP servers and other programs) import. Nothing here prints: inside an MCP
// server, stdout is the protocol.
import { fingerprint, loadKey } from "./home.js";

export { PseudonymError } from "./errors.js";
export type { Identifiers } from "./aliases.js";
export { remember, resolve, type Person } from "./directory.js";
export { COUNTRIES, redact, type Country, type Redacted, type RedactOptions } from "./redact.js";

/**
 * A short code of the key (8 base32 characters of its HKDF-SHA256 "pseudonym/fingerprint" subkey), to check
 * that two machines share it. It reveals nothing about the key. Creates the key on first use.
 */
export async function keyFingerprint(): Promise<string> {
  return fingerprint(await loadKey());
}
