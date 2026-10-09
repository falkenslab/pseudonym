# GDPR and the legal frame

:::warning Not legal advice

This page explains how the library fits the GDPR as its authors understand it, to help you talk to your data protection officer. The institution's DPO decides.

:::

## It's pseudonymization

Under the GDPR (art. 4(5)), pseudonymization is processing personal data so it can no longer be attributed to a person without additional information kept separately and protected. That's what the library does: the additional information is the key and the directory, kept on the machine of the person in charge.

It is **not anonymization**. Pseudonymized data stays personal data for whoever holds the key (the institution, through the person in charge), and all of the GDPR still applies to it. Present it as pseudonymization, never as anonymization.

## What it helps with

- **Minimization**: the model receives what it needs to do its job (who is who, as aliases; what they did) and not names, emails, ids, phones or bank accounts it doesn't need. Minimization matters by itself, regardless of what the recipient can do with the data.
- **Security of processing** (art. 32 names pseudonymization as a measure).
- **The recipient's position**: for a recipient that can't re-identify anyone, the CJEU (EDPS v SRB, 2025) held that pseudonymized data may not be personal data. That's an argument in favor of aliases, equally valid for any pseudonymization, not a guarantee.
- **Purpose limitation**: aliases are per service by default, so data from different services (grades, mail, timetable) isn't joined under one alias unless someone decides to. Joining them is what makes re-identification easiest; turn [linking](../guides/concepts.md#per-service-aliases-and-linking) on only with a reason.
- **Erasure and retention**: `pseudonym forget` and `pseudonym prune` remove people from the directory (see [Tidying the directory](../cli/tidying-the-directory.md)). They're one piece of an erasure request: what your program or the provider already holds is separate.

## What the institution still needs

The library is a technical measure. The legal ones are the institution's:

- a **legal basis** for processing students' (or staff's) data with an AI tool;
- a **processing agreement** with the model's provider;
- a valid mechanism for **international transfers**, or a provider hosted in the EU;
- an **impact assessment** (DPIA) that lists what each tool sends to the model, and says what isn't detected in free text;
- information to the people concerned.

## What to tell your users

If you build a program on the library, your README should state:

- which fields each tool sends to the model, and that people go as aliases;
- that it's pseudonymization, not anonymization;
- what redaction doesn't catch (addresses, birth dates, people outside the directory);
- how to keep their agent away from the key and the CLI ([Keeping agents away from the key](keeping-agents-away.md)).

The person using your program sees their own data without aliases if your program shows it to them: that's your choice, and it doesn't change what the model receives.
