# Redacting free text

`redact(text, { service, countries? })` is for text people wrote: submissions, forum posts, messages. It returns the text with known people replaced by their aliases and contact and identity data replaced by placeholders, plus how many of each it replaced:

```ts
const { text, replaced } = await redact("Hola, soy Marta Quiroga. Mi móvil es 612 345 678.", { service });
// text:     "Hola, soy A-9NQWD5. Mi móvil es [PHONE_1]."
// replaced: { names: 1, emails: 0, phones: 1, ids: 0, ibans: 0, cards: 0 }
```

`replaced` holds counts, never values, so it's safe to log. National ids of every country count in `ids`.

## Names: the directory's people

First, the display names of the people in the directory **for that service** become their aliases. Remember the people of a context (a course, a forum) before redacting its texts, or their names won't be known.

- **Full names** are matched case and accent insensitively, as whole words: "LUCÍA ferrandiz" is Lucía Ferrándiz; "Ana" is not found inside "Banana".
- **A first name alone** ("como dijo Lucía") is replaced only when exactly **one** person in that service has it **and** the text writes it with a capital initial ("Lucía", "LUCÍA", not "lucía"). That keeps common words safe ("el mar" stays with a Mar López in the directory) and never puts an alias on the wrong person.
- **A full name two people share** is left alone, for the same reason: the wrong alias would attribute to one person what another wrote, which is worse than a name left in.
- Longer names win: "Lucía Ferrándiz" is replaced as a whole, not as "Lucía" plus a surname.

## Contact and identity data: checked patterns

Then, values that can be **checked**: a check digit where the value has one, or, where it hasn't, required separators and ranges that are never issued. Values with neither are left out (see [below](#left-out-on-purpose)).

### Always

| Kind | Example | Checked with | Placeholder |
| --- | --- | --- | --- |
| Email | `marta.q@mail.example.test` | Its shape | `[EMAIL_n]` |
| IBAN, any country | `ES91 2100 0418 4502 0005 1332`, `GB82WEST12345698765432` | The country's length in the IBAN registry and [ISO 13616](https://en.wikipedia.org/wiki/International_Bank_Account_Number) mod 97 | `[IBAN_n]` |
| Payment card | `4111 1111 1111 1111`, `3782-822463-10005` | Issuer prefix and length (Visa, Mastercard, Amex, Discover, Diners, JCB, UnionPay), the same separator throughout, and the [Luhn algorithm](https://en.wikipedia.org/wiki/Luhn_algorithm) | `[CARD_n]` |

### By country

Pass the countries whose people write the texts, as ISO codes, upper or lower case:

```ts
await redact(text, { service, countries: ["US", "CA"] });
```

The default is `["ES"]`. An unknown code throws a `PseudonymError`.

| Country | Kind | Example | Checked with | Placeholder |
| --- | --- | --- | --- | --- |
| `ES` Spain | DNI | `48392017V`, `48392017-V` | The check letter (number mod 23) | `[DNI_n]` |
| `ES` | NIE | `X1234567L` | The check letter, with X, Y, Z as 0, 1, 2 | `[NIE_n]` |
| `ES` | Seguridad Social number | `28/12345678/40` | Province 01-53, control = number mod 97 | `[ES_NSS_n]` |
| `ES` | Phone | `612 345 678`, `+34 91 568 04 06` | Nine digits once `+34` is dropped | `[PHONE_n]` |
| `US` United States | SSN | `123-45-6789` | Only with `-` or spaces; area not 000, 666 or 900-999, group not 00, serial not 0000 | `[US_SSN_n]` |
| `US` | ITIN | `912-78-1234` | Only with separators; 9XX and the issued group ranges | `[US_ITIN_n]` |
| `US`, `CA` | Phone | `(212) 555-0147`, `212-555-0147`, `+1 212 555 0147` | Parentheses, separators or `+1`; area code and exchange start with 2-9 | `[PHONE_n]` |
| `CA` Canada | SIN | `046 454 286`, `046-454-286` | Only with separators; Luhn; never starts with 0 or 8 | `[CA_SIN_n]` |
| `DE` Germany | Steuer-ID | `12 345 678 903` | ISO 7064 MOD 11,10 and one digit repeated in the first ten | `[DE_TAXID_n]` |
| `DE` | Personalausweis number | `L01X00T471` | Check digit with weights 7-3-1 | `[DE_IDCARD_n]` |
| `DE` | Rentenversicherungsnummer | `65 170839 J 003` | A valid birth date and its check digit | `[DE_SVNR_n]` |
| `DE` | Krankenversichertennummer | `A123456780` | Its check digit | `[DE_KVNR_n]` |
| `MX` Mexico | CURP | `GODE561231HDFRRN09` | Its structure and check digit | `[MX_CURP_n]` |
| `CL` Chile | RUT | `12.345.678-5` | Mod 11, `K` for 10 | `[CL_RUT_n]` |
| `AR` Argentina | CUIL/CUIT | `20-12345678-6` | Valid prefix and mod 11 | `[AR_CUIT_n]` |
| `BR` Brazil | CPF | `123.456.789-09` | Both mod 11 digits; never all digits equal | `[BR_CPF_n]` |
| `PT` Portugal | NIF | `123456789` | Valid first digit and mod 11 | `[PT_NIF_n]` |

The examples show the formats; not every one has valid check digits.

Within one call, the same value gets the same placeholder even written differently (`612 345 678` and `+34 612345678` are both `[PHONE_1]`), and numbering starts again in the next call: `[EMAIL_1]` in two posts may be two different addresses. Placeholders can't be resolved: unlike aliases, the values aren't kept anywhere.

The checks keep numbers that only look like ids out: `12345678A` stays, because A isn't its letter, and `666-12-3456` stays, because no SSN starts with 666. Some mistakes are possible and accepted: a nine-digit number that looks like a phone (`600123456` in a sum) is replaced, and with several countries on, a value can get another country's label (a Spanish phone written `612 345 678` that passes Canada's SIN check becomes `[CA_SIN_1]`). It's still replaced.

Enable only the countries you need: each one adds patterns that an ordinary number could, rarely, pass.

### Left out on purpose

Without a check digit, these would catch too many ordinary numbers, so they aren't looked for in any country: a 9-digit SSN or SIN without separators, passport numbers, driver's licences, US Medicare numbers, phone numbers of variable length (German ones among them), Canadian postal codes (part of an address), and the national ids of Argentina (DNI) and Colombia (cédula).

## What it doesn't catch

The Spanish patterns were measured (ADR-005) on 48 made-up Spanish texts: every email, phone, DNI, NIE and IBAN was found, with one false positive. The other countries' patterns are tested on made-up texts in English, German, Spanish and Portuguese, with look-alikes that must not be replaced, and on hundreds of generated values each (ADR-008). But some things are not detected at all, by any pattern:

- **Street addresses** ("Calle del Olmo Seco 14, 3.º B").
- **Dates of birth** (and any other date: a generic date pattern would also hide submission deadlines).
- **Names of people outside the directory**: a classmate mentioned in passing who isn't in the course, a relative.
- **A first name shared by two people** in the service, as above.
- **Ids and phones of countries you didn't enable**, the values [left out on purpose](#left-out-on-purpose), and anything else not in the tables.
- **What people write about themselves** that identifies them without any of the above ("I'm the only one in the class who plays the cello").

So redaction is a safety net, not a guarantee. Prefer structure: if your data source gives you the author of a post as a field, pass that field through `remember()` rather than relying on `redact()` to find the name in the text. And say in your README what isn't caught.

## Why not a detection library

A spike measured OpenRedaction (570+ patterns) against these five patterns on the same texts: its defaults took any two capitalized words for a name ("Hola profe": 50 false positives), missed Spanish landlines, and its "addresses" were only US ZIP codes. Restricted to what worked, it equaled these patterns without phones. The full comparison is in [ADR-005](https://github.com/falkenslab/pseudonym/blob/main/.minispec/decisions/ADR-005-free-text-redaction.md).
