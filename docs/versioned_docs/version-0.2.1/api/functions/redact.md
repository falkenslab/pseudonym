# Function: redact()

```ts
function redact(text, options): Promise<Redacted>;
```

Defined in: [src/redact.ts:118](https://github.com/falkenslab/pseudonym/blob/main/src/redact.ts#L118)

Free text with the directory's people in `service` replaced by their aliases (full names, case and accent
insensitive; a first name alone only when one person has it and the text capitalizes it), then contact and
identity data replaced by placeholders such as `[EMAIL_1]` or `[US_SSN_1]`, the same value the same
placeholder within the call: emails, payment cards and IBANs always; national ids and phones of the
`countries` asked for (Spain by default), each checked with its check digit or impossible ranges. Street
addresses, birth dates and people outside the directory are not detected. The result carries counts, never
the values replaced. Throws a `PseudonymError` for an unknown country.

## Parameters

| Parameter | Type |
| ------ | ------ |
| `text` | `string` |
| `options` | [`RedactOptions`](../interfaces/RedactOptions.md) |

## Returns

`Promise`\<[`Redacted`](../interfaces/Redacted.md)\>
