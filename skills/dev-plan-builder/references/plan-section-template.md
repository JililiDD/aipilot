# Plan Section Template

This is the structure for the `## Plan` section inside a work-item. The story and task rules are in `planning-rules.md`. They include when to use `### Task Group n:` instead of `### User Story n:`. Fill in the text in `<angle brackets>`. Copy everything else in the block as written. The notes under the block say which parts are optional.

```markdown
## Plan

Execution granularity: <whole work-item | per user story/task group | per task>
Commit policy: <manual | branch | auto>
Test tiers: fast `<command>` · full `<build of each touched module>` touched modules: <module list>

### Approach Decisions

#### <choice> (<source IDs>)

| Candidate | How it works | Strengths | Weaknesses | Result |
|---|---|---|---|---|
| <candidate> | <one short sentence> | <criteria that it wins on> | <criteria that it loses on> | **Chosen** |
| <candidate> | <one short sentence> | <...> | <...> | Dropped: <failed gate or lost criterion> |

Premises:
- (P1) <checkable claim that the choice relies on>

### Story 0: Visual direction smoke   [stop: user-confirm | skip]
Direction source: <html | image-generation | user-provided>
Code marking: <throwaway | base>
- [ ] Task 0.1: Create or record the visual direction artifact with static or sample data. — Verify: Open the artifact and compare it with the chosen direction.
- [ ] STOP: The user confirms the visual direction.

### User Story 1: <user-visible increment>   (AC: AC-3, D-1)
Touches: <likely files or areas>
Tests: <fast | full>
- [ ] Task 1.1: <smallest coherent change> — Verify: <command / test / manual check>
- [ ] Task 1.2: <...> — Verify: <...>
Done when: All task verifies pass. <AC-3 and D-1 are demonstrable by <check>.>

### User Story 2: <...>   (AC: AC-4)
- [ ] Task 2.1: <...> — Verify: <...>
Done when: <...>

### Reuse Notes
- Story 1 builds on <existing helper/component/dependency>.
- Task 2.1 needs new implementation because <why reuse is insufficient>.

### Non-Goals
- <work this change deliberately does not do, such as a deferred refactor>

### Exit Criteria (work-item convergence)
- All stories are Done, and the full test tier passes in a fresh run: <build of each touched module>
- Every Requirement and Design AC is demonstrable: <how, in one pass>

### Stop Conditions (inherited by every level)
Stop and ask the user when:
- a required decision is missing. Under a Goal Wrap, record the recommended option as an assumption instead.
- verification cannot run.
- the change would exceed Non-Goals.
- a destructive or irreversible action is required.
- <a stop that is specific to this change>
```

Notes on the parts:

- The granularity and commit policy are the user's choices. The test tiers come from `memory/decisions.md`. Each story's `Tests:` tier follows `planning-rules.md` Test Tiers.
- Story 0 appears only when the change introduces a new page or screen. Under `[stop: skip]`, leave out its STOP line.
- `Touches:` is an optional hint, not a checklist.
- Approach Decisions come first, because the stories follow from the chosen approach. When the Plan makes no approach choice, leave the section out.
- Give each choice its own `####` heading, table, and premises. The heading names the source IDs, or the Deferred Choices line that handed the choice to the plan.
- List every candidate that `dev-builder`'s Approach Decision Discipline explored, including each one that a gate dropped. Keep each cell to one short phrase or sentence.
- In Strengths and Weaknesses, name the ranking criterion, such as reuse, blast radius, or consistency. For a dropped candidate, the Result names the gate that it failed or the criterion that it lost on.
- Number the premises across the whole Plan: P1, P2, and so on. An Approach Challenge cites these premises.
- Reuse Notes record only what the stories reuse. Where reuse is not enough, they say why a story needs new code.
- Non-Goals here are implementation exclusions only. Product non-goals live in the Requirement, as its Out of scope list. Write plain bullets without IDs, like the Requirement's Out of scope list. Leave the section out when there are none.
- Stop Conditions keep the four general lines. After them, add the stops that are specific to this change. Never write a premise as a Stop Condition. When a premise fails, `dev-builder` raises an Approach Challenge, and an arbiter rules on it.
- When you know a risk at planning time, give it a task or a `— Verify:` that catches it. Cite the AC-n or D-n that the check protects. If no test can check a constraint, write it as a Stop Condition or a Non-Goal.

Rules embedded in the format:

- Three verification names mark three levels on purpose:
  - `— Verify:` is how to check one task. It is a method.
  - `Done when:` is the evidence that closes a user story/task group. It is a state.
  - `Exit Criteria` is the fresh final pass that closes the whole work-item.

  Never combine or rename them. The name tells the reader which level's obligation applies.
- Checkboxes are the progress tracker of the execution record. `dev-builder` ticks them as tasks verify.
- **Every unit is goal-ready**: a task, a story, or the whole work-item can go as-is to an autonomous run. Examples are a Codex goal and a long Claude Code execution. Each level carries its own convergence (`— Verify:` / `Done when:` / Exit Criteria). Each level also inherits the Stop Conditions. A story that needs context that this file does not name is not fully broken down yet.
