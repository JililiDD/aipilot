#!/usr/bin/env node

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');

function readJson(relativePath) {
  const absolutePath = path.join(root, relativePath);
  return JSON.parse(fs.readFileSync(absolutePath, 'utf8'));
}

function assertManifest(relativePath, expected) {
  const manifest = readJson(relativePath);
  assert.strictEqual(manifest.name, 'aipilot-jl', `${relativePath} name`);
  assert.strictEqual(manifest.version, '2.0.0', `${relativePath} version`);
  assert.strictEqual(manifest.skills, './skills/', `${relativePath} skills`);
  assert.strictEqual(manifest.interface.displayName, 'AI Pilot JL', `${relativePath} displayName`);

  for (const field of expected.absentFields || []) {
    assert.ok(!Object.prototype.hasOwnProperty.call(manifest, field), `${relativePath} must not declare ${field}`);
  }
}

function assertManifestsInSync() {
  const claudeManifest = readJson('.claude-plugin/plugin.json');
  const codexManifest = readJson('.codex-plugin/plugin.json');
  // README documents this carve-out: Codex's plugin validator rejects fields
  // it doesn't recognize, so those fields may legitimately be absent from the
  // codex manifest. Everything else must stay identical between the two.
  const CODEX_INCOMPATIBLE_FIELDS = ['hooks'];

  const claudeComparable = { ...claudeManifest };
  for (const field of CODEX_INCOMPATIBLE_FIELDS) {
    delete claudeComparable[field];
  }

  assert.deepStrictEqual(
    codexManifest,
    claudeComparable,
    'codex manifest has drifted from claude manifest outside the documented carve-out (hooks)',
  );
}

function assertSkills() {
  const skillsRoot = path.join(root, 'skills');
  const skillDirs = fs.readdirSync(skillsRoot, { withFileTypes: true })
    .filter(entry => entry.isDirectory())
    .map(entry => entry.name);

  assert.ok(skillDirs.length > 0, 'skills directory must contain at least one skill');

  for (const skillName of skillDirs) {
    assert.ok(skillName.startsWith('aipilot-jl-'), `${skillName} must use aipilot-jl namespace`);
    const skillPath = path.join(skillsRoot, skillName, 'SKILL.md');
    assert.ok(fs.existsSync(skillPath), `${skillName} must include SKILL.md`);

    const contents = fs.readFileSync(skillPath, 'utf8');
    assert.ok(contents.includes(`name: ${skillName}\n`), `${skillName} frontmatter name must match directory`);
  }
}

function assertMarketplace() {
  const marketplace = readJson('.agents/plugins/marketplace.json');
  assert.strictEqual(marketplace.name, 'aipilot-jl-local', 'marketplace name');
  assert.strictEqual(marketplace.plugins[0].name, 'aipilot-jl', 'marketplace plugin name');
  assert.strictEqual(marketplace.plugins[0].source.url, './', 'marketplace local source');
}

assertManifest('.claude-plugin/plugin.json', {});
assertManifest('.codex-plugin/plugin.json', { absentFields: ['hooks'] });
assertManifestsInSync();
assertMarketplace();
assertSkills();

console.log('Plugin layout validation passed.');
