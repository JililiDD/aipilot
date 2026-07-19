#!/usr/bin/env node

const assert = require('assert');
const { execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const releaseVersion = '1.0.0';

function readJson(relativePath) {
  return JSON.parse(fs.readFileSync(path.join(root, relativePath), 'utf8'));
}

function requireFile(relativePath) {
  const absolutePath = path.join(root, relativePath);
  assert.ok(fs.existsSync(absolutePath), `${relativePath} must exist`);
  assert.ok(fs.statSync(absolutePath).size > 0, `${relativePath} must not be empty`);
}

const claudeManifest = readJson('.claude-plugin/plugin.json');
const claudeMarketplace = readJson('.claude-plugin/marketplace.json');
const codexManifest = readJson('.codex-plugin/plugin.json');
const codexMarketplace = readJson('.agents/plugins/marketplace.json');

for (const manifest of [claudeManifest, codexManifest]) {
  assert.strictEqual(manifest.name, 'aipilot');
  assert.strictEqual(manifest.version, releaseVersion);
  assert.strictEqual(manifest.author.name, 'JililiDD');
  assert.strictEqual(manifest.repository, 'https://github.com/JililiDD/aipilot');
  assert.strictEqual(manifest.license, 'MIT');
}

assert.strictEqual(claudeManifest.displayName, 'AIPilot');
assert.strictEqual(claudeManifest.commands, './commands/');
assert.ok(!Object.prototype.hasOwnProperty.call(claudeManifest, 'interface'));
assert.ok(!Object.prototype.hasOwnProperty.call(claudeManifest, 'hooks'));
assert.strictEqual(claudeMarketplace.name, 'aipilot');
assert.strictEqual(claudeMarketplace.plugins.length, 1);
assert.strictEqual(claudeMarketplace.plugins[0].name, 'aipilot');
assert.strictEqual(claudeMarketplace.plugins[0].source, './');
assert.strictEqual(claudeMarketplace.plugins[0].version, releaseVersion);
assert.strictEqual(claudeMarketplace.plugins[0].strict, true);

assert.strictEqual(codexManifest.interface.displayName, 'AIPilot');
assert.strictEqual(codexManifest.interface.developerName, 'JililiDD');
assert.strictEqual(codexManifest.interface.brandColor, '#18C9E8');
assert.strictEqual(codexMarketplace.name, 'aipilot');
assert.strictEqual(codexMarketplace.interface.displayName, 'AIPilot');
assert.strictEqual(codexMarketplace.plugins[0].name, 'aipilot');
assert.strictEqual(codexMarketplace.plugins[0].source.path, './');

for (const relativePath of [
  'README.md',
  'CHANGELOG.md',
  'LICENSE',
  'PRIVACY.md',
  'SECURITY.md',
  'TERMS.md',
  'THIRD_PARTY_NOTICES.md',
  'assets/logo.svg',
  'assets/logo-dark.svg',
  'assets/icon.png',
  'assets/logo.png',
  'assets/logo-dark.png',
  'scripts/render-logo.swift',
  'adapters/claude/README.md',
  'adapters/codex/README.md',
  'adapters/grok/README.md',
  'release/CLAUDE_SUBMISSION.md',
  'release/OPENAI_SUBMISSION.md',
  'release/RELEASE_CHECKLIST.md',
]) {
  requireFile(relativePath);
}

const trackedFiles = execFileSync('git', ['ls-files'], { cwd: root, encoding: 'utf8' })
  .trim()
  .split('\n')
  .filter(Boolean);
assert.ok(
  trackedFiles.every(file => path.basename(file) !== '.DS_Store' || !fs.existsSync(path.join(root, file))),
  'release must not contain tracked .DS_Store files',
);

const releaseText = [
  fs.readFileSync(path.join(root, 'README.md'), 'utf8'),
  fs.readFileSync(path.join(root, 'CHANGELOG.md'), 'utf8'),
  JSON.stringify(claudeManifest),
  JSON.stringify(claudeMarketplace),
  JSON.stringify(codexManifest),
].join('\n');
assert.ok(releaseText.includes(releaseVersion), 'release version must be documented');
assert.doesNotMatch(releaseText, /2\.0\.0|\+codex\./, 'stale release versions are not allowed');

console.log(`Release preflight passed for AIPilot ${releaseVersion}.`);
