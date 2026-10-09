# CLI: redact and reveal text, and the default service

Issue: [#9](https://github.com/falkenslab/pseudonym/issues/9)

## Goal

`pseudonym redact` makes a text safe to paste into a chat with a model, `pseudonym reveal` puts the names back into what the model answered, and every CLI command that needs a service has a sensible default.

## Context

- `redact()` exists only as a library call; a person who pastes a submission into ChatGPT or Claude.ai by hand has no way to use it.
- A model's answer about aliases ("A-7K3F9Q hasn't handed in practice 2") can only be read person by person with `whois`.
- Decided with the owner: the CLI becomes a second way to use the library, covering its use cases without code (this note, `cli-remember-resolve.md`, `cli-bulk-forget.md`). It stays for the person only: agents keep being denied every `pseudonym` command (ADR-006).
- `redaction-countries.md` (#8) adds `countries` to `redact()`: whichever lands second wires `--countries` into the command.

## Changes

- **The default service**, for every command that takes `--service`: the flag, else `PSEUDONYM_SERVICE`, else `default`. The library keeps the service required: a shared default there would link programs by accident (ADR-002).
- `pseudonym services [--json]`: each service in the directory with how many people it has; no personal data.
- `pseudonym redact [--service <service>] [file]`: reads the file, or stdin when there is none or it's `-`; prints the redacted text to stdout, unchanged otherwise (line endings and the final newline kept); prints the counts to stderr (`Replaced 3 names, 1 email, 1 phone.`). Which people's names it knows:
  - the service asked for (flag or `PSEUDONYM_SERVICE`); if the directory doesn't know it, patterns only, and a warning listing the services it knows (a typo?);
  - with none asked for: `default` if it has people; else the only service there is, named on stderr; else, with several, an error (exit 1) listing them;
  - an empty directory: patterns only, with a warning that no names could be replaced.
- `pseudonym reveal [--with-alias] [file]`: the same input rules; every alias in the text (`A-` and 6 to 12 Crockford base32 characters, whole words, case-insensitive) that the directory knows, linked ones included, becomes the person's display name, or `Name (A-7K3F9Q)` with `--with-alias`. No service needed: aliases are unique in the directory. Unknown aliases and placeholders (`[EMAIL_1]`) stay as they are. Counts to stderr, plus a warning that the output holds names in clear.
- `reveal` lives in `src/directory.ts` as an internal function (not exported from `index.ts`): a program that wants names shows them from its own data.
- Exit codes: `0` done (even if nothing was replaced), `1` error.
- ADR-007 (`minispec-adr`): the CLI covers the library's use cases without code, for the person only; the default service lives in the CLI, never in the library.
- `USAGE` lists the new commands and the default service.
- Tests (CLI, each with its own `PSEUDONYM_HOME`): redact from stdin and from a file gives the same text; each row of the service rule; names, emails and ids gone, counts on stderr, nothing on stdout but the text; reveal turns known and linked aliases into names, leaves unknown aliases and placeholders, `--with-alias`; redact then reveal gives back the names; `services` with and without `--json`.
- Docs: a new CLI page, "Redacting and revealing text" (pasting into a chat by hand, reading an answer, the default service); `cli/reference.md` (commands, `PSEUDONYM_SERVICE`); the README's CLI snippet; a line in `security/keeping-agents-away.md` (reveal's output holds names: never paste it back to a model).

## Acceptance

- `pseudonym redact < post.txt` with only moodle-mcp's service in the directory prints the post with that service's people as aliases and emails, phones, DNI, NIE and IBANs as placeholders, and names the service on stderr.
- On an empty directory it still replaces the patterns, and says no names were replaced.
- `pseudonym reveal < answer.txt` prints the answer with every known alias replaced by its name; unknown aliases and placeholders are untouched.
- Both work with a file argument and with stdin, and exit 0 when there is nothing to replace.
