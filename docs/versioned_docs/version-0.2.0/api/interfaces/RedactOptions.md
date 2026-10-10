# Interface: RedactOptions

Defined in: [src/redact.ts:18](https://github.com/falkenslab/pseudonym/blob/main/src/redact.ts#L18)

Options of `redact()`.

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-countries"></a> `countries?` | readonly ( \| `"ES"` \| `"US"` \| `"CA"` \| `"DE"` \| `"MX"` \| `"CL"` \| `"AR"` \| `"BR"` \| `"PT"` \| `"es"` \| `"us"` \| `"ca"` \| `"de"` \| `"mx"` \| `"cl"` \| `"ar"` \| `"br"` \| `"pt"`)[] | Whose national ids and phones to look for, as ISO 3166 codes (see `COUNTRIES`). Default `["ES"]`. Payment cards and IBANs of any country are always looked for. | [src/redact.ts:25](https://github.com/falkenslab/pseudonym/blob/main/src/redact.ts#L25) |
| <a id="property-service"></a> `service` | `string` | Whose names to replace: the directory's people met in this service. | [src/redact.ts:20](https://github.com/falkenslab/pseudonym/blob/main/src/redact.ts#L20) |
