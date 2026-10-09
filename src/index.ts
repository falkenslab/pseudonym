// The public API: what callers (MCP servers and other programs) import. Nothing here prints: inside an MCP
// server, stdout is the protocol.
import { base32 } from "./aliases.js";
import { loadKey, subkey } from "./home.js";

export { PseudonymError } from "./errors.js";
export type { Identifiers } from "./aliases.js";
export { remember, resolve, type Person } from "./directory.js";

/**
 * A short code of the key (8 base32 characters of its HKDF-SHA256 "pseudonym/fingerprint" subkey), to check
 * that two machines share it. It reveals nothing about the key. Creates the key on first use.
 */
export async function keyFingerprint(): Promise<string> {
  return base32(subkey(await loadKey(), "fingerprint"), 8);
}
