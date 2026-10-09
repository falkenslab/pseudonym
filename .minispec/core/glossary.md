# Glossary

## Alias

What a model sees instead of a person: `A-` plus base32 characters (`A-7K3F9Q`), stable for that person.

## Identifier

Something that names a person in a service: an institutional id, an email, the service's own user id. Normalized before use.

## Service

Where a person was met, named by the caller (`moodle@campus.example.org`). Enters the alias unless linking is on.

## Cross-service linking

The same person having one alias in every service where an identifier matches; off by default.

## Matcher

An HMAC of an identifier kept in the directory, to recognize a person without storing the identifier.

## Directory

The local encrypted file of people met: alias, display name, service ids, matchers, first and last seen.

## Key

32 random bytes in the shared folder; everything derives from it. Lost key, lost way back.

## Fingerprint

A short code of the key, to check two machines use the same one.
