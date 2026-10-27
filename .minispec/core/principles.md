# Engineering principles

Consult **before** writing code.

- Solve first, optimize later; readable code over clever code.
- Avoid premature abstractions; propose a simpler alternative before adding complexity.
- Preserve existing behavior; don't refactor outside the task's scope.
- Document decisions, not implementation.
- Nothing of any consumer (Moodle, miyagi) in this code: callers pass services and identifiers.
- Never write a name, email or institutional id in clear to disk, except in plain storage chosen explicitly (ADR-010); never print the key unless asked by `key export`.
- Fail closed: when the key or the directory can't be trusted, or the folder holds the other storage mode's directory, refuse and explain instead of guessing, regenerating or switching.
- Cryptography from `node:crypto` only, with standard constructions (HMAC-SHA256, HKDF, AES-256-GCM); no home-made schemes.
- No runtime dependencies unless a feature can't be done without one.
