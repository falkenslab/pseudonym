// The public API: what callers (MCP servers and other programs) import. Nothing here prints: inside an MCP
// server, stdout is the protocol.
import { storageMode } from "./directory.js";
import { PseudonymError } from "./errors.js";
import { fingerprint, loadKey } from "./home.js";

export { PseudonymError } from "./errors.js";
export type { Identifiers } from "./aliases.js";
export { configure, remember, resolve, storageMode, type Person, type StorageMode } from "./directory.js";
export { COUNTRIES, redact, type Country, type Redacted, type RedactOptions } from "./redact.js";

/**
 * A short code of the key (8 base32 characters of its HKDF-SHA256 "pseudonym/fingerprint" subkey), to check
 * that two machines share it. It reveals nothing about the key. Creates the key on first use. Throws a
 * `PseudonymError` in plain storage, which has no key.
 */
export async function keyFingerprint(): Promise<string> {
  if (storageMode() === "plain") throw new PseudonymError('The storage is "plain": there is no key, so no fingerprint.');
  return fingerprint(await loadKey());
}
