# Backlog

> **Status: approved 2026-10-04 (re-plan for the 2026-10-03 spec revision, #169) and synced to GitHub.**
> `scripts/gh/sync-backlog.mjs` turns this file into GitHub issues. After sync, GitHub issues are the source of truth.

## Format (parsed by `scripts/gh/sync-backlog.mjs`)

- `## Mx Name`: a milestone. Each milestone has one **milestone epic** (`[Ex]`) that lists its capability epics.
- `### [Ex.y] Title`: a capability epic. Its task list is generated from the tasks under it.
- `#### [Tx.y] Title`: a task. Fields: **Issue** (an existing issue this item reuses), **Labels**, **SPEC**, **Depends on** (IDs, resolved to `#N`), **Goal**, **Acceptance**, **Out of scope**.
- IDs are backlog keys stored in each issue body as `<!-- backlog-id: … -->`. Titles stay free of IDs.

Label key: `type:*` · `area:*` · `edition:community|enterprise` (every task) · `pillar:erp|gcc|privacy` (when the work advances a pillar) · `priority:p0` (blocks the milestone) → `p3` · `size:S` (≤ half a day) / `size:M` (≤ one focused day).

## Planning decisions

Approved 2026-10-01 and still valid:

1. Shared contracts live in `packages/contracts` (avoids a core ↔ guard cycle); T1.1 adds the ADR and the SPEC §13.1 layout row.
2. The retail dataset generator is a private workspace package at `tools/sample-data`.
3. The Lite audit sink (JSONL or stdout) ships with Lite (M3) because v0.1 executes queries (SPEC §12, §13.2).

New for this re-plan (2026-10-03):

4. **Wedge-first.** Breadth items (Oracle, MongoDB, SQLite, cloud-native auth, other native SDKs, dashboards) sit in M6 and must not start before v0.2.0 (CLAUDE.md rule 13).
5. **Issue reuse.** Every existing issue is reused (re-titled, re-scoped, re-labelled and moved to its new milestone) rather than closed and recreated, so links and history survive. No issue is closed by this re-plan.
6. **Data profiling and freshness move to M3** (from the old M5), because the v0.1 conversation overview and caveats need date coverage and freshness (SPEC §4.3).
7. **VAT metrics are M3**, per SPEC §14. M2 Odoo and ERPNext accounting covers revenue and receivables; VAT builds on it.
8. **ZATCA metrics are p2 in M3, behind a verification spike.** They depend on a localization module being in the dev stack, which is a CLAUDE.md stop-and-ask condition if it can't be installed.
9. **Retail seed in SQL Server and also in Postgres and MariaDB.** SQL Server holds the eval dataset (SPEC §13.3). Postgres and MariaDB get the same data, so connector integration tests run on every PR without the heavy ERP profile.
10. **Capability probe and cost tracking move to M4** (provider UI and app DB); retries and fallback stay in M6.
11. **Extension points are Community.** The plugin registry and hooks (T5.1) are open source; only the features that plug into them are Enterprise (SPEC §3.2).

---

## M0 Foundation

### [E0] M0 Foundation

- **Issue:** #1
- **Labels:** type:epic, edition:community, priority:p0
- **Goal:** Monorepo, tooling, CI, GitHub templates and labels, CLA bot, licensing ADR, `ee/` boundary lint rule, and the dev stack (Postgres, MariaDB, SQL Server, Odoo and ERPNext demo instances, retail seed).

### [E0.1] Repository scaffold and shared presets

- **Issue:** #2
- **Labels:** type:epic, area:repo, edition:community, priority:p0
- **Goal:** A pnpm + Turborepo monorepo with the SPEC §13.1 layout and shared presets that enforce CLAUDE.md rules mechanically.

#### [T0.1] GitHub automation scripts: labels, milestones and backlog sync

- **Issue:** #41
- **Labels:** type:chore, area:repo, edition:community, priority:p0, size:M
- **SPEC:** §14
- **Depends on:** none
- **Goal:** Idempotent scripts for labels, milestones and backlog sync, including re-plans of existing issues.
- **Acceptance:**
  - [ ] `scripts/gh/labels.sh` creates or updates every `type:*`, `area:*`, `edition:*`, `pillar:*`, `priority:*`, `size:*`, `status:*`, `ci:packs` and `ci:oracle` label; a second run makes no changes
  - [ ] `scripts/gh/milestones.sh` creates or renames M0–M6 to the SPEC §14 names and scope; a second run makes no changes
  - [ ] `scripts/gh/sync-backlog.mjs` creates epics, then tasks, resolves dependencies to `#N`, writes epic task lists, and skips existing titles
  - [ ] `--update` re-applies title, body, labels and milestone to issues matched by `Issue` or backlog id (used for approved re-plans only)
  - [ ] The parser rejects tasks without exactly one `edition:*` label
  - [ ] `--dry-run` everywhere; parser unit tests against a fixture backlog
- **Out of scope:** GitHub Projects boards.

#### [T0.2] Monorepo scaffold: pnpm workspaces, Turborepo and package layout

- **Issue:** #42
- **Labels:** type:build, area:repo, edition:community, priority:p0, size:M
- **SPEC:** §13.1
- **Depends on:** none
- **Goal:** The workspace builds end to end with an empty package per SPEC §13.1 package entry.
- **Acceptance:**
  - [ ] `pnpm-workspace.yaml`, `turbo.json`, and root scripts `build`, `dev`, `lint`, `typecheck`, `test`, `test:integration`, `format`
  - [ ] One package per SPEC §13.1 `packages/*` entry, including `packages/calendar`, plus a placeholder `apps/web`; each ESM with named exports and a trivial passing test
  - [ ] `.nvmrc` pins Node 24 LTS; `engines` and `packageManager` set
  - [ ] `pnpm install && pnpm build && pnpm typecheck && pnpm test` pass from a clean clone
  - [ ] CLAUDE.md Commands section matches the real scripts
- **Out of scope:** `packs/`, `ee/` and `packs-ee/` content (T0.20, M2); presets (T0.3).

#### [T0.3] Shared presets: tsconfig, ESLint, Prettier and Vitest

- **Issue:** #43
- **Labels:** type:build, area:repo, edition:community, priority:p0, size:M
- **SPEC:** §13.1
- **Depends on:** T0.2
- **Goal:** `packages/config` provides the presets every package extends.
- **Acceptance:**
  - [ ] tsconfig base is `strict` with `noUncheckedIndexedAccess`
  - [ ] ESLint flat config bans `any` and floating promises and requires named exports
  - [ ] Prettier config and `.prettierignore`; the repo is formatted in one commit; `format:check` passes
  - [ ] Vitest preset with v8 coverage and per-package thresholds
- **Out of scope:** boundary rules (T0.4, T0.21).

#### [T0.4] Lint rules that enforce architecture boundaries

- **Issue:** #44
- **Labels:** type:build, area:repo, edition:community, priority:p1, size:S
- **SPEC:** §2, §13.1
- **Depends on:** T0.3
- **Goal:** CLAUDE.md rules 3 and 5 fail lint when broken.
- **Acceptance:**
  - [ ] Importing `next` under `packages/` fails lint
  - [ ] Importing vendor AI SDKs outside `packages/providers` fails lint
  - [ ] Importing DB drivers outside `packages/connectors` (and `packages/storage` for the app DB) fails lint
  - [ ] Fixture files prove each rule fires
- **Out of scope:** the open-core boundary (T0.21).

### [E0.2] GitHub hygiene

- **Issue:** #3
- **Labels:** type:epic, area:repo, edition:community, priority:p0
- **Goal:** Issue forms, PR template and community docs that match the open-core working agreement.

#### [T0.5] Issue forms and pull request template

- **Issue:** #45
- **Labels:** type:chore, area:repo, edition:community, priority:p0, size:S
- **SPEC:** §3, §14
- **Depends on:** none
- **Goal:** Issue forms and a PR template that match CLAUDE.md.
- **Acceptance:**
  - [ ] `feature.yml`, `bug.yml` and `task.yml`; task form has Context, Goal, Acceptance (with an Arabic criterion prompt for user-facing work), Out of scope, SPEC §, Dependencies, Size, Edition and Pillar
  - [ ] `config.yml` disables blank issues and links to private vulnerability reporting
  - [ ] PR template has Summary, `Closes #`, Edition, Changes, How it was tested, Eval results (pack accuracy before and after in English and Arabic), Screenshots (LTR and RTL), Risks and the Definition of Done checklist
- **Out of scope:** discussion templates.

#### [T0.6] CONTRIBUTING, SECURITY and CODE_OF_CONDUCT

- **Issue:** #46
- **Labels:** type:docs, area:repo, edition:community, priority:p1, size:S
- **SPEC:** §3.2, §13.2
- **Depends on:** T0.5, T0.22
- **Goal:** Community health files for an open-core project.
- **Acceptance:**
  - [ ] `CONTRIBUTING.md`: setup, conventions, task loop, CLA, editions and the `ee/` boundary, and how to contribute a pack (verified facts plus golden questions)
  - [ ] `SECURITY.md`: private reporting via GitHub Security Advisories, scope and response targets
  - [ ] `CODE_OF_CONDUCT.md`: Contributor Covenant (current version, verified) with a contact
  - [ ] Private vulnerability reporting enabled on the repo
- **Out of scope:** governance model.

### [E0.3] Continuous integration

- **Issue:** #4
- **Labels:** type:epic, area:ci, edition:community, priority:p0
- **Goal:** Every PR runs lint, typecheck, unit and integration tests and security scanning; `develop` and `main` require them.

#### [T0.7] CI workflow: lint, typecheck, unit tests and PR title check

- **Issue:** #47
- **Labels:** type:ci, area:ci, edition:community, priority:p0, size:M
- **SPEC:** §13.3
- **Depends on:** T0.3
- **Goal:** Fast required checks on every PR.
- **Acceptance:**
  - [ ] `.github/workflows/ci.yml` on PRs and pushes to `develop` and `main`: install (cached), lint, format check, typecheck, unit tests with coverage via Turborepo
  - [ ] PR title validated as a Conventional Commit with the CLAUDE.md types and scopes (including `packs/<id>`)
  - [ ] Actions pinned to SHAs; minimal `permissions`
  - [ ] Branch protection on `develop` and `main` requires these checks
- **Out of scope:** integration tests (T0.8), releases (T0.19).

#### [T0.8] Integration and pack-eval job skeletons

- **Issue:** #48
- **Labels:** type:ci, area:ci, edition:community, priority:p1, size:S
- **SPEC:** §13.3
- **Depends on:** T0.7, T0.13
- **Goal:** Job skeletons that later connector and pack PRs only extend.
- **Acceptance:**
  - [ ] `integration` job with Postgres, MariaDB and SQL Server service containers, seeded with the retail dataset; `pnpm test:integration` runs
  - [ ] A nightly and `ci:packs`-label workflow skeleton for pack evals against the ERP demo instances
- **Out of scope:** Oracle and MongoDB jobs (M6).

#### [T0.9] Dependency and secret scanning

- **Issue:** #49
- **Labels:** type:ci, area:security, edition:community, pillar:privacy, priority:p0, size:S
- **SPEC:** §13.2
- **Depends on:** T0.7
- **Goal:** Vulnerable dependencies and leaked secrets are caught on every PR.
- **Acceptance:**
  - [ ] Dependabot or Renovate (choice justified) for npm, Actions and Docker, targeting `develop`
  - [ ] Dependency review fails on high-severity vulnerabilities or licenses incompatible with AGPL-3.0
  - [ ] Secret scanning in CI, plus GitHub secret scanning with push protection
  - [ ] CodeQL for JavaScript/TypeScript
- **Out of scope:** SBOM publishing.

### [E0.4] Dev stack: databases, ERP demo instances and retail seed

- **Issue:** #5
- **Labels:** type:epic, area:docker, edition:community, priority:p0
- **Goal:** One command starts the v0.1 databases with the retail seed; an `erp` profile adds Odoo and ERPNext demo instances with demo data.

#### [T0.10] Docker dev compose: PostgreSQL, MariaDB and SQL Server

- **Issue:** #50
- **Labels:** type:build, area:docker, edition:community, priority:p0, size:M
- **SPEC:** §7.2, §13.3
- **Depends on:** none
- **Goal:** `docker compose -f docker/dev/compose.yml up -d` starts the v0.1 sources.
- **Acceptance:**
  - [ ] Postgres, MariaDB and SQL Server with health checks, named volumes, `127.0.0.1` ports and pinned tags (verified current)
  - [ ] Each gets an owner user and a least-privilege read-only user via init scripts; read-only users verified unable to write
  - [ ] Credentials only in `docker/dev/.env.example`; compose fails fast without `.env`
  - [ ] README documents ports, users, memory needs, per-service startup and Apple Silicon notes
- **Out of scope:** MySQL, Oracle and MongoDB (M6); ERP instances (T0.14, T0.15).

#### [T0.11] Synthetic retail dataset generator

- **Issue:** #51
- **Labels:** type:feature, area:docker, edition:community, pillar:gcc, priority:p0, size:M
- **SPEC:** §13.3
- **Depends on:** T0.2
- **Goal:** A deterministic generator in `tools/sample-data` for the retail dataset used by tests, evals and the pack builder.
- **Acceptance:**
  - [ ] Stores, products, categories, customers (mixed Arabic and English names), orders, order lines, returns, inventory and promotions over 2 years spanning two Ramadans
  - [ ] Ramadan and Eid seasonality, White Friday and National Day spikes, with event dates taken from the events-calendar data source rather than hard-coded
  - [ ] Same seed gives byte-identical output; size configurable (small for CI)
  - [ ] Dialect-neutral intermediate output; unit tests for determinism and referential integrity
- **Out of scope:** loading into databases.

#### [T0.12] Retail seeder for SQL Server

- **Issue:** #52
- **Labels:** type:feature, area:docker, edition:community, priority:p0, size:M
- **SPEC:** §13.3
- **Depends on:** T0.10, T0.11
- **Goal:** `pnpm db:seed --target mssql` loads the eval dataset into SQL Server.
- **Acceptance:**
  - [ ] DDL with PKs, FKs, indexes and one intentionally undeclared logical join, styled like a custom POS schema
  - [ ] NVARCHAR for Arabic text; Arabic names round-trip (tested)
  - [ ] Idempotent drop and reload; SELECT granted to the read-only user
- **Out of scope:** Postgres and MariaDB (T0.13).

#### [T0.13] Retail seeder for PostgreSQL and MariaDB

- **Issue:** #53
- **Labels:** type:feature, area:docker, edition:community, priority:p1, size:S
- **SPEC:** §13.3
- **Depends on:** T0.12
- **Goal:** The same dataset in Postgres and MariaDB for connector integration tests.
- **Acceptance:**
  - [ ] `--target pg|mariadb`; row counts match SQL Server (tested)
  - [ ] Idempotent; read-only users can select
- **Out of scope:** none.

#### [T0.14] Odoo demo instance with demo data (`erp` profile)

- **Labels:** type:build, area:docker, edition:community, pillar:erp, priority:p0, size:M
- **SPEC:** §5.3, §5.5, §13.3
- **Depends on:** T0.10
- **Goal:** A reproducible Odoo instance with demo data for pack development and evals.
- **Acceptance:**
  - [ ] Official Odoo image and current major version verified in official docs (link and date in the PR)
  - [ ] Starts under `--profile erp` with its own Postgres; installs Sales, Invoicing/Accounting, Inventory, Purchase and Point of Sale with demo data, scripted and idempotent
  - [ ] Documented UI login for exploring data, and the exact versions recorded for pack `appliesTo`
- **Out of scope:** localization modules (T3.28).

#### [T0.15] ERPNext demo instance with demo data (`erp` profile)

- **Labels:** type:build, area:docker, edition:community, pillar:erp, priority:p0, size:M
- **SPEC:** §5.3, §5.5, §13.3
- **Depends on:** T0.10
- **Goal:** A reproducible ERPNext instance with demo data.
- **Acceptance:**
  - [ ] Official Frappe/ERPNext images and the supported compose approach verified in official docs (link and date)
  - [ ] Starts under `--profile erp` with its own MariaDB; a site with ERPNext and demo data covering selling, buying, accounts, stock and POS, scripted and idempotent
  - [ ] Exact Frappe and ERPNext versions recorded for pack `appliesTo`
- **Out of scope:** regional apps (T3.28).

#### [T0.16] Read-only analyst users on the ERP demo databases

- **Labels:** type:build, area:docker, edition:community, pillar:erp, priority:p0, size:S
- **SPEC:** §2, §7.2
- **Depends on:** T0.14, T0.15
- **Goal:** The analyzer connects to Odoo's Postgres and ERPNext's MariaDB as least-privilege read-only users.
- **Acceptance:**
  - [ ] Scripts create read-only users with SELECT only (Postgres default privileges; MariaDB grants on the site database)
  - [ ] Writes fail for these users (verified); the scripts are reused verbatim by the setup guides (T3.39)
- **Out of scope:** production ERP hardening advice.

### [E0.5] Decisions, releases and changelog

- **Issue:** #6
- **Labels:** type:epic, area:repo, edition:community, priority:p1
- **Goal:** Decisions are recorded, and releases and changelogs are automated.

#### [T0.17] ADR template and ADR-0001

- **Issue:** #55
- **Labels:** type:docs, area:repo, edition:community, priority:p0, size:S
- **SPEC:** none (CLAUDE.md Decisions)
- **Depends on:** none
- **Goal:** The ADR process exists.
- **Acceptance:**
  - [ ] `docs/adr/template.md`, `docs/adr/0001-record-architecture-decisions.md` (Accepted) and `docs/adr/README.md` index
- **Out of scope:** none.

#### [T0.18] Adopt the ERP-first, open-core spec revision

- **Issue:** #169
- **Labels:** type:docs, area:docs, edition:community, priority:p0, size:S
- **SPEC:** §1, §3, §14
- **Depends on:** T0.17
- **Goal:** The revised SPEC and CLAUDE.md land on `develop` with ADR-0003.
- **Acceptance:**
  - [ ] SPEC and CLAUDE.md revisions committed as provided
  - [ ] ADR-0003 records the repositioning; README pitch updated; ADR index updated
- **Out of scope:** licensing ADR (T0.20).

#### [T0.19] Automated versioning and changelog (release-please vs changesets ADR)

- **Issue:** #56
- **Labels:** type:ci, area:ci, edition:community, priority:p1, size:M
- **SPEC:** §14
- **Depends on:** T0.7, T0.17
- **Goal:** Versions and CHANGELOG produced from Conventional Commits.
- **Acceptance:**
  - [ ] ADR compares release-please and changesets for squash-to-develop, merge-commit releases to main, a monorepo, v0.x, and Community/Enterprise code in one repo
  - [ ] Chosen tool configured; a dry run shows the expected next version and changelog
  - [ ] Release workflow tags and creates a GitHub Release when a release PR merges to `main`
- **Out of scope:** image publishing (T3.38).

### [E0.6] Open-core setup

- **Labels:** type:epic, area:ee, edition:community, priority:p0
- **Goal:** The license, the `ee/` boundary and the CLA are in place before any Enterprise code exists.

#### [T0.20] ADR-0002 licensing and `ee/` license placeholders

- **Labels:** type:docs, area:ee, edition:community, priority:p0, size:S
- **SPEC:** §3.2
- **Depends on:** T0.17
- **Goal:** Record the license decision and mark Enterprise folders as commercial.
- **Acceptance:**
  - [ ] `docs/adr/0002-licensing.md`: AGPL-3.0 core plus a commercial license for `ee/` and `packs-ee/`, with alternatives and the role of the CLA; marked Proposed until the maintainer accepts it
  - [ ] `ee/LICENSE` and `packs-ee/LICENSE` placeholders clearly marked "commercial, terms TBD", with READMEs explaining the boundary
  - [ ] `LICENSE` scope clarified in README (Community = everything outside `ee/` and `packs-ee/`)
- **Out of scope:** final commercial terms (maintainer and legal).

#### [T0.21] Lint rule: Community code must not import Enterprise code

- **Labels:** type:build, area:ee, edition:community, priority:p0, size:S
- **SPEC:** §3.2
- **Depends on:** T0.3, T0.20
- **Goal:** CLAUDE.md rule 10 fails lint when broken.
- **Acceptance:**
  - [ ] Any import from `ee/` or `packs-ee/` (relative path or package name) inside `apps/`, `packages/` or `packs/` fails lint
  - [ ] `ee/` may import Community packages
  - [ ] Fixtures prove the rule fires for relative, aliased and package-name imports
- **Out of scope:** runtime plugin loading (T5.1).

#### [T0.22] CLA bot on pull requests from external contributors

- **Labels:** type:ci, area:ee, edition:community, priority:p1, size:S
- **SPEC:** §3.2
- **Depends on:** T0.20
- **Goal:** External contributors sign a CLA before their PR can merge.
- **Acceptance:**
  - [ ] Bot chosen after verifying current options (maintenance, data storage, cost); choice justified in the PR
  - [ ] CLA text drafted from a recognized template and approved by the maintainer before enabling (stop-and-ask: legal text)
  - [ ] Maintainers and bots are allowlisted; the check is required on `develop`
- **Out of scope:** corporate CLA workflows.

### [E0.7] Claude Code project setup

- **Issue:** #7
- **Labels:** type:epic, area:repo, edition:community, priority:p1
- **Goal:** Agents follow the task loop with skills and safe permissions.

#### [T0.23] Claude Code settings and permissions

- **Issue:** #57
- **Labels:** type:chore, area:repo, edition:community, priority:p0, size:S
- **SPEC:** none (CLAUDE.md)
- **Depends on:** none
- **Goal:** `.claude/settings.json` blocks dangerous actions and allows routine ones.
- **Acceptance:**
  - [ ] Syntax verified against the official Claude Code docs
  - [ ] Denies force-push, `--no-verify` and reading `.env*` (except `.env.example`)
  - [ ] Allows routine `git`, `gh`, `pnpm` (including `packs:eval`) and `docker compose` commands
  - [ ] Verified live that denied commands are blocked
- **Out of scope:** hooks.

#### [T0.24] Skill: next-task (task loop steps 1–5)

- **Issue:** #58
- **Labels:** type:chore, area:repo, edition:community, priority:p1, size:S
- **SPEC:** none (CLAUDE.md)
- **Depends on:** T0.23, T0.1
- **Goal:** `.claude/skills/next-task/SKILL.md` automates sync, pick, claim, plan and branch.
- **Acceptance:**
  - [ ] Skill format verified against the official docs
  - [ ] Picks the highest-priority unblocked issue in the earliest open milestone, never M6 items before v0.2.0
  - [ ] Posts the plan comment and creates the linked branch; stops when the edition or acceptance criteria are unclear
- **Out of scope:** building the task.

#### [T0.25] Skill: ship (task loop steps 7–12)

- **Issue:** #59
- **Labels:** type:chore, area:repo, edition:community, priority:p1, size:S
- **SPEC:** none (CLAUDE.md)
- **Depends on:** T0.23
- **Goal:** `.claude/skills/ship/SKILL.md` automates verify, self-review, PR, labels, CI watch and report.
- **Acceptance:**
  - [ ] Runs integration tests, evals and `pnpm packs:eval` conditionally on the touched areas
  - [ ] Independent subagent review for guard, auth, secrets or license-key changes
  - [ ] Checks the edition label and the `ee/` boundary; respects `MERGE_POLICY`
- **Out of scope:** none.

---

## M1 Engine core

### [E1] M1 Engine core

- **Issue:** #8
- **Labels:** type:epic, edition:community, priority:p0
- **Goal:** Connectors (Postgres, MariaDB/MySQL, SQL Server), query guard, providers (OpenAI-compatible, Anthropic, Google), agent loop, profiler and evals CLI.

### [E1.1] Contracts and connector framework

- **Issue:** #9
- **Labels:** type:epic, area:connectors, edition:community, priority:p0
- **Goal:** Shared types plus the connector interface, registry and conformance suite.

#### [T1.1] Shared contracts: QueryIR, schema snapshot, results and errors

- **Issue:** #60
- **Labels:** type:feature, area:contracts, edition:community, priority:p0, size:M
- **SPEC:** §7.1, §9
- **Depends on:** T0.3
- **Goal:** Zod schemas and types shared by guard, connectors and core.
- **Acceptance:**
  - [ ] `packages/contracts` created; ADR records why; SPEC §13.1 layout updated in the same PR
  - [ ] Schemas and types: `QueryIR`, `SqlDialect`, `ConnectionPolicy`, `SchemaSnapshot`, `QueryResult`, `ConnectionInfo`, `CostEstimate`
  - [ ] `AppError` base class with a stable `code`
- **Out of scope:** answer schema (T1.26), pack schemas (T2.1).

#### [T1.2] Connector interface and registry

- **Issue:** #61
- **Labels:** type:feature, area:connectors, edition:community, priority:p0, size:M
- **SPEC:** §7.1
- **Depends on:** T1.1
- **Goal:** Connectors register without touching core.
- **Acceptance:**
  - [ ] `Connector` interface per SPEC §7.1; `execute` accepts only a branded `GuardedQuery`
  - [ ] Registry with register, lookup and capabilities; duplicates rejected
- **Out of scope:** drivers.

#### [T1.3] Connector conformance test suite

- **Issue:** #62
- **Labels:** type:test, area:connectors, edition:community, priority:p0, size:M
- **SPEC:** §7.1, §7.2
- **Depends on:** T1.2, T0.13
- **Goal:** One integration suite every connector runs.
- **Acceptance:**
  - [ ] Covers `test()` versions, introspection of the retail schema (including Arabic text), row cap, timeout, abort and close
  - [ ] Asserts that writes fail at the database level even with the guard bypassed
- **Out of scope:** profiling (T3.17).

### [E1.2] Query guard (SQL)

- **Issue:** #10
- **Labels:** type:epic, area:guard, edition:community, pillar:privacy, priority:p0
- **Goal:** The pure, heavily tested guard (SPEC §9) for Postgres, MariaDB/MySQL and SQL Server.

#### [T1.4] Spike and ADR: node-sql-parser dialect support

- **Issue:** #63
- **Labels:** type:docs, area:guard, edition:community, priority:p0, size:S
- **SPEC:** §9.1
- **Depends on:** T0.17
- **Goal:** A verified support matrix before we rely on the parser.
- **Acceptance:**
  - [ ] Current version, license and maintenance checked
  - [ ] Matrix for Postgres, MariaDB, MySQL and T-SQL: CTEs, window functions, `FOR UPDATE`, `INTO`, locking hints, `TOP`, quoted identifiers with spaces (ERPNext `tab…` tables) and Odoo JSON operators
  - [ ] ADR records which dialects use the parser and which use the strict fallback
- **Out of scope:** Oracle (M6).

#### [T1.5] Guard core: API, policy and statement checks

- **Issue:** #64
- **Labels:** type:feature, area:guard, edition:community, pillar:privacy, priority:p0, size:M
- **SPEC:** §9, §9.1
- **Depends on:** T1.1, T1.4
- **Goal:** `guard(q, policy)` with single-statement, SELECT/WITH-only checks and typed rejection codes.
- **Acceptance:**
  - [ ] Stable rejection code enum; rejects multi-statements, non-SELECT, `SELECT … INTO`, `FOR UPDATE`/`SHARE`, locking hints and data-modifying CTEs at any depth
  - [ ] No I/O; only the parser and zod at runtime
- **Out of scope:** blocklists, allowlists and row cap.

#### [T1.6] Strict fallback tokenizer

- **Issue:** #65
- **Labels:** type:feature, area:guard, edition:community, pillar:privacy, priority:p0, size:M
- **SPEC:** §9.2
- **Depends on:** T1.5
- **Goal:** Over-strict validation where the parser is unsupported or fails.
- **Acceptance:**
  - [ ] Strips comments and string and quoted-identifier literals correctly (including backticks and brackets)
  - [ ] Requires `SELECT`/`WITH` first, one trailing semicolon at most, and rejects DML, DDL, DCL and transaction keywords; applies the blocklist
  - [ ] A parse failure on a supported dialect falls back and never passes silently
- **Out of scope:** rewriting.

#### [T1.7] Dialect function blocklists

- **Issue:** #66
- **Labels:** type:feature, area:guard, edition:community, pillar:privacy, priority:p0, size:M
- **SPEC:** §9.1
- **Depends on:** T1.5
- **Goal:** SPEC §9.1 blocklists for Postgres, MySQL/MariaDB and SQL Server.
- **Acceptance:**
  - [ ] Lists as data, matched case-insensitively and schema-qualified (including quoted names)
  - [ ] A fixture for every blocklisted function per dialect
- **Out of scope:** Oracle list (T6.2).

#### [T1.8] Table and column allowlist with masked columns

- **Issue:** #67
- **Labels:** type:feature, area:guard, edition:community, pillar:privacy, priority:p0, size:M
- **SPEC:** §9.1
- **Depends on:** T1.5
- **Goal:** Queries touch only allowed tables and columns.
- **Acceptance:**
  - [ ] Resolves aliases, CTEs, subqueries, `schema.table` and quoted identifiers with spaces (`` `tabSales Invoice` ``) without bypass
  - [ ] Masked columns rejected with an agent-actionable reason; `SELECT *` behaviour documented
  - [ ] Fallback rejects when an active allowlist can't be verified
- **Out of scope:** row-level scoping (M5).

#### [T1.9] Row cap rewrite per dialect

- **Issue:** #68
- **Labels:** type:feature, area:guard, edition:community, priority:p0, size:M
- **SPEC:** §9.1, §7.2
- **Depends on:** T1.5
- **Goal:** Every approved query is capped.
- **Acceptance:**
  - [ ] `LIMIT` (Postgres, MariaDB, MySQL) and `TOP`/`OFFSET FETCH` (T-SQL)
  - [ ] Keeps smaller user limits; handles `ORDER BY`, unions and `OFFSET`; wraps when rewriting isn't possible
- **Out of scope:** Oracle (M6).

#### [T1.10] Adversarial fixture suite and coverage gate

- **Issue:** #69
- **Labels:** type:test, area:guard, edition:community, pillar:privacy, priority:p0, size:M
- **SPEC:** §9.4, §1.4
- **Depends on:** T1.6, T1.7, T1.8, T1.9
- **Goal:** SPEC §9.4 suite with 100% branch coverage enforced in CI.
- **Acceptance:**
  - [ ] Comment smuggling, case variants, unicode homoglyphs and zero-width characters, nested and data-modifying CTEs, stacked statements, and alias or quoted-identifier bypass
  - [ ] Fixtures are data files the community can extend; the false-acceptance rate is reported (target 0)
  - [ ] Coverage threshold for `packages/query-guard` is 100% branches; CI fails below it
- **Out of scope:** T-SQL specifics (T1.11).

#### [T1.11] SQL Server guard hardening fixtures

- **Issue:** #123
- **Labels:** type:test, area:guard, edition:community, pillar:privacy, priority:p0, size:S
- **SPEC:** §9.1, §9.4
- **Depends on:** T1.10
- **Goal:** T-SQL adversarial coverage, since SQL Server has no read-only transaction.
- **Acceptance:**
  - [ ] Fixtures for `EXEC`, `sp_executesql`, `xp_*`, `OPENROWSET`, `WAITFOR`, bracket identifiers, `GO` separators, table hints and `SELECT INTO`
- **Out of scope:** none.

### [E1.3] SQL connectors: PostgreSQL, MariaDB/MySQL and SQL Server

- **Issue:** #11
- **Labels:** type:epic, area:connectors, edition:community, priority:p0
- **Goal:** The three v0.1 connectors with defence-in-depth read-only enforcement.

#### [T1.12] PostgreSQL connector

- **Issue:** #70
- **Labels:** type:feature, area:connectors, edition:community, pillar:erp, priority:p0, size:M
- **SPEC:** §7.1, §7.2
- **Depends on:** T1.3
- **Goal:** `pg` connector (Odoo) with read-only transactions, timeouts and introspection.
- **Acceptance:**
  - [ ] `SET TRANSACTION READ ONLY` plus `statement_timeout`; pooled; abort support
  - [ ] Introspection scoped to allowed schemas, handling Odoo-scale schemas (hundreds of tables) within a time budget
  - [ ] `explain` cost via `EXPLAIN (FORMAT JSON)`; conformance suite passes in CI
- **Out of scope:** profiling.

#### [T1.13] ADR: MariaDB/MySQL driver choice

- **Issue:** #72
- **Labels:** type:docs, area:connectors, edition:community, priority:p0, size:S
- **SPEC:** §7.2
- **Depends on:** T0.17
- **Goal:** Choose `mariadb` or `mysql2` for one connector serving both.
- **Acceptance:**
  - [ ] ADR compares maintenance, license, features (read-only transaction, statement timeout, server-version detection) and ERPNext compatibility, verified from current docs
- **Out of scope:** implementation.

#### [T1.14] MariaDB/MySQL connector

- **Issue:** #71
- **Labels:** type:feature, area:connectors, edition:community, pillar:erp, priority:p0, size:M
- **SPEC:** §7.1, §7.2
- **Depends on:** T1.3, T1.13
- **Goal:** One connector (ERPNext) with separate MariaDB and MySQL dialect configs.
- **Acceptance:**
  - [ ] `START TRANSACTION READ ONLY`; `max_statement_time` (MariaDB) or `max_execution_time` (MySQL) chosen by detected server
  - [ ] Introspection handles table names with spaces; conformance suite passes on MariaDB in CI
- **Out of scope:** a MySQL service in the dev stack (M6).

#### [T1.15] SQL Server connector

- **Issue:** #122
- **Labels:** type:feature, area:connectors, edition:community, priority:p0, size:M
- **SPEC:** §7.2
- **Depends on:** T1.3
- **Goal:** `mssql` connector for custom retail and POS.
- **Acceptance:**
  - [ ] Request timeout, pooling and abort; introspection via `sys` views; NVARCHAR Arabic round-trip
  - [ ] Conformance suite passes in CI
- **Out of scope:** Windows authentication.

#### [T1.16] Guarded execution pipeline with cost gate

- **Issue:** #73
- **Labels:** type:feature, area:core, edition:community, pillar:privacy, priority:p0, size:M
- **SPEC:** §8, §9.1, §13.2
- **Depends on:** T1.10, T1.12
- **Goal:** The only path to execution: guard → cost gate → execute → audit hook.
- **Acceptance:**
  - [ ] Cost gate via `explain` where available, with an actionable reason
  - [ ] Guarded queries stored by `queryId`; audit event emitted through a sink interface
  - [ ] Tests prove no path to `execute` without the guard
- **Out of scope:** persistent audit (T3.16, T4.22).

### [E1.4] Providers: abstraction, catalog and v0.1 families

- **Issue:** #12
- **Labels:** type:epic, area:providers, edition:community, pillar:privacy, priority:p0
- **Goal:** Provider-neutral model access for the v0.1 families: OpenAI-compatible (cloud, Chinese, local, gateways), Anthropic and Google.

#### [T1.17] ADR and base: Vercel AI SDK provider abstraction

- **Issue:** #74
- **Labels:** type:feature, area:providers, edition:community, priority:p0, size:M
- **SPEC:** §10.1, §10.4
- **Depends on:** T1.1
- **Goal:** A `ModelProvider` abstraction that only `packages/providers` implements.
- **Acceptance:**
  - [ ] ADR pins the AI SDK major version (verified) and the adapter design
  - [ ] Text, streaming, tool calls, structured output and embeddings; model roles `analyst`, `fast`, `embedding`
  - [ ] Mock provider for tests
- **Out of scope:** vendors.

#### [T1.18] Provider catalog schema and loader

- **Issue:** #75
- **Labels:** type:feature, area:providers, edition:community, priority:p0, size:M
- **SPEC:** §10.1, §10.2
- **Depends on:** T1.17
- **Goal:** Data-only `catalog/*.json` entries validated with Zod.
- **Acceptance:**
  - [ ] Schema: family, base URLs with `regions: { cn, intl }`, auth method, models, prices, required `docsUrl` and `lastVerified`
  - [ ] CI fails on invalid entries or `lastVerified` older than 180 days
- **Out of scope:** entries.

#### [T1.19] OpenAI-compatible adapter with custom endpoints

- **Issue:** #77
- **Labels:** type:feature, area:providers, edition:community, pillar:privacy, priority:p0, size:M
- **SPEC:** §10.2, §10.3
- **Depends on:** T1.18
- **Goal:** One adapter for OpenAI and any OpenAI-compatible endpoint.
- **Acceptance:**
  - [ ] OpenAI entry verified (`docsUrl`, `lastVerified`); custom endpoint with any base URL
  - [ ] Auth `none`, `api-key` (configurable header and prefix) and `custom-headers`
  - [ ] Recorded-response tests; no live calls in CI
- **Out of scope:** presets (T1.21–T1.23).

#### [T1.20] Anthropic and Google Gemini adapters

- **Issue:** #76
- **Labels:** type:feature, area:providers, edition:community, priority:p0, size:M
- **SPEC:** §10.2
- **Depends on:** T1.18
- **Goal:** Native Anthropic (with custom base URL for compatible endpoints) and Gemini API adapters.
- **Acceptance:**
  - [ ] Package names, endpoints and model IDs verified in official docs
  - [ ] Anthropic custom base URL supported; recorded-response tests
- **Out of scope:** Vertex AI and Bedrock (M6).

#### [T1.21] Chinese provider presets with regions

- **Issue:** #148
- **Labels:** type:feature, area:providers, edition:community, priority:p1, size:M
- **SPEC:** §10.2
- **Depends on:** T1.19
- **Goal:** DeepSeek, Qwen, Kimi, GLM, MiniMax, Qianfan, Hunyuan, Volcengine Ark and SiliconFlow presets.
- **Acceptance:**
  - [ ] Mainland China and international endpoints verified per provider (`regions`)
- **Out of scope:** none.

#### [T1.22] Local model and gateway presets

- **Issue:** #149
- **Labels:** type:feature, area:providers, edition:community, pillar:privacy, priority:p0, size:S
- **SPEC:** §10.2, §1.2
- **Depends on:** T1.19
- **Goal:** Ollama, LM Studio, vLLM, llama.cpp server, LocalAI, Jan, LiteLLM, Portkey and Cloudflare AI Gateway.
- **Acceptance:**
  - [ ] Verified presets; documented local setup works against a local Ollama
- **Out of scope:** none.

#### [T1.23] Other OpenAI-compatible cloud presets

- **Labels:** type:feature, area:providers, edition:community, priority:p2, size:S
- **SPEC:** §10.2
- **Depends on:** T1.19
- **Goal:** OpenRouter, Groq, Together and Fireworks presets.
- **Acceptance:**
  - [ ] Verified presets with `docsUrl` and `lastVerified`
- **Out of scope:** native SDKs (M6).

### [E1.5] Knowledge basics and context selection

- **Issue:** #13
- **Labels:** type:epic, area:knowledge, edition:community, priority:p0
- **Goal:** Structural knowledge and table-card retrieval that scales to ERP schemas.

#### [T1.24] Introspection orchestration and snapshot cache

- **Issue:** #78
- **Labels:** type:feature, area:knowledge, edition:community, priority:p0, size:M
- **SPEC:** §4.1, §12
- **Depends on:** T1.12
- **Goal:** Build and cache the structural layer per connection.
- **Acceptance:**
  - [ ] Normalized `SchemaSnapshot` with a content hash; Lite cache in `.cache/`; on-demand refresh
- **Out of scope:** versioned diffs (T4.4), data profiles (T3.17).

#### [T1.25] Table cards, BM25 retrieval and FK expansion

- **Issue:** #79
- **Labels:** type:feature, area:knowledge, edition:community, pillar:gcc, priority:p0, size:M
- **SPEC:** §4.2
- **Depends on:** T1.24
- **Goal:** Select relevant tables within a token budget.
- **Acceptance:**
  - [ ] One compact card per table, including semantic text when present
  - [ ] BM25 with Arabic normalization (alef and ya variants, diacritics, tatweel) and English tokenization
  - [ ] FK expansion: shortest path plus at most one hop; token budget respected
  - [ ] Arabic criterion: an Arabic query term matches a table via its Arabic synonym
- **Out of scope:** pack-first selection (T2.5), vectors (T4.19).

### [E1.6] Agent loop and profiler

- **Issue:** #14
- **Labels:** type:epic, area:core, edition:community, priority:p0
- **Goal:** Tool-calling and fixed-pipeline agents that return a validated `AnalystAnswer`.

#### [T1.26] AnalystAnswer and ChartSpec schemas

- **Issue:** #80
- **Labels:** type:feature, area:charts, edition:community, priority:p0, size:M
- **SPEC:** §4.5
- **Depends on:** T1.1
- **Goal:** Validated structured output.
- **Acceptance:**
  - [ ] Zod `ChartSpec` (all eight types) in `packages/charts`; `AnalystAnswer` including `definitionsUsed` in `packages/core`
  - [ ] Validator checks referenced columns and `keyFigures.sourceColumn`
- **Out of scope:** rendering.

#### [T1.27] Result profiler

- **Issue:** #81
- **Labels:** type:feature, area:core, edition:community, pillar:privacy, priority:p0, size:M
- **SPEC:** §8, §2, §4.4
- **Depends on:** T1.16
- **Goal:** Results become a profile; raw rows never reach the LLM.
- **Acceptance:**
  - [ ] Row count, per-column stats and truncation flags; first N rows only in `full` mode (mode plumbed)
  - [ ] Output wrapped and labelled as untrusted content
- **Out of scope:** `aggregate` and `schema-only` behaviour (T4.21).

#### [T1.28] Agent tools

- **Issue:** #82
- **Labels:** type:feature, area:core, edition:community, priority:p0, size:M
- **SPEC:** §8
- **Depends on:** T1.25, T1.27
- **Goal:** Tool definitions with Zod arguments.
- **Acceptance:**
  - [ ] `search_tables`, `describe_table`, `get_sample_values`, `run_query` and `ask_clarification` implemented
  - [ ] `get_metric`, `search_verified_queries`, `resolve_period` and `note_insight` defined, backed by stubs until M2, M3 and M4
  - [ ] Invalid arguments return model-readable errors
- **Out of scope:** pack composition (T2.7).

#### [T1.29] Analyst system prompt v1 and prompt versioning

- **Issue:** #83
- **Labels:** type:feature, area:core, edition:community, pillar:gcc, priority:p0, size:S
- **SPEC:** §4.3, §8
- **Depends on:** T1.26
- **Goal:** A versioned prompt encoding the expert behaviours.
- **Acceptance:**
  - [ ] `packages/core/prompts/analyst/v1.md` plus a loader; version id recorded on answers
  - [ ] Grounded numbers, one clarification at most, assumptions, caveats, follow-ups, no fabrication, and answering in the question's language (Arabic over English schemas)
- **Out of scope:** eval tuning.

#### [T1.30] Tool-calling agent loop

- **Issue:** #84
- **Labels:** type:feature, area:core, edition:community, priority:p0, size:M
- **SPEC:** §8
- **Depends on:** T1.28, T1.29, T1.20
- **Goal:** Agent loop with limits and self-correction.
- **Acceptance:**
  - [ ] Limits enforced (8 steps, 5 executions, 3 corrections, wall clock), all configurable
  - [ ] Typed event stream for SSE; final answer validated with one repair attempt
- **Out of scope:** UI.

#### [T1.31] Fixed pipeline for models without tool calling

- **Issue:** #85
- **Labels:** type:feature, area:core, edition:community, pillar:privacy, priority:p1, size:M
- **SPEC:** §8, §10.4
- **Depends on:** T1.30
- **Goal:** Deterministic pipeline for weaker or local models.
- **Acceptance:**
  - [ ] Context → query (structured output or strict JSON) → guard → execute → profile → analyze, with 3 corrections
  - [ ] Same events and answer shape as the loop
- **Out of scope:** none.

### [E1.7] Evals

- **Issue:** #15
- **Labels:** type:epic, area:evals, edition:community, priority:p0
- **Goal:** A generic golden set and the evals CLI.

#### [T1.32] Generic golden set on the retail dataset

- **Issue:** #86
- **Labels:** type:test, area:evals, edition:community, pillar:gcc, priority:p0, size:M
- **SPEC:** §13.3
- **Depends on:** T0.12
- **Goal:** Golden questions with expected result sets on the SQL Server retail data.
- **Acceptance:**
  - [ ] YAML format (question, language, difficulty, tags, reference SQL, expected tables, tolerances), shared with pack golden files
  - [ ] Expected results computed reproducibly from reference SQL
  - [ ] At least 30 questions, at least 30% Arabic, including clarification cases
- **Out of scope:** Hijri questions (T3.30), pack golden sets (M2).

#### [T1.33] Evals CLI and markdown report

- **Issue:** #87
- **Labels:** type:feature, area:evals, edition:community, priority:p0, size:M
- **SPEC:** §13.3, §1.4
- **Depends on:** T1.30, T1.32
- **Goal:** `pnpm evals -- --provider <id> --model <id>`.
- **Acceptance:**
  - [ ] Result-set comparison with tolerances; metrics: execution accuracy (per language), context recall, clarification correctness, tokens and cost, latency, guard rejections
  - [ ] Markdown plus JSON report; before/after comparison table for PRs
  - [ ] Manual `workflow_dispatch` CI workflow
- **Out of scope:** pack evals (T2.10).

---

## M2 Domain packs

### [E2] M2 Domain packs

- **Issue:** #16
- **Labels:** type:epic, edition:community, pillar:erp, priority:p0
- **Goal:** Pack format and loader, detection, `odoo` and `erpnext` core packs with golden sets, pack evals in CI, and metric-template composition in the agent.

### [E2.1] Pack format, loader and detection

- **Labels:** type:epic, area:packs, edition:community, pillar:erp, priority:p0
- **Goal:** Packs are validated data that the engine loads, detects and activates.

#### [T2.1] ADR and Zod schemas for the pack format

- **Labels:** type:feature, area:packs, edition:community, pillar:erp, priority:p0, size:M
- **SPEC:** §5.1, §4.1
- **Depends on:** T1.1
- **Goal:** Schemas for every pack file, shared with the Lite semantic layer.
- **Acceptance:**
  - [ ] ADR for the pack format (YAML only, no code, semver, edition, `appliesTo`, `modules`, `requires`, `locales`, `maintainers`)
  - [ ] Zod schemas for `pack.yaml`, `detect.yaml`, `semantic/*.yaml`, `ambiguities.yaml`, `caveats.yaml`, `starters.yaml` and `golden/*.yaml`
  - [ ] English and Arabic synonym and explanation fields are first-class; a fixture pack validates
- **Out of scope:** metric templates (T2.6).

#### [T2.2] Pack loader with edition gating

- **Labels:** type:feature, area:packs, edition:community, pillar:erp, priority:p0, size:M
- **SPEC:** §5.1, §3.2
- **Depends on:** T2.1
- **Goal:** Discover, validate and version packs from `packs/` (and `packs-ee/` through an extension point).
- **Acceptance:**
  - [ ] Loads and validates all packs with clear path-based errors; rejects anything that isn't YAML data
  - [ ] Enterprise packs are skipped without a license, through a loader hook, with no import from `ee/`
  - [ ] Version and edition of each loaded pack exposed for transparency
- **Out of scope:** license verification (T5.2).

#### [T2.3] Pack detection engine

- **Labels:** type:feature, area:packs, edition:community, pillar:erp, priority:p0, size:M
- **SPEC:** §5.2
- **Depends on:** T2.2, T1.16
- **Goal:** Identify product, version and installed modules, and activate sub-packs.
- **Acceptance:**
  - [ ] Runs `detect.yaml` fingerprints through the guarded pipeline only
  - [ ] Reads installed modules and activates matching sub-packs; result cached per connection
  - [ ] Versions outside `appliesTo` activate as "best effort" with a recorded warning; detection never assumes
  - [ ] Admin override via config (Lite)
- **Out of scope:** detection UI (T3.14).

#### [T2.4] Pack fact verifier (`pnpm packs:verify`)

- **Labels:** type:feature, area:packs, edition:community, pillar:erp, priority:p0, size:M
- **SPEC:** §5.3, §5.5
- **Depends on:** T2.2, T1.12, T1.14
- **Goal:** Mechanically check CLAUDE.md rule 11 against a running ERP instance.
- **Acceptance:**
  - [ ] Every table, column, state value and module name referenced by a pack is checked against the live `erp` instance; missing facts fail with file and line
  - [ ] Runs in the pack CI job (T2.11); documented in CONTRIBUTING
- **Out of scope:** semantic correctness (covered by golden evals).

#### [T2.5] Pack-first context selection

- **Labels:** type:feature, area:knowledge, edition:community, pillar:erp, priority:p0, size:M
- **SPEC:** §4.2
- **Depends on:** T2.3, T1.25
- **Goal:** Select pack entities and metrics matching the question first; their tables come with them.
- **Acceptance:**
  - [ ] Entity and metric matching via synonyms (English and Arabic), then table cards for the rest
  - [ ] Context recall measured in evals before and after on both packs
- **Out of scope:** vectors (T4.19).

### [E2.2] Metric templates in the agent

- **Labels:** type:epic, area:core, edition:community, pillar:erp, priority:p0
- **Goal:** When a question maps to a pack metric, the agent composes from its template (SPEC §8, rule 12).

#### [T2.6] Metric query template format and composer

- **Labels:** type:feature, area:packs, edition:community, pillar:erp, priority:p0, size:M
- **SPEC:** §5.1, §8
- **Depends on:** T2.1, T1.5
- **Goal:** Parameterized metric templates the agent can extend safely.
- **Acceptance:**
  - [ ] Template format with dimensions, filters, grouping and period slots per dialect
  - [ ] Composer adds filters, grouping and periods structurally (no string concatenation of user input); output still passes the guard
  - [ ] Unit tests for composition on both dialects, including ERPNext quoted identifiers
- **Out of scope:** agent wiring (T2.7).

#### [T2.7] `get_metric` and template-first composition in the agent

- **Labels:** type:feature, area:core, edition:community, pillar:erp, priority:p0, size:M
- **SPEC:** §8, §4.5, §2
- **Depends on:** T2.6, T1.30
- **Goal:** Pack metrics win over improvised SQL.
- **Acceptance:**
  - [ ] `get_metric` returns the definition and template; the agent composes from it when a metric matches
  - [ ] `definitionsUsed` lists pack, metric and version on every answer that used one
  - [ ] Evals detect and fail cases where the agent bypasses a matching metric
- **Out of scope:** none.

#### [T2.8] Pack ambiguities and caveats in answers

- **Labels:** type:feature, area:core, edition:community, pillar:erp, priority:p0, size:M
- **SPEC:** §4.3, §5.1
- **Depends on:** T2.7
- **Goal:** Packs drive clarifying questions and system caveats.
- **Acceptance:**
  - [ ] Ambiguous terms (for example "sales") trigger the pack's clarifying question, in the user's language
  - [ ] Pack caveats (drafts or cancelled excluded, archived records, currency conversion) appear in `caveats` when applicable
  - [ ] Arabic criterion: an Arabic ambiguous term triggers the Arabic clarification
- **Out of scope:** generic data caveats (T3.19).

#### [T2.9] Metric explanations in English and Arabic

- **Labels:** type:feature, area:core, edition:community, pillar:gcc, priority:p1, size:S
- **SPEC:** §5.5
- **Depends on:** T2.7
- **Goal:** "How did you calculate this?" answered from the pack's plain-language explanation.
- **Acceptance:**
  - [ ] Explanations returned per metric used, in the user's language; the Arabic explanation is shown for Arabic questions
- **Out of scope:** UI (T3.10).

### [E2.3] Pack evals

- **Labels:** type:epic, area:evals, edition:community, pillar:erp, priority:p0
- **Goal:** Measure pack accuracy per language, locally and in CI.

#### [T2.10] `pnpm packs:eval` CLI

- **Labels:** type:feature, area:evals, edition:community, pillar:erp, priority:p0, size:M
- **SPEC:** §5.5, §13.3
- **Depends on:** T1.33, T2.2
- **Goal:** Run a pack's golden set against its demo instance and report accuracy.
- **Acceptance:**
  - [ ] `pnpm packs:eval -- --pack <id> --provider <id> --model <id>`; accuracy per module and per language
  - [ ] Before/after delta table for PRs; JSON output for the recommended-models page
  - [ ] CLAUDE.md Commands section confirmed accurate
- **Out of scope:** CI wiring (T2.11).

#### [T2.11] Pack evals in CI (nightly and `ci:packs`)

- **Labels:** type:ci, area:ci, edition:community, pillar:erp, priority:p0, size:M
- **SPEC:** §5.5, §13.3
- **Depends on:** T2.10, T2.4, T0.8, T0.16
- **Goal:** Pack evals and fact verification run against ERP demo instances in CI.
- **Acceptance:**
  - [ ] Nightly and `ci:packs`-label workflow starts the `erp` profile, runs `packs:verify` and `packs:eval`, and posts the summary
  - [ ] Provider secrets used safely (not exposed to fork PRs)
- **Out of scope:** none.

### [E2.4] Odoo core pack

- **Labels:** type:epic, area:packs, edition:community, pillar:erp, priority:p0
- **Goal:** `packs/odoo` covering Sales, Invoicing/Accounting basics, Inventory, Purchase and POS, verified on the dev instance.

#### [T2.12] Odoo pack skeleton and detection

- **Labels:** type:feature, area:packs, edition:community, pillar:erp, priority:p0, size:S
- **SPEC:** §5.1, §5.2, §5.4
- **Depends on:** T2.3, T0.16
- **Goal:** Manifest and fingerprints for the Odoo versions in the dev stack.
- **Acceptance:**
  - [ ] `pack.yaml` with `appliesTo` from the dev instance; `detect.yaml` identifies Odoo and reads installed modules
  - [ ] Detection verified on the dev instance; `packs:verify` passes
- **Out of scope:** metrics.

#### [T2.13] Odoo Sales sub-pack

- **Labels:** type:feature, area:packs, edition:community, pillar:erp, priority:p0, size:M
- **SPEC:** §5.3, §5.4
- **Depends on:** T2.12, T2.6
- **Goal:** Orders, customers, salespeople and products with English and Arabic synonyms.
- **Acceptance:**
  - [ ] Entities and metrics verified on the instance; "sales" declared as ambiguous (orders vs invoiced revenue)
  - [ ] At least 8 golden questions (at least 3 Arabic)
- **Out of scope:** invoiced revenue (T2.14).

#### [T2.14] Odoo Invoicing and Accounting basics: revenue and receivables

- **Labels:** type:feature, area:packs, edition:community, pillar:erp, priority:p0, size:M
- **SPEC:** §5.3, §5.4
- **Depends on:** T2.12, T2.6
- **Goal:** Correct revenue and receivables from accounting moves.
- **Acceptance:**
  - [ ] Net revenue from posted customer invoices minus posted credit notes, by move type and state, verified on the instance
  - [ ] Receivables outstanding; company currency vs document currency handled
  - [ ] At least 8 golden questions (at least 3 Arabic)
- **Out of scope:** VAT (T3.26), aged balances (M5 premium).

#### [T2.15] Odoo Inventory sub-pack

- **Labels:** type:feature, area:packs, edition:community, pillar:erp, priority:p0, size:M
- **SPEC:** §5.3, §5.4
- **Depends on:** T2.12, T2.6
- **Goal:** Stock on hand, moves and valuation basics by warehouse.
- **Acceptance:**
  - [ ] Quantities carry units of measure; warehouse as the branch dimension; verified on the instance
  - [ ] At least 6 golden questions (at least 2 Arabic)
- **Out of scope:** manufacturing (M5 premium).

#### [T2.16] Odoo Purchase sub-pack

- **Labels:** type:feature, area:packs, edition:community, pillar:erp, priority:p1, size:M
- **SPEC:** §5.3, §5.4
- **Depends on:** T2.12, T2.6
- **Goal:** Purchase orders, vendors and vendor bills basics.
- **Acceptance:**
  - [ ] Ordered vs billed amounts distinguished; verified on the instance
  - [ ] At least 6 golden questions (at least 2 Arabic)
- **Out of scope:** none.

#### [T2.17] Odoo Point of Sale sub-pack

- **Labels:** type:feature, area:packs, edition:community, pillar:erp, priority:p0, size:M
- **SPEC:** §5.3, §5.4
- **Depends on:** T2.12, T2.6
- **Goal:** POS sessions and orders, separate from sales orders.
- **Acceptance:**
  - [ ] POS config as the branch dimension; POS vs sales-order revenue never double-counted; verified on the instance
  - [ ] At least 6 golden questions (at least 2 Arabic)
- **Out of scope:** none.

#### [T2.18] Odoo cross-cutting rules: translations, archived records, multi-company

- **Labels:** type:feature, area:packs, edition:community, pillar:erp, priority:p0, size:M
- **SPEC:** §5.3
- **Depends on:** T2.12, T2.6
- **Goal:** Pitfalls every Odoo metric must respect.
- **Acceptance:**
  - [ ] Translatable JSON fields extracted in the user's language (Arabic when present, fallback documented), verified on the instance
  - [ ] Archived records (`active = false`) excluded by default with a caveat; multi-company filtering explicit
- **Out of scope:** none.

#### [T2.19] Odoo golden set completion and baseline

- **Labels:** type:test, area:packs, edition:community, pillar:erp, priority:p0, size:M
- **SPEC:** §5.5, §1.4
- **Depends on:** T2.13, T2.14, T2.15, T2.16, T2.17, T2.18, T2.10
- **Goal:** Meet the pack quality bar and record a baseline.
- **Acceptance:**
  - [ ] At least 40 golden questions, at least 30% Arabic, covering every module, including clarification cases
  - [ ] Baseline accuracy report on the reference model and a local model, committed to the pack README
- **Out of scope:** reaching the v0.1 targets (tracked in M3).

### [E2.5] ERPNext core pack

- **Labels:** type:epic, area:packs, edition:community, pillar:erp, priority:p0
- **Goal:** `packs/erpnext` covering Selling, Buying, Accounts basics, Stock and POS, verified on the dev instance.

#### [T2.20] ERPNext pack skeleton and detection

- **Labels:** type:feature, area:packs, edition:community, pillar:erp, priority:p0, size:S
- **SPEC:** §5.1, §5.2, §5.4
- **Depends on:** T2.3, T0.16
- **Goal:** Manifest and fingerprints for the ERPNext versions in the dev stack.
- **Acceptance:**
  - [ ] Detects Frappe and ERPNext versions and installed apps and modules; verified on the instance
  - [ ] All identifiers quoted (`tab…` with spaces); `packs:verify` passes
- **Out of scope:** metrics.

#### [T2.21] ERPNext Selling sub-pack

- **Labels:** type:feature, area:packs, edition:community, pillar:erp, priority:p0, size:M
- **SPEC:** §5.3, §5.4
- **Depends on:** T2.20, T2.6
- **Goal:** Sales orders, customers and items, submitted documents only.
- **Acceptance:**
  - [ ] `docstatus = 1` enforced in metrics; returns handled as documents flagged against the original; verified on the instance
  - [ ] At least 8 golden questions (at least 3 Arabic)
- **Out of scope:** none.

#### [T2.22] ERPNext Buying sub-pack

- **Labels:** type:feature, area:packs, edition:community, pillar:erp, priority:p1, size:M
- **SPEC:** §5.3, §5.4
- **Depends on:** T2.20, T2.6
- **Goal:** Purchase orders, suppliers and purchase invoices.
- **Acceptance:**
  - [ ] Submitted-only metrics; verified on the instance
  - [ ] At least 6 golden questions (at least 2 Arabic)
- **Out of scope:** none.

#### [T2.23] ERPNext Accounts basics: revenue and receivables from the General Ledger

- **Labels:** type:feature, area:packs, edition:community, pillar:erp, priority:p0, size:M
- **SPEC:** §5.3, §5.4
- **Depends on:** T2.20, T2.6
- **Goal:** Accounting truth from GL entries.
- **Acceptance:**
  - [ ] Revenue and receivables from GL entries (cancelled excluded), with company and currency handling; verified on the instance
  - [ ] At least 8 golden questions (at least 3 Arabic)
- **Out of scope:** VAT (T3.27).

#### [T2.24] ERPNext Stock sub-pack

- **Labels:** type:feature, area:packs, edition:community, pillar:erp, priority:p0, size:M
- **SPEC:** §5.3, §5.4
- **Depends on:** T2.20, T2.6
- **Goal:** Stock balances and movements by warehouse.
- **Acceptance:**
  - [ ] Quantities with UOM; warehouse as branch; verified on the instance
  - [ ] At least 6 golden questions (at least 2 Arabic)
- **Out of scope:** manufacturing.

#### [T2.25] ERPNext POS sub-pack

- **Labels:** type:feature, area:packs, edition:community, pillar:erp, priority:p0, size:M
- **SPEC:** §5.3, §5.4
- **Depends on:** T2.20, T2.6
- **Goal:** POS invoices and profiles.
- **Acceptance:**
  - [ ] POS profile as branch; no double counting with sales invoices; verified on the instance
  - [ ] At least 6 golden questions (at least 2 Arabic)
- **Out of scope:** none.

#### [T2.26] ERPNext golden set completion and baseline

- **Labels:** type:test, area:packs, edition:community, pillar:erp, priority:p0, size:M
- **SPEC:** §5.5, §1.4
- **Depends on:** T2.21, T2.22, T2.23, T2.24, T2.25, T2.10
- **Goal:** Meet the pack quality bar and record a baseline.
- **Acceptance:**
  - [ ] At least 40 golden questions, at least 30% Arabic, every module, including clarification cases
  - [ ] Baseline report on the reference model and a local model in the pack README
- **Out of scope:** none.

---

## M3 Lite MVP and Arabic/GCC (v0.1.0)

### [E3] M3 Lite MVP and Arabic/GCC

- **Issue:** #21
- **Labels:** type:epic, edition:community, priority:p0
- **Goal:** Chat UI, answer rendering, charts, query panel, Lite config, Arabic/RTL, numerals, Hijri and events calendar, VAT metrics, Excel export, Docker image and recommended-models page. Released as v0.1.0 "Ask your Odoo / ERPNext".

### [E3.1] Web shell and i18n

- **Issue:** #17
- **Labels:** type:epic, area:web, edition:community, pillar:gcc, priority:p0
- **Goal:** A thin Next.js app that is bilingual and RTL from day one.

#### [T3.1] Next.js app shell with Tailwind and shadcn/ui

- **Issue:** #88
- **Labels:** type:feature, area:web, edition:community, pillar:gcc, priority:p0, size:M
- **SPEC:** §13.1, §6
- **Depends on:** T0.3
- **Goal:** App Router app with layout, theming and logical-properties-only styling.
- **Acceptance:**
  - [ ] Next.js (current stable, verified), Tailwind and shadcn/ui; standalone output
  - [ ] `dir` set from locale; logical CSS properties only; self-hosted Arabic-capable fonts
  - [ ] Arabic criterion: the shell renders correctly in RTL (screenshot in PR)
- **Out of scope:** features.

#### [T3.2] i18n package: catalogs, locale detection and RTL helpers

- **Issue:** #89
- **Labels:** type:feature, area:i18n, edition:community, pillar:gcc, priority:p0, size:M
- **SPEC:** §6
- **Depends on:** T3.1
- **Goal:** No hard-coded UI strings.
- **Acceptance:**
  - [ ] `en` and `ar` catalogs with typed keys, ICU plurals (including Arabic plural forms), date and number formatting
  - [ ] Lint rule flags literal JSX strings; a test fails on missing keys in either catalog
  - [ ] Language switcher persists the choice
- **Out of scope:** numerals (T3.3).

#### [T3.3] Arabic-Indic numerals: input normalization and output preference

- **Labels:** type:feature, area:i18n, edition:community, pillar:gcc, priority:p0, size:S
- **SPEC:** §6
- **Depends on:** T3.2
- **Goal:** Accept ٠-٩ in input; output digit style is a user preference.
- **Acceptance:**
  - [ ] Arabic-Indic and Eastern Arabic-Indic digits normalized in questions and filters before the agent sees them
  - [ ] Output digit preference (Western or Arabic-Indic) applied in UI and exports; tested
- **Out of scope:** none.

#### [T3.4] Lite auth: none or single password

- **Issue:** #90
- **Labels:** type:feature, area:web, edition:community, pillar:privacy, priority:p1, size:S
- **SPEC:** §12
- **Depends on:** T3.1
- **Goal:** Optional password protection from env.
- **Acceptance:**
  - [ ] Off by default; with `APP_PASSWORD`, all routes require a session; constant-time compare; rate-limited login
  - [ ] Arabic criterion: the login page is localized and RTL
- **Out of scope:** users and roles (M4).

### [E3.2] Lite configuration, semantic layer and packs

- **Issue:** #18
- **Labels:** type:epic, area:storage, edition:community, priority:p0
- **Goal:** Lite mode configured by files that live in git.

#### [T3.5] StorageAdapter interface and Lite adapter

- **Issue:** #91
- **Labels:** type:feature, area:storage, edition:community, priority:p0, size:M
- **SPEC:** §12
- **Depends on:** T1.24
- **Goal:** One storage interface; the Lite implementation is file-based.
- **Acceptance:**
  - [ ] Interface covers connections, providers, semantic layer, packs state, knowledge cache, query store and audit sink, with storage hooks for Enterprise
  - [ ] Lite implementation plus a shared contract test suite
- **Out of scope:** Full adapter (T4.3).

#### [T3.6] `analyzer.config.yaml` schema and loader

- **Issue:** #92
- **Labels:** type:feature, area:storage, edition:community, priority:p0, size:M
- **SPEC:** §12, §10.3, §6
- **Depends on:** T3.5
- **Goal:** Lite config with `${ENV}` secret references.
- **Acceptance:**
  - [ ] Zod schema for connections, policies, providers, model roles, packs (enabled, detection override) and organization settings (locale, digits, week start and weekend, extra calendar events)
  - [ ] `${ENV}` interpolation; errors never echo secrets; example config for the dev stack and the ERP profile
- **Out of scope:** UI editing.

#### [T3.7] Semantic layer YAML loader (pack-compatible)

- **Issue:** #93
- **Labels:** type:feature, area:knowledge, edition:community, priority:p0, size:M
- **SPEC:** §4.1, §12
- **Depends on:** T3.5, T2.1
- **Goal:** User semantic files use the same schemas as packs and layer on top of them.
- **Acceptance:**
  - [ ] `semantic/*.yaml` and `semantic/verified-queries.yaml` validated with the pack schemas
  - [ ] Precedence documented and tested: user semantic overrides pack definitions explicitly, never silently
- **Out of scope:** editor (M4).

### [E3.3] Chat experience

- **Issue:** #19
- **Labels:** type:epic, area:web, edition:community, priority:p0
- **Goal:** Ask in Arabic or English, watch it work, and read a transparent answer.

#### [T3.8] Chat API: SSE streaming of agent events

- **Issue:** #94
- **Labels:** type:feature, area:web, edition:community, priority:p0, size:M
- **SPEC:** §8, §13.1
- **Depends on:** T1.30, T3.6
- **Goal:** Route handler that streams agent events.
- **Acceptance:**
  - [ ] Zod-validated input; typed SSE events; disconnect aborts the agent and query
  - [ ] `GET /api/queries/:id/rows` with pagination; Node runtime; no secrets in responses
- **Out of scope:** UI.

#### [T3.9] Chat UI with streaming and history

- **Issue:** #95
- **Labels:** type:feature, area:web, edition:community, pillar:gcc, priority:p0, size:M
- **SPEC:** §12, §6
- **Depends on:** T3.8, T3.2
- **Goal:** Conversation UI with live progress.
- **Acceptance:**
  - [ ] Streaming steps, stop button and error states; history in IndexedDB
  - [ ] Arabic criterion: mixed Arabic/English messages render with correct bidi in RTL; keyboard accessible
- **Out of scope:** answer rendering (T3.10).

#### [T3.10] Answer rendering and transparency

- **Issue:** #96
- **Labels:** type:feature, area:web, edition:community, pillar:erp, priority:p0, size:M
- **SPEC:** §2, §4.5, §5.5
- **Depends on:** T3.9, T2.9
- **Goal:** Render every `AnalystAnswer` field, including definitions used.
- **Acceptance:**
  - [ ] Answer, key figures, insights, recommendations, assumptions, caveats, confidence and clickable follow-ups
  - [ ] Shows model, prompt version, freshness, active pack and version, and definitions used with "how did you calculate this?"
  - [ ] Arabic criterion: numbers, currencies and explanations render bidi-safe in Arabic answers
- **Out of scope:** charts (T3.12).

#### [T3.11] Query panel with data table

- **Issue:** #97
- **Labels:** type:feature, area:web, edition:community, priority:p0, size:M
- **SPEC:** §2, §8
- **Depends on:** T3.10
- **Goal:** Show the executed query and its rows.
- **Acceptance:**
  - [ ] Highlighted SQL with copy; virtualized TanStack Table fetched by `queryId`; truncation notice
  - [ ] Arabic criterion: RTL column order and Arabic cell values render correctly
- **Out of scope:** export (E3.5).

#### [T3.12] ECharts client renderer

- **Issue:** #98
- **Labels:** type:feature, area:charts, edition:community, pillar:gcc, priority:p0, size:M
- **SPEC:** §4.5, §6
- **Depends on:** T1.26, T3.10
- **Goal:** Render every `ChartSpec` type in the browser.
- **Acceptance:**
  - [ ] Pure `ChartSpec` → ECharts option mapper (shared with SSR); all eight types; column check before render
  - [ ] Arabic criterion: RTL axes and legends, Arabic labels and digit preference
- **Out of scope:** SSR (T3.33).

#### [T3.13] Conversation start: data overview and pack starters

- **Issue:** #99
- **Labels:** type:feature, area:core, edition:community, pillar:erp, priority:p1, size:M
- **SPEC:** §4.3, §5.1
- **Depends on:** T2.3, T3.9, T3.18
- **Goal:** The expert introduces the data.
- **Acceptance:**
  - [ ] Overview: detected system, active modules, date coverage, companies and branches; 4–6 suggested questions from active pack starters
  - [ ] "What data do we have about X?" answered from the knowledge base without querying
  - [ ] Arabic criterion: overview and starters in Arabic when the UI is Arabic
- **Out of scope:** none.

#### [T3.14] Detected-system banner and admin override

- **Labels:** type:feature, area:web, edition:community, pillar:erp, priority:p1, size:S
- **SPEC:** §5.2
- **Depends on:** T2.3, T3.9
- **Goal:** Show what was detected and let an admin confirm or override.
- **Acceptance:**
  - [ ] Banner shows product, version, modules and best-effort warnings; override writes to config in Lite
  - [ ] Arabic criterion: localized and RTL
- **Out of scope:** Full-mode persistence (M4).

#### [T3.15] Provider settings: server env and bring-your-own-key

- **Issue:** #100
- **Labels:** type:feature, area:web, edition:community, pillar:privacy, priority:p0, size:M
- **SPEC:** §12, §10.3
- **Depends on:** T3.6, T1.19
- **Goal:** Choose provider and model in Lite mode.
- **Acceptance:**
  - [ ] Server providers listed without keys; BYOK held in the browser, sent per request, never logged or stored
  - [ ] Model roles with per-conversation override
  - [ ] Arabic criterion: localized and RTL
- **Out of scope:** capability probe (T4.28).

#### [T3.16] Lite audit log (JSONL / stdout)

- **Issue:** #101
- **Labels:** type:feature, area:storage, edition:community, pillar:privacy, priority:p0, size:S
- **SPEC:** §12, §13.2
- **Depends on:** T3.5, T1.16
- **Goal:** Every executed query is audited in Lite mode.
- **Acceptance:**
  - [ ] Audit fields per SPEC §13.2; no secrets or result data in audit lines (tested)
- **Out of scope:** audit UI.

#### [T3.17] Connector.profile for SQL sources

- **Issue:** #132
- **Labels:** type:feature, area:connectors, edition:community, priority:p1, size:M
- **SPEC:** §4.1, §7.1
- **Depends on:** T1.12, T1.14, T1.15
- **Goal:** Budgeted data profiling for Postgres, MariaDB/MySQL and SQL Server.
- **Acceptance:**
  - [ ] Null %, distinct counts, top-k, min/max and date coverage; sampled on large tables; per-connection time budget
  - [ ] Profiling queries go through the guard
- **Out of scope:** M6 sources.

#### [T3.18] Freshness, date coverage and value dictionaries

- **Issue:** #134
- **Labels:** type:feature, area:knowledge, edition:community, priority:p1, size:M
- **SPEC:** §4.1, §4.3
- **Depends on:** T3.17
- **Goal:** "Orders span 2024-01 to yesterday."
- **Acceptance:**
  - [ ] Freshness per table and value dictionaries for low-cardinality columns in the knowledge base and cards; scheduled refresh
- **Out of scope:** none.

#### [T3.19] Proactive caveats

- **Issue:** #135
- **Labels:** type:feature, area:core, edition:community, priority:p1, size:M
- **SPEC:** §4.3
- **Depends on:** T3.18, T2.8
- **Goal:** Stale data and partial periods surfaced alongside pack caveats.
- **Acceptance:**
  - [ ] Deterministic detection of stale data and partial periods (including partial Hijri months) fed to the prompt and shown
  - [ ] Eval questions cover partial-period and stale-table cases in both languages
- **Out of scope:** none.

### [E3.4] Arabic and GCC features

- **Labels:** type:epic, area:calendar, edition:community, pillar:gcc, priority:p0
- **Goal:** Hijri periods, regional seasonality, configurable weekends, VAT and e-invoicing metrics, and Gulf-dialect questions (SPEC §6).

#### [T3.20] Hijri conversion (Umm al-Qura) in `packages/calendar`

- **Labels:** type:feature, area:calendar, edition:community, pillar:gcc, priority:p0, size:M
- **SPEC:** §6
- **Depends on:** T0.2
- **Goal:** Verified Hijri ↔ Gregorian conversion.
- **Acceptance:**
  - [ ] ADR picks a verified, maintained library (license and accuracy checked against Umm al-Qura tables)
  - [ ] Dedicated tests around month boundaries, including Ramadan start and end for at least five years
- **Out of scope:** formatting (T3.21).

#### [T3.21] Hijri date display with Intl `islamic-umalqura`

- **Labels:** type:feature, area:calendar, edition:community, pillar:gcc, priority:p1, size:S
- **SPEC:** §6
- **Depends on:** T3.20, T3.2
- **Goal:** Display Hijri dates on request.
- **Acceptance:**
  - [ ] Formatting via `Intl` with the `islamic-umalqura` calendar; consistent with conversion results (tested)
  - [ ] Arabic criterion: Arabic month names render in RTL
- **Out of scope:** none.

#### [T3.22] Versioned events calendar

- **Labels:** type:feature, area:calendar, edition:community, pillar:gcc, priority:p0, size:M
- **SPEC:** §6
- **Depends on:** T3.20
- **Goal:** Ramadan, Eid al-Fitr, Eid al-Adha, Saudi National Day, Founding Day, White Friday and back-to-school, with organization additions.
- **Acceptance:**
  - [ ] Data-only, versioned event definitions; moving dates derived from the Hijri conversion, never hard-coded (rule 14)
  - [ ] Organization-defined events from config; English and Arabic names
- **Out of scope:** UI editing (M4).

#### [T3.23] Period resolution and the `resolve_period` tool

- **Labels:** type:feature, area:calendar, edition:community, pillar:gcc, priority:p0, size:M
- **SPEC:** §6, §8
- **Depends on:** T3.20, T3.22, T1.28
- **Goal:** Gregorian, Hijri and named-event periods to date ranges.
- **Acceptance:**
  - [ ] Resolves "Ramadan 1447", "last Ramadan", "this Ramadan vs last Ramadan", "Q3", "رمضان الماضي" and fiscal periods
  - [ ] Returns ranges plus a human-readable assumption for the answer
  - [ ] Unit tests in English and Arabic, including relative periods near year boundaries
- **Out of scope:** none.

#### [T3.24] Configurable week start and weekend

- **Labels:** type:feature, area:calendar, edition:community, pillar:gcc, priority:p1, size:S
- **SPEC:** §6
- **Depends on:** T3.6, T3.20
- **Goal:** Week and weekend semantics per organization (Saudi default Friday–Saturday).
- **Acceptance:**
  - [ ] Week start and weekend days from config, used by period resolution and "weekday vs weekend" metrics; no constants (rule 14)
- **Out of scope:** none.

#### [T3.25] Arabic questions over English schemas, including Gulf dialect

- **Labels:** type:feature, area:core, edition:community, pillar:gcc, priority:p0, size:M
- **SPEC:** §6, §1.4
- **Depends on:** T1.30, T2.19, T2.26
- **Goal:** Arabic accuracy reaches the v0.1 targets.
- **Acceptance:**
  - [ ] Prompt and retrieval tuned with Gulf-dialect phrasing added to both packs' golden sets
  - [ ] Arabic accuracy at least 80% on each pack with the reference model (SPEC §1.4); eval report in the PR
- **Out of scope:** speech input.

#### [T3.26] Odoo VAT metrics

- **Labels:** type:feature, area:packs, edition:community, pillar:gcc, priority:p0, size:M
- **SPEC:** §6, §5.3
- **Depends on:** T2.14
- **Goal:** Output VAT, input VAT and net payable per period from Odoo tax lines.
- **Acceptance:**
  - [ ] Rates read from the ERP tax configuration, never hard-coded; verified on the instance
  - [ ] At least 6 golden questions (at least 3 Arabic), including "كم ضريبة القيمة المضافة المستحقة هذا الربع؟"
- **Out of scope:** ZATCA (T3.29).

#### [T3.27] ERPNext VAT metrics

- **Labels:** type:feature, area:packs, edition:community, pillar:gcc, priority:p0, size:M
- **SPEC:** §6, §5.3
- **Depends on:** T2.23
- **Goal:** Output VAT, input VAT and net payable per period from ERPNext tax records.
- **Acceptance:**
  - [ ] Rates from ERP configuration; verified on the instance
  - [ ] At least 6 golden questions (at least 3 Arabic)
- **Out of scope:** ZATCA (T3.29).

#### [T3.28] Spike: ZATCA e-invoicing fields in Odoo and ERPNext localizations

- **Labels:** type:docs, area:packs, edition:community, pillar:gcc, priority:p2, size:S
- **SPEC:** §6
- **Depends on:** T0.14, T0.15
- **Goal:** Verify where each localization stores e-invoicing submission status.
- **Acceptance:**
  - [ ] Localization modules or apps installed in the dev stack (or the maintainer is asked, per CLAUDE.md, if not possible)
  - [ ] Field mappings per module and version documented with evidence from the running instance
- **Out of scope:** metrics (T3.29).

#### [T3.29] ZATCA compliance metrics

- **Labels:** type:feature, area:packs, edition:community, pillar:gcc, priority:p2, size:M
- **SPEC:** §6
- **Depends on:** T3.28
- **Goal:** Invoices pending, reported, cleared or rejected, where the ERP stores them.
- **Acceptance:**
  - [ ] Metrics only for verified localization versions; detection activates them only when the module is installed
  - [ ] Golden questions in English and Arabic
- **Out of scope:** submitting to ZATCA (no write-back, ever).

#### [T3.30] Hijri and seasonal golden questions and period-resolution metric

- **Labels:** type:test, area:evals, edition:community, pillar:gcc, priority:p1, size:S
- **SPEC:** §13.3, §6
- **Depends on:** T3.23, T1.33
- **Goal:** Measure Hijri and period-resolution accuracy.
- **Acceptance:**
  - [ ] Ramadan-vs-Ramadan and Eid questions on the retail dataset and both packs, in English and Arabic
  - [ ] Evals report period-resolution accuracy as a separate metric
- **Out of scope:** none.

### [E3.5] Excel export

- **Issue:** #34
- **Labels:** type:epic, area:exporters, edition:community, priority:p0
- **Goal:** Every answer or conversation exports to Excel with full data, RTL for Arabic.

#### [T3.31] Export service: re-execute, row limit and audit

- **Issue:** #139
- **Labels:** type:feature, area:exporters, edition:community, priority:p0, size:M
- **SPEC:** §11
- **Depends on:** T1.16
- **Goal:** Exports re-run the stored guarded query.
- **Acceptance:**
  - [ ] Re-executes up to the export limit (default 100k, configurable); every export audited; answer and conversation scopes
- **Out of scope:** formats.

#### [T3.32] Excel exporter

- **Issue:** #140
- **Labels:** type:feature, area:exporters, edition:community, pillar:gcc, priority:p0, size:M
- **SPEC:** §11
- **Depends on:** T3.31
- **Goal:** `exceljs` workbook with Summary, Data and Query sheets.
- **Acceptance:**
  - [ ] Summary includes definitions used and metadata; typed and formatted Data sheet with frozen header and autofilter
  - [ ] Arabic criterion: Arabic locale sets sheets right-to-left and Arabic text renders in Excel
- **Out of scope:** chart sheet (T3.34).

#### [T3.33] Chart server-side rendering (SVG and PNG)

- **Issue:** #141
- **Labels:** type:feature, area:charts, edition:community, priority:p0, size:M
- **SPEC:** §4.5, §11
- **Depends on:** T3.12
- **Goal:** ECharts SSR reusing the client option mapper.
- **Acceptance:**
  - [ ] SVG for all chart types; PNG rasterization (dependency justified)
  - [ ] Arabic criterion: Arabic labels render correctly in SVG and PNG
- **Out of scope:** none.

#### [T3.34] Excel chart sheet

- **Issue:** #142
- **Labels:** type:feature, area:exporters, edition:community, priority:p1, size:S
- **SPEC:** §11
- **Depends on:** T3.32, T3.33
- **Goal:** Embed the PNG chart in a Chart sheet.
- **Acceptance:**
  - [ ] One image per chart; sheet omitted when there are no charts
- **Out of scope:** native Excel charts.

#### [T3.35] Export UI (Excel)

- **Issue:** #146
- **Labels:** type:feature, area:web, edition:community, priority:p0, size:S
- **SPEC:** §11
- **Depends on:** T3.32
- **Goal:** Export buttons for an answer and a conversation.
- **Acceptance:**
  - [ ] Progress and error states
  - [ ] Arabic criterion: localized and RTL
- **Out of scope:** PDF (M4).

### [E3.6] Packaging and the v0.1.0 release

- **Issue:** #20
- **Labels:** type:epic, area:docker, edition:community, priority:p0
- **Goal:** Anyone can run v0.1.0 and get a correct answer on an Odoo demo database in under 10 minutes.

#### [T3.36] Production Docker image

- **Issue:** #102
- **Labels:** type:build, area:docker, edition:community, pillar:privacy, priority:p0, size:M
- **SPEC:** §12, §13.1
- **Depends on:** T3.8
- **Goal:** Small, non-root, multi-arch image.
- **Acceptance:**
  - [ ] Multi-stage build on Node 24 LTS; non-root; health check; mounts config, `semantic/`, `packs/` and `.cache/`
  - [ ] amd64 and arm64 builds in CI
- **Out of scope:** Chromium (T4.27).

#### [T3.37] Quickstart: first correct answer on Odoo in under 10 minutes

- **Issue:** #103
- **Labels:** type:docs, area:docs, edition:community, pillar:erp, priority:p0, size:S
- **SPEC:** §1.4, §12
- **Depends on:** T3.36, T2.19
- **Goal:** Hit the SPEC §1.4 time-to-first-answer target.
- **Acceptance:**
  - [ ] README quickstart with the ERP profile, a cloud or Ollama provider and a first question; timed run recorded in the PR
  - [ ] Arabic criterion: the quickstart includes an Arabic example question and its expected answer
- **Out of scope:** docs site (M6).

#### [T3.38] Publish images on release

- **Issue:** #104
- **Labels:** type:ci, area:ci, edition:community, priority:p1, size:S
- **SPEC:** §14
- **Depends on:** T3.36, T0.19
- **Goal:** Releases push images to GHCR.
- **Acceptance:**
  - [ ] Semver and `latest` tags with provenance and SBOM attestations
- **Out of scope:** other registries.

#### [T3.39] Read-only setup guides for v0.1 sources and ERPs

- **Issue:** #131
- **Labels:** type:docs, area:docs, edition:community, pillar:privacy, priority:p0, size:M
- **SPEC:** §7.2
- **Depends on:** T1.12, T1.14, T1.15, T0.16
- **Goal:** `docs/connectors/<source>.md` with least-privilege scripts.
- **Acceptance:**
  - [ ] Postgres, MariaDB/MySQL and SQL Server guides, plus read-only users for typical Odoo and ERPNext deployments
  - [ ] Every script tested against the dev stack (the init scripts reuse them)
- **Out of scope:** M6 sources (T6.24).

#### [T3.40] Recommended-models page

- **Labels:** type:docs, area:evals, edition:community, pillar:privacy, priority:p1, size:M
- **SPEC:** §10.4, §1.4
- **Depends on:** T2.11, T2.19, T2.26
- **Goal:** Publish measured pack accuracy per tested model, including local models.
- **Acceptance:**
  - [ ] Generated from `packs:eval` JSON per release: model, provider, English and Arabic accuracy per pack, latency and cost
  - [ ] Includes at least one local model via Ollama against the ≥65% target
- **Out of scope:** live leaderboards.

#### [T3.41] Data-flow documentation for privacy assessments

- **Labels:** type:docs, area:docs, edition:community, pillar:privacy, priority:p1, size:S
- **SPEC:** §6, §2, §4.4
- **Depends on:** T1.27
- **Goal:** Customers can assess data flows against their obligations.
- **Acceptance:**
  - [ ] Diagram and text: what reaches the LLM per privacy mode, what is stored where, and what leaves the premises with cloud vs local models
  - [ ] Makes no compliance certification claims; Arabic summary included
- **Out of scope:** certifications.

---

## M4 Full mode and builder (v0.2.0)

### [E4] M4 Full mode and builder

- **Issue:** #27
- **Labels:** type:epic, edition:community, priority:p0
- **Goal:** App DB, auth, roles, encrypted credentials, custom pack builder, verified queries, audit, privacy modes, PDF export and SSRF policy. Released as v0.2.0.

### [E4.1] App database and Full storage

- **Issue:** #22
- **Labels:** type:epic, area:storage, edition:community, priority:p0
- **Goal:** A Drizzle-backed app DB on Postgres + pgvector or SQLite + sqlite-vec.

#### [T4.1] ADR: app DB schema and migration strategy

- **Issue:** #105
- **Labels:** type:docs, area:storage, edition:community, priority:p0, size:S
- **SPEC:** §12
- **Depends on:** T3.5
- **Goal:** How Drizzle supports two engines and how migrations ship, with storage hooks for Enterprise tables.
- **Acceptance:**
  - [ ] ADR covering Drizzle version, dual-dialect schema, startup migrations, pgvector and sqlite-vec packaging, and how `ee/` adds tables without Community importing them
- **Out of scope:** implementation.

#### [T4.2] Drizzle schema v1 and migrations

- **Issue:** #106
- **Labels:** type:feature, area:storage, edition:community, priority:p0, size:M
- **SPEC:** §12
- **Depends on:** T4.1
- **Goal:** Tables for the Full feature set.
- **Acceptance:**
  - [ ] Users, workspaces, memberships, connections, provider credentials, conversations, messages, queries, semantic entities, packs state, verified queries, snapshots and `audit_log`
  - [ ] Migrations run on Postgres and SQLite in CI
- **Out of scope:** Enterprise tables.

#### [T4.3] Full StorageAdapter implementation

- **Issue:** #107
- **Labels:** type:feature, area:storage, edition:community, priority:p0, size:M
- **SPEC:** §12
- **Depends on:** T4.2
- **Goal:** Full adapter passes the shared storage contract suite.
- **Acceptance:**
  - [ ] All methods implemented; contract suite passes on Postgres and SQLite
  - [ ] The app DB can never be registered as an analyzed connection
- **Out of scope:** none.

#### [T4.4] Versioned knowledge snapshots with diff detection

- **Issue:** #108
- **Labels:** type:feature, area:knowledge, edition:community, priority:p1, size:M
- **SPEC:** §4.1, §12
- **Depends on:** T4.3
- **Goal:** Detect schema changes (for example ERP upgrades) between refreshes.
- **Acceptance:**
  - [ ] Snapshots with version and hash; table and column diffs; re-runs pack detection when the ERP version changes
- **Out of scope:** none.

#### [T4.5] Server-side, shareable chat history

- **Issue:** #109
- **Labels:** type:feature, area:web, edition:community, priority:p2, size:S
- **SPEC:** §12
- **Depends on:** T4.3, T4.7
- **Goal:** Conversations persist and can be shared within a workspace.
- **Acceptance:**
  - [ ] Stored conversations; sharing respects roles
  - [ ] Arabic criterion: shared view renders RTL conversations correctly
- **Out of scope:** public links.

### [E4.2] Authentication and roles

- **Issue:** #23
- **Labels:** type:epic, area:security, edition:community, priority:p0
- **Goal:** Users, workspaces and basic roles, with an auth-strategy extension point for Enterprise SSO.

#### [T4.6] ADR: authentication library and auth-strategy extension point

- **Issue:** #110
- **Labels:** type:docs, area:security, edition:community, priority:p0, size:S
- **SPEC:** §12, §3.2
- **Depends on:** T4.1
- **Goal:** Choose auth and define how SSO plugs in later (security-relevant; needs maintainer approval).
- **Acceptance:**
  - [ ] ADR compares candidates (maintenance, license, Drizzle support, OIDC/SAML extensibility), verified from current docs, approved by the maintainer
- **Out of scope:** implementation.

#### [T4.7] Users, sign-in and sessions

- **Issue:** #111
- **Labels:** type:feature, area:security, edition:community, priority:p0, size:M
- **SPEC:** §12
- **Depends on:** T4.6, T4.3
- **Goal:** Email and password sign-in with secure sessions.
- **Acceptance:**
  - [ ] First user becomes owner; hashing per ADR; CSRF protection; HttpOnly, Secure, SameSite cookies
  - [ ] Arabic criterion: localized and RTL auth screens
- **Out of scope:** SSO (M5).

#### [T4.8] Workspaces and basic roles

- **Issue:** #112
- **Labels:** type:feature, area:security, edition:community, priority:p0, size:M
- **SPEC:** §3.1, §12
- **Depends on:** T4.7
- **Goal:** `owner`, `admin`, `analyst` and `viewer` enforced server-side.
- **Acceptance:**
  - [ ] Permission matrix in one authorization module; invitations and member management
  - [ ] Tests that each route denies lower roles
  - [ ] Arabic criterion: member management localized and RTL
- **Out of scope:** row-level scoping (M5).

### [E4.3] Secrets and connection management

- **Issue:** #24
- **Labels:** type:epic, area:security, edition:community, pillar:privacy, priority:p0
- **Goal:** Credentials encrypted at rest and never returned to the browser.

#### [T4.9] AES-256-GCM secret encryption with key rotation

- **Issue:** #113
- **Labels:** type:feature, area:security, edition:community, pillar:privacy, priority:p0, size:M
- **SPEC:** §13.2
- **Depends on:** T4.2
- **Goal:** Encrypt DSNs and AI secrets with `APP_ENCRYPTION_KEY`.
- **Acceptance:**
  - [ ] Random IV, key-id prefix, decrypt with old keys and re-encrypt with current
  - [ ] Fails closed without a valid key in Full mode; tamper and rotation tests; independent security review
- **Out of scope:** KMS.

#### [T4.10] Connection management API and UI

- **Issue:** #114
- **Labels:** type:feature, area:web, edition:community, priority:p0, size:M
- **SPEC:** §7, §13.2, §5.2
- **Depends on:** T4.9, T4.8
- **Goal:** Admins add, test and edit connections; onboarding runs detection.
- **Acceptance:**
  - [ ] Policy (allowlists, masks, row cap, cost threshold, privacy mode); secrets write-only
  - [ ] Onboarding runs introspection and pack detection, and shows the detected system for confirmation
  - [ ] Arabic criterion: localized and RTL forms
- **Out of scope:** pack builder (E4.4).

#### [T4.11] Provider credential management

- **Issue:** #115
- **Labels:** type:feature, area:providers, edition:community, priority:p0, size:M
- **SPEC:** §10.3, §12
- **Depends on:** T4.9, T4.8
- **Goal:** Per-user and per-workspace encrypted provider credentials.
- **Acceptance:**
  - [ ] Catalog-driven forms; write-only secrets; workspace defaults per model role
  - [ ] Arabic criterion: localized and RTL
- **Out of scope:** M6 auth methods.

### [E4.4] Custom pack builder

- **Issue:** #25
- **Labels:** type:epic, area:packs, edition:community, pillar:erp, priority:p0
- **Goal:** Turn an unknown schema, such as a custom SQL Server POS, into a reviewed, exportable pack (SPEC §5.6).

#### [T4.12] Builder run: introspect and profile an unknown schema

- **Labels:** type:feature, area:packs, edition:community, pillar:erp, priority:p0, size:M
- **SPEC:** §5.6
- **Depends on:** T3.17, T4.3
- **Goal:** Start a builder session with structure and profiles.
- **Acceptance:**
  - [ ] Builder session persisted; introspection and profiling within budget; progress visible
  - [ ] Works end to end on the SQL Server retail dataset
- **Out of scope:** AI drafting (T4.13).

#### [T4.13] AI draft of entities, metrics, joins and synonyms

- **Issue:** #118
- **Labels:** type:feature, area:packs, edition:community, pillar:erp, priority:p0, size:M
- **SPEC:** §5.6, §4.4
- **Depends on:** T4.12
- **Goal:** The AI proposes pack content; nothing is accepted without review.
- **Acceptance:**
  - [ ] Drafts entities, metric templates, logical joins and English and Arabic synonyms, respecting privacy mode
  - [ ] Drafts validated against the pack schema and verified against the live schema before review
- **Out of scope:** review UI (T4.14).

#### [T4.14] Review and approval UI

- **Issue:** #116
- **Labels:** type:feature, area:web, edition:community, pillar:erp, priority:p0, size:M
- **SPEC:** §5.6, §4.1
- **Depends on:** T4.13
- **Goal:** A human reviews and approves each drafted item.
- **Acceptance:**
  - [ ] Per-item approve, edit or reject for entities, metrics, joins and synonyms; edit history kept
  - [ ] Arabic criterion: Arabic synonyms editable with correct RTL input
- **Out of scope:** none.

#### [T4.15] Golden question authoring in the builder

- **Labels:** type:feature, area:packs, edition:community, pillar:erp, priority:p1, size:S
- **SPEC:** §5.6, §5.5
- **Depends on:** T4.14
- **Goal:** Users write or approve golden questions with expected results.
- **Acceptance:**
  - [ ] Capture question, language and reference query; expected results computed and stored
  - [ ] Arabic criterion: Arabic questions supported and counted toward the 30% guideline
- **Out of scope:** none.

#### [T4.16] Export and import packs as folders

- **Labels:** type:feature, area:packs, edition:community, pillar:erp, priority:p0, size:S
- **SPEC:** §5.6, §12
- **Depends on:** T4.14
- **Goal:** A builder session exports to a pack folder that can be versioned in git.
- **Acceptance:**
  - [ ] Export produces a valid pack (passes the loader); import round-trips losslessly (tested)
- **Out of scope:** private pack publishing (M5).

#### [T4.17] User corrections become semantic-layer proposals

- **Labels:** type:feature, area:knowledge, edition:community, priority:p1, size:S
- **SPEC:** §4.3
- **Depends on:** T4.14
- **Goal:** Corrections in chat create proposals, never silent changes.
- **Acceptance:**
  - [ ] "Sales excludes returns" creates a proposal reviewable in the builder UI; nothing persisted without approval
  - [ ] Arabic criterion: corrections in Arabic produce proposals with Arabic text intact
- **Out of scope:** none.

### [E4.5] Verified queries and retrieval

- **Issue:** #32
- **Labels:** type:epic, area:knowledge, edition:community, priority:p1
- **Goal:** Learn from good answers and improve retrieval.

#### [T4.18] Verified queries: feedback UI and retrieval boost

- **Issue:** #117
- **Labels:** type:feature, area:knowledge, edition:community, priority:p1, size:M
- **SPEC:** §4.1, §4.2
- **Depends on:** T4.3, T1.25
- **Goal:** Build the verified-query library.
- **Acceptance:**
  - [ ] Thumbs up or down and "save as verified", approved by an analyst or higher; `search_verified_queries` backed by the library; retrieval boost
  - [ ] Arabic criterion: Arabic questions match verified English questions and vice versa
- **Out of scope:** none.

#### [T4.19] Hybrid retrieval: embeddings and reciprocal rank fusion

- **Issue:** #137
- **Labels:** type:feature, area:knowledge, edition:community, pillar:privacy, priority:p1, size:M
- **SPEC:** §4.2, §10.4
- **Depends on:** T1.25, T4.3
- **Goal:** Vector similarity when an embedding model is configured, including local embeddings.
- **Acceptance:**
  - [ ] In-memory vectors (Lite) and pgvector or sqlite-vec (Full); RRF with BM25
  - [ ] Context recall before and after in evals, in both languages
- **Out of scope:** none.

#### [T4.20] Insights journal and `note_insight`

- **Issue:** #136
- **Labels:** type:feature, area:knowledge, edition:community, priority:p3, size:S
- **SPEC:** §4.1, §8
- **Depends on:** T3.5
- **Goal:** Remember notable findings.
- **Acceptance:**
  - [ ] `note_insight` persists via the StorageAdapter; relevant insights surface in later conversations
- **Out of scope:** none.

### [E4.6] Privacy modes

- **Issue:** #33
- **Labels:** type:epic, area:security, edition:community, pillar:privacy, priority:p0
- **Goal:** Admins control what the LLM sees per connection.

#### [T4.21] Privacy mode enforcement

- **Issue:** #138
- **Labels:** type:feature, area:core, edition:community, pillar:privacy, priority:p0, size:M
- **SPEC:** §4.4, §2
- **Depends on:** T1.27, T3.18
- **Goal:** `full`, `aggregate` and `schema-only` enforced everywhere data reaches prompts.
- **Acceptance:**
  - [ ] Profiler, cards, sample values, overview, pack builder drafting and value dictionaries respect the mode
  - [ ] `schema-only`: no data values anywhere; the app renders the query and chart
  - [ ] Tests assert prompt payloads per mode; Arabic criterion: the mode indicator is localized
- **Out of scope:** none.

### [E4.7] Audit, SSRF and rate limits

- **Issue:** #26
- **Labels:** type:epic, area:security, edition:community, priority:p0
- **Goal:** Operational security for multi-user deployments.

#### [T4.22] `audit_log` table and viewer

- **Issue:** #119
- **Labels:** type:feature, area:security, edition:community, pillar:privacy, priority:p0, size:M
- **SPEC:** §13.2, §12
- **Depends on:** T4.3, T4.8
- **Goal:** Every query audited in the DB; admins review it.
- **Acceptance:**
  - [ ] Audit sink writes SPEC §13.2 fields; admin-only filterable viewer
  - [ ] Arabic criterion: viewer localized and RTL
- **Out of scope:** audit export and retention (M5).

#### [T4.23] SSRF policy for database hosts and AI base URLs

- **Issue:** #120
- **Labels:** type:feature, area:security, edition:community, priority:p0, size:M
- **SPEC:** §13.2
- **Depends on:** T4.10, T4.11
- **Goal:** Block private, loopback, link-local and metadata targets unless an admin allows them.
- **Acceptance:**
  - [ ] Checks every resolved IP at connect time (IPv4, IPv6, mapped); admin allow-ranges; defaults per deployment mode documented
  - [ ] Adversarial tests (DNS rebinding, decimal and octal IPs, IPv6 forms); independent security review
- **Out of scope:** egress proxy.

#### [T4.24] Rate limiting per user and per connection

- **Issue:** #121
- **Labels:** type:feature, area:security, edition:community, priority:p1, size:S
- **SPEC:** §13.2
- **Depends on:** T4.8
- **Goal:** Protect databases and budgets.
- **Acceptance:**
  - [ ] Configurable limits on chat and executions; localized 429 responses (English and Arabic)
- **Out of scope:** distributed rate limiting.

### [E4.8] PDF export

- **Labels:** type:epic, area:exporters, edition:community, pillar:gcc, priority:p0
- **Goal:** Arabic PDF reports that render correctly (SPEC §11).

#### [T4.25] PDF report template

- **Issue:** #143
- **Labels:** type:feature, area:exporters, edition:community, pillar:gcc, priority:p0, size:M
- **SPEC:** §11
- **Depends on:** T3.33
- **Goal:** HTML report with correct Arabic shaping and bidi.
- **Acceptance:**
  - [ ] Embedded Latin and Arabic fonts; branded header with a white-label hook for Enterprise; truncated table pointing to Excel
  - [ ] Arabic criterion: visual snapshot tests in English and Arabic
- **Out of scope:** Chromium runtime (T4.26).

#### [T4.26] PDF rendering with Playwright and feature flag

- **Issue:** #144
- **Labels:** type:feature, area:exporters, edition:community, priority:p0, size:M
- **SPEC:** §11
- **Depends on:** T4.25
- **Goal:** Headless Chromium renders the template.
- **Acceptance:**
  - [ ] Page numbers; auto-disabled with a clear localized message (English and Arabic) when Chromium is unavailable
- **Out of scope:** none.

#### [T4.27] Chromium in the production image and PDF export UI

- **Issue:** #145
- **Labels:** type:build, area:docker, edition:community, priority:p1, size:S
- **SPEC:** §11
- **Depends on:** T4.26, T3.36, T3.35
- **Goal:** The official image supports PDF export, and the UI offers it.
- **Acceptance:**
  - [ ] Chromium in the image (size impact in PR), sandboxed, non-root; PDF button added to the export UI
- **Out of scope:** none.

### [E4.9] Model management

- **Issue:** #38
- **Labels:** type:epic, area:providers, edition:community, pillar:privacy, priority:p1
- **Goal:** Discover models, probe capabilities and track cost.

#### [T4.28] Model discovery and capability probe

- **Issue:** #155
- **Labels:** type:feature, area:providers, edition:community, pillar:privacy, priority:p1, size:M
- **SPEC:** §10.4
- **Depends on:** T1.19, T1.20, T4.11
- **Goal:** List models and probe them with "Test connection".
- **Acceptance:**
  - [ ] List endpoints where available, manual entry otherwise; probe covers completion, tools, structured output and streaming; badges; drives loop vs fixed pipeline
  - [ ] Arabic criterion: badges and results localized
- **Out of scope:** none.

#### [T4.29] Token usage and cost tracking

- **Issue:** #156
- **Labels:** type:feature, area:providers, edition:community, priority:p1, size:M
- **SPEC:** §10.4
- **Depends on:** T4.3
- **Goal:** Usage and estimated cost per message.
- **Acceptance:**
  - [ ] Prices from the catalog, editable by users; per-message and per-workspace totals
  - [ ] Arabic criterion: currency and numbers formatted per locale and digit preference
- **Out of scope:** billing.

---

## M5 Enterprise foundations (v0.3.0)

### [E5] M5 Enterprise foundations

- **Issue:** #31
- **Labels:** type:epic, edition:enterprise, priority:p0
- **Goal:** License keys, SSO, row-level company/branch scoping, scheduled reports and alerts, white-label, partner console and the first premium pack (advanced accounting). Released as v0.3.0.

### [E5.1] Extension points and license keys

- **Labels:** type:epic, area:ee, edition:enterprise, priority:p0
- **Goal:** Enterprise features plug in through Community extension points and activate with an offline-verifiable key.

#### [T5.1] Extension points: plugin registry and hooks (Community)

- **Labels:** type:feature, area:core, edition:community, priority:p0, size:M
- **SPEC:** §3.2
- **Depends on:** T4.3, T4.6, T2.2
- **Goal:** One registry through which `ee/` attaches storage hooks, auth strategies, pack loaders and UI slots.
- **Acceptance:**
  - [ ] ADR for the plugin contract; registry in Community code; no Community import of `ee/` (lint passes)
  - [ ] Without any plugin, every Community feature works (test)
- **Out of scope:** Enterprise features.

#### [T5.2] License key verification (Ed25519, offline)

- **Labels:** type:feature, area:ee, edition:enterprise, priority:p0, size:M
- **SPEC:** §3.2
- **Depends on:** T5.1
- **Goal:** Verify a signed JSON payload offline and expose entitlements.
- **Acceptance:**
  - [ ] Ed25519 signature over a JSON payload (customer, edition, features, expiry); public key embedded; verified with a maintained library
  - [ ] Invalid, expired or tampered keys degrade to Community with a clear message; nothing breaks
  - [ ] Independent security review (stop-and-ask: license-key verification)
- **Out of scope:** key issuance service.

#### [T5.3] Feature gating and license administration UI

- **Labels:** type:feature, area:ee, edition:enterprise, priority:p1, size:S
- **SPEC:** §3.1, §3.2
- **Depends on:** T5.2
- **Goal:** Admins install a key and see entitlements.
- **Acceptance:**
  - [ ] Upload or paste key; entitlement and expiry display; gated features hidden or explained
  - [ ] Arabic criterion: localized and RTL
- **Out of scope:** none.

### [E5.2] SSO and SCIM

- **Labels:** type:epic, area:ee, edition:enterprise, priority:p0
- **Goal:** Enterprise identity integration.

#### [T5.4] OIDC single sign-on

- **Labels:** type:feature, area:ee, edition:enterprise, priority:p0, size:M
- **SPEC:** §3.1
- **Depends on:** T5.2, T4.7
- **Goal:** OIDC via the auth-strategy extension point.
- **Acceptance:**
  - [ ] Login, role mapping from claims, just-in-time provisioning; tested against a local IdP
  - [ ] Arabic criterion: SSO login flow localized
- **Out of scope:** SAML (T5.5).

#### [T5.5] SAML single sign-on

- **Labels:** type:feature, area:ee, edition:enterprise, priority:p1, size:M
- **SPEC:** §3.1
- **Depends on:** T5.4
- **Goal:** SAML 2.0 via the same auth-strategy point.
- **Acceptance:**
  - [ ] SP metadata, signed assertions validated with a maintained library; independent security review
- **Out of scope:** none.

#### [T5.6] SCIM user provisioning

- **Labels:** type:feature, area:ee, edition:enterprise, priority:p2, size:M
- **SPEC:** §3.1
- **Depends on:** T5.4
- **Goal:** Provision and deprovision users and groups.
- **Acceptance:**
  - [ ] SCIM 2.0 Users and Groups endpoints with token auth; deprovisioning revokes sessions
- **Out of scope:** none.

### [E5.3] Row-level scoping

- **Labels:** type:epic, area:ee, edition:enterprise, pillar:erp, priority:p0
- **Goal:** Restrict users to companies, branches or warehouses.

#### [T5.7] Scoping policy model

- **Labels:** type:feature, area:ee, edition:enterprise, pillar:erp, priority:p0, size:M
- **SPEC:** §3.1
- **Depends on:** T5.2, T4.8, T2.1
- **Goal:** Define scopes per user or role using pack dimensions (company, branch, warehouse).
- **Acceptance:**
  - [ ] Scope definitions reference pack dimensions; admin UI to assign scopes
  - [ ] Arabic criterion: localized and RTL
- **Out of scope:** enforcement (T5.8).

#### [T5.8] Scoping enforcement in the query pipeline

- **Labels:** type:feature, area:ee, edition:enterprise, pillar:erp, priority:p0, size:M
- **SPEC:** §3.1, §9
- **Depends on:** T5.7, T1.16
- **Goal:** Every query is restricted to the user's scope, with no bypass.
- **Acceptance:**
  - [ ] Scope predicates injected structurally via a guard extension hook; queries the hook cannot scope are rejected
  - [ ] Adversarial fixtures for scope bypass; independent security review
- **Out of scope:** none.

### [E5.4] Scheduled reports and alerts

- **Labels:** type:epic, area:ee, edition:enterprise, priority:p1
- **Goal:** Deliver answers and alerts on a schedule.

#### [T5.9] Report scheduler

- **Issue:** #160
- **Labels:** type:feature, area:ee, edition:enterprise, priority:p1, size:M
- **SPEC:** §3.1
- **Depends on:** T5.2, T3.31
- **Goal:** Re-run saved answers on a schedule without the LLM.
- **Acceptance:**
  - [ ] Cron-like schedules in the org's timezone, including Hijri-aware periods; audited runs
  - [ ] Arabic criterion: schedule UI localized and RTL
- **Out of scope:** delivery channels (T5.10, T5.11).

#### [T5.10] Email delivery

- **Labels:** type:feature, area:ee, edition:enterprise, priority:p1, size:S
- **SPEC:** §3.1
- **Depends on:** T5.9
- **Goal:** Send scheduled exports by email.
- **Acceptance:**
  - [ ] SMTP config; Excel and PDF attachments; Arabic emails render RTL
- **Out of scope:** none.

#### [T5.11] Slack, Teams and webhook delivery

- **Labels:** type:feature, area:ee, edition:enterprise, priority:p2, size:M
- **SPEC:** §3.1
- **Depends on:** T5.9
- **Goal:** Deliver to chat tools and webhooks.
- **Acceptance:**
  - [ ] Channel integrations verified against current official APIs; webhook signatures; SSRF policy applied
- **Out of scope:** none.

#### [T5.12] Threshold alerts

- **Labels:** type:feature, area:ee, edition:enterprise, priority:p2, size:M
- **SPEC:** §3.1
- **Depends on:** T5.9
- **Goal:** Notify when a metric crosses a threshold.
- **Acceptance:**
  - [ ] Alert rules on pack metrics; evaluated on schedule; delivered via configured channels
  - [ ] Arabic criterion: alert messages in the recipient's language
- **Out of scope:** anomaly detection.

### [E5.5] White-label

- **Labels:** type:epic, area:ee, edition:enterprise, priority:p2
- **Goal:** Custom branding on UI and exports.

#### [T5.13] White-label UI branding

- **Labels:** type:feature, area:ee, edition:enterprise, priority:p2, size:S
- **SPEC:** §3.1
- **Depends on:** T5.2, T5.1
- **Goal:** Logo, name and colors via a UI extension slot.
- **Acceptance:**
  - [ ] Branding applied in LTR and RTL layouts
- **Out of scope:** exports (T5.14).

#### [T5.14] White-label exports

- **Labels:** type:feature, area:ee, edition:enterprise, priority:p2, size:S
- **SPEC:** §3.1, §11
- **Depends on:** T5.13, T4.25
- **Goal:** Branded PDF headers and Excel summary.
- **Acceptance:**
  - [ ] Branding hook in exporters used by `ee/`; Arabic PDF verified with branding
- **Out of scope:** none.

### [E5.6] Partner console

- **Labels:** type:epic, area:ee, edition:enterprise, pillar:erp, priority:p1
- **Goal:** ERP partners manage many client workspaces and share packs.

#### [T5.15] Multi-client workspaces

- **Labels:** type:feature, area:ee, edition:enterprise, pillar:erp, priority:p1, size:M
- **SPEC:** §3.1, §1.1
- **Depends on:** T5.2, T4.8
- **Goal:** A partner account manages multiple client workspaces.
- **Acceptance:**
  - [ ] Partner role across workspaces with strict tenant isolation (tested); client switcher
  - [ ] Arabic criterion: localized and RTL
- **Out of scope:** billing.

#### [T5.16] Private pack publishing across client workspaces

- **Labels:** type:feature, area:ee, edition:enterprise, pillar:erp, priority:p1, size:M
- **SPEC:** §5.6, §3.1
- **Depends on:** T5.15, T4.16
- **Goal:** Partners deploy their packs to client workspaces.
- **Acceptance:**
  - [ ] Publish a pack version to selected clients; versioned rollout and rollback; audited
- **Out of scope:** public pack marketplace.

### [E5.7] Audit export and retention

- **Labels:** type:epic, area:ee, edition:enterprise, pillar:privacy, priority:p2
- **Goal:** Compliance teams get audit data out and control retention.

#### [T5.17] Audit export and retention policies

- **Labels:** type:feature, area:ee, edition:enterprise, pillar:privacy, priority:p2, size:M
- **SPEC:** §3.1
- **Depends on:** T5.2, T4.22
- **Goal:** Export audit logs and enforce retention.
- **Acceptance:**
  - [ ] CSV and JSONL export; retention policy purges on schedule (audited)
  - [ ] Arabic criterion: localized settings UI
- **Out of scope:** SIEM connectors.

### [E5.8] Premium pack: advanced accounting

- **Labels:** type:epic, area:packs, edition:enterprise, pillar:erp, priority:p1
- **Goal:** The first premium pack in `packs-ee/`, starting with Odoo.

#### [T5.18] Aged receivables and payables

- **Labels:** type:feature, area:packs, edition:enterprise, pillar:erp, priority:p1, size:M
- **SPEC:** §3.1, §5.3
- **Depends on:** T5.2, T2.14
- **Goal:** Aging buckets for receivables and payables.
- **Acceptance:**
  - [ ] Metrics verified on the Odoo instance; at least 6 golden questions (at least 2 Arabic)
- **Out of scope:** ERPNext version (follow-up issue).

#### [T5.19] Cash flow

- **Labels:** type:feature, area:packs, edition:enterprise, pillar:erp, priority:p1, size:M
- **SPEC:** §3.1, §5.3
- **Depends on:** T5.18
- **Goal:** Cash inflows and outflows by period and account.
- **Acceptance:**
  - [ ] Verified on the instance; at least 6 golden questions (at least 2 Arabic)
- **Out of scope:** forecasting.

#### [T5.20] Multi-company consolidation

- **Labels:** type:feature, area:packs, edition:enterprise, pillar:erp, priority:p2, size:M
- **SPEC:** §3.1, §5.3
- **Depends on:** T5.18
- **Goal:** Consolidated figures across companies with currency conversion.
- **Acceptance:**
  - [ ] Inter-company eliminations documented; verified on a multi-company demo setup; golden questions in both languages
- **Out of scope:** none.

---

## M6 Breadth (v1.0.0)

### [E6] M6 Breadth

- **Issue:** #35
- **Labels:** type:epic, edition:community, priority:p0
- **Goal:** Oracle, MongoDB, SQLite; cloud-native provider auth and remaining native SDKs; dashboards; performance and security hardening; docs site. Not started before v0.2.0 ships.

### [E6.1] Oracle

- **Issue:** #28
- **Labels:** type:epic, area:connectors, edition:community, priority:p1
- **Goal:** Oracle 12c+ in Thin mode.

#### [T6.1] Oracle connector (Thin mode, 12c+)

- **Issue:** #124
- **Labels:** type:feature, area:connectors, edition:community, priority:p1, size:M
- **SPEC:** §7.2
- **Depends on:** T6.3, T6.2
- **Goal:** `oracledb` Thin mode connector.
- **Acceptance:**
  - [ ] `SET TRANSACTION READ ONLY` plus `callTimeout`; rejects versions below 12c at `test()` with a clear message
  - [ ] Introspection via `ALL_*` views scoped to allowed schemas; conformance suite passes
- **Out of scope:** Thick mode.

#### [T6.2] Oracle guard rules and fixtures

- **Labels:** type:feature, area:guard, edition:community, pillar:privacy, priority:p1, size:S
- **SPEC:** §9.1, §9.4
- **Depends on:** T1.10
- **Goal:** Oracle blocklist, `FETCH FIRST` row cap and adversarial fixtures.
- **Acceptance:**
  - [ ] `DBMS_*`, `UTL_*`, `EXECUTE IMMEDIATE` blocked; row cap rewrite; 100% branch coverage kept
- **Out of scope:** none.

#### [T6.3] Oracle dev service, seed and CI job

- **Labels:** type:build, area:docker, edition:community, priority:p1, size:S
- **SPEC:** §7.2, §13.3
- **Depends on:** T0.13
- **Goal:** Oracle Free behind a compose profile with the retail seed, and a nightly/`ci:oracle` job.
- **Acceptance:**
  - [ ] Verified image tag; read-only user with per-table grants (never `ANY` privileges); seed row counts match; CI job runs the conformance suite
- **Out of scope:** none.

### [E6.2] MongoDB

- **Issue:** #29
- **Labels:** type:epic, area:connectors, edition:community, priority:p1
- **Goal:** Document sources with aggregation-only guard rules.

#### [T6.4] MongoDB guard rules

- **Issue:** #125
- **Labels:** type:feature, area:guard, edition:community, pillar:privacy, priority:p1, size:M
- **SPEC:** §9.3
- **Depends on:** T1.5
- **Goal:** Guard aggregation pipelines.
- **Acceptance:**
  - [ ] Zod pipeline shape; stage allowlist; lookups only against allowlisted collections; blocked operators anywhere; `$limit` and `maxTimeMS`
- **Out of scope:** none.

#### [T6.5] MongoDB guard adversarial fixtures

- **Issue:** #126
- **Labels:** type:test, area:guard, edition:community, pillar:privacy, priority:p1, size:S
- **SPEC:** §9.4
- **Depends on:** T6.4
- **Goal:** SPEC §9.4 coverage for Mongo.
- **Acceptance:**
  - [ ] `$out` inside `$facet`, nested operators, unicode lookalike keys and `$lookup` sub-pipelines; 100% branch coverage kept
- **Out of scope:** none.

#### [T6.6] MongoDB dev service and retail seed

- **Issue:** #54
- **Labels:** type:build, area:docker, edition:community, priority:p1, size:S
- **SPEC:** §13.3
- **Depends on:** T0.11
- **Goal:** MongoDB in the dev stack with order lines embedded in orders, and a CI job.
- **Acceptance:**
  - [ ] Verified image; `read`-role user; counts match SQL seeds; CI integration job
- **Out of scope:** none.

#### [T6.7] MongoDB connector with schema inference

- **Issue:** #127
- **Labels:** type:feature, area:connectors, edition:community, priority:p1, size:M
- **SPEC:** §7.2, §4.1
- **Depends on:** T6.4, T6.6, T1.3
- **Goal:** `mongodb` connector.
- **Acceptance:**
  - [ ] `aggregate` only; `maxTimeMS`; schema inference via `$sample` (paths, types, presence %); conformance suite passes
- **Out of scope:** change streams.

#### [T6.8] Agent support for Mongo pipelines

- **Issue:** #128
- **Labels:** type:feature, area:core, edition:community, priority:p2, size:M
- **SPEC:** §8, §7.1
- **Depends on:** T6.7
- **Goal:** The agent writes and self-corrects pipelines.
- **Acceptance:**
  - [ ] Prompt and tool support for `QueryIR` kind `mongo`; query panel shows pipelines; at least 10 Mongo golden questions (at least 3 Arabic)
- **Out of scope:** none.

#### [T6.9] Connector.profile for MongoDB

- **Issue:** #133
- **Labels:** type:feature, area:connectors, edition:community, priority:p2, size:S
- **SPEC:** §4.1
- **Depends on:** T6.7
- **Goal:** Profile layer for document sources.
- **Acceptance:**
  - [ ] Field-path stats via guarded pipelines within budget
- **Out of scope:** none.

### [E6.3] SQLite

- **Issue:** #30
- **Labels:** type:epic, area:connectors, edition:community, priority:p2
- **Goal:** Demo-friendly SQLite.

#### [T6.10] SQLite connector

- **Issue:** #129
- **Labels:** type:feature, area:connectors, edition:community, priority:p2, size:S
- **SPEC:** §7.2
- **Depends on:** T1.3
- **Goal:** `better-sqlite3` connector opened read-only.
- **Acceptance:**
  - [ ] Read-only flag; `LIMIT`; conformance suite passes
- **Out of scope:** none.

#### [T6.11] SQLite demo dataset file

- **Issue:** #130
- **Labels:** type:feature, area:docker, edition:community, priority:p3, size:S
- **SPEC:** §13.3
- **Depends on:** T0.11, T6.10
- **Goal:** A zero-setup demo database.
- **Acceptance:**
  - [ ] `--target sqlite` produces a demo file; documented as a no-Docker path
- **Out of scope:** none.

### [E6.4] Remaining native SDKs and provider resilience

- **Issue:** #36
- **Labels:** type:epic, area:providers, edition:community, priority:p1
- **Goal:** Native SDK providers beyond v0.1, plus retries and fallbacks.

#### [T6.12] Remaining native AI SDK providers

- **Issue:** #147
- **Labels:** type:feature, area:providers, edition:community, priority:p2, size:M
- **SPEC:** §10.2
- **Depends on:** T1.20
- **Goal:** Mistral, xAI, Cohere, Cerebras, DeepInfra, Perplexity and others with native packages.
- **Acceptance:**
  - [ ] Each entry verified with `docsUrl` and `lastVerified`; recorded-response tests
- **Out of scope:** cloud-native auth (E6.5).

#### [T6.13] Retries, rate limits and fallback models

- **Issue:** #157
- **Labels:** type:feature, area:providers, edition:community, priority:p1, size:M
- **SPEC:** §10.4
- **Depends on:** T1.17
- **Goal:** Resilient provider calls.
- **Acceptance:**
  - [ ] Backoff with jitter; per-provider rate limits; optional fallback model per role, recorded on the answer
- **Out of scope:** none.

### [E6.5] Cloud-native provider authentication

- **Issue:** #37
- **Labels:** type:epic, area:providers, edition:community, priority:p1
- **Goal:** Azure OpenAI, Bedrock and Vertex AI, plus OAuth and command auth.

#### [T6.14] Azure OpenAI with key or Entra ID

- **Issue:** #150
- **Labels:** type:feature, area:providers, edition:community, priority:p1, size:M
- **SPEC:** §10.3
- **Depends on:** T6.12
- **Goal:** Azure OpenAI with an API key or an Entra ID token.
- **Acceptance:**
  - [ ] Both modes with token refresh; secrets encrypted
- **Out of scope:** none.

#### [T6.15] Amazon Bedrock auth

- **Issue:** #151
- **Labels:** type:feature, area:providers, edition:community, priority:p1, size:M
- **SPEC:** §10.3
- **Depends on:** T6.12
- **Goal:** Access keys, session token, credential chain or named profile.
- **Acceptance:**
  - [ ] All credential sources supported and documented
- **Out of scope:** none.

#### [T6.16] Google Vertex AI auth

- **Issue:** #152
- **Labels:** type:feature, area:providers, edition:community, priority:p1, size:S
- **SPEC:** §10.3
- **Depends on:** T6.12
- **Goal:** Service-account JSON or ADC.
- **Acceptance:**
  - [ ] Both modes; service-account JSON stored encrypted
- **Out of scope:** none.

#### [T6.17] OAuth client credentials for gateways

- **Issue:** #153
- **Labels:** type:feature, area:providers, edition:community, priority:p2, size:M
- **SPEC:** §10.3
- **Depends on:** T1.22
- **Goal:** Enterprise gateways with token caching.
- **Acceptance:**
  - [ ] Token endpoint subject to SSRF policy; cached until expiry; refresh on 401
- **Out of scope:** none.

#### [T6.18] Command-based token auth (Lite only)

- **Issue:** #154
- **Labels:** type:feature, area:providers, edition:community, priority:p3, size:S
- **SPEC:** §10.3
- **Depends on:** T1.19
- **Goal:** A configured local command prints a short-lived token.
- **Acceptance:**
  - [ ] Disabled by default; Lite only; no shell interpolation; timeout; independent security review
- **Out of scope:** none.

### [E6.6] Saved answers and dashboards

- **Issue:** #39
- **Labels:** type:epic, area:web, edition:community, priority:p2
- **Goal:** Re-run stored queries without the LLM.

#### [T6.19] Saved answers

- **Issue:** #158
- **Labels:** type:feature, area:web, edition:community, priority:p2, size:S
- **SPEC:** §1.3, §14
- **Depends on:** T4.3
- **Goal:** Pin answers and refresh them via the stored guarded query.
- **Acceptance:**
  - [ ] Save, list and refresh; Arabic criterion: saved answers keep their language and RTL layout
- **Out of scope:** none.

#### [T6.20] Dashboards

- **Issue:** #159
- **Labels:** type:feature, area:web, edition:community, priority:p2, size:M
- **SPEC:** §1.3, §14
- **Depends on:** T6.19
- **Goal:** Grids of saved charts re-run without the LLM (a convenience, not a BI replacement).
- **Acceptance:**
  - [ ] Create, arrange and share; role-aware; Arabic criterion: RTL grid layout
- **Out of scope:** none.

### [E6.7] Hardening and docs

- **Issue:** #40
- **Labels:** type:epic, area:security, edition:community, priority:p0
- **Goal:** v1.0 quality: fast, secure and documented.

#### [T6.21] Threat model and security hardening pass

- **Issue:** #161
- **Labels:** type:feature, area:security, edition:community, pillar:privacy, priority:p0, size:M
- **SPEC:** §13.2, §2
- **Depends on:** T4.23, T4.21
- **Goal:** Documented threat model with findings fixed or ticketed.
- **Acceptance:**
  - [ ] Covers prompt injection, guard bypass, pack tampering, SSRF, secrets, license keys and authz; CSP and security headers
- **Out of scope:** third-party pentest.

#### [T6.22] Performance pass

- **Issue:** #162
- **Labels:** type:perf, area:core, edition:community, priority:p1, size:M
- **SPEC:** §1.4, §13.3
- **Depends on:** T4.19
- **Goal:** Measure and fix hot spots.
- **Acceptance:**
  - [ ] Benchmarks on Odoo-scale schemas, pool reuse and first-token latency; median latency against the SPEC §1.4 target tracked in evals
- **Out of scope:** none.

#### [T6.23] Documentation site

- **Issue:** #163
- **Labels:** type:docs, area:docs, edition:community, priority:p1, size:M
- **SPEC:** §13.1
- **Depends on:** T3.39, T3.40
- **Goal:** Published docs built from `docs/`.
- **Acceptance:**
  - [ ] Generator chosen via ADR; getting started, packs, connectors, providers, editions, security; Arabic getting-started pages; deployed by CI
- **Out of scope:** none.

#### [T6.24] Read-only setup guides for M6 sources

- **Labels:** type:docs, area:docs, edition:community, pillar:privacy, priority:p1, size:S
- **SPEC:** §7.2
- **Depends on:** T6.1, T6.7, T6.10
- **Goal:** `docs/connectors/` guides for Oracle, MongoDB and SQLite.
- **Acceptance:**
  - [ ] Scripts tested against the dev stack; Oracle grants never use `ANY` privileges
- **Out of scope:** none.
