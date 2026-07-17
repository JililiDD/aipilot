# Claude Code Adapter

Claude Code uses `.claude-plugin/plugin.json` as the plugin manifest.
Discovery relies on skill descriptions (matched by Claude Code's own
skill-routing) — there is no session hook.

The `/aipilot` command lives in `commands/aipilot.md` and routes into the
shared `aipilot-jl-workflow-orchestrator` skill.

This adapter is fully supported.
