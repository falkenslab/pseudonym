# Command reference

| Command | What it does | Exit codes |
| --- | --- | --- |
| `pseudonym whois <alias>` | Who an alias is: name, alias and linked ones, services, first and last seen | `0`, `2` unknown alias |
| `pseudonym alias "<name>"` | Everyone whose name contains it (case and accent insensitive), with their aliases and services | `0`, `2` nobody |
| `pseudonym aliases [--service <service>]` | A service's people as CSV (`alias,name`) on stdout, a warning on stderr | `0` |
| `pseudonym services [--json]` | The services in the directory and how many people each has | `0` |
| `pseudonym redact [--service <service>] [--countries ES,US,…] [file]` | The text (file or stdin) with the service's people as aliases and contact data as placeholders (cards, IBANs, and ids and phones of the countries asked for, Spain by default); counts on stderr | `0`, `1` several services and none chosen, unknown country, unreadable file |
| `pseudonym reveal [--with-alias] [file]` | The text (file or stdin) with every known alias replaced by the person's name | `0`, `1` unreadable file |
| `pseudonym remember --name <name> [--email …] [--institutional-id …] [--service-user-id …]` | A person's alias (also `--service`, `--link`, `--json`) | `0`, `1` no name or no identifier |
| `pseudonym remember --csv <file> [--only-aliases]` | Aliases for a whole CSV, as a CSV with an `alias` column first (`--only-aliases` drops names and identifiers); also `--json` | `0`, `1` a row without name or identifier |
| `pseudonym resolve <alias> [--service <service>]` | The service user id behind an alias (also `--json`) | `0`, `2` unknown alias or no id in that service |
| `pseudonym link <alias> <alias>` | The same person: keep the first alias, the second resolves to it | `0`, `2` unknown alias |
| `pseudonym forget <alias>` | Remove a person from the directory | `0`, `2` unknown alias |
| `pseudonym forget --service <service> [--yes]` | Remove the people met only in that service; others lose its id. Asks to confirm | `0`, `1` not confirmed, `2` unknown service |
| `pseudonym forget --all [--yes]` | Empty the directory, keeping the key. Asks to confirm | `0`, `1` not confirmed |
| `pseudonym migrate --to plain\|encrypted [--yes]` | Convert the directory to the other [storage](../guides/storage.md), same aliases, original kept as a `.bak`. Asks to confirm | `0`, `1` not confirmed, nothing to convert, target exists |
| `pseudonym prune --older-than <n>(d\|m\|y)` | Remove people not seen for that long | `0`, `1` bad age |
| `pseudonym key fingerprint` | A short code of the key | `0`, `2` no key yet |
| `pseudonym key export` | The key as base64 on stdout, a warning on stderr | `0`, `2` no key yet |
| `pseudonym key import` | Read a key from stdin (hidden on a terminal) | `0`, `1` different key or not a key |
| `pseudonym key import --force` | Replace a different key, keeping the current directory as a `.bak` | `0`, `1` not a key |
| `pseudonym help` | The list of commands | `0` |

All commands exit with `1` on an error, with a message on stderr that says what to do: a missing or damaged key, a directory that can't be read, a missing argument, an unknown command.

## Environment

| Variable | Effect |
| --- | --- |
| `PSEUDONYM_HOME` | The folder for the key and the directory, instead of `%APPDATA%\pseudonym\` or `~/.config/pseudonym/` |
| `PSEUDONYM_SERVICE` | The service for commands that take one when `--service` isn't given, instead of `default` |
| `PSEUDONYM_STORAGE` | `encrypted` (default) or `plain`: how the directory is kept (see [Storage](../guides/storage.md)). In plain storage there is no key, and `key` commands exit with `1` |

## Files in the folder

| File | What it is |
| --- | --- |
| `key` | The key: 32 random bytes |
| `used` | An empty marker: a key existed here, so a missing one is a loss, not a first run |
| `directory.enc` | The directory, encrypted |
| `directory.json` | The directory in plain storage, readable, instead of `directory.enc` (and with no `key` or `used`) |
| `directory.lock` | Present only while a program is changing the directory |
| `directory.enc.<date>.bak`, `directory.json.<date>.bak` | The previous directory, after `key import --force` or `pseudonym migrate` |

See [How it works](../security/how-it-works.md) for what's inside them.
