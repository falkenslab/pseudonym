# ADR-007: The CLI covers the library's use cases, for the person only

## Decision

The `pseudonym` command offers every use case of the library without code: redacting and revealing text, remembering people (one or a CSV), resolving aliases, and managing the directory. It stays a tool for the person in charge, never for an agent. Where a command needs a service and none is given, it uses `--service`, else `PSEUDONYM_SERVICE`, else `default`; the library keeps the service required.

## Motivation

Decided with the owner (10 October 2026). A person without any program built on the library (a teacher pasting a submission into a chat by hand, a shell script over an LMS export) had no way to use it, and a model's answer about aliases could only be read one `whois` at a time.

A default service in the library was rejected: two programs that didn't name their service would share it, giving the same person the same alias in both, which is the cross-service linking ADR-002 keeps off by default. In the CLI the person chooses, and sees what was used.

Opening part of the CLI to agents (`redact` reveals nothing) was rejected: client rules deny `pseudonym` as a whole, an exception per subcommand would make them harder to get right, and an agent that needs redaction gets it through a program that uses the library.

## Consequences

- ADR-001 still holds for programs: the library lives inside them. The CLI is a second way in, for people and scripts the person runs.
- Commands that reverse aliases (`whois`, `resolve`, `reveal`) print personal data: their output must never go back to a model. The documentation says so where they're described.
- `redact` without a service: `default` if it has people, else the only service in the directory, else the person must choose; with an empty directory, patterns only. It warns on stderr whenever it falls back.
- New CLI commands follow the same rules: results on stdout, messages on stderr, no name or identifier in an error.
