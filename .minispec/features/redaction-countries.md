# Redaction: more data and more countries

Issue: [#8](https://github.com/falkenslab/pseudonym/issues/8)

## Goal

`redact()` also replaces payment cards, any country's IBAN, and the national ids and phones of Spain, the United States, Germany, Canada, Mexico, Chile, Argentina, Brazil and Portugal, chosen per call with a `countries` option.

## Context

- Today: emails, Spanish phones, DNI, NIE and ES IBANs (ADR-005). Names already work in any language (they come from the directory).
- ADR-005's rule: a pattern comes with texts that show it helps and doesn't add noise in code. Prefer values with a check digit; without one, require separators and impossible-range rules, or leave it out.
- Decided with the owner: everything below, in one feature.

## Changes

- `redact(text, { service, countries? })`: `countries` is a list of ISO codes (`"ES"`, `"US"`, `"DE"`, `"CA"`, `"MX"`, `"CL"`, `"AR"`, `"BR"`, `"PT"`); default `["ES"]`, so today's output only gains the universal patterns. Unknown codes: `PseudonymError`.
- Universal, always on:
  - payment cards: 13 to 19 digits, in groups with spaces or hyphens or none, Luhn, and a known issuer prefix (Visa 4, Mastercard 51-55 and 2221-2720, Amex 34/37, Discover 6011/65, others in ISO/IEC 7812 as listed in the code) → `[CARD_n]`;
  - IBAN of any country: country code, check digits and the registry's length for that country, ISO 13616 mod 97 → `[IBAN_n]` (generalizes the ES-only pattern).
- Per country (placeholder `[<CC>_<KIND>_n]` for the new ones; DNI, NIE and Spanish phones keep their current placeholders):
  - **ES**: phones, DNI, NIE (as today); Seguridad Social number, 12 digits, control = first 10 mod 97, with or without `/` or spaces → `[ES_NSS_n]`.
  - **US**: SSN only with `-` or spaces, area not 000, 666 or 900-999, group not 00, serial not 0000 → `[US_SSN_n]`; ITIN with separators, 9XX and its valid group ranges → `[US_ITIN_n]`; NANP phones with parentheses, separators or `+1`, area and exchange starting 2-9 → `[PHONE_n]`.
  - **CA**: SIN only with separators (3-3-3), Luhn, first digit not 0 or 8 → `[CA_SIN_n]`; NANP phones as US.
  - **DE**: Steuer-ID, 11 digits, ISO 7064 MOD 11,10 and its digit-repetition rule → `[DE_TAXID_n]`; Personalausweis number, 9 characters of its alphabet plus check digit (weights 7-3-1) → `[DE_IDCARD_n]`; Rentenversicherungsnummer, 12 characters with its check digit → `[DE_SVNR_n]`; Krankenversichertennummer, a letter and 9 digits with check digit → `[DE_KVNR_n]`.
  - **MX**: CURP, 18 characters with check digit → `[MX_CURP_n]`.
  - **CL**: RUT with dots optional and the hyphen required, mod 11 with K → `[CL_RUT_n]`.
  - **AR**: CUIL/CUIT, 11 digits with hyphens optional, valid prefixes, mod 11 → `[AR_CUIT_n]`.
  - **BR**: CPF, 11 digits (`000.000.000-00` or plain), both mod 11 checks, not all digits equal → `[BR_CPF_n]`.
  - **PT**: NIF, 9 digits, valid first digit, mod 11 → `[PT_NIF_n]`.
- Left out on purpose (no check digit, too many false positives): bare 9-digit SSN or SIN, passports, driver's licences, US Medicare, German and other variable-length phones, Canadian postal codes (part of an address), DNIs of Argentina and Colombia.
- `Redacted.replaced` gains `cards`; country ids count in `ids`, NANP phones in `phones`. Counts only, never values.
- Order: emails, cards, IBANs, the country ids, phones last (they'd take digit groups of the others).
- Fixtures: new made-up texts per language (`texts-en.ts` for US and CA, `texts-de.ts`, `texts-latam.ts` with MX, CL, AR, BR and PT), each value generated with valid check digits, plus texts without personal data: code, maths, versions, ISBNs, hashes, timestamps, invalid look-alikes (an SSN starting 666, a CPF of equal digits, a card number failing Luhn). `spanish-texts.ts` stays the spike's.
- ADR-007 (`minispec-adr`): the `countries` option, its default, the placeholder naming and the rule for what's left out.
- Docs: `guides/redaction.md` (the table per country, the option, what's left out), `security/threat-model.md`, `security/how-it-works.md`, the README's line on redaction, `redact()`'s doc comment.

## Acceptance

- With each fixture's countries enabled, every expected value is replaced and every text without personal data stays unchanged (at most one known look-alike per fixture, documented).
- With the default (`["ES"]`), the spike's results don't change except where a card or a non-Spanish IBAN appears, and no country-specific foreign id is touched.
- Invalid look-alikes (wrong check digit, impossible SSN range) are never replaced.
- `countries: ["XX"]` throws a `PseudonymError`; values never appear in results or errors.
