# 0002. License the core under AGPL-3.0 and Enterprise code commercially

- **Status:** Proposed. The maintainer accepts or amends this before the first public release (SPEC §3.2).
- **Date:** 2026-10-04
- **Deciders:** @Yabish
- **Issue / PR:** #190

## Context

expert-ai is open core (SPEC §3). The Community edition must be genuinely open source, so organizations can inspect what touches their data and self-host it, and the community can contribute packs and connectors. Enterprise features (SSO, row-level scoping, scheduled reports, partner console, premium packs) fund the project.

Forces:

- **Hosted forks.** A permissive license lets a third party offer the Community edition as a closed hosted service without giving improvements back.
- **On-prem trust.** Our buyers are often data-sensitive and need inspectable code (SPEC §1.1, §1.2).
- **Relicensing.** Selling Enterprise licenses, and keeping the option to relicense, requires us to hold sufficient rights over contributed code.
- **Code separation.** Enterprise code must be physically and legally separable from Community code.
- **Existing state.** The repository has shipped `LICENSE` with AGPL-3.0 since the initial commit.

## Decision

1. **Community edition: AGPL-3.0-only.** This covers everything outside `ee/` and `packs-ee/`: `apps/`, `packages/`, `packs/`, `tools/`, `docker/`, `docs/` and `scripts/`. The root `LICENSE` holds the full text. Each package's `license` field is `AGPL-3.0-only`.
2. **Enterprise code: commercial license.** `ee/` and `packs-ee/` each contain their own `LICENSE`, currently a placeholder marked "commercial, terms TBD". No Enterprise feature ships until the maintainer publishes real terms.
3. **One-way dependency.** Community code never imports from `ee/` or `packs-ee/`, and a lint rule enforces this (#191). Enterprise code plugs into Community extension points (plugin registry, storage hooks, auth strategies, pack loaders). Without an Enterprise license key, every Community feature works.
4. **Contributor License Agreement.** External contributors sign a CLA, enforced by a bot (#192), that grants the project the right to relicense their contributions. This keeps the dual-licensing model possible. The CLA text needs the maintainer's approval and ideally a legal review.
5. **Third-party dependencies** must be compatible with distributing the core under AGPL-3.0. CI enforces an allowlist (#49), and adding a license is a maintainer decision.

## Consequences

- Anyone may use, modify and self-host the Community edition. Anyone offering a modified version to users over a network must publish their changes under AGPL-3.0.
- Some companies have policies against AGPL dependencies. This affects embedding expert-ai as a library, not running it as an application; the README states that running it on your own data creates no obligation on that data.
- The CLA adds friction for contributors. We keep it short and automate signing.
- Enterprise code in the same repository is visible but not open source. Contributors must not copy it into Community code, and the lint rule and the PR template's edition check guard this.
- **Revisit if:** the CLA blocks meaningful contributions, or a foundation or partner requires a different license.

## Alternatives considered

- **MIT or Apache-2.0 for the core.** This would give maximum adoption and suits embedding, but it allows closed hosted forks to compete using our own work. Rejected for the core. It may suit small, separately published SDKs later.
- **Business Source License (BSL) or the Elastic License.** These protect against hosted competitors, but they aren't OSI open source, which undermines on-prem trust and community packs. Rejected.
- **GPL-3.0.** This has no network clause, so the hosted-fork gap remains. Rejected.
- **Separate repositories for Enterprise.** This gives a cleaner legal boundary but makes coordinated changes and testing harder. Rejected for now. The `ee/` boundary plus the lint rule gives most of the separation, and we can split later.
- **No CLA (DCO only).** Contributors keep full rights, so we could never relicense contributed code commercially. Rejected because it's incompatible with open core.
