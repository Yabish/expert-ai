// Parses docs/BACKLOG.md into milestones → epics → tasks and renders
// issue bodies. Pure (no I/O) so it can be unit-tested; sync-backlog.mjs
// owns all GitHub calls.

export const PENDING_MARKER = '<!-- backlog-sync: pending -->';

export class BacklogParseError extends Error {
  /** @param {string} code @param {string} message @param {number} [line] */
  constructor(code, message, line) {
    super(line === undefined ? message : `line ${line}: ${message}`);
    this.name = 'BacklogParseError';
    this.code = code;
    this.line = line;
  }
}

const MILESTONE_RE = /^## (M\d+)\s+(.+?)\s*$/;
const EPIC_RE = /^### \[(E\d+(?:\.\d+)?)\]\s+(.+?)\s*$/;
const TASK_RE = /^#### \[(T\d+\.\d+)\]\s+(.+?)\s*$/;
const FIELD_RE = /^- \*\*([A-Za-z ]+):\*\*\s*(.*)$/;
const CHECKBOX_RE = /^\s+- \[ \]\s+(.+)$/;

const splitList = (value) =>
  value
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);

/**
 * @param {string} markdown
 * @returns {{ milestones: Milestone[] }}
 *
 * @typedef {{ key: string, title: string, epic: Epic | null, epics: Epic[] }} Milestone
 * @typedef {{ id: string, title: string, labels: string[], goal: string, milestone: string, tasks: Task[], isMilestoneEpic: boolean }} Epic
 * @typedef {{ id: string, title: string, labels: string[], spec: string, dependsOn: string[], goal: string, acceptance: string[], outOfScope: string, size: string, epicId: string, milestone: string }} Task
 */
export function parseBacklog(markdown) {
  /** @type {Milestone[]} */
  const milestones = [];
  /** @type {Milestone | null} */
  let milestone = null;
  /** @type {Epic | null} */
  let epic = null;
  /** @type {(Epic | Task) | null} */
  let item = null;
  let inAcceptance = false;

  const lines = markdown.split('\n');
  lines.forEach((line, index) => {
    const lineNo = index + 1;
    let m;

    if (line.startsWith('## ')) {
      item = null;
      epic = null;
      inAcceptance = false;
      m = MILESTONE_RE.exec(line);
      // Non-milestone level-2 headings (Format, Planning decisions) are prose.
      milestone = m
        ? { key: m[1], title: `${m[1]} ${m[2].replace(/\s*\(.*\)\s*$/, '')}`, epic: null, epics: [] }
        : null;
      if (milestone) milestones.push(milestone);
      return;
    }

    if ((m = EPIC_RE.exec(line))) {
      if (!milestone) throw new BacklogParseError('EPIC_OUTSIDE_MILESTONE', `epic ${m[1]} is not under a milestone`, lineNo);
      const isMilestoneEpic = !m[1].includes('.');
      epic = { id: m[1], title: m[2], labels: [], goal: '', milestone: milestone.title, tasks: [], isMilestoneEpic };
      if (isMilestoneEpic) {
        if (milestone.epic) throw new BacklogParseError('DUPLICATE_MILESTONE_EPIC', `${milestone.key} has two milestone epics`, lineNo);
        milestone.epic = epic;
      } else {
        milestone.epics.push(epic);
      }
      item = epic;
      inAcceptance = false;
      return;
    }

    if ((m = TASK_RE.exec(line))) {
      if (!epic || epic.isMilestoneEpic) throw new BacklogParseError('TASK_OUTSIDE_EPIC', `task ${m[1]} is not under a capability epic`, lineNo);
      /** @type {Task} */
      const task = {
        id: m[1],
        title: m[2],
        labels: [],
        spec: '',
        dependsOn: [],
        goal: '',
        acceptance: [],
        outOfScope: '',
        size: '',
        epicId: epic.id,
        milestone: epic.milestone,
      };
      epic.tasks.push(task);
      item = task;
      inAcceptance = false;
      return;
    }

    if (!item) return;

    if ((m = FIELD_RE.exec(line))) {
      const [, field, value] = m;
      inAcceptance = false;
      switch (field) {
        case 'Labels':
          item.labels = splitList(value);
          break;
        case 'Goal':
          item.goal = value;
          break;
        case 'SPEC':
          if ('spec' in item) item.spec = value;
          break;
        case 'Depends on':
          if ('dependsOn' in item) item.dependsOn = value.match(/T\d+\.\d+/g) ?? [];
          break;
        case 'Out of scope':
          if ('outOfScope' in item) item.outOfScope = value;
          break;
        case 'Acceptance':
          inAcceptance = true;
          break;
        default:
          throw new BacklogParseError('UNKNOWN_FIELD', `unknown field "${field}"`, lineNo);
      }
      return;
    }

    if (inAcceptance && (m = CHECKBOX_RE.exec(line))) {
      if ('acceptance' in item) item.acceptance.push(m[1]);
      return;
    }
    if (line.trim() !== '') inAcceptance = false;
  });

  validate(milestones);
  return { milestones };
}

/** @param {Milestone[]} milestones */
function validate(milestones) {
  const ids = new Set();
  const titles = new Set();
  const tasks = [];
  for (const ms of milestones) {
    if (!ms.epic) throw new BacklogParseError('MISSING_MILESTONE_EPIC', `${ms.key} has no milestone epic`);
    for (const e of [ms.epic, ...ms.epics]) {
      for (const it of [e, ...e.tasks]) {
        if (ids.has(it.id)) throw new BacklogParseError('DUPLICATE_ID', `duplicate id ${it.id}`);
        if (titles.has(it.title)) throw new BacklogParseError('DUPLICATE_TITLE', `duplicate title "${it.title}"`);
        ids.add(it.id);
        titles.add(it.title);
        if (!it.goal) throw new BacklogParseError('MISSING_GOAL', `${it.id} has no goal`);
        if (!it.labels.includes('type:epic') && it === e)
          throw new BacklogParseError('EPIC_WITHOUT_LABEL', `${it.id} must be labelled type:epic`);
      }
      tasks.push(...e.tasks);
    }
  }
  for (const t of tasks) {
    const sizes = t.labels.filter((l) => l.startsWith('size:'));
    if (sizes.length !== 1) throw new BacklogParseError('BAD_SIZE', `${t.id} needs exactly one size label`);
    t.size = sizes[0].slice('size:'.length);
    if (t.size === 'L') throw new BacklogParseError('SIZE_L', `${t.id} is size:L and must be split`);
    if (t.acceptance.length === 0) throw new BacklogParseError('MISSING_ACCEPTANCE', `${t.id} has no acceptance criteria`);
    for (const d of t.dependsOn) {
      if (!ids.has(d)) throw new BacklogParseError('UNKNOWN_DEPENDENCY', `${t.id} depends on unknown ${d}`);
    }
  }
}

/** @param {{ milestones: Milestone[] }} backlog */
export function flatten(backlog) {
  const epics = [];
  const tasks = [];
  for (const ms of backlog.milestones) {
    if (ms.epic) epics.push(ms.epic);
    epics.push(...ms.epics);
    for (const e of ms.epics) tasks.push(...e.tasks);
  }
  return { epics, tasks };
}

const marker = (id) => `<!-- backlog-id: ${id} -->`;

/** Extracts the backlog id from an issue body, if any. */
export function backlogIdOf(body) {
  return /<!-- backlog-id: ([ET][\d.]+) -->/.exec(body ?? '')?.[1];
}

const ref = (id, numbers) => (numbers.has(id) ? `#${numbers.get(id)}` : id);

/**
 * @param {Task} task
 * @param {Map<string, number>} numbers backlog id → issue number
 * @param {Epic} epic
 */
export function renderTaskBody(task, numbers, epic) {
  const unresolved = [epic.id, ...task.dependsOn].some((id) => !numbers.has(id));
  const deps = task.dependsOn.length ? `Blocked by ${task.dependsOn.map((d) => ref(d, numbers)).join(', ')}` : 'None';
  return [
    marker(task.id),
    ...(unresolved ? [PENDING_MARKER] : []),
    '## Context',
    '',
    `Part of epic ${ref(epic.id, numbers)} (${epic.title}). See the SPEC sections below.`,
    '',
    '## Goal',
    '',
    task.goal,
    '',
    '## Acceptance criteria',
    '',
    ...task.acceptance.map((a) => `- [ ] ${a}`),
    '',
    '## Out of scope',
    '',
    task.outOfScope || 'None.',
    '',
    '## SPEC',
    '',
    task.spec || 'None.',
    '',
    '## Dependencies',
    '',
    deps,
    '',
    '## Size',
    '',
    task.size,
    '',
  ].join('\n');
}

/**
 * @param {Epic} epic
 * @param {Array<Epic | Task>} children capability epics for a milestone epic, tasks otherwise
 * @param {Map<string, number>} numbers
 */
export function renderEpicBody(epic, children, numbers) {
  const unresolved = children.some((c) => !numbers.has(c.id));
  return [
    marker(epic.id),
    ...(unresolved ? [PENDING_MARKER] : []),
    '## Goal',
    '',
    epic.goal,
    '',
    `## ${epic.isMilestoneEpic ? 'Epics' : 'Tasks'}`,
    '',
    ...children.map((c) => `- [ ] ${ref(c.id, numbers)}`),
    '',
  ].join('\n');
}

/**
 * Adds `- [ ] #N` lines for children missing from an existing epic body,
 * leaving everything a human wrote untouched. Returns null if nothing changes.
 * @param {string} body @param {number[]} childNumbers
 */
export function appendMissingChildren(body, childNumbers) {
  const missing = childNumbers.filter((n) => !new RegExp(`#${n}\\b`).test(body));
  if (missing.length === 0) return null;
  return `${body.trimEnd()}\n${missing.map((n) => `- [ ] #${n}`).join('\n')}\n`;
}
