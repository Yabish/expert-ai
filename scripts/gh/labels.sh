#!/usr/bin/env bash
# Creates or updates the repository's labels. Idempotent: labels that
# already match are left untouched, so a second run makes no changes.
# Usage: scripts/gh/labels.sh [--dry-run] [owner/repo]
set -euo pipefail

DRY_RUN=0
if [[ "${1:-}" == "--dry-run" ]]; then DRY_RUN=1; shift; fi
REPO="${1:-$(gh repo view --json nameWithOwner --jq .nameWithOwner)}"

# name|color|description
LABELS=(
  "type:feature|1d76db|New capability"
  "type:bug|d73a4a|Something is broken"
  "type:chore|c5def5|Maintenance and tooling"
  "type:docs|0075ca|Documentation or ADR"
  "type:test|bfd4f2|Tests only"
  "type:refactor|d4c5f9|Behaviour-preserving code change"
  "type:perf|fbca04|Performance"
  "type:ci|ededed|Continuous integration"
  "type:build|ededed|Build system, packaging or dependencies"
  "type:epic|3e4b9e|Groups related tasks"
  "area:repo|5319e7|Repository tooling and conventions"
  "area:ci|5319e7|CI workflows"
  "area:core|5319e7|packages/core: agent, prompts, profiler"
  "area:contracts|5319e7|packages/contracts: shared types and schemas"
  "area:connectors|5319e7|packages/connectors"
  "area:guard|b60205|packages/query-guard (security-critical)"
  "area:providers|5319e7|packages/providers"
  "area:knowledge|5319e7|packages/knowledge"
  "area:storage|5319e7|packages/storage"
  "area:charts|5319e7|packages/charts"
  "area:exporters|5319e7|packages/exporters"
  "area:web|5319e7|apps/web"
  "area:i18n|5319e7|packages/i18n, RTL"
  "area:evals|5319e7|packages/evals"
  "area:docker|5319e7|docker/ dev stack and images"
  "area:security|b60205|Auth, secrets, SSRF, hardening"
  "area:docs|5319e7|Documentation"
  "area:packs|5319e7|packs/ and packs-ee/: domain packs, loader, builder"
  "area:calendar|5319e7|packages/calendar: Hijri, events, periods"
  "area:ee|5319e7|ee/: Enterprise code and the open-core boundary"
  "edition:community|0e8a16|Community (open source) edition"
  "edition:enterprise|5319e7|Enterprise (commercial) edition: ee/ or packs-ee/"
  "pillar:erp|1d76db|Advances the ERP-native pillar (domain packs)"
  "pillar:gcc|006b75|Advances the Arabic and GCC-native pillar"
  "pillar:privacy|0b3d91|Advances the private-by-design pillar"
  "priority:p0|b60205|Blocks the milestone"
  "priority:p1|d93f0b|Important for the milestone"
  "priority:p2|fbca04|Nice to have in the milestone"
  "priority:p3|0e8a16|Backlog"
  "size:S|c2e0c6|Up to half a day"
  "size:M|fef2c0|Up to one focused day"
  "size:L|f9d0c4|Too big: split before starting"
  "status:in-progress|0e8a16|Being worked on"
  "status:blocked|b60205|Waiting on something"
  "status:needs-review|fbca04|PR open, awaiting review"
  "ci:packs|f9d0c4|Run pack evals against the ERP demo instances on this PR"
  "ci:oracle|f9d0c4|Run the Oracle integration job on this PR (M6)"
)

existing="$(gh label list --repo "$REPO" --limit 500 --json name,color,description \
  --jq '.[] | "\(.name)|\(.color)|\(.description)"')"

for entry in "${LABELS[@]}"; do
  IFS='|' read -r name color desc <<<"$entry"
  current="$(grep -F -- "${name}|" <<<"$existing" | awk -F'|' -v n="$name" '$1 == n' || true)"
  if [[ -z "$current" ]]; then
    echo "create  $name"
    [[ $DRY_RUN == 1 ]] || gh label create "$name" --repo "$REPO" --color "$color" --description "$desc" >/dev/null
  elif [[ "$current" != "$entry" ]]; then
    echo "update  $name"
    [[ $DRY_RUN == 1 ]] || gh label edit "$name" --repo "$REPO" --color "$color" --description "$desc" >/dev/null
  else
    echo "ok      $name"
  fi
done
