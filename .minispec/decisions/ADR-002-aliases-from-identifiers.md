# ADR-002: Aliases from a person's best identifier, under a local key

## Decision

An alias is `A-` plus the base32 of an HMAC-SHA256, truncated to 6 characters (30 bits: a collision is unlikely below tens of thousands of people) and lengthened by one on a collision in the directory, keyed with a subkey of the local key. Its input is the person's best identifier the caller has, normalized: an institutional id, else an institutional email, else the service's own user id. Cross-service linking is off by default: the service's name enters the HMAC, so the same person gets a different alias in each service; on, the service is left out and the same identifier gives the same alias everywhere.

## Motivation

A keyed HMAC is stable, short and one-way without the key: a model can't undo it, and the person can recompute it. The best identifier is the one most likely to be the same across services and over time. Linking services is what makes re-identification easiest (grades plus mail plus timetable), so it's opt-in.

## Consequences

- The alias doesn't depend on the display name: renaming a person keeps it.
- An identifier change (a new email) would change the alias; the directory keeps the first one (ADR-003).
- Base32 without confusable characters, upper case, so an agent copies it without errors.
- A lengthened alias depends on who the directory met first: two machines sharing a key could differ on that rare person; `link` reconciles them.
