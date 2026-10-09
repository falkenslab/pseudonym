# GDPR and the legal frame

:::warning Not legal advice

This page explains how the library fits data protection law as its authors understand it, to help you talk to your data protection officer. The institution's [data protection officer](https://gdpr-info.eu/art-37-gdpr/) decides.

:::

## What the GDPR is

The **General Data Protection Regulation** ([Regulation (EU) 2016/679](https://eur-lex.europa.eu/eli/reg/2016/679/oj), RGPD in Spanish) is the European Union's data protection law. It isn't one country's law:

- it applies directly in every EU member state and in the rest of the European Economic Area (Iceland, Liechtenstein, Norway);
- it also applies to organizations outside the EU that process data of people in the EU when they offer them services or monitor their behavior ([art. 3](https://gdpr-info.eu/art-3-gdpr/));
- each country adds its own law on top of it: in Spain, the [Ley Orgánica 3/2018 (LOPDGDD)](https://www.boe.es/buscar/act.php?id=BOE-A-2018-16673), supervised by the [Agencia Española de Protección de Datos](https://www.aepd.es/).

A school, university or company in the EU whose staff use AI tools on students' or employees' data is processing personal data under the GDPR. Outside the EU, see [other countries](#outside-the-eu) below.

## It's pseudonymization

The GDPR defines **pseudonymization** ([art. 4(5)](https://gdpr-info.eu/art-4-gdpr/)) as processing personal data so it can no longer be attributed to a person without additional information that is kept separately and protected. That's what the library does: the additional information is the key and the directory, kept on the machine of the person in charge.

It is **not anonymization**. [Recital 26](https://gdpr-info.eu/recitals/no-26/) says that pseudonymized data, which could be attributed to a person with additional information, is still information about an identifiable person: personal data, for whoever holds the key (the institution, through the person in charge). All of the GDPR still applies to it. Present it as pseudonymization, never as anonymization.

The European Data Protection Board explains what good pseudonymization looks like in its [Guidelines 01/2025 on pseudonymisation](https://www.edpb.europa.eu/our-work-tools/documents/public-consultations/2025/guidelines-012025-pseudonymisation_en).

## What it helps with

- **Data minimization** ([art. 5(1)(c)](https://gdpr-info.eu/art-5-gdpr/)): the model receives what it needs to do its job (who is who, as aliases; what they did) and not names, emails, ids, phones or bank accounts it doesn't need. Minimization matters by itself, whatever the recipient can do with the data.
- **Data protection by design** ([art. 25](https://gdpr-info.eu/art-25-gdpr/)) and **security of processing** ([art. 32](https://gdpr-info.eu/art-32-gdpr/)): both name pseudonymization as a measure. [Recital 28](https://gdpr-info.eu/recitals/no-28/) adds that it reduces the risks for the people concerned.
- **The recipient's position**: in [EDPS v SRB (case C-413/23 P, 4 September 2025)](https://curia.europa.eu/juris/liste.jsf?num=C-413/23), the Court of Justice of the EU held that pseudonymized data may not be personal data for a recipient that can't re-identify anyone by reasonable means, while it stays personal data for whoever holds the key. The case was decided under the regulation for EU institutions, whose definition of personal data is the same as the GDPR's. It's an argument in favor of aliases, equally valid for any pseudonymization, not a guarantee.
- **Purpose limitation** ([art. 5(1)(b)](https://gdpr-info.eu/art-5-gdpr/)): aliases are per service by default, so data from different services (grades, mail, timetable) isn't joined under one alias unless someone decides to. Joining them is what makes re-identification easiest; turn [linking](../guides/concepts.md#per-service-aliases-and-linking) on only with a reason.
- **Erasure and storage limitation** ([art. 17](https://gdpr-info.eu/art-17-gdpr/), [art. 5(1)(e)](https://gdpr-info.eu/art-5-gdpr/)): `pseudonym forget` and `pseudonym prune` remove people from the directory (see [Tidying the directory](../cli/tidying-the-directory.md)). They're one piece of an erasure request: what your program or the model's provider already holds is separate.

## What the institution still needs

The library is a technical measure. The legal ones are the institution's:

- a **legal basis** for processing students' or staff's data with an AI tool ([art. 6](https://gdpr-info.eu/art-6-gdpr/));
- a **processing agreement** with the model's provider, who acts as a processor ([art. 28](https://gdpr-info.eu/art-28-gdpr/));
- a valid mechanism for **international transfers** if the provider processes data outside the EEA, or a provider hosted in the EU ([chapter V](https://gdpr-info.eu/chapter-5/));
- a **data protection impact assessment** ([art. 35](https://gdpr-info.eu/art-35-gdpr/)) that lists what each tool sends to the model, and says what isn't detected in free text;
- **information to the people concerned** about the processing ([art. 13](https://gdpr-info.eu/art-13-gdpr/)).

## Outside the EU

Other countries have their own laws, with similar ideas and different details. Some starting points:

- **United Kingdom**: the UK GDPR, kept after Brexit and close to the EU's: [ICO guidance](https://ico.org.uk/for-organisations/uk-gdpr-guidance-and-resources/).
- **Canada**: [PIPEDA](https://www.priv.gc.ca/en/privacy-topics/privacy-laws-in-canada/the-personal-information-protection-and-electronic-documents-act-pipeda/) for private organizations, and provincial laws for public bodies such as schools.
- **United States**: no general federal law; sector laws apply instead, such as FERPA for students' education records, plus state laws.

Pseudonymization and minimization are good practice under all of them; what each one requires is for your legal advisers.

## What to tell your users

If you build a program on the library, your README should state:

- which fields each tool sends to the model, and that people go as aliases;
- that it's pseudonymization, not anonymization;
- what redaction doesn't catch (addresses, birth dates, people outside the directory);
- how to keep their agent away from the key and the CLI ([Keeping agents away from the key](keeping-agents-away.md)).

The person using your program sees their own data without aliases if your program shows it to them: that's your choice, and it doesn't change what the model receives.
