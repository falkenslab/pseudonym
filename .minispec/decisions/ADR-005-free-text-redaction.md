# ADR-005: Free-text redaction: known names from the directory, plus a few checked patterns

## Decision

The library also redacts free text (a submission, a forum post), with one call: `redact(text, { service })`. It replaces the display names of people in the directory for that service with their aliases, then contact and identity data matched by our own patterns: emails, Spanish phones (`+34` optional, mobiles and landlines), DNI and NIE with their check letter, ES IBANs checked with mod 97. Each kind gets a stable placeholder per value (`[EMAIL_1]`, `[PHONE_1]`, `[DNI_1]`, `[IBAN_1]`), numbered within the call. This replaces `project.md`'s former "it doesn't detect personal data in free text".

## Motivation

Every consumer that sends free text to a model needs the same thing, and half of it (known names) needs the directory, which lives here. A spike in the `moodle-mcp` session (9 October 2026) measured OpenRedaction 1.1.5 (`@openredaction/core`, TypeScript, regex-first, 570+ patterns) against our patterns on 48 made-up Spanish texts: 34 with personal data, 14 without (Python and SQL code, maths, versions, dates, an ISBN, a hash); values generated with valid check digits, emails on invented domains.

| | DNI | NIE | Phone | Email | IBAN | False positives |
| --- | --- | --- | --- | --- | --- | --- |
| OpenRedaction, defaults | 7/7 | 3/3 | 4/7 | 5/5 | 4/4 | 50 |
| OpenRedaction, `includeNames: false` | 7/7 | 3/3 | 4/7 | 5/5 | 4/4 | 17 |
| OpenRedaction, `patterns: ["SPANISH_DNI", "EMAIL", "IBAN"]` | 7/7 | 3/3 | 0/7 | 5/5 | 4/4 | 0 |
| Our patterns | 7/7 | 3/3 | 7/7 | 5/5 | 4/4 | 1 |

- OpenRedaction's defaults take any two capitalized words for a name ("Hola profe", "Mi DNI es": 33 of the 50). Without names, a commit message gives Instagram usernames ("3f9a2c41e8b7", "2.14.3") and numbers in exercises give UK phones and US ZIP codes.
- Its Spanish mobiles come as `PHONE_UK`, leaving `+34` visible; landlines (`+34 91 568 04 06`) are missed.
- Its "addresses" (4/4) were only `ZIP_CODE_US` on the postal code: street, number and floor stayed visible. Birth dates came from a generic `DATE`, which also hides a submission deadline.
- It ignores reserved example domains on purpose (`example.com`, `.test`): test texts must use invented ordinary domains.
- Restricted to what works, it equals our patterns without phones, for 3.8 MB of a package first published on 25 July 2026 and not updated since (two maintainers). Microsoft Presidio (Python) and `@epilot/anonymization` were considered and not tried: another runtime, or deterministic pseudonyms without detection.

## Consequences

- No dependency: five regular expressions with check digits, tested against the spike's texts (`test/fixtures/spanish-texts.mjs`).
- Our one false positive was a phone-shaped number in a sum (`600123456`); hiding such numbers is acceptable.
- Street addresses and dates of birth are not detected, by any option measured; consumers' READMEs say so. Names other than the directory's (a classmate mentioned in passing) aren't either.
- New patterns (other countries' ids, addresses) come with texts in the fixture that show they help and don't add noise in code.
