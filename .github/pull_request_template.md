<!-- Title: a Conventional Commit line, e.g. "feat(connectors): add Oracle connector". It becomes the squash commit. -->

## Summary

<!-- What changed and why, in a few sentences. -->

Closes #

## Changes

-

## How it was tested

<!-- Commands run, new tests, manual checks. Include integration tests if connectors, guard or storage changed. -->

## Eval results

<!-- Required if prompts, retrieval or the agent changed: before/after table from `pnpm evals`. Otherwise "Not applicable". -->

## Screenshots

<!-- UI changes: light and dark, English (LTR) and Arabic (RTL). Otherwise "Not applicable". -->

## Risks

<!-- What could break, security considerations, migration or rollback notes. New dependencies: justify maintenance, license and size. -->

## Checklist

- [ ] All acceptance criteria are met and checked in the issue
- [ ] `pnpm lint && pnpm typecheck && pnpm test` pass locally
- [ ] New logic has tests; guard changes include adversarial fixtures
- [ ] No new `any`, no hard-coded UI strings, RTL checked for UI work
- [ ] Docs updated (README, `docs/`, CLAUDE.md Commands if scripts changed)
- [ ] ADR added for hard-to-reverse decisions
- [ ] No secrets, `.env*` contents or real data in code, logs or this PR
