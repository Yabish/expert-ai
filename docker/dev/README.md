# Dev stack

The v0.1 data sources (SPEC §7.2) for local development and integration tests. Each database has a `retail` database, an owner user, and a least-privilege read-only user that the app connects as. The ERP demo instances run under the `erp` profile: Odoo today, ERPNext next (T0.15).

```sh
cp docker/dev/.env.example docker/dev/.env      # dev-only credentials, gitignored
docker compose -f docker/dev/compose.yml up -d  # Postgres, MariaDB, SQL Server
docker compose -f docker/dev/compose.yml ps     # wait until all are "healthy"
```

Compose refuses to start without `docker/dev/.env`, so no database ever runs with an empty password.

## Services

| Service | Image | Host port (`.env`) | Owner user | Read-only user | Memory |
|---|---|---|---|---|---|
| `postgres` | `postgres:18.6` | `127.0.0.1:5432` (`POSTGRES_PORT`) | `retail_owner` | `analyst_ro` | ~35 MB idle |
| `mariadb` | `mariadb:12.3.3` (LTS) | `127.0.0.1:3307` (`MARIADB_PORT`) | `retail_owner` | `analyst_ro` | ~130 MB idle |
| `mssql` | `mcr.microsoft.com/mssql/server:2025-CU9-ubuntu-24.04` (Developer) | `127.0.0.1:1433` (`MSSQL_PORT`) | `retail_owner` | `analyst_ro` | 2 GB minimum (Microsoft requirement) |

- Ports bind to `127.0.0.1` only. If a port clashes with a local install, change it in `docker/dev/.env`.
- MariaDB defaults to 3307 so it does not collide with a local MySQL or MariaDB on 3306.
- `mssql-init` is a one-shot job: SQL Server has no init-script hook, so this job creates the database and users once the server is healthy. It is idempotent and exits when done.

Start a subset when memory is tight: `docker compose -f docker/dev/compose.yml up -d postgres mariadb`.

## Odoo demo instance (`erp` profile)

The pack evals (SPEC §5.5) and every Odoo pack fact (SPEC §5.3) are checked against this instance.

```sh
docker compose -f docker/dev/compose.yml --profile erp up -d --wait odoo   # Odoo only
docker compose -f docker/dev/compose.yml --profile erp up -d --wait        # everything
```

| Service | Image | Host port (`.env`) | Notes |
|---|---|---|---|
| `odoo-db` | `postgres:18.6` | `127.0.0.1:5433` (`ODOO_DB_PORT`) | Its own Postgres; superuser `odoo` (`ODOO_DB_PASSWORD`). Odoo 20 needs PostgreSQL 16+. |
| `odoo-init` | `odoo:20.0-20260926` | none | One-shot. Creates database `odoo` with demo data, then exits. About 75 s the first time, about 1 s after that. |
| `odoo` | `odoo:20.0-20260926` | `127.0.0.1:8069` (`ODOO_PORT`) | Web UI. Serves only database `odoo`; the database manager is disabled. |

**Log in** at <http://localhost:8069> as `admin` / `admin` (Odoo's demo administrator; `demo` / `demo` is a regular user). Switch the UI to Arabic under your user preferences.

**What `odoo-init` installs:** Sales (`sale_management`), Invoicing/Accounting (`account`), Inventory (`stock`), Purchase (`purchase`) and Point of Sale (`point_of_sale`), all with demo data. The script fails if any module's demo data fails to load: Odoo otherwise installs the module without it and only logs a warning. `account` also auto-installs the generic `l10n_us` chart of accounts. GCC localizations are out of scope here (T3.28). Arabic (`ar_001`) is loaded after the demo data, so translatable columns hold both `en_US` and `ar_001` keys, for example `product_template.name`.

**Versions for pack `appliesTo`** (verified 2026-10-04 from the running instance via `/web/webclient/version_info` and `ir_module_module.latest_version`):

| Component | Version |
|---|---|
| Odoo server | `20.0-20260926` (series `20.0`) |
| `base` | `20.0.1.3` |
| `sale` / `sale_management` | `20.0.1.2` / `20.0.1.0` |
| `account` | `20.0.1.5` |
| `stock` | `20.0.1.1` |
| `purchase` | `20.0.1.2` |
| `point_of_sale` | `20.0.1.0.2` |

Demo data volume: 24 posted customer invoices, 8 credit notes, 24 sale orders, 14 purchase orders, 7 POS orders over 4 sessions, 60 done stock moves, and 3 companies. The demo data has relative dates, so totals differ between rebuilds; the counts do not.

Read-only analyst users on this database are added in T0.16.

## Read-only users

`analyst_ro` is what the analyzer uses. It is the first of the three read-only layers (SPEC §2).

| Database | How `analyst_ro` is restricted |
|---|---|
| PostgreSQL | `CONNECT` plus `USAGE` on `public`, `SELECT` via default privileges on tables `retail_owner` creates, `default_transaction_read_only = on` |
| MariaDB | `SELECT, SHOW VIEW` on `retail.*` only |
| SQL Server | `db_datareader` plus explicit `DENY` on insert, update, delete, execute, alter, references and object creation (there is no read-only transaction mode, so the query guard matters most here) |

The scripts live in `init/<database>/`. The connector setup guides reuse them.

## Apple Silicon

SQL Server publishes no arm64 image. Compose sets `platform: linux/amd64`, and Docker Desktop must run it under **Rosetta**. Turn on Settings → General → "Use Rosetta for x86_64/amd64 emulation on Apple Silicon" and restart Docker Desktop.

Under the default QEMU emulation, SQL Server crashes on start with `qemu: uncaught target signal 11 (Segmentation fault)` and exit code 139. If you see that, the Rosetta setting is off.

## Reset

```sh
docker compose -f docker/dev/compose.yml --profile erp down -v   # deletes all dev data volumes
```

Rebuild only Odoo:

```sh
docker compose -f docker/dev/compose.yml --profile erp rm -sfv odoo odoo-init odoo-db
docker volume rm expert-ai-dev_odoo-db-data expert-ai-dev_odoo-data
```

## Credentials

The values in `.env.example` are throwaway development passwords. Never reuse them anywhere real. SQL Server enforces password complexity, so keep upper and lower case, digits and a symbol. Avoid quotes, `$` and backslashes, because the init scripts interpolate them into SQL.
