# Redaction

## Goal

`redact(text, { service })`: free text with the directory's known people replaced by their aliases and contact and identity data replaced by placeholders (ADR-005).

## Context

- Needs `directory.md` (known names and their aliases for a service).
- The spike's patterns and texts come from the `moodle-mcp` session: the texts are in `test/fixtures/spanish-texts.mjs` (`buildDataset()`: 48 texts, each with its expected entities by kind); the patterns below found every expected email, phone, DNI, NIE and IBAN, with one false positive. Call `buildDataset()` once per process: its seed advances with every call.

## Changes

- `redact.ts`, exported from `index.ts`:
  - Known names first: each display name in the directory for that service (whole words, case and accent insensitive, longest first so "Lucía Martín" wins over "Lucía") becomes its alias.
  - Then the patterns, each value replaced by `[KIND_n]`, the same value the same placeholder within the call:
    - email: `/[\p{L}0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/giu`
    - DNI: `/\b(\d{8})[ -]?([A-Z])\b/g`, kept when `"TRWAGMYFPDXBNJZSQVHLCKE"[number % 23]` is the letter
    - NIE: `/\b([XYZ])[ -]?(\d{7})[ -]?([A-Z])\b/g`, the prefix as 0, 1 or 2 before the same check
    - IBAN: `/\bES\d{2}(?:[ ]?\d{4}){5}\b/g`, kept when the rearranged number mod 97 is 1
    - phone: `/(?<![\w.])(?:\+34[ ]?)?[6789]\d{1,2}(?:[ ]?\d{2,3}){2,4}(?!\w|\.\d)/g`, kept when 9 digits remain without the `34` prefix (the `+34` goes with the number)
  - Returns `{ text, replaced: { names, emails, phones, ids, ibans } }` (counts, never values).
- Tests: the fixture's texts, every expected entity gone and every text without personal data unchanged except the known phone-shaped number; names replaced only as whole words; the same email twice gives one placeholder; values never appear in the result or in errors.

## Acceptance

- Over the fixture, no expected email, phone, DNI, NIE or IBAN survives, and at most one text without personal data changes.
- A directory name inside a word ("Ana" in "Banana") is left alone; "LUCÍA martín" is replaced.
