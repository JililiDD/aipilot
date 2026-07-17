---
description: Start, continue, or resume the AIpilot development workflow — spec, design, plan, build, review, release.
---

Invoke the `aipilot-jl-workflow-orchestrator` skill and follow it exactly.

**Resolve the documents root first**: read the project-root `AGENTS.md` for a `Documents root:` line under an `## AIpilot` heading. Present → use that path. Absent → this may be a fresh project; run cold start.

**Cold start** (no documents root configured and no `docs/aipilot/` present):

1. Ask one low-risk question: "Where should project documents live? **A. `docs/aipilot/` inside this repo (recommended — version-controlled, travels with the code)** B. A custom location."
2. If custom: the user provides a directory. Ask: "Create a project-named subfolder under it?" (e.g. given `/programs/projectDocumentations/` and project `projectDemo` → `/programs/projectDocumentations/projectDemo/docs/aipilot/`). Warn once, plainly: an out-of-repo root loses version control — no branch correlation, no clone portability, no git-tracked merge-back history — then respect the choice.
3. Write the resolved path into the project-root `AGENTS.md` under an `## AIpilot` heading as `Documents root: <path>` — AGENTS.md is the canonical pointer home in every runtime (create it with just this section if missing; never overwrite existing content). Courtesy: if a `CLAUDE.md` exists and does not reference `AGENTS.md`, suggest adding an `@AGENTS.md` import line so plain Claude Code sessions also see it — optional, not required for the plugin to work.
4. Create the skeleton at the resolved root: `work-items/`, `work-items/merged/`, `design-assets/`, and empty `decisions.md` and `lessons.md`. Initialize `agent-guideline.md` with `# Agent Guidelines`, `## Active Workflow Overrides`, and `## Superseded Overrides` headings.
5. Install the constitution: copy `document-system-spec.md` from the `aipilot-jl-workflow-orchestrator` skill's `references/` into the resolved root.
6. Route to `aipilot-jl-product-spec-builder` to begin.

**Warm start** (root resolves and exists): run the orchestrator's normal startup — self-healing scan first (interrupted merge-backs), then read current document state and recommend the next stage.

The user's words after `/aipilot` (if any) describe the task to kick off — treat them as the initial requirement statement and pass them into the recommended stage.

Follow all orchestrator gates: one stage per confirmation, no multi-stage automation without explicit per-stage continues.

$ARGUMENTS
