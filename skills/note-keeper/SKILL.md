---
name: note-keeper
description: Use when the user states a discovered project constraint, a choice that will bind future work, or a lasting project-specific preference for how AIPilot should work. Captures the memory in lessons.md, decisions.md, or agent-guideline.md without starting a separate workflow stage.
---

# Note Keeper

## What this is

A capture reflex, not a stage. Resolve the documents root, classify one durable memory, record it in the right project file, and return control to whatever the conversation was already doing.

If another AIPilot skill is already active and owns this recording per its own rules (`dev-builder`, `dev-plan-builder`), let it — do not double-record.

Product facts and scope are not notes; route them to `product-spec-builder` and the relevant state/work-item documents. Plugin-wide workflow changes are not project notes either; change the plugin's source rules only when the user explicitly asks to change AIPilot for every project.

## Classify

- A discovered constraint or pit that binds future work → `lessons.md`.
- A technical or architectural choice that binds future work and is not already visible in a state document → `decisions.md`.
- A lasting, project-specific preference for how AIPilot should plan, question, stop, review, or otherwise operate → `agent-guideline.md`.

Current-task instructions are not durable memory. A correction such as "not this time" changes the current action only. Product behavior belongs in the product spec or work-item. A request that all AIPilot projects behave differently targets the plugin source, not `agent-guideline.md`.

## Persistence Intent for Workflow Preferences

Treat explicit durable phrases such as "from now on", "always", "for this project", "remember", "do not do this again", or "make this a project rule" as both the request and approval to write. Normalize the instruction into one specific, actionable rule and write it without asking for a second confirmation.

When a workflow preference sounds durable but the user's intent is ambiguous, show the exact normalized rule and ask one option-picker question: write it as a project rule; use it only for the current task; or revise the wording. Do not write until the user chooses the project-rule option.

Do not persist an ordinary correction or infer a permanent rule from one incident. If the same correction recurs, that recurrence may justify asking the persistence question, but it never authorizes a silent write.

## Action

1. Resolve the documents root: read the project-root `AGENTS.md` for a `Documents root:` line under an `## AIPilot` heading; absent → default `docs/aipilot/`. If that root doesn't exist either, there is nothing to append to — say so briefly and stop.
2. Classify the memory and, for a workflow preference, resolve persistence intent using the rules above.
3. Read the target file before writing. If the same active rule or note already exists, do not duplicate it. If a proposed workflow rule conflicts with or weakens an existing rule, show the conflict and get explicit confirmation before replacing it.
4. For `decisions.md` and `lessons.md`, append one dated entry using `## YYYY-MM-DD <title>`. Never rewrite history; supersede old entries per constitution §2.
5. For `agent-guideline.md`, create it if absent. Keep current rules under `## Active Workflow Overrides`, using a short heading plus `Added`, `Scope`, `Rule`, and `Supersedes` fields. Move a replaced rule under `## Superseded Overrides`; do not leave conflicting rules active.
6. Say in one line what was recorded and where. Continue the conversation as normal.
