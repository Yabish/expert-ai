# 0001. Record architecture decisions

- **Status:** Accepted
- **Date:** 2026-10-01
- **Deciders:** @Yabish
- **Issue / PR:** #55

## Context

expert-ai is built by humans and AI agents working issue by issue. Many choices are hard to reverse: libraries, schemas, protocols, security policies. Without a record, later contributors (and agents starting a fresh session) can't tell why something is the way it is. They then either re-litigate settled questions or silently undo them. CLAUDE.md already requires an ADR for any hard-to-reverse choice. This ADR defines how ADRs work.

## Decision

We will record architecturally significant decisions as Architecture Decision Records in `docs/adr/`, in the lightweight format popularized by Michael Nygard, extended with an "Alternatives considered" section.

- File name: `NNNN-kebab-case-title.md`, numbered sequentially, starting from `docs/adr/template.md`.
- An ADR is written in the same PR as the change it justifies, or in a docs PR before it. Its status is `Proposed` while the PR is open and `Accepted` when it merges.
- ADRs are immutable once accepted. To change a decision, write a new ADR and mark the old one `Superseded by NNNN`. Only the status line of an old ADR may be edited.
- Any change to `docs/SPEC.md` is made through a PR with an ADR (SPEC header).
- Write an ADR when a choice is hard to reverse or affects several packages: libraries and major versions, data and schema formats, protocols and public interfaces, security policy (guard rules, auth, encryption, SSRF), and deviations from the SPEC. Routine, reversible choices go in the PR body instead.
- Every ADR is listed in `docs/adr/README.md`.

## Consequences

- Decisions and their reasons are discoverable next to the code and are reviewed like code.
- A small writing cost on significant PRs. We accept it because these decisions are exactly the ones that are expensive to get wrong.
- Agents must check `docs/adr/` before revisiting a settled choice.

## Alternatives considered

- **Decisions only in PR descriptions.** No writing overhead, but they're hard to find later and are lost if we leave GitHub. Rejected for hard-to-reverse choices; still used for reversible ones.
- **A wiki or an external docs tool.** It isn't versioned with the code and isn't reviewed in PRs. Rejected.
- **MADR (Markdown ADR) full template.** Richer, but heavier than this project needs. Our template keeps MADR's "alternatives" idea in a shorter form.
