# Codex Adapter

Codex uses `.codex-plugin/plugin.json` as the plugin manifest.

AIPilot exposes the shared `skills/` directory to Codex. The Codex manifest
does not declare hooks because AIPilot currently ships no lifecycle hook
configuration.

Add the repository marketplace and install AIPilot:

```bash
codex plugin marketplace add JililiDD/aipilot
codex plugin add aipilot@aipilot
```

For local testing, replace `JililiDD/aipilot` with the absolute path to the
repository root, restart the Codex surface after installation, and test in a
new thread.

Use AIPilot by invoking its installed skills or by asking Codex to use AIPilot
to inspect the project and recommend the next workflow stage.

This adapter is supported for skills-first usage.
