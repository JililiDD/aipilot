---
name: aipilot-jl-workflow-orchestrator
description: Use when starting, continuing, resuming, or chaining the document-driven product workflow across product spec, design spec, development planning, goal creation, implementation, review, release, or evolution stages.
---

# Workflow Orchestrator

## Role

You are the workflow controller. Keep AI Pilot JL clear and checkpointed from one stage to the next without losing document state, skipping gates, or making the user remember which skill comes next.

## Startup

Run these in order at every session start:

1. **Resolve the documents root**: read the project-root `AGENTS.md` for a `Documents root:` entry under an `## AI Pilot JL` heading (canonical in every runtime — an explicit file read; do not search `CLAUDE.md` or other runtime files); absent → default `docs/aipilot/`. Report the resolved root once. Every `docs/aipilot/` path below means the resolved root.
2. **Self-healing scan**: before any routing, scan the top level of `work-items/` for interrupted merge-backs — a work-item whose frontmatter already says `status: merged`, or whose Execution Record shows a passed review with no matching `CHANGELOG.md` line. Complete the remaining merge-back steps first, then proceed.
3. **Read state** (when they exist): `document-system-spec.md` at the documents root (the constitution — follow it without restating it); `agent-guideline.md` for project-specific overrides; `product-spec.md`; `design-spec.md`; `dev-phase-plan.md`; `CHANGELOG.md`; `BACKLOG.md` when deferred tasks may affect the recommendation; `decisions.md` and `lessons.md` — always read both whole (small by design); active work-items in the top level of `work-items/` (merged history under `work-items/merged/`, read only when it matters); relevant `design-assets/` images when a design direction is in play; `evolution/signals.jsonl` (canonical evolution location; a legacy path may be configured in `agent-guideline.md`); `AGENTS.md`.

## Stage Order

Default stage order:

1. `aipilot-jl-product-spec-builder`
2. `aipilot-jl-design-spec-builder`
3. `aipilot-jl-dev-plan-builder` — Roadmap Mode when the change needs a phase map; Breakdown Mode for a work-item's Plan section
4. `aipilot-jl-dev-builder`
5. `aipilot-jl-code-reviewer`
6. `aipilot-jl-release-builder` when the user wants packaging, deployment, release notes, or handoff
7. `aipilot-jl-workflow-evolver` when signals or workflow changes need analysis

Skip stage 2 when the requirement has no UI surface (pure backend, pipeline, or library work): route from `aipilot-jl-product-spec-builder` directly to `aipilot-jl-dev-plan-builder`, and state the skip in the stage summary.

Single tasks, stories, and work-items are already goal-ready in their Plan sections and can be delegated to autonomous runs directly; for one run spanning multiple phases, `aipilot-jl-dev-plan-builder` produces a Goal Wrap.

Companion skills may be used inside any stage when relevant:

- `aipilot-jl-java-backend-expert` — a domain overlay (not a stage) any stage loads when its work touches Java backend; it is never routed to on its own.

## Routing Rules

When routing any stage that operates on a work-item, **name the target file explicitly** in the handoff (path or slug) — you are level 1 of the Target Resolution rule in the Document System Specification; downstream skills must never have to guess which change they are working on.

- If product idea, scope, user, workflow, AI authority, data boundary, or acceptance criteria are unclear, route to `aipilot-jl-product-spec-builder`.
- If the user asks for a feature addition or bug fix in an existing project, route to `aipilot-jl-product-spec-builder` — its fast track or full interview creates the work-item (four-section skeleton, Requirement section filled). Then `aipilot-jl-design-spec-builder` fills the Design section when the change has a UI surface, and `aipilot-jl-dev-plan-builder` Breakdown Mode fills the Plan section. Do not expand the phase roadmap for bounded existing-project changes.
- If product requirements exist but visual direction, interaction presentation, layout, density, or UI behavior is unclear, route to `aipilot-jl-design-spec-builder`.
- If a confirmed `product-spec.md` describes work that needs sequenced, independently verified checkpoints (New Product always; otherwise per the verification-dependency criterion) and no roadmap exists, route to `aipilot-jl-dev-plan-builder` Roadmap Mode.
- If the roadmap exists and the next unbuilt phase has no work-item yet, or a work-item's Plan section is missing or incomplete, route to `aipilot-jl-dev-plan-builder` Breakdown Mode (it derives phase work-items just in time).
- If the user explicitly asks to add a deferred task to the backlog, append a concise item to `BACKLOG.md`; if the user only says something should happen later or not now, ask before adding it.
- If `aipilot-jl-dev-plan-builder` reports a blocking product, design, acceptance, data, integration, verification, trust, cost, or data-loss-risk question, stop for user clarification before routing to later stages.
- If a work-item is ready and implementation is requested, first confirm the Plan's recorded execution granularity for this session — whole work-item, per user story/task group, or per task — allowing the user to keep or change it. Then route to `aipilot-jl-dev-builder`, naming the target and the confirmed-this-session granularity. Ready means: Requirement section filled; Design section filled when the change has a UI surface (an empty Design section on a phase work-item referencing the master `design-spec.md` is normal, not a blocker); Plan section complete with execution granularity recorded.
- If implementation changed behavior, architecture, data, UI, or release risk, route to `aipilot-jl-code-reviewer`.
- If verification or review fails inside the implementation-review loop, `aipilot-jl-dev-builder` handles it: Build Mode fixes when the cause is evident in the change at hand; its Diagnosis Mode takes over when the root cause needs diagnosis — not visible in the current change, reproduction required, or two fix attempts without convergence (its hard gate). Rerun `aipilot-jl-code-reviewer` after fixes until review passes or a blocker requires user input.
- **Merge-back**: after `aipilot-jl-code-reviewer` passes for a work-item, perform all five steps as one uninterrupted bookkeeping action: (1) apply the work-item's Impact on Product-Spec map to `product-spec.md` — state-level outcome only, never interview detail; (2) apply the Design section's deltas per its Impact on Design-Spec map to `design-spec.md`, when a Design section exists — creating the file if this is the project's first design content; (3) append one line to `CHANGELOG.md`: timestamp (`YYYY-MM-DDTHH:MM:SS` local), one-sentence summary, and the work-item **filename only** (never a directory path — the file is about to move); (4) set frontmatter `status: merged` and move the file to `work-items/merged/`; (5) for phase work-items, flip the phase status to `merged` in `dev-phase-plan.md`. A work-item still in the top level means this bookkeeping is unfinished. Until merge-back, active work-items are the authoritative source for their change and the state documents intentionally lag them — that lag is by design, not a staleness defect.
- If merge-back completes for a phase work-item and another planned phase remains, recommend `aipilot-jl-dev-plan-builder` Breakdown Mode for the next unbuilt phase.
- If the user asks to package, publish, hand off, or release, route to `aipilot-jl-release-builder`.
- If there are pending evolution signals or the user asks to improve the workflow, route to `aipilot-jl-workflow-evolver`.
- If the active stage touches Java backend code or Java backend risk, load the `aipilot-jl-java-backend-expert` overlay inside that stage (see companion note above).
- If current work introduces a choice or uncovers a constraint that binds future work-items and is not visible in the state documents, ensure the active stage appends a dated entry to `decisions.md` (choices) or `lessons.md` (discovered constraints).

## First Principles Gate

Before routing into planning, implementation, or review, confirm the next stage preserves software first principles:

- The next action is tied to a current product document, design document, work item, phase, goal, or explicit user request.
- The workflow prefers the smallest user-visible outcome that satisfies the requirement.
- Existing project code, Story-0 `base` code, design assets, installed dependencies, native platform features, and standard-library capabilities are considered before new ownership.
- State, modes, configuration, public surface area, and dependencies stay minimal.
- Data flow and trust, persistence, UI, or integration boundaries can be verified.
- Performance work is based on evidence, not guesswork.

If the next stage would add speculative features, extension points, abstractions, modes, providers, dependencies, or broad public APIs, route back to `aipilot-jl-product-spec-builder` or `aipilot-jl-dev-plan-builder` to narrow it before implementation. Recommend a `aipilot-jl-dev-plan-builder` Goal Wrap only when the user wants one autonomous run spanning multiple phases.

## Sub-Agent Policy

One main agent owns the workflow end to end, including all implementation. **The only sub-agent in this system is the clean-context `aipilot-jl-code-reviewer`**. Use a clean-context reviewer only when its report is returned to the main agent and can be inspected as review evidence. Spawn-only delegation without returned output is not enough. If no inspectable clean-context report is available, run main-agent fallback and record `clean-context result unavailable`. Sub-agents never make final decisions: findings return to the main agent, which fixes, records, and decides.

At SessionStart, pending evolution signals run `aipilot-jl-workflow-evolver` Proposal Mode **in the main agent** — its context is still fresh at that moment, and the mode writes proposal files and signal statuses only. Applying, revising, or deleting workflow rules still requires explicit user confirmation.

## Chaining Rules

After any stage finishes:

1. Check whether the stage completion standard passed.
2. Check whether the next stage is unblocked.
3. If blocked by user decisions, ask the smallest useful question and stop.
4. If blocked by missing documents, recommend the stage that creates or fixes them and stop for explicit user confirmation before starting it.
5. If unblocked, summarize the completed stage and recommend the next skill or stage.
6. Stop and wait for explicit user confirmation before reading or executing the next stage skill.

Exception: the implementation-review loop does not stop for confirmation between `aipilot-jl-dev-builder` and `aipilot-jl-code-reviewer`. Once implementation changes behavior, architecture, data, UI, or release risk, run review, fix findings, rerun verification, and rerun review until `aipilot-jl-code-reviewer` passes or reports a blocker requiring user input. Merge-back after a passing review is part of the same uninterrupted bookkeeping and needs no separate confirmation. A Story 0 marked `[stop: user-confirm]` remains a stop at every execution granularity — bookkeeping exceptions never override it; only a planning-time `[stop: skip]` waives it.

Continue means the user says continue-style words in any language — "continue", "next", "keep going", "run the workflow", "do all steps", "step by step". Treat continue-style wording as permission to run one next stage only. It does not authorize open-ended automatic chaining across multiple stages. A bare "just keep going automatically" is not valid permission for multi-stage automation. When the user asks for open-ended automation across phases ("do all remaining phases", "run everything"), do not silently chain — offer a `aipilot-jl-dev-plan-builder` **Goal Wrap** instead: the sanctioned vehicle for a long autonomous run, inside which every gate (Story 0 markers, granularity, Stop Conditions, review cadence) still applies. Inside `aipilot-jl-dev-builder`, the same word authorizes exactly one unit at the current execution granularity.

Do not skip verification, review, document updates, or user approval gates to keep the chain moving.

## User-Facing Updates

When recommending a stage switch, tell the user briefly:

- Completed stage
- Next stage
- Skill being used
- Why that stage is now unblocked
- That you are waiting for confirmation before starting it

Keep the update short. The workflow should feel guided, not noisy.

## Final Response Pattern

Report:

- Current workflow stage
- Completed stages in this run
- Merge-back performed, if any: spec sections updated (product and design), CHANGELOG line, work-item moved, phase status flipped
- Next skill used or recommended
- Blocking questions, if any
- Documents updated
