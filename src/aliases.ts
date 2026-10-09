// Identifiers normalized and turned into aliases (ADR-002). Callers never use aliasFor() directly: remember()
// keeps first aliases, lengthens them on collisions and follows links, which a bare computation can't.
import { createHmac } from "node:crypto";
import { PseudonymError } from "./errors.js";

/** What names a person in a service. Pass every one you have; the strongest present makes the alias. */
export interface Identifiers {
  /** An id the institution gives the person (a student number, a DNI), the same across services. */
  institutionalId?: string;
  email?: string;
  /** The service's own id for the person (a Moodle user id), what `resolve()` gives back. */
  serviceUserId?: string;
}

export type IdentifierKind = keyof Identifiers;

/** Strongest first: the identifier most likely to be the same across services and over time. */
export const STRENGTH: readonly IdentifierKind[] = ["institutionalId", "email", "serviceUserId"];

export interface Identifier {
  kind: IdentifierKind;
  value: string;
}

// Part of every alias: changing how an identifier is normalized changes everyone's alias.
const NORMALIZE: Record<IdentifierKind, (value: string) => string> = {
  institutionalId: (value) => value.trim().toUpperCase().replace(/[\s-]+/g, ""),
  email: (value) => value.trim().toLowerCase(),
  serviceUserId: (value) => value.trim(),
};

/** The identifiers present, normalized, strongest first. */
export function normalizeIdentifiers(identifiers: Identifiers): Identifier[] {
  const result: Identifier[] = [];
  for (const kind of STRENGTH) {
    const raw = identifiers[kind];
    if (raw === undefined || raw === null) continue;
    const value = NORMALIZE[kind](String(raw));
    if (value) result.push({ kind, value });
  }
  if (result.length === 0) throw new PseudonymError("A person needs at least one identifier: an institutional id, an email or the service's user id.");
  return result;
}

/** Whether the service stays out of aliases: `link: true`, else `PSEUDONYM_LINK=true`. Off by default (ADR-002). */
export function linkingOn(link?: boolean): boolean {
  return link ?? process.env.PSEUDONYM_LINK === "true";
}

// Crockford's base32: no I, L, O or U, so an alias survives being copied by a person or a model.
const CROCKFORD = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";

/** The first `length` base32 characters of `bytes` (5 bits each). */
export function base32(bytes: Buffer, length: number): string {
  let out = "";
  for (let i = 0; i < length; i++) {
    const bit = i * 5;
    const pair = ((bytes[bit >> 3] ?? 0) << 8) | (bytes[(bit >> 3) + 1] ?? 0);
    out += CROCKFORD[(pair >> (11 - (bit & 7))) & 31];
  }
  return out;
}

export const ALIAS_LENGTH = 6;
export const ALIAS_PATTERN = /^A-[0-9A-HJKMNP-TV-Z]{6,12}$/;

/**
 * The alias of an identifier: HMAC-SHA256 under the aliases subkey of `[service, kind, value]` (the service
 * left out when linking is on), as `A-` and `length` base32 characters. A longer alias extends the shorter
 * one, which is how a collision is resolved.
 */
export function aliasFor(aliasesKey: Buffer, service: string, identifier: Identifier, link: boolean, length = ALIAS_LENGTH): string {
  const input = JSON.stringify(link ? [identifier.kind, identifier.value] : [service, identifier.kind, identifier.value]);
  return `A-${base32(createHmac("sha256", aliasesKey).update(input).digest(), length)}`;
}
