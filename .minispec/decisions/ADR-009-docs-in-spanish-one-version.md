# ADR-009: The documentation site in English and Spanish, one version only

## Decision

The documentation site is published in English (`/pseudonym/`) and Spanish (`/pseudonym/es/`). The English pages in `docs/content/` are the source; their Spanish translations live in `docs/i18n/es/` and change in the same commit as the English page. The API reference, generated from the code's doc comments, stays in English in both. The site keeps one version: it describes `main`, which is the latest release; no snapshots per release.

This amends ADR-004 ("English everywhere"): the repository, the code, the CLI and the README stay in English; the Spanish lives only in the site's Spanish locale.

## Motivation

Decided with the owner (23 October 2026). The library's first users are Spanish-speaking teachers, and the GDPR pages read better in the legal Spanish of the RGPD. Old versions' documentation helped nobody in 0.x, and every release multiplied the pages to keep, and now to translate.

## Consequences

- Every visible change updates two pages: `update-docs` checks the Spanish one, and the site's build fails on a broken link or anchor in either language.
- Translated headings keep the English anchor (`## Alias por servicio y enlace {#per-service-aliases-and-linking}`), so links work in both languages without translating them.
- Spanish pages link to the API reference by URL (`/docs/api`), not by file: it exists only in English.
- Between a merge and its release, the site may describe something not yet on npm; release often enough that this stays short.
- The footer is Falken's Lab's signature, never translated.
