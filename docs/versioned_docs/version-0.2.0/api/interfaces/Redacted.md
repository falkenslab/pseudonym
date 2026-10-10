# Interface: Redacted

Defined in: [src/redact.ts:11](https://github.com/falkenslab/pseudonym/blob/main/src/redact.ts#L11)

What `redact()` returns: the text safe to send, and how many replacements of each kind it made.

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-replaced"></a> `replaced` | `object` | How many replacements of each kind were made: counts, never the values. National ids of every country count in `ids`. | [src/redact.ts:14](https://github.com/falkenslab/pseudonym/blob/main/src/redact.ts#L14) |
| `replaced.cards` | `number` | - | [src/redact.ts:14](https://github.com/falkenslab/pseudonym/blob/main/src/redact.ts#L14) |
| `replaced.emails` | `number` | - | [src/redact.ts:14](https://github.com/falkenslab/pseudonym/blob/main/src/redact.ts#L14) |
| `replaced.ibans` | `number` | - | [src/redact.ts:14](https://github.com/falkenslab/pseudonym/blob/main/src/redact.ts#L14) |
| `replaced.ids` | `number` | - | [src/redact.ts:14](https://github.com/falkenslab/pseudonym/blob/main/src/redact.ts#L14) |
| `replaced.names` | `number` | - | [src/redact.ts:14](https://github.com/falkenslab/pseudonym/blob/main/src/redact.ts#L14) |
| `replaced.phones` | `number` | - | [src/redact.ts:14](https://github.com/falkenslab/pseudonym/blob/main/src/redact.ts#L14) |
| <a id="property-text"></a> `text` | `string` | - | [src/redact.ts:12](https://github.com/falkenslab/pseudonym/blob/main/src/redact.ts#L12) |
