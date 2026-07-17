# AIPilot

A document-driven development workflow skill and command bundle: product spec ->
design spec -> phase/breakdown planning -> implementation (build/diagnosis
modes) -> review -> release, with lightweight persistent project memory.

AIPilot is organized as a shared workflow core plus thin host adapters. The
skills and command are kept in one place, while each host adapter documents the
host-specific way to load them. The user-facing name is AIPilot; the
`aipilot-jl-` prefix identifies the internal skill directories.

## Structure

```
aipilot/
├── adapters/                       Host-specific installation notes
├── commands/aipilot.md             The /aipilot slash command (cold start + routing)
├── hooks/
│   └── plugin-root.js              Host-neutral plugin root helper
└── skills/
    ├── aipilot-jl-product-spec-builder/       Requirement interviews, work-item creation
    ├── aipilot-jl-design-spec-builder/        Visual/interaction direction
    ├── aipilot-jl-dev-plan-builder/           Roadmap Mode, Breakdown Mode, Goal Wrap
    ├── aipilot-jl-dev-builder/                Build Mode + Diagnosis Mode, review loop
    ├── aipilot-jl-code-reviewer/              Clean-context reviewer (story/task/final)
    ├── aipilot-jl-release-builder/            Release readiness, privacy/permission audit
    ├── aipilot-jl-note-keeper/                Capture reflex for decisions, lessons, workflow preferences
    ├── aipilot-jl-workflow-orchestrator/      Startup, routing, merge-back, sub-agent policy
                                    (carries the master document-system-spec.md
                                     and review runtime under references/)
                                    (includes scripts/render-review.js for
                                     deterministic document-review HTML)
    └── aipilot-jl-java-backend-expert/        On-demand Java/Spring companion skill
```

## Host support

| Host | Skills | Entry point | Status |
| --- | --- | --- | --- |
| Claude Code | Yes | `/aipilot` or skill routing | Supported |
| Codex | Yes | Host skill routing | Supported for skills-first usage |
| Antigravity | Not packaged | Not packaged | Waiting for confirmed packaging format |

## Host setup

Load the shared `skills/` directory through the host's normal skill/plugin
installation mechanism. Host-specific notes are in:

- `adapters/claude/README.md`
- `adapters/codex/README.md`
- `adapters/antigravity/README.md`

In Claude Code, `/aipilot` starts, continues, or resumes the workflow. In
Codex, invoke an installed AIPilot skill or ask Codex to use AIPilot to inspect
the project and recommend the next stage.

## Workflow lifecycle

Start each new conversation with `/aipilot`. Given a task, it starts a new
task workflow; otherwise it resumes the project's workflow. The command
invokes the workflow orchestrator, which:

1. Resolves the project's documents root, defaulting to `docs/aipilot/` when no
   custom root is configured.
2. On a new project, asks where documents should live, creates the document
   skeleton, and installs the workflow constitution.
3. On an existing project, checks for interrupted merge-back work, completes
   any unfinished bookkeeping, reads the current project state, and recommends
   the next stage.

The normal stage order is:

`Requirement → Design → Plan → Build/Diagnosis → Review → Merge-back`

Design is skipped for changes without a UI surface. Release is available when
the project needs packaging, handoff, or release readiness.

By default, the workflow pauses for confirmation between stages. A
single-work-item or multi-phase Goal Wrap can be used when the user explicitly
wants an autonomous run. Implementation and review remain an iterative loop:
verification and review findings are fixed and checked again before merge-back.

## Persistent workflow memory

The workflow stores project state as documents rather than relying on chat
history:

- `AGENTS.md` records the project's documents-root location.
- `product-spec.md`, `design-spec.md`, and `dev-phase-plan.md` hold the current
  product, design, and phase-plan state.
- Active work-items live in `work-items/`; completed work-items move to
  `work-items/merged/` after merge-back.
- `decisions.md` records choices that bind future work.
- `lessons.md` records discovered constraints and project pitfalls.
- `agent-guideline.md` records lasting project-specific workflow preferences.

The orchestrator reads `agent-guideline.md`, `decisions.md`, and `lessons.md` at
startup so later sessions continue with the same project context.

## Project workflow preferences

`aipilot-jl-note-keeper` keeps durable project memory lightweight. Product
requirements belong in the product spec and work-items; project constraints
belong in `lessons.md`; binding choices belong in `decisions.md`; lasting
project-specific instructions for how AIPilot should work belong in
`agent-guideline.md`.

Explicit durable wording such as "from now on", "always", "for this project",
or "make this a rule" authorizes the Note Keeper to write the normalized rule.
When persistence is ambiguous, it previews the exact rule and asks whether to
save it or use it only for the current task. Ordinary corrections are not
silently promoted into permanent rules. Plugin-wide behavior changes are made
directly in the plugin source only when the user explicitly requests them.

## Browser document review

AIPilot can offer browser-based review for HTML design previews and rendered
markdown deliverables. The markdown remains the source of truth; review HTML is
generated as a disposable projection in the session scratchpad. The shared
procedure and fallback behavior are documented in
`skills/aipilot-jl-workflow-orchestrator/references/review-runtime.md`.

For markdown documents, the deterministic renderer is:

```bash
node skills/aipilot-jl-workflow-orchestrator/scripts/render-review.js \
  <input.md> <output.html> --title "Document review"
```

## License

This project is licensed under the MIT License. See [LICENSE](LICENSE).
