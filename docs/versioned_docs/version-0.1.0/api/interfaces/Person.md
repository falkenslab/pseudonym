# Interface: Person

Defined in: [src/directory.ts:12](https://github.com/falkenslab/pseudonym/blob/main/src/directory.ts#L12)

A person as a caller knows them in one service.

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-displayname"></a> `displayName` | `string` | The name the person in charge sees in `pseudonym whois`; never sent anywhere. | [src/directory.ts:17](https://github.com/falkenslab/pseudonym/blob/main/src/directory.ts#L17) |
| <a id="property-identifiers"></a> `identifiers` | [`Identifiers`](Identifiers.md) | - | [src/directory.ts:15](https://github.com/falkenslab/pseudonym/blob/main/src/directory.ts#L15) |
| <a id="property-link"></a> `link?` | `boolean` | One alias across services for this person (default: `PSEUDONYM_LINK=true`, else off). | [src/directory.ts:19](https://github.com/falkenslab/pseudonym/blob/main/src/directory.ts#L19) |
| <a id="property-service"></a> `service` | `string` | Where the person was met, such as `moodle@<site host>`: part of the alias unless linking is on. | [src/directory.ts:14](https://github.com/falkenslab/pseudonym/blob/main/src/directory.ts#L14) |
