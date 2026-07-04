# AI Pilot

A document-driven development workflow plugin: product spec -> design spec ->
phase/breakdown planning -> implementation (build/diagnosis modes) -> review ->
release, with a governed self-evolution loop.

AI Pilot is organized as a shared workflow core plus thin host adapters. The
skills, commands, and hook runtime are kept in one place; each supported host
gets only the manifest and notes it needs for installation.

## Structure

```
aipilot/
├── .claude-plugin/plugin.json      Claude Code plugin manifest
├── .codex-plugin/plugin.json       Codex plugin manifest
├── adapters/                       Host-specific installation notes
├── commands/aipilot.md             The /aipilot slash command (cold start + routing)
├── hooks/                          SessionStart + UserPromptSubmit hooks (fail-safe)
│   ├── hooks.json
│   ├── plugin-root.js              Host-neutral plugin root detection
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

## Host support

| Host | Skills | Slash command | Hooks/context injection | Status |
| --- | --- | --- | --- | --- |
| Claude Code | Yes | Yes, `/aipilot` | Yes | Supported |
| Codex | Yes | Host-specific | No manifest hook declaration | Supported for skills-first usage |
| Antigravity | Not packaged | Not packaged | Runtime detection only | Waiting for confirmed manifest format |

## Codex installation

Codex support is provided by `.codex-plugin/plugin.json`. The manifest points to
the shared `skills/` directory and intentionally omits `hooks`, because Codex
plugin validation rejects unsupported manifest fields.

Validate the layout locally with:

```bash
node scripts/validate-plugin-layout.js
```

If you have Codex's plugin validator available, also run it against this plugin
root.

## Claude Code installation

Claude Code support remains under `.claude-plugin/plugin.json`, with hook
configuration in `hooks/hooks.json` and the `/aipilot` slash command in
`commands/aipilot.md`.

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
