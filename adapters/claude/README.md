# Claude Code Adapter

Claude Code uses `.claude-plugin/plugin.json` as the plugin manifest and
`hooks/hooks.json` for SessionStart and UserPromptSubmit context injection.

The `/aipilot` command lives in `commands/aipilot.md` and routes into the
shared `workflow-orchestrator` skill.

This adapter is fully supported.
