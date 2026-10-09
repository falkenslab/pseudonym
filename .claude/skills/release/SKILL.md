---
name: release
description: Cut a new pseudonym release - decide the semver bump (patch vs minor) from the commits since the last tag, bump the version, commit, tag, push, create the GitHub release and publish to npm as @falkenslab/pseudonym. Only when the user explicitly asks to release or publish.
disable-model-invocation: true
---

# Release pseudonym

A release is a version commit, a `vX.Y.Z` git tag on `main`, a GitHub release with its notes, and the same version published to npm as `@falkenslab/pseudonym`. Callers install it with `npm install @falkenslab/pseudonym`.

## 1. Preconditions

- The repo has a GitHub remote (`git remote -v`). If it has none, stop and tell the user: creating the repository is their call.
- On branch `main`, working tree clean (`git status --short` empty), up to date with `origin/main` (`git fetch && git status -sb`). If there are uncommitted changes, stop and ask (or use the `commit` skill first if the user wants them included).
- Run the `verify` skill; a release must be green.
- `gh auth status` works.
- `npm whoami` works (logged in to npm with an account in the `falkenslab` organization). If it doesn't, stop and ask the user to run `npm login` themselves: it's interactive.
- `package.json` has `"publishConfig": { "access": "public" }` (a scoped package is private by default) and a `prepublishOnly` script running `npm run typecheck && npm run lint && npm test` (`prepare` already builds). If either is missing, add it with the `commit` skill (`build: ...`) before going on.
- **The documentation is up to date.** Every change since the last tag that a caller or the person running the CLI would notice must be in the README, the CLI's usage text and the doc comments. Read `git log <last tag>..HEAD` and `git diff <last tag>..HEAD -- src/index.ts src/cli.ts`, run the `update-docs` skill if anything is missing, and commit it.

## 2. Decide the bump

Find the last tag: `git describe --tags --abbrev=0`. Read `git log <tag>..HEAD --format=%s`.

**First release** (no tag yet): release the version already in `package.json` without bumping it, and confirm it with the user first.

While the version is `0.x` (current policy):

- **minor** (`0.1.1 -> 0.2.0`): any `feat`, or any breaking change (`!` in a subject / `BREAKING` in a body). In `0.x`, breaking changes bump minor, not major.
- **patch** (`0.1.0 -> 0.1.1`): only `fix`, `docs`, `refactor`, `chore`, `build`, `test` with no API change.
- **major**: only when the user decides to declare `1.0.0`. After `1.0.0`: breaking = major, feature = minor, fix = patch.

A change that makes aliases computed by an older version differ, or an older directory unreadable, is breaking whatever its commit says: callers would see different aliases for the same people. Point it out and confirm before releasing.

If nothing but `docs`/`chore` changed since the last tag, tell the user a release may not be worthwhile and confirm before continuing. State the chosen bump and why; if it is ambiguous, ask.

## 3. Bump

```
npm version <patch|minor|major> --no-git-tag-version
```

This updates `package.json` and `package-lock.json`. `grep -rn "<old version>" README.md src` in case a version slipped in elsewhere.

Then snapshot the documentation for this version (the site shows the latest released version by default, and keeps each release's documentation; `main` stays at `/docs/next`):

```
npm run docs:version -- X.Y.Z
npm run docs:build
```

This copies `docs/content/` (the generated API reference included) to `docs/versioned_docs/version-X.Y.Z/` and adds the version to `docs/versions.json`. The build must pass.

## 3b. Notes

Draft the release notes in English from the commits since the last tag, grouped as: new features, fixes, breaking changes (with migration hints), internal. Only include what matters to a caller of the library or to the person running the CLI.

## 4. Commit, tag, push, publish

```
git add package.json package-lock.json docs/versioned_docs docs/versioned_sidebars docs/versions.json
git commit -m "chore(release): vX.Y.Z"   # plus the attribution trailer required by the session
git tag vX.Y.Z
git push origin main
git push origin vX.Y.Z
gh release create vX.Y.Z --verify-tag --title "vX.Y.Z" --notes "<notes>"
npm publish
```

`npm publish` runs `prepublishOnly` and `prepare` (the build) first. Check `npm pack --dry-run` beforehand if `files` or the build changed: the tarball must hold `dist/` (with `cli.js` and the `.d.ts` files) and nothing else but the README, the license and `package.json`. If the account has two-factor authentication, it asks for a one-time code: ask the user for it and run `npm publish --otp=<code>`. A published version can't be reused; if something is wrong after publishing, fix it with a new patch release.

If the owner prefers to publish to npm themselves (as for 0.1.0), do everything else and hand them the exact command (`npm publish` from the repo root, on `main`, clean). A new version can take several minutes to appear in the registry (`npm view` gave 404 for a while after 0.1.0 was published): wait and check again before concluding it failed.

Tags in this repo are lightweight (`git tag vX.Y.Z`). Never move or delete an existing tag, and never force-push. If a step fails half-way, report the exact state (what is pushed, what is published, what is not) instead of retrying blindly.

## 5. Verify the release

- `git ls-remote --tags origin` shows the tag on the release commit.
- `gh release view vX.Y.Z` works.
- `npm view @falkenslab/pseudonym version` shows the new version.
- Prove the install path in a scratch directory (the session scratchpad, not the repo): `npm install @falkenslab/pseudonym@X.Y.Z`, then check that `node_modules/@falkenslab/pseudonym/dist/index.js` and `node_modules/.bin/pseudonym` exist, and that importing the library with a temporary `PSEUDONYM_HOME` works (`remember`, `resolve`, `redact`). Don't run the `pseudonym` command yourself: the owner's client denies it to agents, and getting around the rule with another spelling is exactly what it's there to stop. Ask the owner to run `npx @falkenslab/pseudonym help`.
- The documentation workflow ran for the release commit (`gh run list --workflow docs.yml --limit 1`) and https://falkenslab.github.io/pseudonym/docs shows the new version in the version selector.

Report the version, the tag, the release URL, the npm package page and the notes you published. Mention that callers pinned to an older version (`moodle-mcp` first) must bump their dependency themselves.
