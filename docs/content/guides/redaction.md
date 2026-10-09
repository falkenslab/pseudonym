# Redacting free text

`redact(text, { service })` is for text people wrote: submissions, forum posts, messages. It returns the text with known people replaced by their aliases and contact and identity data replaced by placeholders, plus how many of each it replaced:

```ts
const { text, replaced } = await redact("Hola, soy Marta Quiroga. Mi móvil es 612 345 678.", { service });
// text:     "Hola, soy A-9NQWD5. Mi móvil es [PHONE_1]."
// replaced: { names: 1, emails: 0, phones: 1, ids: 0, ibans: 0 }
```

`replaced` holds counts, never values, so it's safe to log.

## Names: the directory's people

First, the display names of the people in the directory **for that service** become their aliases. Remember the people of a context (a course, a forum) before redacting its texts, or their names won't be known.

- **Full names** are matched case and accent insensitively, as whole words: "LUCÍA ferrandiz" is Lucía Ferrándiz; "Ana" is not found inside "Banana".
- **A first name alone** ("como dijo Lucía") is replaced only when exactly **one** person in that service has it **and** the text writes it with a capital initial ("Lucía", "LUCÍA", not "lucía"). That keeps common words safe ("el mar" stays with a Mar López in the directory) and never puts an alias on the wrong person.
- **A full name two people share** is left alone, for the same reason: the wrong alias would attribute to one person what another wrote, which is worse than a name left in.
- Longer names win: "Lucía Ferrándiz" is replaced as a whole, not as "Lucía" plus a surname.

## Contact and identity data: checked patterns

Then, in this order:

| Kind | Example | Checked with |
| --- | --- | --- |
| Email | `marta.q@mail.example.test` | Its shape |
| DNI | `48392017V`, `48392017-V` | The check letter (number mod 23) |
| NIE | `X1234567L` | The check letter, with X, Y, Z as 0, 1, 2 |
| Spanish IBAN | `ES91 2100 0418 4502 0005 1332` | ISO 13616 mod 97 |
| Spanish phone | `612 345 678`, `+34 91 568 04 06` | Nine digits once `+34` is dropped |

Each value becomes `[EMAIL_n]`, `[DNI_n]`, `[NIE_n]`, `[IBAN_n]` or `[PHONE_n]`. Within one call, the same value gets the same placeholder even written differently (`612 345 678` and `+34 612345678` are both `[PHONE_1]`), and numbering starts again in the next call: `[EMAIL_1]` in two posts may be two different addresses.

The check digits keep numbers that only look like ids out: `12345678A` stays, because A isn't its letter. A nine-digit number that looks like a phone (`600123456` in a sum) is replaced: an acceptable mistake.

Placeholders can't be resolved: unlike aliases, the values aren't kept anywhere.

## What it doesn't catch

These were measured (ADR-005) on 48 made-up Spanish texts: every email, phone, DNI, NIE and IBAN was found, with one false positive. But some things are not detected at all, by any pattern:

- **Street addresses** ("Calle del Olmo Seco 14, 3.º B").
- **Dates of birth** (and any other date: a generic date pattern would also hide submission deadlines).
- **Names of people outside the directory**: a classmate mentioned in passing who isn't in the course, a relative.
- **A first name shared by two people** in the service, as above.
- **Other countries' ids and phones**, and anything else not in the table.
- **What people write about themselves** that identifies them without any of the above ("I'm the only one in the class who plays the cello").

So redaction is a safety net, not a guarantee. Prefer structure: if your data source gives you the author of a post as a field, pass that field through `remember()` rather than relying on `redact()` to find the name in the text. And say in your README what isn't caught.

## Why not a detection library

A spike measured OpenRedaction (570+ patterns) against these five patterns on the same texts: its defaults took any two capitalized words for a name ("Hola profe": 50 false positives), missed Spanish landlines, and its "addresses" were only US ZIP codes. Restricted to what worked, it equaled these patterns without phones. The full comparison is in [ADR-005](https://github.com/falkenslab/pseudonym/blob/main/.minispec/decisions/ADR-005-free-text-redaction.md).
