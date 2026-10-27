# How it works inside

Everything uses [`node:crypto`](https://nodejs.org/api/crypto.html) with standard constructions; there are no runtime dependencies and no home-made schemes.

## The key and its subkeys

The key is 32 random bytes (`randomBytes`), created on first use. It's never used directly: one subkey per purpose is derived with **[HKDF-SHA256](https://www.rfc-editor.org/rfc/rfc5869)**, no salt, `info` `pseudonym/<purpose>`:

| Subkey | Used for |
| --- | --- |
| `pseudonym/aliases` | Computing aliases |
| `pseudonym/directory` | Encrypting the directory |
| `pseudonym/matchers` | The directory's hashes of identifiers |
| `pseudonym/fingerprint` | The key's fingerprint |

The fingerprint is the first 8 Crockford base32 characters of its subkey: it identifies the key and reveals nothing about it, nor about the other subkeys.

### Creating it safely

Several programs may start at once on a fresh machine. The key is written to a temporary file and **hard-linked** to `key`: the link fails if `key` already exists, so every process ends up reading the same complete key, never a half-written one. Then an empty `used` marker is written.

The marker is what makes the library **fail closed**: if it exists and the key doesn't, a key existed here and is now lost, and the library refuses to work (pointing to `pseudonym key import`) instead of creating a new key that would silently give everyone new aliases.

## Aliases

```text
alias = "A-" + base32(HMAC-SHA256(aliasesKey, JSON.stringify([service, kind, value])))[0..6]
```

- `kind` and `value` are the strongest identifier present and its type (`institutionalId`, `email` or `serviceUserId`), [normalized](../guides/concepts.md#identifiers). The kind is in the input so that an institutional id `7` and a service user id `7` give different aliases.
- With linking on, the service is left out: `JSON.stringify([kind, value])`.
- Base32 is [Crockford's alphabet](https://www.crockford.com/base32.html) (`0123456789ABCDEFGHJKMNPQRSTVWXYZ`), upper case.
- 6 characters are 30 bits: a collision is unlikely below tens of thousands of people in a service. When the directory already has the alias for someone else, the newcomer gets 7 characters (and so on), which extend the same prefix.

The JSON array makes the input unambiguous: no service and value can be split differently to give the same bytes.

## The directory

One file, `directory.enc`:

```text
"PSEUDONYM-DIRECTORY" | version (1 byte) | nonce (12 bytes) | GCM tag (16 bytes) | ciphertext
```

- **AES-256-GCM** ([NIST SP 800-38D](https://csrc.nist.gov/pubs/sp/800/38/d/final)) under the directory subkey, with a fresh random nonce on every write.
- The magic string and the version are authenticated as additional data: changing the header fails like changing the body.
- The plaintext is JSON: one entry per person with their alias, display name, service ids, matchers, linked aliases, and first and last seen dates.
- **Matchers** are [HMAC-SHA256](https://www.rfc-editor.org/rfc/rfc2104) of `[kind, value]` under the matchers subkey, for the email and the institutional id: they let the directory recognize a person by an identifier without storing it. The display name and the service user ids are stored, inside the encryption, because `whois` and `resolve()` need them.

A wrong key, a modified file or an unknown version makes every read throw a `PseudonymError` and leaves the file untouched.

### Concurrent programs

Every program on the machine shares the file:

- **Writes** take `directory.lock` (created exclusively), read the file, change it, write the new version to a temporary file and **rename** it over the old one, then release the lock. A lock older than 10 seconds is taken as left by a crash and broken; a program waiting more than 15 seconds gives up with a `PseudonymError`. On Windows, the rename is retried while another process (an antivirus, a reader) holds the file.
- **Reads** take no lock: the rename replaces the file whole, so a reader always sees one complete version.
- A crash between writing and renaming leaves a stray temporary file and the previous directory intact.

## Plain storage

With [`PSEUDONYM_STORAGE=plain`](../guides/storage.md), the same directory logic runs with a different store: the file is `directory.json`, pretty-printed JSON with a format name and a version, written through the same temporary file, rename and lock; aliases are `A-` and 6 random Crockford base32 characters (`randomBytes`), drawn again if taken; matchers are the identifiers themselves, `kind:value`. No key is read or created. A folder holding the other mode's directory, or both, is refused before anything is read.

## Matching people

`remember()` looks a person up with each identifier, strongest first:

- the institutional id and the email, by matcher;
- the service user id, among that service's ids.

Without linking, only entries already met **in that service** count, so the same email in another service gets another alias. With linking, any entry counts, the oldest first.

The first match wins. If a weaker identifier points to a different entry, the entries are never merged (they may be two people) and a `PseudonymWarning` names both aliases. A match updates the entry's name, service id and last seen date, and learns the identifiers it didn't know (a new email).

## Redaction

Names are found on a **folded** copy of the text: each UTF-16 unit lower-cased and stripped of its accent, so the copy has exactly the same length and every match has the same position in the original. Word boundaries are lookarounds on Unicode letters and digits, because `\b` is ASCII-only in JavaScript even with the `u` flag. Then the patterns of `src/patterns.ts` run in a fixed order (emails, IBANs, cards, national ids, phones last, so a phone pattern never takes another value's digit groups), only those of the countries asked for, each value checked (Luhn, mod 97, check letters and digits, issued ranges) before it's replaced. See [Redacting free text](../guides/redaction.md).

## The CLI's key input

`pseudonym key import` reads stdin. On a terminal it switches to raw mode and reads key by key without echoing: Enter ends, backspace deletes, Ctrl+C cancels, and escape sequences (arrow keys, bracketed paste markers) are dropped so they never end up in the key.
