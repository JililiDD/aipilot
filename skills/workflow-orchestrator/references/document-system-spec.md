# Document System Specification

This plugin reference is the single authority on the document system and workflow constitution. It lives only in the plugin. Never copy it into a project. A legacy project-local `document-system-spec.md` is non-authoritative and ignored. The user decides whether to remove it. Changes to this spec are plugin-source changes and require an explicit user request.

## 1. Three Layers

The document system has three layers:

- State documents describe what the product is now.
- Change documents (work-items) carry one bounded change from requirement to merge-back.
- `CHANGELOG.md` is the append-only history of pointers.

While a change is in flight, it never edits the state documents. Merge-back (§6) does that.

## 2. Document Responsibilities

| Document | Layer | Purpose | Written by |
|---|---|---|---|
| `product-spec.md` | State | What the product does now | `product-spec-builder` (new product / core re-scoping); `workflow-orchestrator` (merge-back) |
| `design-spec.md` | State | How it looks and interacts | `design-spec-builder` (0-to-1 Mode); `workflow-orchestrator` (merge-back of Design sections) |
| `dev-phase-plan.md` | State | Phase map only: order, dependencies, risks, and testing and code review strategy. It holds no stories or tasks. | `dev-plan-builder` Roadmap Mode. Phase pointers are backfilled as phases start and reach `merged`. |
| `memory/decisions.md` | State (append-only) | Choices that bind future work-items and are not visible in the state documents ("Redis for caching" yes; "this button is red" no). Entry heading: `## YYYY-MM-DD <title>`. Never edit a past entry. A new choice tags the old one `[superseded by <date entry>]`. | The stage that made the choice: `product-spec-builder`, `design-spec-builder`, `dev-plan-builder`, `dev-builder` |
| `memory/lessons.md` | State (append-only) | Discovered constraints that bind future work ("vendor API rate-limits at 10/s"). Same entry heading. A new entry supersedes an old one only when the world changes. The new entry says what changed. | Whoever discovers the constraint: `dev-plan-builder`, `dev-builder`. Read-only skills (`code-reviewer`, `release-builder`) note findings for the builder to record. |
| `memory/agent-guideline.md` | State | Project-specific workflow overrides. It never holds plugin-wide defaults. | User; `note-keeper` |
| `work-items/*.md` | Change | One bounded change, full lifecycle | Five sections, one owner each (§3) |
| `work-items/merged/` | Change archive | Merged work-items. They are the detailed history. | `workflow-orchestrator` (merge-back) |
| `CHANGELOG.md` | History | One line per merge-back (timestamp, summary, work-item filename). One `RELEASE <version or channel> — <timestamp>` line per confirmed release. The next release scope derives from the latest such line. | `workflow-orchestrator`; `release-builder` (marker line only) |
| `BACKLOG.md` | Pre-requirement | Deferred ideas. They are not requirements until `product-spec-builder` promotes them. | Any stage, with the user's explicit confirmation |
| `design-assets/` | Design evidence | Direction-exploration artifacts referenced by the Design Spec or a Design section | `design-spec-builder` |

Memory files are small by design: every skill reads the whole file when it is present.

**Memory lifecycle is lazy.** A reader treats a missing directory or file as an empty memory category. Reading never creates either one. The skill recording the first entry creates `memory/` and the target file. The new file holds `# Decisions` or `# Lessons` and the first dated entry. `note-keeper` owns the structure of `agent-guideline.md`.

**Work-item directories are invariant infrastructure**: before you create or move a work-item, ensure that `work-items/` and `work-items/merged/` exist. Repair a missing directory. Never treat it as a missing project decision.

## 3. Work-Item Convention

**One file per work-item.** The top level of `docs/aipilot/work-items/` holds the active items. Several items may be active at once. `work-items/merged/` holds the done items.

**The directory is the source of truth for status**. The frontmatter `status` is a redundant check. A mismatch between the two signals an interrupted merge-back (§6).

**Target resolution** (how any skill finds the work-item it operates on):

1. If the orchestrator named the work-item, use it.
2. If the conversation identifies it unambiguously (created this session, or the user named its slug), use it.
3. Otherwise, list the active items:
   - If one item is a plausible candidate, state it and get the user's confirmation in one line before writing.
   - If several items are plausible, ask which one.
4. If no active item is plausible, the requirement stage has not happened. Route to `product-spec-builder`.

Never write into a work-item without one of these resolutions. Writing into the wrong change's file is the costliest mistake in this system.

**Filename**: `YYYY-MM-DD-HHMM-slug.md` (local time at creation, for example `2026-07-02-1432-cancel-running-jobs.md`). Never rename it. Never use auto-incremented numbers.

**Metadata head (YAML frontmatter)**:

```yaml
---
created: 2026-07-02 14:32
scope: New Feature        # New Product / New Feature / MVP Gap / Existing Change / Bug Fix / Refactor
status: active            # active → merged (changed when the file moves)
phase: 2                  # only on phase-derived work-items
---
```

**Five sections, one owner each.** Create the file with this skeleton, so that later skills write into fixed headings. If the change has no UI surface, leave out the Design heading:

```markdown
## Quick Overview     <- product-spec-builder (dev-plan-builder on phase-derived items)
## Requirement        <- product-spec-builder (dev-plan-builder on phase-derived items)
## Design             <- design-spec-builder (only with a UI surface; see Phase-derived items)
## Plan               <- dev-plan-builder
## Execution Record   <- dev-builder (Build/Diagnosis Modes)
```

Each skill writes only its own section and reads all of them. If an upstream section is missing or not buildable, route to its owner. Never fill it in yourself. A change without a UI surface has no Design section. That is not a missing section.

**Phase-derived items**: `dev-plan-builder` derives one work-item for each phase of the roadmap (§4). Its sources are `product-spec.md` for the requirement and `design-spec.md` for the design. After an escalation, its sources are the deferred lists of the first phase (`dev-plan-builder` Valves). `dev-plan-builder` writes the Quick Overview and the Requirement from these sources, and never invents content. A phase with a UI surface always has a Design section:

- If the design source covers every screen of the phase and the phase changes nothing in it, `dev-plan-builder` writes a reference-only Design section. That section names the design source and the `D-n` that apply, with their source IDs. Plans and code reviews cite these `D-n` like any other Design criterion.
- Otherwise, `design-spec-builder` writes the Design section before breakdown.

- **Quick Overview**: the section holds these parts:
  - a `> **Summary:**` of 1–2 sentences;
  - a visual flow sized to the change, drawn per §7 Diagrams:
    - Before vs After tracks for changes, as two subgraphs;
    - one proposed pipeline for new features;
    - a layered board for spikes;
    - none for one-line fixes;
  - a Before/After or capability/scope table;
  - a milestone summary, only for work with distinct stages or releases.
- **Requirement**: the context, the scope with its product non-goals, the behavior or bug symptom, and the Acceptance Criteria. Assumptions, Open Questions, Deferred Choices, and the **Impact on Product-Spec** merge map appear only when they have content. `product-spec-builder` defines the subsections.
- **Design** (only with a UI surface): design deltas, Design Acceptance Criteria, and the **Impact on Design-Spec** merge map. In-flight design decisions live here, not in `design-spec.md`.
- **Plan**: approach decisions, stories and tasks with verification, execution granularity, reuse notes, and implementation non-goals. It references acceptance criteria from Requirement and Design. It never invents them. If a change introduces a new page or screen, its Plan opens with **Story 0**. Story 0 is a visual-direction smoke. `dev-plan-builder`'s `planning-rules.md` defines its markers.
- **Execution Record**: what was actually done, with evidence, reviews, and remaining risks. `dev-builder` also records the `code-reviewer` results here. `dev-builder`'s Execution Record Format defines the entries.

Plans use one vocabulary: **Phase → User Story** (user-visible) **or Task Group** (invisible work) **→ Task**. Every task carries its own verification.

## 4. Routing: Phase Map or Direct

A phase map exists only when the change contains a **verification dependency**. A verification dependency means that part A must be built and verified before part B can meaningfully start. "Big" is not the criterion. `dev-plan-builder` makes this decision and states it (`planning-rules.md`). Each phase maps 1:1 to a work-item.

## 5. Execution Granularity

The Plan records how far `dev-builder` goes before it stops to report. The Plan records this granularity together with its `Commit policy`. The granularity is one of these:

- the whole work-item;
- per user story/task group;
- per task.

Granularity changes *reporting stops*, never rigor: `dev-builder` verifies every task at every level. Code reviews are machine gates, not user stops. `dev-builder`'s Review Cadence defines them.

In a project without a repository, `dev-builder` cannot commit. Nobody asks for the commit policy there, and the Plan records `Commit policy: manual`.

## 6. Merge-back

After `code-reviewer` passes a work-item, `workflow-orchestrator` performs merge-back. Merge-back is one uninterrupted bookkeeping step inside the build–review loop. It needs no extra user confirmation. `workflow-orchestrator` does these steps:

1. If the Requirement has an **Impact on Product-Spec** map, apply it to update `product-spec.md`. Write only the state-level outcome, with no interview detail. Without the map, leave `product-spec.md` unchanged.
2. If a Design section exists, apply the **Design section deltas / Impact on Design-Spec** to update `design-spec.md`.
3. Append one line to `CHANGELOG.md`: the timestamp, a one-sentence summary, and the work-item **filename only**. Never write a directory path, because the file is about to move.
4. Ensure that `work-items/merged/` exists. Set the frontmatter to `status: merged`, and move the file there.
5. For a phase work-item, update the phase status in `dev-phase-plan.md`.
6. If the Plan's `Commit policy` is `branch` or `auto`, commit the merge-back as one commit, on the branch of the work-item's other commits. The commit holds the Completion entry, the changes of steps 1–5, and the moved work-item. Its message names the work-item slug and "merge-back". Commit nothing under `manual`, in a project without a repository, or when the documents root is not in the project's repository.

If a work-item is still in the top level, its merge-back is unfinished. Until then, the work-item is the authoritative source for its change. The state documents lag behind it by design. This lag is never a staleness defect.

**Self-healing**: at every `workflow-orchestrator` start, before any routing, scan the top level of `work-items/` for items whose merge-back was interrupted. Either of these signs shows an interrupted merge-back:

- the frontmatter already says `status: merged`;
- the Execution Record shows a passed final code review with no CHANGELOG entry.

Complete the remaining merge-back steps of each such item first.

## 7. Shared Conventions

- **Writing (all project documents)**: write every project document in English, whatever the conversation language. Chat with the user stays in their language. Keep it short and clear, with no padding, by this condensed ASD-STE100:
  1. One idea per sentence: at most 20 words in a step, 25 in a description. Write a second idea as a new sentence, not as a dash or parenthesis clause. A template field label, such as `— Verify:` or `Done when:`, starts a new sentence.
  2. Cut padding, not meaning:
     - Keep the subject, the verb, and the articles of every sentence. Never drop words to meet a word limit.
     - If a sentence is too long, split it. Keep every condition, number, scope limit, and exception.
     - Keep the strength of every claim. "May" stays "may", and a hedge never becomes a fact.
     - When you rewrite or summarize text, add no fact that the original does not state.
  3. Use active voice. Write steps as commands, one action each.
  4. Put a condition before its action: "If <condition>, <action>."
  5. One term, one meaning: once a document names a thing, use that name every time, and never use it for anything else.
  6. At most three nouns in a row. Rewrite a longer cluster with a verb or "of".
  7. Use a vertical list for three or more items, steps, or options.
  8. One topic per paragraph, at most six sentences. Open each section with its conclusion; a metadata line, such as the version stamp, may come before it.
  9. Acceptance criteria (`AC-n`, `D-n`): one trigger and one result each, as "When <trigger>, the system shall <result>" (EARS). Use these other EARS forms where they fit:
     - "While <state>, …";
     - "If <unwanted event>, then …";
     - for a check with no trigger, "The system shall <result>".

  Depth scales with the complexity of the change. Do not repeat anything across sections. Omit untouched template sections. Code, commands, and quoted output are exempt from these rules.
- **Diagrams (all project documents)**: draw every diagram as a Mermaid flowchart, never as ASCII art. In the Quick Overview, every code block is a Mermaid block. The review page draws Mermaid. Write only this safe subset, which parses everywhere and stays readable:
  - every diagram starts with `flowchart TD`, so that long code names stack top-down;
  - subgraphs, such as Before and After tracks, stack top-down too. Each `subgraph ID["title"]` has `direction TB` as its first line and closes with `end`. Subgraphs do not nest;
  - one line after the last subgraph orders the subgraphs, for example `BEFORE ~~~ AFTER`. Without it, Mermaid may draw After first;
  - each other line holds one statement. Nodes are `ID["label"]` or `ID{"label"}`, and links are `-->` or `-->|"label"|`. Links join nodes, never subgraphs;
  - a node ID starts with a letter and holds only letters, digits, and `_`. It is never a Mermaid keyword, such as `end`;
  - every label is in double quotes. It holds no `"`, `<`, `>`, `|`, or backtick. Write `List<T>` as `List of T`.

  After you write or change a diagram, run `node <workflow-orchestrator>/scripts/check-mermaid.js <doc.md>`. `<workflow-orchestrator>` is the `workflow-orchestrator` skill directory. Fix every reported line, and run the check again until it passes.
- **IDs**: itemized lists use `- **<ID> (Concept Anchor):** ...` with sequential IDs. The ID prefixes are:
  - `AC-n`: requirement acceptance criteria. Older documents number them `R-n`, and those IDs stay valid. An older document keeps `R-n` for its new criteria too;
  - `D-n`: design acceptance criteria;
  - `A-n`: assumptions;
  - `Q-n`: open questions, followed by `[risk: blocks implementation / risks rework / cosmetic]`;
  - `NG-n`: implementation non-goals in the Plan. Older documents also number the product non-goals of the Requirement;
  - `EC-n`: edge cases, only in older documents. A new document writes each edge case as an acceptance criterion.

  Preserve existing IDs during revisions, and never renumber an item already referenced downstream. For a new item, assign the next unused number.
- **File naming**: ecosystem files keep their conventional capitals (`CHANGELOG.md`, `BACKLOG.md`, `AGENTS.md`, `README.md`). All other names are lowercase kebab-case, including state documents, directories, and work-items.
- **Reading is idempotent**: each skill's Required Reading lets the skill work without orchestrator priming (direct invocation, clean-context agents, goal runs). Required Reading is not a re-read command. If a file is already in context and unchanged, it counts as read.
- **Document root resolution**: every `docs/aipilot/` path in this specification and in all skills means the resolved documents root. Resolve the documents root in this order:
  1. a `Documents root:` line under an `## AIPilot` heading in the project-root `AGENTS.md`;
  2. else, `docs/aipilot/` in the project.

  Read `AGENTS.md` explicitly by path. Never rely on the runtime's auto-loaded context for the pointer. Never search `CLAUDE.md` or other runtime files for it. The `workflow-orchestrator` cold start writes the pointer. If a skill finds neither the pointer nor `docs/aipilot/`, it routes to that cold start instead of proceeding.
- **Ask before acting (all skills)**: when material uncertainty exists about scope, behavior, data, risk tolerance, or direction, ask first. Then **wait for the answers before creating documents, writing content, or changing code**. A later summary of open questions is not asking, and neither is asking the user, after the work exists, to confirm a decision you made. Which decisions need the user is your judgment: ask those before writing. For example, a class name rarely needs the user; one that clashes with an existing name may.

  Settle the other decisions yourself as recorded assumptions. Do not ask for confirmation of them afterwards. Unresolved items become Open Questions only when the user explicitly declines or defers them.

  This rule holds on every path, including fast tracks, except a Goal Wrap, which asks nothing once it starts. In a Goal Wrap, every unknown, whether about the requirement, design, plan, or implementation, takes its recommended option. The run infers that option from the code, documents, and existing style. Each such unknown is recorded as an assumption (`A-n`), and is listed in the run's final report.
- **Routing (all skills)**: "route to X" hands the work to X in the same run. X may have to change a Requirement, Design, or Plan that the user confirmed. Before it does, report why and wait for the user's confirmation, whatever the route's wording and under a Goal Wrap too. Content that a Goal Wrap inferred is not user-confirmed: a route that changes only such content continues, even where it says "and stop". X then settles the gap per Ask before acting. One exception applies: under a Goal Wrap, an Approach Challenge ruling may change an approach choice in a user-confirmed Plan without a stop.
- **UI requests (all skills)**: the user is often not a UI or UX designer. Check each request about screens, components, or interactions against established conventions. These are the conventions of the project's platform and component library. Turn a vague request into concrete options that fit those conventions. When a request breaks a convention, do these steps:
  1. Name the convention and what it costs end users.
  2. Recommend the conventional option first.
  3. Follow the request only if the user still chooses it.
  4. If you follow it, record it as a deliberate deviation with its reason.

  A request below WCAG 2.2 AA needs the user's explicit acceptance of the risk. Under a Goal Wrap, follow the convention and list each overridden request in the final report.
- **Code naming (all skills)**: these rules cover value names and method names in code. They decide the words in a name. The language and the project decide the form of a name, such as its case and its prefix. Apply these rules to every name that you add or rename, whatever the surrounding code does. Do not rename an existing name only to follow them. Only a naming convention in `memory/agent-guideline.md` overrides them.

  If an external contract or a framework fixes a name, keep that name. Examples are a JSON field, a database column, and a query method that Spring Data derives.

  A **value name** is the name of a variable, field, parameter, or constant. Name each value by its role, not by its type. The **head word** is the word that the other words modify. Choose the head word by what the value holds:
  - a boolean: an adjective or a predicate, such as `enabled`, `isActive`, or `hasStops`;
  - one object, string, or number: a singular noun, such as `exchange` or `closePrice`;
  - a collection: a plural noun for its elements, such as `enabledExchanges`;
  - a map: a plural noun for its values, then `By` and the key, such as `eventsByInstrumentId`. Do not use the `keyToValue` form.

  Also apply these rules to value names:
  - An adjective can modify the head noun. It never stands alone as the name of a non-boolean value.
  - Do not put the container type in a value name. Write `exchanges`, not `exchangeList`.
  - Write a boolean name in the affirmative form. Write `enabled`, not `notDisabled`.

  For example, `List<ExchangeConfiguration> enabled` breaks these rules, because an adjective names a list. Write `enabledExchanges` instead.

  Name each method with a verb or a verb phrase, such as `sendMessage` or `findEnabledExchanges`. If a method returns a boolean and changes no state, name it as an assertion, such as `isEmpty` or `containsKey`.
- **Project preferences (all skills)**: when the user states a lasting project-specific preference for how AIPilot works, invoke `note-keeper`, a capture reflex rather than a stage. Then continue the current work.
- **Question format (all skills)**: every question is multiple choice with a free-form escape. Use the runtime's native option picker when it has one. Otherwise, use lettered options in chat. Offer 2–4 options, each with a brief explanation. Put the recommended option first and label it.

  A factual question is about what is true, not about what to choose. A factual question lists the likely answers without a recommendation. It is asked only when the code, documents, or logs cannot answer it. For high-risk decisions (behavior, data, contracts, scope, trust, core taste), the recommendation is only a soft default. The explanation exposes the trade-off.
- **Timestamps** in CHANGELOG entries: `YYYY-MM-DDTHH:MM:SS` local time.

## 8. Stage Boundary Review Gate

This section is the single authority for the order of browser review and confirmation at stage boundaries. Skills and runtime references point here and never restate it. The roles are:

- stage skills report completion facts;
- the workflow orchestrator runs the gate;
- `review-runtime.md` owns only the browser mechanism, once the user selects it.

At a stage boundary that requires explicit user confirmation:

1. Finish the stage first: every question it needs is asked and answered, and the deliverable is written. If the user still has to make a decision, ask for it now (§7); it is never folded into the review offer. Then update the deliverable with the answer before any step below. Then report these items, as chat text before any question:
   - the stage's deliverable;
   - its highest-risk decisions;
   - the recommended next stage.
2. If the stage produced or updated a reviewable markdown deliverable, offer the optional browser review **before** requesting next-stage confirmation. A reviewable markdown deliverable is a product spec, design spec or Design section, work-item, plan, or roadmap. Making the offer is mandatory. Opening the browser review is optional.

   Recommend the browser review when the deliverable is long or holds decisions the user has not yet seen in chat. Otherwise, recommend skipping it. The offer and the confirmation may share one question. Its options must then include browser review and "Skip review and continue to <next stage>"; choosing that option confirms.
3. If the user selects browser review, run the mechanism in `review-runtime.md`. Request next-stage confirmation only after the browser review completes. If the user declines a separate review offer, ask for confirmation in chat; declining a browser review is never itself a confirmation.
4. A stage report that asks only to continue to the next stage before making the required offer is invalid.

The gate never creates a boundary that has been waived. When the session's execution mode waives a stage confirmation, it also waives the review offer there. These execution modes waive a stage confirmation:

- a Goal Wrap, single work-item or multi-phase;
- mode (b), before its Plan stop.

The build–review loop is not a stage-confirmation boundary. For Story 0's stop, its recorded `[stop: user-confirm]` / `[stop: skip]` policy stays authoritative.

## 9. Terms

Every skill uses these words with one meaning only.

- **stop**: end the turn and wait for the user's reply before doing more work. "Halt" and "pause" are not used for it.
- **ask**: put a question to the user in the §7 format, then stop until it is answered.
- **confirm**: give the user's explicit go-ahead at a stop. **User-confirmed** content is content the user answered or confirmed, never content a Goal Wrap inferred. **Approve** names only the review runtime's Approve action, which alone confirms nothing (§8).
- **assumption**: a decision made without the user's answer, recorded as `A-n`.
- **route to X**: hand the work to X in the same run (§7 Routing). A **handoff** is the message that carries it: the target, the execution mode, and the granularity.
- **the user**: the person who works with AIPilot. People who use the product being built are **end users**. "Target user", "new user", and "power users" also mean end users.
- **execution mode**: the Gate 1 choice, (a), (b), or (c), always written in full. A skill's own modes carry a capital: Build Mode, Diagnosis Mode, Roadmap Mode, Breakdown Mode, Arbitration Mode, 0-to-1 Mode, and Iteration Mode.
- **Approach Challenge**: `dev-builder`'s evidence-based proposal to change an approach choice that the Plan records. A clean-context **arbiter** rules on it in `dev-plan-builder` Arbitration Mode.
- **goal mode** is the user's choice; the **Goal Wrap** is the autonomous run that the choice starts.
- **blocker**: a situation that stops the run because only the user can resolve it. Examples are a fired Plan Stop Condition, a code review that will not converge, and a Diagnosis dead end. Under a Goal Wrap, only the Gate 1 list is a blocker. A **blocking question** is one that the work cannot continue without; Open Questions tag it `blocks implementation`.
- **scope**: what a change covers, as in "out of scope". The kind of change, the frontmatter `scope:` value, is its **scope type**. A **review scope** is the unit that one code review covers. A **release scope** is the set of work-items that one release ships.
- **fresh**: produced in this run, after the latest change that it covers. **evidence**: what proves a claim. Verification evidence is the command and its decisive output, quoted. `dev-builder` produces it, and `code-reviewer` checks it without rerunning it.
- **stage**: one step of the workflow, owned by one skill. **phase**: one entry of `dev-phase-plan.md`, built as one work-item. **unit**: what a granularity stop closes: a task, a story or task group, or the whole work-item.
- **code review**: `code-reviewer` checks the code. **browser review**: the user annotates a rendered document or prototype in the review runtime; a **review offer** is the §8 offer of one. **self-review**: the builder checks its own diff. A bare "review" appears only where a file means one kind throughout: code review in `dev-builder` and `code-reviewer`, browser review in `review-runtime.md`.
- **stage report**: what a stage reports at its end (§8). **stop report**: `dev-builder`'s report at a unit's stop. **completion report**: `dev-builder`'s report when a work-item's build is done. **final report**: the report that ends a Goal Wrap.
- **merge-back**: the §6 bookkeeping that folds a finished work-item into the state documents. **merged**: the status of a work-item or phase after its merge-back. Merging a branch is always written as **git merge**.
