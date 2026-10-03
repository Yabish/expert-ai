#!/usr/bin/env node
// Syncs docs/BACKLOG.md into GitHub issues.
//
// Matching: an item's explicit `Issue: #N` wins. Otherwise an open or
// closed issue whose body carries the item's backlog-id marker, or whose
// title matches, is reused, unless an explicit `Issue` already claims it
// (re-plans reuse issues under new ids, so old markers can be stale).
//
// Default mode is additive and safe to re-run:
//  1. creates missing milestone epics, then capability epics, then tasks;
//  2. resolves ids to #N in bodies still marked pending;
//  3. appends missing `- [ ] #N` lines to epics, never rewriting human edits.
//
// --update (approved re-plans only) also rewrites title, body, labels
// (status:* labels are kept) and milestone of every matched issue.
//
// Usage: node scripts/gh/sync-backlog.mjs [--dry-run] [--update] [--repo owner/repo] [--file docs/BACKLOG.md]
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { parseArgs } from 'node:util';
import {
  PENDING_MARKER,
  appendMissingChildren,
  backlogIdOf,
  flatten,
  parseBacklog,
  renderEpicBody,
  renderTaskBody,
} from './backlog-parser.mjs';

const { values: args } = parseArgs({
  options: {
    'dry-run': { type: 'boolean', default: false },
    update: { type: 'boolean', default: false },
    repo: { type: 'string' },
    file: { type: 'string', default: 'docs/BACKLOG.md' },
  },
});
const dryRun = args['dry-run'];

const gh = (ghArgs, input) => execFileSync('gh', ghArgs, { encoding: 'utf8', input, maxBuffer: 64 * 1024 * 1024 });
// GitHub's secondary rate limit punishes bursts of content creation.
const pause = () => Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 1200);

const repo = args.repo ?? gh(['repo', 'view', '--json', 'nameWithOwner', '--jq', '.nameWithOwner']).trim();
const backlog = parseBacklog(readFileSync(args.file, 'utf8'));
const { epics, tasks } = flatten(backlog);
const items = [...epics, ...tasks];
const epicById = new Map(epics.map((e) => [e.id, e]));

const milestoneTitles = new Set(
  JSON.parse(gh(['api', `repos/${repo}/milestones?state=all&per_page=100`])).map((m) => m.title),
);
for (const ms of backlog.milestones) {
  if (!milestoneTitles.has(ms.title) && !dryRun) {
    console.error(`Milestone "${ms.title}" is missing. Run scripts/gh/milestones.sh first.`);
    process.exit(1);
  }
}

/** @type {{ number: number, title: string, body: string, labels: { name: string }[], milestone: { title: string } | null }[]} */
const existing = JSON.parse(
  gh(['issue', 'list', '--repo', repo, '--state', 'all', '--limit', '2000', '--json', 'number,title,body,labels,milestone']),
);
const issueByNumber = new Map(existing.map((i) => [i.number, i]));
const bodies = new Map(existing.map((i) => [i.number, i.body]));

/** backlog id → issue number */
const numbers = new Map();
const claimed = new Set();
for (const item of items) {
  if (item.issue === undefined) continue;
  if (!issueByNumber.has(item.issue)) {
    console.error(`${item.id} reuses #${item.issue}, which does not exist in ${repo}.`);
    process.exit(1);
  }
  numbers.set(item.id, item.issue);
  claimed.add(item.issue);
}
const byMarker = new Map();
const byTitle = new Map();
for (const issue of existing) {
  if (claimed.has(issue.number)) continue;
  const id = backlogIdOf(issue.body);
  if (id) byMarker.set(id, issue.number);
  byTitle.set(issue.title, issue.number);
}

let fakeNumber = 100000;
const stats = { created: 0, matched: 0, updated: 0 };
const isNew = new Set();

function ensure(item, body) {
  const known = numbers.get(item.id) ?? byMarker.get(item.id) ?? byTitle.get(item.title);
  if (known !== undefined) {
    numbers.set(item.id, known);
    stats.matched++;
    return;
  }
  const labelArgs = item.labels.flatMap((l) => ['--label', l]);
  console.log(`create  ${item.id.padEnd(6)} ${item.title}`);
  stats.created++;
  if (dryRun) {
    numbers.set(item.id, fakeNumber);
    bodies.set(fakeNumber, body);
    isNew.add(fakeNumber++);
    return;
  }
  const url = gh(
    ['issue', 'create', '--repo', repo, '--title', item.title, '--milestone', item.milestone, '--body-file', '-', ...labelArgs],
    body,
  ).trim();
  const number = Number(url.split('/').pop());
  numbers.set(item.id, number);
  bodies.set(number, body);
  isNew.add(number);
  pause();
}

/** @param {number} number @param {{ title?: string, body?: string, milestone?: string, add?: string[], remove?: string[] }} change */
function edit(number, change, label) {
  const parts = [
    change.title && 'title',
    change.body && 'body',
    change.milestone && 'milestone',
    change.add?.length && `+${change.add.join(',')}`,
    change.remove?.length && `-${change.remove.join(',')}`,
  ].filter(Boolean);
  console.log(`update  #${number} ${label}: ${parts.join(' ')}`);
  stats.updated++;
  if (change.body) bodies.set(number, change.body);
  if (dryRun) return;
  const ghArgs = ['issue', 'edit', String(number), '--repo', repo];
  if (change.title) ghArgs.push('--title', change.title);
  if (change.body) ghArgs.push('--body-file', '-');
  if (change.milestone) ghArgs.push('--milestone', change.milestone);
  if (change.add?.length) ghArgs.push('--add-label', change.add.join(','));
  if (change.remove?.length) ghArgs.push('--remove-label', change.remove.join(','));
  gh(ghArgs, change.body ?? '');
  pause();
}

const childrenOf = (epic) => {
  if (!epic.isMilestoneEpic) return epic.tasks;
  return backlog.milestones.find((m) => m.epic === epic)?.epics ?? [];
};
const render = (item) =>
  'tasks' in item ? renderEpicBody(item, childrenOf(item), numbers) : renderTaskBody(item, numbers, epicById.get(item.epicId));

// Pass 1: create, epics before tasks so tasks can link their epic.
for (const item of items) ensure(item, render(item));

if (args.update) {
  // Pass 2 (re-plan): make every matched issue match the backlog exactly.
  for (const item of items) {
    const number = numbers.get(item.id);
    const current = issueByNumber.get(number);
    if (!current || isNew.has(number)) continue;
    const body = render(item);
    const have = new Set(current.labels.map((l) => l.name));
    const want = new Set(item.labels);
    const change = {
      title: current.title !== item.title ? item.title : undefined,
      body: current.body.trim() !== body.trim() ? body : undefined,
      milestone: current.milestone?.title !== item.milestone ? item.milestone : undefined,
      add: [...want].filter((l) => !have.has(l)),
      remove: [...have].filter((l) => !want.has(l) && !l.startsWith('status:')),
    };
    if (change.title || change.body || change.milestone || change.add.length || change.remove.length) edit(number, change, item.id);
  }
}

// Pass 3: resolve ids in bodies created before their references existed.
for (const item of items) {
  const number = numbers.get(item.id);
  const body = bodies.get(number) ?? '';
  if (body.includes(PENDING_MARKER)) {
    edit(number, { body: render(item) }, `${item.id} (resolve refs)`);
  } else if ('tasks' in item && !args.update) {
    const next = appendMissingChildren(body, childrenOf(item).map((c) => numbers.get(c.id)));
    if (next) edit(number, { body: next }, `${item.id} (task list)`);
  }
}

const orphans = existing.filter((i) => backlogIdOf(i.body) && ![...numbers.values()].includes(i.number));
console.log(`\n${dryRun ? '[dry run] ' : ''}created ${stats.created}, matched ${stats.matched}, updated ${stats.updated}`);
if (orphans.length) console.log(`Not in backlog (left untouched): ${orphans.map((i) => `#${i.number}`).join(', ')}`);
for (const ms of backlog.milestones) {
  console.log(`${ms.title}: epic #${numbers.get(ms.epic.id)}`);
  for (const e of ms.epics) console.log(`  ${e.title}: #${numbers.get(e.id)}`);
}
