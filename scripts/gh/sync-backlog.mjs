#!/usr/bin/env node
// Syncs docs/BACKLOG.md into GitHub issues. Idempotent:
//  1. creates missing milestone epics, then capability epics, then tasks
//     (an issue is "existing" if its body carries the backlog-id marker
//     or its title matches);
//  2. resolves backlog ids to #N in bodies still marked pending;
//  3. appends missing `- [ ] #N` lines to epics, never rewriting human edits.
// Usage: node scripts/gh/sync-backlog.mjs [--dry-run] [--repo owner/repo] [--file docs/BACKLOG.md]
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

/** @type {{ number: number, title: string, body: string }[]} */
const existing = JSON.parse(
  gh(['issue', 'list', '--repo', repo, '--state', 'all', '--limit', '2000', '--json', 'number,title,body']),
);
const bodies = new Map(existing.map((i) => [i.number, i.body]));
/** backlog id → issue number */
const numbers = new Map();
const byTitle = new Map(existing.map((i) => [i.title, i.number]));
for (const issue of existing) {
  const id = backlogIdOf(issue.body);
  if (id) numbers.set(id, issue.number);
}

let fakeNumber = 100000;
const stats = { created: 0, skipped: 0, updated: 0 };

function ensure(item, body) {
  const known = numbers.get(item.id) ?? byTitle.get(item.title);
  if (known !== undefined) {
    numbers.set(item.id, known);
    stats.skipped++;
    return;
  }
  const labelArgs = item.labels.flatMap((l) => ['--label', l]);
  console.log(`create  ${item.id.padEnd(6)} ${item.title}`);
  stats.created++;
  if (dryRun) {
    numbers.set(item.id, fakeNumber);
    bodies.set(fakeNumber++, body);
    return;
  }
  const url = gh(
    ['issue', 'create', '--repo', repo, '--title', item.title, '--milestone', item.milestone, '--body-file', '-', ...labelArgs],
    body,
  ).trim();
  const number = Number(url.split('/').pop());
  numbers.set(item.id, number);
  bodies.set(number, body);
  pause();
}

function update(number, body, label) {
  console.log(`update  #${number} ${label}`);
  stats.updated++;
  bodies.set(number, body);
  if (dryRun) return;
  gh(['issue', 'edit', String(number), '--repo', repo, '--body-file', '-'], body);
  pause();
}

const childrenOf = (epic) => {
  if (!epic.isMilestoneEpic) return epic.tasks;
  return backlog.milestones.find((m) => m.epic === epic)?.epics ?? [];
};

// Pass 1: create, epics before tasks so tasks can link their epic.
for (const epic of epics) ensure(epic, renderEpicBody(epic, childrenOf(epic), numbers));
for (const task of tasks) ensure(task, renderTaskBody(task, numbers, epicById.get(task.epicId)));

// Pass 2: resolve ids in bodies that were created before their references existed.
for (const task of tasks) {
  const number = numbers.get(task.id);
  if (!bodies.get(number)?.includes(PENDING_MARKER)) continue;
  update(number, renderTaskBody(task, numbers, epicById.get(task.epicId)), task.id);
}
for (const epic of epics) {
  const number = numbers.get(epic.id);
  const body = bodies.get(number) ?? '';
  const children = childrenOf(epic);
  if (body.includes(PENDING_MARKER)) {
    update(number, renderEpicBody(epic, children, numbers), epic.id);
    continue;
  }
  const next = appendMissingChildren(body, children.map((c) => numbers.get(c.id)));
  if (next) update(number, next, `${epic.id} (task list)`);
}

console.log(`\n${dryRun ? '[dry run] ' : ''}created ${stats.created}, existing ${stats.skipped}, updated ${stats.updated}`);
for (const ms of backlog.milestones) {
  console.log(`${ms.title}: epic #${numbers.get(ms.epic.id)}`);
  for (const e of ms.epics) console.log(`  ${e.title}: #${numbers.get(e.id)}`);
}
