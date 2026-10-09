# What it protects against

## The threat it addresses

**Data about people reaching a language model by accident**, through the programs that use the library. A teacher's agent reading a course's submissions, grades and forum would otherwise send students' names, emails and ids to a model that may run outside the institution, outside the country, or outside the EU.

With the library in place, the model sees aliases instead of people, placeholders instead of contact and identity data in free text, and can still do its job: tell people apart, refer to them, and ask your program to act on them.

## What it relies on

- **Your program passes every person through it.** The library replaces what you give it; a field you forget (an avatar URL, a username in a link) goes as it is. Integrate it where results are built, and test that nothing leaks ([Testing your integration](../guides/testing.md)).
- **The key stays on the machine and away from the agent.** The key and the directory are in the user's folder, readable by the user only. The model never sees them; an agent running on the same machine could, unless the client denies it.

## What it doesn't protect against

- **An agent that deliberately reads the key or runs the CLI** on the same machine. The library can't stop it from inside; the client's permissions can, partly, and the operating system's sandbox fully. See [Keeping agents away from the key](keeping-agents-away.md).
- **What redaction misses** in free text: street addresses, dates of birth, people outside the directory, a first name two people share, and anything people say about themselves that identifies them. See [Redacting free text](../guides/redaction.md#what-it-doesnt-catch).
- **Re-identification from context.** A model told that `A-7K3F9Q` is "the only student in group B who plays the cello" may infer who they are. Aliases hide identifiers, not facts.
- **Anyone with the key.** The key resolves every alias: whoever gets it (a backup left in a shared folder, a stolen laptop without disk encryption) can undo everything.
- **The model's provider keeping what it receives.** It receives aliases and redacted text: that's the point. But your contract with it still matters (see [GDPR and the legal frame](gdpr.md)).
- **Your own program's other outputs.** Logs, caches and files your program writes are yours to protect.

## Why a library and not a server

An MCP server offering `mask` and `unmask` tools would hand the agent a way to undo pseudonymization, and let it decide when to mask. A library inside the server that already knows which fields are people is exact and gives the agent nothing to call (ADR-001).

For third-party servers that can't integrate a library, a pseudonymizing proxy is the option; it's detection-based, so it misses what its rules don't know.

## Why aliases and not encrypted tokens

An encrypted token per person (a JWE with id, name and email) is legally the same pseudonymization, but sends contact data the model doesn't need, exposes everything ever sent if the key leaks, changes when the email does, and costs the model hundreds of characters per mention. An alias is eight characters, and the offline resolution tokens would give comes from the local directory instead (ADR-006).
