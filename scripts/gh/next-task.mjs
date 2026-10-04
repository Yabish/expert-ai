#!/usr/bin/env node
// Lists the next issues to work on (CLAUDE.md task loop step 2).
// Usage: node scripts/gh/next-task.mjs [--json] [--repo owner/repo]
import { execFileSync } from 'node:child_process';
import { parseArgs } from 'node:util';
import {
  branchType,
  earliestMilestone,
  openPrBranches,
  parseBlockers,
  rankCandidates,
} from './next-task-core.mjs';

const { values: args } = parseArgs({
  options: { json: { type: 'boolean', default: false }, repo: { type: 'string' } },
});
const gh = (ghArgs) =>
  JSON.parse(execFileSync('gh', ghArgs, { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 }));
const repo = args.repo ?? gh(['repo', 'view', '--json', 'nameWithOwner']).nameWithOwner;

const milestones = gh(['api', `repos/${repo}/milestones?state=open&per_page=100`]).map((m) => ({
  title: m.title,
  state: m.state,
  openIssues: m.open_issues,
}));
const milestone = earliestMilestone(milestones);
if (!milestone) {
  console.log('No open milestone has open issues.');
  process.exit(0);
}

const issues = gh([
  'issue',
  'list',
  '--repo',
  repo,
  '--milestone',
  milestone.title,
  '--state',
  'open',
  '--limit',
  '500',
  '--json',
  'number,title,body,labels,assignees',
]).map((i) => ({
  ...i,
  labels: i.labels.map((l) => l.name),
  assignees: i.assignees.map((a) => a.login),
}));

const referenced = [...new Set(issues.flatMap((i) => parseBlockers(i.body)))];
const issueStates = new Map();
for (const number of referenced) {
  issueStates.set(
    number,
    gh(['issue', 'view', String(number), '--repo', repo, '--json', 'state']).state === 'CLOSED'
      ? 'closed'
      : 'open',
  );
}
const prBranches = openPrBranches(
  gh([
    'pr',
    'list',
    '--repo',
    repo,
    '--state',
    'open',
    '--limit',
    '200',
    '--json',
    'headRefName,closingIssuesReferences',
  ]),
);
const v02Released = gh(['api', `repos/${repo}/tags?per_page=100`]).some((t) =>
  /^v0\.(2|[3-9])\.|^v[1-9]/.test(t.name),
);

const result = rankCandidates({
  issues,
  issueStates,
  prBranches,
  milestone: milestone.title,
  v02Released,
});

if (args.json) {
  console.log(JSON.stringify({ milestone: milestone.title, ...result }, null, 2));
  process.exit(0);
}
console.log(`Milestone: ${milestone.title}`);
if (result.refused) {
  console.log(result.refused);
  process.exit(0);
}
console.log('\nReady (best first):');
for (const c of result.ready.slice(0, 8)) {
  const stack = c.stackOn ? `  stack on ${c.stackOn}` : '';
  console.log(
    `  #${c.number} [${c.priority} ${c.size}] ${c.title}  → ${branchType(c.type)}/${c.number}-…${stack}`,
  );
}
if (result.ready.length === 0) console.log('  (none)');
console.log('\nNot ready:');
for (const s of result.skipped) console.log(`  #${s.number} ${s.title}: ${s.reason}`);
