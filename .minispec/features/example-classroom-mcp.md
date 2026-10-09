# Example: classroom MCP server

Issue: [#5](https://github.com/falkenslab/pseudonym/issues/5)

## Goal

A runnable MCP server in `examples/classroom-mcp/` that shows the library where it's meant to live: tools that tell a model about people without naming them.

## Context

- The library is published (`@falkenslab/pseudonym@0.1.0`) but nothing shows a real integration; the README's quick start is a fragment.
- Its first consumer, moodle-mcp, is a sibling repository; this example is self-contained, with a made-up course and no network.
- Decided with the owner: an MCP server, tested without a model, with a guide to try it in Claude Code by hand.

## Changes

- `examples/classroom-mcp/`, its own `package.json` (private): `@modelcontextprotocol/sdk` and `@falkenslab/pseudonym` from `file:../..`; the library keeps no runtime dependencies. TypeScript run with `tsx`.
- A made-up course in a data file: students (name, email, institutional id, LMS id, grades), forum posts with names, emails, phones, a DNI and an IBAN written in them. Invented names and domains only.
- Service `classroom@example-school.test`. Tools:
  - `list_students`: everyone with their grades, through one `remember()` call; aliases only.
  - `read_forum`: posts with authors as aliases and bodies through `redact()`.
  - `grade_student({ student: "A-…", grade })`: `resolve()` back to the LMS id, writes the grade in memory, answers with the alias.
  - `student_summary({ student })`: one person's grades by alias.
- `npm run demo`: a script that calls the tools in process and prints what the model would see, then the `pseudonym` CLI commands to try (`whois`, `alias`, `link`, `forget`, `key fingerprint`) against the same folder.
- A smoke test (`node:test`): every tool's output holds no name, email, institutional id, LMS id, phone, DNI or IBAN from the data; `grade_student` by alias changes the right student; an unknown alias is an error the model can read. Run with a temporary `PSEUDONYM_HOME`.
- Its README: what it shows, how to run the demo and the test, and how to add it to Claude Code (`claude mcp add`) with its own `PSEUDONYM_HOME`, then what to ask and what to check with `pseudonym whois`.
- `verify` skill: install and test the example after the build; root ESLint ignores `examples/` (it has its own types check).

## Acceptance

- `npm test` in the example passes from a clean clone after `npm install` at the root and in the example.
- No tool result contains any personal value from the data file.
- The guide's steps work in Claude Code: the model lists students as aliases, grades one by alias, and `pseudonym whois` names them.
