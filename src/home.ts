// The shared folder: where the key, the directory and the marker live, one per user, shared by every
// program that uses the library (ADR-003). Everything secret derives from the key read here.
import { hkdfSync, randomBytes } from "node:crypto";
import { access, link, mkdir, readFile, unlink, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import path from "node:path";
import { PseudonymError } from "./errors.js";

export const KEY_BYTES = 32;

/** The folder, from `PSEUDONYM_HOME` when set (tests always set it), else the per-user default. */
export function homeDir(): string {
  const override = process.env.PSEUDONYM_HOME;
  if (override) return path.resolve(override);
  if (process.platform === "win32") return path.join(process.env.APPDATA ?? path.join(homedir(), "AppData", "Roaming"), "pseudonym");
  return path.join(homedir(), ".config", "pseudonym");
}

export const keyPath = () => path.join(homeDir(), "key");
// Its existence means a key was used here once: a missing key is then a loss to repair, not a first run.
const markerPath = () => path.join(homeDir(), "used");

export async function ensureHome(): Promise<string> {
  const dir = homeDir();
  await mkdir(dir, { recursive: true, mode: 0o700 });
  return dir;
}

export const isCode = (error: unknown, ...codes: string[]) => codes.includes((error as NodeJS.ErrnoException).code ?? "");

/** The key, created on first use. Refuses to create one where a key existed before (fail closed). */
export async function loadKey(): Promise<Buffer> {
  await ensureHome();
  const existing = await readKey();
  if (existing) return existing;
  if (await exists(markerPath())) {
    throw new PseudonymError(
      `The key in ${homeDir()} is missing, but one was used there before. Restore it with "pseudonym key import" from your backup; a new key would silently change every alias.`,
    );
  }
  return createKey(randomBytes(KEY_BYTES));
}

/** The key if there is one, without creating it. */
export async function readKey(): Promise<Buffer | undefined> {
  let key: Buffer;
  try {
    key = await readFile(keyPath());
  } catch (error) {
    if (isCode(error, "ENOENT")) return undefined;
    throw error;
  }
  if (key.length !== KEY_BYTES) {
    throw new PseudonymError(`The key in ${homeDir()} is damaged (wrong size). Restore it with "pseudonym key import" from your backup.`);
  }
  return key;
}

/**
 * Installs `key` unless one already exists, and returns the one in place. The key is written to a temporary
 * file and hard-linked to its name, which fails if the name exists: two processes starting at once end with
 * one complete key, never a half-written one.
 */
export async function createKey(key: Buffer): Promise<Buffer> {
  await ensureHome();
  const temporary = `${keyPath()}.${process.pid}.${randomBytes(4).toString("hex")}.tmp`;
  await writeFile(temporary, key, { mode: 0o600 });
  try {
    await link(temporary, keyPath());
  } catch (error) {
    if (!isCode(error, "EEXIST")) throw error;
  } finally {
    await unlink(temporary);
  }
  await writeFile(markerPath(), "", { flag: "a" });
  const installed = await readKey();
  if (!installed) throw new PseudonymError(`Couldn't create the key in ${homeDir()}.`);
  return installed;
}

/** Replaces the key, for `key import --force` only. */
export async function replaceKey(key: Buffer): Promise<void> {
  await unlink(keyPath()).catch((error: unknown) => {
    if (!isCode(error, "ENOENT")) throw error;
  });
  await createKey(key);
}

async function exists(file: string): Promise<boolean> {
  try {
    await access(file);
    return true;
  } catch (error) {
    if (isCode(error, "ENOENT")) return false;
    throw error;
  }
}

export type Purpose = "aliases" | "directory" | "matchers" | "fingerprint";

/** A 32-byte subkey for one purpose: HKDF-SHA256 over the key, no salt, `info` "pseudonym/<purpose>". */
export function subkey(key: Buffer, purpose: Purpose): Buffer {
  return Buffer.from(hkdfSync("sha256", key, Buffer.alloc(0), `pseudonym/${purpose}`, 32));
}
