---
name: workflow-orchestrator
description: Use when starting, continuing, resuming, or chaining the document-driven product workflow across product spec, design spec, development planning, goal creation, implementation, review, or release stages.
---

# Workflow Orchestrator

Move AIPilot work forward one stage at a time. Keep the document state intact and every gate in place. This way, the user never has to remember which skill comes next. The constitution (`references/document-system-spec.md`) defines the documents, merge-back, and the stage-boundary gate. Follow the constitution without restating it.

## Start

Do these steps in every session:

1. Read the constitution.
2. Resolve the documents root (§7) and report it once. If there is no pointer and no `docs/aipilot/`, run `references/cold-start.md` first.
3. At the documents root, ensure `work-items/` and `work-items/merged/` exist.
4. Finish any interrupted merge-back (§6) before routing.
5. Read the following:
   - the state documents;
   - memory;
   - the active work-items;
   - `BACKLOG.md` when deferred items may shape the next step;
   - `memory/agent-guideline.md`.
6. Apply the project overrides in `memory/agent-guideline.md` to everything below.

## Route

Route to the stage whose skill fits the gap. The workflow follows this order:

`product-spec-builder` → `design-spec-builder` → `dev-plan-builder` → `dev-builder` ⇄ `code-reviewer` → merge-back → the next unbuilt phase.

Run `design-spec-builder` only for a change with a UI surface. When you skip it, say so. `release-builder` runs only on request. Name the target work-item in every handoff to a stage that operates on one.

One main agent runs every stage and writes all code. Sub-agents are clean-context judges only. Each one returns its result to the main agent. The main agent decides what to do with it. There are two:
- `code-reviewer`, run by `dev-builder` per its Review Cadence;
- the arbiter of an Approach Challenge, run by `dev-builder` in `dev-plan-builder` Arbitration Mode.

## Gates

1. **Execution mode.** For any change to an existing project, first ask (§7) which execution mode to use:
   - (a) stop after each stage (the default and the recommendation);
   - (b) stop once, after the Plan;
   - (c) run autonomously as a single-work-item Goal Wrap.

   When the user picks (b), ask once, right away, for these settings:
   - the Plan's execution granularity;
   - the Plan's commit policy, except in a project without a repository (constitution §5);
   - the test tiers, if none are recorded.

   Recommend a granularity that fits the change. `dev-plan-builder` Breakdown Mode lists the options and their recommendations. The stop after the Plan then asks only the review offer and the confirmation.

   When the user picks (c), ask once, right away, for these settings, so planning never stops the run:
   - the Plan's commit policy, with the options that `dev-plan-builder` Breakdown Mode lists;
   - the test tiers, if none are recorded.

   A Goal Wrap uses whole-work-item granularity, so it has no reporting stops. It runs until the work-item's merge-back. A Goal Wrap asks nothing after this intake. It stops only for these blockers:
   - a Plan Stop Condition;
   - a code review that will not converge;
   - a defect that cannot be reproduced, or a Diagnosis dead end;
   - a route that would change content the user confirmed (§7 Routing).

   Record the chosen execution mode for this session. Name it in every later handoff for this change. Let it govern every later stop. The original request never waives the stops of (a) or (b). With no execution mode recorded in this session, use (a) until the user asks for more autonomy (gate 3). This case includes a resumed session, a new product, and a roadmap phase that starts with no recorded execution mode.
2. **Granularity.** Before `dev-builder`, ask the user to confirm the Plan's execution granularity for this session, and wait for the reply. Skip this when the user already chose or confirmed it this session. For example, the user may have chosen it at the (b) intake or in the planning question batch. Under a Goal Wrap, state the granularity and proceed. The handoff names the target and the granularity. The granularity is the one confirmed this session, or whole work-item under a Goal Wrap.
3. **Continue.** Continue-style words, in any language, authorize one next stage. "Keep going" is not permission for multi-stage automation. For open-ended requests in any language ("do everything", "all remaining phases"), ask whether to run them as a `dev-plan-builder` Goal Wrap. The Goal Wrap starts only after the user confirms goal mode. The rules of the Goal Wrap say which stops it waives.
4. **Build–review loop.** Inside the loop between `dev-builder` and `code-reviewer`, never stop to ask about code review findings. Fix them, reverify, and repeat the code review until it passes. A blocker still stops the run for the user. Outside a Goal Wrap, the granularity's reporting stops also apply. After the final code review passes, perform merge-back (§6) without asking. A Story 0 marked `[stop: user-confirm]` stops at every granularity. Only a planning-time `[stop: skip]` waives this stop.
5. **Stage boundaries.** Everywhere else, apply constitution §8 exactly.

Never skip any of these:
- verification;
- code review;
- document updates;
- a user confirmation that the execution mode has not waived.

## Report

Report these items briefly:
- the current stage and the stages completed in this run;
- any merge-back: the spec sections updated, the CHANGELOG line, the work-item moved, and the phase status;
- blocking questions;
- the documents updated;
- the next stage and why it is unblocked.

Then wait for confirmation, unless the session's execution mode waives this stop:
- a Goal Wrap reports and continues;
- mode (b) continues until its Plan stop.

When a Goal Wrap ends, finished or stopped, its final report also lists:
- every assumption the run recorded, highest risk first;
- every design made without user confirmation;
- every UI request a convention overrode (the request, what was built, and why);
- every approach choice that would otherwise have been asked;
- every Approach Challenge and its ruling;
- every bug found in passing.

For each bug in the final report, ask whether to start it now, add it to `BACKLOG.md`, or leave it.
