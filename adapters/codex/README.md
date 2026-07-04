# Codex Adapter

Codex uses `.codex-plugin/plugin.json` as the plugin manifest.

AI Pilot JL exposes the shared `skills/` directory to Codex. The Codex manifest
intentionally does not declare hooks because the Codex plugin validator rejects
unsupported manifest fields such as `hooks`.

Use AI Pilot JL by invoking its installed skills or by asking Codex to use AI Pilot JL
to inspect the project and recommend the next workflow stage.

This adapter is supported for skills-first usage.
