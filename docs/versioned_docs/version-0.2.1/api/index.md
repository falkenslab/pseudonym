# @falkenslab/pseudonym

## Classes

| Class | Description |
| ------ | ------ |
| [PseudonymError](classes/PseudonymError.md) | Something a person can fix (a lost key, an unknown alias), with a message saying how. |

## Interfaces

| Interface | Description |
| ------ | ------ |
| [Identifiers](interfaces/Identifiers.md) | What names a person in a service. Pass every one you have; the strongest present makes the alias. |
| [Person](interfaces/Person.md) | A person as a caller knows them in one service. |
| [Redacted](interfaces/Redacted.md) | What `redact()` returns: the text safe to send, and how many replacements of each kind it made. |
| [RedactOptions](interfaces/RedactOptions.md) | Options of `redact()`. |

## Type Aliases

| Type Alias | Description |
| ------ | ------ |
| [Country](type-aliases/Country.md) | An ISO 3166 code of a country in `COUNTRIES`, for `redact()`'s `countries` option. |

## Variables

| Variable | Description |
| ------ | ------ |
| [COUNTRIES](variables/COUNTRIES.md) | Countries whose national ids and phones can be redacted. |

## Functions

| Function | Description |
| ------ | ------ |
| [keyFingerprint](functions/keyFingerprint.md) | A short code of the key (8 base32 characters of its HKDF-SHA256 "pseudonym/fingerprint" subkey), to check that two machines share it. It reveals nothing about the key. Creates the key on first use. |
| [redact](functions/redact.md) | Free text with the directory's people in `service` replaced by their aliases (full names, case and accent insensitive; a first name alone only when one person has it and the text capitalizes it), then contact and identity data replaced by placeholders such as `[EMAIL_1]` or `[US_SSN_1]`, the same value the same placeholder within the call: emails, payment cards and IBANs always; national ids and phones of the `countries` asked for (Spain by default), each checked with its check digit or impossible ranges. Street addresses, birth dates and people outside the directory are not detected. The result carries counts, never the values replaced. Throws a `PseudonymError` for an unknown country. |
| [remember](functions/remember.md) | The alias of a person. A person already in the directory for that service keeps their first alias, even if an identifier changed; someone new gets one computed from their strongest identifier. |
| [resolve](functions/resolve.md) | The service user id behind an alias, for a write tool that receives an alias from the model. Follows links. Keep the result on your side: it's for calling your own service, never for the model. |
