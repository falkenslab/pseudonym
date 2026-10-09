# Function: redact()

```ts
function redact(text, options): Promise<Redacted>;
```

Defined in: [src/redact.ts:132](https://github.com/falkenslab/pseudonym/blob/main/src/redact.ts#L132)

Free text with the directory's people in `service` replaced by their aliases (full names, case and accent
insensitive; a first name alone only when one person has it and the text capitalizes it), then emails,
Spanish phones, DNI, NIE and ES IBANs replaced by placeholders such as `[EMAIL_1]`, the same value the same
placeholder within the call. Street addresses, birth dates and people outside the directory are not
detected. The result carries counts, never the values replaced.

## Parameters

| Parameter | Type |
| ------ | ------ |
| `text` | `string` |
| `options` | \{ `service`: `string`; \} |
| `options.service` | `string` |

## Returns

`Promise`\<[`Redacted`](../interfaces/Redacted.md)\>
