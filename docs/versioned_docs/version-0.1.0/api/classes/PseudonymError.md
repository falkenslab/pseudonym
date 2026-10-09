# Class: PseudonymError

Defined in: [src/errors.ts:2](https://github.com/falkenslab/pseudonym/blob/main/src/errors.ts#L2)

Something a person can fix (a lost key, an unknown alias), with a message saying how.

## Extends

- `Error`

## Constructors

### Constructor

```ts
new PseudonymError(message?): PseudonymError;
```

Defined in: docs/node\_modules/typescript/lib/lib.es5.d.ts:1082

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `message?` | `string` |

#### Returns

`PseudonymError`

#### Inherited from

```ts
Error.constructor
```

### Constructor

```ts
new PseudonymError(message?, options?): PseudonymError;
```

Defined in: docs/node\_modules/typescript/lib/lib.es5.d.ts:1082

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `message?` | `string` |
| `options?` | `ErrorOptions` |

#### Returns

`PseudonymError`

#### Inherited from

```ts
Error.constructor
```

## Properties

### name

```ts
name: string = "PseudonymError";
```

Defined in: [src/errors.ts:3](https://github.com/falkenslab/pseudonym/blob/main/src/errors.ts#L3)

#### Overrides

```ts
Error.name
```
