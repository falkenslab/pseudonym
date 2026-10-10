# Resolving aliases

## Who is an alias

```text
$ pseudonym whois A-7K3F9Q
Ana Pérez
  alias A-7K3F9Q
  services moodle@campus.example.org
  first seen 2026-10-09T18:02:11.000Z, last seen 2026-10-09T19:40:05.000Z
```

- The first line is the display name, alone, so a script can take it with `head -1`.
- Aliases are case-insensitive: `pseudonym whois a-7k3f9q` works.
- An alias that was [linked](tidying-the-directory.md#link-two-aliases) into another one shows the person it now resolves to, with `(also A-…)` after the alias.
- An unknown alias prints a message on stderr and exits with code `2`.

The directory only knows the people your programs have met on this machine (or on a machine whose directory you copied). It doesn't need the program or its data source: it works offline.

## The aliases of a person

```text
$ pseudonym alias "ana perez"
A-7K3F9Q  Ana Pérez  (moodle@campus.example.org)
A-M2X8RD  Ana Pérez  (mail@school.example.org)
```

- Everyone whose display name **contains** what you type, ignoring case and accents: `alias lucia` lists every Lucía.
- One line per person: alias, name and the services where they were met. The same person in two services usually has two aliases (see [per-service aliases](../guides/concepts.md#per-service-aliases-and-linking)).
- Nobody matching: exit code `2`.

## A whole service at once

To cross aliases with something else (a gradebook export, a list the model produced), get a service's people as CSV:

```bash
pseudonym aliases --service moodle@campus.example.org > people.csv
```

Without `--service`, it uses the [default service](overview.md#the-default-service).

```text
alias,name
A-7K3F9Q,Ana Pérez
A-TA8D1J,Hugo Estrella
A-Q30XC4,"Ferrándiz, Lucía"
```

The CSV goes to stdout and a warning to stderr: the library never writes names to a file by itself, so the file exists only because you redirected it. **It holds names in clear**: keep it away from agents (and out of any folder an agent can read), and delete it when done.
