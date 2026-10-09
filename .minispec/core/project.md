# Project

## What

`@falkenslab/pseudonym` is a Node.js library, with a small CLI, that gives people stable aliases (`A-7K3F9Q`) so tools can tell a language model about them without names, emails or ids, while the person using those tools can resolve the aliases on their own machine.

## What it does

- Computes an alias from a person's best identifier with a local secret key (ADR-002): the same person always gets the same alias, and nobody without the key can undo it.
- Keeps a local encrypted directory of the people it has met (alias, display name, service ids, hashed identifiers), so aliases survive an email change and resolve offline (ADR-003).
- Shares one key and one directory between every program on the machine that uses it (ADR-003).
- Redacts free text: the directory's known names become aliases, and emails, Spanish phones, DNI, NIE and IBANs become placeholders (ADR-005).
- Gives the person a CLI: `whois`, `alias`, `aliases`, `link`, `forget`, `prune`, `key export | import | fingerprint`.

## What it doesn't do

- Find people in structured data by itself: callers know which fields are people and pass them.
- Detect street addresses, dates of birth or names outside the directory in free text (ADR-005).
- Expose anything to an agent: it's a library inside each server, never an MCP server itself (ADR-001).
- Anonymize: aliases are pseudonymization; the data stays personal data for whoever holds the key (ADR-006).

## For whom

- MCP servers and other programs that send data about people (students, colleagues) to a model.
- First consumer: `moodle-mcp` (sibling repository), whose ADR-013 asked for it.
- The person running those programs, who resolves aliases in their terminal.

## Goal

Let agents work with data about people without the model ever learning who they are, and let the person in charge always know.

## Status

Version 0.x, nothing published: the repository and its decisions; the library comes one feature at a time (see `features/`).
