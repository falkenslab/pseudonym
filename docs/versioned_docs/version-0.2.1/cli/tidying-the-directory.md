# Tidying the directory

## Link two aliases

Sometimes one person ends up with two aliases: met in two services without linking, or met with an identifier the directory couldn't connect to them (a personal email in one place, the school's in another). When you know they're the same person:

```text
$ pseudonym link A-7K3F9Q A-M2X8RD
A-7K3F9Q kept; A-M2X8RD now resolves to it.
```

- The **first** alias is kept. The second one isn't lost: `whois`, `resolve()` and the matching of new data all lead to the kept entry.
- The entries are merged: services, ids, matchers, and the earliest first-seen and latest last-seen dates.
- From then on, programs get the kept alias for that person, in every service the merged entry had.
- Either alias unknown: exit code `2`, and nothing changes.

Linking two aliases joins what a model may learn about the person under them from now on. Do it when the person in charge needs one view of that person, not by default (see [GDPR and the legal frame](../security/gdpr.md)).

## Forget a person

For an erasure request, or someone who should no longer be there:

```text
$ pseudonym forget A-7K3F9Q
Forgot A-7K3F9Q.
```

- The entry is removed: name, service ids, matchers.
- If a program meets the person again, they get **the same alias back**, recomputed from their identifier with the key. Only the offline lookup was lost in between.
- An unknown alias: exit code `2`.

Forgetting removes the person from the directory, not from the data your programs or the model's provider may already hold. It's one piece of an erasure request, not all of it.

## Forget a whole service

When a course closes, or you stop using a program:

```text
$ pseudonym forget --service moodle@campus.example.org
This removes the 28 people met in moodle@campus.example.org and can't be undone. Type moodle@campus.example.org to confirm: moodle@campus.example.org
Forgot moodle@campus.example.org: removed 27 people; 1 person also met in other services kept.
```

- People met **only** in that service are removed.
- People also met in other services (with [linking](../guides/concepts.md#per-service-aliases-and-linking), or [linked](#link-two-aliases) by you) keep their entry and alias, without that service's id.
- `pseudonym services` shows which services there are, and how many people each has. A service the directory doesn't know: exit code `2`, nothing changes.

## Forget everyone

```bash
pseudonym forget --all
```

Empties the directory, after you type `all` to confirm. **The key stays**: anyone met again gets the same alias as before, recomputed. To start over with new aliases for everyone, delete the whole folder instead (see [If the key is lost for good](the-key.md#if-the-key-is-lost-for-good)).

## Confirming without a terminal

Both ask you to type the service's name (or `all`), because they can't be undone. In a script, where there is no terminal to ask, add `--yes`; without it, they exit with code `1` and change nothing.

## Remove people not seen for a while

For a retention limit:

```text
$ pseudonym prune --older-than 2y
Removed 14 people.
```

- `--older-than` takes a number and `d` (days), `m` (months) or `y` (years): `90d`, `6m`, `2y`.
- It removes everyone whose last seen date is older than that. "Seen" means a program called `remember()` with them.
- As with `forget`, they get the same alias back if they're met again.

A typical policy: prune once a year, after the courses of that year are closed.
