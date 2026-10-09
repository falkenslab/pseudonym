# Function: remember()

## Call Signature

```ts
function remember(person): Promise<string>;
```

Defined in: [src/directory.ts:231](https://github.com/falkenslab/pseudonym/blob/main/src/directory.ts#L231)

The alias of a person. A person already in the directory for that service keeps their first alias, even if
an identifier changed; someone new gets one computed from their strongest identifier.

### Parameters

| Parameter | Type |
| ------ | ------ |
| `person` | [`Person`](../interfaces/Person.md) |

### Returns

`Promise`\<`string`\>

## Call Signature

```ts
function remember(people): Promise<string[]>;
```

Defined in: [src/directory.ts:236](https://github.com/falkenslab/pseudonym/blob/main/src/directory.ts#L236)

The alias of each person in a list, in the same order, with one write to the directory for the whole list:
prefer it whenever a result holds several people.

### Parameters

| Parameter | Type |
| ------ | ------ |
| `people` | [`Person`](../interfaces/Person.md)[] |

### Returns

`Promise`\<`string`[]\>
