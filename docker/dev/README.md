# Dev stack

The v0.1 data sources (SPEC §7.2) for local development and integration tests. Each database has a `retail` database, an owner user, and a least-privilege read-only user that the app connects as. The Odoo and ERPNext demo instances will join under the `erp` profile.

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
docker compose -f docker/dev/compose.yml down -v   # deletes all dev data volumes
```

## Credentials

The values in `.env.example` are throwaway development passwords. Never reuse them anywhere real. SQL Server enforces password complexity, so keep upper and lower case, digits and a symbol. Avoid quotes, `$` and backslashes, because the init scripts interpolate them into SQL.
