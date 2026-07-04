# AI Pilot

A document-driven development workflow plugin: product spec → design spec →
phase/breakdown planning → implementation (build/diagnosis modes) → review →
release, with a governed self-evolution loop.

## Structure

```
aipilot/
├── .claude-plugin/plugin.json      Plugin manifest (name/description/version)
├── commands/aipilot.md             The /aipilot slash command (cold start + routing)
├── hooks/                          SessionStart + UserPromptSubmit hooks (fail-safe)
│   ├── hooks.json
│   ├── session-start.js
│   ├── prompt-context.js
│   ├── workflow-config.js          Injected text — pointers only, not rule copies
│   └── workflow-runtime.js         Output adapter (Cursor/Claude/Antigravity/other)
└── skills/
    ├── product-spec-builder/       Requirement interviews, work-item creation
    ├── design-spec-builder/        Visual/interaction direction
    ├── dev-plan-builder/           Roadmap Mode, Breakdown Mode, Goal Wrap
    ├── dev-builder/                Build Mode + Diagnosis Mode, review loop
    ├── code-reviewer/              Clean-context reviewer (story/task/final)
    ├── release-builder/            Release readiness, privacy/permission audit
    ├── workflow-evolver/           Signal capture, proposals, governed apply
    ├── workflow-orchestrator/      Startup, routing, merge-back, sub-agent policy
                                    (carries the master document-system-spec.md
                                     under references/ — the constitution)
    └── java-backend-expert/        On-demand Java/Spring companion skill
```

## Install / migration checklist

Run through the Document System Specification's own §8 Migration Checklist
(`skills/workflow-orchestrator/references/document-system-spec.md`) in an
existing project. For a brand-new project, `/aipilot` handles cold start
end to end (documents-root question, skeleton, constitution install).

Key one-time items:
- Uninstall any previously installed `bug-fixer` / `goal-builder` skills —
  their functions now live in `dev-builder` (Diagnosis Mode) and
  `dev-plan-builder` (Goal Wrap).
- If migrating an existing `docs/aidevworkflow/` project, follow the full
  checklist (directory rename, constitution placement, decisions/lessons
  split, evolution path).
