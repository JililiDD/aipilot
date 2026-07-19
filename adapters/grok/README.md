# Grok Build Adapter

Grok Build reads Claude Code plugins and marketplaces directly. AIPilot uses
the shared `.claude-plugin/plugin.json`, `.claude-plugin/marketplace.json`,
`commands/`, and `skills/` files; there is no duplicate Grok manifest to keep
in sync.

Add the repository marketplace and install AIPilot:

```bash
grok plugin marketplace add JililiDD/aipilot
grok plugin install aipilot@aipilot
```

For a local checkout, pass the absolute repository path instead of
`JililiDD/aipilot`. Confirm discovery with `grok inspect`, validate with
`grok plugin validate .`, and test the installed skills in a new session.
