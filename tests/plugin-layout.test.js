#!/usr/bin/env node

const assert = require('assert');
const fs = require('fs');
const path = require('path');

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
  assert.strictEqual(manifest.interface.displayName, 'AIPilot');
});

test('claude manifest remains unchanged as the claude adapter', () => {
  const manifest = readJson('.claude-plugin/plugin.json');
  assert.strictEqual(manifest.name, 'aipilot-jl');
  assert.strictEqual(manifest.skills, './skills/');
  assert.strictEqual(manifest.interface.displayName, 'AIPilot');
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

test('clean-context review requires inspectable returned output before delegation', () => {
  const devBuilder = fs.readFileSync(path.join(root, 'skills/aipilot-jl-dev-builder/SKILL.md'), 'utf8');
  const orchestrator = fs.readFileSync(path.join(root, 'skills/aipilot-jl-workflow-orchestrator/SKILL.md'), 'utf8');

  for (const contents of [devBuilder, orchestrator]) {
    assert.ok(contents.includes('report is returned to the main agent'));
    assert.ok(contents.includes('Spawn-only delegation without returned output is not enough'));
    assert.ok(contents.includes('clean-context result unavailable'));
  }
});

test('ui-facing reviews read the design lens explicitly', () => {
  const reviewer = fs.readFileSync(path.join(root, 'skills/aipilot-jl-code-reviewer/SKILL.md'), 'utf8');

  assert.ok(reviewer.includes('UI review lens'));
  assert.ok(reviewer.includes("target work-item's Design section plus `design-spec.md`"));
});

test('implementation granularity is confirmed at first dev-builder entry each session', () => {
  const devBuilder = fs.readFileSync(path.join(root, 'skills/aipilot-jl-dev-builder/SKILL.md'), 'utf8');
  const orchestrator = fs.readFileSync(path.join(root, 'skills/aipilot-jl-workflow-orchestrator/SKILL.md'), 'utf8');

  assert.ok(orchestrator.includes("ask the user to confirm the Plan's recorded execution granularity for this session"));
  assert.ok(orchestrator.includes('wait for their reply before routing'));
  assert.ok(orchestrator.includes('confirmed-this-session granularity'));
  assert.ok(devBuilder.includes('first implementation entry in a session'));
  assert.ok(devBuilder.includes('granularity was confirmed this session'));
});

test('note keeper persists only durable project workflow preferences', () => {
  const noteKeeper = fs.readFileSync(path.join(root, 'skills/aipilot-jl-note-keeper/SKILL.md'), 'utf8');
  const orchestrator = fs.readFileSync(path.join(root, 'skills/aipilot-jl-workflow-orchestrator/SKILL.md'), 'utf8');
  const coldStart = fs.readFileSync(path.join(root, 'commands/aipilot.md'), 'utf8');

  assert.ok(noteKeeper.includes('`agent-guideline.md`'));
  assert.ok(noteKeeper.includes('as both the request and approval to write'));
  assert.ok(noteKeeper.includes('use it only for the current task'));
  assert.ok(noteKeeper.includes('it never authorizes a silent write'));
  assert.ok(orchestrator.includes('explicit durable wording authorizes the write'));
  assert.ok(!orchestrator.includes('evolution/signals.jsonl'));
  assert.ok(coldStart.includes('## Active Workflow Overrides'));
  assert.ok(coldStart.includes('## Superseded Overrides'));
});

test('canonical constitution exclusively owns the markdown stage review gate', () => {
  const constitution = fs.readFileSync(
    path.join(root, 'skills/aipilot-jl-workflow-orchestrator/references/document-system-spec.md'),
    'utf8',
  );
  const orchestrator = fs.readFileSync(path.join(root, 'skills/aipilot-jl-workflow-orchestrator/SKILL.md'), 'utf8');
  const runtime = fs.readFileSync(
    path.join(root, 'skills/aipilot-jl-workflow-orchestrator/references/review-runtime.md'),
    'utf8',
  );
  const stageSkills = [
    'skills/aipilot-jl-product-spec-builder/SKILL.md',
    'skills/aipilot-jl-design-spec-builder/SKILL.md',
    'skills/aipilot-jl-dev-plan-builder/SKILL.md',
  ].map(relativePath => fs.readFileSync(path.join(root, relativePath), 'utf8'));

  const offerIndex = constitution.indexOf('offer the optional browser review **before** requesting next-stage confirmation');
  const confirmationIndex = constitution.indexOf('Request next-stage confirmation only after the review completes');
  assert.ok(offerIndex >= 0, 'constitution must own the browser-review offer');
  assert.ok(confirmationIndex > offerIndex, 'constitution must order review before confirmation');
  assert.ok(constitution.includes('asks only to continue to the next stage before making the required offer is invalid'));
  assert.ok(constitution.includes('Goal Wrap'));
  assert.ok(orchestrator.includes('constitution §8'));

  for (const contents of stageSkills) {
    assert.ok(contents.includes('canonical constitution §8'));
    assert.ok(!contents.includes('the offer is mandatory and the browser review itself is always skippable'));
    assert.ok(!contents.includes('After the user completes or explicitly skips the browser review'));
  }

  assert.ok(runtime.includes('constitution §8 owns whether and when browser review is offered'));
  assert.ok(runtime.includes('document approval alone does not authorize the next stage'));
  assert.ok(!runtime.includes('treat it as the stage confirmation'));
  assert.ok(!runtime.includes('**Ask first**'));
});

test('constitution stays plugin-owned and is never installed into a project', () => {
  const coldStart = fs.readFileSync(path.join(root, 'commands/aipilot.md'), 'utf8');
  const constitution = fs.readFileSync(
    path.join(root, 'skills/aipilot-jl-workflow-orchestrator/references/document-system-spec.md'),
    'utf8',
  );
  const directReaders = [
    'skills/aipilot-jl-product-spec-builder/SKILL.md',
    'skills/aipilot-jl-design-spec-builder/SKILL.md',
    'skills/aipilot-jl-dev-plan-builder/SKILL.md',
    'skills/aipilot-jl-dev-builder/SKILL.md',
    'skills/aipilot-jl-code-reviewer/SKILL.md',
    'skills/aipilot-jl-release-builder/SKILL.md',
  ].map(relativePath => fs.readFileSync(path.join(root, relativePath), 'utf8'));

  assert.ok(coldStart.includes('never copy or refresh it in the project documents root'));
  assert.ok(!/copy .*document-system-spec\.md/i.test(coldStart));
  assert.ok(constitution.includes('legacy project-local `document-system-spec.md` is non-authoritative and ignored'));

  for (const contents of directReaders) {
    assert.ok(contents.includes('../aipilot-jl-workflow-orchestrator/references/document-system-spec.md'));
    assert.ok(!contents.includes('`document-system-spec.md` at the documents root'));
  }
});

test('plugin ships no workflow signal capture path', () => {
  const skillDirs = fs.readdirSync(path.join(root, 'skills'), { withFileTypes: true })
    .filter(entry => entry.isDirectory())
    .map(entry => entry.name);
  assert.ok(!skillDirs.includes('aipilot-jl-workflow-evolver'));

  const sourceFiles = [
    path.join(root, 'commands/aipilot.md'),
    ...skillDirs.map(name => path.join(root, 'skills', name, 'SKILL.md')),
    path.join(root, 'skills/aipilot-jl-workflow-orchestrator/references/document-system-spec.md'),
  ];
  const workflowText = sourceFiles.map(file => fs.readFileSync(file, 'utf8')).join('\n');
  assert.doesNotMatch(workflowText, /signals\.jsonl|workflow-evolver/i);
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

test('review runtime uses ezreview commands and no injected browser bridge', () => {
  const runtime = fs.readFileSync(
    path.join(root, 'skills/aipilot-jl-workflow-orchestrator/references/review-runtime.md'),
    'utf8',
  );
  const renderer = fs.readFileSync(
    path.join(root, 'skills/aipilot-jl-workflow-orchestrator/scripts/render-review.js'),
    'utf8',
  );

  assert.match(runtime, /npx -y ezreview@0\.1\.2 <file\.html>/);
  assert.match(runtime, /npx -y ezreview@0\.1\.2 wait <file\.html>/);
  assert.match(runtime, /npx -y ezreview@0\.1\.2 reply/);
  assert.match(runtime, /must remain \*\*attached to the current agent execution\*\*/);
  assert.match(runtime, /Do not launch it through ordinary shell detachment such as `&`, `nohup`, or `disown`/);
  assert.match(runtime, /managed continuation mechanism/);
  assert.doesNotMatch(runtime, /start `wait` as a \*\*foreground task\*\*/);
  assert.doesNotMatch(renderer, /queuePrompt|window\./i);
});
