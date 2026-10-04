#!/usr/bin/env bash
# Creates the `odoo` demo database with the modules the v0.1 pack covers
# (SPEC §5.4) and Odoo's demo data, then adds Arabic. Idempotent: once the
# database is complete it exits without touching it, so restarts are fast
# and never re-run module upgrades.
set -euo pipefail

DB=odoo
MODULES=sale_management,account,stock,purchase,point_of_sale
# Arabic translations populate the JSON-per-language columns the pack must
# read (SPEC §5.3); ar_001 is Odoo's generic Arabic. It is loaded after the
# demo data: as the creation language it translates POS journal names into
# colliding mail aliases, and Odoo then silently skips the POS demo data.
# Loading it later needs the UI wizard's "overwrite" option, because demo
# records are noupdate and `--load-language` leaves their names English-only.
LANG_AR=ar_001

export PGHOST=odoo-db PGUSER=odoo PGPASSWORD="$ODOO_DB_PASSWORD"
DB_ARGS=(--db_host "$PGHOST" --db_port 5432 --db_user "$PGUSER" --db_password "$PGPASSWORD")

q() { psql -d "$DB" -tAc "$1" 2>/dev/null || echo 0; }

# Odoo installs a module "without demo data" when its demo load fails, and
# records why in ir_demo_failure, so both are checked.
modules_ok() {
  [ "$(q "SELECT count(*) FROM ir_module_module
          WHERE state = 'installed' AND demo
            AND name = ANY (string_to_array('$MODULES', ','))")" -eq "$expected" ] &&
  [ "$(q "SELECT count(*) FROM ir_demo_failure")" -eq 0 ]
}
arabic_ok() {
  [ "$(q "SELECT count(*) FROM res_lang WHERE code = '$LANG_AR' AND active")" -eq 1 ] &&
  [ "$(q "SELECT count(*) FROM product_template WHERE name ? '$LANG_AR'")" -gt 0 ]
}

wait-for-psql.py "${DB_ARGS[@]}" --timeout=60
expected=$(tr ',' '\n' <<<"$MODULES" | wc -l)

if modules_ok && arabic_ok; then
  echo "odoo-init: database complete, nothing to do"
  exit 0
fi

if ! modules_ok; then
  odoo "${DB_ARGS[@]}" -d "$DB" -i "$MODULES" --with-demo --stop-after-init --no-http
  if ! modules_ok; then
    echo "odoo-init: modules or their demo data failed to install:" >&2
    psql -d "$DB" -tAc "SELECT m.name, f.error FROM ir_demo_failure f
                        JOIN ir_module_module m ON m.id = f.module_id" >&2
    exit 1
  fi
fi

if ! arabic_ok; then
  odoo shell "${DB_ARGS[@]}" -d "$DB" --no-http <<PY
lang = env['res.lang']._activate_lang('$LANG_AR')
env['base.language.install'].create({'lang_ids': [(6, 0, lang.ids)], 'overwrite': True}).lang_install()
env.cr.commit()
PY
  arabic_ok || { echo "odoo-init: $LANG_AR is missing or untranslated" >&2; exit 1; }
fi
echo "odoo-init: done"
