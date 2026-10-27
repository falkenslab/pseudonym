# Storage: encrypted or plain

The directory, the file that remembers who each alias is, can be kept in two ways. **Encrypted** is the default and what everything else in this documentation assumes. **Plain** keeps it as readable JSON with no key at all, for setups where the operating system already protects the folder.

| What | Encrypted (default) | Plain |
| --- | --- | --- |
| File | `directory.enc` | `directory.json` |
| On disk | AES-256-GCM, unreadable without the key | Readable JSON: **names, emails and ids in clear** |
| Key | `key` and `used`, created on first use | None |
| Aliases | HMAC of the identifier under the key: the same person always gets the same alias, even after being forgotten | Random, stored in the directory: stable while the person is in it; forgotten and met again, a new alias |
| Recognizing people | Keyed hashes (matchers) of emails and institutional ids | The identifiers themselves |
| Protected by | The key, and the folder's permissions | The folder's permissions only |

What reaches the model is the same in both: aliases and placeholders. The difference is what someone who can read the folder can learn.

## When to choose plain

Only when the folder is already protected by something else, and you prefer readable data to a key you have to keep:

- the program runs under its own user account, or in a container, and nothing else can read its files;
- you need to inspect or fix the directory by hand, or back it up with the rest of your data;
- you don't want to manage a key on that machine.

If an agent, another user or a synced folder can read it, keep the default.

## Choosing the mode

In code, before the first call:

```ts
import { configure } from "@falkenslab/pseudonym";

configure({ storage: "plain" });
```

Or with an environment variable, which the [CLI](../cli/overview.md) reads too:

```bash
export PSEUDONYM_STORAGE=plain        # sh
```

```powershell
$env:PSEUDONYM_STORAGE = "plain"      # PowerShell
```

`configure()` wins over the variable; without either, the storage is `encrypted`. `storageMode()` says which one is in use. Every program sharing the folder, and the CLI, must use the same mode.

## It never switches by itself

If the folder holds the other mode's directory, every call fails with a `PseudonymError` that says what to do, and nothing is changed: a plain `directory.json` is never read as encrypted, an encrypted `directory.enc` is never replaced by a plain one, and a missing or wrong key never makes the library fall back to plain storage. A folder with both files is an error too.

## The JSON format

```json
{
  "format": "pseudonym-directory",
  "version": 1,
  "entries": [
    {
      "alias": "A-9NQWD5",
      "displayName": "Marta Quiroga",
      "services": [{ "service": "moodle@campus.example.org", "id": "4821" }],
      "matchers": ["institutionalId:20240031", "email:marta.q@school.example.org"],
      "links": [],
      "firstSeen": "2026-10-27T09:12:44.106Z",
      "lastSeen": "2026-10-27T10:03:17.520Z"
    }
  ]
}
```

- `services`: where the person was met, with the `serviceUserId` that [`resolve()`](integrating.md#3-take-aliases-back-with-resolve) gives back.
- `matchers`: the [normalized](concepts.md#identifiers) identifiers that recognize the person, as `kind:value`.
- `links`: aliases [linked](../cli/tidying-the-directory.md#link-two-aliases) into this one.
- `version` changes only if the format does; a newer version than the library knows is refused, not guessed.

The file is written whole through a temporary file and a rename, under the same lock as the encrypted one, and readable by its user only (`0600` on macOS and Linux; on Windows, `%APPDATA%` is already per user). Edit it by hand only while no program is using the folder.

## Converting a directory

`pseudonym migrate` converts the directory in the folder to the other mode, with the same aliases:

```bash
pseudonym migrate --to plain        # directory.enc → directory.json
pseudonym migrate --to encrypted    # directory.json → directory.enc (with PSEUDONYM_STORAGE=plain set)
```

- It asks you to type the mode to confirm (`--yes` in a script), writes the new file, and moves the original aside to `<file>.<date>.bak`: nothing is deleted.
- It refuses if there's nothing to convert, or if the target file already exists.
- Then set `PSEUDONYM_STORAGE` to the new mode for every program and the CLI.
- **Going to plain**, emails and institutional ids can't come along: the encrypted directory only has their keyed hashes, which can't be reversed. People are still recognized by their service ids; the command says how many have none and will get a new alias if they're met again.
- Going to encrypted, everything comes along: the identifiers in clear become keyed hashes under the key (created if there was none).

## What it means for privacy

Plain storage is a choice to store personal data unencrypted. Under the [GDPR](../security/gdpr.md), the directory is still pseudonymization's "additional information" and must be "kept separately and protected": in plain mode, the folder's permissions and isolation are that protection, and they're yours to ensure. [Keep agents away](../security/keeping-agents-away.md) from the folder as you would from the key: with plain storage, reading `directory.json` is enough to undo every alias.
