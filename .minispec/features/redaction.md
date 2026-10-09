# Redaction

Issue: [#3](https://github.com/falkenslab/pseudonym/issues/3)

## Goal

`redact(text, { service })`: free text with the directory's known people replaced by their aliases and contact and identity data replaced by placeholders (ADR-005).

## Context

- Needs `directory.md` (known names and their aliases for a service).
- The spike's patterns and texts come from the `moodle-mcp` session: the texts are in `test/fixtures/spanish-texts.ts` (`buildDataset()`: 48 texts, each with its expected entities by kind; `NAMES`, the people in them); the patterns below found every expected email, phone, DNI, NIE and IBAN, with one false positive (re-checked here). Call `buildDataset()` once per process: its seed advances with every call.

## Changes

- `redact.ts`, exported from `index.ts`:
  - Known names first, for the directory's people in that service, longest first:
    - each full display name, case and accent insensitive ("LUCÍA ferrandiz" counts);
    - a first name alone only when exactly one person in that service has it and the text writes it with a capital initial ("Lucía", "LUCÍA", not "lucía"): two people sharing it, or a common word in lower case ("el mar", "color rosa"), are left alone.
    - Whole words with `\p{L}` lookarounds, not `\b`, which is ASCII-only even with the `u` flag (`\bÍker` never matches). For accents, compare on a copy folded character by character (`normalize("NFD")`, first code unit), so positions stay those of the original text.
  - Then the patterns, in this order (the IBAN before the phone: its digit groups look like phones), each value replaced by `[KIND_n]`, the same value the same placeholder within the call:
    - email: `/[\p{L}0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/giu`
    - DNI: `/\b(\d{8})[ -]?([A-Z])\b/g`, kept when `"TRWAGMYFPDXBNJZSQVHLCKE"[number % 23]` is the letter
    - NIE: `/\b([XYZ])[ -]?(\d{7})[ -]?([A-Z])\b/g`, the prefix as 0, 1 or 2 before the same check
    - IBAN: `/\bES\d{2}(?:[ ]?\d{4}){5}\b/g`, kept when the rearranged number mod 97 is 1
    - phone: `/(?<![\w.])(?:\+34[ ]?)?[6789]\d{1,2}(?:[ ]?\d{2,3}){2,4}(?!\w|\.\d)/g`, kept when 9 digits remain without the `34` prefix (the `+34` goes with the number)
  - Returns `{ text, replaced: { names, emails, phones, ids, ibans } }` (counts, never values).
- Tests, in a temporary `PSEUDONYM_HOME` whose directory first remembers `NAMES` for the service: over the fixture, every expected name, email, phone, DNI, NIE and IBAN gone, addresses and birth dates still there (not detected, ADR-005), every text without personal data unchanged except the known phone-shaped number. In the test itself, not the fixture (its texts are the spike's): first names, unique and shared; common words in lower case; whole words only; the same email twice gives one placeholder; values never appear in the result or in errors.

## Acceptance

- Over the fixture, no expected email, phone, DNI, NIE or IBAN survives, and at most one text without personal data changes.
- A directory name inside a word ("Ana" in "Banana") is left alone; "LUCÍA martín" is replaced.
- "Lucía" alone is replaced when she's the only Lucía in the service, and left when there are two; "el mar" stays with a Mar in the directory.
