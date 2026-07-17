---
name: aipilot-jl-note-keeper
description: Use when the user states, even in passing, a discovered project constraint (a pit — rate limit, flaky dependency, quirky API, deadlock) or a choice that will bind future work (architecture pick, library choice), regardless of whether another AI Pilot JL stage is currently active. Do NOT use for product facts or scope (route to aipilot-jl-product-spec-builder) or for workflow-rule defects (those are aipilot-jl-workflow-evolver's signal capture).
---

# Note Keeper

## What this is

A capture reflex, not a stage. No interview, no confirmation, no handoff. Resolve the documents root, append one dated entry, return control to whatever the conversation was already doing.

If another AI Pilot JL skill is already active and owns this recording per its own rules (`aipilot-jl-dev-builder`, `aipilot-jl-dev-plan-builder`), let it — do not double-record.

## Action

1. Resolve the documents root: read the project-root `AGENTS.md` for a `Documents root:` line under an `## AI Pilot JL` heading; absent → default `docs/aipilot/`. If that root doesn't exist either, there is nothing to append to — say so briefly and stop.
2. Classify: a discovered constraint → `lessons.md`; a choice binding future work → `decisions.md`.
3. Append one dated entry (heading `## YYYY-MM-DD <title>`) to the right file. Never edit past entries — superseding only, per constitution §2.
4. Say in one line what you recorded and where. Continue the conversation as normal.
