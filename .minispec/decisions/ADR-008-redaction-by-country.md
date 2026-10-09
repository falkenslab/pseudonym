# ADR-008: Redaction patterns by country, only where a value can be checked

## Decision

`redact()` always replaces payment cards (issuer prefix, length, Luhn) and IBANs of any country (registry length, mod 97), and replaces national ids and phones only for the countries asked for with `countries` (ISO codes; default `["ES"]`). A pattern enters only if its value can be checked: a check digit, or, without one, required separators plus ranges that are never issued. New kinds are named `[<CC>_<KIND>_n]`; Spain's existing DNI, NIE and phones keep `[DNI_n]`, `[NIE_n]` and `[PHONE_n]`.

## Motivation

Decided with the owner (10 October 2026) for Spain, the United States, Canada, Germany, Mexico, Chile, Argentina, Brazil and Portugal. Turning every country on at once multiplies the chances that an ordinary number in a text (an exercise, an order, a timestamp) passes some country's check: each program enables the countries its people come from. Cards and IBANs are on for everyone, because their checks are strong and their shape is the same everywhere.

Values without a check digit are left out: a bare 9-digit SSN or SIN, passports, driver's licences, US Medicare numbers, variable-length phones (German ones among them), Canadian postal codes (part of an address, which redaction doesn't attempt) and the DNIs of Argentina and Colombia. A detection library was again not used (ADR-005): each pattern is a regular expression with its check, tested on made-up texts in its language.

## Consequences

- With the default, today's Spanish results don't change, except that a card or a non-Spanish IBAN in a text is now replaced too.
- Some formats overlap: with several countries on, a value may get another country's label (a Spanish phone written 3-3-3 that passes Canada's SIN check, a German health insurance number that passes as an id card number). It's still replaced; only the placeholder's name differs.
- Each pattern comes with texts in its language (`test/fixtures/country-texts.ts`), look-alikes that must not be replaced, and hundreds of generated values, all built apart from the implementation.
- A new country or kind follows the same rule: a check, texts, look-alikes, and a line in the redaction guide.
