// Host-neutral plugin root detection for AI Pilot JL adapters.

const ROOT_ENV_KEYS = [
  'AIPILOT_PLUGIN_ROOT',
  'CODEX_PLUGIN_ROOT',
  'CLAUDE_PLUGIN_ROOT',
  'ANTIGRAVITY_PLUGIN_ROOT',
  'CURSOR_PLUGIN_ROOT',
];

function resolvePluginRoot(env = process.env, fallback = process.cwd()) {
  for (const key of ROOT_ENV_KEYS) {
    const value = env[key];
    if (value && value.trim()) {
      return value;
    }
  }
  return fallback;
}

function detectHost(env = process.env) {
  if (env.CODEX_PLUGIN_ROOT || env.COPILOT_CLI) return 'codex';
  if (env.CURSOR_PLUGIN_ROOT) return 'cursor';
  if (env.CLAUDE_PLUGIN_ROOT) return 'claude';
  if (env.ANTIGRAVITY_PLUGIN_ROOT) return 'antigravity';
  return 'generic';
}

module.exports = {
  ROOT_ENV_KEYS,
  detectHost,
  resolvePluginRoot,
};
