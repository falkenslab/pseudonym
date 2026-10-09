# CLI: redact and reveal text

Issue: [#9](https://github.com/falkenslab/pseudonym/issues/9)

## Goal

Two commands for the person in charge: `pseudonym redact` makes a text safe to paste into a chat with a model, and `pseudonym reveal` puts the names back into what the model answered.

## Context

- `redact()` exists only as a library call; a person who pastes a submission into ChatGPT or Claude.ai by hand has no way to use it.
- A model's answer about aliases ("A-7K3F9Q hasn't handed in practice 2") can only be read person by person with `whois`.
- The CLI is for the person only (ADR-006); the client deny rules already keep agents away from every `pseudonym` command, these two included.
- `redaction-countries.md` (#8) adds `countries` to `redact()`: whichever lands second wires `--countries` into the command.

## Changes

- `pseudonym redact --service <service> [file]`: reads the file, or stdin when there is none or it's `-`; prints the redacted text to stdout, unchanged otherwise (line endings and the final newline kept); prints the counts to stderr (`Replaced 3 names, 1 email, 1 phone.`). Uses the directory's people for that service, as `redact()` does. `--service` is required.
- `pseudonym reveal [--with-alias] [file]`: the same input rules; every alias in the text (`A-` and 6 to 12 Crockford base32 characters, whole words, case-insensitive) that the directory knows, linked ones included, becomes the person's display name, or `Name (A-7K3F9Q)` with `--with-alias`. Unknown aliases and placeholders (`[EMAIL_1]`) stay as they are: placeholders can't be undone. Counts to stderr (`Revealed 4 aliases; 1 unknown alias left as is.`), plus a warning that the output holds names in clear.
- `reveal` lives in `src/directory.ts` as an internal function (not exported from `index.ts`): a program that wants names shows them through its own data, not by reversing text.
- Exit codes: `0` done (even if nothing was replaced), `1` error (missing `--service`, unreadable file, a directory that can't be read).
- `USAGE` lists both commands.
- Tests (CLI, each with its own `PSEUDONYM_HOME`): redact from stdin and from a file gives the same text; names, emails and ids gone, counts on stderr, nothing on stdout but the text; reveal turns known and linked aliases into names, leaves unknown aliases and placeholders, `--with-alias`; redact then reveal gives back the names; a missing file exits 1 without echoing its path's content.
- Docs: a new CLI page, "Redacting and revealing text" (pasting into a chat by hand, reading an answer), `cli/reference.md`, the README's CLI snippet, and a line in `security/keeping-agents-away.md` (reveal's output holds names: never paste it back to a model).

## Acceptance

- `pseudonym redact --service S < post.txt` prints the post with the directory's people as aliases and emails, phones, DNI, NIE and IBANs as placeholders, and nothing else on stdout.
- `pseudonym reveal < answer.txt` prints the answer with every known alias replaced by its name; unknown aliases and placeholders are untouched.
- Both work with a file argument and with stdin, and exit 0 when there is nothing to replace.
