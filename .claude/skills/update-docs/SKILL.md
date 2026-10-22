---
name: update-docs
description: Keep pseudonym's documentation in step with the code - the documentation site (docs/, Docusaurus, published at falkenslab.github.io/pseudonym, in English and its Spanish translation), the README, the CLI's usage text, the doc comments of the public API, the classroom example and .minispec/core. Use after ANY change to src/, examples/ or the package scripts, before every commit of such a change, and before a release. A change is not done until its documentation is.
---

# Keep the documentation up to date

What callers and the person in charge learn comes from the documentation site (`docs/`, published at https://falkenslab.github.io/pseudonym/), the README, the CLI's own help, and the doc comments of what `src/index.ts` exports (they generate the site's API reference and ship in `dist/*.d.ts`). Code that changes what a caller or the person sees, and isn't documented, is unfinished work.

## 1. Find what changed

```
git status --short
git diff --stat
git diff -- src/index.ts src/cli.ts package.json
```

For each change, ask: would a caller (an MCP server using the library) or the person running `pseudonym` notice it? Count as yes:

- a new, removed or renamed export, option, parameter or type field;
- a new or changed CLI command, flag, output or error message;
- a changed default, alias format, file location or on-disk format;
- a fix that changes what someone could rely on;
- new or changed package scripts, requirements (Node version) or install steps.

Internal refactors, tests and comments with no visible effect need no documentation change (but see doc comments below).

## 2. Find the pages

Pages live in `docs/content/`; `docs/sidebars.ts` is the map. Typical owners:

| Change in | Pages |
| --- | --- |
| Install, requirements, environment variables | `guides/installation.md` |
| Identifiers, normalization, alias format, linking, the directory's contents | `guides/concepts.md`, `security/how-it-works.md` |
| `remember()`, `resolve()`, errors, warnings | `guides/integrating.md` |
| `redact()`: names, patterns, what it misses | `guides/redaction.md`, `security/threat-model.md` |
| Testing advice, `PSEUDONYM_HOME` | `guides/testing.md` |
| `whois`, `alias`, `aliases` | `cli/resolving-aliases.md`, `cli/reference.md` |
| `link`, `forget`, `prune` | `cli/tidying-the-directory.md`, `cli/reference.md` |
| `key fingerprint`, `export`, `import` | `cli/the-key.md`, `cli/reference.md` |
| Files in the folder, lock, encryption, key creation | `security/how-it-works.md`, `cli/reference.md` |
| What it protects against, legal frame | `security/threat-model.md`, `security/gdpr.md` |
| Client deny rules and their tests | `security/keeping-agents-away.md` |
| `examples/classroom-mcp` | `example/classroom-mcp.md` and the example's README |
| What the library offers overall | `intro.md`, the home page (`docs/src/pages/index.tsx`), `README.md` |

Search too: `grep -rn "<the option, command or function>" docs/content README.md examples .minispec src` finds every place that mentions it, so none keeps describing the old behavior.

## 3. Update them

- **Doc comments** on every new or changed export from `src/index.ts`: what it's for and when to use it, not how it's built (each overload gets its own). Cryptographic choices name their construction and parameters (conventions). An export without one shows as "-" in the API reference.
- **The site's pages**: change the existing explanation rather than appending a note that contradicts it. Pages are CommonMark (`.md`), not MDX: write `<placeholders>` inside backticks. A new page goes in `docs/sidebars.ts`, linked from the pages that lead to it.
- **Spanish, in the same change** (ADR-009): every English page in `docs/content/` has its translation in `docs/i18n/es/docusaurus-plugin-content-docs/current/` at the same path. Change both. Translated headings keep the English anchor (`## Alias por servicio y enlace {#per-service-aliases-and-linking}`), so links stay the same; Spanish pages link to the API reference by URL (`/docs/api`), since it exists only in English. A new page needs its translation; new texts on the home page go through `translate()` and get their Spanish in `docs/i18n/es/code.json`; sidebar, navbar and footer labels in the other JSON files there. Spanish of Spain, "tú", the RGPD's legal terms, and the project's vocabulary (librería, la CLI, alias, marcador, seudonimización, matchers).
- **The CLI's usage text** (`USAGE` in `src/cli.ts`): every command it implements, with its arguments.
- **`README.md`**: short on purpose (what it is, install, quick start, the essentials of safety, links to the site). Touch it only when the change matters at that level.
- **`.minispec/core/`** (for future Claude sessions): `architecture.md` when a module appears, moves or changes role; `glossary.md` for a new domain term; `project.md` when what the project does or its status changes; a new or updated ADR (`minispec-adr`) when a decision or rule changed. Respect MiniSpec's line limits.

## 4. Build the site

```
npm run docs:build
grep -rE "\| - \|$" docs/content/api
```

The build fails on a broken link or anchor; the grep must print nothing (every export documented). If `docs/node_modules` is missing, run `npm run docs:install` first. Fix the cause; never turn a check off.

## 5. Style and commit

- English, technical and concrete, following the `markdown-writing` rules: one line per paragraph and list item, no horizontal rules between sections.
- The documentation goes in the same commit as the change it describes (or right next to it, `docs: …`). When the change completes a MiniSpec feature or fix, its issue's closing comment mentions what was documented.

Report which pages and files you changed, or why none needed to.
