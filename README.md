# AI Pilot JL

A document-driven development workflow plugin: product spec -> design spec ->
phase/breakdown planning -> implementation (build/diagnosis modes) -> review ->
release, with a governed self-evolution loop.

AI Pilot JL is organized as a shared workflow core plus thin host adapters. The
skills and commands are kept in one place; each supported host gets only the
manifest and notes it needs for installation. Discovery relies entirely on
skill descriptions (matched by the host's own skill-routing) — there is no
session hook forcing context on every turn.

## Structure

```
aipilot/
├── .claude-plugin/plugin.json      Claude Code plugin manifest
├── .codex-plugin/plugin.json       Codex plugin manifest
├── adapters/                       Host-specific installation notes
├── commands/aipilot.md             The /aipilot slash command (cold start + routing)
├── hooks/
│   └── plugin-root.js              Host-neutral plugin root detection (used by tests; no active hook registered)
└── skills/
    ├── aipilot-jl-product-spec-builder/       Requirement interviews, work-item creation
    ├── aipilot-jl-design-spec-builder/        Visual/interaction direction
    ├── aipilot-jl-dev-plan-builder/           Roadmap Mode, Breakdown Mode, Goal Wrap
    ├── aipilot-jl-dev-builder/                Build Mode + Diagnosis Mode, review loop
    ├── aipilot-jl-code-reviewer/              Clean-context reviewer (story/task/final)
    ├── aipilot-jl-release-builder/            Release readiness, privacy/permission audit
    ├── aipilot-jl-workflow-evolver/           Signal capture, proposals, governed apply
    ├── aipilot-jl-note-keeper/                Capture reflex for stray decisions.md/lessons.md entries
    ├── aipilot-jl-workflow-orchestrator/      Startup, routing, merge-back, sub-agent policy
                                    (carries the master document-system-spec.md
                                     under references/ — the constitution)
    └── aipilot-jl-java-backend-expert/        On-demand Java/Spring companion skill
```

## Host support

| Host | Skills | Slash command | Status |
| --- | --- | --- | --- |
| Claude Code | Yes | Yes, `/aipilot` | Supported |
| Codex | Yes | Host-specific | Supported for skills-first usage |
| Antigravity | Not packaged | Not packaged | Waiting for confirmed manifest format |

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

Claude Code support remains under `.claude-plugin/plugin.json`, with the
`/aipilot` slash command in `commands/aipilot.md`.

## Install / migration checklist

Run through the Document System Specification's own §8 Migration Checklist
(`skills/aipilot-jl-workflow-orchestrator/references/document-system-spec.md`) in an
existing project. For a brand-new project, `/aipilot` handles cold start
end to end (documents-root question, skeleton, constitution install).

Key one-time items:
- Uninstall any previously installed `bug-fixer` / `goal-builder` skills —
  their functions now live in `aipilot-jl-dev-builder` (Diagnosis Mode) and
  `aipilot-jl-dev-plan-builder` (Goal Wrap).
- If migrating an existing `docs/aidevworkflow/` project, follow the full
  checklist (directory rename, constitution placement, decisions/lessons
  split, evolution path).
