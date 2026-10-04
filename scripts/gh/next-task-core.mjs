// Pure ranking logic for the next-task skill (CLAUDE.md task loop step 2).
// I/O-free so it can be unit-tested; next-task.mjs feeds it from gh.

const PRIORITY = { 'priority:p0': 0, 'priority:p1': 1, 'priority:p2': 2, 'priority:p3': 3 };
const BREADTH_MILESTONE = 'M6';

/** Issue numbers listed in the body's "Dependencies" section ("Blocked by #N, #M"). */
export function parseBlockers(body) {
  const section = /##\s*Dependencies\s*\n([\s\S]*?)(\n##\s|$)/.exec(body ?? '');
  const text = section ? section[1] : '';
  return [...text.matchAll(/#(\d+)/g)].map((m) => Number(m[1]));
}

/** Issue number from a branch named `<type>/<issue#>-<slug>`. */
export function issueFromBranch(branch) {
  const match = /^[a-z]+\/(\d+)-/.exec(branch ?? '');
  return match ? Number(match[1]) : undefined;
}

/** Map each issue to the head branch of its open PR. */
export function openPrBranches(prs) {
  const branches = new Map();
  for (const pr of prs) {
    const linked = (pr.closingIssuesReferences ?? []).map((ref) => ref.number);
    const fromBranch = issueFromBranch(pr.headRefName);
    for (const number of fromBranch === undefined ? linked : [...linked, fromBranch]) {
      branches.set(number, pr.headRefName);
    }
  }
  return branches;
}

/** Earliest open milestone (by "Mx" number) that still has open, unassigned work. */
export function earliestMilestone(milestones) {
  return [...milestones]
    .filter((m) => m.state === 'open' && /^M\d+\b/.test(m.title) && m.openIssues > 0)
    .sort(
      (a, b) => Number(a.title.slice(1).split(' ')[0]) - Number(b.title.slice(1).split(' ')[0]),
    )[0];
}

/**
 * @param {object} input
 * @param {{ number: number, title: string, body: string, labels: string[], assignees: string[] }[]} input.issues open issues of the milestone
 * @param {Map<number, 'open' | 'closed'>} input.issueStates state of every referenced dependency
 * @param {Map<number, string>} input.prBranches issue → head branch of its open PR
 * @param {string} input.milestone milestone title
 * @param {boolean} input.v02Released whether v0.2.0 has shipped (unlocks M6)
 */
export function rankCandidates({ issues, issueStates, prBranches, milestone, v02Released }) {
  if (milestone.startsWith(BREADTH_MILESTONE) && !v02Released) {
    return {
      refused: `${milestone} is breadth work and must not start before v0.2.0 ships (CLAUDE.md rule 13).`,
      ready: [],
      skipped: [],
    };
  }
  const ready = [];
  const skipped = [];
  for (const issue of issues) {
    const skip = (reason) => skipped.push({ number: issue.number, title: issue.title, reason });
    if (issue.labels.includes('type:epic')) continue;
    if (issue.assignees.length > 0) {
      skip('assigned');
      continue;
    }
    if (issue.labels.includes('status:blocked')) {
      skip('labelled status:blocked');
      continue;
    }
    const blockers = parseBlockers(issue.body);
    const open = blockers.filter((n) => issueStates.get(n) !== 'closed');
    const withoutPr = open.filter((n) => !prBranches.has(n));
    if (withoutPr.length > 0) {
      skip(`blocked by ${withoutPr.map((n) => `#${n}`).join(', ')}`);
      continue;
    }
    const stackOn = [...new Set(open.map((n) => prBranches.get(n)))];
    if (stackOn.length > 1) {
      skip(`depends on several open PRs (${stackOn.join(', ')}); wait for one to merge`);
      continue;
    }
    ready.push({
      number: issue.number,
      title: issue.title,
      priority: issue.labels.find((l) => l in PRIORITY) ?? 'priority:p3',
      size: issue.labels.find((l) => l.startsWith('size:')) ?? 'size:?',
      type: issue.labels.find((l) => l.startsWith('type:')) ?? 'type:chore',
      stackOn: stackOn[0],
    });
  }
  ready.sort(
    (a, b) =>
      PRIORITY[a.priority] - PRIORITY[b.priority] ||
      Number(a.stackOn !== undefined) - Number(b.stackOn !== undefined) ||
      a.number - b.number,
  );
  return { ready, skipped };
}

/** Branch prefix for a type label (CLAUDE.md branch types). */
export function branchType(typeLabel) {
  const map = {
    'type:feature': 'feat',
    'type:bug': 'fix',
    'type:refactor': 'refactor',
    'type:perf': 'perf',
    'type:test': 'test',
    'type:docs': 'docs',
    'type:chore': 'chore',
    'type:ci': 'ci',
    'type:build': 'build',
  };
  return map[typeLabel] ?? 'chore';
}
