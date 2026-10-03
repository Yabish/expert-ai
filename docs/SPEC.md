# Product Specification — AI Data Analyst

> Source of truth for WHAT to build. `CLAUDE.md` defines HOW to work.
> Every GitHub issue must reference the section(s) of this file it implements (e.g. `SPEC §6.3`).
> If an issue conflicts with this spec, stop and ask. Record spec changes via PR with an ADR in `docs/adr/`.

---

## 1. Positioning

**The AI data analyst that already understands your ERP, in Arabic and English.**

Connect an Odoo or ERPNext database (or a custom retail or POS SQL Server) and within minutes ask questions like "Which products lost margin this Ramadan compared to last Ramadan?" or "كم ضريبة القيمة المضافة المستحقة هذا الربع؟" (how much VAT is due this quarter?). The answers are correct: they understand posted vs. draft documents, credit notes, multi-company setups and Hijri periods. Nothing needs to be configured first.

### 1.1 Target users

| Segment                                                | Need                                                       | How they find us                                      |
| ------------------------------------------------------ | ---------------------------------------------------------- | ----------------------------------------------------- |
| GCC SMEs and mid-market companies on Odoo or ERPNext   | Answers without hiring a BI analyst or learning reports    | Open-source install, ERP partner recommendation       |
| ERP implementation partners (Odoo/ERPNext integrators) | A value-add for every client; fewer custom report requests | Partner program, multi-client workspaces (Enterprise) |
| Retailers on custom or legacy POS (SQL Server)         | Analytics over systems no BI vendor supports               | Custom pack builder (§5.6)                            |
| Data-sensitive organizations                           | AI analytics without data leaving their premises           | Local models, on-prem deployment, privacy modes       |

### 1.2 The three pillars (our differentiation)

1. **ERP-native.** Domain packs (§5) ship prebuilt business knowledge for Odoo and ERPNext, so correctness starts on day one rather than after weeks of semantic modelling.
2. **Arabic and GCC-native.** Arabic questions over English schemas, Hijri periods, regional seasonality, VAT and ZATCA-aware metrics, and Arabic PDF reports that render correctly (§6).
3. **Private by design.** Any AI provider, including fully local models. Read-only access, data minimization, and on-prem deployment.

### 1.3 Non-goals (v1)

- Not a dashboard or BI replacement (Power BI, Metabase). We answer questions; dashboards are a convenience.
- Not a SQL IDE or database admin tool.
- No write-back to any source system, ever.
- No general-purpose chatbot features unrelated to data.

### 1.4 Success metrics

| Metric                                                                                                     | Target for v0.1             |
| ---------------------------------------------------------------------------------------------------------- | --------------------------- |
| Time from install to first correct answer on an Odoo demo database                                         | < 10 minutes                |
| Execution accuracy on each pack's golden set (reference model)                                             | ≥ 85% English, ≥ 80% Arabic |
| Execution accuracy on the same golden set with a local model (reference: a mid-size open model via Ollama) | ≥ 65%                       |
| Guard false-acceptance rate on the adversarial suite                                                       | 0                           |
| Median answer latency (cloud reference model)                                                              | < 15 s                      |

---

## 2. Non-negotiable principles

1. **Read-only, always.** Enforced at three levels: database account permissions, session or transaction settings, and the query guard (§9). Fail closed.
2. **Data minimization.** The LLM receives schema, knowledge and result _profiles_, never full result sets. Admins choose the privacy mode per connection (§4.4).
3. **Provider neutrality.** Every capability works through the provider abstraction (§10). No vendor SDK is imported outside `packages/providers`.
4. **Transparency.** Every answer shows the executed query, the assumptions, the data freshness, the domain pack and metric definitions used, and the model.
5. **Grounded numbers.** Numbers in the narrative come from query results. The analyst writes another query instead of calculating in its head.
6. **ERP correctness over cleverness.** When a pack defines a metric, the agent uses that definition. It does not improvise its own SQL for a defined business concept.
7. **Scope discipline.** Build what the current milestone needs. Breadth (more databases, more providers) comes after the wedge works.

---

## 3. Editions and business model (open core)

### 3.1 Editions

|                                                                                                                                                                            | Community (open source) | Enterprise (commercial) |
| -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------- | ----------------------- |
| Core analyst, guard, connectors, providers                                                                                                                                 | ✓                       | ✓                       |
| Lite and Full deployment modes                                                                                                                                             | ✓                       | ✓                       |
| Odoo and ERPNext **core** packs (sales, invoicing/accounting basics, inventory, purchase, POS)                                                                             | ✓                       | ✓                       |
| Custom pack builder                                                                                                                                                        | ✓                       | ✓                       |
| Arabic and GCC features, Excel and PDF export                                                                                                                              | ✓                       | ✓                       |
| Basic roles (owner, admin, analyst, viewer)                                                                                                                                | ✓                       | ✓                       |
| **Premium packs:** advanced accounting (aged receivables/payables, cash flow, consolidation), manufacturing, HR/payroll, industry packs (retail chains, F&B, distribution) |                         | ✓                       |
| SSO (SAML / OIDC) and SCIM                                                                                                                                                 |                         | ✓                       |
| Row-level scoping by company, branch or warehouse                                                                                                                          |                         | ✓                       |
| Scheduled reports and alerts (email, Slack, Teams, webhooks)                                                                                                               |                         | ✓                       |
| White-label and custom branding on UI and exports                                                                                                                          |                         | ✓                       |
| Partner console: multi-client workspaces, pack deployment across clients                                                                                                   |                         | ✓                       |
| Audit export and retention policies                                                                                                                                        |                         | ✓                       |
| Priority support                                                                                                                                                           |                         | ✓                       |

A managed cloud offering with in-region hosting is a later business decision, not part of this spec.

### 3.2 Licensing and code structure

- The Community code is open source. The license is decided in `docs/adr/0002-licensing.md` before the first public release. **Recommendation: AGPL-3.0 for the core**, which protects the open-core model from closed hosted forks, plus a commercial license for everything under `ee/`.
- Enterprise code lives in `ee/` (and `packs-ee/`) under a separate commercial license file.
- **The Community code must never import from `ee/`.** Enterprise features plug in through extension points: the plugin registry, storage hooks, auth strategies and pack loaders.
- Enterprise features are activated by an offline-verifiable signed license key (an Ed25519 signature over a JSON payload). Without a key, everything Community works and nothing breaks.
- External contributions require a **CLA** (enforced by a CLA bot on PRs). Without it, contributed code cannot be relicensed commercially.

---

## 4. The embedded expert

### 4.1 Knowledge base (per connection)

Built during onboarding, refreshed on a schedule or on demand, and versioned.

| Layer        | Contents                                                                                                         | Source                                                          |
| ------------ | ---------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------- |
| Structural   | Schemas, tables, columns, types, PK/FK, indexes, row-count estimates, views                                      | Introspection                                                   |
| Data profile | Null %, distinct counts, top-k values, min/max, date coverage and freshness, value dictionaries                  | Budgeted profiling queries (sampled on large tables)            |
| Business     | Descriptions, synonyms (English and Arabic), metrics, logical joins, fiscal calendar, currency, units, PII flags | **Domain pack** (§5) first, then AI auto-draft → human approval |
| Experiential | Verified question→query pairs, user corrections, insights journal                                                | Feedback and usage                                              |

The semantic layer format is YAML, identical in both deployment modes and in domain packs.

### 4.2 Context selection for large schemas

ERP schemas are large (Odoo commonly has hundreds of tables), so this matters from v0.1.

1. **Pack-first.** If a pack is active, select pack entities and metrics matching the question first. Their tables come with them.
2. **Table cards.** One compact card per table: name, description, synonyms, key columns and categorical sample values.
3. **Hybrid retrieval.** BM25 (always available) plus vector similarity when embeddings are configured, merged with reciprocal rank fusion.
4. **Verified-query boost.** Tables used by similar verified queries are added.
5. **FK graph expansion.** Add bridge tables on the shortest join path, one extra hop maximum.
6. **Agent escape hatch.** `search_tables` and `describe_table` remain available to the agent.

Eval metric: context recall, meaning the context contained every table the gold query uses.

### 4.3 Expert behaviours

- New conversation: a one-paragraph data overview (detected system, active modules, date coverage, companies and branches) plus 4–6 suggested questions from the active packs.
- Answer "what data do we have about X?" from the knowledge base without querying.
- Ask **one** clarifying question when the request is genuinely ambiguous. Packs declare known ambiguities, for example "sales" could mean confirmed orders or posted invoices. Otherwise proceed and state the assumptions.
- Proactively mention caveats: stale data, partial periods, draft or cancelled documents excluded, multi-currency conversion applied, archived records excluded.
- End analyses with 2–3 follow-up questions.
- User corrections become proposed semantic-layer updates. They are never silently persisted.
- Never fabricate tables, columns, values or numbers.

### 4.4 Privacy modes (per connection)

| Mode             | LLM sees                                               | Notes                                                     |
| ---------------- | ------------------------------------------------------ | --------------------------------------------------------- |
| `full` (default) | Knowledge base, result profile, up to N sample rows    | All features                                              |
| `aggregate`      | Knowledge base and result profile only                 | Less specific narrative                                   |
| `schema-only`    | Structural and business knowledge only; no data values | LLM writes the query and chart spec; the app renders them |

### 4.5 Answer shape (validated structured output)

```ts
AnalystAnswer {
  answer: string;
  keyFigures: { label; value; unit?; sourceColumn }[];
  charts: ChartSpec[];          // 0–3
  insights: string[];
  recommendations: string[];
  assumptions: string[];
  caveats: string[];
  followUps: string[];
  queries: QueryRef[];
  definitionsUsed: { packId; metricId; version }[];
  confidence: "high" | "medium" | "low";
}
```

ChartSpec types: bar, line, area, pie, scatter, heatmap, kpi and table. Referenced columns are validated before render. Charts render with ECharts on the client and as SSR SVG for exports.

---

## 5. Domain packs (the wedge)

### 5.1 What a pack is

A versioned, data-only bundle of business knowledge for a specific system. Packs contain no executable code, which keeps them safe to share and easy to review.

```
packs/<pack-id>/
  pack.yaml              # manifest
  detect.yaml            # fingerprint rules
  semantic/*.yaml        # entities, metrics, joins, synonyms (en/ar), value dictionaries
  ambiguities.yaml       # known ambiguous terms and the clarifying question to ask
  caveats.yaml           # system-specific pitfalls the analyst must respect
  starters.yaml          # suggested questions and starter answer templates
  golden/*.yaml          # eval questions (en + ar) with expected results on the demo DB
  README.md
```

`pack.yaml` declares: `id`, `name`, `version` (semver), `edition` (`community` or `enterprise`), `appliesTo` (product and supported versions), `modules` (sub-packs activated per installed ERP module), `requires` (connector dialects), `locales`, and `maintainers`.

### 5.2 Detection and activation

On connection (and on refresh), run each installed pack's `detect.yaml` fingerprint queries. These are read-only, guard-approved and cheap. A match:

1. identifies the product and version,
2. reads the installed modules (Odoo `ir_module_module` where `state = 'installed'`; ERPNext installed apps and module definitions),
3. activates the matching sub-packs,
4. shows the user what was detected, and lets an admin confirm or override it.

Detection must never assume. If the version is outside the pack's supported range, activate in a "best effort" state with a visible warning, and record it.

### 5.3 What packs must get right (examples that drive the design)

These are examples of the system knowledge packs encode. **Every schema fact in a pack must be verified against a real instance of that ERP version in the dev stack, not written from memory.**

- **Odoo:** revenue comes from posted customer invoices net of credit notes (accounting moves by move type and posted state), not from sale orders. `active = false` records are archived. Translatable fields on recent versions are stored as JSON keyed by language, so the pack must extract the user's language. Multi-company and multi-currency amounts must be handled (company currency vs. document currency). POS sessions and orders are separate from sales orders.
- **ERPNext:** tables are prefixed `tab` and contain spaces (identifiers must be quoted). `docstatus` separates draft (0), submitted (1) and cancelled (2) documents, and most metrics must filter to submitted. Returns are documents flagged as returns against the original. Accounting truth lives in the General Ledger entries.
- **Common to both:** company and branch (warehouse or POS config) dimensions, the fiscal year, tax lines for VAT reporting, and the units of measure on stock quantities.

### 5.4 v0.1 packs (Community)

| Pack      | Modules                                                                                            |
| --------- | -------------------------------------------------------------------------------------------------- |
| `odoo`    | Sales, Invoicing/Accounting basics (revenue, receivables, VAT), Inventory, Purchase, Point of Sale |
| `erpnext` | Selling, Buying, Accounts basics, Stock, POS                                                       |

Supported versions are declared per pack, starting with the versions available in the dev stack. Each new ERP major version gets its own tested pack version.

### 5.5 Pack quality bar

- At least 40 golden questions per pack (at least 30% in Arabic), covering every module, including questions that should trigger a clarification.
- CI runs pack evals against the ERP demo instances in the dev stack (official Odoo and ERPNext/Frappe container images with demo data). Pack PRs must show the eval delta.
- Metric definitions include a plain-language explanation in English and Arabic, which is shown to users on request ("how did you calculate this?").

### 5.6 Custom pack builder

Turns any unknown schema, such as a custom retail POS on SQL Server, into a pack:

1. Introspection and profiling.
2. AI drafts entities, metrics, joins and Arabic/English synonyms.
3. A human reviews and approves each item in the UI.
4. The user writes or approves golden questions.
5. Export as a pack folder that can be versioned in git and shared.

ERP partners and integrators use this to build packs for their clients. Enterprise adds publishing of private packs across a partner's client workspaces.

---

## 6. Arabic and GCC features

- **Language.** Arabic questions over English schemas, including tolerance for Gulf dialect phrasing. Answers come in the question's language unless the user's setting overrides it. Arabic synonyms are first-class in packs.
- **Numerals.** Accept Arabic-Indic digits (٠-٩) in input. Output digit style is a user preference.
- **Hijri calendar.** Parse Hijri periods ("Ramadan 1447", "last Ramadan", "رمضان الماضي") into Gregorian date ranges using the Umm al-Qura calendar. Display Hijri dates on request. Use the JS `Intl` `islamic-umalqura` calendar for formatting, and a verified, tested library for Hijri→Gregorian conversion. This needs dedicated tests around month boundaries.
- **Seasonality calendar.** A built-in, versioned events calendar: Ramadan, Eid al-Fitr, Eid al-Adha, Saudi National Day, Founding Day, White Friday and back-to-school, with configurable additions per organization. This enables "this Ramadan vs last Ramadan" comparisons on moving dates.
- **Week and weekend.** Configurable week start and weekend days per organization (the Saudi default is a Friday–Saturday weekend).
- **Currency and VAT.** Per-company currency (SAR, AED and others). VAT metrics come from ERP tax lines: output VAT, input VAT and net payable per period. VAT rates differ by GCC country, so they are always read from the ERP tax configuration, never hard-coded.
- **E-invoicing (ZATCA).** Where the ERP stores e-invoicing submission data (the fields depend on the installed localization module), packs expose compliance metrics such as invoices pending, reported, cleared or rejected. Field mappings must be verified per localization module and version.
- **RTL everywhere.** UI, tables, charts, the Excel sheet view and PDF reports.
- **Deployment.** On-prem and local-model support are core features, for organizations with data-residency requirements. Documentation describes the data flows clearly so customers can assess them against their obligations. The product makes no compliance certification claims.

---

## 7. Data sources

### 7.1 Connector interface

```ts
type QueryIR =
  | { kind: "sql"; dialect: SqlDialect; text: string }
  | { kind: "mongo"; collection: string; pipeline: object[] };

interface Connector {
  id: string;
  family: "sql" | "document";
  capabilities: {
    explain: boolean;
    readOnlyTxn: boolean;
    schemas: boolean;
    timeouts: boolean;
  };
  test(): Promise<ConnectionInfo>;
  introspect(o: IntrospectOptions): Promise<SchemaSnapshot>;
  profile(o: ProfileOptions): Promise<DataProfile>;
  explain?(q: QueryIR): Promise<CostEstimate>;
  execute(q: QueryIR, o: { timeoutMs; maxRows; signal }): Promise<QueryResult>; // guard-approved only
  close(): Promise<void>;
}
```

Connectors live in a registry, so community connectors can be added without touching core.

### 7.2 Sources and phasing

| Source          | Phase    | Why this phase                                   | Driver                      | Read-only enforcement (plus guard)                                                                               | Row limit                        |
| --------------- | -------- | ------------------------------------------------ | --------------------------- | ---------------------------------------------------------------------------------------------------------------- | -------------------------------- |
| PostgreSQL      | **v0.1** | Odoo                                             | `pg`                        | Read-only role; `SET TRANSACTION READ ONLY`; `statement_timeout`                                                 | `LIMIT`                          |
| MariaDB / MySQL | **v0.1** | ERPNext                                          | `mariadb` or `mysql2` (ADR) | SELECT-only grants; `START TRANSACTION READ ONLY`; `max_statement_time` (MariaDB) / `max_execution_time` (MySQL) | `LIMIT`                          |
| SQL Server      | **v0.1** | Custom retail, POS and legacy ERPs in the region | `mssql`                     | `db_datareader` with explicit `DENY`; request timeout                                                            | `TOP` / `OFFSET FETCH`           |
| Oracle          | M6       | Enterprise demand                                | `oracledb` (Thin mode)      | SELECT-only grants; `SET TRANSACTION READ ONLY`; `callTimeout`                                                   | `FETCH FIRST n ROWS ONLY` (12c+) |
| MongoDB         | M6       | Demand-driven                                    | `mongodb`                   | `read` role only; `maxTimeMS`                                                                                    | `$limit`                         |
| SQLite          | M6       | Demos and tests                                  | `better-sqlite3`            | Read-only open flag                                                                                              | `LIMIT`                          |

Do not start M6 sources before v0.2.0 ships. Every source ships copy-paste scripts for creating a least-privilege user (`docs/connectors/<source>.md`). For the ERP packs, the docs also show how to create a read-only user against a typical Odoo or ERPNext deployment.

---

## 8. Agent (`packages/core`)

Tools: `search_tables`, `describe_table`, `get_sample_values`, `get_metric` (returns the pack or semantic definition, including its query template), `search_verified_queries`, `run_query`, `ask_clarification`, `resolve_period` (Gregorian, Hijri and named events → date range), `note_insight`.

`run_query` always goes guard → connector → profiler. It returns a profile and a `queryId`; the UI fetches full rows by `queryId`, never through the LLM.

When a question maps to a pack metric, the agent must compose from the metric's query template (adding filters, grouping and periods) rather than writing equivalent SQL from scratch.

Loop limits (configurable): 8 steps, 5 query executions, 3 self-corrections per failed query, and a wall-clock budget. Models without tool calling use the fixed pipeline. Prompts are versioned in `packages/core/prompts/`, and changing them requires an eval run (§13). Data in tool output is wrapped and labelled as untrusted.

---

## 9. Query guard (`packages/query-guard`)

A pure, I/O-free module: `guard(q, policy) → { ok: true, query } | { ok: false, code, reason }`.

### 9.1 SQL rules (all dialects)

- Parse with `node-sql-parser` in the right dialect. **Verify parser support per dialect.** Where it is missing or partial, use the strict fallback (§9.2). Never skip validation.
- Exactly one statement; the top level must be `SELECT` or `WITH … SELECT`.
- Reject data-modifying CTEs, `SELECT … INTO`, `FOR UPDATE` / `FOR SHARE` and locking hints.
- Per-dialect function blocklists, e.g. Postgres `pg_sleep*`, `pg_read_*`, `pg_ls_dir`, `lo_*`, `dblink*`, `set_config`, `nextval`, `setval`, `pg_advisory_*`, `pg_terminate_backend`; SQL Server `xp_*`, `sp_*`, `OPENROWSET`, `OPENQUERY`, `OPENDATASOURCE`, `WAITFOR`; MySQL/MariaDB `SLEEP`, `BENCHMARK`, `LOAD_FILE`, `GET_LOCK`, `INTO OUTFILE` / `DUMPFILE`; Oracle `DBMS_*`, `UTL_*`, `EXECUTE IMMEDIATE`.
- Table and column allowlists per connection. Masked columns are rejected with an actionable message.
- Rewrite to enforce the row cap, preserving any smaller user limit.
- A cost gate via `explain` where available.
- Quoted identifiers with spaces (as in ERPNext's `tab…` tables) must be handled correctly by the allowlist and must never be usable to bypass it.

### 9.2 Strict fallback

Strip comments and literals. The first keyword must be `SELECT` or `WITH`, with at most one trailing semicolon. Reject DML, DDL, DCL and transaction keywords anywhere, plus the dialect blocklist. Over-strict by design: a false rejection is acceptable, a false acceptance is not.

### 9.3 MongoDB rules (M6)

Aggregate pipelines only, validated by Zod. Stage allowlist: `$match`, `$project`, `$addFields`/`$set`, `$unset`, `$group`, `$sort`, `$limit`, `$skip`, `$unwind`, `$count`, `$facet`, `$bucket`, `$bucketAuto`, `$sortByCount`, `$replaceRoot`/`$replaceWith`, plus `$lookup`/`$graphLookup`/`$unionWith` against allowlisted collections only. Blocked anywhere in the tree: `$out`, `$merge`, `$function`, `$accumulator`, `$where`. Append `$limit` and set `maxTimeMS`.

### 9.4 Tests

An adversarial fixture suite: comment smuggling, case variants, unicode homoglyphs, nested and data-modifying CTEs, stacked statements, every blocklisted function, allowlist bypass via aliases or quoted identifiers, and `$out` nested in `$facet`. Target: 100% branch coverage.

---

## 10. AI providers (`packages/providers`)

### 10.1 Principle

Built on the Vercel AI SDK provider abstraction, plus a **provider catalog** (`packages/providers/catalog/*.json`) of data-only presets. Every entry needs `docsUrl` and `lastVerified`. **Base URLs, model IDs and package names must be verified in official documentation, never written from memory.**

### 10.2 Families and phasing

| Family            | Phase    | Covers (verify current availability and endpoints)                                                                                                                                                                                                                                                                        |
| ----------------- | -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| OpenAI-compatible | **v0.1** | OpenAI, DeepSeek, Alibaba Qwen, Moonshot Kimi, Zhipu GLM, MiniMax, Baidu Qianfan, Tencent Hunyuan, ByteDance Volcengine Ark, SiliconFlow, OpenRouter, Groq, Together, Fireworks; local (Ollama, LM Studio, vLLM, llama.cpp server, LocalAI, Jan); gateways (LiteLLM, Portkey, Cloudflare AI Gateway); any custom endpoint |
| Anthropic         | **v0.1** | Anthropic, plus any Anthropic-compatible endpoint via a custom base URL                                                                                                                                                                                                                                                   |
| Google            | **v0.1** | Gemini API                                                                                                                                                                                                                                                                                                                |
| Cloud-native auth | M6       | Azure OpenAI, Amazon Bedrock, Google Vertex AI                                                                                                                                                                                                                                                                            |
| Other native SDKs | M6       | Mistral, xAI, Cohere, Cerebras, DeepInfra, Perplexity, and others with native packages                                                                                                                                                                                                                                    |

Catalog entries support `regions: { cn, intl }` for providers with separate mainland-China and international endpoints.

### 10.3 Authentication methods

v0.1: `none`, `api-key` (configurable header and prefix), `custom-headers`.
M6: `azure` (key or Entra ID), `aws` (keys, credential chain or profile), `gcp` (service account or ADC), `oauth-client-credentials` (with token caching), and `command` (Lite mode only, disabled by default).

Secrets are encrypted at rest and never returned to the browser.

### 10.4 Model management

- Model discovery via list endpoints where available, manual entry otherwise.
- A capability probe (completion, tools, structured output, streaming), shown as badges.
- Roles: `analyst`, `fast` and `embedding` (optional; local embeddings supported). Workspace defaults with a per-conversation override.
- The fixed pipeline handles models without tool calling.
- Tokens and estimated cost per message, using user-editable prices.
- Retries, per-provider rate limits and an optional fallback model per role.
- **Recommended-models page.** Publish each release's pack eval results per tested model, so users choose based on measured accuracy, including local options.

---

## 11. Exports (`packages/exporters`)

Exports re-execute the stored guard-approved query up to the export limit (default 100k rows) and are audit-logged. They work for a single answer or a whole conversation.

- **Excel (v0.1):** built with `exceljs`. Summary sheet (answer, key figures, insights, recommendations, assumptions, caveats, definitions used, metadata), Data sheet (typed, formatted, frozen header, autofilter), Query sheet, and a Chart sheet with a server-rendered PNG. RTL sheet view for Arabic.
- **PDF (M4):** an HTML report template rendered by headless Chromium (Playwright). Charts are SSR SVG, fonts are embedded (Latin plus Arabic), and the PDF has a branded header (white-label in Enterprise) and page numbers. The data table is truncated with a pointer to the Excel export. This is a feature flag that is auto-disabled when Chromium is unavailable. The official image includes Chromium.

---

## 12. Deployment modes

|                          | Lite (no app DB) — **v0.1**                  | Full (app DB) — M4                          |
| ------------------------ | -------------------------------------------- | ------------------------------------------- |
| Config                   | `analyzer.config.yaml` with `${ENV}` secrets | UI-managed, encrypted                       |
| Semantic layer and packs | `semantic/*.yaml`, `packs/`                  | DB-backed, with YAML import/export          |
| Knowledge cache          | Memory plus `.cache/`                        | Versioned snapshots with diffs              |
| Retrieval                | BM25 (+ optional in-memory vectors)          | BM25 plus pgvector or sqlite-vec            |
| Chat history             | Browser IndexedDB                            | Server-side, shareable                      |
| AI credentials           | Server env or browser bring-your-own-key     | Per user or workspace, encrypted            |
| Auth                     | None or single password                      | Users, workspaces, roles; SSO in Enterprise |
| Learning                 | `semantic/verified-queries.yaml`             | Feedback UI and verified-query library      |
| Audit                    | JSONL / stdout                               | `audit_log` table                           |

The app DB is never the analyzed database. Self-hosted Node runtime, not serverless.

---

## 13. Architecture, repo and quality

### 13.1 Layout

```
apps/web                 Next.js App Router — thin UI and API layer
packages/core            agent, prompts, tools, profiler, answer schema
packages/connectors      registry + per-source connectors
packages/query-guard     §9 — pure
packages/providers       §10 — catalog, auth, probe
packages/knowledge       introspection, profiling, semantic layer, retrieval, pack loader and detection
packages/calendar        Hijri conversion, events calendar, period resolution
packages/storage         lite and full adapters
packages/charts          ChartSpec, client and SSR renderers
packages/exporters       xlsx, pdf
packages/i18n            en/ar catalogs, RTL helpers, numeral handling
packages/evals           golden runner, pack evals, model comparison reports
packages/config          shared presets
packs/                   community domain packs (data only)
ee/                      enterprise code (commercial license)
packs-ee/                enterprise packs (commercial license)
docker/                  dev stack, ERP demo instances, production image
docs/                    SPEC, ADRs, connector, provider and pack guides
```

UI stack: shadcn/ui, Tailwind, TanStack Table and Query, ECharts.

### 13.2 Security

AES-256-GCM encryption for credentials, with a master key from env and key-id rotation. Execution is server-only. SSRF policy covers database hosts and AI base URLs; private ranges are allowed only by an admin policy, since self-hosted installs need them. Rate limits apply. Every query is audited. Data in prompts is treated as untrusted. CI runs dependency and secret scanning. `SECURITY.md` covers vulnerability disclosure.

### 13.3 Evaluation

- **Dev stack datasets:** Odoo and ERPNext demo instances (official images with demo data) for pack evals, plus a synthetic retail dataset in SQL Server (stores, products, customers with mixed Arabic and English names, orders, returns, inventory, promotions; 2 years spanning two Ramadans) for the generic and custom-pack-builder evals.
- **Metrics:** execution accuracy (results compared, not query text), context recall, clarification correctness, Hijri/period resolution accuracy, tokens and cost, latency, guard rejections.
- PRs touching prompts, retrieval, the agent or packs must include a before/after eval summary.
- CI: unit tests on every PR. Integration tests against Postgres, MariaDB and SQL Server on every PR. Pack evals against the ERP demo instances nightly and on the `ci:packs` label. Oracle and MongoDB jobs are added in M6.

---

## 14. Milestones

| Milestone                  | Scope                                                                                                                                                                                         | Release                              |
| -------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------ |
| M0 Foundation              | Monorepo, tooling, CI, GitHub templates and labels, CLA bot, licensing ADR, `ee/` boundary lint rule, dev stack (Postgres, MariaDB, SQL Server, Odoo and ERPNext demo instances, retail seed) | —                                    |
| M1 Engine core             | Connectors (Postgres, MariaDB/MySQL, SQL Server), query guard, providers (OpenAI-compatible, Anthropic, Google), agent loop, profiler, evals CLI                                              | —                                    |
| M2 Domain packs            | Pack format and loader, detection, `odoo` and `erpnext` core packs with golden sets, pack evals in CI, metric-template composition in the agent                                               | —                                    |
| M3 Lite MVP and Arabic/GCC | Chat UI, answer rendering, charts, query panel, Lite config, Arabic/RTL, numerals, Hijri and events calendar, VAT metrics, Excel export, Docker image, recommended-models page                | **v0.1.0** "Ask your Odoo / ERPNext" |
| M4 Full mode and builder   | App DB, auth, roles, encrypted credentials, custom pack builder, verified queries, audit, privacy modes, PDF export, SSRF policy                                                              | v0.2.0                               |
| M5 Enterprise foundations  | License keys, SSO, row-level company/branch scoping, scheduled reports and alerts, white-label, partner console, first premium pack (advanced accounting)                                     | v0.3.0                               |
| M6 Breadth                 | Oracle, MongoDB, SQLite; cloud-native provider auth and remaining native SDKs; dashboards; performance and security hardening; docs site                                                      | v1.0.0                               |
