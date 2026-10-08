# Goal Wrap

Load this file when the user has chosen goal mode or a Goal Wrap is running. `SKILL.md` says how goal mode is granted. Every task, story, and work-item is already goal-ready (see the plan template). For this reason, running a whole phase means running its work-item. A Goal Wrap stops only where `workflow-orchestrator` Gate 1 lists. Nothing else in this file adds a stop.

## Single work-item

The full pipeline runs: Requirement → Design → Plan → Build → Code review → merge-back. It needs no document: the choice is recorded for the session. The orchestrator's per-stage stops are waived.

- Its design is inferred rather than interviewed (`design-spec-builder`).
- Any Story 0 it needs is recorded `[stop: skip]` with the recommended `html` direction source.
- Its Plan records whole-work-item granularity and the commit policy collected when the user chose goal mode (orchestrator Gates).

## Multiple phases

1. Once the user accepts goal mode, ask one batch for the run-wide commit policy and Story 0 direction source. Recommend `branch` as the commit policy, since several phases of uncommitted work would otherwise pile up. In a project without a repository, leave the commit policy out of the batch (constitution §5). If no test tiers are recorded yet, ask the user to confirm the discovered ones in the same batch.
2. Every phase's Plan records whole-work-item granularity and those answers without asking again. Every Story 0 is recorded `[stop: skip]`.
3. The run reports at each phase's merge-back and continues. It has no reporting stops.
4. A phase that introduces a screen that `design-spec.md` does not cover does not stop the run. Its work-item goes to `design-spec-builder`, which under a Goal Wrap infers the Design section from the spec's existing style without interviewing. The run's final report lists every such screen as designed without user confirmation.
5. Write a short wrap with these parts:
   - the objective in one sentence;
   - the remaining phases in roadmap order. Each phase's work-item is derived just in time when the run reaches it. The exit of each phase is its merge-back;
   - the aggregate exit: the last phase's merge-back;
   - the run-wide answers. Under `branch`, these rules also apply:
     - every phase commits to one run branch, `aipilot/<objective slug>`;
     - each phase's merge-back is its own commit there, so the user does one git merge into mainline at the end (constitution §6);
   - one instruction: *Follow the `workflow-orchestrator` stages throughout. These all apply: the Stop Conditions, the code review cadence, and the merge-backs. The report at each phase's merge-back does not stop the run. These are waived: the stage and phase confirmations, their review offers, and the Story 0 stops. A new screen that the design spec does not cover follows the spec's existing style without a stop. The final report lists that screen. Ask nothing. Each unknown becomes an assumption, and the final report lists it (constitution §7).*

   The wrap points at the system and never restates it. It is a **derived delivery artifact**. It is never stored in the document system.
6. Run the wrap in this session, without stopping. When the runtime has a separate goal or long-run feature, also show the wrap to the user.

## Escalation inside a single work-item

When the `SKILL.md` Escalation valve fires during a single-work-item Goal Wrap, convert without waiting and continue as a multi-phase Goal Wrap in this session. Do not ask the step 1 batch. Reuse the answers collected at intake, and keep the chosen commit policy. Use the `html` Story 0 direction source. Note the conversion in the final report.
