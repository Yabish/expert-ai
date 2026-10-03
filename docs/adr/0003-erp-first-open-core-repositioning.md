# 0003. Reposition as an ERP-first, Arabic/GCC-native, open-core analyst

- **Status:** Accepted
- **Date:** 2026-10-03
- **Deciders:** @Yabish
- **Issue / PR:** #169

## Context

The first spec (2026-10-01) described a generic AI data analyst for any database, with breadth first: six SQL and document sources, about 40 AI providers, and every auth method. A generic "chat with your database" product competes with many funded tools and with BI vendors' own assistants. It also delivers weak answers on real business systems: without business knowledge, the model reads a sales order as revenue, counts drafts and cancelled documents, and ignores credit notes and multi-company currency.

Our likely first users are GCC SMEs on Odoo or ERPNext, their implementation partners, and retailers on custom SQL Server POS systems. They need correct answers in Arabic and English, regional calendars (Hijri, Ramadan) and VAT. Many also need data to stay on their premises.

## Decision

We adopt the revised SPEC (2026-10-03):

1. **Three pillars** define the product: ERP-native (domain packs), Arabic and GCC-native, and private by design (SPEC §1.2). Where depth in a pillar competes with breadth, depth wins.
2. **Domain packs** (SPEC §5) are versioned, data-only YAML bundles for Odoo and ERPNext. Pack metric definitions take precedence over agent-improvised SQL. Every pack fact is verified against a running ERP instance in the dev stack.
3. **Wedge-first milestones** (SPEC §14): M2 domain packs and M3 Arabic/GCC with Lite mode ship as v0.1.0, before any breadth. v0.1 sources are Postgres, MariaDB/MySQL and SQL Server. Oracle, MongoDB, SQLite and cloud-native provider auth move to M6 and are not started before v0.2.0.
4. **Open core** (SPEC §3): a Community edition and an Enterprise edition in `ee/` and `packs-ee/`, connected only through extension points, with a CLA for external contributions. The core license is decided in ADR-0002. The recommendation is AGPL-3.0, which matches the LICENSE already in the repo.
5. **Working agreement** (CLAUDE.md): adds `edition:*` and `pillar:*` labels, rules 10–14 (open-core boundary, verified packs, pack metrics win, scope discipline, no hard-coded regional facts), and pack evals in the task loop.

## Consequences

- The backlog is re-planned. Existing issues are reused where the work survives, moved to their new milestone, or closed as not planned with a pointer to the replacement.
- The dev stack drops MySQL, MongoDB and Oracle until M6 and adds an `erp` profile with Odoo and ERPNext demo instances. This is heavier to run, so pack evals run nightly and on the `ci:packs` label.
- New packages and folders: `packages/calendar`, `packs/`, `ee/` and `packs-ee/`. A lint rule enforces the open-core boundary.
- We trade addressable market for depth. Users of other databases wait for M6, or use the custom pack builder (M4) on supported dialects.
- Revisit this decision if, after v0.1.0, pack evals don't reach the SPEC §1.4 targets, or if real demand concentrates elsewhere.

## Alternatives considered

- **Stay generic, breadth first.** The widest reach, but it ships the weakest answers and has no defensible difference. Rejected.
- **ERP-first without open core** (single AGPL edition, services revenue). Simpler, but gives no sustainable funding path for enterprise needs such as SSO, row-level scoping and partner consoles. Rejected in favour of open core with a clear `ee/` boundary.
- **Closed source.** It would lose the trust that on-prem, data-sensitive buyers place in inspectable code, and the community packs ecosystem. Rejected.
