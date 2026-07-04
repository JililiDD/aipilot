#!/usr/bin/env node

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const root = path.resolve(__dirname, '..');

function readJson(relativePath) {
  return JSON.parse(fs.readFileSync(path.join(root, relativePath), 'utf8'));
}

function test(name, fn) {
  try {
    fn();
    console.log(`ok - ${name}`);
  } catch (error) {
    console.error(`not ok - ${name}`);
    console.error(error.stack || error.message);
    process.exitCode = 1;
  }
}

test('codex manifest exists and points at shared skills', () => {
  const manifest = readJson('.codex-plugin/plugin.json');
  assert.strictEqual(manifest.name, 'aipilot-jl');
  assert.strictEqual(manifest.skills, './skills/');
  assert.ok(!Object.prototype.hasOwnProperty.call(manifest, 'hooks'));
  assert.strictEqual(manifest.interface.displayName, 'AI Pilot JL');
});

test('claude manifest remains unchanged as the claude adapter', () => {
  const manifest = readJson('.claude-plugin/plugin.json');
  assert.strictEqual(manifest.name, 'aipilot-jl');
  assert.strictEqual(manifest.skills, './skills/');
  assert.strictEqual(manifest.interface.displayName, 'AI Pilot JL');
});

test('local marketplace exposes the namespaced plugin', () => {
  const marketplace = readJson('.agents/plugins/marketplace.json');
  assert.strictEqual(marketplace.name, 'aipilot-jl-local');
  assert.strictEqual(marketplace.plugins[0].name, 'aipilot-jl');
  assert.strictEqual(marketplace.plugins[0].source.url, './');
});

test('every skill directory contains a SKILL.md file', () => {
  const skillsRoot = path.join(root, 'skills');
  const skillDirs = fs.readdirSync(skillsRoot, { withFileTypes: true })
    .filter(entry => entry.isDirectory())
    .map(entry => entry.name);
  assert.ok(skillDirs.every(name => name.startsWith('aipilot-jl-')));
  const missing = skillDirs
    .map(name => path.join(skillsRoot, name, 'SKILL.md'))
    .filter(skillPath => !fs.existsSync(skillPath));
  assert.deepStrictEqual(missing, []);
});

test('plugin root resolver prefers host-specific environment variables', () => {
  const { resolvePluginRoot } = require('../hooks/plugin-root');
  assert.strictEqual(
    resolvePluginRoot({
      AIPILOT_PLUGIN_ROOT: '/tmp/aipilot',
      CODEX_PLUGIN_ROOT: '/tmp/codex',
    }),
    '/tmp/aipilot',
  );
  assert.strictEqual(resolvePluginRoot({ CODEX_PLUGIN_ROOT: '/tmp/codex' }), '/tmp/codex');
  assert.strictEqual(resolvePluginRoot({ CLAUDE_PLUGIN_ROOT: '/tmp/claude' }), '/tmp/claude');
  assert.strictEqual(resolvePluginRoot({ ANTIGRAVITY_PLUGIN_ROOT: '/tmp/antigravity' }), '/tmp/antigravity');
  assert.strictEqual(resolvePluginRoot({ CURSOR_PLUGIN_ROOT: '/tmp/cursor' }), '/tmp/cursor');
});

test('hooks emit valid JSON without a host environment', () => {
  const result = spawnSync(process.execPath, ['hooks/session-start.js'], {
    cwd: root,
    env: { PATH: process.env.PATH },
    encoding: 'utf8',
  });
  assert.strictEqual(result.status, 0);
  assert.doesNotThrow(() => JSON.parse(result.stdout));
});
