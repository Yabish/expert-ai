# Product Specification — AI Data Analyst

> Source of truth for WHAT to build. `CLAUDE.md` defines HOW to work.
> Every GitHub issue must reference the section(s) of this file it implements (e.g. `SPEC §5.2`).
> If an issue conflicts with this spec, stop and ask. Record spec changes via PR with an ADR in `docs/adr/`.

---

## 1. Vision

An open-source, self-hostable web application that behaves like a **senior data analyst embedded inside the organization's systems**. It connects to the user's databases through a read-only account. It learns the structure and business meaning of the data, then answers natural-language questions in English and Arabic. It runs safe queries, and returns analysis, charts, recommendations and next-step suggestions. Every answer can be exported to Excel or PDF.

The user chooses the AI provider and model: global cloud, Chinese, enterprise gateways, or fully local. Nothing about the product may assume a specific vendor.

## 2. Non-negotiable principles

1. **Read-only, always.** Enforced at three levels: database account permissions, session or transaction settings, and a query guard in the app. Fail closed.
2. **Data minimization.** The LLM receives schema, knowledge and result *profiles*. It never receives full result sets. Admins choose the privacy mode per connection (§3.4).
3. **Provider neutrality.** Every capability works through the provider abstraction (§6). No vendor SDK is imported outside `packages/providers`.
4. **Transparency.** Every answer shows the executed query, the assumptions made, the data freshness and the model used.
5. **Grounded numbers.** Numbers in the narrative must come from query results. The analyst never does mental arithmetic on data; it writes another query instead.
6. **Two deployment modes, one codebase.** Lite (no app database) and Full (with app database), selected by the storage adapter (§9).

---

## 3. The embedded expert

The product's identity: an analyst who already knows the company's data before the user asks anything.

### 3.1 Knowledge base (per connection)

Built during connection onboarding, refreshed on a schedule or on demand, and versioned.

| Layer | Contents | Source |
|---|---|---|
| Structural | Schemas, tables or collections, columns or fields, types, PK/FK, indexes, row-count estimates, views. For MongoDB: inferred schema from `$sample` (field paths, type distribution, presence %) | Introspection |
| Data profile | Null %, distinct count, top-k values, min/max, date coverage and freshness ("orders span 2019-01 to yesterday"), value dictionaries for low-cardinality columns | Profiling queries (budgeted, sampled on large tables) |
| Business | Descriptions, synonyms (English and Arabic), metric definitions, logical joins not declared as FKs, fiscal calendar, currency, units, PII flags | AI auto-draft → human approval (semantic layer) |
| Experiential | Verified question→query pairs, user corrections ("sales excludes returns"), an insights journal of notable past findings | Feedback and usage |

The semantic layer file format is YAML and is identical in both modes (Lite stores files; Full stores rows and can export and import YAML).

### 3.2 Context selection for large schemas

Never send the entire schema when it exceeds a token budget (configurable, default ~8k tokens).

1. **Table cards.** One compact text card per table: name, description, synonyms, key columns, and sample values of categorical columns.
2. **Hybrid retrieval.** BM25 over table cards, always available, plus vector similarity when embeddings are configured. Merge with reciprocal rank fusion.
3. **Verified-query boost.** Tables used by the top similar verified queries are added.
4. **FK graph expansion.** Add bridge tables on the shortest join path between selected tables, one hop maximum beyond that.
5. **Agent escape hatch.** The agent can call `search_tables` or `describe_table` if the initial context is insufficient.

Measure recall of this step in evals (did the context contain every table the gold query uses?).

### 3.3 Expert behaviours

- On a new conversation, give a one-paragraph overview of the available data plus 4–6 suggested questions derived from the knowledge base.
- Answer "what data do we have about X?" from the knowledge base without querying.
- Ask **one** clarifying question when a request is genuinely ambiguous (metric, period, grain). Otherwise proceed and state the assumptions.
- Proactively surface caveats: stale data, high null rates, outliers, partial periods (e.g. the current month is incomplete).
- End every analysis with 2–3 suggested follow-up questions.
- When the user corrects a definition, propose a semantic-layer update. Never silently persist it.
- Never fabricate tables, columns, values or numbers. If the data cannot answer the question, say so and say what data would.

### 3.4 Privacy modes (per connection)

| Mode | LLM sees | Available features |
|---|---|---|
| `full` (default) | Knowledge base, result profile and up to N sample rows | Everything |
| `aggregate` | Knowledge base and result profile only | Everything; narrative is less specific |
| `schema-only` | Structural and business knowledge only; no data values, including profile top-k values | LLM writes the query and chart spec; the app renders them; narrative limited to describing the query |

### 3.5 Answer shape (validated structured output)

```ts
AnalystAnswer {
  answer: string;              // direct answer, 1–3 sentences
  keyFigures: { label; value; unit?; sourceColumn }[];
  charts: ChartSpec[];         // 0–3
  insights: string[];
  recommendations: string[];
  assumptions: string[];
  caveats: string[];
  followUps: string[];
  queries: QueryRef[];         // ids of executed queries
  confidence: "high" | "medium" | "low";
}
```

`ChartSpec` types: bar, line, area, pie, scatter, heatmap, kpi and table. All referenced columns must exist in the referenced result, which is checked before render. Charts render with ECharts on the client and server-side as SVG for exports.

---

## 4. Data sources

### 4.1 Connector interface

```ts
type QueryIR =
  | { kind: "sql"; dialect: SqlDialect; text: string }
  | { kind: "mongo"; collection: string; pipeline: object[] };

interface Connector {
  id: string; family: "sql" | "document";
  capabilities: { explain: boolean; readOnlyTxn: boolean; schemas: boolean; timeouts: boolean };
  test(): Promise<ConnectionInfo>;          // includes server version
  introspect(o: IntrospectOptions): Promise<SchemaSnapshot>;
  profile(o: ProfileOptions): Promise<DataProfile>;
  explain?(q: QueryIR): Promise<CostEstimate>;
  execute(q: QueryIR, o: { timeoutMs; maxRows; signal }): Promise<QueryResult>; // q MUST be guard-approved
  close(): Promise<void>;
}
```

Connectors are registered in a registry, so community connectors can be added without touching core.

### 4.2 Supported sources

| Source | Driver | Read-only enforcement (in addition to the guard) | Row limit | Notes |
|---|---|---|---|---|
| PostgreSQL | `pg` | Read-only role; `SET TRANSACTION READ ONLY`; `statement_timeout` | `LIMIT` | `EXPLAIN (FORMAT JSON)` cost gate |
| MySQL | `mysql2` | SELECT-only grants; `START TRANSACTION READ ONLY`; `max_execution_time` | `LIMIT` | |
| MariaDB | `mariadb` or `mysql2` (decide via ADR) | SELECT-only grants; `START TRANSACTION READ ONLY`; `max_statement_time` | `LIMIT` | Separate dialect config from MySQL |
| SQL Server | `mssql` (tedious) | `db_datareader` with explicit `DENY`; request timeout (no read-only txn available) | `TOP` / `OFFSET FETCH` | Guard is critical here |
| Oracle | `oracledb` (Thin mode, no Instant Client) | SELECT-only grants (never `ANY` privileges); `SET TRANSACTION READ ONLY`; `callTimeout` | `FETCH FIRST n ROWS ONLY` | 12c+ only; reject older versions at `test()` with a clear message |
| MongoDB | `mongodb` | User with `read` role only; `maxTimeMS` | `$limit` appended | Aggregation pipeline only (§5.3) |
| SQLite | `better-sqlite3` | Open with the read-only flag | `LIMIT` | Useful for demos and tests |

Later (post-v1, community): ClickHouse, Snowflake, BigQuery, and CSV/Excel uploads via DuckDB.

Docs must ship copy-paste scripts that create a least-privilege read-only user for every source (`docs/connectors/<source>.md`).

---

## 5. Query guard (`packages/query-guard`)

A pure, dependency-light module with no I/O, and the most heavily tested package in the repo. Signature:

```ts
guard(q: QueryIR, policy: ConnectionPolicy): { ok: true; query: QueryIR /* rewritten */ } | { ok: false; code; reason }
```

### 5.1 SQL rules (all dialects)

- Parse with `node-sql-parser` using the correct dialect. **Verify parser support per dialect before relying on it.** Where support is missing or partial (expect Oracle), use the strict fallback in §5.2. Never skip validation.
- Exactly one statement. The top level must be `SELECT` or `WITH … SELECT`.
- Reject data-modifying CTEs (Postgres allows `WITH x AS (DELETE …) SELECT`), `SELECT … INTO`, `FOR UPDATE` / `FOR SHARE`, and locking hints.
- Function blocklist per dialect, for example Postgres `pg_sleep*`, `pg_read_*`, `pg_ls_dir`, `lo_*`, `dblink*`, `set_config`, `nextval`, `setval`, `pg_advisory_*`, `pg_terminate_backend`; SQL Server `xp_*`, `sp_*`, `OPENROWSET`, `OPENQUERY`, `OPENDATASOURCE`, `WAITFOR`; MySQL/MariaDB `SLEEP`, `BENCHMARK`, `LOAD_FILE`, `GET_LOCK`, `INTO OUTFILE` / `DUMPFILE`; Oracle `DBMS_*`, `UTL_*`, `SYS.*` packages, `EXECUTE IMMEDIATE`.
- Table and column allowlist per connection. Masked columns are rejected, not silently removed, with a message the agent can act on.
- Rewrite to enforce the row cap, preserving any smaller user limit.
- A cost gate (where `explain` exists) rejects queries above the connection's threshold with an actionable reason.

### 5.2 Strict fallback (unsupported parse)

Tokenize, strip comments and string literals, then require that the first keyword is `SELECT` or `WITH`. Allow no statement separators except one trailing semicolon, which is removed. Reject any DML, DDL, DCL or transaction keyword anywhere, and apply the dialect's blocklist. The fallback is deliberately over-strict: a false rejection is acceptable, a false acceptance is not.

### 5.3 MongoDB rules

- Only `aggregate` is allowed. `find`, `count` and `distinct` are expressed as pipelines internally. Validate the pipeline shape with Zod.
- Stage allowlist: `$match`, `$project`, `$addFields`/`$set`, `$unset`, `$group`, `$sort`, `$limit`, `$skip`, `$unwind`, `$count`, `$facet`, `$bucket`, `$bucketAuto`, `$sortByCount`, `$replaceRoot`/`$replaceWith`, and `$lookup`/`$graphLookup`/`$unionWith` only against allowlisted collections.
- Operator blocklist anywhere in the tree: `$out`, `$merge`, `$function`, `$accumulator`, `$where`.
- Append a `$limit` of the row cap; set `maxTimeMS`.

### 5.4 Test requirements

An adversarial fixture suite covering: comment smuggling, case variants, unicode homoglyphs, nested and data-modifying CTEs, multi-statements, stacked queries, every blocklisted function per dialect, allowlist bypass via aliases or quoted identifiers, and `$out` nested inside `$facet`. The target is 100% branch coverage for this package.

---

## 6. AI providers (`packages/providers`)

### 6.1 Principle

Build on the Vercel AI SDK provider abstraction. A **provider catalog** (`packages/providers/catalog/*.json`) describes presets. It is data, not code, so the community can add providers through PRs. Every catalog entry **must** include `docsUrl` and `lastVerified`. **Base URLs, model IDs and package names must be verified against official documentation at implementation time. Never write them from memory.**

### 6.2 Adapter families

| Family | Covers (examples; verify availability and current endpoints) |
|---|---|
| Native AI SDK providers | OpenAI, Anthropic, Google Gemini, Google Vertex AI, Azure OpenAI, Amazon Bedrock, Mistral, xAI, Groq, DeepSeek, Cohere, Together, Fireworks, Cerebras, DeepInfra, Perplexity |
| OpenAI-compatible presets | Alibaba Qwen (Model Studio / DashScope), Moonshot Kimi, Zhipu GLM, MiniMax, Baidu ERNIE (Qianfan), Tencent Hunyuan, ByteDance Doubao (Volcengine Ark), SiliconFlow, OpenRouter |
| Anthropic-compatible endpoints | Any provider exposing an Anthropic-style API; configured via a custom base URL on the Anthropic adapter |
| Local | Ollama (native and OpenAI-compatible), LM Studio, vLLM, llama.cpp server, LocalAI, Jan |
| Gateways | LiteLLM, Portkey, Cloudflare AI Gateway, or any corporate proxy, configured as a custom base URL |
| Custom | Any OpenAI- or Anthropic-compatible endpoint the user defines |

Chinese providers often have separate mainland-China and international endpoints. Catalog entries support `regions: { cn, intl }`.

### 6.3 Authentication methods

`none` (local), `api-key` (configurable header and prefix: `Authorization: Bearer`, `x-api-key`, `api-key`, and so on), `custom-headers`, `azure` (key or Entra ID token), `aws` (access key/secret/session token, or the default credential chain or named profile), `gcp` (service-account JSON or ADC), `oauth-client-credentials` (for enterprise gateways, with token caching and refresh), and `command` (run a configured local command that prints a short-lived token; Lite mode only, disabled by default). Secrets are encrypted at rest (§11) and never returned to the browser after save.

### 6.4 Model management

- Discovery via the provider's model-list endpoint where available; manual entry otherwise.
- "Test connection" runs a capability probe: basic completion, tool calling, structured output and streaming. Results are cached and shown as badges.
- **Model roles:** `analyst` (query writing and reasoning), `fast` (titles, suggestions, summaries), `embedding` (optional; supports local embeddings). Set as workspace defaults with a per-conversation override.
- Models without tool calling use the **fixed pipeline**: select context → generate query (structured output or strict JSON parsing) → guard → execute → profile → analyze.
- Token usage and estimated cost are recorded per message. Prices come from the catalog and are user-editable.
- Retries with backoff, per-provider rate limits, and an optional fallback model per role.

---

## 7. Agent (`packages/core`)

Tools: `search_tables`, `describe_table`, `get_sample_values`, `get_metric`, `search_verified_queries`, `run_query`, `ask_clarification`, `note_insight`.

`run_query` always passes through guard → connector → profiler, and returns a **profile** (row count, per-column stats, first N rows per privacy mode, truncation flags) plus a `queryId`. The UI fetches full rows by `queryId`, never through the LLM.

Loop limits: max steps (default 8), max query executions (default 5), self-correction up to 3 attempts per failed query, and a per-answer wall-clock budget. All are configurable.

The analyst system prompt is versioned in `packages/core/prompts/` and changes require an eval run (§13). Tool outputs containing data are wrapped and labelled as untrusted content.

---

## 8. Exports (`packages/exporters`)

Scope: a single answer, or a whole conversation. Export always **re-executes** the stored guard-approved query up to an export row limit (default 100,000; configurable), so exports contain full data rather than the UI's display cap. Every export is audit-logged.

### 8.1 Excel (.xlsx)

Built with `exceljs`.

- **Summary** sheet: question, answer, key figures, insights, recommendations, assumptions, caveats, connection, model, and generation timestamp.
- **Data** sheet: typed cells, number and date formats, bold frozen header row, autofilter, and auto-sized columns within limits.
- **Query** sheet: the executed SQL or pipeline.
- **Chart** sheet: the chart rendered server-side to PNG and embedded as an image.
- Arabic locale sets sheet views right-to-left.

### 8.2 PDF

- An HTML report template rendered by headless Chromium (Playwright) to PDF. This is chosen for correct Arabic shaping and bidi and for visual parity with the UI.
- Charts are server-rendered to SVG with ECharts SSR.
- Embedded fonts: a Latin family plus an Arabic family (e.g. Noto Sans / Noto Naskh Arabic, or IBM Plex Sans / IBM Plex Sans Arabic).
- A white-label header (logo, name), page numbers, and the data table truncated to a configurable number of rows with a note pointing to the Excel export.
- PDF export is a feature flag that is automatically disabled with a clear message when Chromium is unavailable. The official Docker image includes Chromium.

---

## 9. Deployment modes

| | Lite (no app DB) | Full (app DB) |
|---|---|---|
| Config | `analyzer.config.yaml`, secrets via `${ENV}` references | UI-managed, encrypted in DB |
| Semantic layer | `semantic/*.yaml` (git-friendly) | DB rows; YAML import/export |
| Schema and knowledge cache | Memory plus `.cache/` JSON | Versioned snapshots with diff detection |
| Retrieval | BM25 (plus optional in-memory vectors) | BM25 plus pgvector or sqlite-vec |
| Chat history | Browser IndexedDB (Dexie) | Server-side, shareable |
| AI credentials | Server env, or bring-your-own-key held in the browser and sent per request | Per user or per workspace, encrypted |
| Auth | None or single password (env) | Users, workspaces, roles: `owner`, `admin`, `analyst`, `viewer` |
| Learning | `semantic/verified-queries.yaml` | Feedback UI builds the verified-query library |
| Audit | JSONL file / stdout | `audit_log` table |
| Extras | — | Saved answers, dashboards (re-run stored queries without the LLM), scheduled reports |

App DB: Postgres with pgvector (primary) or SQLite with sqlite-vec (single node), via Drizzle. The app DB is never the analyzed database.

---

## 10. Architecture and repository layout

pnpm workspaces plus Turborepo. TypeScript strict throughout. Self-hosted Node runtime (not serverless: agent loops and long queries exceed serverless limits, and connection pools must be long-lived).

```
apps/web                 Next.js (App Router) — UI, route handlers, SSE streaming. Thin.
packages/core            agent loop, prompts, tools, profiler, answer schema
packages/connectors      connector registry + one folder per source
packages/query-guard     §5 — pure, no I/O
packages/providers       §6 — catalog, auth strategies, capability probe
packages/knowledge       introspection orchestration, profiling, semantic layer, retrieval
packages/storage         StorageAdapter: lite (file/browser) and full (Drizzle)
packages/charts          ChartSpec schema, client renderer, SSR renderer
packages/exporters       xlsx and pdf
packages/i18n            en/ar message catalogs, RTL helpers
packages/evals           golden-question runner and reports
packages/config          shared eslint/tsconfig/vitest presets
docker/                  dev compose (all databases + seed), production image
docs/                    SPEC, ADRs, connector guides, provider guides
```

UI stack: shadcn/ui, Tailwind, TanStack Table, TanStack Query, and ECharts.

---

## 11. Security

- All connection DSNs and AI secrets are encrypted with AES-256-GCM using a master key from env (`APP_ENCRYPTION_KEY`). Key rotation is supported via a key id prefix.
- Queries execute server-side only. Credentials never reach the browser.
- SSRF protection: in Full/hosted mode, block private, loopback, link-local and cloud-metadata addresses for both database hosts and AI base URLs, unless an admin explicitly allows a range (self-hosted installs legitimately need private IPs; make this a policy setting).
- Rate limiting per user and per connection.
- Audit every executed query: actor, connection, query hash and text, duration, row count, and outcome.
- Result content is treated as untrusted in prompts (prompt-injection defence).
- Dependency and secret scanning in CI. `SECURITY.md` defines vulnerability reporting.

## 12. Internationalization

English and Arabic from v0.1, with full RTL layout, bidi-safe tables and charts, and Arabic-capable fonts. The analyst answers in the language of the question unless the user's setting overrides this. Synonyms in the semantic layer are multilingual.

## 13. Quality and evaluation

- **Sample dataset:** a synthetic retail dataset (stores, products, categories, customers with mixed Arabic and English names, orders, order_lines, returns, inventory, promotions; about 2 years of data). A single generator seeds it identically into every supported source in `docker/dev` (for MongoDB, embed order lines inside orders).
- **Golden set:** at least 50 questions with expected result sets, tagged by difficulty and language. Compare results, not query text.
- **Metrics:** execution accuracy, context-selection recall, clarification rate, tokens and cost per answer, latency, and guard rejection rate.
- The evals CLI runs against any configured provider/model and writes a markdown report. PRs that touch prompts, retrieval or the agent must include the before/after eval summary.
- **CI:** lint, typecheck and unit tests on every PR. Integration tests against Postgres, MySQL, MariaDB, SQL Server and MongoDB service containers on every PR. Oracle runs nightly and on the `ci:oracle` label, because the image is heavy.

## 14. Milestones

| Milestone | Scope | Release |
|---|---|---|
| M0 Foundation | Monorepo, tooling, CI, GitHub templates, labels, docker dev stack with seeded sample data, ADR process | — |
| M1 Engine core | Connector interface; Postgres, MySQL and MariaDB; query guard (SQL); providers (native + OpenAI-compatible + Ollama); agent loop; profiler; evals CLI | — |
| M2 Lite MVP | Chat UI with streaming, answer rendering, charts, query panel, YAML config, semantic layer files, English/Arabic RTL, Docker image | v0.1.0 |
| M3 Full mode | App DB, auth, roles, encrypted credentials, semantic-layer editor with AI auto-draft, verified queries, audit, SSRF policy | v0.2.0 |
| M4 More sources | SQL Server, Oracle, MongoDB (with guard rules), SQLite; read-only setup guides | v0.3.0 |
| M5 Expert and exports | Full knowledge base (profiles, freshness, insights journal), privacy modes, Excel and PDF export | v0.4.0 |
| M6 Providers and hardening | Complete catalog (Chinese, gateways, all auth methods), capability probe, cost tracking, dashboards, performance and security hardening, docs site | v1.0.0 |
