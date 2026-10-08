---
name: note-keeper
description: Use when the user states a discovered project constraint, a choice that will bind future work, or a lasting project-specific preference for how AIPilot should work. Captures the memory in memory/lessons.md, memory/decisions.md, or memory/agent-guideline.md without starting a separate workflow stage.
---

# Note Keeper

## What this is

This skill is a capture reflex, not a stage. Do these steps:

- Resolve the documents root.
- Classify one durable memory.
- Record it in the right project file.
- Return control to whatever the conversation was already doing.

If another AIPilot skill is already active and owns this recording by its own rules, let that skill record it. Do not double-record. These skills can own the recording:

- `product-spec-builder`
- `design-spec-builder`
- `dev-plan-builder`
- `dev-builder`

Product facts and scope are not notes. Route them to `product-spec-builder` and the relevant state or work-item documents. Plugin-wide workflow changes are not project notes either. If the user explicitly asks to change AIPilot for every project, change the plugin's source rules. Do not change them in any other case.

## Classify

Classify the memory by these rules:

- A discovered constraint or pit that binds future work → `memory/lessons.md`.
- A technical or architectural choice that binds future work and is not already visible in a state document → `memory/decisions.md`.
- A lasting, project-specific preference for how AIPilot should plan, question, stop, review, or otherwise operate → `memory/agent-guideline.md`.

Current-task instructions are not durable memory. A correction such as "not this time" changes only the current action.

## Persistence Intent for Workflow Preferences

These are examples of explicit durable phrases:

- "from now on"
- "always"
- "for this project"
- "remember"
- "do not do this again"
- "make this a project rule"

Treat such a phrase as both the request and the confirmation to write. Normalize the instruction into one specific, actionable rule. Write the rule without asking for a second confirmation.

When a workflow preference sounds durable but the user's intent is ambiguous, show the exact normalized rule. Then ask one option-picker question with these options:

- write it as a project rule
- use it only for the current task
- revise the wording

Do not write until the user chooses the project-rule option.

Do not persist an ordinary correction. Do not infer a permanent rule from one incident. If the same correction recurs, that recurrence may justify asking the persistence question. However, it never authorizes a silent write.

## Action

1. Resolve the documents root by the rules in the constitution, `../workflow-orchestrator/references/document-system-spec.md` §7. If the documents root does not exist, there is nothing to append to. In that case, say so briefly and stop.
2. Classify the memory. For a workflow preference, resolve the persistence intent with the rules above.
3. If the target file exists under `memory/`, read it before writing. An absent file is an empty category (constitution §2). If the same active rule or note already exists, do not duplicate it. If a proposed workflow rule conflicts with an existing rule or weakens it, show the conflict. Get the user's explicit confirmation before you replace the existing rule.
4. For `memory/decisions.md` and `memory/lessons.md`, append one dated entry with the heading `## YYYY-MM-DD <title>`. When the target is absent, create `memory/` and the file with `# Decisions` or `# Lessons` followed by the first dated entry. Never rewrite history. Supersede old entries as constitution §2 describes.
5. For `memory/agent-guideline.md`, create `memory/` and the file if absent. Give the new file these headings:
   - `# Agent Guidelines`
   - `## Active Workflow Overrides`
   - `## Superseded Overrides`

   Place the first rule under the active section. Keep current rules under `## Active Workflow Overrides`. Give each rule a short heading plus the `Added`, `Scope`, `Rule`, and `Supersedes` fields. Move a replaced rule under `## Superseded Overrides`. Do not leave conflicting rules active.
6. Say in one line what you recorded and where. Then continue the conversation as normal.
