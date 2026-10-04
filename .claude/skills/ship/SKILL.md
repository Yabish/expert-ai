---
name: ship
description: Finish and ship the current issue branch in the expert-ai task loop (CLAUDE.md steps 7–12). Verifies with exactly the checks the diff needs (integration, evals, pack evals, independent review), self-reviews, pushes, opens the PR from the template, updates labels, watches CI and fixes it, merges only when MERGE_POLICY=auto, and reports. Use when the implementation for an issue is done and it is time to verify, open or finish the PR.
argument-hint: '[base-branch]'
---

# Ship (task loop steps 7–12)

Follow CLAUDE.md strictly. It overrides anything here. The base branch is `$ARGUMENTS`, or `develop` if empty; for a stacked PR it's the parent PR's branch.

## Current state

!`git status --short --branch`

!`git log --oneline origin/develop..HEAD`

!`grep -E '^MERGE_POLICY=' CLAUDE.md || echo 'MERGE_POLICY not found in CLAUDE.md: treat as human'`

## 7. Verify

1. Get the plan for this diff:

   ```bash
   node scripts/gh/ship-plan.mjs --base origin/<base>
   ```

2. Always run `pnpm lint && pnpm typecheck && pnpm test && pnpm format:check`.
3. Run everything the plan lists:
   - **Integration tests:** `pnpm test:integration`, with the dev stack up via `docker compose -f docker/dev/compose.yml up -d`.
   - **Evals:** `pnpm evals -- --provider <id> --model <id>`, on `develop` and on this branch. Keep the before/after table for the PR.
   - **Pack evals:** `pnpm packs:eval -- --pack <id> --provider <id> --model <id>` for each listed pack (or every pack). Record English and Arabic accuracy before and after.
   - **Screenshots:** LTR (English) and RTL (Arabic).
4. Fix failures with new commits. If the same step fails three times, stop and ask (CLAUDE.md).

## 8. Self-review

1. Read `git diff origin/<base>...HEAD` in full, against CLAUDE.md and every acceptance criterion in the issue (`gh issue view N`). Check the Definition of Done:
   - no `any`;
   - no hard-coded UI strings or regional facts;
   - at least one Arabic acceptance criterion for user-facing work;
   - no Community → `ee/` imports;
   - pack facts verified on a running instance;
   - ADR for hard-to-reverse choices;
   - CLAUDE.md Commands section updated if scripts changed.
2. If the plan says **independent review**, launch a subagent to review the diff cold, with no access to my reasoning. Give it the issue, the diff and CLAUDE.md's security rules. Fix what it finds, and list the findings and fixes in the PR's Risks section.
3. If the plan says **edition: mixed**, split the PR, or justify in the PR why the Community change is an extension point.
4. Fix all findings before pushing.

## 9. Ship

1. `git push -u origin HEAD`.
2. Write the PR body to a temp file, following `.github/pull_request_template.md`:
   - Summary, and `Closes #N`;
   - Edition;
   - Changes, including new dependencies with version, license and reason;
   - How it was tested, with real commands and numbers;
   - Eval results (pack tables in English and Arabic when required);
   - Screenshots (LTR and RTL);
   - Risks;
   - the checklist;
   - for a stacked PR, "**Stacked on #M**: merge that first, then retarget to `develop`."

   End the body with the attribution line from the session instructions.

3. Create the PR:

   ```bash
   gh pr create --base <base> --title "<type>(<scope>): <summary>" --body-file <tmp> \
     --label <type:*> --label <area:*> --label edition:<edition>
   ```

   The title becomes the squash commit and must pass "Validate PR title": a CLAUDE.md type, and a scope from the CLAUDE.md list or `packs/<id>`.

4. `gh issue edit N --remove-label status:in-progress --add-label status:needs-review`
5. `gh pr checks --watch`

## 10. CI red

Read the failing log (`gh run view <id> --log-failed`), fix it on the same branch with new commits, push, and watch again. Never skip, disable or `--no-verify` a check.

## 11. Merge

Merge only if CLAUDE.md says `MERGE_POLICY=auto` **and** all checks are green **and** the self-review is clean:

```bash
gh pr merge --squash --delete-branch
```

With `MERGE_POLICY=human`, never merge on your own initiative. Merge only when the maintainer explicitly asks in the conversation.

## 12. Report

Tell the maintainer, briefly:

- the issue;
- the PR link and check status;
- what changed;
- eval deltas, if any;
- anything they need to decide or do.

Then return to the `next-task` skill.
