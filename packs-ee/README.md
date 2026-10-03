# Enterprise packs (`packs-ee/`)

Premium domain packs (SPEC §3.1, §5): advanced accounting, manufacturing, HR and payroll, and industry packs. They use the same data-only pack format as [`packs/`](../packs) but are **not** open source; see [`LICENSE`](LICENSE) and [ADR-0002](../docs/adr/0002-licensing.md).

The pack loader reaches these packs only through an extension point, and only with a valid Enterprise license key. Like every pack, their facts must be verified against a running ERP instance (CLAUDE.md rule 11).
