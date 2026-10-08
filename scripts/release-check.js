#!/usr/bin/env node

const assert = require('assert');
const { execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const { validate, pluginVersion } = require('./validate-plugin-layout');

const root = path.resolve(__dirname, '..');

function readJson(relativePath) {
  return JSON.parse(fs.readFileSync(path.join(root, relativePath), 'utf8'));
}

function requireFile(relativePath) {
  const absolutePath = path.join(root, relativePath);
  assert.ok(fs.existsSync(absolutePath), `${relativePath} must exist`);
  assert.ok(fs.statSync(absolutePath).size > 0, `${relativePath} must not be empty`);
}

// Layout, manifests, and version agreement belong to the validator; this script adds release-only checks.
validate();
const releaseVersion = pluginVersion();
const requestedVersion = process.argv[2];
if (requestedVersion) {
  assert.strictEqual(
    requestedVersion,
    releaseVersion,
    `requested release ${requestedVersion} does not match the manifest version ${releaseVersion}`,
  );
}

const claudeManifest = readJson('.claude-plugin/plugin.json');
const claudeMarketplace = readJson('.claude-plugin/marketplace.json');
const codexManifest = readJson('.codex-plugin/plugin.json');

for (const manifest of [claudeManifest, codexManifest]) {
  assert.strictEqual(manifest.license, 'MIT');
}
assert.strictEqual(codexManifest.interface.developerName, 'JililiDD');
assert.strictEqual(codexManifest.interface.brandColor, '#18C9E8');

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
]) {
  requireFile(relativePath);
}

// git archive packages what is tracked, whether or not the file still exists locally.
const trackedFiles = execFileSync('git', ['ls-files'], { cwd: root, encoding: 'utf8' })
  .trim()
  .split('\n')
  .filter(Boolean);
assert.ok(
  trackedFiles.every(file => path.basename(file) !== '.DS_Store'),
  'release must not contain tracked .DS_Store files',
);

const changelog = fs.readFileSync(path.join(root, 'CHANGELOG.md'), 'utf8');
assert.ok(changelog.includes(`## [${releaseVersion}]`), `CHANGELOG.md must document ${releaseVersion}`);

const releaseText = [
  fs.readFileSync(path.join(root, 'README.md'), 'utf8'),
  changelog,
  JSON.stringify(claudeManifest),
  JSON.stringify(claudeMarketplace),
  JSON.stringify(codexManifest),
].join('\n');
assert.doesNotMatch(releaseText, /\+codex\./, 'stale release versions are not allowed');

console.log(`Release preflight passed for AIPilot ${releaseVersion}.`);
