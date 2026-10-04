# Security policy

expert-ai connects to business databases and AI providers, so security reports get priority over everything else.

## Reporting a vulnerability

**Please don't open a public issue, discussion or pull request for a vulnerability.**

Report it privately through GitHub: **[Security → Report a vulnerability](https://github.com/Yabish/expert-ai/security/advisories/new)**. Please include:

- the affected version or commit, and the deployment mode (Lite or Full);
- steps to reproduce, or a proof of concept;
- the impact as you understand it;
- whether you'd like to be credited.

Never include real customer data, credentials or connection strings. Use the dev stack's synthetic data.

## What we treat as security issues

In particular:

- **Read-only bypass:** any way to make a query modify data, escape the query guard (SPEC §9), or bypass table or column allowlists.
- **Data exposure:** raw result sets reaching the LLM against the connection's privacy mode, or one user or workspace seeing another's data.
- **Credentials:** secrets returned to the browser, logged, or stored unencrypted in Full mode.
- **SSRF** through database hosts or AI base URLs, beyond what the admin's policy allows.
- **Authentication and authorization** flaws, including role checks and, in Enterprise, SSO and row-level scoping.
- **Prompt injection** that leads to any of the above.
- **License-key** forgery or bypass in the Enterprise edition.
- **Supply chain:** compromised dependencies or CI workflows.

Out of scope: findings that need an already-compromised host or admin account, missing hardening headers with no demonstrated impact, and rate-limit tuning.

## What to expect

| Step                              | Target                        |
| --------------------------------- | ----------------------------- |
| Acknowledge your report           | 3 business days               |
| Initial assessment and severity   | 7 days                        |
| Fix for critical or high severity | 30 days, coordinated with you |

We coordinate disclosure with you, publish a GitHub Security Advisory with a CVE where appropriate, and credit you unless you prefer otherwise.

## Supported versions

There is no stable release yet. Until v1.0.0, security fixes go into the latest release and `develop`.
