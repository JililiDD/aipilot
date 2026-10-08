# Changelog

All notable changes to AIPilot are documented here. Releases follow Semantic
Versioning.

## [2.0.0] - 2026-10-07

### Upgrade notes

- Existing project documents keep working. Older `EC-n` edge cases, product non-goals numbered `NG-n`, Approach lines in Reuse Notes, and Plans without test tiers stay valid, and the review page still renders them.
- New and revised project documents are written in English, whatever the conversation language, and follow the fixed work-item structure below.
- Every change to an existing project now starts with the execution-mode question, not only a feature addition or a bug fix.
- New documents number requirement acceptance criteria `AC-n` instead of `R-n`. An existing document keeps its `R-n` IDs, also for the criteria that it adds later.

### Added

- **Approach Decisions and Approach Challenge.** A Plan opens with Approach Decisions: one table per choice, with each candidate's approach, strengths, weaknesses, and result, and a numbered list of premises. When evidence breaks a premise, or a better unlisted candidate appears, `dev-builder` raises an Approach Challenge instead of changing the Plan. A clean-context arbiter rules Keep, Switch, or Escalate in the new `dev-plan-builder` Arbitration Mode, with at most two rulings. Under a Goal Wrap, the arbiter rules only Keep or Switch, and the run continues.
- **Test tiers.** Each task runs its own Verify. Each story runs the fast tier (unit tests, lint, typecheck), or the full tier when the Plan marks it risky. The work-item closes with the full tier: the build and tests of every module the change touches. A change to a root build file builds the whole project. The tiers are discovered once from the CI configuration, confirmed, and recorded in `memory/decisions.md`. A slow fast tier is narrowed only by the toolchain's own selector.
- **Writing rules for project documents** (constitution §7). Documents follow a condensed ASD-STE100: one idea per sentence within a word limit, active voice, conditions before actions, one term per meaning, short noun clusters, vertical lists, and conclusion-first paragraphs. A word limit is met by splitting a sentence, never by dropping words, conditions, numbers, or hedges, and a rewrite adds no fact. Acceptance criteria use EARS, with one trigger and one result each.
- **Code naming rules** (constitution §7). Value names follow their role, with a head word chosen by what the value holds: booleans use an adjective or a predicate, collections a plural noun, and maps the `valuesByKey` form. Methods use a verb phrase, and boolean queries read as assertions. The rules choose words only; case and prefix stay with the language and the project. Names that a contract or a framework fixes stay as they are, and only `memory/agent-guideline.md` overrides the rules.
- **Workflow terms** (constitution §9). Each workflow word has one meaning, such as stop, ask, confirm, assumption, route and handoff, goal mode and Goal Wrap, stage, phase, unit, code review and browser review, the four report kinds, merge-back, and git merge. A test keeps retired synonyms, such as "halt" and a bare "merge", out of the skills.
- **UI request check.** A request about screens, components, or interactions is checked against the conventions of the project's platform and component library. A vague request becomes concrete options. A request that breaks a convention is challenged with its cost, and is followed only if the user still chooses it, as a recorded deliberate deviation. Going below WCAG 2.2 AA needs the user's explicit acceptance of the risk.
- **Mermaid diagrams.** Every diagram in a project document is a Mermaid flowchart in a safe subset: top-down, with Before above After and labels in double quotes. The new `check-mermaid.js` reports each line outside the subset, and any text diagram in the Quick Overview. The review page draws the diagrams with the bundled `mermaid@11.17.2`, inlined only into pages that have one. A diagram that Mermaid cannot parse opens its source instead.
- **Bug triage.** A reported bug with no work-item is triaged read-only: it is reproduced cheaply on a copy or test data, and the code, logs, and data are checked. It is then registered as a bug work-item with the observed facts, and only then diagnosed.

### Changed

- **Execution modes.** Gate 1 asks for the execution mode for any change to an existing project, including a refactor, and also when a stage is reached without the orchestrator. Mode (a), stop after each stage, is the recommendation. The answer lasts for the session and is named in every handoff; a session without one stops after each stage. Mode (b) asks its granularity, commit policy, and test tiers when it is chosen, so its one stop after the Plan asks only for the review offer and the confirmation. A granularity chosen while planning is not asked again before building.
- **Goal mode.** A Goal Wrap starts only on an explicit choice of goal mode; open-ended wording only triggers the offer. Once it starts, it asks nothing. Each unknown takes its recommended option and is recorded as an assumption, the design is inferred from the existing style, a skipped Story 0 is self-checked, and a bug found in passing is noted. It uses whole-work-item granularity with no reporting stops, and stops only for the blockers that Gate 1 lists. A route upstream that changes only what the run inferred continues. Its final report lists the assumptions, the unconfirmed designs, the overridden UI requests, the approach choices and challenges, and the bugs found in passing. A multi-phase wrap asks its commit policy (`branch` recommended) and Story 0 direction source once, derives each phase just in time, and runs in the current session when the runtime has no separate goal feature. A single-work-item wrap that outgrows one work-item continues as a multi-phase run. The rules moved to `dev-plan-builder/references/goal-wrap.md`.
- **Work-item structure.** Work-items have one fixed structure, with no empty or duplicate subsections. The Requirement always has Existing Context, Scope, Proposed Behavior, and Acceptance Criteria, in that order. Assumptions, Open Questions, Deferred Choices, and the Impact on Product-Spec map appear only when they have content. Scope holds plain In scope and Out of scope lists; the Out of scope items are the product non-goals, and `NG-n` now numbers only the Plan's implementation non-goals. Edge cases are "If … then" acceptance criteria. The Requirement has no Summary, Functional Requirements, or Implementation Notes. A change without a UI surface has no Design section. The Execution Record uses fixed entries, ending with a Completion entry.
- **Criterion IDs.** Requirement acceptance criteria are numbered `AC-n`, to match their Acceptance Criteria heading. Design acceptance criteria keep `D-n`. Older documents keep `R-n`, and the review page renders both, with `AC-n` in the requirement color.
- **Plan template.** Approach Decisions come first. Each story names its `Tests:` tier. Stop Conditions are a list, and a premise is never a Stop Condition. A task keeps its `— Verify:` on the same line. Non-Goals hold only implementation exclusions. A risk known at planning time becomes a task or a Verify that cites the criterion it protects. A Plan with no story layer lets its Exit Criteria replace `Done when:`. User Stories and Task Groups share one number sequence.
- **Questions.** Every question is multiple choice with a free-form escape, including every entry of the design question bank. A factual question lists the likely answers without a recommendation, and is asked only when code, documents, or logs cannot answer it. Every question a stage needs is asked before its deliverable is written; asking afterwards to confirm the agent's own decision does not count.
- **Stage-boundary review offer.** The offer comes after the stage's questions are answered and its report is shown. It recommends a browser review for a long deliverable or one that holds decisions the user has not seen. It may share one question with the confirmation, whose skip option reads "Skip review and continue to <next stage>". Declining a separate review offer is never a confirmation.
- **Routing.** "Route to X" means a handoff in the same run, which stops before changing a user-confirmed Requirement, Design, or Plan. After an upstream route, `dev-plan-builder` updates the Plan before building resumes. A bug found while another work-item is in progress is reported and asked about instead of interrupting that work.
- **Approach choices.** `dev-builder` explores every candidate that takes a different direction, up to 10. It drops any that is incorrect, out of scope, touches unrelated code, or weakens existing tests, and ranks the rest: reuse, smallest blast radius, consistency, simplicity, testability, reversibility, then runtime qualities. It checks deciding claims with probes and chooses itself, asking only for user-owned trade-offs such as a new dependency or a hard-to-reverse change. `code-reviewer` flags unrelated changes and weakened tests.
- **Diagnosis Mode.** The switch and the failed attempts are recorded first, and those attempts are reverted before reproducing. Probes leave project files untouched, the root cause is written before the fix, and a dead end stops for the user. The original failing check serves as the regression guard when it pins the defect.
- **Build–review loop.** After the findings of a round are fixed, the story's test tier runs again before the next code review. A disputed finding and a fix that keeps failing have separate two-round stops. Under `manual`, `dev-builder` and `code-reviewer` share one review anchor: the starting ref plus the files changed since the previous review.
- **Commits.** `branch` commits to `aipilot/<work-item slug>`, created from the current branch before the first commit and recorded in the Execution Record. A multi-phase Goal Wrap commits every phase to one `aipilot/<objective slug>` branch, so the user does one git merge. A project without a repository is not asked for a commit policy; its Plan records `manual`.
- **Phase escalation.** When a breakdown escalates to phases, the current work-item becomes phase 1 under its own filename. The later phases' items move to a "Deferred to later phases" list, which their work-items decompose from.
- **Spec and plan boundary.** The spec states the constraints that a mechanism must meet, and the plan chooses the mechanism. The interview doctrine gains a Product vs Plan Boundary and a Control provenance probe, and the Requirement's Deferred Choices hand `[plan]` and `[design]` choices to their stages.
- **Orchestrator and skills.** `workflow-orchestrator` is rewritten around Start, Route, five Gates, and Report. The cold start moved to `references/cold-start.md` and also runs on a natural-language start. Rules that several skills need live once in the constitution, and the skills point to it. All skill text is rewritten in condensed ASD-STE100, and a test fails on any sentence over 25 words.
- **Other workflow changes.** Story 0 reuses a mock that the Design section already chose. Whenever Story 0's stop is skipped, the builder self-checks the prototype against the Design section and the design spec. The Maintainability Scan also covers integration and trust boundaries. A lasting project preference stated in any stage reaches `note-keeper`, which finds the documents root on its own. The orchestrator reads `BACKLOG.md` at startup when deferred items may shape the next step. The version stamp is two fixed sentences.
- **Review page.** The page has a new design, and `render-review.js` keeps its command, `--title`, and `data-source-md`, so the ezreview flow is unchanged. Acceptance criteria form an EARS table, stories and approach decisions form cards, and references link to their definitions. Each ID and its concept anchor form one chip colored by type. Sections fold from their headings and open when ezreview scrolls to an annotation inside them. The page follows the ezreview theme setting, has no top bar, and loads no remote fonts. Raw HTML in the markdown is shown as text.

### Fixed

- A phase work-item with a UI surface always has a Design section. When `design-spec.md` already covers its screens, `dev-plan-builder` writes a reference-only Design section that names the `D-n` that apply, so the Plan cites them and the final code review checks them. Other phases go to `design-spec-builder` before breakdown. Before, the files disagreed on whether such a phase had no Design section or an empty one, and the design-spec criteria never reached the Plan. The constitution now also names `dev-plan-builder` as the writer of a phase-derived Requirement.
- Under the `branch` and `auto` commit policies, merge-back ends with one commit on the work-item's branch. It holds the Completion entry, the document updates, and the moved work-item, so one git merge carries the code and the documents together. Before, a single work-item left them uncommitted.
- An interrupted merge-back is detected only by a passed final code review, so a passed story review no longer triggers an early merge-back.
- Mode (b) no longer stops twice, and a refactor no longer loops between the orchestrator and `product-spec-builder`.
- Review renderer: list items keep their leading numbers, and nested lists stay well-formed. Plain bold words such as `**e2e**` and code blocks no longer become ID badges. Scope, Exit Criteria, and Stop Conditions boxes keep all of their items. An item with a nested list, or a `— Verify:` in a table cell or before a heading, keeps well-formed markup. A heading inside a quote or list no longer splits the page, and a UTF-8 BOM no longer hides the front matter. Long tables render about 20 times faster.
- Review renderer security: links and images that are not `http`, `https`, `mailto`, or relative show as plain text, so a `javascript:` link cannot act in the review page. Placeholder text quoted in a document no longer moves the Mermaid library into the page text.
- The review runtime defines `<this-skill>` as the `workflow-orchestrator` directory, whichever skill calls it.
- Git keeps the vendored files byte for byte and every other file in LF (`.gitattributes`), so the vendored-file checks pass in every clone, including Windows with `core.autocrlf=true`. The CI whitespace check skips the vendored files. Review cleanup deletes the scratchpad HTML with a Node one-liner that works in every shell.
- Release tooling: release-check accepts a real 2.0.0 version, and packaging checks the version it archives and leaves development files out of the archive.

### Removed

- ASCII architecture and platform status boards and mini-screen flow tracks from the review renderer; a text diagram now shows as its original code block.
- The converter that turned Mermaid flowcharts into a column map without arrows; the page now draws real Mermaid.
- The hidden source banner and the generated "Section 0" heading from review pages.

## [1.2.0] - 2026-08-23

### Added

- Canonical `Quick Overview` executive section for Work-Item documents, including concise summaries, before-and-after visual flows, comparison matrices, and milestone bullets.
- Enhanced deterministic review projection renderer featuring interactive mini-screen flow tracks, architecture and platform status boards, scope grids, and structured task badges.
- Interactive section collapse/expand controls with arrow-only toggles and global expand/minimize buttons in the review sidebar.
- Smart auto-expansion ensuring collapsed sections automatically open and navigate when focusing elements or clicking annotations from comment threads.

## [1.1.2] - 2026-07-27

### Changed

- Updated the vendored `ezreview` standalone runtime from `0.2.2` to `1.0.0`.

## [1.1.1] - 2026-07-23

### Changed

- Updated the vendored `ezreview` standalone runtime from `0.2.1` to `0.2.2`.
- Removed host-specific adapter documentation from the distributable plugin.

### Packaging

- Release preparation documents are kept locally and excluded from the Git
  package.

## [1.1.0] - 2026-07-21

### Added

- Task-scoped implementation self-review before verification.
- An implementation-only approach decision discipline for materially different
  implementation options, including Goal Wrap behavior and durable rationale.

### Changed

- Requirement and design acceptance criteria now use stable `R-n` and `D-n`
  identifiers that remain unchanged after downstream references exist.
- Plugin positioning now describes the workflow as document-driven and
  stage-gated, and obsolete workflow ownership references were removed.

## [1.0.0] - 2026-07-19

### Added

- First public release of the document-driven product development workflow.
- Product, design, planning, implementation, review, release, project-memory,
  workflow-orchestration, and Java backend skills.
- Claude Code, Codex, and Grok Build installation support.
- Deterministic browser-review rendering with vendored offline dependencies.

[2.0.0]: https://github.com/JililiDD/aipilot/compare/v1.2.0...v2.0.0
[1.2.0]: https://github.com/JililiDD/aipilot/compare/v1.1.2...v1.2.0
[1.1.2]: https://github.com/JililiDD/aipilot/compare/v1.1.1...v1.1.2
[1.1.1]: https://github.com/JililiDD/aipilot/compare/v1.1.0...v1.1.1
[1.1.0]: https://github.com/JililiDD/aipilot/compare/v1.0.0...v1.1.0
[1.0.0]: https://github.com/JililiDD/aipilot/releases/tag/v1.0.0
