# Backlog fixture

## Format

- **Labels:** prose bullets outside milestones are ignored

## M0 Foundation

### [E0] M0 Foundation

- **Labels:** type:epic, priority:p0
- **Goal:** Foundation.

### [E0.1] Repository scaffold

- **Labels:** type:epic, area:repo, priority:p0
- **Goal:** Scaffold.

#### [T0.1] First task

- **Labels:** type:chore, area:repo, priority:p0, size:M
- **SPEC:** §14
- **Depends on:** none
- **Goal:** Do the first thing.
- **Acceptance:**
  - [ ] It works
- **Out of scope:** Nothing.

#### [T0.2] Second task

- **Labels:** type:build, area:repo, priority:p1, size:S
- **SPEC:** §10, §13
- **Depends on:** T0.1, T1.1
- **Goal:** Do the second thing.
- **Acceptance:**
  - [ ] First criterion
  - [ ] Second criterion
- **Out of scope:** Everything else.

---

## M1 Engine core (v0.0.0)

### [E1] M1 Engine core

- **Labels:** type:epic, priority:p0
- **Goal:** Engine.

### [E1.1] Contracts

- **Labels:** type:epic, area:contracts, priority:p0
- **Goal:** Contracts.

#### [T1.1] Contracts task

- **Labels:** type:feature, area:contracts, priority:p0, size:M
- **Depends on:** none
- **Goal:** Contracts goal.
- **Acceptance:**
  - [ ] Defined
