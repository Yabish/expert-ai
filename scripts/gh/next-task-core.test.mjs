import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  branchType,
  earliestMilestone,
  issueFromBranch,
  openPrBranches,
  parseBlockers,
  rankCandidates,
} from './next-task-core.mjs';

const body = (deps) => `## Goal\n\nx (see #999)\n\n## Dependencies\n\n${deps}\n\n## Size\n\nS\n`;
const issue = (number, labels, deps = 'None', assignees = []) => ({
  number,
  title: `Issue ${number}`,
  body: body(deps),
  labels,
  assignees,
});

describe('parseBlockers', () => {
  it('reads only the Dependencies section', () => {
    assert.deepEqual(parseBlockers(body('Blocked by #12, #34')), [12, 34]);
    assert.deepEqual(parseBlockers(body('None')), []);
    assert.deepEqual(parseBlockers('no sections at all #5'), []);
  });
});

describe('open PR mapping', () => {
  it('uses linked issues and falls back to the branch name for stacked PRs', () => {
    const map = openPrBranches([
      { headRefName: 'feat/10-a', closingIssuesReferences: [{ number: 10 }] },
      { headRefName: 'build/44-arch-lint', closingIssuesReferences: [] },
      { headRefName: 'renovate/deps', closingIssuesReferences: [] },
    ]);
    assert.equal(map.get(10), 'feat/10-a');
    assert.equal(map.get(44), 'build/44-arch-lint');
    assert.equal(map.size, 2);
    assert.equal(issueFromBranch('chore/58-next-task-skill'), 58);
    assert.equal(issueFromBranch('develop'), undefined);
  });
});

describe('earliestMilestone', () => {
  it('orders by M number and skips milestones without open issues', () => {
    const m = earliestMilestone([
      { title: 'M2 Domain packs', state: 'open', openIssues: 3 },
      { title: 'M10 Later', state: 'open', openIssues: 1 },
      { title: 'M0 Foundation', state: 'open', openIssues: 0 },
      { title: 'M1 Engine core', state: 'open', openIssues: 9 },
    ]);
    assert.equal(m?.title, 'M1 Engine core');
  });
});

describe('rankCandidates', () => {
  const base = {
    issueStates: new Map([
      [1, 'closed'],
      [2, 'open'],
      [3, 'open'],
      [4, 'open'],
    ]),
    prBranches: new Map([
      [2, 'feat/2-x'],
      [4, 'feat/4-y'],
    ]),
    milestone: 'M0 Foundation',
    v02Released: false,
  };

  it('ranks by priority, then ready before stackable, then number', () => {
    const { ready } = rankCandidates({
      ...base,
      issues: [
        issue(30, ['priority:p1', 'size:S', 'type:ci']),
        issue(20, ['priority:p0', 'size:M', 'type:feature'], 'Blocked by #2'),
        issue(25, ['priority:p0', 'size:S', 'type:build'], 'Blocked by #1'),
        issue(10, ['priority:p0', 'size:S', 'type:docs']),
      ],
    });
    assert.deepEqual(
      ready.map((c) => [c.number, c.stackOn]),
      [
        [10, undefined],
        [25, undefined],
        [20, 'feat/2-x'],
        [30, undefined],
      ],
    );
  });

  it('skips epics, assigned, blocked-label and unresolved dependencies with reasons', () => {
    const { ready, skipped } = rankCandidates({
      ...base,
      issues: [
        issue(1, ['type:epic', 'priority:p0']),
        issue(5, ['priority:p0'], 'None', ['someone']),
        issue(6, ['priority:p0', 'status:blocked']),
        issue(7, ['priority:p0'], 'Blocked by #3'),
        issue(8, ['priority:p0'], 'Blocked by #2, #4'),
      ],
    });
    assert.deepEqual(ready, []);
    assert.deepEqual(
      skipped.map((s) => [s.number, s.reason.split(' ')[0]]),
      [
        [5, 'assigned'],
        [6, 'labelled'],
        [7, 'blocked'],
        [8, 'depends'],
      ],
    );
  });

  it('refuses M6 before v0.2.0 and allows it after', () => {
    const issues = [issue(9, ['priority:p0'])];
    assert.match(
      rankCandidates({ ...base, issues, milestone: 'M6 Breadth' }).refused ?? '',
      /v0\.2\.0/,
    );
    assert.equal(
      rankCandidates({ ...base, issues, milestone: 'M6 Breadth', v02Released: true }).ready.length,
      1,
    );
  });

  it('maps type labels to branch prefixes', () => {
    assert.equal(branchType('type:feature'), 'feat');
    assert.equal(branchType('type:bug'), 'fix');
    assert.equal(branchType('type:epic'), 'chore');
  });
});
