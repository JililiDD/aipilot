#!/usr/bin/env node

const assert = require('assert');
const { spawnSync } = require('child_process');
const crypto = require('crypto');
const fs = require('fs');
const os = require('os');
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
  assert.strictEqual(manifest.name, 'aipilot');
  assert.strictEqual(manifest.version, '1.1.1');
  assert.strictEqual(manifest.skills, './skills/');
  assert.ok(!Object.prototype.hasOwnProperty.call(manifest, 'hooks'));
  assert.strictEqual(manifest.interface.displayName, 'AIPilot');
});

test('claude manifest points at shared skills without invalid cross-host fields', () => {
  const manifest = readJson('.claude-plugin/plugin.json');
  assert.strictEqual(manifest.name, 'aipilot');
  assert.strictEqual(manifest.displayName, 'AIPilot');
  assert.strictEqual(manifest.version, '1.1.1');
  assert.strictEqual(manifest.skills, './skills/');
  assert.strictEqual(manifest.commands, './commands/');
  assert.ok(!Object.prototype.hasOwnProperty.call(manifest, 'interface'));
  assert.ok(!Object.prototype.hasOwnProperty.call(manifest, 'hooks'));
});

test('Codex marketplace exposes the AIPilot plugin', () => {
  const marketplace = readJson('.agents/plugins/marketplace.json');
  assert.strictEqual(marketplace.name, 'aipilot');
  assert.strictEqual(marketplace.interface.displayName, 'AIPilot');
  assert.strictEqual(marketplace.plugins[0].name, 'aipilot');
  assert.strictEqual(marketplace.plugins[0].source.source, 'local');
  assert.strictEqual(marketplace.plugins[0].source.path, './');
  assert.strictEqual(marketplace.plugins[0].policy.installation, 'AVAILABLE');
  assert.strictEqual(marketplace.plugins[0].policy.authentication, 'ON_INSTALL');
  assert.ok(!Object.prototype.hasOwnProperty.call(marketplace.plugins[0].policy, 'products'));
  assert.strictEqual(marketplace.plugins[0].category, 'Productivity');
});

test('Claude marketplace exposes the AIPilot 1.1.1 plugin', () => {
  const marketplace = readJson('.claude-plugin/marketplace.json');
  assert.strictEqual(marketplace.name, 'aipilot');
  assert.strictEqual(marketplace.plugins.length, 1);
  assert.strictEqual(marketplace.plugins[0].name, 'aipilot');
  assert.strictEqual(marketplace.plugins[0].source, './');
  assert.strictEqual(marketplace.plugins[0].version, '1.1.1');
  assert.strictEqual(marketplace.plugins[0].strict, true);
});

test('every skill directory contains a SKILL.md file', () => {
  const skillsRoot = path.join(root, 'skills');
  const skillDirs = fs.readdirSync(skillsRoot, { withFileTypes: true })
    .filter(entry => entry.isDirectory())
    .map(entry => entry.name)
    .sort();
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
  assert.ok(skillDirs.every(name => !name.startsWith('aipilot-')));
  const missing = skillDirs
    .map(name => path.join(skillsRoot, name, 'SKILL.md'))
    .filter(skillPath => !fs.existsSync(skillPath));
  assert.deepStrictEqual(missing, []);
});

test('clean-context review requires inspectable returned output before delegation', () => {
  const devBuilder = fs.readFileSync(path.join(root, 'skills/dev-builder/SKILL.md'), 'utf8');
  const orchestrator = fs.readFileSync(path.join(root, 'skills/workflow-orchestrator/SKILL.md'), 'utf8');

  for (const contents of [devBuilder, orchestrator]) {
    assert.ok(contents.includes('report is returned to the main agent'));
    assert.ok(contents.includes('Spawn-only delegation without returned output is not enough'));
    assert.ok(contents.includes('clean-context result unavailable'));
  }
});

test('ui-facing reviews read the design lens explicitly', () => {
  const reviewer = fs.readFileSync(path.join(root, 'skills/code-reviewer/SKILL.md'), 'utf8');

  assert.ok(reviewer.includes('UI review lens'));
  assert.ok(reviewer.includes("target work-item's Design section plus `design-spec.md`"));
});

test('implementation granularity is confirmed at first dev-builder entry each session', () => {
  const devBuilder = fs.readFileSync(path.join(root, 'skills/dev-builder/SKILL.md'), 'utf8');
  const orchestrator = fs.readFileSync(path.join(root, 'skills/workflow-orchestrator/SKILL.md'), 'utf8');

  assert.ok(orchestrator.includes("ask the user to confirm the Plan's recorded execution granularity for this session"));
  assert.ok(orchestrator.includes('wait for their reply before routing'));
  assert.ok(orchestrator.includes('confirmed-this-session granularity'));
  assert.ok(devBuilder.includes('first implementation entry in a session'));
  assert.ok(devBuilder.includes('granularity was confirmed this session'));
});

test('dev-builder self-reviews each task and keeps approach decisions implementation-only', () => {
  const devBuilder = fs.readFileSync(path.join(root, 'skills/dev-builder/SKILL.md'), 'utf8');

  assert.ok(devBuilder.includes('Self-review the task-scoped diff once before verification'));
  assert.ok(devBuilder.includes('do not improve unrelated code or invent alternative approaches'));
  assert.ok(devBuilder.includes('only to implementation-level alternatives'));
  assert.ok(devBuilder.includes('Do not treat changing or redesigning those specifications as an implementation approach'));
  assert.ok(devBuilder.includes('If fewer than two viable candidates remain'));
  assert.ok(devBuilder.includes('Under an active Goal Wrap, do not stop for an implementation approach decision'));
  assert.ok(!devBuilder.includes("the same carve-out precedent as Story 0's stop marker"));
});

test('requirement and design acceptance-criteria identifiers stay stable', () => {
  const productSpecBuilder = fs.readFileSync(
    path.join(root, 'skills/product-spec-builder/SKILL.md'),
    'utf8',
  );
  const designSpecBuilder = fs.readFileSync(
    path.join(root, 'skills/design-spec-builder/SKILL.md'),
    'utf8',
  );

  assert.ok(productSpecBuilder.includes('Number them sequentially as `R-1`, `R-2`, ...'));
  assert.ok(designSpecBuilder.includes('Number them sequentially as `D-1`, `D-2`, ...'));
  for (const contents of [productSpecBuilder, designSpecBuilder]) {
    assert.ok(contents.includes('Preserve existing IDs during revisions'));
    assert.ok(contents.includes('assign the next unused number'));
    assert.ok(contents.includes('never renumber a criterion already referenced by a Plan or Execution Record'));
  }
});

test('note keeper persists only durable project workflow preferences', () => {
  const noteKeeper = fs.readFileSync(path.join(root, 'skills/note-keeper/SKILL.md'), 'utf8');
  const orchestrator = fs.readFileSync(path.join(root, 'skills/workflow-orchestrator/SKILL.md'), 'utf8');
  const coldStart = fs.readFileSync(path.join(root, 'commands/aipilot.md'), 'utf8');
  const constitution = fs.readFileSync(
    path.join(root, 'skills/workflow-orchestrator/references/document-system-spec.md'),
    'utf8',
  );
  const productSpecBuilder = fs.readFileSync(
    path.join(root, 'skills/product-spec-builder/SKILL.md'),
    'utf8',
  );
  const devPlanBuilder = fs.readFileSync(
    path.join(root, 'skills/dev-plan-builder/SKILL.md'),
    'utf8',
  );

  assert.ok(noteKeeper.includes('`memory/agent-guideline.md`'));
  assert.ok(noteKeeper.includes('as both the request and approval to write'));
  assert.ok(noteKeeper.includes('use it only for the current task'));
  assert.ok(noteKeeper.includes('it never authorizes a silent write'));
  assert.ok(noteKeeper.includes('If the target file exists under `memory/`, read it before writing'));
  assert.ok(noteKeeper.includes('create `memory/` and the file with `# Decisions` or `# Lessons`'));
  assert.ok(noteKeeper.includes('For `memory/agent-guideline.md`, create `memory/` and the file if absent'));
  assert.ok(orchestrator.includes('explicit durable wording authorizes the write'));
  assert.ok(!orchestrator.includes('evolution/signals.jsonl'));
  assert.ok(coldStart.includes('Do not create an empty `memory/` directory or empty memory files'));
  assert.ok(coldStart.includes('are created lazily'));
  assert.ok(!coldStart.includes('empty `decisions.md`'));
  assert.ok(!coldStart.includes('Initialize `agent-guideline.md`'));
  assert.ok(constitution.includes('Memory lifecycle is lazy'));
  assert.ok(constitution.includes('A reader treats a missing directory or file as an empty memory category'));
  assert.ok(constitution.includes('The skill recording the first entry creates `memory/` and the target file'));
  assert.ok(constitution.includes('Work-item directories are invariant infrastructure'));
  assert.ok(orchestrator.includes('ensure `work-items/` and `work-items/merged/` exist'));
  assert.ok(productSpecBuilder.includes('ensure `docs/aipilot/work-items/` and `docs/aipilot/work-items/merged/` exist'));
  assert.ok(devPlanBuilder.includes('ensure `work-items/` and `work-items/merged/` exist'));
});

test('canonical constitution exclusively owns the markdown stage review gate', () => {
  const constitution = fs.readFileSync(
    path.join(root, 'skills/workflow-orchestrator/references/document-system-spec.md'),
    'utf8',
  );
  const orchestrator = fs.readFileSync(path.join(root, 'skills/workflow-orchestrator/SKILL.md'), 'utf8');
  const runtime = fs.readFileSync(
    path.join(root, 'skills/workflow-orchestrator/references/review-runtime.md'),
    'utf8',
  );
  const stageSkills = [
    'skills/product-spec-builder/SKILL.md',
    'skills/design-spec-builder/SKILL.md',
    'skills/dev-plan-builder/SKILL.md',
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
  assert.ok(runtime.includes('Document approval alone does not authorize the next stage'));
  assert.ok(!runtime.includes('treat it as the stage confirmation'));
  assert.ok(!runtime.includes('**Ask first**'));
});

test('constitution stays plugin-owned and is never installed into a project', () => {
  const coldStart = fs.readFileSync(path.join(root, 'commands/aipilot.md'), 'utf8');
  const constitution = fs.readFileSync(
    path.join(root, 'skills/workflow-orchestrator/references/document-system-spec.md'),
    'utf8',
  );
  const directReaders = [
    'skills/product-spec-builder/SKILL.md',
    'skills/design-spec-builder/SKILL.md',
    'skills/dev-plan-builder/SKILL.md',
    'skills/dev-builder/SKILL.md',
    'skills/code-reviewer/SKILL.md',
    'skills/release-builder/SKILL.md',
  ].map(relativePath => fs.readFileSync(path.join(root, relativePath), 'utf8'));

  assert.ok(coldStart.includes('never copy or refresh it in the project documents root'));
  assert.ok(!/copy .*document-system-spec\.md/i.test(coldStart));
  assert.ok(constitution.includes('legacy project-local `document-system-spec.md` is non-authoritative and ignored'));

  for (const contents of directReaders) {
    assert.ok(contents.includes('../workflow-orchestrator/references/document-system-spec.md'));
    assert.ok(!contents.includes('`document-system-spec.md` at the documents root'));
  }
});

test('plugin ships no workflow signal capture path', () => {
  const skillDirs = fs.readdirSync(path.join(root, 'skills'), { withFileTypes: true })
    .filter(entry => entry.isDirectory())
    .map(entry => entry.name);
  assert.ok(!skillDirs.includes('workflow-evolver'));

  const sourceFiles = [
    path.join(root, 'commands/aipilot.md'),
    ...skillDirs.map(name => path.join(root, 'skills', name, 'SKILL.md')),
    path.join(root, 'skills/workflow-orchestrator/references/document-system-spec.md'),
  ];
  const workflowText = sourceFiles.map(file => fs.readFileSync(file, 'utf8')).join('\n');
  assert.doesNotMatch(workflowText, /signals\.jsonl|workflow-evolver/i);
});

test('review runtime uses ezreview commands and no injected browser bridge', () => {
  const runtime = fs.readFileSync(
    path.join(root, 'skills/workflow-orchestrator/references/review-runtime.md'),
    'utf8',
  );
  const renderer = fs.readFileSync(
    path.join(root, 'skills/workflow-orchestrator/scripts/render-review.js'),
    'utf8',
  );
  const markedVendor = path.join(
    root,
    'skills/workflow-orchestrator/vendor/marked/marked.esm.mjs',
  );
  const markedLicense = path.join(
    root,
    'skills/workflow-orchestrator/vendor/marked/LICENSE',
  );
  const markedVersion = fs.readFileSync(
    path.join(root, 'skills/workflow-orchestrator/vendor/marked/VERSION'),
    'utf8',
  );
  const ezreviewRoot = path.join(root, 'skills/workflow-orchestrator/vendor/ezreview');
  const ezreviewStandalone = path.join(ezreviewRoot, 'ezreview.mjs');
  const ezreviewLicense = path.join(ezreviewRoot, 'LICENSE');
  const ezreviewVersion = fs.readFileSync(path.join(ezreviewRoot, 'VERSION'), 'utf8');

  assert.match(runtime, /node <this-skill>\/vendor\/ezreview\/ezreview\.mjs <file\.html>/);
  assert.match(runtime, /node <this-skill>\/vendor\/ezreview\/ezreview\.mjs wait <file\.html>/);
  assert.match(runtime, /node <this-skill>\/vendor\/ezreview\/ezreview\.mjs reply/);
  assert.match(runtime, /plugin-vendored `ezreview` 0\.2\.2 standalone file/);
  assert.match(runtime, /Do not substitute `npm`, `npx`, a global `ezreview` command, or any runtime download/);
  assert.doesNotMatch(runtime, /npx -y ezreview|npm (?:install|exec) ezreview/);
  assert.strictEqual(ezreviewVersion, '0.2.2\n');
  assert.strictEqual(fs.statSync(ezreviewStandalone).size, 205_490);
  if (process.platform !== 'win32') {
    assert.ok((fs.statSync(ezreviewStandalone).mode & 0o111) !== 0, 'vendored ezreview must stay executable');
  }
  assert.ok(fs.statSync(ezreviewLicense).size > 1_000);
  assert.strictEqual(
    crypto.createHash('sha256').update(fs.readFileSync(ezreviewStandalone)).digest('hex'),
    'f715c70c9662904bdc5aa8df6fe455fa1c99f66d044d16edd7440c5dc8e4df60',
  );
  assert.strictEqual(
    crypto.createHash('sha256').update(fs.readFileSync(ezreviewLicense)).digest('hex'),
    '0c9523d00cb807e39b5a6e71e145dd413cd251cd341304aefea7c5dcf603b4a0',
  );
  assert.deepStrictEqual(fs.readdirSync(ezreviewRoot).sort(), ['LICENSE', 'VERSION', 'ezreview.mjs']);
  assert.match(runtime, /must remain \*\*attached to the current agent execution\*\*/);
  assert.match(runtime, /Do not launch it through ordinary shell detachment such as `&`, `nohup`, or `disown`/);
  assert.match(runtime, /managed continuation mechanism/);
  assert.match(runtime, /continue that exact process with `write_stdin` using the same `session_id`/);
  assert.match(runtime, /A yield or an empty poll is not process completion/);
  assert.match(runtime, /Do not start a second `ezreview wait` while that managed process handle is still alive/);
  assert.match(runtime, /There is no agent-imposed idle timeout for human review/);
  assert.match(runtime, /Never interrupt, terminate, kill, or close either process solely because no feedback has arrived/);
  assert.match(runtime, /A poll boundary exists only so the host can return control; it is not a review deadline/);
  assert.match(runtime, /Preserve the exact review HTML and its source document/);
  assert.match(runtime, /start exactly one new attached `wait` for the \*\*same HTML file\*\*/);
  assert.match(runtime, /reopen the \*\*same HTML file\*\*/);
  assert.match(runtime, /interruption is a recovery event, not approval or cancellation/);
  assert.match(runtime, /cancellation leaves the workflow gate unconfirmed/);
  assert.match(runtime, /the review gate remains active/);
  assert.match(runtime, /stop only unusable processes and preserve the HTML\/source for the fallback review/);
  assert.match(runtime, /Never shut down a usable review process before approval or explicit cancellation/);
  assert.match(runtime, /`wait` intentionally returns one structured batch and exits/);
  assert.match(runtime, /\*\*Reply to every submitted annotation ID after handling it\.\*\*/);
  assert.match(runtime, /Never treat a source edit or HTML reload as an implicit reply/);
  assert.match(runtime, /Give each annotation its own reply, including when one edit addresses multiple comments/);
  assert.match(runtime, /verify that every annotation ID in the returned batch has received an outcome reply/);
  assert.match(runtime, /Run `wait` again only after all replies are visible to the review channel/);
  assert.match(runtime, /Keep the current review turn open across every batch/);
  assert.match(runtime, /End the ezreview loop only under the exit-event rules above/);
  assert.match(runtime, /Tool failure transfers the still-active gate to the degradation path/);
  assert.match(runtime, /tool failure and fallback are never implicit approval/);
  assert.match(runtime, /cancellation never authorizes it/);
  assert.match(runtime, /deleted from local disk after the session/);
  assert.match(runtime, /Delete the exact scratchpad HTML created for this review from local disk/);
  assert.match(runtime, /`rm -f -- <exact-review-html-path>`/);
  assert.doesNotMatch(runtime, /Delete or ignore the scratchpad HTML/);
  assert.doesNotMatch(runtime, /start `wait` as a \*\*foreground task\*\*/);
  assert.doesNotMatch(renderer, /queuePrompt|window\./i);
  assert.doesNotMatch(renderer, /review-banner|Document review — annotate/i);
  assert.match(renderer, /source-banner/);
  assert.match(renderer, /source: <code>/);
  assert.doesNotMatch(renderer, /\bnpx\b|spawnSync|child_process|npm install/i);
  assert.match(renderer, /\.\.\/vendor\/marked\/marked\.esm\.mjs/);
  assert.match(renderer, /marked\.parse\(markdown, \{ gfm: true \}\)/);
  assert.ok(fs.statSync(markedVendor).size > 40_000);
  assert.ok(fs.statSync(markedLicense).size > 2_000);
  assert.match(markedVersion, /^version: 18\.0\.6$/m);
  assert.match(markedVersion, /^marked\.esm\.mjs-sha256: 35398f546525d5e79a8f2f8738635d3ecbd277618cba2ada874e9d27dc9e88f0$/m);
  assert.match(renderer, /<body data-source-md=/);
});

test('vendored ezreview standalone works offline without npm or npx', () => {
  const standalone = path.join(root, 'skills/workflow-orchestrator/vendor/ezreview/ezreview.mjs');
  const bundle = fs.readFileSync(standalone, 'utf8');
  const result = spawnSync(process.execPath, [standalone, '--help'], {
    encoding: 'utf8',
    env: { ...process.env, PATH: '/nonexistent', npm_config_offline: 'true' },
  });

  assert.strictEqual(result.status, 0, result.stderr);
  assert.match(result.stdout, /ezreview <file\.html>/);
  assert.match(result.stdout, /ezreview wait <file\.html>/);
  assert.match(result.stdout, /ezreview reply <file\.html>/);
  assert.match(bundle, /^#!\/usr\/bin\/env node/);
  assert.doesNotMatch(bundle, /\bfrom\s+["']\./);
  assert.doesNotMatch(bundle, /\bimport\s*\(\s*["']\./);
  for (const favicon of [
    '/favicon.svg',
    '/favicon.ico',
    '/favicon-16x16.png',
    '/favicon-32x32.png',
    '/favicon-64x64.png',
    '/favicon-192x192.png',
    '/favicon-512x512.png',
  ]) {
    assert.ok(bundle.includes(favicon), `standalone bundle must embed ${favicon}`);
  }
});

test('review renderer works offline with bundled marked', () => {
  const scratch = fs.mkdtempSync(path.join(os.tmpdir(), 'aipilot-render-review-'));
  const input = path.join(scratch, 'sample.md');
  const output = path.join(scratch, 'sample.html');
  fs.writeFileSync(input, '# Offline\n\n| A | B |\n| - | - |\n| 1 | 2 |\n', 'utf8');

  const result = spawnSync(
    process.execPath,
    [path.join(root, 'skills/workflow-orchestrator/scripts/render-review.js'), input, output],
    {
      encoding: 'utf8',
      env: { ...process.env, PATH: '/nonexistent', npm_config_offline: 'true' },
    },
  );

  assert.strictEqual(result.status, 0, result.stderr);
  const html = fs.readFileSync(output, 'utf8');
  assert.match(html, /<h1>Offline<\/h1>/);
  assert.match(html, /<table>/);
  assert.match(html, /data-source-md=/);
  assert.match(html, /<header class="source-banner">source: <code>/);
  fs.rmSync(scratch, { recursive: true });
});
