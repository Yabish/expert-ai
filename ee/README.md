# Enterprise edition (`ee/`)

Code here implements Enterprise features (SPEC §3.1): license keys, SSO and SCIM, row-level scoping, scheduled reports and alerts, white-label, the partner console, and audit export. It is **not** open source; see [`LICENSE`](LICENSE) and [ADR-0002](../docs/adr/0002-licensing.md).

Rules:

- Community code (`apps/`, `packages/`, `packs/`) must never import from here. A lint rule enforces this.
- Code here may import Community packages, and attaches only through Community extension points: the plugin registry, storage hooks, auth strategies and pack loaders.
- Without a valid license key, nothing here activates, and every Community feature keeps working.
- Issues and PRs for this directory carry the `edition:enterprise` label.
