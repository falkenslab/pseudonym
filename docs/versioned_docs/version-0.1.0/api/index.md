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

## Functions

| Function | Description |
| ------ | ------ |
| [keyFingerprint](functions/keyFingerprint.md) | A short code of the key (8 base32 characters of its HKDF-SHA256 "pseudonym/fingerprint" subkey), to check that two machines share it. It reveals nothing about the key. Creates the key on first use. |
| [redact](functions/redact.md) | Free text with the directory's people in `service` replaced by their aliases (full names, case and accent insensitive; a first name alone only when one person has it and the text capitalizes it), then emails, Spanish phones, DNI, NIE and ES IBANs replaced by placeholders such as `[EMAIL_1]`, the same value the same placeholder within the call. Street addresses, birth dates and people outside the directory are not detected. The result carries counts, never the values replaced. |
| [remember](functions/remember.md) | The alias of a person. A person already in the directory for that service keeps their first alias, even if an identifier changed; someone new gets one computed from their strongest identifier. |
| [resolve](functions/resolve.md) | The service user id behind an alias, for a write tool that receives an alias from the model. Follows links. Keep the result on your side: it's for calling your own service, never for the model. |
