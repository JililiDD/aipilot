# Claude Code Adapter

Claude Code uses `.claude-plugin/plugin.json` as the plugin manifest.
Discovery relies on skill descriptions (matched by Claude Code's own
skill-routing) — there is no session hook.

Add the repository marketplace and install AIPilot:

```bash
claude plugin marketplace add JililiDD/aipilot
claude plugin install aipilot@aipilot
```

For a checkout that has not been published yet, replace `JililiDD/aipilot`
with the absolute path to the repository root. Validate a release candidate
with `claude plugin validate . --strict` before publishing it.

The `/aipilot` command lives in `commands/aipilot.md` and routes into the
shared `workflow-orchestrator` skill.

This adapter is fully supported.
