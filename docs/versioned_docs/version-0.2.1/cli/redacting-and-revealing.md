# Redacting and revealing text

Two commands for working with a model by hand, without a program in between: `redact` makes a text safe to paste into a chat, and `reveal` puts the names back into what the model answers.

## Redact a text before pasting it

```bash
pseudonym redact --service moodle@campus.example.org < submission.txt > safe.txt
pseudonym redact --service moodle@campus.example.org submission.txt
```

```text
$ pseudonym redact < post.txt
Hola, soy A-9NQWD5. Mi móvil es [PHONE_1] y mi correo [EMAIL_1].
pseudonym: Using the only service in the directory: moodle@campus.example.org.
pseudonym: Replaced 1 name, 1 email, 1 phone.
```

- It reads the file you give it, or stdin when there is none (or it's `-`), and prints the text to stdout, changed only where something was replaced: line endings and the final newline stay as they were (see [accents and encodings](#accents-and-encodings) for text that isn't UTF-8).
- What it replaces is exactly what [`redact()`](../guides/redaction.md) does: the directory's people of that service become their aliases, and emails, payment cards, IBANs and the ids and phones of the countries asked for become placeholders. `--countries US,CA` chooses the countries (Spain by default; see [the table](../guides/redaction.md#by-country)). The counts go to stderr, so `> safe.txt` gets only the text.
- It only knows the names of people the directory has met. Someone your programs never remembered stays as they are: read the result before pasting it.

### Accents and encodings

The output is always UTF-8. The input should be too, and usually is; when it isn't, the command says so on stderr and reads it the way Windows wrote it:

- text piped from `cmd` (`echo … | pseudonym redact`) is in the console's code page, 850 in Spain or 437 in the US: it's read in that code page;
- a file saved as "ANSI" by an older editor is Windows-1252: it's read as that.

So accented letters (`librería`, `Ñ`) come out right either way. A UTF-8 file's byte order mark, if it has one, is dropped.

## Which service it uses

The names come from one service's people. When you don't say which:

| Situation | What `redact` uses |
| --- | --- |
| `--service S` given | S's people; if the directory doesn't know S, no names (a warning lists the services it knows) |
| `PSEUDONYM_SERVICE` set | That service, the same way |
| The directory has people in `default` | `default` |
| The directory has one service | That one, named on stderr |
| The directory has several, none of them `default` | An error listing them: choose one with `--service` |
| The directory is empty | No names, only emails, phones, ids and IBANs, with a warning |

`pseudonym services` shows what there is:

```text
$ pseudonym services
moodle@campus.example.org  28 people
mail@school.example.org  3 people
```

`--json` gives the same as `[{"service": "…", "people": 28}, …]`.

Every command that takes a service uses the same default: `--service`, else `PSEUDONYM_SERVICE`, else `default`. Set `PSEUDONYM_SERVICE` in your shell's profile if you always work with one.

## Reveal the names in an answer

The model answers about aliases ("A-9NQWD5 hasn't handed in practice 2"). To read it with names:

```bash
pseudonym reveal < answer.txt
pseudonym reveal --with-alias answer.txt
```

```text
$ pseudonym reveal --with-alias < answer.txt
Marta Quiroga (A-9NQWD5) hasn't handed in practice 2.
pseudonym: Revealed 1 alias.
pseudonym: The output holds names in clear: never paste it back to a model, nor where an agent can read it.
```

- Every alias the directory knows becomes the person's name, `Name (A-…)` with `--with-alias`. Aliases [linked](tidying-the-directory.md#link-two-aliases) into another one count. No service is needed: aliases are unique in the directory.
- Aliases are matched as whole words and in any case (`a-9nqwd5` works). An alias the directory doesn't know stays as it is, and is counted on stderr.
- Placeholders such as `[EMAIL_1]` stay: their values aren't kept anywhere, so they can't be undone.

**Its output holds names in clear.** Read it yourself; never paste it back into the chat, and don't leave it where an agent can read it.

## Exit codes

Both exit with `0` when they're done, even if there was nothing to replace, and with `1` on an error (a file that can't be read, an unknown option, several services and none chosen), with nothing on stdout.
