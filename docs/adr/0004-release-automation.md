# 0004. Automate versions and changelogs with release-please

- **Status:** Accepted
- **Date:** 2026-10-04
- **Deciders:** @Yabish
- **Issue / PR:** #56

## Context

Requirements (CLAUDE.md, SPEC §14):

- PRs are squash-merged into `develop` with Conventional Commit titles, enforced by the PR-title check.
- Releases happen per milestone (v0.1.0 at M3, v0.2.0 at M4, and so on) through a `develop` → `main` PR merged with a merge commit. `main` receives nothing else.
- One product version for the whole monorepo. Every workspace package is private, and nothing is published to npm.
- Versions and the changelog must come from Conventional Commits, not from extra files contributors have to write.
- Community and Enterprise code share the repository and one release.

Both candidates were checked on 2026-10-04: release-please 17.11.2 with release-please-action v5.0.0 (Apache-2.0), and @changesets/cli 3.0.3 with changesets/action v2.1.2 (MIT). Both are actively maintained.

## Decision

We use **release-please** with a single root package (`release-type: node`, tags `vX.Y.Z`). It runs in two modes from `.github/workflows/release.yml`:

1. **On push to `develop`:** it maintains one release PR, `chore(repo): release X.Y.Z`, that bumps the root `package.json`, `.release-please-manifest.json` and `CHANGELOG.md`. It does not tag (`skip-github-release`).
2. **On push to `main`:** after the release PR merges, it runs in release-only mode (`skip-github-pull-request`) with `target-branch: develop`. It finds the merged release PR by label, tags its merge commit and publishes the GitHub Release with the PR's notes.

Release procedure:

1. When a milestone with a release is complete, merge the open `chore(repo): release X.Y.Z` PR into `develop`. **Merge nothing else until step 2 is done**, so the tag matches what reaches `main`.
2. Open the release PR `develop` → `main`, titled `chore(repo): release vX.Y.Z`, and merge it with a merge commit.
3. The push to `main` creates tag `vX.Y.Z` and the GitHub Release. Image publishing (#104) triggers on that release.

Configuration choices:

- `initial-version: 0.1.0`. Without it, the first release would be 1.0.0, because release-please ignores `bump-minor-pre-major` when there is no previous release. The dry run showed this.
- `bump-minor-pre-major: true`. Before 1.0, features and breaking changes bump the minor version, matching v0.1 → v0.4 in SPEC §14. Use a `Release-As: X.Y.Z` commit footer to force a version.
- The changelog shows Features, Bug fixes, Performance and breaking changes. Other types are hidden.
- The workflow needs a **`RELEASE_PLEASE_TOKEN`** secret: a fine-grained PAT, or a GitHub App token, with contents, pull requests and issues write access on this repository. PRs opened with the default `GITHUB_TOKEN` don't trigger workflows, so the release PR could never pass its required checks. Without the secret the job logs a notice and skips.

## Consequences

- Version bumps and changelogs need no contributor effort. Commit-title discipline, already enforced in CI, is the only input.
- Squash titles are the changelog, which raises the bar for PR titles.
- The tag points at the release commit on `develop`, which is an ancestor of the `main` merge commit with the same tree if step 1's "merge nothing else" rule is followed.
- One version for everything. If packages are ever published separately, we would switch to release-please's manifest mode with components (ADR needed).

## Alternatives considered

- **changesets.** Excellent for publishing many npm packages with independent versions. But versions come from hand-written `.changeset/*.md` files, not from Conventional Commits; every PR needs one, or an empty one. Its release PR also merges to the base branch it runs on, which doesn't fit our `develop` → `main` release step. Rejected because it doesn't meet the "from Conventional Commits" requirement and adds per-PR friction.
- **release-please targeting `main`.** The release PR would merge straight into `main`, breaking the rule that `main` only receives release PRs from `develop`, and it would need a back-merge into `develop` every release. Rejected.
- **semantic-release.** It publishes on every push with no release PR to review, which conflicts with milestone-gated releases. Rejected.
- **A hand-written tagging script.** We'd have to maintain changelog generation ourselves. Rejected.
