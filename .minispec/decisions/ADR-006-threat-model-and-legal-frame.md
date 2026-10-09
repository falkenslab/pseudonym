# ADR-006: What it protects against, and the legal frame it works in

## Decision

The library protects against data about people reaching a language model by accident, through the programs that use it. It doesn't protect against an agent that deliberately reads the key or runs the CLI on the same machine: that is closed with the client's permissions, which consumers document. It is pseudonymization in the GDPR's sense (art. 4(5)), never presented as anonymization, and leaves the legal basis to the institution.

## Motivation

Raised by the owner (9 October 2026): teachers' agents send students' names, submissions and grades to models that may run outside Spain or the EU. Not legal advice; the institution's data protection officer decides. What the conversation established:

- Pseudonymized data stays personal data for whoever holds the key (the institution). For a recipient that can't re-identify anyone, the CJEU (EDPS v SRB, 2025) held it may not be personal data: an argument for aliases, equally valid for any pseudonymization, not a guarantee.
- Minimization matters by itself: send no contact data the model doesn't need, even encrypted.
- Linking services (grades plus mail plus timetable under one alias) is what makes re-identification easiest, and strains purpose limitation: cross-service linking is opt-in (ADR-002).
- The institution still needs its own measures: a processing agreement with the model's provider, a valid mechanism for international transfers or an EU-hosted provider, and an impact assessment that lists what each tool sends.

Alternatives considered:

- **An encrypted token per person** (a JWE with id, name and email, decryptable with the key): legally the same pseudonymization; sends contact data the model doesn't need; a leaked key would expose everything ever sent; needs deterministic encryption (AES-SIV) to be stable and still changes with a new email; costs a model hundreds of characters per mention. The useful part (offline resolution) is the local directory instead.
- **A pseudonymization MCP server** (pseudonym-mcp, Prompt Anonymizer, Philter MCP expose `mask`/`unmask` tools): the agent decides when to mask and can call `unmask`. Rejected (ADR-001).
- **A pseudonymizing proxy for third-party servers** (MCP Conceal, PII Anonymizer): detection-based, so it misses what its rules don't know; kept as the option for servers that can't integrate this library, evaluated before building one.

## Consequences

- Consumers' READMEs state what each tool sends, that it's pseudonymization, what isn't detected (ADR-005), and the client permissions that deny an agent the key folder and the `pseudonym` command (in Claude Code, deny rules for reading `%APPDATA%\pseudonym\` / `~/.config/pseudonym/` and for running `pseudonym`).
- `forget` and `prune` exist for erasure requests and retention limits.
- The person using the consumer sees their own data unpseudonymized; that's the consumer's choice (moodle-mcp: yes).
