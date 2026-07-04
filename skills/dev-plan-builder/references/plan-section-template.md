# Plan Section Template

Structure for the `## Plan` section inside a work-item. The middle layer is optional and comes in two flavors with identical structure: `### Story n:` for user-visible increments, `### Group n:` for non-user-visible work (refactors, pipelines). Omit it when the task list is a handful.

```markdown
## Plan

Execution granularity: <whole work-item | per story | per task>  (user's choice)

### Story 0: Visual smoke  (only when a new page/screen is introduced)   [stop: user-confirm | skip]
Code marking: <throwaway | base>
- [ ] Task 0.1: Render <page> with static data — Verify: open <route>, matches chosen direction
- [ ] STOP for user confirmation of the visual direction (unless [stop: skip] was chosen at planning time)

### Story 1: <user-visible increment>   (AC: R-3, D-1)
Touches: <likely files/areas — optional hint, not a checklist>
- [ ] Task 1.1: <smallest coherent change> — Verify: <command / test / manual check>
- [ ] Task 1.2: <...> — Verify: <...>
Done when: <observable evidence — all task verifies pass AND AC R-3/D-1 demonstrable via <check>>

### Story 2: <...>   (AC: R-4)
- [ ] Task 2.1: <...> — Verify: <...>
Done when: <...>

### Reuse Notes
- Story 1 builds on <existing helper/component/dependency>
- New implementation in Task 2.1 because <why reuse is insufficient>

### Non-Goals
- <explicitly out of scope for this work-item>

### Exit Criteria (work-item convergence)
- All stories Done; final verification: <command(s) run fresh>
- Every Requirement/Design AC demonstrable: <how, in one pass>

### Stop Conditions (inherited by every level)
Halt and ask the user when: a required decision is missing; verification cannot run; the change would exceed Non-Goals; a destructive or irreversible action is required.
```

Rules embedded in the format:

- Three verification names mark three levels on purpose — `— Verify:` = how to check one task (a method); `Done when:` = what evidence closes a story/group (a state); `Exit Criteria` = the fresh final pass that closes the whole work-item. Never merge or rename them; the name tells the reader which level's obligation applies.
- Every task line ends with `— Verify:` and a concrete method. A task without one is not a task yet.
- Every story cites the Requirement/Design ACs it satisfies (`AC: R-n` / `D-n`, numbered in those sections). A story that cites nothing is scope creep or a missing requirement.
- Checkboxes are the execution record's progress tracker — `dev-builder` ticks them as tasks verify.
- **Every unit is goal-ready**: a task, a story, or the whole work-item can be handed to an autonomous run (Codex goal, long Claude Code execution) as-is — each level carries its own convergence (`— Verify:` / `Done when:` / Exit Criteria) and inherits the Stop Conditions. A story that needs context not named in this file is not fully broken down yet.
