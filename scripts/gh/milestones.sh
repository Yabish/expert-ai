#!/usr/bin/env bash
# Creates or updates milestones M0–M6 from SPEC §14. Idempotent: a
# milestone whose description already matches is left untouched.
# Usage: scripts/gh/milestones.sh [--dry-run] [owner/repo]
set -euo pipefail

DRY_RUN=0
if [[ "${1:-}" == "--dry-run" ]]; then DRY_RUN=1; shift; fi
REPO="${1:-$(gh repo view --json nameWithOwner --jq .nameWithOwner)}"

# title|description
MILESTONES=(
  "M0 Foundation|Monorepo, tooling, CI, GitHub templates, labels, docker dev stack with seeded sample data, ADR process. No release."
  "M1 Engine core|Connector interface; Postgres, MySQL and MariaDB; query guard (SQL); providers (native + OpenAI-compatible + Ollama); agent loop; profiler; evals CLI. No release."
  "M2 Lite MVP|Chat UI with streaming, answer rendering, charts, query panel, YAML config, semantic layer files, English/Arabic RTL, Docker image. Release v0.1.0."
  "M3 Full mode|App DB, auth, roles, encrypted credentials, semantic-layer editor with AI auto-draft, verified queries, audit, SSRF policy. Release v0.2.0."
  "M4 More sources|SQL Server, Oracle, MongoDB (with guard rules), SQLite; read-only setup guides. Release v0.3.0."
  "M5 Expert and exports|Full knowledge base (profiles, freshness, insights journal), privacy modes, Excel and PDF export. Release v0.4.0."
  "M6 Providers and hardening|Complete catalog (Chinese, gateways, all auth methods), capability probe, cost tracking, dashboards, performance and security hardening, docs site. Release v1.0.0."
)

existing="$(gh api "repos/$REPO/milestones?state=all&per_page=100" \
  --jq '.[] | "\(.number)|\(.title)|\(.description)"')"

for entry in "${MILESTONES[@]}"; do
  IFS='|' read -r title desc <<<"$entry"
  current="$(awk -F'|' -v t="$title" '$2 == t' <<<"$existing" || true)"
  if [[ -z "$current" ]]; then
    echo "create  $title"
    [[ $DRY_RUN == 1 ]] || gh api "repos/$REPO/milestones" -f title="$title" -f description="$desc" >/dev/null
  elif [[ "${current#*|}" != "$entry" ]]; then
    echo "update  $title"
    [[ $DRY_RUN == 1 ]] || gh api -X PATCH "repos/$REPO/milestones/${current%%|*}" -f description="$desc" >/dev/null
  else
    echo "ok      $title"
  fi
done
