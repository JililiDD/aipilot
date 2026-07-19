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
  assert.strictEqual(manifest.name, 'aipilot', `${relativePath} name`);
  assert.match(manifest.version, /^2\.0\.0(?:\+codex\.[A-Za-z0-9.-]+)?$/, `${relativePath} version`);
  assert.strictEqual(manifest.skills, './skills/', `${relativePath} skills`);
  assert.strictEqual(manifest.interface.displayName, 'AIPilot', `${relativePath} displayName`);

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

  const normalizeVersion = version => version.replace(/\+codex\.[A-Za-z0-9.-]+$/, '');
  const codexComparable = {
    ...codexManifest,
    version: normalizeVersion(codexManifest.version),
  };
  claudeComparable.version = normalizeVersion(claudeComparable.version);

  assert.deepStrictEqual(
    codexComparable,
    claudeComparable,
    'codex manifest has drifted from claude manifest outside the documented carve-out (hooks and codex cachebuster)',
  );
}

function assertSkills() {
  const skillsRoot = path.join(root, 'skills');
  const skillDirs = fs.readdirSync(skillsRoot, { withFileTypes: true })
    .filter(entry => entry.isDirectory())
    .map(entry => entry.name)
    .sort();

  assert.ok(skillDirs.length > 0, 'skills directory must contain at least one skill');
  assert.deepStrictEqual(skillDirs, [
    'code-reviewer',
    'design-spec-builder',
    'dev-builder',
    'dev-plan-builder',
    'java-backend-expert',
    'note-keeper',
    'product-spec-builder',
    'release-builder',
    'workflow-orchestrator',
  ]);
  assert.ok(skillDirs.every(name => !name.startsWith('aipilot-')), 'skill dirs must not use plugin prefixes');
  assert.ok(
    !skillDirs.includes('workflow-evolver'),
    'removed workflow evolver skill must not be packaged',
  );

  for (const skillName of skillDirs) {
    const skillPath = path.join(skillsRoot, skillName, 'SKILL.md');
    assert.ok(fs.existsSync(skillPath), `${skillName} must include SKILL.md`);

    const contents = fs.readFileSync(skillPath, 'utf8');
    assert.ok(contents.includes(`name: ${skillName}\n`), `${skillName} frontmatter name must match directory`);
    assert.ok(!contents.includes('signals.jsonl'), `${skillName} must not restore workflow signal capture`);
    assert.ok(!contents.includes('workflow-evolver'), `${skillName} must not route to the removed workflow evolver`);
  }
}

function assertMarketplace() {
  const marketplace = readJson('.agents/plugins/marketplace.json');
  assert.strictEqual(marketplace.name, 'aipilot-local', 'marketplace name');
  assert.strictEqual(marketplace.interface.displayName, 'AIPilot Local', 'marketplace display name');
  assert.strictEqual(marketplace.plugins[0].name, 'aipilot', 'marketplace plugin name');
  assert.strictEqual(marketplace.plugins[0].source.source, 'local', 'marketplace source type');
  assert.strictEqual(marketplace.plugins[0].source.path, './', 'marketplace local source path');
  assert.strictEqual(marketplace.plugins[0].policy.installation, 'AVAILABLE', 'marketplace installation policy');
  assert.strictEqual(marketplace.plugins[0].policy.authentication, 'ON_INSTALL', 'marketplace auth policy');
  assert.deepStrictEqual(marketplace.plugins[0].policy.products, ['CODEX'], 'marketplace products');
  assert.strictEqual(marketplace.plugins[0].category, 'Productivity', 'marketplace category');
}

function assertCanonicalConstitution() {
  const canonicalRelativePath = 'skills/workflow-orchestrator/references/document-system-spec.md';
  const constitution = fs.readFileSync(path.join(root, canonicalRelativePath), 'utf8');
  const coldStart = fs.readFileSync(path.join(root, 'commands/aipilot.md'), 'utf8');
  const readers = [
    'skills/product-spec-builder/SKILL.md',
    'skills/design-spec-builder/SKILL.md',
    'skills/dev-plan-builder/SKILL.md',
    'skills/dev-builder/SKILL.md',
    'skills/code-reviewer/SKILL.md',
    'skills/release-builder/SKILL.md',
  ];

  assert.ok(constitution.includes('## 8. Stage Boundary Review Gate'), 'constitution must own the review gate');
  assert.ok(constitution.includes('legacy project-local `document-system-spec.md` is non-authoritative and ignored'));
  assert.ok(coldStart.includes('never copy or refresh it in the project documents root'));
  assert.ok(!/copy .*document-system-spec\.md/i.test(coldStart), 'cold start must not copy the constitution');

  for (const relativePath of readers) {
    const contents = fs.readFileSync(path.join(root, relativePath), 'utf8');
    assert.ok(
      contents.includes('../workflow-orchestrator/references/document-system-spec.md'),
      `${relativePath} must read the canonical plugin constitution directly`,
    );
    assert.ok(
      !contents.includes('`document-system-spec.md` at the documents root'),
      `${relativePath} must not read a project-local constitution`,
    );
  }
}

assertManifest('.claude-plugin/plugin.json', {});
assertManifest('.codex-plugin/plugin.json', { absentFields: ['hooks'] });
assertManifestsInSync();
assertMarketplace();
assertSkills();
assertCanonicalConstitution();

console.log('Plugin layout validation passed.');
