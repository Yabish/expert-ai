import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, it } from 'node:test';
import {
  BacklogParseError,
  PENDING_MARKER,
  appendMissingChildren,
  backlogIdOf,
  flatten,
  parseBacklog,
  renderEpicBody,
  renderTaskBody,
} from './backlog-parser.mjs';

const fixture = readFileSync(new URL('./fixtures/backlog.md', import.meta.url), 'utf8');

const expectCode = (markdown, code) =>
  assert.throws(
    () => parseBacklog(markdown),
    (err) => err instanceof BacklogParseError && err.code === code,
  );

describe('parseBacklog', () => {
  const backlog = parseBacklog(fixture);
  const { epics, tasks } = flatten(backlog);

  it('reads milestones, stripping the release suffix from titles', () => {
    assert.deepEqual(
      backlog.milestones.map((m) => m.title),
      ['M0 Foundation', 'M1 Engine core'],
    );
  });

  it('separates milestone epics from capability epics', () => {
    assert.equal(backlog.milestones[0].epic?.id, 'E0');
    assert.deepEqual(
      backlog.milestones[0].epics.map((e) => e.id),
      ['E0.1'],
    );
    assert.equal(epics.length, 4);
  });

  it('parses every task field', () => {
    const t = tasks.find((x) => x.id === 'T0.2');
    assert.deepEqual(t, {
      id: 'T0.2',
      title: 'Second task',
      labels: [
        'type:build',
        'area:repo',
        'edition:community',
        'pillar:erp',
        'priority:p1',
        'size:S',
      ],
      spec: '§10, §13',
      dependsOn: ['T0.1', 'T1.1'],
      goal: 'Do the second thing.',
      acceptance: ['First criterion', 'Second criterion'],
      outOfScope: 'Everything else.',
      size: 'S',
      epicId: 'E0.1',
      milestone: 'M0 Foundation',
    });
  });

  it('reads reused issue numbers', () => {
    assert.equal(backlog.milestones[0].epic?.issue, 1);
    assert.equal(tasks.find((x) => x.id === 'T0.1')?.issue, 41);
    assert.equal(tasks.find((x) => x.id === 'T0.2')?.issue, undefined);
  });

  it('treats "none" dependencies as empty', () => {
    assert.deepEqual(tasks.find((x) => x.id === 'T0.1')?.dependsOn, []);
  });

  it('ignores fields in non-milestone level-2 sections', () => {
    assert.ok(!tasks.some((t) => t.labels.includes('prose')));
  });
});

describe('parseBacklog validation', () => {
  const base = (task) => `## M0 Foundation

### [E0] Milestone

- **Labels:** type:epic, edition:community
- **Goal:** g

### [E0.1] Epic

- **Labels:** type:epic, edition:community
- **Goal:** g

${task}`;
  const task = (fields) => `#### [T0.1] Task

${fields.issue ? `- **Issue:** ${fields.issue}\n` : ''}- **Labels:** ${fields.labels ?? 'type:chore, edition:community, size:S'}
- **Depends on:** ${fields.deps ?? 'none'}
- **Goal:** ${fields.goal ?? 'g'}
- **Acceptance:**
${fields.acceptance ?? '  - [ ] works'}
`;

  it('accepts a minimal valid backlog', () => {
    assert.equal(flatten(parseBacklog(base(task({})))).tasks.length, 1);
  });
  it('rejects size:L', () =>
    expectCode(base(task({ labels: 'edition:community, size:L' })), 'SIZE_L'));
  it('rejects a missing size', () =>
    expectCode(base(task({ labels: 'type:chore, edition:community' })), 'BAD_SIZE'));
  it('rejects a missing edition', () =>
    expectCode(base(task({ labels: 'type:chore, size:S' })), 'BAD_EDITION'));
  it('rejects two editions', () =>
    expectCode(
      base(task({ labels: 'edition:community, edition:enterprise, size:S' })),
      'BAD_EDITION',
    ));
  it('rejects malformed issue references', () =>
    expectCode(base(task({ issue: '41' })), 'BAD_ISSUE'));
  it('rejects an issue reused twice', () =>
    expectCode(
      base(task({ issue: '#41' }) + task({ issue: '#41' }).replace('[T0.1] Task', '[T0.2] Other')),
      'DUPLICATE_ISSUE',
    ));
  it('rejects unknown dependencies', () =>
    expectCode(base(task({ deps: 'T7.7' })), 'UNKNOWN_DEPENDENCY'));
  it('rejects missing acceptance', () =>
    expectCode(base(task({ acceptance: '' })), 'MISSING_ACCEPTANCE'));
  it('rejects missing goal', () => expectCode(base(task({ goal: '' })), 'MISSING_GOAL'));
  it('rejects unknown fields', () =>
    expectCode(base(`${task({})}- **Owner:** me\n`), 'UNKNOWN_FIELD'));
  it('rejects tasks directly under a milestone epic', () =>
    expectCode(
      '## M0 X\n\n### [E0] M\n\n- **Labels:** type:epic, edition:community\n- **Goal:** g\n\n#### [T0.1] T\n',
      'TASK_OUTSIDE_EPIC',
    ));
  it('rejects epics outside milestones', () =>
    expectCode('### [E0.1] Lost\n', 'EPIC_OUTSIDE_MILESTONE'));
  it('rejects a milestone without its epic', () =>
    expectCode('## M0 Foundation\n', 'MISSING_MILESTONE_EPIC'));
  it('rejects duplicate ids', () =>
    expectCode(base(task({}) + task({}).replace('] Task', '] Other')), 'DUPLICATE_ID'));
  it('rejects epics without type:epic', () =>
    expectCode(
      base(task({})).replace(
        '- **Labels:** type:epic, edition:community\n- **Goal:** g\n\n#### ',
        '- **Labels:** area:x, edition:community\n- **Goal:** g\n\n#### ',
      ),
      'EPIC_WITHOUT_LABEL',
    ));
});

describe('rendering', () => {
  const backlog = parseBacklog(fixture);
  const { epics, tasks } = flatten(backlog);
  const epic = epics.find((e) => e.id === 'E0.1');
  const task = tasks.find((t) => t.id === 'T0.2');

  it('marks task bodies pending until every reference resolves', () => {
    const partial = renderTaskBody(
      task,
      new Map([
        ['E0.1', 5],
        ['T0.1', 6],
      ]),
      epic,
    );
    assert.ok(partial.includes(PENDING_MARKER));
    assert.ok(partial.includes('Blocked by #6, T1.1'));

    const full = renderTaskBody(
      task,
      new Map([
        ['E0.1', 5],
        ['T0.1', 6],
        ['T1.1', 9],
      ]),
      epic,
    );
    assert.ok(!full.includes(PENDING_MARKER));
    assert.ok(full.includes('Part of epic #5 (Repository scaffold)'));
    assert.ok(full.includes('Blocked by #6, #9'));
    assert.ok(full.includes('- [ ] Second criterion'));
    assert.equal(backlogIdOf(full), 'T0.2');
  });

  it('renders epic task lists', () => {
    const body = renderEpicBody(
      epic,
      epic.tasks,
      new Map([
        ['T0.1', 6],
        ['T0.2', 7],
      ]),
    );
    assert.ok(body.includes('## Tasks\n\n- [ ] #6\n- [ ] #7'));
    assert.ok(!body.includes(PENDING_MARKER));
  });

  it('renders milestone epics as epic lists', () => {
    const ms = backlog.milestones[0].epic;
    assert.ok(renderEpicBody(ms, backlog.milestones[0].epics, new Map()).includes('## Epics'));
  });

  it('appends only missing children and keeps human edits', () => {
    const body = 'Human notes\n\n## Tasks\n\n- [x] #6\n';
    assert.equal(
      appendMissingChildren(body, [6, 7]),
      'Human notes\n\n## Tasks\n\n- [x] #6\n- [ ] #7\n',
    );
    assert.equal(appendMissingChildren(body, [6]), null);
    assert.equal(appendMissingChildren('- [ ] #61', [6]), '- [ ] #61\n- [ ] #6\n');
  });
});

describe('docs/BACKLOG.md', () => {
  it('parses without errors', () => {
    const real = readFileSync(new URL('../../docs/BACKLOG.md', import.meta.url), 'utf8');
    const { tasks } = flatten(parseBacklog(real));
    assert.ok(tasks.length > 0);
  });
});
