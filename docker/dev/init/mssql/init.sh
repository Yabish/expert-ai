#!/usr/bin/env bash
set -euo pipefail

/opt/mssql-tools18/bin/sqlcmd -S mssql -U sa -P "$MSSQL_SA_PASSWORD" -C -b \
  -v OWNER_PW="$RETAIL_OWNER_PASSWORD" RO_PW="$ANALYST_RO_PASSWORD" \
  -i /init/init.sql
echo "mssql-init: done"
