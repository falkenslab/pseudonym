# ADR-001: A library inside each server, not a server of its own

## Decision

Pseudonymization is a library (`@falkenslab/pseudonym`) that runs inside each program that sends data about people to a model, plus a CLI for the person. It is never an MCP server, and it exposes nothing an agent could call. It lives in its own repository, sibling of `moodle-mcp` (decided by the owner, 9 October 2026).

## Motivation

An MCP server for it would hand the agent a `whois`: the agent could undo what the library is for. Inside the server that already knows which fields are people (a Moodle user id, a name), aliases are exact, with no detection to get wrong. Its own repository keeps it free of Moodle and ready for other servers (mail, Classroom), which share one key and one directory on the machine.

## Consequences

- Each consumer integrates it where it builds its results, and is responsible for passing every person through it.
- Servers it doesn't run in (third-party MCP servers) need a pseudonymizing proxy; evaluating an existing one (MCP Conceal, PII Anonymizer) comes before building one.
- Until it's published, consumers depend on it from the sibling folder.
