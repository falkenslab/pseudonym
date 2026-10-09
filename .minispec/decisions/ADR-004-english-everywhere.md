# ADR-004: English everywhere in the repository

## Decision

Code, comments, documentation, `.minispec/`, CLI messages and commit messages are in English. Conversation with the owner may be in Spanish.

## Motivation

The same rule as `moodle-mcp` (its ADR-006): the library is meant for other servers and other people, and one language keeps the repository consistent.

## Consequences

- Examples in tests and docs may hold Spanish names and formats (DNI, NIE), as data.
