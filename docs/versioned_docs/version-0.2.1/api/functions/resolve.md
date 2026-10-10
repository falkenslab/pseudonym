# Function: resolve()

```ts
function resolve(alias, options): Promise<string>;
```

Defined in: [src/directory.ts:250](https://github.com/falkenslab/pseudonym/blob/main/src/directory.ts#L250)

The service user id behind an alias, for a write tool that receives an alias from the model. Follows
links. Keep the result on your side: it's for calling your own service, never for the model.

## Parameters

| Parameter | Type |
| ------ | ------ |
| `alias` | `string` |
| `options` | \{ `service`: `string`; \} |
| `options.service` | `string` |

## Returns

`Promise`\<`string`\>
