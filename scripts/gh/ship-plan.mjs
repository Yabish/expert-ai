#!/usr/bin/env node
// Prints the verification plan for the current branch (CLAUDE.md steps 7–8).
// Usage: node scripts/gh/ship-plan.mjs [--base develop] [--json]
import { execFileSync } from 'node:child_process';
import { parseArgs } from 'node:util';
import { planChecks } from './ship-plan-core.mjs';

const { values: args } = parseArgs({
  options: {
    base: { type: 'string', default: 'origin/develop' },
    json: { type: 'boolean', default: false },
  },
});
const files = execFileSync('git', ['diff', '--name-only', `${args.base}...HEAD`], {
  encoding: 'utf8',
})
  .split('\n')
  .filter(Boolean);
const plan = planChecks(files);

if (args.json) {
  console.log(JSON.stringify({ base: args.base, files: files.length, ...plan }, null, 2));
  process.exit(0);
}
console.log(
  `${String(files.length)} files changed vs ${args.base}; edition: ${plan.edition}${plan.docsOnly ? ' (docs only)' : ''}`,
);
console.log('Always: pnpm lint && pnpm typecheck && pnpm test && pnpm format:check');
for (const reason of plan.reasons) console.log(`- ${reason}`);
if (plan.reasons.length === 0) console.log('- nothing else required');
