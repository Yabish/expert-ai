---
name: next-task
description: Start the next issue in the expert-ai task loop (CLAUDE.md steps 1–5). Syncs develop, handles review comments on open PRs first, picks the highest-priority unblocked issue in the earliest open milestone (or the issue passed as an argument), claims it, posts an implementation plan, and creates the linked branch. Use when asked to start, pick or continue the next task or issue.
argument-hint: '[issue-number]'
---

# Next task (task loop steps 1–5)

Follow CLAUDE.md strictly. It overrides anything here. Requested issue, if any: `$ARGUMENTS`

## Current state

!`git status --short --branch`

!`gh pr list --author @me --state open --json number,title,reviewDecision,headRefName --jq '.[] | "#\(.number) [\(.reviewDecision // "NO_REVIEW")] \(.headRefName): \(.title)"' || true`

## 1. Sync

1. If the working tree has uncommitted changes, stop and ask what to do with them. Never stash or discard someone's work silently.
2. `git switch develop && git pull --ff-only`.
3. For each open PR of mine with requested changes or unresolved review comments, address those first: reply to each comment with what changed, push, and re-run checks. Only then continue.

## 2. Pick

If `$ARGUMENTS` names an issue, use it, but still check its dependencies and milestone.

Otherwise run:

```bash
node scripts/gh/next-task.mjs
```

The script applies CLAUDE.md's picking rules:

- earliest open milestone first;
- skip epics, assigned issues and `status:blocked`;
- resolve every `Blocked by #N`;
- refuse M6 before v0.2.0 ships (rule 13).

It ranks by priority, then issues that need no stacking, then issue number. Take the first candidate unless there is a clear reason not to, and say what the reason is.

- **Stacked candidate** (`stack on <branch>`): its dependency is still in an open PR. Branch from that PR's branch, set the new PR's base to it, and write "Stacked on #N" in the PR body.
- **No candidates:** report what blocks each issue (the script lists reasons) and stop.

## 3. Claim

```bash
gh issue edit N --add-assignee @me --add-label status:in-progress
```

## 4. Plan

1. Read the issue (`gh issue view N`) and **every SPEC section it references** in `docs/SPEC.md`. Read the relevant ADRs in `docs/adr/`.
2. **Stop and ask the maintainer** instead of guessing when:
   - the acceptance criteria are ambiguous or conflict with the SPEC;
   - the edition is unclear, or the work would move functionality between Community and Enterprise;
   - a pack fact can't be verified against a running ERP instance;
   - a security trade-off is involved (guard, auth, encryption, SSRF, license keys).
3. Post a short plan (5–10 lines: approach, files, how it will be tested, new dependencies with justification):

   ```bash
   gh issue comment N --body-file -
   ```

## 5. Branch

Get the branch type from the issue's `type:*` label: `feature`→`feat`, `bug`→`fix`, and other types map to the same name. Then:

```bash
gh issue develop N --base <develop-or-stack-branch> --name <type>/N-<short-slug> --checkout
```

Report one status line to the user ("Starting #N (title) · stacked on #M or no blockers"), then build the task (step 6). When it's built, use the `ship` skill.
