# CLAUDE.md

**The AI data analyst that already understands your ERP, in Arabic and English.** An open-core, self-hostable Next.js app. It connects read-only to Odoo, ERPNext and custom retail databases, applies prebuilt domain packs so answers are correct from day one, and returns safe queries, analysis, charts and recommendations, exportable to Excel and PDF. Users bring any AI provider (cloud, Chinese or local).

Our differentiation is three pillars: **ERP-native** (domain packs), **Arabic and GCC-native** (Hijri, VAT, RTL), and **private by design** (local models, read-only, on-prem). When choosing between building breadth and deepening a pillar, deepen the pillar (SPEC §1–§2).

- **What to build:** `docs/SPEC.md`. Read the sections an issue references before starting it.
- **Decisions:** `docs/adr/NNNN-title.md`. Write an ADR for any choice that is hard to reverse (library, schema, protocol).

## Project settings

```
DEFAULT_BRANCH=develop      # integration branch; all PRs target it
RELEASE_BRANCH=main         # only receives release PRs from develop
MERGE_POLICY=human          # human | auto   (auto = squash-merge own PR once CI is green and self-review passes)
PACKAGE_MANAGER=pnpm
```

## Commands

Keep this section accurate. Update it in the same PR that changes a script.

```
pnpm install                      # Node 24 LTS (.nvmrc), pnpm 12
pnpm build                        # turbo: builds every package to dist/
pnpm dev                          # web app
pnpm lint && pnpm typecheck       # must pass before every commit
pnpm format                       # prettier (format:check in CI)
pnpm test                         # unit tests (vitest)
pnpm test:integration             # needs docker dev stack
pnpm evals -- --provider <id> --model <id>
pnpm packs:eval -- --pack odoo --provider <id> --model <id>
docker compose -f docker/dev/compose.yml up -d                  # Postgres, MariaDB, SQL Server + retail seed
docker compose -f docker/dev/compose.yml --profile erp up -d    # + Odoo and ERPNext demo instances
```

## Non-negotiable engineering rules

1. **Read-only is sacred.** Every query goes through `packages/query-guard` before any connector executes it. Connectors never accept unguarded input. Never weaken a guard rule to make a test pass.
2. **No raw result sets to the LLM.** Data reaches prompts only through the profiler, respecting the connection's privacy mode.
3. **Vendor SDKs live only in `packages/providers`.** Core code talks to the provider abstraction.
4. **Never write provider base URLs, model IDs, package names or API shapes from memory.** Verify them in official docs (web fetch) and record `docsUrl` and `lastVerified` in the catalog entry.
5. **Framework-free packages.** Nothing under `packages/` imports Next.js. `apps/web` stays thin.
6. **Validate every boundary with Zod:** HTTP input, tool arguments, LLM structured output, config files and catalog entries.
7. **Secrets:** never log, commit or return them to the client after save. Never read or print `.env*` contents in a session; use `.env.example`.
8. **Dependencies:** use current stable versions (check with `pnpm view <pkg> version`). Before adding one, check maintenance, license compatibility and size, and justify it in the PR body.
9. **i18n from day one:** no hard-coded UI strings; every layout must work in RTL. Every user-facing feature has at least one Arabic acceptance criterion.
10. **Open-core boundary.** Community code (`apps/`, `packages/`, `packs/`) must never import from `ee/` or `packs-ee/`; a lint rule enforces this. Enterprise features attach through extension points (plugin registry, storage hooks, auth strategies, pack loader). Without a license key, everything Community still works.
11. **Domain packs are data, and their facts are verified.** Packs contain YAML only, never code. Every table, column, state value or module name in a pack must be confirmed against a running instance of that ERP version in the dev stack (`--profile erp`), never written from memory. Pack changes must pass that pack's golden evals.
12. **Pack metrics win.** If a question maps to a pack metric, the agent composes from the metric's template. Never add agent logic that bypasses a pack definition.
13. **Scope discipline.** Build only what the current milestone needs (SPEC §14). Oracle, MongoDB, SQLite and cloud-native provider auth are M6 work and must not be started before v0.2.0 ships. Put out-of-milestone ideas in a backlog issue instead.
14. **No hard-coded regional facts.** VAT rates, currencies, weekends and holidays come from ERP configuration or the versioned events calendar, never from constants.

## Code conventions

- TypeScript `strict`, no `any` (use `unknown` and narrow), ESM, named exports.
- Errors: typed error classes with a stable `code`. Never swallow errors; never throw strings.
- Tests are colocated (`*.test.ts`). Every bug fix starts with a failing test.
- Small modules with clear names. Comments explain _why_, not _what_.

## Git and GitHub workflow

### Branches

- `main` holds releases only. `develop` is the default branch and integration target. Never commit directly to either (the one exception is the repository's initial commit).
- One issue → one branch → one PR. Name branches `<type>/<issue#>-<short-slug>`, e.g. `feat/42-odoo-net-revenue`, `fix/57-guard-cte-bypass`.
- Types: `feat`, `fix`, `refactor`, `perf`, `test`, `docs`, `chore`, `ci`, `build`.

### Commits (Conventional Commits)

```
<type>(<scope>): <imperative summary, ≤72 chars, no trailing period>

<body: what changed and WHY, wrapped at 72. Mention trade-offs,
alternatives rejected, and anything a reviewer must know.>

Refs #<issue>
```

- The scope is the package or area: `core`, `connectors`, `guard`, `providers`, `knowledge`, `packs`, `calendar`, `storage`, `charts`, `exporters`, `web`, `i18n`, `evals`, `ee`, `repo`, `ci`. For pack changes, name the pack: `packs/odoo`, `packs/erpnext`.
- Make small logical commits. Each commit builds and passes lint and typecheck.
- Use a body for anything non-trivial. No "wip", "fix stuff", or "update files".
- Breaking change: add `!` after the scope and a `BREAKING CHANGE:` footer.

Example:

```
feat(packs/odoo): define net revenue from posted invoices and refunds

Revenue now comes from posted customer invoices minus posted credit
notes instead of confirmed sale orders. Orders include unbilled and
later-cancelled amounts, which overstated revenue on the demo DB.

"sales" is added to ambiguities.yaml, so the analyst asks whether the
user means confirmed orders or invoiced revenue. Adds 6 golden
questions (3 Arabic); pack accuracy 81% -> 88% on the reference model.

Refs #42
```

### Pull requests

- Base: `develop`. The title is a Conventional Commit line, because it becomes the squash commit.
- Fill in `.github/pull_request_template.md`: Summary, `Closes #N`, Edition (Community / Enterprise), Changes, How it was tested, Eval results (required if prompts, retrieval, the agent or a pack changed; pack PRs show that pack's golden accuracy before and after, in English and Arabic), Screenshots (UI, in LTR and RTL), Risks, and the checklist.
- `Closes #N` auto-closes issues only because `develop` is the default branch. Do not change that.
- Keep PRs reviewable (target under ~400 changed lines excluding generated files and fixtures). Split larger work.
- Merge strategy: squash into `develop`. Release PRs `develop` → `main` use a merge commit.

### Issues

- Every task is an issue with Context, Goal, testable Acceptance criteria (checkboxes), Out of scope, `SPEC §` references, Dependencies (`Blocked by #N`), and Size.
- Labels: `type:*`, `area:*`, `edition:community|enterprise`, `pillar:erp|gcc|privacy` (when the work advances a pillar), `priority:p0–p3`, `size:S|M|L`, `status:in-progress|blocked|needs-review`. A `size:L` issue must be split before work starts.
- Every task belongs to a milestone (M0–M6) and is listed in its epic's task list.
- If you discover new work, open a new issue and link it. Never expand scope silently.

### Never

- Force-push to `develop` or `main`, or rewrite history on a pushed branch another PR depends on.
- Disable or skip CI checks or tests, or use `--no-verify`.
- Merge a PR with failing checks, or merge anything when `MERGE_POLICY=human`.
- Close an issue whose acceptance criteria are not all met.

## Standard task loop

1. **Sync:** `git switch develop && git pull --ff-only`. Check `gh pr list --author @me --state open` and address review comments on open PRs before starting new work.
2. **Pick:** the highest-priority open, unassigned, unblocked issue in the earliest open milestone (`gh issue list --milestone "<M>" --label "priority:p0" --state open`). Prefer issues that don't depend on unmerged PRs. If a dependency is unavoidable, branch from that PR's branch, set the new PR's base to it, and note "Stacked on #N" in the body.
3. **Claim:** `gh issue edit N --add-assignee @me --add-label status:in-progress`.
4. **Plan:** read the issue and the referenced SPEC sections. Post a short implementation plan as an issue comment (`gh issue comment N --body-file -`). If the acceptance criteria are ambiguous, ask me instead of guessing.
5. **Branch:** `gh issue develop N --base develop --name <type>/N-<slug> --checkout`, which links the branch to the issue.
6. **Build:** tests first where practical, then implementation. Commit in logical steps following the commit convention.
7. **Verify:** lint, typecheck, unit tests, and integration tests if connectors, guard or storage were touched. Run evals if prompts, retrieval or the agent changed; run `pnpm packs:eval` for every affected pack if a pack, the pack loader or the agent changed.
8. **Self-review:** review `git diff develop...HEAD` against this file and the acceptance criteria (use a subagent for an independent review on anything touching the guard, auth or secrets). Fix findings.
9. **Ship:** `git push -u origin HEAD`, then `gh pr create --base develop --title "<conventional title>" --body-file <tmp>`. Move the issue label to `status:needs-review`, then run `gh pr checks --watch`.
10. **CI red?** Fix it on the same branch with new commits.
11. **Merge:** only if `MERGE_POLICY=auto`: `gh pr merge --squash --delete-branch` after green CI. Otherwise report the PR link and go to step 1.
12. **Report:** give me a brief summary: issue, PR link, what changed, anything I should decide.

## Definition of Done

- [ ] All acceptance criteria met and checked in the issue
- [ ] Lint, typecheck and tests pass locally and in CI
- [ ] New logic has tests; guard changes include adversarial fixtures
- [ ] No new `any`, no hard-coded UI strings, RTL checked for UI work, Arabic acceptance criterion met
- [ ] No Community → `ee/` imports; edition label correct
- [ ] Pack facts verified against a running ERP instance; golden questions added for new metrics (English and Arabic)
- [ ] Docs updated (README, `docs/`, this file's Commands section if scripts changed)
- [ ] ADR added for hard-to-reverse decisions
- [ ] PR description complete; eval summary included where required

## When to stop and ask me

- The spec is ambiguous or conflicts with an issue.
- A security-relevant trade-off is involved (guard rules, auth, encryption, SSRF policy, license-key verification).
- A feature's edition is unclear, or a change would move functionality between Community and Enterprise.
- A pack fact can't be verified against a running instance (e.g. a localization module isn't in the dev stack).
- You would add a heavy dependency, change a public interface, or change the DB schema of a released version.
- The same step has failed three times.

Otherwise, make a reasonable decision, record it in the PR body (or an ADR), and keep going.
