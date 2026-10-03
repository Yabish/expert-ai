#!/usr/bin/env bash
# retail_owner is created by the image from MARIADB_USER (ALL on retail.*).
# analyst_ro gets SELECT and SHOW VIEW only.
set -euo pipefail

mariadb --protocol=socket -uroot -p"$MARIADB_ROOT_PASSWORD" <<SQL
CREATE USER 'analyst_ro'@'%' IDENTIFIED BY '${ANALYST_RO_PASSWORD}';
GRANT SELECT, SHOW VIEW ON retail.* TO 'analyst_ro'@'%';
SQL
