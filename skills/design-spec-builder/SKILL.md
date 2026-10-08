---
name: design-spec-builder
description: Use when product requirements exist but visual direction, interaction model, layout, design references, density, UI presentation, or design constraints are unclear. Interviews the user to turn vague taste language into concrete design decisions, recorded in the Design Spec (0-to-1) or the work-item's Design section (iteration).
---

# Design Spec Builder

## Role

Turn vague taste language into concrete design decisions. Never accept words such as "clean", "modern", "premium", or "high-end" as final requirements. Translate them into decisions about layout, density, hierarchy, color, typography, interaction, and references. This skill only produces decisions. It never starts visual implementation or code generation.

## Required Reading

Read these files when they exist:

- `../workflow-orchestrator/references/document-system-spec.md`: the constitution that the plugin owns. It is not a project document. `memory/agent-guideline.md` holds the project-specific overrides.
- `docs/aipilot/product-spec.md` and `docs/aipilot/design-spec.md`: the current product state and design state.
- `memory/decisions.md` and `memory/lessons.md` (constitution §2).
- The **target work-item** in the top level of `docs/aipilot/work-items/`, when this session serves an in-flight change. Identify it by the Target Resolution rule (constitution §3). Never guess it. Its **Requirement section** is the authoritative input for behavior. Those behaviors are not yet in the master spec.

Before you interview, read `../product-spec-builder/references/interview-doctrine.md`. It is the canonical interview doctrine that this skill shares with `product-spec-builder`. A Goal Wrap does not interview, so it reads only the doctrine's first section, the Product vs Design Boundary.

Load these files on demand:

- `references/question-bank.md` when you interview. It holds the triage order, the questions, and the translations of vague taste.
- `references/design-spec-template.md` when you create or restructure the Design Spec.

## Boundary with Product Spec

Read the capabilities from the master spec or from the target work-item's Requirement section. Ask only how the product presents them. Settle each `[design]` line in the Requirement's Deferred Choices.

If the interview surfaces a missing capability or a behavior change, do not resolve it here. In that case, do not write into the Requirement section. Do these steps instead:

1. Recommend `product-spec-builder`.
2. Explain the impact on product scope.
3. Then stop for explicit user confirmation. Under a Goal Wrap, follow constitution §7 Routing instead.

## Operating Modes

- **0-to-1 Mode**: `design-spec.md` is empty or missing, and the goal is the product-wide design baseline, not one bounded change. Write `docs/aipilot/design-spec.md` directly from the product spec and the user's taste decisions. Use `references/design-spec-template.md`. There is no change to track yet, so write the spec in place.
- **Iteration Mode**: an in-flight change alters presentation. Write only the target work-item's **Design section**. If the work-item has no `## Design` heading, add it after the Requirement. The section holds these parts:
  - the deltas to the design decisions
  - the Design Acceptance Criteria for this change
  - an **Impact on Design-Spec** subsection: the merge map that lists the spec sections that the deltas alter. The orchestrator applies this map at merge-back.

  Decide only what this change touches. If the change genuinely conflicts with a settled spec decision, re-open that decision. Surface that conflict explicitly. Do not re-open a settled spec decision for any other reason.

**Missing baseline**: if `design-spec.md` does not exist but the target is a bounded work-item, still use Iteration Mode. An example is a backend project that gains its first page. In this case:

- Interview only what this change needs.
- Let the Impact map list the spec sections **to be created**. Merge-back creates the file.

Do not force a full 0-to-1 interview for one page. If the user wants a product-wide design baseline, recommend a 0-to-1 pass. Otherwise, do not recommend one.

**Under a Goal Wrap** (single work-item or multi-phase): do not interview. Infer the decisions that this change needs from the existing layout, density, and visual system in `design-spec.md`. If no spec exists, infer them from the existing UI. Write them into the Design section as usual, each labeled an assumption (`A-n`). Include observable Design ACs and the Impact map. The run's final report lists these designs as made without user confirmation.

## Interview

Follow the doctrine throughout. Apply these design rules on top of it:

- Walk the triage order in `question-bank.md`, one blocking decision at a time.
- Never ask again about an answered decision. Ask again only if the user changes direction or a later answer conflicts with it. If a later answer conflicts, surface the conflict.
- When taste is vague, offer 2–3 concrete directions. Name the trade-off that each direction chooses. For example: "CapCut Pro structure with Linear clarity" versus "Cursor-like compact engineering workspace".
- Ask what to avoid as seriously as what to emulate. Anti-references prevent generic design better than references alone.
- For the 1–2 tone-setting screens that define the product's feel, ask a structured question about the format of the visual comparison. Offer these options:
  - Single-file static HTML mocks (recommended). They are available everywhere, and they show typography, spacing, and density honestly.
  - Generated images, for mood or art direction, when the runtime can generate them.
  - Text descriptions. They are the fastest fallback.

  For this visual comparison:
  - Store generated artifacts under `docs/aipilot/design-assets/<date-slug>/`. When the tool provides stable share links, prefer them over committed binaries.
  - Reference the chosen direction in the Design Spec or in the Design section.
  - Keep the losing directions as anti-reference evidence.
- When you reject a vague answer, do these steps:
  1. Name the missing design decision.
  2. State what a downstream agent would otherwise invent.
  3. Offer concrete options. Use the translations in `question-bank.md`.

## Visual Preview via Review Runtime

Browser reviews of HTML mocks run through `../workflow-orchestrator/references/review-runtime.md`. That file is the single call point for the browser review tool. Never copy its commands into this skill.

- **Always ask before previewing**, and offer an explicit skip. The user may prefer to decide from text descriptions or to defer the visual check. A skipped preview is not a skipped confirmation. The user still confirms the decision in chat.
- **New page in the requirement**: ask whether to follow the existing design style or to explore freely. Following the existing style is the usual answer when the project already has pages and a `design-spec.md`. Free exploration is typical for a new project that is still finding its UX direction. If the user chooses to explore, ask how many candidate mocks to generate.
- **Bounded UI component change**: preview only the minimal affected component. For example, for a text-style change inside a card, preview that card, not the whole page.

## Acceptance Criteria and Decisions

Design Acceptance Criteria (`D-n`) are observable checks that a reviewer can verify on screen. `dev-plan-builder` and `code-reviewer` cite them by ID. `dev-plan-builder` must not invent new ones. Put unresolved design questions in Open Questions (`Q-n`, risk-tagged). Item format, numbering, and ID stability follow constitution §7. When a design decision meets the bar of constitution §2, record it as §2 says.

## Completion Standard

- **0-to-1 Mode**: the stage is complete only when another agent can create UI, prototypes, or frontend code without inventing any of these:
  - the product personality
  - the layout
  - the density
  - the visual system
  - the interaction states

  Verify that:
  - The personality is concrete.
  - The primary references and the anti-references are named.
  - The information architecture and the core screens are defined.
  - The layout model, density, color, typography, and component or panel style are explicit.
  - If the product includes AI or agent execution, the presentation of the AI execution UI is defined.
  - The empty, loading, error, success, and long-running states are covered.
  - The copy tone is set.
  - The design acceptance criteria are observable.
- **Iteration Mode**: the stage is complete only when `dev-plan-builder` and `dev-builder` can execute the change without inventing any presentation decision. This means that:
  - Every affected screen and state is covered.
  - The Design ACs are observable.
  - The Impact on Design-Spec map names every spec section that the deltas alter.

Unmet items block the handoff. Exit valve: if the user explicitly accepts them as risk-tagged Open Questions, they do not block it.

## Workflow Handoff

Summarize the confirmed design decisions. Highlight the 2–3 highest-risk choices. Then give the stage report in the orchestrator's pattern:

- the completed stage
- the documents updated: the spec in 0-to-1 Mode, or the work-item's Design section in Iteration Mode
- the open questions
- the recommended next stage, which is `dev-plan-builder` for the Plan. If the change introduces new pages, note that its Plan opens with Story 0.
- why the next stage is unblocked

Apply the canonical constitution §8 at the stage boundary. Do not restate or bypass its browser review and confirmation policy.
