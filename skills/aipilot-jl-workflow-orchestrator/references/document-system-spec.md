# Document System Specification

Status: APPROVED · Version 2.2 · 2026-07-17 (v1.0 frozen 2026-07-02; v2.2 makes the constitution plugin-owned and centralizes the stage-boundary review gate)
This plugin reference is the single authority on the document system and workflow constitution. It remains at `skills/aipilot-jl-workflow-orchestrator/references/document-system-spec.md`; cold start never copies it into a project's documents root. Every skill reads this canonical plugin file directly and reads `agent-guideline.md` separately for project-specific overrides. A legacy project-local `document-system-spec.md` is non-authoritative and ignored; removing it is a user-owned cleanup, never an automatic migration. Changes to this spec are plugin-source changes and require an explicit user request.

## 1. Three Layers

- **State documents** describe what the product IS right now. Few in number, updated only through defined channels.
- **Change documents (work-items)** carry one bounded change through its whole lifecycle: requirement → design → plan → execution → review → merge.
- **History index** is a thin, append-only timeline pointing at merged change documents.

Principle: state describes the present; change carries the lifecycle; history is pointers. A change never edits state documents directly while in flight — state is updated at merge-back.

## 2. Document Responsibilities

| Document | Layer | Purpose | Written by |
|---|---|---|---|
| `product-spec.md` | State | What the product does now | `aipilot-jl-product-spec-builder` (new product / core re-scoping); `aipilot-jl-workflow-orchestrator` (merge-back) |
| `design-spec.md` | State | How it looks and interacts | `aipilot-jl-design-spec-builder` (0-to-1 mode); `aipilot-jl-workflow-orchestrator` (merge-back of work-item Design sections) |
| `dev-phase-plan.md` | State | Phase map only: order, dependencies, risks, reuse inventory, testing & review strategy. No user stories, no task detail. | `aipilot-jl-dev-plan-builder` Project Plan Mode; phase pointers backfilled as phases start/merge |
| `decisions.md` | State (append-only) | Choices that bind future work-items AND are not visible in the state documents ("Redis for caching" yes; "this button is red" no — it's in the Design-Spec). Entry heading: `## YYYY-MM-DD <title>`. Superseded by choosing differently — tag the old entry `[superseded by <date entry>]`; never edit past entries. Small by design — every skill reads the whole file. | The stage that made the choice: `aipilot-jl-product-spec-builder`, `aipilot-jl-design-spec-builder`, `aipilot-jl-dev-plan-builder`, `aipilot-jl-dev-builder` |
| `lessons.md` | State (append-only) | Discovered constraints — pits stepped in — that bind future work ("vendor API rate-limits at 10/s", "library X deadlocks under Y"). Entry heading: `## YYYY-MM-DD <title>`. Superseded only when the world changes, and the superseding entry must say what changed; never edited. Small by design — every skill reads the whole file. | Whoever discovers, records: `aipilot-jl-dev-plan-builder`, `aipilot-jl-dev-builder`. Read-only skills (`aipilot-jl-code-reviewer`, `aipilot-jl-release-builder`) note findings; the builder records |
| `agent-guideline.md` | State | Active project-specific workflow conventions and overrides; never plugin-wide defaults | User; `aipilot-jl-note-keeper` when durable intent is explicit or confirmed |
| `work-items/*.md` | Change | One bounded change, full lifecycle | Four sections, four owners (§3) |
| `work-items/merged/` | Change archive | Merged work-items = the detailed history | `aipilot-jl-workflow-orchestrator` (move at merge-back) |
| `CHANGELOG.md` | History | One line per merge-back: timestamp, summary, work-item filename (directory derives from status). Plus one `RELEASE <version> — <timestamp>` marker line per confirmed release — the boundary from which the next release's scope derives | `aipilot-jl-workflow-orchestrator`; `aipilot-jl-release-builder` (marker line only) |
| `BACKLOG.md` | Pre-requirement | Deferred ideas not yet interviewed. Not requirements until promoted through `aipilot-jl-product-spec-builder`. | Any stage, with explicit user approval |
| `design-assets/` | Design evidence | Direction-exploration images (e.g. Stitch outputs) referenced by the Design Spec or a work-item Design section; losing directions are kept as anti-reference evidence. Prefer stable share links over committed binaries when the tool provides them. | `aipilot-jl-design-spec-builder` |

Abolished: `IMPLEMENTATION-LOG.md` (content moves into each work-item's Execution Record section) and `Product-Spec-CHANGELOG.md` (merged into the single `CHANGELOG.md`). `DEV-PLAN.md` is renamed `dev-phase-plan.md` and slimmed to the map.

## 3. Work-Item Convention

**One file per work-item.** Root of `docs/aipilot/work-items/` = active; `work-items/merged/` = done. Finding active work = listing one directory. **Directory location is the source of truth for status; the frontmatter `status` field is a redundant check** — a mismatch between the two signals an interrupted merge-back (see §6 self-healing). Multiple work-items may be active at once.

**Target resolution** (how any skill identifies which work-item it operates on): (1) the orchestrator named it → use it; (2) the conversation context identifies it unambiguously (just created this session, or the user named its slug) → use it; (3) otherwise list the top level of `docs/aipilot/work-items/` (excluding `merged/`) — exactly one plausible candidate → state it and confirm in one line before writing; multiple candidates → ask which one; (4) the root is empty → the requirement stage has not happened; route to `aipilot-jl-product-spec-builder`. Never write into a work-item without one of these resolutions — writing into the wrong change's file is the costliest mistake in this system.

**Filename**: `YYYY-MM-DD-HHMM-slug.md` (local time at creation, e.g. `2026-07-02-1432-cancel-running-jobs.md`). Never rename. Never use auto-incremented numbers (they require directory state and collide across git branches).

**Metadata head (YAML frontmatter)**:

```yaml
---
created: 2026-07-02 14:32
scope: New Feature        # New Product / New Feature / MVP Gap / Existing Change / Bug Fix / Refactor
status: active            # active → merged (changed when the file moves)
phase: 2                  # only on phase-derived work-items
---
```

**Four sections, one writer each.** The file is created with the empty section skeleton so later skills append into fixed headings instead of inventing their own. The skeleton:

```markdown
## Requirement        <- aipilot-jl-product-spec-builder: scope, behavior, ACs, assumptions, Impact on Product-Spec
## Design             <- aipilot-jl-design-spec-builder: deltas, Design ACs, Impact on Design-Spec (empty when no UI)
## Plan               <- aipilot-jl-dev-plan-builder: stories/groups -> tasks with verification, granularity, exit criteria
## Execution Record   <- aipilot-jl-dev-builder (Build/Diagnosis Modes): what was actually done, evidence, reviews, risks
```
 Each skill writes only its own section and reads all of them; if an upstream section is missing or not buildable, route to its owner — never fill it in.

1. **Requirement** — owner `aipilot-jl-product-spec-builder`. Scope, behavior or bug symptom, Acceptance Criteria, Assumptions, and the **Impact on Product-Spec** merge map. For phase-derived work-items the file is created by `aipilot-jl-dev-plan-builder`, but the Requirement content may only be *decomposed by reference* from the master spec's confirmed scope and criteria — never invented; every phase AC must trace to a master-spec AC.
2. **Design** — owner `aipilot-jl-design-spec-builder`. Present only when the change has a UI surface. Design decision deltas, Design Acceptance Criteria, and the **Impact on Design-Spec** merge map. In-flight design decisions live here, not in `design-spec.md`.
3. **Plan** — owner `aipilot-jl-dev-plan-builder`. User stories → tasks, execution-granularity default, reuse notes, verification per task, review focus, explicit non-goals. Acceptance criteria are referenced from sections 1–2, never invented here. When the change introduces a new page or screen, the Plan opens with **Story 0: visual direction smoke**. Before writing it, ask the user to choose the direction source: single-file static HTML prototype (recommended), generated image prototype, or user-provided prototype. Story 0 creates or records only the visual direction artifact with static/sample data — no production flow, API, persistence, or full frontend implementation. It ends in a stop for the user to confirm the visual direction **by default**; at planning time the user may waive it (`[stop: user-confirm]` vs `[stop: skip]` recorded on Story 0 — defaults favor stopping because building on a wrong direction is expensive, an extra confirmation is cheap). Its code is marked `throwaway` by default, or `base` only when the user explicitly wants later stories to build on it.
4. **Execution Record** — owner `aipilot-jl-dev-builder` (both its modes), plus `aipilot-jl-code-reviewer` results recorded by it. Task checklist progress, verification evidence, QA checklist, review outcome, remaining risks.

**Story → Task hierarchy**: Task is the smallest execution unit and always carries its own verification method. The optional middle layer groups tasks with identical structure in two flavors: User Stories for user-visible increments, Task Groups for non-user-visible work (refactors, pipelines); small task lists need neither. Naming is fixed: **Phase → User Story / Task Group → Task**. Use User Story for any user-facing capability or AC range, even when implementation is mostly backend; use Task Group only for invisible refactors/pipelines. Do not introduce "epic", "ticket", or a bare "Group n" for user stories.

## 4. Routing: Phase Map or Direct

A phase map exists only when the change contains **verification dependencies**: part A must be built and verified before part B can meaningfully start. "Big" is not the criterion; internal checkpoints are.

`aipilot-jl-dev-plan-builder` treats the verification dependency as **the one criterion**; two **detectors** (see its `planning-rules.md`) prompt the search for one but route nothing by themselves:

1. **Split-category count**: the change touches ≥2 of the split categories (data model, runtime integration, UI shell, core workflow, import/export, auth, agent execution, testing infra, packaging). Multiple categories *without* a verification dependency between them stay one work-item.
2. **Size estimate**: the Plan looks likely to exceed ~10 tasks, or could not be reviewed in one sitting without holding the whole project in context — fully measurable only mid-breakdown, so it doubles as the escalation valve's trigger.

Fast lanes: scope New Product → always map; scope Bug Fix / bounded Refactor → always direct.

**Default small on ambiguity**, because correction is cheap in both directions:
- **Escalation valve**: mid-planning (or mid-build), tasks balloon or a verification dependency appears → stop, announce, split into a phase map + first phase work-item.
- **De-escalation valve**: a drafted map has only one phase → collapse back into a single work-item.

The verdict is **stated, not asked**: planner reports "single work-item / phase map, because X"; the user may override. Phase : work-item = 1:1; phase work-items are created just-in-time by `aipilot-jl-dev-plan-builder` when the phase is next to build; `dev-phase-plan.md` backfills a pointer and status (planned / in-progress / merged) per phase.

## 5. Execution Granularity

Before implementation starts, `aipilot-jl-dev-builder` asks one low-risk question — "how far should I go before stopping to report?":

- **A. Whole work-item** — run everything, report at the end. Recommended for small bug fixes.
- **B. Per story** — stop after each user-visible increment. Recommended default for ordinary features.
- **C. Per task** — stop after every step. Recommended when touching data migrations, destructive operations, or security boundaries.

Rules: per-task verification happens at every level — granularity changes *reporting stops*, never rigor. The choice is recorded in the Plan section as the default and can be changed mid-run in either direction. Inside `aipilot-jl-dev-builder`, "continue" authorizes exactly one unit at the current granularity — mirroring the orchestrator's one-stage continue semantics. Reviews are granularity-tied machine gates, not user stops: `aipilot-jl-code-reviewer` runs automatically at every user story/task group completion (even at whole-work-item granularity), and after every task at per-task granularity; the full pre-merge-back review of the whole work-item is always mandatory on top.

## 6. Merge-back

Performed by `aipilot-jl-workflow-orchestrator` after `aipilot-jl-code-reviewer` passes for a work-item, as one uninterrupted bookkeeping step inside the implementation-review loop (no extra user confirmation):

1. Apply the **Impact on Product-Spec** map → update `product-spec.md` (state-level outcome only, no interview detail).
2. Apply the **Design section deltas / Impact on Design-Spec** → update `design-spec.md`, when a Design section exists.
3. Append one line to `CHANGELOG.md`: timestamp, one-sentence summary, and the work-item **filename only** (never a directory path — the file is about to move to `merged/`, and filenames never change).
4. Set frontmatter `status: merged` and move the file to `work-items/merged/`.
5. For phase work-items, update the phase status in `dev-phase-plan.md`.

A work-item still in the root means merge-back is unfinished. Until merge-back, the active work-item is the authoritative source for its change and the state documents intentionally lag it — that lag is by design, never a staleness defect.

**Self-healing**: at every `aipilot-jl-workflow-orchestrator` start, before any routing, scan the work-items root for items whose merge-back was interrupted — frontmatter already `status: merged`, or Execution Record shows a passed review with no CHANGELOG entry. Complete the remaining merge-back steps first, then proceed with normal routing.

## 7. Shared Conventions

- **File naming**: two tiers only. Ecosystem-convention files keep their conventional all-caps names (`CHANGELOG.md`, `BACKLOG.md`, `AGENTS.md`, `README.md`); **everything else is kebab-case** — state documents (`product-spec.md`, `design-spec.md`, `dev-phase-plan.md`, `agent-guideline.md`), directories (`work-items/`, `design-assets/`), and all agent-generated files (work-items). Lowercase-only paths eliminate an entire class of agent typos on case-sensitive filesystems.
- **Project workflow preferences**: lasting project-specific instructions live in `agent-guideline.md`. Explicit durable wording (for example, "from now on", "always", "for this project", or "make this a rule") is approval to write; ambiguous persistence intent requires showing the exact normalized rule and asking whether to persist it. Current-task corrections are not persisted. Conflicting, weakening, or replacement rules require explicit confirmation. Plugin-wide behavior changes belong in the plugin source, never a project document.
- **Reading is idempotent**: every skill lists its Required Reading as a self-containedness guarantee (direct invocation, clean-context agents, and goal runs have no orchestrator priming them) — not as a re-read command. A file already in context and unchanged since it was read counts as read; re-read only what has changed, which in practice means the work-item currently being written.
- **Document root resolution**: every `docs/aipilot/` path in this specification and in all skills means "the resolved documents root". Resolution: a `Documents root:` line under an `## AIPilot` heading in the project-root `AGENTS.md` → use that path; absent → default `docs/aipilot/` inside the project. `AGENTS.md` is the canonical pointer home in every runtime — skills read it explicitly by path, never via the runtime's auto-loaded context; do not search `CLAUDE.md` or other runtime-specific files for the pointer. The `/aipilot` cold start asks where documents should live (offering to create a project-named subfolder under a user-given directory) and writes the AGENTS.md entry. An out-of-repo root trades away version control — no branch correlation, no clone portability, no git-tracked merge-back history; warn once at cold start, then respect the choice.

- **Interview doctrine**: `skills/aipilot-jl-product-spec-builder/references/interview-doctrine.md` governs the interview discipline for `aipilot-jl-product-spec-builder` and `aipilot-jl-design-spec-builder`. Single physical file; `aipilot-jl-design-spec-builder` reads it via relative path rather than holding its own copy.
- **Ask before acting (all skills)**: whenever material uncertainty exists about what the user wants — scope, expected behavior, data, risk tolerance, direction — ask and **wait for the answers before creating documents, writing content, or changing code**. Listing open questions in a summary after the work exists is not asking; unresolved material uncertainty may only be written down as Open Questions when the user has explicitly declined to answer (exit valve) or explicitly deferred it. This applies on every path, including fast tracks and autonomous runs (a blocking question stops a Goal Wrap too).
- **Question format (all skills)**: every question must be a multiple-choice / option-picker question with a free-form escape. Use the current host/runtime's native structured-choice UI when available (Codex uses its option-picker, Claude uses its own equivalent, and other adapters use theirs), otherwise plain chat with lettered options. Provide 2–4 options, put a recommended option first and label it, and give every option a brief explanation. For high-risk decisions affecting behavior, data, contracts, scope, trust, or core taste, the recommendation is only a soft default and the explanation must expose the trade-off.
- **Timestamps** in CHANGELOG entries: `YYYY-MM-DDTHH:MM:SS` local time.

## 8. Stage Boundary Review Gate

This section is the single authority for review and confirmation ordering at stage boundaries. Skills and runtime references point here; they never restate this policy.

At a stage boundary where explicit user confirmation is required:

1. Complete the stage and report its deliverable, highest-risk decisions, and recommended next stage.
2. If the stage produced or updated a reviewable markdown deliverable — product spec, design spec or Design section, work-item, plan, or roadmap — offer the optional browser review **before** requesting next-stage confirmation. Making the offer is mandatory at this boundary; opening the browser review is optional.
3. If the user selects browser review, run the mechanism in `review-runtime.md`. Request next-stage confirmation only after the review completes. If the user explicitly skips browser review, proceed to chat confirmation; skipping review never skips confirmation.
4. A completion report that asks only to continue to the next stage before making the required offer is invalid.

The gate does not create a boundary where one has been waived. A single-work-item Goal Wrap or other explicitly authorized autonomous mode that waives a per-stage confirmation also waives this review offer at that boundary. The implementation-review loop between builder and code reviewer is not a stage-confirmation boundary. Story 0's recorded `[stop: user-confirm]` / `[stop: skip]` policy remains authoritative for its visual-direction stop.

Stage skills return completion facts to this gate. The workflow orchestrator executes it. `review-runtime.md` owns only the browser mechanism after the user selects it.
