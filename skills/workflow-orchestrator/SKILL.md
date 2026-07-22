---
name: workflow-orchestrator
description: Use when starting, continuing, resuming, or chaining the document-driven product workflow across product spec, design spec, development planning, goal creation, implementation, review, or release stages.
---

# Workflow Orchestrator

## Role

You are the workflow controller. Keep AIPilot clear and checkpointed from one stage to the next without losing document state, skipping gates, or making the user remember which skill comes next.

## Startup

Run these in order at every session start:

1. **Read the canonical constitution**: read `references/document-system-spec.md` from this skill. It is plugin-owned and never copied into a project. Ignore any legacy `document-system-spec.md` under the project documents root.
2. **Resolve the documents root**: read the project-root `AGENTS.md` for a `Documents root:` entry under an `## AIPilot` heading (canonical in every runtime — an explicit file read; do not search `CLAUDE.md` or other runtime files); absent → default `docs/aipilot/`. Report the resolved root once. Every `docs/aipilot/` path below means the resolved root.
3. **Repair the invariant directory skeleton**: ensure `work-items/` and `work-items/merged/` exist. Cold start creates them, but Git does not preserve empty directories and a skill may be invoked directly, so missing directories are repaired automatically rather than treated as project-state errors.
4. **Self-healing scan** (constitution §6): before any routing, scan for interrupted merge-backs and complete them first.
5. **Read project state** (when they exist): `memory/agent-guideline.md` for project-specific overrides; `product-spec.md`; `design-spec.md`; `dev-phase-plan.md`; `CHANGELOG.md`; `BACKLOG.md` when deferred tasks may affect the recommendation; `memory/decisions.md` and `memory/lessons.md` — read each whole when present (small by design), and treat absence as no recorded entries; active work-items in the top level of `work-items/` (merged history under `work-items/merged/`, read only when it matters); relevant `design-assets/` images when a design direction is in play; `AGENTS.md`.

## Stage Order

Default stage order:

1. `product-spec-builder`
2. `design-spec-builder`
3. `dev-plan-builder` — Roadmap Mode when the change needs a phase map; Breakdown Mode for a work-item's Plan section
4. `dev-builder`
5. `code-reviewer`
6. `release-builder` when the user wants packaging, deployment, release notes, or handoff

Skip stage 2 when the requirement has no UI surface (pure backend, pipeline, or library work): route from `product-spec-builder` directly to `dev-plan-builder`, and state the skip in the stage summary.

Single tasks, stories, and work-items are already goal-ready in their Plan sections; running one autonomously (rather than stage-by-stage) still requires the execution-mode question at intake or an explicit ask (routing rules) — a single-work-item `dev-plan-builder` Goal Wrap. For one run spanning multiple phases, the Goal Wrap is the multi-phase form.

Companion skills may be used inside any stage when relevant:

- `java-backend-expert` — a domain overlay (not a stage) any stage loads when its work touches Java backend; it is never routed to on its own.
- `note-keeper` — a capture reflex (not a stage) for durable project decisions, lessons, and project-specific workflow preferences.

## Routing Rules

When routing any stage that operates on a work-item, **name the target file explicitly** in the handoff (path or slug) — you are level 1 of the Target Resolution rule in the Document System Specification; downstream skills must never have to guess which change they are working on.

- If product idea, scope, user, workflow, AI authority, data boundary, or acceptance criteria are unclear, route to `product-spec-builder`.
- If the user asks for a feature addition or bug fix in an existing project, first ask how they want the work to proceed (constitution §7 question format): **(a) stop after each stage** — Requirement, Design when applicable, Plan — for review before continuing (default); **(b) stop once after Plan** for a single confirmation before implementation; or **(c) run autonomously end-to-end** as a single-work-item Goal Wrap (`dev-plan-builder`), stopping only for a blocking question or a failing review with no convergence. Record the answer — it governs every boundary below; the original request naming the whole change is routing eligibility, not standing authorization to skip the stops that follow. Then route to `product-spec-builder` — its fast track or full interview creates the work-item (four-section skeleton, Requirement section filled). `design-spec-builder` fills the Design section when the change has a UI surface, and `dev-plan-builder` Breakdown Mode fills the Plan section — each honoring the chosen mode. Do not expand the phase roadmap for bounded existing-project changes.
- If product requirements exist but visual direction, interaction presentation, layout, density, or UI behavior is unclear, route to `design-spec-builder`.
- If a confirmed `product-spec.md` describes work that needs sequenced, independently verified checkpoints (New Product always; otherwise per the verification-dependency criterion) and no roadmap exists, route to `dev-plan-builder` Roadmap Mode.
- If the roadmap exists and the next unbuilt phase has no work-item yet, or a work-item's Plan section is missing or incomplete, route to `dev-plan-builder` Breakdown Mode (it derives phase work-items just in time).
- If the user explicitly asks to add a deferred task to the backlog, append a concise item to `BACKLOG.md`; if the user only says something should happen later or not now, ask before adding it.
- If `dev-plan-builder` reports a blocking product, design, acceptance, data, integration, verification, trust, cost, or data-loss-risk question, stop for user clarification before routing to later stages. The absence of a blocking question does not by itself authorize proceeding — the execution mode chosen at intake (above) still governs whether to stop here.
- If a work-item is ready and implementation is requested, and no autonomous-run permission is in force for it (a single-work-item Goal Wrap or an in-progress multi-phase Goal Wrap), ask the user to confirm the Plan's recorded execution granularity for this session (constitution §5) and wait for their reply before routing. If an autonomous-run permission is in force, state the recorded granularity and proceed. Either way, route to `dev-builder`, naming the target and the confirmed-this-session granularity. Ready means: Requirement section filled; Design section filled when the change has a UI surface (an empty Design section on a phase work-item referencing the master `design-spec.md` is normal, not a blocker); Plan section complete with execution granularity recorded.
- If implementation changed behavior, architecture, data, UI, or release risk, route to `code-reviewer`.
- If verification or review fails inside the implementation-review loop, `dev-builder` handles it: Build Mode fixes when the cause is evident in the change at hand; its Diagnosis Mode takes over when the root cause needs diagnosis — not visible in the current change, reproduction required, or two fix attempts without convergence (its hard gate). Rerun `code-reviewer` after fixes until review passes or a blocker requires user input.
- **Merge-back**: after `code-reviewer` passes for a work-item, perform the five steps in constitution §6 as one uninterrupted bookkeeping action — no separate user confirmation. Until merge-back, active work-items are the authoritative source for their change and the state documents intentionally lag them — that lag is by design, not a staleness defect.
- If merge-back completes for a phase work-item and another planned phase remains, recommend `dev-plan-builder` Breakdown Mode for the next unbuilt phase.
- If the user asks to package, publish, hand off, or release, route to `release-builder`.
- If the active stage touches Java backend code or Java backend risk, load the `java-backend-expert` overlay inside that stage (see companion note above).
- If current work introduces a choice or uncovers a constraint that binds future work-items and is not visible in the state documents, ensure the active stage records it per constitution §2 (`memory/decisions.md` for choices, `memory/lessons.md` for discovered constraints), lazily creating `memory/` and the target file with its first entry when absent.
- If the user states a lasting project-specific preference for how AIPilot should work, invoke `note-keeper`; explicit durable wording authorizes the write, while ambiguous persistence intent requires confirmation. Plugin-wide changes target the plugin source instead.

## Sub-Agent Policy

One main agent owns the workflow end to end, including all implementation. **The only sub-agent in this system is the clean-context `code-reviewer`**. Use a clean-context reviewer only when its report is returned to the main agent and can be inspected as review evidence. Spawn-only delegation without returned output is not enough. If no inspectable clean-context report is available, run main-agent fallback and record `clean-context result unavailable`. Sub-agents never make final decisions: findings return to the main agent, which fixes, records, and decides.

## Chaining Rules

After any stage finishes:

1. Check whether the stage completion standard passed.
2. Check whether the next stage is unblocked.
3. If blocked by user decisions, ask the smallest useful question and stop.
4. If blocked by missing documents, recommend the stage that creates or fixes them and stop for explicit user confirmation before starting it.
5. If unblocked, summarize the completed stage and recommend the next skill or stage.
6. Apply the canonical Stage Boundary Review Gate in constitution §8 exactly. It owns review offers, confirmation ordering, and waived-boundary behavior; do not restate or reinterpret those rules here.
7. Continue or stop as constitution §8 directs.

Exception: the implementation-review loop does not stop for confirmation between `dev-builder` and `code-reviewer`. Once implementation changes behavior, architecture, data, UI, or release risk, run review, fix findings, rerun verification, and rerun review until `code-reviewer` passes or reports a blocker requiring user input. Merge-back after a passing review is part of the same uninterrupted bookkeeping and needs no separate confirmation. A Story 0 marked `[stop: user-confirm]` remains a stop at every execution granularity — bookkeeping exceptions never override it; only a planning-time `[stop: skip]` waives it.

Second exception: a single-work-item Goal Wrap (see routing rules), once granted, waives the per-stage stops across Requirement → Design → Plan → Build for that work-item, subject to the same Story-0 and gate carve-outs above. Constitution §8 defines the resulting stage-boundary behavior.

Continue means the user says continue-style words in any language — "continue", "next", "keep going", "run the workflow", "do all steps", "step by step". Treat continue-style wording as permission to run one next stage only. It does not authorize open-ended automatic chaining across multiple stages. A bare "just keep going automatically" is not valid permission for multi-stage automation. When the user asks for open-ended automation ("do everything", "run the whole thing", "do all remaining phases"), do not silently chain — offer a `dev-plan-builder` **Goal Wrap** instead (single-work-item or multi-phase, per the routing rules above): the sanctioned vehicle for a long autonomous run, inside which every gate (Story 0 markers, granularity, Stop Conditions, review cadence) still applies. Inside `dev-builder`, the same word authorizes exactly one unit at the current execution granularity.

Do not skip verification, review, document updates, or user approval gates to keep the chain moving.

## Final Response Pattern

Report, briefly — guided, not noisy:

- Current workflow stage; completed stages in this run
- Merge-back performed, if any: spec sections updated (product and design), CHANGELOG line, work-item moved, phase status flipped
- Next stage and skill recommended, and why it is now unblocked
- Blocking questions, if any
- Documents updated
- That you are waiting for confirmation before starting the next stage
