#!/usr/bin/env bash
# Owner owns the retail database and public schema; analyst_ro can only
# read tables the owner creates and defaults to read-only transactions.
set -euo pipefail

psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname retail \
  -v owner_pw="$RETAIL_OWNER_PASSWORD" -v ro_pw="$ANALYST_RO_PASSWORD" <<'SQL'
CREATE ROLE retail_owner LOGIN PASSWORD :'owner_pw';
CREATE ROLE analyst_ro LOGIN PASSWORD :'ro_pw';

ALTER DATABASE retail OWNER TO retail_owner;
ALTER SCHEMA public OWNER TO retail_owner;
REVOKE ALL ON DATABASE retail FROM PUBLIC;
REVOKE CREATE ON SCHEMA public FROM PUBLIC;

GRANT CONNECT ON DATABASE retail TO analyst_ro;
GRANT USAGE ON SCHEMA public TO analyst_ro;
ALTER DEFAULT PRIVILEGES FOR ROLE retail_owner IN SCHEMA public
  GRANT SELECT ON TABLES TO analyst_ro;
ALTER ROLE analyst_ro SET default_transaction_read_only = on;
SQL
