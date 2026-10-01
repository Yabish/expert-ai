# Backlog

> **Status: approved 2026-10-01.** `scripts/gh/sync-backlog.mjs` turns this file into GitHub issues.
> This file is the source for the *initial* issues. After sync, GitHub issues are the source of truth; edit issues there, not here.

## Format (parsed by `scripts/gh/sync-backlog.mjs`)

- `## Mx Name`: a milestone. Each milestone has one **milestone epic** (`[Ex]`) that lists its capability epics.
- `### [Ex.y] Title`: a capability epic. Its task list is generated from the tasks under it.
- `#### [Tx.y] Title`: a task. Fields: **Labels**, **SPEC**, **Depends on** (task IDs, resolved to `#N` on sync), **Goal**, **Acceptance**, **Out of scope**.
- IDs are stable backlog keys stored in each issue body as `<!-- backlog-id: Tx.y -->`. Titles stay free of IDs.
- Every task also gets the default Context line: "Part of epic [Ex.y]; see the SPEC sections listed."

Label key: `type:*` · `area:*` · `priority:p0` (blocks the milestone) → `p3` (nice to have) · `size:S` (≤ half a day) / `size:M` (≤ one focused day).

## Planning decisions (approved 2026-10-01)

1. Shared contracts live in a new `packages/contracts` (types plus Zod schemas used by guard, connectors and core), which avoids a core ↔ guard cycle. T1.1 adds the ADR and updates SPEC §10.
2. The sample-data generator is a private workspace package at `tools/sample-data`, shared by the seeders and evals.
3. The Lite audit sink (JSONL or stdout) ships in M2 because v0.1 executes queries (SPEC §9, §11). The `audit_log` table is M3.
4. M1's "profiler" is the result profiler (SPEC §7). `Connector.profile()` and the data-profile layer are M5. Hybrid vector retrieval is M5. Retries and fallback models are M6.
5. M1 native providers: OpenAI, Anthropic, Gemini. The other native providers are M6.
6. The dev stack documents memory needs and per-service startup. SQL Server runs under emulation on arm64.
7. The golden set has at least 50 questions, at least 15 of them in Arabic.

---

## M0 Foundation

### [E0] M0 Foundation

- **Labels:** type:epic, priority:p0
- **Goal:** Monorepo, tooling, CI, GitHub templates, labels, docker dev stack with seeded sample data, and the ADR process are in place, so M1 can start on solid ground.

### [E0.1] Repository scaffold and shared presets

- **Labels:** type:epic, area:repo, priority:p0
- **Goal:** A pnpm + Turborepo monorepo with the SPEC §10 layout and shared lint, type, format and test presets that enforce CLAUDE.md rules mechanically.

#### [T0.1] GitHub automation scripts: labels, milestones and backlog sync

- **Labels:** type:chore, area:repo, priority:p0, size:M
- **SPEC:** §14
- **Depends on:** none
- **Goal:** Idempotent scripts that create labels and milestones and sync `docs/BACKLOG.md` into issues and epics.
- **Acceptance:**
  - [ ] `scripts/gh/labels.sh` creates or updates every `type:*`, `area:*`, `priority:*`, `size:*`, `status:*` label plus `ci:oracle`; a second run makes no changes
  - [ ] `scripts/gh/milestones.sh` creates M0–M6 with descriptions from SPEC §14; a second run makes no changes
  - [ ] `scripts/gh/sync-backlog.mjs` parses this file, creates epics, then tasks, resolves `Depends on` to `#N`, and writes `- [ ] #N` task lists into epics; it skips existing titles
  - [ ] `--dry-run` prints the planned actions without calling GitHub
  - [ ] The parser has unit tests against a fixture backlog
  - [ ] `docs/BACKLOG.md` is committed
- **Out of scope:** GitHub Projects boards.

#### [T0.2] Monorepo scaffold: pnpm workspaces, Turborepo and package layout

- **Labels:** type:build, area:repo, priority:p0, size:M
- **SPEC:** §10
- **Depends on:** none
- **Goal:** The workspace builds end to end with an empty package per SPEC §10 folder.
- **Acceptance:**
  - [ ] `pnpm-workspace.yaml`, `turbo.json`, and root scripts `build`, `dev`, `lint`, `typecheck`, `test`, `test:integration`, `format`
  - [ ] One package per SPEC §10 entry (`@expert-ai/<name>`), each ESM, named exports, with a `src/index.ts` and a trivial passing test
  - [ ] `.nvmrc` pins Node 24 LTS; `engines` and `packageManager` are set in the root `package.json`
  - [ ] `pnpm install && pnpm build && pnpm typecheck && pnpm test` pass from a clean clone
  - [ ] The CLAUDE.md Commands section matches the real scripts
- **Out of scope:** Next.js app content (T2.1) and presets (T0.3).

#### [T0.3] Shared presets: tsconfig, ESLint, Prettier and Vitest

- **Labels:** type:build, area:repo, priority:p0, size:M
- **SPEC:** §10
- **Depends on:** T0.2
- **Goal:** `packages/config` provides the presets every package extends.
- **Acceptance:**
  - [ ] tsconfig base is `strict`, with `noUncheckedIndexedAccess` and ESM module resolution
  - [ ] ESLint flat config bans `any` and floating promises and requires named exports
  - [ ] Prettier config plus a `format:check` script
  - [ ] Vitest preset with coverage (v8) and per-package thresholds configurable
  - [ ] Every package extends the presets; lint and typecheck pass
- **Out of scope:** architecture boundary rules (T0.4).

#### [T0.4] Lint rules that enforce architecture boundaries

- **Labels:** type:build, area:repo, priority:p1, size:S
- **SPEC:** §2, §10
- **Depends on:** T0.3
- **Goal:** CLAUDE.md rules 3 and 5 fail lint when broken.
- **Acceptance:**
  - [ ] Importing `next` or `next/*` anywhere under `packages/` fails lint
  - [ ] Importing vendor AI SDKs (`@ai-sdk/*`, vendor SDK packages) outside `packages/providers` fails lint
  - [ ] Importing DB drivers outside `packages/connectors` (and `packages/storage` for the app DB) fails lint
  - [ ] Fixture files prove each rule fires
- **Out of scope:** runtime checks.

### [E0.2] GitHub hygiene

- **Labels:** type:epic, area:repo, priority:p0
- **Goal:** Contributors and agents get consistent issue forms, PR template and community docs.

#### [T0.5] Issue forms and pull request template

- **Labels:** type:chore, area:repo, priority:p0, size:S
- **SPEC:** §14
- **Depends on:** none
- **Goal:** Issue forms and a PR template that match CLAUDE.md.
- **Acceptance:**
  - [ ] `.github/ISSUE_TEMPLATE/feature.yml`, `bug.yml`, `task.yml`; `task.yml` has Context, Goal, Acceptance criteria, Out of scope, SPEC §, Dependencies and Size
  - [ ] `config.yml` disables blank issues and links to `SECURITY.md` for vulnerabilities
  - [ ] `.github/pull_request_template.md` has Summary, `Closes #`, Changes, How it was tested, Eval results, Screenshots, Risks and the Definition of Done checklist
- **Out of scope:** discussion templates.

#### [T0.6] CONTRIBUTING, SECURITY and CODE_OF_CONDUCT

- **Labels:** type:docs, area:repo, priority:p1, size:S
- **SPEC:** §11
- **Depends on:** T0.5
- **Goal:** Community health files.
- **Acceptance:**
  - [ ] `CONTRIBUTING.md` covers setup, branch and commit conventions, the task loop, and how to add a connector or catalog entry
  - [ ] `SECURITY.md` defines private reporting via GitHub Security Advisories, scope, and response targets
  - [ ] `CODE_OF_CONDUCT.md` uses Contributor Covenant (current version, verified) with a contact
  - [ ] Private vulnerability reporting is enabled on the repo
- **Out of scope:** governance model.

### [E0.3] Continuous integration

- **Labels:** type:epic, area:ci, priority:p0
- **Goal:** Every PR runs lint, typecheck, unit tests, integration tests and security scanning, and `develop` and `main` require them.

#### [T0.7] CI workflow: lint, typecheck, unit tests and PR title check

- **Labels:** type:ci, area:ci, priority:p0, size:M
- **SPEC:** §13
- **Depends on:** T0.3
- **Goal:** Fast required checks on every PR.
- **Acceptance:**
  - [ ] `.github/workflows/ci.yml` runs on PRs to `develop` and `main` and on pushes to both
  - [ ] Jobs: install (pnpm cache), lint, format check, typecheck, unit tests with coverage, using Turborepo
  - [ ] The PR title is validated as a Conventional Commit with allowed types and scopes
  - [ ] Actions pinned to commit SHAs; minimal `permissions`
  - [ ] Branch protection on `develop` and `main` requires these checks
- **Out of scope:** integration tests (T0.8), release (T0.16).

#### [T0.8] Integration test job skeleton with service containers

- **Labels:** type:ci, area:ci, priority:p1, size:S
- **SPEC:** §13
- **Depends on:** T0.7, T0.10
- **Goal:** An integration job that later connector PRs just extend.
- **Acceptance:**
  - [ ] An `integration` job starts Postgres, MySQL, MariaDB, SQL Server and MongoDB service containers with health checks
  - [ ] The seed step loads the sample dataset; `pnpm test:integration` runs (passing trivially until connectors exist)
  - [ ] A nightly and `ci:oracle`-label workflow skeleton for Oracle exists
- **Out of scope:** real connector tests.

#### [T0.9] Dependency and secret scanning

- **Labels:** type:ci, area:security, priority:p0, size:S
- **SPEC:** §11
- **Depends on:** T0.7
- **Goal:** Vulnerable dependencies and leaked secrets are caught on every PR.
- **Acceptance:**
  - [ ] Dependabot (or Renovate, choice justified) for npm, GitHub Actions and Docker, targeting `develop`
  - [ ] The dependency review action fails PRs that add high-severity vulnerabilities or incompatible licenses (AGPL-compatible allowlist)
  - [ ] Secret scanning runs in CI and GitHub secret scanning with push protection is enabled
  - [ ] CodeQL for JavaScript/TypeScript
- **Out of scope:** SBOM publishing (M6).

### [E0.4] Docker dev stack and sample data

- **Labels:** type:epic, area:docker, priority:p0
- **Goal:** One command starts every supported database, seeded identically with the synthetic retail dataset.

#### [T0.10] Docker dev compose with all databases

- **Labels:** type:build, area:docker, priority:p0, size:M
- **SPEC:** §4.2, §13
- **Depends on:** none
- **Goal:** `docker compose -f docker/dev/compose.yml up -d` starts every source.
- **Acceptance:**
  - [ ] Postgres, MySQL, MariaDB, SQL Server and MongoDB services with health checks, named volumes and pinned image tags (verified current)
  - [ ] Oracle Free behind a `oracle` compose profile
  - [ ] Each database gets an app-owner user and a least-privilege read-only user via init scripts
  - [ ] Documented ports, credentials in `.env.example` only, per-service memory needs and startup, and Apple Silicon notes (SQL Server under emulation)
- **Out of scope:** data (T0.12–T0.14).

#### [T0.11] Synthetic retail dataset generator

- **Labels:** type:feature, area:docker, priority:p0, size:M
- **SPEC:** §13
- **Depends on:** T0.2
- **Goal:** A deterministic generator in `tools/sample-data` for the retail dataset used by dev, tests and evals.
- **Acceptance:**
  - [ ] Entities: stores, products, categories, customers (mixed Arabic and English names), orders, order_lines, returns, inventory and promotions, with about 2 years of data ending "yesterday" relative to a fixed anchor date
  - [ ] The same seed gives byte-identical output; the size is configurable (small for CI, default for dev)
  - [ ] Output is a dialect-neutral intermediate form (typed rows plus schema) that seeders consume
  - [ ] Realistic signals for analysis: seasonality, a promo lift, a returns spike, some nulls, one stale table
  - [ ] Unit tests for determinism and referential integrity
- **Out of scope:** per-database loading.

#### [T0.12] Seeders for PostgreSQL, MySQL and MariaDB

- **Labels:** type:feature, area:docker, priority:p0, size:M
- **SPEC:** §13
- **Depends on:** T0.10, T0.11
- **Goal:** `pnpm db:seed --target pg|mysql|mariadb` loads the dataset.
- **Acceptance:**
  - [ ] DDL with PKs, FKs, indexes and one intentionally undeclared logical join
  - [ ] Idempotent: a re-run drops and reloads
  - [ ] Row counts match across all three targets (tested)
- **Out of scope:** SQL Server, Oracle and Mongo.

#### [T0.13] Seeders for SQL Server and Oracle

- **Labels:** type:feature, area:docker, priority:p1, size:M
- **SPEC:** §13
- **Depends on:** T0.12
- **Goal:** The same dataset in SQL Server and Oracle.
- **Acceptance:**
  - [ ] `--target mssql|oracle` with dialect-correct types (NVARCHAR for Arabic, NUMBER, DATE/TIMESTAMP)
  - [ ] Arabic names round-trip correctly (tested)
  - [ ] Row counts match the Postgres seed
- **Out of scope:** the SQLite seed (T4.9).

#### [T0.14] Seeder for MongoDB

- **Labels:** type:feature, area:docker, priority:p1, size:S
- **SPEC:** §13
- **Depends on:** T0.11, T0.10
- **Goal:** The dataset in MongoDB with order lines embedded in orders.
- **Acceptance:**
  - [ ] `--target mongo` loads collections with `order_lines` embedded in `orders`
  - [ ] Some field-shape variation, to exercise schema inference
  - [ ] Order and line counts match the SQL seeds
- **Out of scope:** none.

### [E0.5] Decisions, releases and changelog

- **Labels:** type:epic, area:repo, priority:p1
- **Goal:** Decisions are recorded, and releases and changelogs are automated from Conventional Commits.

#### [T0.15] ADR template and ADR-0001

- **Labels:** type:docs, area:repo, priority:p0, size:S
- **SPEC:** none (CLAUDE.md Decisions)
- **Depends on:** none
- **Goal:** The ADR process exists.
- **Acceptance:**
  - [ ] `docs/adr/template.md` (Status, Context, Decision, Consequences, Alternatives)
  - [ ] `docs/adr/0001-record-architecture-decisions.md` is accepted
  - [ ] `docs/adr/README.md` index
- **Out of scope:** none.

#### [T0.16] Automated versioning and changelog (release-please vs changesets ADR)

- **Labels:** type:ci, area:ci, priority:p1, size:M
- **SPEC:** §14
- **Depends on:** T0.7, T0.15
- **Goal:** Versions and CHANGELOG are produced from Conventional Commits.
- **Acceptance:**
  - [ ] An ADR compares release-please and changesets for this flow (squash to develop, merge-commit releases to main, monorepo, v0.x) and picks one
  - [ ] The chosen tool is configured; a dry run on `develop` shows the expected next version and changelog
  - [ ] The release workflow tags and creates a GitHub Release when a release PR merges to `main`
  - [ ] The release process is documented in `CONTRIBUTING.md`
- **Out of scope:** npm publishing, image publishing (T2.17).

### [E0.6] Claude Code project setup

- **Labels:** type:epic, area:repo, priority:p1
- **Goal:** Agents follow the task loop with skills and safe permissions.

#### [T0.17] Claude Code settings and permissions

- **Labels:** type:chore, area:repo, priority:p0, size:S
- **SPEC:** none (CLAUDE.md)
- **Depends on:** none
- **Goal:** `.claude/settings.json` blocks dangerous actions and allows routine ones.
- **Acceptance:**
  - [ ] Syntax verified against the official Claude Code docs (link in the PR)
  - [ ] Denies force-push, `--no-verify` and reading `.env*` (except `.env.example`)
  - [ ] Allows routine `git`, `gh`, `pnpm` and `docker compose` commands
  - [ ] Manually verified: a denied command is blocked
- **Out of scope:** hooks.

#### [T0.18] Skill: next-task (task loop steps 1–5)

- **Labels:** type:chore, area:repo, priority:p1, size:S
- **SPEC:** none (CLAUDE.md)
- **Depends on:** T0.17, T0.1
- **Goal:** `.claude/skills/next-task/SKILL.md` automates sync, pick, claim, plan and branch.
- **Acceptance:**
  - [ ] Skill format verified against the official docs
  - [ ] Picks the highest-priority unblocked issue in the earliest open milestone and handles stacked dependencies
  - [ ] Posts the plan comment and creates the linked branch with `gh issue develop`
  - [ ] Stops and asks when acceptance criteria are ambiguous
- **Out of scope:** building the task.

#### [T0.19] Skill: ship (task loop steps 7–12)

- **Labels:** type:chore, area:repo, priority:p1, size:S
- **SPEC:** none (CLAUDE.md)
- **Depends on:** T0.17
- **Goal:** `.claude/skills/ship/SKILL.md` automates verify, self-review, PR, labels, CI watch and report.
- **Acceptance:**
  - [ ] Runs lint, typecheck, tests, integration tests and evals conditionally on touched areas
  - [ ] Uses an independent subagent review for guard, auth or secrets changes
  - [ ] Respects `MERGE_POLICY` (never merges when `human`)
  - [ ] Moves the issue label to `status:needs-review`
- **Out of scope:** none.

---

## M1 Engine core

### [E1] M1 Engine core

- **Labels:** type:epic, priority:p0
- **Goal:** The headless engine answers a question end to end against Postgres, MySQL and MariaDB with a guarded query and a validated answer, measured by the evals CLI.

### [E1.1] Contracts and connector framework

- **Labels:** type:epic, area:connectors, priority:p0
- **Goal:** Shared types and the connector interface, registry and conformance suite.

#### [T1.1] Shared contracts: QueryIR, schema snapshot, results and errors

- **Labels:** type:feature, area:contracts, priority:p0, size:M
- **SPEC:** §4.1, §5
- **Depends on:** T0.3
- **Goal:** Zod schemas and types shared by the guard, connectors and core, without circular dependencies.
- **Acceptance:**
  - [ ] `packages/contracts` created; ADR records why, and SPEC §10 is updated in the same PR
  - [ ] Zod schemas plus inferred types: `QueryIR`, `SqlDialect`, `ConnectionPolicy`, `SchemaSnapshot`, `QueryResult`, `ConnectionInfo`, `CostEstimate`
  - [ ] `AppError` base class with a stable `code`, plus error code registry
  - [ ] Unit tests for schema validation edge cases
- **Out of scope:** the answer schema (T1.21).

#### [T1.2] Connector interface and registry

- **Labels:** type:feature, area:connectors, priority:p0, size:M
- **SPEC:** §4.1
- **Depends on:** T1.1
- **Goal:** Connectors register without touching core.
- **Acceptance:**
  - [ ] `Connector` interface as in SPEC §4.1
  - [ ] `execute` accepts only a branded `GuardedQuery` type that only the guard can produce
  - [ ] A registry with register, lookup and capabilities; duplicate IDs are rejected
  - [ ] Unit tests with a fake connector
- **Out of scope:** real drivers.

#### [T1.3] Connector conformance test suite

- **Labels:** type:test, area:connectors, priority:p0, size:M
- **SPEC:** §4.1, §4.2, §13
- **Depends on:** T1.2, T0.12
- **Goal:** One shared integration suite that every connector runs.
- **Acceptance:**
  - [ ] Covers `test()` version reporting, introspection of the retail schema, `execute` with row cap, timeout and abort signal, and close
  - [ ] Asserts that writes fail at the database level even with the guard bypassed (read-only user and read-only transaction)
  - [ ] Documented for community connectors
- **Out of scope:** profiling (M5).

### [E1.2] Query guard (SQL)

- **Labels:** type:epic, area:guard, priority:p0
- **Goal:** The pure, heavily tested guard from SPEC §5.1, §5.2 and §5.4 for SQL dialects.

#### [T1.4] Spike and ADR: node-sql-parser dialect support

- **Labels:** type:docs, area:guard, priority:p0, size:S
- **SPEC:** §5.1
- **Depends on:** T0.15
- **Goal:** A verified support matrix before we rely on the parser.
- **Acceptance:**
  - [ ] Current version checked; license and maintenance assessed
  - [ ] Matrix per dialect (PG, MySQL, MariaDB, T-SQL, Oracle): parse coverage for CTEs, window functions, `FOR UPDATE`, `INTO`, locking hints, `FETCH FIRST`, `TOP`
  - [ ] An ADR records which dialects use the parser and which use the strict fallback
- **Out of scope:** implementation.

#### [T1.5] Guard core: API, policy and statement checks

- **Labels:** type:feature, area:guard, priority:p0, size:M
- **SPEC:** §5, §5.1
- **Depends on:** T1.1, T1.4
- **Goal:** `guard(q, policy)` with single-statement, SELECT/WITH-only checks and typed rejection codes.
- **Acceptance:**
  - [ ] Returns `{ ok: true, query }` or `{ ok: false, code, reason }` with a stable code enum
  - [ ] Rejects multiple statements, non-SELECT top level, `SELECT … INTO`, `FOR UPDATE`/`FOR SHARE`, locking hints and data-modifying CTEs at any nesting depth
  - [ ] No I/O; its only runtime dependencies are the parser and zod
  - [ ] Unit tests for every rejection code
- **Out of scope:** blocklists, allowlists, row cap.

#### [T1.6] Strict fallback tokenizer

- **Labels:** type:feature, area:guard, priority:p0, size:M
- **SPEC:** §5.2
- **Depends on:** T1.5
- **Goal:** Over-strict validation where the parser is unsupported or fails.
- **Acceptance:**
  - [ ] Strips comments (including nested and dialect-specific ones) and string and quoted-identifier literals correctly
  - [ ] Requires `SELECT` or `WITH` first; allows only one trailing semicolon; rejects any DML, DDL, DCL or transaction keyword
  - [ ] Applies the dialect blocklist
  - [ ] Parse failure on a parser-supported dialect falls back to this tokenizer and never passes silently
- **Out of scope:** rewriting.

#### [T1.7] Dialect function blocklists

- **Labels:** type:feature, area:guard, priority:p0, size:M
- **SPEC:** §5.1
- **Depends on:** T1.5
- **Goal:** Per-dialect blocklists from SPEC §5.1, enforced in the parser and fallback paths.
- **Acceptance:**
  - [ ] Postgres, MySQL/MariaDB, SQL Server and Oracle lists as in SPEC §5.1, as data with tests
  - [ ] Matches are case-insensitive and schema-qualified (`pg_catalog.pg_sleep`, quoted names)
  - [ ] A fixture for every blocklisted function per dialect
- **Out of scope:** none.

#### [T1.8] Table and column allowlist with masked columns

- **Labels:** type:feature, area:guard, priority:p0, size:M
- **SPEC:** §5.1
- **Depends on:** T1.5
- **Goal:** Queries touch only allowed tables and columns.
- **Acceptance:**
  - [ ] Resolves aliases, CTE names, subqueries, quoted identifiers and `schema.table` forms
  - [ ] `SELECT *` expands against the policy or is rejected when masked columns exist (decision documented)
  - [ ] Masked columns are rejected with an agent-actionable reason naming the column
  - [ ] The fallback path rejects any query when an allowlist is active but cannot be verified
- **Out of scope:** row-level security.

#### [T1.9] Row cap rewrite per dialect

- **Labels:** type:feature, area:guard, priority:p0, size:M
- **SPEC:** §5.1, §4.2
- **Depends on:** T1.5
- **Goal:** Every approved SQL query is capped.
- **Acceptance:**
  - [ ] `LIMIT` (PG, MySQL, MariaDB), `TOP`/`OFFSET FETCH` (T-SQL), `FETCH FIRST n ROWS ONLY` (Oracle)
  - [ ] Keeps a smaller user limit; replaces a larger one; handles `ORDER BY`, unions and `OFFSET`
  - [ ] Where rewriting is impossible (fallback path), wraps the query as `SELECT * FROM (…) cap` with a cap
- **Out of scope:** none.

#### [T1.10] Adversarial fixture suite and coverage gate

- **Labels:** type:test, area:guard, priority:p0, size:M
- **SPEC:** §5.4
- **Depends on:** T1.6, T1.7, T1.8, T1.9
- **Goal:** The SPEC §5.4 suite, with 100% branch coverage enforced in CI.
- **Acceptance:**
  - [ ] Fixture categories: comment smuggling, case variants, unicode homoglyphs and zero-width characters, nested and data-modifying CTEs, multi-statement and stacked queries, alias and quoted-identifier bypass
  - [ ] Fixtures are data files (query, dialect, policy, expected code) that community members can extend
  - [ ] The coverage threshold for `packages/query-guard` is 100% branches, and CI fails below it
- **Out of scope:** Mongo (M4).

### [E1.3] SQL connectors: PostgreSQL, MySQL and MariaDB

- **Labels:** type:epic, area:connectors, priority:p0
- **Goal:** Three production-quality connectors with defence-in-depth read-only enforcement.

#### [T1.11] PostgreSQL connector

- **Labels:** type:feature, area:connectors, priority:p0, size:M
- **SPEC:** §4.1, §4.2
- **Depends on:** T1.3
- **Goal:** `pg` connector with read-only transactions, timeouts and introspection.
- **Acceptance:**
  - [ ] `SET TRANSACTION READ ONLY` plus `statement_timeout` per query; pooled; honours the abort signal
  - [ ] Introspects schemas, tables, views, columns, types, PK/FK, indexes and row estimates, scoped to allowed schemas
  - [ ] `explain` returns a cost estimate from `EXPLAIN (FORMAT JSON)`
  - [ ] Passes the conformance suite in CI
- **Out of scope:** profiling.

#### [T1.12] MySQL connector

- **Labels:** type:feature, area:connectors, priority:p0, size:M
- **SPEC:** §4.1, §4.2
- **Depends on:** T1.3
- **Goal:** `mysql2` connector.
- **Acceptance:**
  - [ ] `START TRANSACTION READ ONLY` plus `max_execution_time`; pooled; abort support
  - [ ] Introspection via `information_schema`
  - [ ] `explain` supported where the server version allows
  - [ ] Passes the conformance suite in CI
- **Out of scope:** profiling.

#### [T1.13] MariaDB driver ADR and connector

- **Labels:** type:feature, area:connectors, priority:p0, size:M
- **SPEC:** §4.2
- **Depends on:** T1.12
- **Goal:** MariaDB with its own dialect config.
- **Acceptance:**
  - [ ] ADR: `mariadb` vs `mysql2` driver (maintenance, license, features)
  - [ ] `max_statement_time` and a read-only transaction
  - [ ] A separate dialect config from MySQL in the guard and connector
  - [ ] Passes the conformance suite in CI
- **Out of scope:** none.

#### [T1.14] Guarded execution pipeline with cost gate

- **Labels:** type:feature, area:core, priority:p0, size:M
- **SPEC:** §5.1, §7, §11
- **Depends on:** T1.10, T1.11
- **Goal:** The only path to execution: guard → cost gate → execute → audit hook.
- **Acceptance:**
  - [ ] Cost gate uses `explain` where available and rejects queries above the threshold with an actionable reason
  - [ ] Stores guarded queries by `queryId` in a query store interface (in-memory implementation)
  - [ ] Emits an audit event (actor, connection, query hash and text, duration, rows, outcome) through a sink interface
  - [ ] Tests prove there is no path to `execute` without the guard
- **Out of scope:** persistent audit (T2.14, T3.15).

### [E1.4] Providers: abstraction, catalog and first adapters

- **Labels:** type:epic, area:providers, priority:p0
- **Goal:** Provider-neutral model access with native, OpenAI-compatible and Ollama support.

#### [T1.15] ADR and base: Vercel AI SDK provider abstraction

- **Labels:** type:feature, area:providers, priority:p0, size:M
- **SPEC:** §6.1
- **Depends on:** T1.1
- **Goal:** A `ModelProvider` abstraction over the AI SDK, which only `packages/providers` imports.
- **Acceptance:**
  - [ ] ADR pins the AI SDK major version (verified) and the adapter design
  - [ ] Core-facing interface covering text, streaming, tool calls, structured output and embeddings
  - [ ] Model roles `analyst`, `fast` and `embedding` resolved from config
  - [ ] A mock provider for tests
- **Out of scope:** specific vendors.

#### [T1.16] Provider catalog schema and loader

- **Labels:** type:feature, area:providers, priority:p0, size:M
- **SPEC:** §6.1, §6.2
- **Depends on:** T1.15
- **Goal:** `catalog/*.json` entries validated with Zod.
- **Acceptance:**
  - [ ] Schema: id, family, adapter, base URLs with `regions: { cn, intl }`, auth method, default models, prices, `docsUrl` and `lastVerified` (both required)
  - [ ] A CI test validates every catalog file and fails on a missing or stale (> 180 days) `lastVerified`
  - [ ] `CONTRIBUTING.md` explains how to add an entry
- **Out of scope:** the full catalog (M6).

#### [T1.17] Native adapters: OpenAI, Anthropic and Google Gemini

- **Labels:** type:feature, area:providers, priority:p0, size:M
- **SPEC:** §6.2, §6.3
- **Depends on:** T1.16
- **Goal:** Three verified native providers with API-key auth.
- **Acceptance:**
  - [ ] Package names, base URLs and model IDs verified in official docs; `docsUrl` and `lastVerified` recorded
  - [ ] `api-key` auth with configurable header and prefix, plus `custom-headers`; Anthropic base URL override for Anthropic-compatible endpoints
  - [ ] Recorded-response tests (no live calls in CI)
- **Out of scope:** other native providers (M6).

#### [T1.18] OpenAI-compatible and Ollama adapters

- **Labels:** type:feature, area:providers, priority:p0, size:M
- **SPEC:** §6.2
- **Depends on:** T1.16
- **Goal:** Any OpenAI-compatible endpoint plus local Ollama.
- **Acceptance:**
  - [ ] A custom OpenAI-compatible endpoint (base URL, auth `none` or `api-key`)
  - [ ] Ollama native and OpenAI-compatible entries, verified
  - [ ] Documented local setup that works against a local Ollama
- **Out of scope:** Chinese presets (M6).

### [E1.5] Knowledge basics and context selection

- **Labels:** type:epic, area:knowledge, priority:p0
- **Goal:** Structural knowledge and table-card retrieval, enough for the agent to pick tables.

#### [T1.19] Introspection orchestration and snapshot cache

- **Labels:** type:feature, area:knowledge, priority:p0, size:M
- **SPEC:** §3.1, §9
- **Depends on:** T1.11
- **Goal:** Build and cache the structural layer per connection.
- **Acceptance:**
  - [ ] Runs `introspect` and normalizes it into a `SchemaSnapshot` with a content hash
  - [ ] Lite cache in `.cache/` JSON; refresh on demand
  - [ ] Tests against a fixture snapshot
- **Out of scope:** versioned diffs (T3.4) and data profiles (M5).

#### [T1.20] Table cards, BM25 retrieval and FK expansion

- **Labels:** type:feature, area:knowledge, priority:p0, size:M
- **SPEC:** §3.2
- **Depends on:** T1.19
- **Goal:** Select relevant tables within a token budget.
- **Acceptance:**
  - [ ] One compact card per table, including semantic-layer text when present
  - [ ] BM25 over cards that handles Arabic and English tokenization
  - [ ] FK graph expansion adds bridge tables on the shortest path plus at most one extra hop
  - [ ] Respects the token budget (default ~8k); returns the selection with reasons
- **Out of scope:** vectors and RRF (T5.6), verified-query boost (T3.13).

### [E1.6] Agent loop and profiler

- **Labels:** type:epic, area:core, priority:p0
- **Goal:** Tool-calling and fixed-pipeline agents that return a validated `AnalystAnswer`.

#### [T1.21] AnalystAnswer and ChartSpec schemas

- **Labels:** type:feature, area:charts, priority:p0, size:M
- **SPEC:** §3.5
- **Depends on:** T1.1
- **Goal:** Validated structured output.
- **Acceptance:**
  - [ ] Zod `ChartSpec` (bar, line, area, pie, scatter, heatmap, kpi, table) in `packages/charts`
  - [ ] Zod `AnalystAnswer` in `packages/core` matching SPEC §3.5
  - [ ] A validator checks that referenced columns exist in referenced results and `keyFigures.sourceColumn` exists
- **Out of scope:** rendering.

#### [T1.22] Result profiler

- **Labels:** type:feature, area:core, priority:p0, size:M
- **SPEC:** §7, §2, §3.4
- **Depends on:** T1.14
- **Goal:** Results become a profile; raw rows never go to the LLM.
- **Acceptance:**
  - [ ] Row count, per-column stats (type, nulls, distinct, min/max, top-k) and truncation flags
  - [ ] First N rows included only in `full` privacy mode (mode plumbed, defaulting to `full`)
  - [ ] Output wrapped and labelled as untrusted content
  - [ ] Unit tests including large and wide results
- **Out of scope:** `aggregate` and `schema-only` behaviour (T5.8).

#### [T1.23] Agent tools

- **Labels:** type:feature, area:core, priority:p0, size:M
- **SPEC:** §7
- **Depends on:** T1.20, T1.22
- **Goal:** Tool definitions with Zod arguments.
- **Acceptance:**
  - [ ] `search_tables`, `describe_table`, `get_sample_values`, `run_query` and `ask_clarification` implemented
  - [ ] `get_metric`, `search_verified_queries` and `note_insight` defined, backed by empty or in-memory stores until later milestones
  - [ ] `run_query` always goes through the pipeline and returns a profile plus `queryId`
  - [ ] Invalid tool arguments return model-readable errors
- **Out of scope:** none.

#### [T1.24] Analyst system prompt v1 and prompt versioning

- **Labels:** type:feature, area:core, priority:p0, size:S
- **SPEC:** §3.3, §7
- **Depends on:** T1.21
- **Goal:** A versioned prompt that encodes the expert behaviours.
- **Acceptance:**
  - [ ] `packages/core/prompts/analyst/v1.md` plus a loader with a version id recorded on each answer
  - [ ] Encodes grounded numbers, one clarification at most, assumptions, caveats, follow-ups, no fabrication, and answering in the question's language
  - [ ] A snapshot test of the rendered prompt
- **Out of scope:** eval tuning.

#### [T1.25] Tool-calling agent loop

- **Labels:** type:feature, area:core, priority:p0, size:M
- **SPEC:** §7
- **Depends on:** T1.23, T1.24, T1.17
- **Goal:** The agent loop with limits and self-correction.
- **Acceptance:**
  - [ ] Limits enforced: max steps (8), max executions (5), 3 self-correction attempts per query and a wall-clock budget, all configurable
  - [ ] Emits a typed event stream (step, tool call, query, profile, answer) for SSE
  - [ ] The final answer is validated against `AnalystAnswer`; one repair attempt on failure
  - [ ] Tests with the mock provider cover each limit
- **Out of scope:** UI.

#### [T1.26] Fixed pipeline for models without tool calling

- **Labels:** type:feature, area:core, priority:p1, size:M
- **SPEC:** §6.4
- **Depends on:** T1.25
- **Goal:** A deterministic pipeline: select context → generate query → guard → execute → profile → analyze.
- **Acceptance:**
  - [ ] Structured output, or strict JSON parsing when unsupported
  - [ ] Self-correction on guard or execution errors (3 attempts)
  - [ ] Same event stream and answer shape as the loop
- **Out of scope:** none.

### [E1.7] Evals

- **Labels:** type:epic, area:evals, priority:p0
- **Goal:** A golden set and an evals CLI to measure the engine.

#### [T1.27] Golden question set (50+)

- **Labels:** type:test, area:evals, priority:p0, size:M
- **SPEC:** §13
- **Depends on:** T0.12
- **Goal:** At least 50 questions with expected result sets.
- **Acceptance:**
  - [ ] YAML format: question, language, difficulty, tags, reference SQL, expected tables and optional tolerances
  - [ ] Expected results computed from reference SQL on the seeded dataset (scripted, reproducible)
  - [ ] At least 50 questions (≥15 Arabic) across easy, medium and hard, including ambiguous ones that should trigger clarification
- **Out of scope:** Mongo questions (M4).

#### [T1.28] Evals CLI and markdown report

- **Labels:** type:feature, area:evals, priority:p0, size:M
- **SPEC:** §13
- **Depends on:** T1.25, T1.27
- **Goal:** `pnpm evals -- --provider <id> --model <id>`.
- **Acceptance:**
  - [ ] Result-set comparison (order-insensitive unless the question requires order, numeric tolerance)
  - [ ] Metrics: execution accuracy, context-selection recall, clarification rate, tokens and cost, latency and guard rejection rate
  - [ ] Writes a markdown report plus JSON; can compare two runs (before/after table for PRs)
  - [ ] A manual `workflow_dispatch` CI workflow
- **Out of scope:** none.

---

## M2 Lite MVP (v0.1.0)

### [E2] M2 Lite MVP

- **Labels:** type:epic, priority:p0
- **Goal:** A self-hostable Lite app: chat with streaming, answers, charts, query panel, YAML config, semantic files, English and Arabic RTL, and a Docker image. Released as v0.1.0.

### [E2.1] Web shell and i18n

- **Labels:** type:epic, area:web, priority:p0
- **Goal:** A thin Next.js app that is bilingual and RTL from day one.

#### [T2.1] Next.js app shell with Tailwind and shadcn/ui

- **Labels:** type:feature, area:web, priority:p0, size:M
- **SPEC:** §10, §12
- **Depends on:** T0.3
- **Goal:** An App Router app with layout, theming and a logical-properties-only style policy.
- **Acceptance:**
  - [ ] Next.js (current stable, verified), Tailwind and shadcn/ui set up; standalone output
  - [ ] Layout uses logical CSS properties; `dir` set from locale
  - [ ] Arabic-capable fonts self-hosted
  - [ ] Lint, typecheck and a smoke test pass
- **Out of scope:** features.

#### [T2.2] i18n package: catalogs, locale detection and RTL helpers

- **Labels:** type:feature, area:i18n, priority:p0, size:M
- **SPEC:** §12
- **Depends on:** T2.1
- **Goal:** No hard-coded UI strings.
- **Acceptance:**
  - [ ] `packages/i18n` has `en` and `ar` catalogs with typed keys, ICU plurals, and number and date formatting
  - [ ] A lint rule flags literal JSX strings in `apps/web`
  - [ ] A test fails when a key is missing in either catalog
  - [ ] A language switcher that persists the choice
- **Out of scope:** translating answers (the LLM handles that).

#### [T2.3] Lite auth: none or single password

- **Labels:** type:feature, area:web, priority:p1, size:S
- **SPEC:** §9
- **Depends on:** T2.1
- **Goal:** Optional password protection from env.
- **Acceptance:**
  - [ ] Off by default; when `APP_PASSWORD` is set, all routes and APIs require a session
  - [ ] Constant-time compare, HttpOnly secure cookie, and rate-limited login
- **Out of scope:** users and roles (M3).

### [E2.2] Lite configuration and semantic layer

- **Labels:** type:epic, area:storage, priority:p0
- **Goal:** Lite mode configured by files that live in git.

#### [T2.4] StorageAdapter interface and Lite adapter

- **Labels:** type:feature, area:storage, priority:p0, size:M
- **SPEC:** §9
- **Depends on:** T1.19
- **Goal:** One storage interface; the Lite implementation is file-based.
- **Acceptance:**
  - [ ] Interface covers connections, provider settings, semantic layer, knowledge cache, query store and audit sink
  - [ ] Lite implementation backed by config, `semantic/`, `.cache/` and JSONL
  - [ ] A shared contract test suite that Full (T3.3) will also run
- **Out of scope:** Full adapter.

#### [T2.5] analyzer.config.yaml schema and loader

- **Labels:** type:feature, area:storage, priority:p0, size:M
- **SPEC:** §9, §6.3
- **Depends on:** T2.4
- **Goal:** Lite config file with `${ENV}` secret references.
- **Acceptance:**
  - [ ] Zod schema for connections, policies (allowlists, row cap, cost threshold, privacy mode), providers and model roles
  - [ ] `${ENV}` interpolation; errors never echo secret values
  - [ ] `analyzer.config.example.yaml` pointing at the dev stack
  - [ ] Clear validation errors with paths
- **Out of scope:** UI editing.

#### [T2.6] Semantic layer YAML format and loader

- **Labels:** type:feature, area:knowledge, priority:p0, size:M
- **SPEC:** §3.1
- **Depends on:** T2.4
- **Goal:** The business and experiential layers as files.
- **Acceptance:**
  - [ ] Zod schema: table and column descriptions, EN/AR synonyms, metrics, logical joins, fiscal calendar, currency and units, PII flags
  - [ ] `semantic/verified-queries.yaml` format
  - [ ] Table cards and `get_metric` consume it
  - [ ] Semantic files for the sample dataset
- **Out of scope:** editor (M3).

### [E2.3] Chat experience

- **Labels:** type:epic, area:web, priority:p0
- **Goal:** Ask, watch it work, and read a transparent answer.

#### [T2.7] Chat API: SSE streaming of agent events

- **Labels:** type:feature, area:web, priority:p0, size:M
- **SPEC:** §7, §10
- **Depends on:** T1.25, T2.5
- **Goal:** A route handler that streams agent events.
- **Acceptance:**
  - [ ] Zod-validated input; SSE stream of typed events; client disconnect aborts the agent and the query
  - [ ] `GET /api/queries/:id/rows` returns rows from the query store with pagination
  - [ ] Node runtime only; no secrets in responses
- **Out of scope:** UI.

#### [T2.8] Chat UI with streaming and history

- **Labels:** type:feature, area:web, priority:p0, size:M
- **SPEC:** §9, §12
- **Depends on:** T2.7, T2.2
- **Goal:** A conversation UI with live progress.
- **Acceptance:**
  - [ ] Streaming steps (thinking, querying, analyzing), stop button and error states
  - [ ] History in IndexedDB (Dexie): list, rename, delete
  - [ ] Works in RTL; keyboard accessible
- **Out of scope:** answer rendering (T2.9).

#### [T2.9] Answer rendering and transparency

- **Labels:** type:feature, area:web, priority:p0, size:M
- **SPEC:** §2.4, §3.5
- **Depends on:** T2.8
- **Goal:** Render every `AnalystAnswer` field.
- **Acceptance:**
  - [ ] Answer, key figures, insights, recommendations, assumptions, caveats and confidence
  - [ ] Clickable follow-ups
  - [ ] Shows the model used, the prompt version and data freshness
  - [ ] Bidi-safe numbers and mixed-language text
- **Out of scope:** charts (T2.11).

#### [T2.10] Query panel with data table

- **Labels:** type:feature, area:web, priority:p0, size:M
- **SPEC:** §2.4, §7
- **Depends on:** T2.9
- **Goal:** Show the executed query and its rows.
- **Acceptance:**
  - [ ] Syntax-highlighted SQL with a copy button
  - [ ] TanStack Table with virtualized rows fetched by `queryId` (TanStack Query), sorting, and a truncation notice
  - [ ] RTL-correct column order
- **Out of scope:** export (M5).

#### [T2.11] ECharts client renderer

- **Labels:** type:feature, area:charts, priority:p0, size:M
- **SPEC:** §3.5, §12
- **Depends on:** T1.21, T2.9
- **Goal:** Render every `ChartSpec` type in the browser.
- **Acceptance:**
  - [ ] A `ChartSpec` → ECharts option mapper in `packages/charts` (pure, unit-tested) shared with SSR later
  - [ ] All eight chart types; the column check runs before render with a graceful fallback
  - [ ] RTL axis and legend handling; Arabic labels render
- **Out of scope:** SSR (T5.10).

#### [T2.12] Conversation start: data overview and suggested questions

- **Labels:** type:feature, area:core, priority:p1, size:S
- **SPEC:** §3.3
- **Depends on:** T2.6, T2.8
- **Goal:** The expert introduces the data.
- **Acceptance:**
  - [ ] A one-paragraph overview plus 4–6 suggested questions generated with the `fast` model from the knowledge base
  - [ ] Cached per knowledge-base version
  - [ ] "What data do we have about X?" is answered from the knowledge base without querying (prompt plus test)
- **Out of scope:** none.

#### [T2.13] Provider settings: server env and bring-your-own-key

- **Labels:** type:feature, area:web, priority:p0, size:M
- **SPEC:** §9, §6.3
- **Depends on:** T2.5, T1.18
- **Goal:** Choose the provider and model in Lite mode.
- **Acceptance:**
  - [ ] Server-configured providers are listed without exposing keys
  - [ ] A BYOK key is held in browser storage, sent per request over HTTPS, and never logged or persisted server-side
  - [ ] Model role selection with a per-conversation override
- **Out of scope:** capability probe (M6).

#### [T2.14] Lite audit log (JSONL / stdout)

- **Labels:** type:feature, area:storage, priority:p0, size:S
- **SPEC:** §9, §11
- **Depends on:** T2.4, T1.14
- **Goal:** Every executed query is audited in Lite mode.
- **Acceptance:**
  - [ ] JSONL file or stdout sink with the SPEC §11 fields; the target is configurable
  - [ ] No secrets or result data in audit lines (tested)
- **Out of scope:** audit UI.

### [E2.4] Packaging and release

- **Labels:** type:epic, area:docker, priority:p0
- **Goal:** Anyone can run v0.1.0 with Docker.

#### [T2.15] Production Docker image

- **Labels:** type:build, area:docker, priority:p0, size:M
- **SPEC:** §10
- **Depends on:** T2.7
- **Goal:** A small, non-root, multi-arch image.
- **Acceptance:**
  - [ ] Multi-stage build of the Next.js standalone output on Node 24 LTS; runs as a non-root user; has a health check
  - [ ] Mounts config, `semantic/` and `.cache/`
  - [ ] Builds for amd64 and arm64 in CI
- **Out of scope:** Chromium (T5.14).

#### [T2.16] Quickstart docs

- **Labels:** type:docs, area:docs, priority:p0, size:S
- **SPEC:** §9
- **Depends on:** T2.15
- **Goal:** From zero to first answer in 10 minutes.
- **Acceptance:**
  - [ ] README quickstart covering the dev stack, config, provider (cloud or Ollama) and first question
  - [ ] Written and tested in both Docker and local dev flows
- **Out of scope:** the docs site (M6).

#### [T2.17] Publish images on release

- **Labels:** type:ci, area:ci, priority:p1, size:S
- **SPEC:** §14
- **Depends on:** T2.15, T0.16
- **Goal:** Releases push images to GHCR.
- **Acceptance:**
  - [ ] Tagged semver and `latest` images published on release, with provenance and SBOM attestations
- **Out of scope:** other registries.

---

## M3 Full mode (v0.2.0)

### [E3] M3 Full mode

- **Labels:** type:epic, priority:p0
- **Goal:** Multi-user Full mode: app DB, auth and roles, encrypted credentials, semantic editor with AI auto-draft, verified queries, audit, and SSRF policy. Released as v0.2.0.

### [E3.1] App database and Full storage

- **Labels:** type:epic, area:storage, priority:p0
- **Goal:** A Drizzle-backed app DB on Postgres + pgvector or SQLite + sqlite-vec.

#### [T3.1] ADR: app DB schema and migration strategy

- **Labels:** type:docs, area:storage, priority:p0, size:S
- **SPEC:** §9
- **Depends on:** T2.4
- **Goal:** Decide how Drizzle supports two engines and how migrations ship.
- **Acceptance:**
  - [ ] ADR covering Drizzle version, dual-dialect schema approach, migration runner on startup, and pgvector and sqlite-vec packaging
- **Out of scope:** implementation.

#### [T3.2] Drizzle schema v1 and migrations

- **Labels:** type:feature, area:storage, priority:p0, size:M
- **SPEC:** §9
- **Depends on:** T3.1
- **Goal:** Tables for the Full feature set.
- **Acceptance:**
  - [ ] Users, workspaces, memberships, connections, provider credentials, conversations, messages, queries, semantic entities, verified queries, knowledge snapshots and `audit_log`
  - [ ] Migrations run on both Postgres and SQLite in CI
- **Out of scope:** dashboards (M6).

#### [T3.3] Full StorageAdapter implementation

- **Labels:** type:feature, area:storage, priority:p0, size:M
- **SPEC:** §9
- **Depends on:** T3.2
- **Goal:** The Full adapter passes the shared storage contract suite.
- **Acceptance:**
  - [ ] All StorageAdapter methods implemented with Drizzle
  - [ ] Contract suite passes on Postgres and SQLite
  - [ ] Mode is selected by config; the app DB can never be registered as an analyzed connection
- **Out of scope:** none.

#### [T3.4] Versioned knowledge snapshots with diff detection

- **Labels:** type:feature, area:knowledge, priority:p1, size:M
- **SPEC:** §3.1, §9
- **Depends on:** T3.3
- **Goal:** Detect schema changes between refreshes.
- **Acceptance:**
  - [ ] Snapshots stored with version and hash; diff of added, removed and changed tables and columns
  - [ ] Scheduled and on-demand refresh; the diff is surfaced to admins
- **Out of scope:** none.

#### [T3.5] Server-side, shareable chat history

- **Labels:** type:feature, area:web, priority:p2, size:S
- **SPEC:** §9
- **Depends on:** T3.3, T3.7
- **Goal:** Conversations persist server-side and can be shared within a workspace.
- **Acceptance:**
  - [ ] Conversations and messages stored; share link respects workspace roles
- **Out of scope:** public links.

### [E3.2] Authentication and roles

- **Labels:** type:epic, area:security, priority:p0
- **Goal:** Users, workspaces and role-based access.

#### [T3.6] ADR: authentication library

- **Labels:** type:docs, area:security, priority:p0, size:S
- **SPEC:** §9
- **Depends on:** T3.1
- **Goal:** Choose an auth approach (security-relevant; needs human approval).
- **Acceptance:**
  - [ ] ADR compares candidates (maintenance, license, Drizzle support, OIDC readiness), verified from current docs, and is approved by a maintainer
- **Out of scope:** implementation.

#### [T3.7] Users, sign-in and sessions

- **Labels:** type:feature, area:security, priority:p0, size:M
- **SPEC:** §9
- **Depends on:** T3.6, T3.3
- **Goal:** Email/password sign-in with secure sessions.
- **Acceptance:**
  - [ ] Sign-up (first user becomes owner), sign-in, sign-out, password hashing per the ADR, CSRF protection
  - [ ] Session cookies are HttpOnly, Secure and SameSite
  - [ ] Localized, RTL-checked UI
- **Out of scope:** SSO.

#### [T3.8] Workspaces and role-based authorization

- **Labels:** type:feature, area:security, priority:p0, size:M
- **SPEC:** §9
- **Depends on:** T3.7
- **Goal:** `owner`, `admin`, `analyst` and `viewer` roles enforced server-side.
- **Acceptance:**
  - [ ] A permission matrix documented and enforced in one authorization module
  - [ ] Invitations and member management
  - [ ] Tests that each route denies lower roles
- **Out of scope:** none.

### [E3.3] Secrets and connection management

- **Labels:** type:epic, area:security, priority:p0
- **Goal:** Credentials are encrypted at rest and never returned to the browser.

#### [T3.9] AES-256-GCM secret encryption with key rotation

- **Labels:** type:feature, area:security, priority:p0, size:M
- **SPEC:** §11
- **Depends on:** T3.2
- **Goal:** Encrypt DSNs and AI secrets with `APP_ENCRYPTION_KEY`.
- **Acceptance:**
  - [ ] AES-256-GCM with a random IV and a key-id prefix; decrypts with old keys and re-encrypts with the current one
  - [ ] Startup fails closed when the key is missing or invalid in Full mode
  - [ ] Tests for tamper detection and rotation; independent security review
- **Out of scope:** KMS integration.

#### [T3.10] Connection management API and UI

- **Labels:** type:feature, area:web, priority:p0, size:M
- **SPEC:** §4, §11
- **Depends on:** T3.9, T3.8
- **Goal:** Admins add, test and edit connections.
- **Acceptance:**
  - [ ] Create, test and edit connections with policy (allowlists, masks, row cap, cost threshold, privacy mode)
  - [ ] Secrets are write-only: never returned after save
  - [ ] Onboarding triggers introspection
- **Out of scope:** semantic editing.

#### [T3.11] Provider credential management

- **Labels:** type:feature, area:providers, priority:p0, size:M
- **SPEC:** §6.3, §9
- **Depends on:** T3.9, T3.8
- **Goal:** Per-user and per-workspace encrypted provider credentials.
- **Acceptance:**
  - [ ] Catalog-driven forms; secrets are write-only; workspace defaults per model role
- **Out of scope:** new auth methods (M6).

### [E3.4] Semantic layer editor and verified queries

- **Labels:** type:epic, area:knowledge, priority:p0
- **Goal:** Humans curate the business layer with AI help, and good answers become verified queries.

#### [T3.12] Semantic layer editor with YAML import and export

- **Labels:** type:feature, area:web, priority:p0, size:M
- **SPEC:** §3.1
- **Depends on:** T3.3, T2.6
- **Goal:** Edit descriptions, synonyms, metrics and joins in the UI.
- **Acceptance:**
  - [ ] Table and column editor with EN/AR synonyms, metrics, logical joins and PII flags
  - [ ] YAML import and export round-trips losslessly (tested)
- **Out of scope:** AI drafting.

#### [T3.13] Verified queries: feedback UI and retrieval boost

- **Labels:** type:feature, area:knowledge, priority:p1, size:M
- **SPEC:** §3.1, §3.2
- **Depends on:** T3.12, T1.20
- **Goal:** Learn from good answers.
- **Acceptance:**
  - [ ] Thumbs up or down and "save as verified"; an analyst or higher approves
  - [ ] `search_verified_queries` is backed by the library; tables from top similar verified queries are added to context
- **Out of scope:** none.

#### [T3.14] AI auto-draft of the semantic layer with approval

- **Labels:** type:feature, area:knowledge, priority:p1, size:M
- **SPEC:** §3.1, §3.3
- **Depends on:** T3.12
- **Goal:** The AI proposes descriptions, synonyms and joins; humans approve.
- **Acceptance:**
  - [ ] Drafts use schema and profile only (respecting privacy mode); nothing is persisted without approval
  - [ ] User corrections in chat create semantic-update proposals and are never silently applied
- **Out of scope:** none.

### [E3.5] Audit, SSRF and rate limits

- **Labels:** type:epic, area:security, priority:p0
- **Goal:** Operational security for multi-user deployments.

#### [T3.15] audit_log table and viewer

- **Labels:** type:feature, area:security, priority:p0, size:M
- **SPEC:** §11
- **Depends on:** T3.3, T3.8
- **Goal:** Every query is audited in the DB, and admins can review it.
- **Acceptance:**
  - [ ] Audit sink writes SPEC §11 fields; admin-only filterable viewer
- **Out of scope:** SIEM export.

#### [T3.16] SSRF policy for database hosts and AI base URLs

- **Labels:** type:feature, area:security, priority:p0, size:M
- **SPEC:** §11
- **Depends on:** T3.10, T3.11
- **Goal:** Block private, loopback, link-local and metadata targets unless an admin allows them.
- **Acceptance:**
  - [ ] Resolves DNS and checks every resolved IP (IPv4 and IPv6, mapped addresses) at connect time, not just at save
  - [ ] Policy setting with admin allow-ranges; the default depends on deployment mode (documented)
  - [ ] Adversarial tests (DNS rebinding, decimal and octal IPs, IPv6 forms); independent security review
- **Out of scope:** egress proxy.

#### [T3.17] Rate limiting per user and per connection

- **Labels:** type:feature, area:security, priority:p1, size:S
- **SPEC:** §11
- **Depends on:** T3.8
- **Goal:** Protect databases and budgets.
- **Acceptance:**
  - [ ] Configurable limits on chat requests and query executions; localized 429 responses
- **Out of scope:** distributed rate limiting.

---

## M4 More sources (v0.3.0)

### [E4] M4 More sources

- **Labels:** type:epic, priority:p0
- **Goal:** SQL Server, Oracle, MongoDB (with guard rules) and SQLite, plus read-only setup guides. Released as v0.3.0.

### [E4.1] SQL Server and Oracle

- **Labels:** type:epic, area:connectors, priority:p0
- **Goal:** Enterprise SQL sources.

#### [T4.1] SQL Server connector

- **Labels:** type:feature, area:connectors, priority:p0, size:M
- **SPEC:** §4.2
- **Depends on:** T1.3, T0.13
- **Goal:** `mssql` connector, where the guard is the main line of defence.
- **Acceptance:**
  - [ ] Request timeout, pooling and abort; introspection via `sys` catalog views
  - [ ] The conformance suite passes in CI (service container)
- **Out of scope:** Windows auth.

#### [T4.2] SQL Server guard hardening fixtures

- **Labels:** type:test, area:guard, priority:p0, size:S
- **SPEC:** §5.1, §5.4
- **Depends on:** T4.1, T1.10
- **Goal:** T-SQL-specific adversarial coverage.
- **Acceptance:**
  - [ ] Fixtures for `EXEC`, `sp_executesql`, `xp_*`, `OPENROWSET`, `WAITFOR`, bracket-quoted identifiers, `GO` separators, table hints and `SELECT INTO`
- **Out of scope:** none.

#### [T4.3] Oracle connector (Thin mode, 12c+)

- **Labels:** type:feature, area:connectors, priority:p1, size:M
- **SPEC:** §4.2
- **Depends on:** T1.3, T0.13
- **Goal:** `oracledb` Thin mode connector.
- **Acceptance:**
  - [ ] `SET TRANSACTION READ ONLY` plus `callTimeout`; rejects versions below 12c at `test()` with a clear message
  - [ ] Introspection via `ALL_*` views scoped to allowed schemas
  - [ ] Conformance suite runs nightly and on the `ci:oracle` label
- **Out of scope:** Thick mode.

### [E4.2] MongoDB

- **Labels:** type:epic, area:connectors, priority:p0
- **Goal:** Document sources with aggregation-only guard rules.

#### [T4.4] Mongo guard rules

- **Labels:** type:feature, area:guard, priority:p0, size:M
- **SPEC:** §5.3
- **Depends on:** T1.5
- **Goal:** Guard aggregation pipelines.
- **Acceptance:**
  - [ ] Zod pipeline shape; stage allowlist; `$lookup`, `$graphLookup` and `$unionWith` only against allowlisted collections
  - [ ] `$out`, `$merge`, `$function`, `$accumulator` and `$where` rejected anywhere in the tree
  - [ ] Appends `$limit` for the row cap; sets `maxTimeMS`
- **Out of scope:** none.

#### [T4.5] Mongo guard adversarial fixtures

- **Labels:** type:test, area:guard, priority:p0, size:S
- **SPEC:** §5.4
- **Depends on:** T4.4
- **Goal:** SPEC §5.4 coverage for Mongo.
- **Acceptance:**
  - [ ] `$out` inside `$facet`, operators in nested expressions, keys with unicode lookalikes, and `$lookup` pipeline sub-stages
  - [ ] 100% branch coverage maintained
- **Out of scope:** none.

#### [T4.6] MongoDB connector with schema inference

- **Labels:** type:feature, area:connectors, priority:p0, size:M
- **SPEC:** §4.2, §3.1
- **Depends on:** T4.4, T0.14, T1.3
- **Goal:** `mongodb` connector.
- **Acceptance:**
  - [ ] `aggregate` only; `maxTimeMS`; read-role user
  - [ ] Schema inference via `$sample`: field paths, type distribution and presence %
  - [ ] Conformance suite passes in CI
- **Out of scope:** change streams.

#### [T4.7] Agent support for Mongo pipelines

- **Labels:** type:feature, area:core, priority:p1, size:M
- **SPEC:** §7, §4.1
- **Depends on:** T4.6, T1.25
- **Goal:** The agent writes and self-corrects aggregation pipelines.
- **Acceptance:**
  - [ ] Prompt and tool support for `QueryIR` kind `mongo`; query panel shows the pipeline
  - [ ] At least 10 Mongo golden questions added to evals
- **Out of scope:** none.

### [E4.3] SQLite, CI and setup guides

- **Labels:** type:epic, area:connectors, priority:p1
- **Goal:** Demo-friendly SQLite and copy-paste read-only setup for every source.

#### [T4.8] SQLite connector

- **Labels:** type:feature, area:connectors, priority:p1, size:S
- **SPEC:** §4.2
- **Depends on:** T1.3
- **Goal:** `better-sqlite3` connector opened read-only.
- **Acceptance:**
  - [ ] Read-only open flag; row limit via `LIMIT`; conformance suite passes
- **Out of scope:** none.

#### [T4.9] SQLite sample dataset file

- **Labels:** type:feature, area:docker, priority:p2, size:S
- **SPEC:** §13
- **Depends on:** T0.11, T4.8
- **Goal:** A zero-setup demo database.
- **Acceptance:**
  - [ ] `--target sqlite` produces a demo `.sqlite` file; used by the quickstart as a no-Docker path
- **Out of scope:** none.

#### [T4.10] Read-only setup guides for all sources

- **Labels:** type:docs, area:docs, priority:p0, size:M
- **SPEC:** §4.2
- **Depends on:** T4.1, T4.3, T4.6
- **Goal:** `docs/connectors/<source>.md` with least-privilege scripts.
- **Acceptance:**
  - [ ] Guides for Postgres, MySQL, MariaDB, SQL Server, Oracle, MongoDB and SQLite
  - [ ] Each script is tested against the dev stack (the init scripts reuse them)
- **Out of scope:** cloud-managed variants.

---

## M5 Expert and exports (v0.4.0)

### [E5] M5 Expert and exports

- **Labels:** type:epic, priority:p0
- **Goal:** The full knowledge base (profiles, freshness, insights journal), privacy modes, and Excel and PDF export. Released as v0.4.0.

### [E5.1] Full knowledge base

- **Labels:** type:epic, area:knowledge, priority:p0
- **Goal:** The analyst knows the data before the user asks.

#### [T5.1] Connector.profile for SQL sources

- **Labels:** type:feature, area:connectors, priority:p0, size:M
- **SPEC:** §3.1, §4.1
- **Depends on:** T1.11, T1.12, T1.13, T4.1, T4.3, T4.8
- **Goal:** Budgeted data profiling.
- **Acceptance:**
  - [ ] Null %, distinct count, top-k, min/max and date coverage; sampled on large tables; a per-connection time budget
  - [ ] Profiling queries also go through the guard
- **Out of scope:** Mongo (T5.2).

#### [T5.2] Connector.profile for MongoDB

- **Labels:** type:feature, area:connectors, priority:p1, size:S
- **SPEC:** §3.1
- **Depends on:** T4.6
- **Goal:** The profile layer for document sources.
- **Acceptance:**
  - [ ] Field-path stats via guarded pipelines within budget
- **Out of scope:** none.

#### [T5.3] Freshness, date coverage and value dictionaries

- **Labels:** type:feature, area:knowledge, priority:p0, size:M
- **SPEC:** §3.1, §3.3
- **Depends on:** T5.1
- **Goal:** "Orders span 2019-01 to yesterday."
- **Acceptance:**
  - [ ] Freshness per table and value dictionaries for low-cardinality columns in the knowledge base and table cards
  - [ ] Scheduled refresh
- **Out of scope:** none.

#### [T5.4] Proactive caveats

- **Labels:** type:feature, area:core, priority:p1, size:M
- **SPEC:** §3.3
- **Depends on:** T5.3
- **Goal:** Surface stale data, high null rates, outliers and partial periods.
- **Acceptance:**
  - [ ] Deterministic caveat detection from profiles is fed to the prompt and shown in answers
  - [ ] Eval questions cover partial-period and stale-table cases
- **Out of scope:** none.

#### [T5.5] Insights journal and note_insight

- **Labels:** type:feature, area:knowledge, priority:p2, size:S
- **SPEC:** §3.1, §7
- **Depends on:** T2.4
- **Goal:** Remember notable findings.
- **Acceptance:**
  - [ ] `note_insight` persists through the StorageAdapter; the knowledge base surfaces relevant past insights
- **Out of scope:** none.

#### [T5.6] Hybrid retrieval: embeddings and reciprocal rank fusion

- **Labels:** type:feature, area:knowledge, priority:p1, size:M
- **SPEC:** §3.2, §6.4
- **Depends on:** T1.20, T3.3
- **Goal:** Vector similarity when an embedding model is configured.
- **Acceptance:**
  - [ ] In-memory vectors (Lite) and pgvector or sqlite-vec (Full); RRF merge with BM25
  - [ ] Evals show context recall before and after
- **Out of scope:** none.

### [E5.2] Privacy modes

- **Labels:** type:epic, area:security, priority:p0
- **Goal:** Admins control what the LLM sees per connection.

#### [T5.7] Privacy mode enforcement

- **Labels:** type:feature, area:core, priority:p0, size:M
- **SPEC:** §3.4, §2.2
- **Depends on:** T1.22, T5.3
- **Goal:** `full`, `aggregate` and `schema-only` enforced everywhere data reaches prompts.
- **Acceptance:**
  - [ ] Profiler, table cards, sample values, overview and AI drafting all respect the mode
  - [ ] `schema-only`: no data values, including profile top-k; the app renders the query and chart; the narrative describes only the query
  - [ ] Tests assert prompt payloads contain no values per mode
- **Out of scope:** none.

### [E5.3] Excel and PDF export

- **Labels:** type:epic, area:exporters, priority:p0
- **Goal:** Every answer or conversation exports to Excel or PDF with full data.

#### [T5.8] Export service: re-execute, row limit and audit

- **Labels:** type:feature, area:exporters, priority:p0, size:M
- **SPEC:** §8
- **Depends on:** T1.14
- **Goal:** Exports re-run the stored guarded query.
- **Acceptance:**
  - [ ] Re-executes up to the export row limit (default 100,000, configurable); every export is audited
  - [ ] Answer and whole-conversation scopes
- **Out of scope:** formats.

#### [T5.9] Excel exporter

- **Labels:** type:feature, area:exporters, priority:p0, size:M
- **SPEC:** §8.1
- **Depends on:** T5.8
- **Goal:** `exceljs` workbook with Summary, Data and Query sheets.
- **Acceptance:**
  - [ ] Typed cells, number and date formats, bold frozen header, autofilter and bounded auto-width
  - [ ] Arabic locale sets sheets to right-to-left
- **Out of scope:** chart sheet (T5.11).

#### [T5.10] Chart server-side rendering (SVG and PNG)

- **Labels:** type:feature, area:charts, priority:p0, size:M
- **SPEC:** §3.5, §8
- **Depends on:** T2.11
- **Goal:** ECharts SSR reusing the client option mapper.
- **Acceptance:**
  - [ ] SVG output for all chart types; PNG rasterization (dependency choice justified); Arabic text renders
- **Out of scope:** none.

#### [T5.11] Excel chart sheet

- **Labels:** type:feature, area:exporters, priority:p1, size:S
- **SPEC:** §8.1
- **Depends on:** T5.9, T5.10
- **Goal:** Embed the PNG chart in a Chart sheet.
- **Acceptance:**
  - [ ] One image per chart; sheet omitted when there are no charts
- **Out of scope:** native Excel charts.

#### [T5.12] PDF report template

- **Labels:** type:feature, area:exporters, priority:p0, size:M
- **SPEC:** §8.2
- **Depends on:** T5.10
- **Goal:** An HTML report with correct Arabic shaping and bidi.
- **Acceptance:**
  - [ ] Embedded Latin and Arabic fonts; white-label header (logo and name); data table truncated with a note pointing to Excel
  - [ ] Visual snapshot tests in EN and AR
- **Out of scope:** Chromium runtime (T5.13).

#### [T5.13] PDF rendering with Playwright and feature flag

- **Labels:** type:feature, area:exporters, priority:p0, size:M
- **SPEC:** §8.2
- **Depends on:** T5.12
- **Goal:** Headless Chromium renders the template.
- **Acceptance:**
  - [ ] Page numbers; PDF export is automatically disabled with a clear localized message when Chromium is unavailable
- **Out of scope:** none.

#### [T5.14] Chromium in the production image

- **Labels:** type:build, area:docker, priority:p1, size:S
- **SPEC:** §8.2
- **Depends on:** T5.13, T2.15
- **Goal:** The official image supports PDF export.
- **Acceptance:**
  - [ ] Chromium installed in the image with the size impact reported in the PR; runs sandboxed as non-root
- **Out of scope:** none.

#### [T5.15] Export UI

- **Labels:** type:feature, area:web, priority:p0, size:S
- **SPEC:** §8
- **Depends on:** T5.9, T5.13
- **Goal:** Export buttons for an answer and a conversation.
- **Acceptance:**
  - [ ] Excel and PDF actions with progress and error states; localized and RTL-checked
- **Out of scope:** none.

---

## M6 Providers and hardening (v1.0.0)

### [E6] M6 Providers and hardening

- **Labels:** type:epic, priority:p0
- **Goal:** The complete provider catalog and auth methods, capability probe, cost tracking, dashboards, and performance and security hardening, plus a docs site. Released as v1.0.0.

### [E6.1] Complete provider catalog

- **Labels:** type:epic, area:providers, priority:p0
- **Goal:** Every provider family in SPEC §6.2, verified.

#### [T6.1] Remaining native AI SDK providers

- **Labels:** type:feature, area:providers, priority:p1, size:M
- **SPEC:** §6.2
- **Depends on:** T1.17
- **Goal:** Vertex, Azure OpenAI, Bedrock, Mistral, xAI, Groq, DeepSeek, Cohere, Together, Fireworks, Cerebras, DeepInfra and Perplexity.
- **Acceptance:**
  - [ ] Each entry verified with `docsUrl` and `lastVerified`; recorded-response tests
- **Out of scope:** auth methods (E6.2).

#### [T6.2] Chinese OpenAI-compatible presets with regions

- **Labels:** type:feature, area:providers, priority:p1, size:M
- **SPEC:** §6.2
- **Depends on:** T1.18
- **Goal:** Qwen, Kimi, GLM, MiniMax, ERNIE, Hunyuan, Doubao, SiliconFlow and OpenRouter.
- **Acceptance:**
  - [ ] Mainland China and international endpoints verified per provider (`regions: { cn, intl }`)
- **Out of scope:** none.

#### [T6.3] Local and gateway presets

- **Labels:** type:feature, area:providers, priority:p2, size:S
- **SPEC:** §6.2
- **Depends on:** T1.18
- **Goal:** LM Studio, vLLM, llama.cpp, LocalAI, Jan, LiteLLM, Portkey and Cloudflare AI Gateway.
- **Acceptance:**
  - [ ] Verified presets plus provider guides in `docs/providers/`
- **Out of scope:** none.

### [E6.2] Authentication methods

- **Labels:** type:epic, area:providers, priority:p1
- **Goal:** Every SPEC §6.3 auth method.

#### [T6.4] Azure auth (key and Entra ID)

- **Labels:** type:feature, area:providers, priority:p1, size:M
- **SPEC:** §6.3
- **Depends on:** T6.1
- **Goal:** Azure OpenAI with an API key or an Entra ID token.
- **Acceptance:**
  - [ ] Both modes, with token refresh; secrets encrypted
- **Out of scope:** none.

#### [T6.5] AWS auth for Bedrock

- **Labels:** type:feature, area:providers, priority:p1, size:M
- **SPEC:** §6.3
- **Depends on:** T6.1
- **Goal:** Access keys, session token, default chain or named profile.
- **Acceptance:**
  - [ ] All credential sources supported; the default chain works in Lite; documented
- **Out of scope:** none.

#### [T6.6] GCP auth for Vertex

- **Labels:** type:feature, area:providers, priority:p1, size:S
- **SPEC:** §6.3
- **Depends on:** T6.1
- **Goal:** Service-account JSON or ADC.
- **Acceptance:**
  - [ ] Both modes; service-account JSON stored encrypted
- **Out of scope:** none.

#### [T6.7] OAuth client credentials for gateways

- **Labels:** type:feature, area:providers, priority:p1, size:M
- **SPEC:** §6.3
- **Depends on:** T6.3
- **Goal:** Enterprise gateways with token caching and refresh.
- **Acceptance:**
  - [ ] Token endpoint subject to the SSRF policy; cached until expiry; refresh on 401
- **Out of scope:** none.

#### [T6.8] Command-based token auth (Lite only)

- **Labels:** type:feature, area:providers, priority:p3, size:S
- **SPEC:** §6.3
- **Depends on:** T1.17
- **Goal:** Run a configured local command that prints a short-lived token.
- **Acceptance:**
  - [ ] Disabled by default; Lite only; no shell interpolation; timeout; independent security review
- **Out of scope:** none.

### [E6.3] Model management

- **Labels:** type:epic, area:providers, priority:p1
- **Goal:** Discover models, probe capabilities and track cost.

#### [T6.9] Model discovery and capability probe

- **Labels:** type:feature, area:providers, priority:p1, size:M
- **SPEC:** §6.4
- **Depends on:** T1.17, T1.18
- **Goal:** List models and probe them with "Test connection".
- **Acceptance:**
  - [ ] Model-list endpoint where available, manual entry otherwise
  - [ ] Probe covers completion, tool calling, structured output and streaming; results cached and shown as badges; drives loop vs fixed pipeline
- **Out of scope:** none.

#### [T6.10] Token usage and cost tracking

- **Labels:** type:feature, area:providers, priority:p1, size:M
- **SPEC:** §6.4
- **Depends on:** T3.3
- **Goal:** Usage and estimated cost per message.
- **Acceptance:**
  - [ ] Prices come from the catalog and are editable by users; per-message and per-workspace totals shown
- **Out of scope:** billing.

#### [T6.11] Retries, rate limits and fallback models

- **Labels:** type:feature, area:providers, priority:p1, size:M
- **SPEC:** §6.4
- **Depends on:** T1.15
- **Goal:** Resilient provider calls.
- **Acceptance:**
  - [ ] Backoff with jitter on retryable errors; per-provider rate limits; an optional fallback model per role, recorded on the answer
- **Out of scope:** none.

### [E6.4] Saved answers, dashboards and scheduled reports

- **Labels:** type:epic, area:web, priority:p2
- **Goal:** Full-mode extras that re-run stored queries without the LLM.

#### [T6.12] Saved answers

- **Labels:** type:feature, area:web, priority:p2, size:S
- **SPEC:** §9
- **Depends on:** T3.3
- **Goal:** Pin answers for later.
- **Acceptance:**
  - [ ] Save and list answers; re-run refreshes data via the stored guarded query
- **Out of scope:** none.

#### [T6.13] Dashboards

- **Labels:** type:feature, area:web, priority:p2, size:M
- **SPEC:** §9
- **Depends on:** T6.12
- **Goal:** Grids of saved charts re-run without the LLM.
- **Acceptance:**
  - [ ] Create, arrange and share dashboards; refresh re-executes guarded queries; role-aware
- **Out of scope:** none.

#### [T6.14] Scheduled reports

- **Labels:** type:feature, area:web, priority:p3, size:M
- **SPEC:** §9
- **Depends on:** T6.13, T5.13
- **Goal:** Periodic exports.
- **Acceptance:**
  - [ ] Schedule a dashboard or answer export; delivery target documented (email or webhook, decided in the issue); audited
- **Out of scope:** none.

### [E6.5] Hardening and docs

- **Labels:** type:epic, area:security, priority:p0
- **Goal:** v1.0 quality: fast, secure and documented.

#### [T6.15] Threat model and security hardening pass

- **Labels:** type:feature, area:security, priority:p0, size:M
- **SPEC:** §11, §2
- **Depends on:** T3.16, T5.7
- **Goal:** A documented threat model with findings fixed or ticketed.
- **Acceptance:**
  - [ ] `docs/security/threat-model.md` covers prompt injection, guard bypass, SSRF, secrets and authz
  - [ ] Security headers and CSP; every finding is fixed or has a linked issue
- **Out of scope:** third-party pentest.

#### [T6.16] Performance pass

- **Labels:** type:perf, area:core, priority:p1, size:M
- **SPEC:** §10, §13
- **Depends on:** T5.6
- **Goal:** Measure and fix hot spots.
- **Acceptance:**
  - [ ] Benchmarks for a 1,000-table schema (retrieval), pool reuse and first-token latency; regressions tracked in evals
- **Out of scope:** none.

#### [T6.17] Documentation site

- **Labels:** type:docs, area:docs, priority:p1, size:M
- **SPEC:** §10
- **Depends on:** T4.10, T6.3
- **Goal:** A published docs site built from `docs/`.
- **Acceptance:**
  - [ ] Generator chosen via ADR; getting started, deployment modes, connectors, providers, security and contributing; English, with Arabic for the getting-started pages; deployed by CI
- **Out of scope:** none.
