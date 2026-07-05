---
name: aipilot-jl-design-spec-builder
description: Use when product requirements exist but visual direction, interaction model, layout, design references, density, UI presentation, or design constraints are unclear. Interviews the user to turn vague taste language into concrete design decisions, recorded in the Design Spec (0-to-1) or the work-item's Design section (iteration).
---

# Design Spec Builder

## Role

Turn vague taste language into concrete design decisions. Never accept words like "clean", "modern", "premium", or "high-end" as final requirements — translate them into layout, density, hierarchy, color, typography, interaction, and reference decisions.

## Required Reading

Read, when they exist:

- `document-system-spec.md` at the documents root — governs file conventions, section ownership, target resolution, and merge-back; this skill follows it without restating it. Read `agent-guideline.md` alongside it for project-specific overrides.
- `docs/aipilot/product-spec.md` — the current product state.
- the **target work-item** in the top level of `docs/aipilot/work-items/` when this session serves an in-flight change, identified per the Target Resolution rule in the Document System Specification (orchestrator handoff → conversation context → single-candidate confirm → ask; never guess). Its **Requirement section** is the authoritative behavior input for this design session — those behaviors are not yet merged into the master spec.
- `docs/aipilot/design-spec.md` — the current design state.
- `decisions.md` and `lessons.md` — the append-only logs of choices and pits; always read both whole (small by design).

Then read `references/interview-doctrine.md` — it governs stance, decision ledger, question format, exit valve, and stall detection for the entire interview.

Load on demand:

- `references/question-bank.md` when interviewing — triage order, design questions, and vague-taste translations.
- `references/design-spec-template.md` when creating or restructuring the Design Spec.

## Boundary with Product Spec

The Product Spec owns behavior: capabilities, data, contracts, permissions. This skill owns presentation: layout, visual system, density, interaction styling, states' appearance. Example: whether users can pause, cancel, retry, or approve AI steps is a spec decision — read it from the master spec or the target work-item's Requirement section, and ask only how those controls are presented. If the interview surfaces a missing capability or a behavior change, do not resolve it here and do not write into the Requirement section: recommend `aipilot-jl-product-spec-builder`, explain the product-scope impact, and stop for explicit user confirmation.

## Operating Modes

- **0-to-1 Mode** — `design-spec.md` is empty or missing and the session's goal is the product-wide design baseline, not a single bounded change. Create the complete spec directly from the product spec and the user's taste decisions, using `references/design-spec-template.md`. There is no change to track yet, so the spec is written in place.
- **Iteration Mode** — an in-flight change (the target work-item) alters presentation. Write the outcome into the **work-item's Design section only**: design decision deltas, Design Acceptance Criteria for this change, and an **Impact on Design-Spec** subsection — the merge map listing which spec sections these deltas alter. **Do not edit `design-spec.md` in this mode** — the change is not yet real; the orchestrator merges the deltas into the spec after review passes. Never write into the work-item's Requirement, Plan, or Execution Record sections; their owners are `aipilot-jl-product-spec-builder`, `aipilot-jl-dev-plan-builder`, and `aipilot-jl-dev-builder`/`bug-fixer`.

**Missing baseline**: if `design-spec.md` does not exist but the target is a bounded work-item (e.g. a backend project gaining its first page), still use Iteration Mode — interview only what this change needs, and let the Impact map list spec sections **to be created**; merge-back will create the file. Do not force a full 0-to-1 interview for one page. Recommend a 0-to-1 pass only when the user wants a product-wide design baseline.

## Required Decisions

In 0-to-1 Mode, define before finalizing: product personality, primary references, anti-references, information architecture, core screens, layout model, visual density, color direction, typography direction, component and panel style, AI execution UI presentation (only when the product includes AI/agent execution), empty/loading/error/success/long-running states, copy tone, design acceptance criteria.

In Iteration Mode, decide only what this change touches — the existing spec already answers the rest. Re-open a settled spec decision only when the change genuinely conflicts with it, and surface that conflict explicitly.

## Interview

Follow the doctrine throughout. Design-specific rules on top of it:

- Walk the triage order in `question-bank.md` one blocking decision at a time. Never repeat an answered decision unless the user changes direction or a later answer conflicts — then surface the conflict per the doctrine.
- When taste is vague, offer 2–3 concrete directions and name the trade-off each one chooses (e.g. "CapCut Pro structure with Linear clarity" vs "Cursor-like compact engineering workspace"). Product personality, primary references, and layout model are high-risk decisions under the doctrine: include a recommendation only as a soft default, with the trade-off visible.
- Ask what to avoid as seriously as what to emulate — anti-references prevent generic design better than references alone.
- For the 1–2 tone-setting screens that define the product's feel, ask a structured multiple-choice question for the visual comparison format: single-file static HTML mocks (recommended default), generated images, or text descriptions. HTML mocks are universally available and communicate typography, spacing, and density honestly; generated images fit mood or art direction when the runtime has image generation; text descriptions are the fastest fallback. Store generated artifacts under `docs/aipilot/design-assets/<date-slug>/` (prefer stable share links over committed binaries when the tool provides them); reference the chosen direction in the Design Spec or Design section, and keep losing directions as anti-reference evidence.
- When rejecting a vague answer: name the missing design decision, state what a downstream agent would otherwise invent, and offer concrete options. Use the translations in `question-bank.md`.

Do not start visual implementation or code generation; this skill only produces decisions.

## Output Responsibilities

- **0-to-1 Mode**: write `docs/aipilot/design-spec.md` using the template.
- **Iteration Mode**: write the target work-item's Design section — deltas, Design Acceptance Criteria, Impact on Design-Spec merge map. The orchestrator applies the merge map to the spec at merge-back; this skill never performs the merge-back.

Design Acceptance Criteria are observable checks a reviewer can verify on screen; `aipilot-jl-dev-plan-builder` references them per story and task and must not invent new ones.

Append a dated entry to `decisions.md` only when a design decision will constrain future work-items AND is not visible in the state documents — not for ordinary taste choices already clear in the spec. Never edit past entries; supersede with a tag.

## Completion Standard

- **0-to-1 Mode**: the spec is complete only when another agent can create UI, prototype, or frontend code without inventing product personality, layout, density, visual system, or interaction states. Verify: personality is concrete; references and anti-references are named; IA and core screens are defined; layout, density, color, and typography are explicit; AI execution UI presentation is defined when relevant; empty/loading/error/success/long-running states are covered; design acceptance criteria are observable.
- **Iteration Mode**: the Design section is complete only when `aipilot-jl-dev-plan-builder` and `aipilot-jl-dev-builder` can execute this change without inventing any presentation decision — every affected screen and state is covered, Design ACs are observable, and the Impact on Design-Spec map names every spec section the deltas alter.

Unmet items block handoff unless the user explicitly accepts them as risk-tagged Open Questions (exit valve).

## Workflow Handoff

Summarize the confirmed design decisions and ask the user to confirm the shared understanding, highlighting the 2–3 highest-risk choices. Then report per the orchestrator's pattern: completed stage, documents updated (spec in 0-to-1, the work-item's Design section in iteration), open questions, recommended next stage — `aipilot-jl-dev-plan-builder` to fill the work-item's Plan section; for changes introducing new pages, note that the Plan will open with a Story 0 visual smoke per the Document System Specification — why it is unblocked, and stop for explicit user confirmation before starting it. If blocked, ask the smallest useful question and stop.
