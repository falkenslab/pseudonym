# Function: keyFingerprint()

```ts
function keyFingerprint(): Promise<string>;
```

Defined in: [src/index.ts:14](https://github.com/falkenslab/pseudonym/blob/main/src/index.ts#L14)

A short code of the key (8 base32 characters of its HKDF-SHA256 "pseudonym/fingerprint" subkey), to check
that two machines share it. It reveals nothing about the key. Creates the key on first use.

## Returns

`Promise`\<`string`\>
