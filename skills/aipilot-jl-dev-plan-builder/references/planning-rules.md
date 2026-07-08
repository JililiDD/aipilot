# Planning Rules

Detailed rules for `aipilot-jl-dev-plan-builder`. The Document System Specification governs structure and ownership; these rules govern planning judgment.

## Routing Checks (Roadmap vs Breakdown)

**The one criterion**: a roadmap exists only for **verification dependencies** — part A must be implemented *and verified* before part B can meaningfully start (not mere ordering preference). Found one → Roadmap. None → Breakdown, whatever else fires.

Two **detectors** prompt you to look for that dependency; by themselves they route nothing:

1. **Split categories** — the change touches ≥2 of: data model, runtime integration, UI shell, core workflow, import/export, authentication/credentials, agent tool execution, testing infrastructure, packaging/release. Multiple categories *without* a verification dependency between them stay one work-item.
2. **Size estimate** — the breakdown looks likely to exceed ~10 tasks or one reviewable sitting. This is fully measurable only mid-breakdown, which is why it doubles as the escalation valve's trigger.

Fast lanes: scope New Product → always Roadmap; Bug Fix / bounded Refactor → always Breakdown. Ambiguity → Breakdown (valves correct cheaply).

## Phase Shapes

Good phases produce something inspectable and unblock later work:

- "Create project shell with one working route and visible empty state."
- "Implement local persistence with create/open/save smoke test."
- "Wire import flow from file picker to asset list."

Bad phases are containers, not checkpoints: "Build backend." "Implement all UI." "Set up architecture." "Make it production-ready."

Split a phase when the categories inside it have a verification dependency between them. A phase nothing later depends on for verification (empty Enables line) is a grouping preference — collapse it.

## Story and Task Discipline

- A task is the smallest coherent change with its own verification (command, test, or manual check). No verification method → not yet a task.
- The middle layer has two flavors, identical in structure (Done-when line, AC citations): **User Stories** for user-visible increments; **Task Groups** for non-user-visible work (refactors, pipelines — e.g. "Migrate module A", citing ACs like "behavior unchanged, full suite passes"). Use User Story for any user-facing capability or AC range, even when implementation is mostly backend. Use Task Group only when the work is invisible to users. Never title a user-visible increment `Group n`. Skip the middle layer entirely when the task list is a handful.
- A page-affecting story includes an automated UI test task (e.g. Playwright) **when the roadmap's Testing Strategy declares that tooling** — the plan requires it so the builder runs it and the reviewer can demand its evidence.
- **Story 0 (visual direction smoke)** whenever a new page or screen is introduced: ask the user to choose the direction source first — single-file static HTML prototype (recommended), generated image prototype, or user-provided prototype — and record the answer as `Direction source: <html | image-generation | user-provided>` under Story 0. Story 0 creates or records only that visual direction artifact with static/sample data; no production flow, API, persistence, or full frontend implementation belongs here. Its confirmation stop is on by default and applies at every execution granularity; when asking the granularity question, also ask whether to waive it, and record the answer on Story 0 as `[stop: user-confirm]` or `[stop: skip]` (recommend stopping — wrong direction is expensive, one confirmation is cheap). Code is marked `throwaway` by default or `base` only by explicit user choice. Later stories must respect the marking — never silently build production logic on `throwaway` code.
- Verification dependencies *between stories or groups inside one work-item* are an escalation signal: that is two phases wearing one coat.

## Reuse Order

Inventory before planning, prefer in this order:

1. Existing project code, components, helpers
2. Story-0 `base` code
3. Existing installed dependencies
4. Native platform or standard-library features
5. New implementation — with a stated reason why 1–4 are insufficient

## YAGNI and First Principles

Plan only what current documents prove is needed. No speculative extension points, configuration, providers, modes, dependencies, or abstractions — add them when a real second case appears.

Plan from: the smallest user-visible outcome; stable invariants (facts true now, not imagined variation); minimal state and public surface; explicit data flow (inputs → transformations → storage → outputs); verification wherever data crosses trust, persistence, UI, or integration boundaries; performance work only on measured evidence.

Design patterns are smell detectors, not ceremony: acceptable only when they reduce repeated branching, isolate an external boundary, or serve a real variation point. Never plan an interface, base class, factory, or registry for a single local implementation.

Domain categories, states, modes, and action types get type-safe representations when the language supports them; raw strings stay acceptable for display copy and one-off labels that drive no branching or persistence.

## Dependency Questions

For each phase or story: What must exist before it starts? What depends on it? Can it be reviewed in isolation? What may be mocked — and what must not be, because mocking would hide the risk?

## Verification Menu

Every phase and task names at least one: automated test, build command, lint/typecheck, manual UI flow, data round-trip, log inspection, export/import check. If nothing on this menu applies, the unit is not well-defined yet.

## Risk Routing

- Product scope, behavior, or authority gap → `aipilot-jl-product-spec-builder`
- Layout, interaction, or visual gap → `aipilot-jl-design-spec-builder`
- Acceptance, data-boundary, integration, verification, trust, cost, or data-loss uncertainty → ask the user the smallest useful question and stop
- Pure implementation uncertainty → a spike task with an explicit learning output
