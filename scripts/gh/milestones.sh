#!/usr/bin/env bash
# Creates, renames or updates milestones M0–M6 from SPEC §14. Milestones
# are matched by their "Mx " prefix, so a spec re-plan renames them in
# place and keeps their issues. Idempotent: matching milestones are left
# untouched.
# Usage: scripts/gh/milestones.sh [--dry-run] [owner/repo]
set -euo pipefail

DRY_RUN=0
if [[ "${1:-}" == "--dry-run" ]]; then DRY_RUN=1; shift; fi
REPO="${1:-$(gh repo view --json nameWithOwner --jq .nameWithOwner)}"

# title|description
MILESTONES=(
  "M0 Foundation|Monorepo, tooling, CI, GitHub templates and labels, CLA bot, licensing ADR, ee/ boundary lint rule, dev stack (Postgres, MariaDB, SQL Server, Odoo and ERPNext demo instances, retail seed). No release."
  "M1 Engine core|Connectors (Postgres, MariaDB/MySQL, SQL Server), query guard, providers (OpenAI-compatible, Anthropic, Google), agent loop, profiler, evals CLI. No release."
  "M2 Domain packs|Pack format and loader, detection, odoo and erpnext core packs with golden sets, pack evals in CI, metric-template composition in the agent. No release."
  "M3 Lite MVP and Arabic/GCC|Chat UI, answer rendering, charts, query panel, Lite config, Arabic/RTL, numerals, Hijri and events calendar, VAT metrics, Excel export, Docker image, recommended-models page. Release v0.1.0 \"Ask your Odoo / ERPNext\"."
  "M4 Full mode and builder|App DB, auth, roles, encrypted credentials, custom pack builder, verified queries, audit, privacy modes, PDF export, SSRF policy. Release v0.2.0."
  "M5 Enterprise foundations|License keys, SSO, row-level company/branch scoping, scheduled reports and alerts, white-label, partner console, first premium pack (advanced accounting). Release v0.3.0."
  "M6 Breadth|Oracle, MongoDB, SQLite; cloud-native provider auth and remaining native SDKs; dashboards; performance and security hardening; docs site. Not started before v0.2.0. Release v1.0.0."
)

existing="$(gh api "repos/$REPO/milestones?state=all&per_page=100" \
  --jq '.[] | "\(.number)|\(.title)|\(.description)"')"

for entry in "${MILESTONES[@]}"; do
  IFS='|' read -r title desc <<<"$entry"
  prefix="${title%% *} "
  current="$(awk -F'|' -v p="$prefix" 'index($2, p) == 1' <<<"$existing" || true)"
  if [[ -z "$current" ]]; then
    echo "create  $title"
    [[ $DRY_RUN == 1 ]] || gh api "repos/$REPO/milestones" -f title="$title" -f description="$desc" >/dev/null
  elif [[ "${current#*|}" != "$entry" ]]; then
    echo "update  ${current#*|}" | cut -d'|' -f1 | sed "s|\$| -> $title|"
    [[ $DRY_RUN == 1 ]] || gh api -X PATCH "repos/$REPO/milestones/${current%%|*}" \
      -f title="$title" -f description="$desc" >/dev/null
  else
    echo "ok      $title"
  fi
done
