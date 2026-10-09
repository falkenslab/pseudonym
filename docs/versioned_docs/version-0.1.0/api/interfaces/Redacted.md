# Interface: Redacted

Defined in: [src/redact.ts:7](https://github.com/falkenslab/pseudonym/blob/main/src/redact.ts#L7)

What `redact()` returns: the text safe to send, and how many replacements of each kind it made.

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-replaced"></a> `replaced` | `object` | How many replacements of each kind were made: counts, never the values. | [src/redact.ts:10](https://github.com/falkenslab/pseudonym/blob/main/src/redact.ts#L10) |
| `replaced.emails` | `number` | - | [src/redact.ts:10](https://github.com/falkenslab/pseudonym/blob/main/src/redact.ts#L10) |
| `replaced.ibans` | `number` | - | [src/redact.ts:10](https://github.com/falkenslab/pseudonym/blob/main/src/redact.ts#L10) |
| `replaced.ids` | `number` | - | [src/redact.ts:10](https://github.com/falkenslab/pseudonym/blob/main/src/redact.ts#L10) |
| `replaced.names` | `number` | - | [src/redact.ts:10](https://github.com/falkenslab/pseudonym/blob/main/src/redact.ts#L10) |
| `replaced.phones` | `number` | - | [src/redact.ts:10](https://github.com/falkenslab/pseudonym/blob/main/src/redact.ts#L10) |
| <a id="property-text"></a> `text` | `string` | - | [src/redact.ts:8](https://github.com/falkenslab/pseudonym/blob/main/src/redact.ts#L8) |
