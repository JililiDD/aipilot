# Planning Rules

These are the detailed rules for `dev-plan-builder`. The Document System Specification governs structure and ownership. These rules govern planning judgment.

## Routing Checks (Roadmap vs Breakdown)

**The one criterion**: a roadmap exists only for **verification dependencies**. A verification dependency means that part A must be implemented *and verified* before part B can meaningfully start. A mere ordering preference is not a verification dependency. If you find one, choose Roadmap. If you find none, choose Breakdown, whatever else fires.

Two **detectors** prompt you to look for that dependency. By themselves, they route nothing. The detectors are:

1. **Split categories**: the change touches two or more of these categories:
   - data model;
   - runtime integration;
   - UI shell;
   - core workflow;
   - import/export;
   - authentication/credentials;
   - agent tool execution;
   - testing infrastructure;
   - packaging/release.

   Multiple categories *without* a verification dependency between them stay one work-item.
2. **Size estimate**: the breakdown looks likely to exceed ~10 tasks or one reviewable sitting. You can fully measure this only mid-breakdown. That is why it also triggers the escalation valve.

Fast lanes:

- If the scope type is New Product, always choose Roadmap.
- If the scope type is Bug Fix or a bounded Refactor, always choose Breakdown.
- On ambiguity, choose Breakdown. The valves correct it cheaply.

## Phase Shapes

Good phases produce something inspectable and unblock later work:

- "Create project shell with one working route and visible empty state."
- "Implement local persistence with create/open/save smoke test."
- "Wire import flow from file picker to asset list."

Bad phases are containers, not checkpoints:

- "Build backend."
- "Implement all UI."
- "Set up architecture."
- "Make it production-ready."

Split a phase when the categories inside it have a verification dependency between them. If a phase other than the last has an empty Enables line, nothing later depends on it for verification. Such a phase is a grouping preference, so collapse it. Each phase must be reviewable without holding the whole project in context. The first phase must produce an inspectable result.

## Story and Task Discipline

- A task is the smallest coherent change with its own verification: a command, a test, or a manual check. Without a verification method, it is not yet a task.
- The middle layer has two flavors with an identical structure: a Done-when line and AC citations. The two flavors are:
  - **User Stories**, for user-visible increments;
  - **Task Groups**, for work that end users do not see, such as refactors and pipelines. An example is "Migrate module A", which cites ACs like "behavior unchanged, full suite passes".
- Use User Story for any user-facing capability or AC range, even when the implementation is mostly backend. Use Task Group only when the work is invisible to end users.
- Never title a user-visible increment `Group n`. Never introduce "epic" or "ticket" levels.
- User Stories and Task Groups share one number sequence after Story 0, such as User Story 1, Task Group 2, User Story 3. A task number starts with its story or group number, such as Task 2.1.
- Skip the middle layer entirely when the task list is a handful. Without it, the Exit Criteria take the place of `Done when:`. No `Tests:` line is needed, because the full tier closes the work-item.
- A page-affecting story includes an automated UI test task (for example Playwright) **when the roadmap's Testing Strategy declares that tooling**. The plan requires this task so that `dev-builder` runs it and `code-reviewer` can demand its evidence.
- **Story 0 (visual direction smoke)**: plan it whenever a new page or screen is introduced.
  - If the work-item's Design section already records a chosen mock for that page, record it as `Direction source: user-provided` (with its path) without asking again.
  - Otherwise, first ask the user to choose the direction source. Offer these options:
    - a single-file static HTML prototype (recommended);
    - a generated image prototype;
    - a user-provided prototype.

    Record the answer under Story 0 as `Direction source: <html | image-generation | user-provided>`.
  - Story 0 creates or records only that visual direction artifact, with static or sample data. No production flow, API, persistence, or full frontend implementation belongs in Story 0.
  - Its confirmation stop is on by default. The stop applies at every execution granularity. The planning question batch in `SKILL.md` asks whether to waive it. Record the answer on Story 0 as `[stop: user-confirm]` or `[stop: skip]`. Recommend keeping the stop, because a wrong direction is expensive and one confirmation is cheap.
  - Mark the code `throwaway` by default. Mark it `base` only when the user explicitly chooses it.
  - Later stories must respect the marking. Never silently build production logic on `throwaway` code.

## Reuse Order

Take an inventory before you plan. Prefer sources in this order:

1. Existing project code, components, and helpers
2. Story-0 `base` code
3. Existing installed dependencies
4. Native platform or standard-library features
5. New implementation, with a stated reason why 1–4 are insufficient

## YAGNI and First Principles

Plan only what current documents prove is needed. Plan no speculative extension points, configuration, providers, modes, dependencies, or abstractions. Add them when a real second case appears.

Plan from these starting points:

- the smallest user-visible outcome;
- stable invariants, which are facts that are true now, not imagined variation;
- minimal state and public surface;
- explicit data flow (inputs → transformations → storage → outputs);
- verification wherever data crosses trust, persistence, UI, or integration boundaries;
- performance work only on measured evidence.

Design patterns are smell detectors, not ceremony. A design pattern is acceptable only when it does one of these:

- reduces repeated branching;
- isolates an external boundary;
- serves a real variation point.

Never plan an interface, base class, factory, or registry for a single local implementation.

When the language supports them, use type-safe representations for domain categories, states, modes, and action types. Raw strings stay acceptable for display copy and one-off labels that drive no branching or persistence.

## Test Tiers

Every Plan names two tiers:

- The **fast tier** is unit tests, lint, and typecheck. It closes each story.
- The **full tier** builds every module that the change touches, with each module's own tests. It closes the work-item. Modules that the change does not touch stay out of it, even when they depend on a touched module. CI covers those after the push.

Rules for the tiers:

- Discover the commands once. Look in the CI configuration first, then in package scripts, Makefiles, or build files. For the full tier, record the command that builds one module, such as `./gradlew :<module>:build`. Confirm the commands with the user, and record them as a dated entry in `memory/decisions.md`. Later Plans cite that entry instead of rediscovering the commands. A change in how the project tests is a new, superseding entry.
- Each Plan names the modules that its change touches, and its full tier builds each of them.
- A change to shared build configuration, such as a root build file, touches every module. The full tier then builds the whole project.
- The fast tier itself can be slow, beyond a couple of minutes. In that case, narrow it only through the toolchain's own selector, never by guessing which tests are related. Examples of such selectors are `jest --findRelatedTests`, `nx affected`, and incremental Gradle.
- By default, mark each story `Tests: fast`. Mark it `Tests: full` when it touches shared modules, the data model or migrations, security-sensitive code, or build configuration. This way, those risks surface at that story instead of at the end.

## Dependency Questions

For each phase or story, answer these questions:

- What must exist before it starts?
- What depends on it?
- Can it be reviewed in isolation?
- What may be mocked?
- What must not be mocked, because mocking would hide the risk?

## Verification Menu

Every phase and task names at least one of these verification methods:

- automated test;
- build command;
- lint/typecheck;
- manual UI flow;
- data round-trip;
- log inspection;
- export/import check.

If nothing on this menu applies, the phase or task is not well-defined yet.

## Risk Routing

- A gap in product scope, behavior, or authority: route to `product-spec-builder`.
- A gap in layout, interaction, or visual design: route to `design-spec-builder`.
- Uncertainty about acceptance, data boundaries, integration, verification, trust, cost, or data loss: ask the user the smallest useful question and stop. Under a Goal Wrap, record the recommended option as an assumption instead.
- Pure implementation uncertainty: plan a spike task with an explicit learning output.
