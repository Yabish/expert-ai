# Contributing to expert-ai

Thank you for helping build an AI data analyst that understands ERPs, in Arabic and English. This guide covers the essentials. The binding rules live in [`CLAUDE.md`](CLAUDE.md) (how we work) and [`docs/SPEC.md`](docs/SPEC.md) (what we build), and they apply to humans and AI agents alike.

## Before you start

- **Find or open an issue first.** Every change is one issue → one branch → one PR. Tasks are sized S or M and have acceptance criteria and SPEC references.
- **Check the milestone.** We build wedge-first (SPEC §14). Breadth work (Oracle, MongoDB, SQLite, cloud-native provider auth) is scheduled for M6 and isn't started before v0.2.0.
- **Security issues** go through [SECURITY.md](SECURITY.md), never a public issue.
- **Be kind.** We follow the [Code of Conduct](CODE_OF_CONDUCT.md).

## Contributor License Agreement

expert-ai is open core (ADR-0002). The Community edition is AGPL-3.0, and Enterprise code in `ee/` and `packs-ee/` is commercial. So that contributions can be offered under both, external contributors sign a [CLA](docs/legal/CLA.md) once. A bot asks you to sign on your first pull request.

## Setup

Requirements: Node.js 24 LTS (see `.nvmrc`), pnpm 12 and Docker.

```sh
pnpm install
pnpm build && pnpm lint && pnpm typecheck && pnpm test

cp docker/dev/.env.example docker/dev/.env
docker compose -f docker/dev/compose.yml up -d                 # Postgres, MariaDB, SQL Server
docker compose -f docker/dev/compose.yml --profile erp up -d   # + Odoo and ERPNext demo instances
```

See [`docker/dev/README.md`](docker/dev/README.md) for ports, users and Apple Silicon notes. The full command list is in CLAUDE.md.

## Workflow

1. **Branch from `develop`:** `<type>/<issue#>-<slug>`, for example `feat/42-odoo-net-revenue`. Types: `feat`, `fix`, `refactor`, `perf`, `test`, `docs`, `chore`, `ci`, `build`.
2. **Commit with Conventional Commits**, for example `feat(packs/odoo): define net revenue from posted invoices`. Scopes are listed in CLAUDE.md, plus `packs/<id>`. Explain _why_ in the body, and end it with `Refs #<issue>`.
3. **Open a PR to `develop`** using the template. The **PR title becomes the squash commit and the changelog line**, and CI checks its format.
4. **CI must pass:** lint, typecheck, unit tests, format, PR title, secret scan and dependency review (vulnerabilities, plus licenses compatible with AGPL-3.0).

Every bug fix starts with a failing test. New logic needs tests.

## Rules that are checked or reviewed

- **Read-only is sacred.** Every query goes through `packages/query-guard`. Never weaken a guard rule to make a test pass.
- **Data minimization.** Raw result sets never go to the LLM, only profiles, according to the privacy mode.
- **Boundaries, enforced by lint:**
  - vendor AI SDKs only in `packages/providers`;
  - database drivers only in `packages/connectors` (and the app DB in `packages/storage`);
  - no Next.js in `packages/`;
  - **no Community import of `ee/` or `packs-ee/`**.
- **i18n and RTL from day one.** No hard-coded UI strings. User-facing work has at least one Arabic acceptance criterion, and screenshots in both LTR and RTL.
- **No hard-coded regional facts.** VAT rates, currencies, weekends and holidays come from ERP configuration or the versioned events calendar.
- **Dependencies:** use current stable versions, and justify each new one (maintenance, license, size) in the PR.
- **Decisions** that are hard to reverse need an ADR in [`docs/adr/`](docs/adr/README.md).

## Contributing a domain pack

Packs (SPEC §5) are **data only**: YAML, never code.

1. Run the matching ERP demo instance: `--profile erp`.
2. **Verify every fact** (table, column, state value, module name) against that running instance, and record the ERP version in `pack.yaml` `appliesTo`. Facts written from memory are rejected.
3. Add golden questions for every new metric, at least 30% of them in Arabic, including questions that should trigger a clarification.
4. Run `pnpm packs:eval -- --pack <id> --provider <id> --model <id>`, and put the English and Arabic accuracy, before and after, in the PR.

## Adding a connector or provider

- **Connectors** register in the connector registry and must pass the shared conformance suite, including the check that writes fail even when the guard is bypassed. Ship a least-privilege setup guide in `docs/connectors/<source>.md`.
- **Provider catalog entries** are data in `packages/providers/catalog/`. Base URLs, model IDs and package names must come from the provider's official documentation, with `docsUrl` and `lastVerified` filled in.

## Releases

Releases are cut per milestone with release-please. The procedure is in [ADR-0004](docs/adr/0004-release-automation.md).

## Questions

Comment on the relevant issue, or open a new one using the feature or task form. If the SPEC is ambiguous, ask before building.
