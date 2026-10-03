# expert-ai

**The AI data analyst that already understands your ERP, in Arabic and English.**

Connect an Odoo or ERPNext database (or a custom retail or POS system on SQL Server) and ask questions in plain language, such as "Which products lost margin this Ramadan compared to last Ramadan?" or "كم ضريبة القيمة المضافة المستحقة هذا الربع؟". Prebuilt domain packs know the difference between posted and draft documents, credit notes, multi-company setups and Hijri periods, so answers are correct from day one. It is read-only, self-hosted, and works with any AI provider, including fully local models.

> 🚧 **Under construction.** Nothing here is usable yet. See [`docs/SPEC.md`](docs/SPEC.md) for what we are building and [`CLAUDE.md`](CLAUDE.md) for how we work.

## Editions

expert-ai is open core. The Community edition (everything outside `ee/` and `packs-ee/`) is open source. Enterprise features live in `ee/` and `packs-ee/` under a separate commercial license. See SPEC §3.

## Why AGPL

The Community edition is licensed under the [GNU AGPL-3.0](LICENSE). The final licensing decision is recorded in `docs/adr/0002-licensing.md`. You can use, self-host, modify and redistribute it freely. If you run a modified version as a network service for other people, you must share your modifications under the same license. This protects the project from closed hosted forks while keeping it free for every organization that runs it on its own data. Using expert-ai inside your organization to analyze your own data creates no obligation on that data or on your other systems.

## License

Community: [AGPL-3.0](LICENSE). Enterprise (`ee/`, `packs-ee/`): commercial, terms to be published.
