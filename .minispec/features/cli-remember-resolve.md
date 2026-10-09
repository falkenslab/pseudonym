# CLI: remember and resolve

Issue: [#10](https://github.com/falkenslab/pseudonym/issues/10)

## Goal

`pseudonym remember` and `pseudonym resolve` give the library's two core calls to people and scripts without code: get aliases for one person or a whole CSV, and get a service id back from an alias.

## Context

- Needs `cli-redact-reveal.md` (the default service and ADR-007).
- Use cases: a teacher who uses only the CLI loads their class so `redact` knows the names; a shell script pseudonymizes an LMS export before sending it to a model; a script turns a model's alias back into an id to act on.
- The CLI stays for the person only (ADR-006, ADR-007).

## Changes

- `pseudonym remember --name "<name>" [--email <email>] [--institutional-id <id>] [--service-user-id <id>] [--service <service>] [--link]`: the same as `remember()`; prints the alias. At least one identifier is required, as in the library.
- `pseudonym remember --csv <file> [--service <service>] [--link] [--only-aliases]`: one `remember()` call for the whole file (one write). Columns by header, case-insensitive: `name` (required), `email`, `institutional_id`, `service_user_id`; other columns are kept as they are. Prints the CSV with an `alias` column added; with `--only-aliases`, without the name and identifier columns, so the result can go to a model. Reads stdin when the file is `-`. A row without any identifier: an error naming its line number, never its content, and nothing is written.
- `pseudonym resolve <alias> [--service <service>]`: prints the service user id; exit 2 for an unknown alias or one without an id in that service.
- `--json` on both: `{"alias": "A-…"}`, a list for `--csv`, `{"alias": "A-…", "service": "…", "id": "…"}`.
- Service: the default-service rule of `cli-redact-reveal.md` (flag, `PSEUDONYM_SERVICE`, `default`).
- CSV parsing in `src/csv.ts`: RFC 4180 (quotes, doubled quotes, commas and newlines inside quotes, CRLF), no dependency; the writer quotes as `aliases` does today.
- Tests: one person and a CSV give the same aliases as the library; extra columns kept; `--only-aliases` keeps no name or identifier; quoted fields with commas and newlines; a row without identifiers fails without writing; `resolve` and its exit 2; `--json`.
- Docs: a new CLI page, "Using the library without code" (loading a class, pseudonymizing an export in a script, resolving back), `cli/reference.md`, the README's CLI snippet.

## Acceptance

- `pseudonym remember --csv class.csv --only-aliases` prints a CSV with aliases and the non-personal columns, and `pseudonym redact` then knows those people's names.
- `pseudonym resolve` gives back the `service_user_id` of a row remembered from a CSV.
- No command prints a name or identifier in an error.
