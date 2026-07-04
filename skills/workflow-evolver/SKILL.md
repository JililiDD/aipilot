---
name: workflow-evolver
description: Use when analyzing workflow signals, proposing improvements to AI Pilot rules and skills, or applying user-approved workflow changes — the feedback loop that turns real usage into rule revisions.
---

# Workflow Evolver

## Role

You evolve the **system itself, never the product**: the rules in `agent-guideline.md`, the plugin's skills, and the constitution. Product evolution lives in work-items; project memory (choices, pits) lives in `decisions.md` / `lessons.md`, written at the moment of discovery — neither is yours. What is yours: turning evidence of rule defects into rule changes, carefully. Rules changed on one anecdote become superstition; rules never changed become stale. Prefer fewer, sharper rules; deleting a stale rule is as much evolution as adding one.

## Required Reading

All paths mean the resolved documents root:

- `document-system-spec.md` — the constitution; follow it without restating it. `agent-guideline.md` for project overrides.
- `evolution/signals.jsonl` — the signal log (format: `references/signal-schema.md`).
- `evolution/proposals/` — existing proposals, to avoid duplicates and track status.
- `decisions.md` and `lessons.md` — always read both whole; proposals must not contradict recorded choices or pits without saying so.

## Modes

**Signal Capture Mode** — when the user corrects the agent mid-conversation or points out a recurring failure: append one line to `evolution/signals.jsonl` per `references/signal-schema.md` and continue; capture is cheap and non-blocking. Record: recurring user corrections, stage misroutes, questions that were too vague/broad/conservative, rules that caused bad behavior, missing gates that let premature completion through. **Do not record**: product facts and scope (they belong in `product-spec.md` and work-items); implementation changes (they belong in `CHANGELOG.md`); one-off preferences with no future workflow value; and **project development lessons** — discovered facts that bind future work (a flaky library, a rate limit, a fragile module) go straight into `lessons.md` as a dated entry, where every skill reads them at every start, no proposal ceremony needed. Signals here are only for what should change the workflow's *rules*.

**Proposal Mode** (default; the only mode allowed to auto-run at SessionStart):

1. Read pending signals; group them by pattern — a recurring correction, misroute, review failure, or stale rule. **One signal is an anecdote; a pattern is evidence.** Single-occurrence signals get `status: watch`, not a proposal.
2. For each pattern, write one proposal file under `evolution/proposals/` per `references/proposal-template.md` — source signals, the pattern, the exact rule change, target file, why it prevents recurrence, and the overfitting risk stated honestly.
3. Update the processed signals' `status` to `proposed` (or `watch`). **This mode writes proposal files and signal statuses — nothing else.** No rule edits, no skill edits, no document edits.

**Apply Mode** (only on the user's explicit approval of a named proposal):

- Apply the approved change to its target. Project-level targets — `agent-guideline.md`, project documents, hooks — are edited directly. **Plugin skill files are never edited from inside a project**: produce the exact edit as a patch recommendation for the user to apply to the plugin, since skills are shared across projects.
- Constitution amendments go through the same proposal path and need the same explicit approval.
- Mark the proposal applied, flip its signals to `applied`, and append a `CHANGELOG.md` line when workflow behavior changed.

**Direct-Order Path** — when the user directly instructs a rule change in conversation ("make per-task review optional"), the instruction is proposal and approval in one; do not bounce it back through the write-a-proposal-and-ask ceremony. Keep the guardrails, skip the ritual: run the change through the Promotion/Deletion standards once — if the order has a pit (duplicates a rule, conflicts with a recorded decision, would over-rigidify), say so before applying; then apply per the Apply Mode tier rules (project tier directly; plugin tier as a patch recommendation), and write a mini-proposal file afterwards for the record, marked `applied (direct order)`.

## Promotion Standard

A signal pattern becomes a proposed rule only when all hold: the failure is real; the rule is specific and actionable; it belongs in a stable file; it would have prevented the observed failure; it does not duplicate an existing rule.

## Deletion Standard

Propose deleting or weakening a rule when it causes rigidity, conflicts with a newer confirmed preference, duplicates another rule, covers a failure that no longer matters, or enforces something better handled by a hook or test. Deletion proposals go through the same template and approval as additions.

## Governance Red Lines

Never auto-apply. Never delete or weaken a rule without naming it to the user and getting confirmation. Never propose from taste — every proposal cites its signals. Revising or discarding a proposal also requires the user's word.

## Signal Capture (convention for all skills)

Any skill may append a signal line to `evolution/signals.jsonl` when it observes a user correction, misroute, review failure, missing gate, or stale rule — format per `references/signal-schema.md`. Capture is cheap and non-blocking; analysis happens here, later.

## Final Response Pattern

Report: signals read (pending/watch counts); patterns found; proposals written or updated (filenames); applications performed, if any, with their targets; next recommendation.
