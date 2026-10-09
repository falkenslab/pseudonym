# Using the library without code

Everything a program does with the library can be done from the command line: give people aliases, turn an alias back into an id, and redact text. Useful when you work with a model by hand, or from a shell script, without writing a program.

## Load your class

So that [`redact`](redacting-and-revealing.md) knows your students' names, the directory has to have met them. Load them from a CSV, such as an export of your LMS's participants:

```text
Name,Email,Institutional ID,service_user_id,Group
Marta Quiroga,marta.q@school.example.org,2024-0031,4821,B
"Ferrándiz, Lucía",lucia.f@school.example.org,,4825,"B, mornings"
Hugo Estrella,,2024-0047,,A
```

```bash
pseudonym remember --csv class.csv --service class-2b > class-with-aliases.csv
```

- **Columns it reads**, by their header, ignoring case, spaces, hyphens and underscores: `name` (required), `email`, `institutional_id` and `service_user_id` (at least one per row). They're the [identifiers](../guides/concepts.md#identifiers) the library uses.
- **Other columns** (group, grades, anything) are kept as they are.
- **The output** is the same CSV with an `alias` column first. It still holds names: it's for you.
- **The whole file goes in one call**, and nothing is remembered if a row is wrong: an error names the line (never its content), so you can fix it and run it again.
- `--csv -` reads stdin; without `--service` it uses the [default service](overview.md#the-default-service).

## Pseudonymize an export for a model

Add `--only-aliases` and the columns that identify someone are dropped, leaving the aliases and everything else:

```bash
pseudonym remember --csv grades.csv --service class-2b --only-aliases > grades-for-the-model.csv
```

```text
alias,Group,Practice 1,Practice 2
A-9NQWD5,B,8.5,7
A-Q30XC4,"B, mornings",7.5,8
A-TA8D1J,A,6,5.5
```

That file can go to a model: it says who did what, as aliases, and nobody's name, email or id. Check the other columns yourself: a comment column may still name people (pass it through `pseudonym redact` if so).

The model's answer about `A-9NQWD5` can be read with names using [`pseudonym reveal`](redacting-and-revealing.md#reveal-the-names-in-an-answer).

## One person

```bash
pseudonym remember --name "Marta Quiroga" --email marta.q@school.example.org --service-user-id 4821
```

prints `A-9NQWD5`. Options: `--name` (required), `--email`, `--institutional-id`, `--service-user-id` (at least one), `--service`, `--link` (one alias across services, see [linking](../guides/concepts.md#per-service-aliases-and-linking)), and `--json` for `{"alias": "A-9NQWD5"}`.

Remembering someone again gives the same alias, as in the library: a person keeps their first alias even if their email changes.

## From an alias back to an id

A script that gets an alias from a model and needs to act on that person in the LMS:

```bash
pseudonym resolve A-9NQWD5 --service class-2b
```

prints `4821`, the `service_user_id` remembered for that person in that service (linked aliases count). With `--json`: `{"alias": "A-9NQWD5", "service": "class-2b", "id": "4821"}`. Exit code `2` if the directory doesn't know the alias, or has no id for it in that service.

## In a script

```bash
#!/bin/sh
# Grades to a model as aliases, its answer back with names, for the teacher only.
export PSEUDONYM_SERVICE=class-2b
pseudonym remember --csv grades.csv --only-aliases > for-model.csv
ask-the-model --file for-model.csv "Who needs help, and why?" > answer.txt   # your own tool
pseudonym reveal < answer.txt
```

`remember`, `redact` and `reveal` print results to stdout and messages to stderr, so they compose with pipes. Run such scripts yourself, never through an agent: `reveal` and `resolve` undo the aliases ([Keeping agents away from the key](../security/keeping-agents-away.md)).
