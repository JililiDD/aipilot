---
name: product-spec-builder
description: Use when product idea, scope, users, workflow, AI authority, data boundary, or acceptance criteria are unclear — whenever the user wants to define a new product/feature, change existing behavior, or fix/refactor something not yet fully specified. Grills the user through structured interviewing until an implementation-ready Product Spec exists. Do NOT run the full interview for trivially clear one-line fixes; use the fast track.
---

# Product Spec Builder

## Mission

Remove the requirement uncertainty that would block implementation. Challenge and refine the requirement until a developer could start tomorrow without major questions. Aim to prevent misunderstanding, not to finish the conversation. Every ambiguity that you let slide becomes a bug, rework, or a mid-sprint clarification.

## Required Reading

**Resolve the documents root first** (constitution §7, below). If the project is not initialized, route to `workflow-orchestrator` for cold start, and do not proceed.

Read these documents when they exist:

- `../workflow-orchestrator/references/document-system-spec.md`: the constitution that the plugin owns. It is not a project document. `memory/agent-guideline.md` holds the project-specific overrides.
- `docs/aipilot/product-spec.md`; `memory/decisions.md` and `memory/lessons.md` (constitution §2).
- For a change to an existing project, the target work-item in the top level of `docs/aipilot/work-items/`. Identify it by the Target Resolution rule (constitution §3). Never guess it.

Before a full interview, read `references/interview-doctrine.md`, the canonical interview doctrine, and follow it throughout. The fast track and a Goal Wrap do not interview, so they read only its first two sections. These are the Product vs Design Boundary and the Product vs Plan Boundary.

Never ask for information that these documents already hold. If a document conflicts with the user's request, surface the conflict and ask which stands. Under a Goal Wrap, take the recommended option and record it as an assumption (constitution §7). Summarize your understanding before you proceed.

## Scope and Fast Track

Infer the scope type. It is one of these:

- New Product
- New Feature
- MVP Gap
- Existing Change
- Bug Fix
- Refactor

Ask the user to confirm the scope type only if it is genuinely ambiguous. Write one spec per requirement. Never silently combine unrelated requirements.

**Execution mode first**: this rule covers a change to an existing project. For such a change, if no execution mode has been chosen for it yet in this session, route to `workflow-orchestrator` before asking anything else. For example, this happens when this skill was invoked directly or reached from `dev-builder`. `workflow-orchestrator` runs its Start and asks its Gate 1 question. Then it routes back here.

**Fast track** applies to a Bug Fix or to a small, well-bounded change in an existing project. On the fast track, skip the Decision Notes recaps and the Pre-Spec Gate. Never skip the asking.

For a Bug Fix, triage before asking:

- When that is cheap, reproduce the symptom on a copy or test data, never on real user data.
- Read the code, logs, and data to settle factual questions (constitution §7).
- Keep the triage read-only, with no code changes and no root-cause hunt, which belongs to Diagnosis Mode.
- Keep what you find. When the questions are answered, record it as observed facts in Existing Context.

Ask only about the highest-risk unknowns that triage could not settle, such as:

- the reproduction conditions
- the blast radius
- the expected vs actual behavior
- the data-correction needs

Scale the count of questions to the risk: a typo needs zero, and a concurrency or data-integrity fix may need several.

**Skipping the ceremony does not skip asking**. Ask and wait before you create the work-item or write any Requirement content (constitution §7, Ask before acting). **If the count is zero, say so explicitly before you create the work-item, for example: "no clarifying questions needed — creating the work-item". A silent jump to file creation is not a valid zero-question verdict.**

Ask no more questions once a competent developer could fix it without guessing. Escalate to the full interview as soon as the answers reveal hidden complexity:

- unclear ownership of behavior
- several plausible expected behaviors
- a "fix" that is really a design change

**Under a Goal Wrap**: do not interview (constitution §7). Settle every unknown, whatever its risk tag, with its recommended option. Infer that option from the request, code, documents, and existing behavior. Then record it as an assumption (`A-n`), and have the run's final report list these assumptions for the user to check, highest risk first.

## Interview Loop

Track the Decision Notes as the doctrine defines them. Also track two items that are specific to the spec:

- **Current Biggest Unknown** — the most important requirement uncertainty that is still unresolved. Always attack it first, because depth beats breadth. Do not ask a question that reduces no requirement uncertainty.
- **Parking Lot** — topics that you defer to stay depth-first. It is a queue, not a graveyard. Each item eventually gets one of these outcomes:
  - promoted to a question
  - moved to Open Questions
  - marked out of scope
  - **deferred to design**
  - **deferred to plan**

In each iteration, do these steps:

1. Identify the biggest unknown.
2. Challenge it or ask about it, as the doctrine describes.
3. Update the Decision Notes.
4. Repeat.

**Model shift rule**: an answer can change your understanding of the product model, workflow, data model, scope, system behavior, or MVP boundary. When that happens, do these steps:

1. Leave the current question path.
2. Explain what changed.
3. Output a full recap of the Decision Notes.
4. Re-sort the priorities.
5. Continue from the new biggest unknown.

If an answer contradicts a Confirmed decision, surface the contradiction and ask which stands. Never overwrite the decision silently.

## Probing Heuristics

- **Noun test**: every significant noun in the user's description ("report", "notification", "admin") is a candidate hidden sub-feature. Ask what it contains, who produces it, and where it lives.
- **Value provenance chain**: for every field or datum, ask "where does this value come from?" and keep asking it. When you reach user input, an external system, or a computation, end the chain. Each hop is often an unstated requirement.
- **Control provenance**: for every new switch, setting, threshold, or parameter, ask who sets it, at what granularity, and how to revert it. Granularity examples are deployment, run, country or tenant, and request. Record the answers as constraints. Leave the mechanism to the plan.
- **Negative space**: for each main flow, ask what happens on failure, empty state, duplicate, out-of-order arrival, and permission denial.
- **Boundary probe**: for every list, limit, or date, ask about zero, one, max, and off-by-one.
- **Actor sweep**: for each behavior, ask who else can trigger, observe, or be affected by it.

## Boundaries with Design and Plan

The doctrine defines the boundary between product and design. When visual or taste topics come up, park them as deferred to design. Add a `[design]` line for `design-spec-builder` to the Requirement's Deferred Choices. Do not grill these topics here.

The doctrine also defines the boundary between product and plan. When a mechanism choice comes up, write its constraints as requirements. Park the choice as deferred to plan. Add a `[plan]` line for `dev-plan-builder` to the Requirement's Deferred Choices.

## Pre-Spec Gate

Before you generate the spec, do these steps in order:

1. **Parking lot reclamation**: walk through every parked item. Promote it, move it to Open Questions, or mark it out of scope. Otherwise, defer it to design or to the plan. No item may remain unaddressed.
2. **Non-functional sweep** (scope-dependent): sweep the topics below that fit the scope type. Ask only where a real risk exists.
   - New Feature → rollout/flags, permissions, observability.
   - Existing Change → backward compatibility, migration.
   - Refactor → regression surface, behavioral equivalence.
   - Anything with data → volume, latency, idempotency, late/duplicate data, timezone.
3. **Implementer check**: act as the senior engineer who implements this tomorrow, and answer these questions:
   - Is there an unconfirmed assumption that matters?
   - Would I still need clarification?
   - Have I challenged rather than recorded?
   - Have I written a mechanism choice into a requirement or an assumption? If so, rewrite it as constraints. Defer the choice to the plan.

   If you are uncertain, keep clarifying. This does not apply when the user has invoked the exit valve, or a Goal Wrap has accepted the remaining unknowns as recorded assumptions.
4. **Handoff test**: check that all four of these are true:
   - A planner can phase the spec.
   - A task-breaker can decompose it.
   - A developer can start without major questions.
   - QA can derive acceptance tests from the Acceptance Criteria.

   If any one of them is false, keep clarifying.

## Output Routing

The scope type decides the destination, not the length of the interview. The fast track and the full interview can each produce either document.

- **Master spec** (`docs/aipilot/product-spec.md`): only for the New Product scope type, or for a change that redefines the product's core model, primary workflow, or MVP boundary.
- **Work-item** (`docs/aipilot/work-items/`, constitution §3): for every bounded change to an existing product. This covers a feature addition, a behavior change, a removal, a refactor, or a bug fix.

**Creating a work-item**: ensure `docs/aipilot/work-items/` and `docs/aipilot/work-items/merged/` exist. If either directory is missing, repair it. Then create the file with the metadata head and the canonical section skeleton (constitution §3). Fill the Quick Overview and the Requirement section.

**Impact on Product-Spec** is the merge map. It lists the master-spec sections that describe behavior that this change alters. Write it only when `product-spec.md` exists and the change alters it. The orchestrator applies the merge map at merge-back, never this skill.

## Spec Output

A work-item's Requirement has the subsections below, in this order. Write the first four every time. Write each other subsection only when it has content. Never write a subsection that only says "None".

1. **Existing Context**: why the project needs the change, and the facts, dependencies, and constraints that the change needs. Facts that you find while you specify belong here. An example is a behavior that must stay unchanged. Approach suggestions belong in the Plan's Approach Decisions.
2. **Scope**: an `#### In scope` list and an `#### Out of scope` list. Write both as plain bullets, with no IDs. Name the affected end users, flows, APIs, data, and components in these lists. The Out of scope items say what end users will not get from this change. These are product non-goals; the Plan holds implementation ones. If an exclusion needs a check, also write it as an acceptance criterion.
3. **Proposed Behavior**: the end-user and system flow, as direct imperative steps. For a Bug Fix, give the expected behavior and the actual behavior.
4. **Acceptance Criteria** (`AC-n`).
5. **Assumptions** (`A-n`).
6. **Open Questions** (`Q-n`).
7. **Deferred Choices**: one line for each choice that another stage settles. Tag the line `[design]` or `[plan]`. Name the constraints that the choice must meet.
8. **Impact on Product-Spec**: the merge map, as Output Routing defines it.

If the change has data changes, permissions, or compatibility and migration needs, add **Data Changes**, **Permissions**, or **Compatibility/Migration** after Proposed Behavior. Add no other subsection. The Quick Overview holds the summary, so the Requirement has no Summary.

A master spec uses the same items as sections. It opens with a **Summary**, because it has no Quick Overview. It has no Impact on Product-Spec.

Item format, numbering, and ID stability for the lists below follow constitution §7.

- **Acceptance Criteria** (`AC-n`) are requirement-level and verifiable. They are the contract that QA tests against. `dev-plan-builder` and `code-reviewer` cite them by ID. `dev-plan-builder` decomposes and references them per story and task, and it must not invent new ones. Writing them precisely is part of the interview. If a criterion cannot be phrased verifiably, the requirement is not resolved yet.

  Write the criteria for the main behavior first. Then write the boundary and error cases in the same list. Write each one as "If <unwanted event>, then the system shall <result>". A boundary fact with no required behavior, such as a data quirk, belongs in Existing Context.
- **Assumptions** (`A-n`) list every Assumed entry in the Decision Notes. Label each one explicitly as unconfirmed.
- **Open Questions** (`Q-n`) record unresolved items with risk tags.

**Highest-risk decisions**: highlight the 2–3 highest-risk decisions in the stage report. These are typically the decisions made fastest, or the ones adopted from your suggestions. The stage report states decisions already made. If a decision still needs the user, ask about it before writing (constitution §7), never in the stage report.

**Versioning**: stamp the document with these two sentences, as written: "Version <n>, <date>. Each later version states what changed and why."

When you write the master spec directly (New Product or core re-scoping), also append a one-line entry to `docs/aipilot/CHANGELOG.md`. For a work-item, merge-back writes that line later. Do not claim that the spec is frozen. Enforcement belongs to version control.

When a spec decision meets the bar in constitution §2, record it as §2 describes.

## Workflow Handoff

After you write the Requirement content, give the stage report in the orchestrator's pattern. It states these items:

- the completed stage
- the documents updated, with the name of the work-item file if you created one
- the open questions
- the recommended next stage, and why it is unblocked

Recommend the next stage as follows:

- If the requirement has a UI surface, recommend `design-spec-builder` for the work-item's Design section.
- Otherwise, recommend `dev-plan-builder` for the work-item's Plan.

Apply the canonical constitution §8 at the stage boundary. Do not restate or bypass its browser review and confirmation policy.
