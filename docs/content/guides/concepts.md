# Concepts

## Service

A string naming where your program met a person: `moodle@campus.example.org`, `mail@school.example.org`. You choose it, and it should name the instance, not just the product: two Moodle sites are two services.

Keep it stable. It's part of every alias (unless linking is on) and the key under which the directory keeps each person's service id: changing it gives everyone new aliases in that service.

## Identifiers

What names a person in a service. Pass every one you have:

| Identifier | What it is | Normalized as |
| --- | --- | --- |
| `institutionalId` | An id the institution gives the person, the same across services: a student number, a staff number, a DNI | Trimmed, upper case, without spaces or hyphens: `12345678-z` and `12345678 Z` are `12345678Z` |
| `email` | Their email address | Trimmed, lower case |
| `serviceUserId` | The service's own id for them: a Moodle user id | Trimmed |

The **strongest** one present (in that order) makes the alias, because it's the most likely to be the same across services and over time. All of them let the directory recognize the person later.

Normalization is part of every alias: it's fixed, and changing it in a future version would be a breaking change.

## Alias

`A-` plus 6 characters of [Crockford's base32](https://www.crockford.com/base32.html) (`0-9` and `A-Z` without `I`, `L`, `O` and `U`, so a person or a model copies it without confusing characters): `A-7K3F9Q`.

In the rare case that two people get the same 6 characters, the second one gets a 7-character alias (`A-7K3F9QX`), which extends the same prefix. Treat aliases as opaque strings; to match their shape in a test, use `/^A-[0-9A-HJKMNP-TV-Z]{6,12}$/`.

Aliases are case-insensitive where the library takes them back (`resolve`, `pseudonym whois`): `a-7k3f9q` works.

## Directory

A local file of the people your program has met, encrypted by default (it can also be [plain JSON](storage.md), without a key), shared by every program on the machine that uses the library. For each person it keeps:

- their alias, and any aliases [linked](../cli/tidying-the-directory.md#link-two-aliases) into it;
- their display name (what `pseudonym whois` shows);
- their service ids: for each service, the `serviceUserId` you passed;
- matchers: keyed hashes of their email and institutional id, never the identifiers themselves;
- when they were first and last seen.

Because of it, a person keeps their **first alias** when an identifier changes: a student who gets a new email is recognized by their Moodle user id and keeps `A-7K3F9Q`. And the person in charge can resolve aliases offline, without your data source.

## Per-service aliases and linking

By default the service enters the alias, and the directory only matches people within the same service. The same student is `A-7K3F9Q` in Moodle and `A-M2X8RD` in the mail, so a model that sees both can't join what it learns about them: linking grades, mail and timetable under one alias is what makes re-identifying someone easiest.

If your program really needs one alias across services, turn **linking** on: `remember({ ..., link: true })`, or `PSEUDONYM_LINK=true` for every call that doesn't say. Then the service stays out of the alias, and a person met in another service with the same identifier gets the same alias. It's off by default on purpose; see [GDPR and the legal frame](../security/gdpr.md).

## The key

32 random bytes in the shared folder, created on first use. Everything derives from it: aliases, the directory's encryption, the matchers, the fingerprint. Two machines with the same key give the same people the same aliases.

Losing it loses every way back, by design: aliases can't be resolved and the directory can't be read. The person in charge backs it up once with [`pseudonym key export`](../cli/the-key.md).
