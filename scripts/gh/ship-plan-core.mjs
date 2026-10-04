// Decides which verification steps a change needs (CLAUDE.md task loop
// steps 7–8). I/O-free so it can be unit-tested; ship-plan.mjs feeds it.

const under = (prefix) => (file) => file === prefix || file.startsWith(`${prefix}/`);

const INTEGRATION = ['packages/connectors', 'packages/query-guard', 'packages/storage'].map(under);
const EVALS = [
  'packages/core',
  'packages/knowledge',
  'packages/providers',
  'packages/calendar',
].map(under);
const ALL_PACKS = ['packages/core', 'packages/knowledge'].map(under);
// Paths where an independent review is mandatory (CLAUDE.md step 8 and
// "stop and ask"): guard, auth, secrets and encryption, SSRF, license keys.
const SENSITIVE = [
  under('packages/query-guard'),
  (f) => /(^|\/)(auth|secrets?|crypto|encrypt\w*|ssrf|licen[cs]e[-_]?keys?)(\/|\.|-|_|$)/i.test(f),
];
const ENTERPRISE = [under('ee'), under('packs-ee')];
const UI = [under('apps/web')];
// Paths that never affect product behaviour on their own.
const DOCS_ONLY = (f) => /\.md$/.test(f) || under('docs')(f);

const any = (files, predicates) => files.some((f) => predicates.some((p) => p(f)));

/** Pack ids touched under packs/<id>/ or packs-ee/<id>/. */
export function touchedPacks(files) {
  const ids = new Set();
  for (const f of files) {
    const match = /^(packs|packs-ee)\/([^/]+)\//.exec(f);
    if (match?.[2]) ids.add(match[2]);
  }
  return [...ids].sort();
}

/**
 * @param {string[]} files changed paths relative to the repo root
 * @returns {{
 *   integration: boolean, evals: boolean, packs: string[] | 'all',
 *   independentReview: boolean, edition: 'community' | 'enterprise' | 'mixed',
 *   screenshots: boolean, docsOnly: boolean, reasons: string[]
 * }}
 */
export function planChecks(files) {
  const reasons = [];
  const integration = any(files, INTEGRATION);
  if (integration)
    reasons.push(
      'connectors, guard or storage changed → pnpm test:integration (needs the dev stack)',
    );

  const evals = any(files, EVALS);
  if (evals)
    reasons.push(
      'agent, prompts, knowledge, providers or calendar changed → pnpm evals, with the before/after table in the PR',
    );

  const packs = any(files, ALL_PACKS) ? 'all' : touchedPacks(files);
  if (packs === 'all')
    reasons.push('agent or pack loader changed → pnpm packs:eval for every pack');
  else if (packs.length)
    reasons.push(
      `packs changed → pnpm packs:eval for ${packs.join(', ')} (English and Arabic, before/after)`,
    );

  const independentReview = any(files, SENSITIVE);
  if (independentReview)
    reasons.push(
      'guard, auth, secrets, SSRF or license-key code changed → independent subagent review',
    );

  const enterprise = files.filter((f) => ENTERPRISE.some((p) => p(f)));
  const community = files.filter((f) => !ENTERPRISE.some((p) => p(f)) && !DOCS_ONLY(f));
  const edition =
    enterprise.length === 0 ? 'community' : community.length === 0 ? 'enterprise' : 'mixed';
  if (edition === 'mixed')
    reasons.push(
      'PR mixes ee/ or packs-ee/ with Community code → split it, or justify the extension point it adds',
    );

  const screenshots = any(files, UI);
  if (screenshots) reasons.push('apps/web changed → screenshots in LTR (English) and RTL (Arabic)');

  const docsOnly = files.length > 0 && files.every(DOCS_ONLY);
  return { integration, evals, packs, independentReview, edition, screenshots, docsOnly, reasons };
}
