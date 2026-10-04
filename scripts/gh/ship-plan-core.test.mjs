import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { planChecks, touchedPacks } from './ship-plan-core.mjs';

describe('planChecks', () => {
  it('requires integration tests for connectors, guard and storage', () => {
    for (const f of [
      'packages/connectors/src/pg.ts',
      'packages/query-guard/src/x.ts',
      'packages/storage/src/y.ts',
    ]) {
      assert.equal(planChecks([f]).integration, true, f);
    }
    assert.equal(planChecks(['packages/charts/src/x.ts']).integration, false);
  });

  it('requires evals for the agent, knowledge, providers and calendar', () => {
    assert.equal(planChecks(['packages/core/prompts/analyst/v1.md']).evals, true);
    assert.equal(planChecks(['packages/calendar/src/hijri.ts']).evals, true);
    assert.equal(planChecks(['packages/exporters/src/xlsx.ts']).evals, false);
  });

  it('selects affected packs, or all packs when the agent or loader changes', () => {
    assert.deepEqual(
      planChecks(['packs/odoo/semantic/sales.yaml', 'packs/erpnext/pack.yaml']).packs,
      ['erpnext', 'odoo'],
    );
    assert.equal(planChecks(['packages/knowledge/src/packs/loader.ts']).packs, 'all');
    assert.deepEqual(planChecks(['README.md']).packs, []);
    assert.deepEqual(touchedPacks(['packs-ee/accounting/pack.yaml', 'packs/README.md']), [
      'accounting',
    ]);
  });

  it('flags security-sensitive paths for independent review', () => {
    for (const f of [
      'packages/query-guard/src/allowlist.ts',
      'packages/storage/src/secrets/encrypt.ts',
      'apps/web/src/auth/session.ts',
      'packages/core/src/ssrf.ts',
      'ee/license-keys/verify.ts',
      'packages/storage/src/crypto.ts',
    ]) {
      assert.equal(planChecks([f]).independentReview, true, f);
    }
    for (const f of [
      'packages/core/src/author.ts',
      'docs/adr/0002-licensing.md',
      'packages/charts/src/x.ts',
    ]) {
      assert.equal(planChecks([f]).independentReview, false, f);
    }
  });

  it('derives the edition and flags mixed PRs', () => {
    assert.equal(planChecks(['packages/core/src/a.ts']).edition, 'community');
    assert.equal(planChecks(['ee/sso/src/a.ts', 'ee/README.md']).edition, 'enterprise');
    assert.equal(planChecks(['ee/sso/src/a.ts', 'docs/adr/0009-x.md']).edition, 'enterprise');
    const mixed = planChecks(['ee/sso/src/a.ts', 'packages/core/src/hooks.ts']);
    assert.equal(mixed.edition, 'mixed');
    assert.ok(mixed.reasons.some((r) => r.includes('split')));
  });

  it('asks for LTR and RTL screenshots on UI changes and recognises docs-only PRs', () => {
    assert.equal(planChecks(['apps/web/src/app/page.tsx']).screenshots, true);
    const docs = planChecks(['docs/SPEC.md', 'README.md']);
    assert.equal(docs.docsOnly, true);
    assert.deepEqual(docs.reasons, []);
  });
});
