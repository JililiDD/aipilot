#!/usr/bin/env node

const assert = require('assert');
const { spawnSync } = require('child_process');
const crypto = require('crypto');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { test } = require('node:test');
const { validate } = require('../scripts/validate-plugin-layout');

const root = path.resolve(__dirname, '..');

test('plugin layout validator passes', () => {
  validate();
});

test('clean-context review requires inspectable returned output before delegation', () => {
  const devBuilder = fs.readFileSync(path.join(root, 'skills/dev-builder/SKILL.md'), 'utf8');
  const orchestrator = fs.readFileSync(path.join(root, 'skills/workflow-orchestrator/SKILL.md'), 'utf8');

  // The rule lives with dev-builder, which dispatches the reviewer, so a direct invocation still has it.
  assert.ok(devBuilder.includes('report is returned to the main agent'));
  assert.ok(devBuilder.includes('Spawn-only delegation without returned output is not enough'));
  assert.ok(devBuilder.includes('clean-context result unavailable'));
  assert.ok(orchestrator.includes('run by `dev-builder` per its Review Cadence'));
  assert.ok(!orchestrator.includes('clean-context result unavailable'), 'the rule has a single home');
});

test('ui-facing reviews read the design lens explicitly', () => {
  const reviewer = fs.readFileSync(path.join(root, 'skills/code-reviewer/SKILL.md'), 'utf8');

  assert.ok(reviewer.includes('UI review lens'));
  assert.ok(reviewer.includes("target work-item's Design section plus `design-spec.md`"));
});

test('implementation granularity is confirmed at first dev-builder entry each session', () => {
  const devBuilder = fs.readFileSync(path.join(root, 'skills/dev-builder/SKILL.md'), 'utf8');
  const orchestrator = fs.readFileSync(path.join(root, 'skills/workflow-orchestrator/SKILL.md'), 'utf8');

  assert.ok(orchestrator.includes("ask the user to confirm the Plan's execution granularity for this session, and wait for the reply"));
  // A choice the user just made while planning is not asked again before building.
  assert.ok(orchestrator.includes('Skip this when the user already chose or confirmed it this session'));
  assert.ok(orchestrator.includes('The granularity is the one confirmed this session, or whole work-item under a Goal Wrap'));
  assert.ok(devBuilder.includes('first implementation entry in a session'));
  assert.ok(devBuilder.includes('granularity was confirmed this session'));

  // Asked once while planning; later stages confirm or fill a gap instead of asking again.
  const constitution = fs.readFileSync(
    path.join(root, 'skills/workflow-orchestrator/references/document-system-spec.md'),
    'utf8',
  );
  const devPlanBuilder = fs.readFileSync(path.join(root, 'skills/dev-plan-builder/SKILL.md'), 'utf8');
  assert.ok(devPlanBuilder.includes('**Execution granularity default** — ask one structured low-risk question'));
  assert.ok(constitution.includes('Granularity changes *reporting stops*, never rigor'));
  assert.ok(!constitution.includes('Before implementation starts, `dev-builder` asks'));
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

  const constitution = fs.readFileSync(
    path.join(root, 'skills/workflow-orchestrator/references/document-system-spec.md'),
    'utf8',
  );

  // Plans and reviews cite AC-n / D-n, so renumbering would silently break traceability.
  assert.ok(constitution.includes('Preserve existing IDs during revisions'));
  assert.ok(constitution.includes('assign the next unused number'));
  assert.ok(constitution.includes('never renumber an item already referenced downstream'));
  assert.ok(productSpecBuilder.includes('**Acceptance Criteria** (`AC-n`)'));
  assert.ok(designSpecBuilder.includes('Design Acceptance Criteria (`D-n`)'));
  for (const contents of [productSpecBuilder, designSpecBuilder]) {
    assert.ok(contents.includes('ID stability'), 'each writer must point at the constitution rule');
    assert.ok(contents.includes('constitution §7'));
  }
});

test('note keeper persists only durable project workflow preferences', () => {
  const noteKeeper = fs.readFileSync(path.join(root, 'skills/note-keeper/SKILL.md'), 'utf8');
  const orchestrator = fs.readFileSync(path.join(root, 'skills/workflow-orchestrator/SKILL.md'), 'utf8');
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
  assert.ok(noteKeeper.includes('as both the request and the confirmation to write'));
  assert.ok(noteKeeper.includes('use it only for the current task'));
  assert.ok(noteKeeper.includes('it never authorizes a silent write'));
  assert.ok(noteKeeper.includes('If the target file exists under `memory/`, read it before writing'));
  assert.ok(noteKeeper.includes('create `memory/` and the file with `# Decisions` or `# Lessons`'));
  assert.ok(noteKeeper.includes('For `memory/agent-guideline.md`, create `memory/` and the file if absent'));
  assert.ok(!orchestrator.includes('evolution/signals.jsonl'));
  const coldStart = fs.readFileSync(path.join(root, 'skills/workflow-orchestrator/references/cold-start.md'), 'utf8');
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
  const confirmationIndex = constitution.indexOf('Request next-stage confirmation only after the browser review completes');
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
  assert.match(runtime, /plugin-vendored `ezreview` 1\.0\.0 standalone file/);
  assert.match(runtime, /Do not substitute `npm`, `npx`, a global `ezreview` command, or any runtime download/);
  assert.doesNotMatch(runtime, /npx -y ezreview|npm (?:install|exec) ezreview/);
  assert.strictEqual(ezreviewVersion, '1.0.0\n');
  if (process.platform !== 'win32') {
    assert.ok((fs.statSync(ezreviewStandalone).mode & 0o111) !== 0, 'vendored ezreview must stay executable');
  }
  assert.strictEqual(
    crypto.createHash('sha256').update(fs.readFileSync(ezreviewStandalone)).digest('hex'),
    '7749773f89462838ad57350f8e0554347ebdca7a653c8e2473218c37bc7b6033',
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
  assert.match(runtime, /shut down only unusable processes and preserve the HTML\/source for the fallback review/);
  assert.match(runtime, /Never shut down a usable review process before approval or explicit cancellation/);
  assert.match(runtime, /`wait` intentionally returns one structured batch and exits/);
  assert.match(runtime, /\*\*Reply to every submitted annotation ID after handling it\.\*\*/);
  assert.match(runtime, /Never treat a source edit or HTML reload as an implicit reply/);
  assert.match(runtime, /Give each annotation its own reply, including when one edit addresses multiple comments/);
  assert.match(runtime, /verify that every annotation ID in the returned batch has received an outcome reply/);
  assert.match(runtime, /Run `wait` again only after all replies are visible to the review channel/);
  assert.match(runtime, /Keep the current review turn open across every batch/);
  assert.match(runtime, /End the ezreview loop only under the exit-event rules above/);
  assert.match(runtime, /tool failure and fallback are never an implicit confirmation/);
  assert.match(runtime, /cancellation never authorizes it/);
  assert.match(runtime, /Delete it from local disk after the session/);
  assert.match(runtime, /Delete the exact scratchpad HTML created for this review from local disk/);
  // Node is already required for ezreview, so this delete works in bash, PowerShell, and cmd alike;
  // PowerShell rejects `rm -f --` as an ambiguous parameter.
  assert.ok(runtime.includes(`node -e "require('fs').rmSync(process.argv[1], { force: true })" <exact-review-html-path>`));
  assert.doesNotMatch(runtime, /rm -f --/);
  assert.doesNotMatch(runtime, /Delete or ignore the scratchpad HTML/);
  assert.doesNotMatch(runtime, /start `wait` as a \*\*foreground task\*\*/);
  assert.doesNotMatch(renderer, /queuePrompt|window\./i);
  assert.doesNotMatch(renderer, /review-banner|Document review — annotate/i);
  assert.doesNotMatch(renderer, /source-banner/, "review-runtime.md: no document banner");
  assert.doesNotMatch(renderer, /\bnpx\b|spawnSync|child_process|npm install/i);
  assert.match(renderer, /\.\.\/vendor\/marked\/marked\.esm\.mjs/);
  assert.match(renderer, /marked\.lexer\(source, \{ gfm: true \}\)/);
  assert.ok(fs.statSync(markedLicense).size > 2_000);
  assert.match(markedVersion, /^version: 18\.0\.6$/m);
  // Hash the vendored file itself so a swapped or edited bundle fails, not just an edited VERSION file.
  const recordedMarkedHash = markedVersion.match(/^marked\.esm\.mjs-sha256: ([0-9a-f]{64})$/m);
  assert.ok(recordedMarkedHash, 'marked VERSION must record the bundle sha256');
  assert.strictEqual(
    crypto.createHash('sha256').update(fs.readFileSync(markedVendor)).digest('hex'),
    recordedMarkedHash[1],
  );
  // Mermaid draws the review diagrams offline. Hash its files too, so a swapped or edited bundle fails.
  const mermaidRoot = path.join(root, 'skills/workflow-orchestrator/vendor/mermaid');
  const mermaidVersion = fs.readFileSync(path.join(mermaidRoot, 'VERSION'), 'utf8');
  assert.match(renderer, /\.\.\/vendor\/mermaid\/mermaid\.min\.js/);
  assert.match(runtime, /`mermaid@11\.17\.2`/);
  assert.match(mermaidVersion, /^version: 11\.17\.2$/m);
  assert.deepStrictEqual(fs.readdirSync(mermaidRoot).sort(), ['LICENSE', 'VERSION', 'mermaid.min.js']);
  for (const [file, key] of [['mermaid.min.js', 'mermaid\\.min\\.js-sha256'], ['LICENSE', 'license-sha256']]) {
    const recorded = mermaidVersion.match(new RegExp(`^${key}: ([0-9a-f]{64})$`, 'm'));
    assert.ok(recorded, `mermaid VERSION must record the ${file} sha256`);
    assert.strictEqual(
      crypto.createHash('sha256').update(fs.readFileSync(path.join(mermaidRoot, file))).digest('hex'),
      recorded[1],
    );
  }
  // The page template carries the body attribute that ties the review page to its markdown source.
  const reviewTemplate = fs.readFileSync(path.join(root, 'skills/workflow-orchestrator/scripts/render-review.template.html'), 'utf8');
  assert.match(reviewTemplate, /<body data-source-md="\{\{SOURCE_MD\}\}">/);
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
  assert.match(html, /<h1 id="offline">Offline<\/h1>/);
  assert.match(html, /<table>/);
  assert.match(html, /data-source-md=/);
  assert.doesNotMatch(html, /source-banner/);
  fs.rmSync(scratch, { recursive: true });
});

test('a failing fix and a disputed finding stop the loop through different gates', () => {
  const devBuilder = fs.readFileSync(path.join(root, 'skills/dev-builder/SKILL.md'), 'utf8');
  const reviewer = fs.readFileSync(path.join(root, 'skills/code-reviewer/SKILL.md'), 'utf8');

  assert.ok(devBuilder.includes('switching is mandatory, not a judgment call'));
  assert.ok(devBuilder.includes("goes to `code-reviewer`'s circuit breaker"));
  assert.ok(reviewer.includes('When the builder disputes a finding instead of fixing it'));
  assert.ok(reviewer.includes("it is `dev-builder`'s Diagnosis Mode hard gate"));
});

test('Story 0 reuses a mock the Design section already chose', () => {
  const planningRules = fs.readFileSync(
    path.join(root, 'skills/dev-plan-builder/references/planning-rules.md'),
    'utf8',
  );

  // Asking for a visual direction twice makes the user build two prototypes for one page.
  assert.ok(planningRules.includes('already records a chosen mock for that page'));
  assert.ok(planningRules.includes('`Direction source: user-provided` (with its path) without asking again'));
});

const read = relativePath => fs.readFileSync(path.join(root, relativePath), 'utf8');
const CONSTITUTION = 'skills/workflow-orchestrator/references/document-system-spec.md';
const GOAL_WRAP = 'skills/dev-plan-builder/references/goal-wrap.md';

test('a change that bypasses the orchestrator still gets its startup and execution-mode question', () => {
  const productSpecBuilder = read('skills/product-spec-builder/SKILL.md');
  const orchestrator = read('skills/workflow-orchestrator/SKILL.md');

  // Every existing-project change creates its work-item here, so this is the one place a bypass can be caught.
  assert.ok(productSpecBuilder.includes('if no execution mode has been chosen for it yet'));
  assert.ok(productSpecBuilder.includes('route to `workflow-orchestrator` before asking anything else'));
  // The question keeps a single home, and it covers every change the hand-off sends there, or the two loop.
  assert.ok(orchestrator.includes('(b) stop once, after the Plan'));
  assert.ok(!productSpecBuilder.includes('stop once, after the Plan'), 'the execution-mode options must not be duplicated');
  assert.ok(orchestrator.includes('For any change to an existing project, first ask'));
});

test('the execution-mode answer lasts one session and its absence means the safest default', () => {
  const orchestrator = read('skills/workflow-orchestrator/SKILL.md');
  const goalWrap = read(GOAL_WRAP);

  // An autonomy grant must not silently carry into a later session, so the answer is session-scoped...
  assert.ok(orchestrator.includes('Record the chosen execution mode for this session'));
  assert.ok(goalWrap.includes('the choice is recorded for the session'));
  // ...and a session without one falls back to the most conservative mode instead of guessing.
  assert.ok(orchestrator.includes('With no execution mode recorded in this session'));
  assert.ok(orchestrator.includes('use (a) until the user asks for more autonomy'));
});

test('the execution mode decides which stops happen, for mode (b) as much as for a Goal Wrap', () => {
  const orchestrator = read('skills/workflow-orchestrator/SKILL.md');
  const constitution = read(CONSTITUTION);

  // Without a waiver, mode (b) would still wait after every stage, exactly like mode (a).
  assert.ok(orchestrator.includes("unless the session's execution mode waives this stop"));
  assert.ok(orchestrator.includes('mode (b) continues until its Plan stop'));
  assert.ok(constitution.includes("When the session's execution mode waives a stage confirmation"));
  assert.ok(orchestrator.includes('a user confirmation that the execution mode has not waived'));
  // Mode (b) promises one stop, and the review offer comes last, so its settings are asked when (b) is chosen.
  const devPlanBuilder = read('skills/dev-plan-builder/SKILL.md');
  assert.ok(orchestrator.includes('When the user picks (b), ask once, right away, for these settings'));
  assert.ok(orchestrator.includes('The stop after the Plan then asks only the review offer and the confirmation'));
  assert.ok(devPlanBuilder.includes("Under execution mode (b), apply the answers from the orchestrator's (b) intake instead"));
  // Every question names its recommendation (constitution §7), the execution-mode question included.
  assert.ok(orchestrator.includes('(a) stop after each stage (the default and the recommendation)'));
});

test('a Goal Wrap stops only where Gate 1 lists, and the wrap rules point there', () => {
  const orchestrator = read('skills/workflow-orchestrator/SKILL.md');
  const goalWrap = read(GOAL_WRAP);

  // One list of goal-mode stops: a second copy drifted and dropped the Diagnosis dead end.
  for (const stop of [
    'a Plan Stop Condition;',
    'a code review that will not converge;',
    'a defect that cannot be reproduced, or a Diagnosis dead end;',
    'a route that would change content the user confirmed (§7 Routing).',
  ]) {
    assert.ok(orchestrator.includes(stop), `Gate 1 must list the goal-mode stop: ${stop}`);
  }
  // A goal run is meant to finish before it stops, so granularity adds no reporting stops there.
  assert.ok(orchestrator.includes('A Goal Wrap uses whole-work-item granularity, so it has no reporting stops'));
  assert.ok(!orchestrator.includes('the reporting stops of the granularity chosen'));
  assert.ok(goalWrap.includes('A Goal Wrap stops only where `workflow-orchestrator` Gate 1 lists'));
  assert.ok(!goalWrap.includes('waived until'), 'the wrap must not keep its own stop list');
});

test('a multi-phase Goal Wrap needs an explicit goal-mode choice and runs without per-phase interruptions', () => {
  const devPlanBuilder = read('skills/dev-plan-builder/SKILL.md');
  const goalWrap = read(GOAL_WRAP);
  const orchestrator = read('skills/workflow-orchestrator/SKILL.md');
  const constitution = read(CONSTITUTION);

  // "Do everything" is a wish, not a grant; only an explicit goal-mode choice authorizes autonomy.
  assert.ok(devPlanBuilder.includes('granted only when the user explicitly chooses goal mode'));
  assert.ok(devPlanBuilder.includes('Open-ended wording in any language'));
  assert.ok(devPlanBuilder.includes('only triggers that question'));
  assert.ok(orchestrator.includes('ask whether to run them as a `dev-plan-builder` Goal Wrap'));
  assert.ok(orchestrator.includes('The Goal Wrap starts only after the user confirms goal mode'));
  // The wrap rules load only when goal mode is in play, so ordinary planning does not pay to read them.
  assert.ok(devPlanBuilder.includes('load `references/goal-wrap.md`'));
  assert.ok(!devPlanBuilder.includes('ask one batch for the run-wide'), 'the wrap rules must live in goal-wrap.md only');
  // Questions are asked once up front, so the run does not stop at every phase.
  assert.ok(goalWrap.includes('ask one batch for the run-wide commit policy and Story 0 direction source'));
  assert.ok(goalWrap.includes('Every Story 0 is recorded `[stop: skip]`'));
  // Later phases are decomposed from the spec as it stands after earlier merge-backs.
  assert.ok(goalWrap.includes('derived just in time when the run reaches it'));
  assert.ok(constitution.includes('a Goal Wrap, single work-item or multi-phase'));
  // Goal mode is meant to finish unattended, so handing over the wrap never stops the run, escalation included.
  assert.ok(goalWrap.includes('Run the wrap in this session, without stopping'));
  assert.ok(goalWrap.includes('continue as a multi-phase Goal Wrap in this session. Do not ask the step 1 batch'));
  // A breakdown that outgrows one work-item keeps going instead of reopening the intake.
  assert.ok(devPlanBuilder.includes('Under a Goal Wrap, `references/goal-wrap.md` says how the run continues'));
  assert.ok(goalWrap.includes('convert without waiting and continue as a multi-phase Goal Wrap'));
  assert.ok(goalWrap.includes('keep the chosen commit policy'));
  // Work-item files are never renamed, and the first merge-back must not publish the later phases' behavior.
  assert.ok(devPlanBuilder.includes("The current work-item becomes the first phase's work-item: keep its filename, add `phase: 1`"));
  assert.ok(devPlanBuilder.includes('into a "Deferred to later phases" list, with their IDs'));
  assert.ok(devPlanBuilder.includes('Then the first merge-back applies only the first phase'));
});

test('diagnosis starts from a clean baseline, probes without editing, and stops at a dead end', () => {
  const devBuilder = read('skills/dev-builder/SKILL.md');

  // Failed attempts would muddy the reproduction, and undoing your own failed edits is not a speculative change.
  assert.ok(devBuilder.includes('Reverting your own failed attempts is not a code change'));
  assert.ok(devBuilder.includes('as the first entries of the diagnosis trail'));
  // The no-edit rule stays strong: read-only probes are fine, project edits wait for a written root cause.
  assert.ok(devBuilder.includes('probes that leave project files untouched'));
  assert.ok(devBuilder.includes('Project source and tests stay unedited until the root cause is written, except Dead-end instrumentation'));
  // An unexplained defect must not ride along silently into later tasks.
  assert.ok(devBuilder.includes('stop for the user with the task unticked'));
  assert.ok(devBuilder.includes('The original failing `— Verify:` check serves when it reproduces the defect deterministically'));
});

test('questions recommend what fits, and facts are looked up before they are asked', () => {
  const constitution = read(CONSTITUTION);
  const goalWrap = read(GOAL_WRAP);

  // A forced recommendation on a factual question ("Not sure (recommended)") carries no information.
  assert.ok(constitution.includes('lists the likely answers without a recommendation'));
  assert.ok(constitution.includes('asked only when the code, documents, or logs cannot answer it'));
  // The review offer recommends by the deliverable, and may share one question with the confirmation.
  assert.ok(constitution.includes('Recommend the browser review when the deliverable is long or holds decisions the user has not yet seen in chat'));
  // A bare "skip" would read as both "no review" and "go ahead", so the combined option names the next stage.
  assert.ok(constitution.includes('"Skip review and continue to <next stage>"; choosing that option confirms'));
  assert.ok(constitution.includes('declining a browser review is never itself a confirmation'));
  // A multi-phase run must neither pile up uncommitted phases nor stall at every merge-back.
  assert.ok(goalWrap.includes('Recommend `branch` as the commit policy, since several phases of uncommitted work would otherwise pile up'));
  assert.ok(goalWrap.includes("The run reports at each phase's merge-back and continues. It has no reporting stops"));
});

test('a goal run does not stall on an uncovered screen, but never hides that it skipped design', () => {
  const devPlanBuilder = read('skills/dev-plan-builder/SKILL.md');
  const goalWrap = read(GOAL_WRAP);
  const designSpecBuilder = read('skills/design-spec-builder/SKILL.md');

  assert.ok(goalWrap.includes('does not cover does not stop the run'));
  // One design mechanism for every goal run: a real Design section, so ACs and the spec merge-back still work.
  assert.ok(goalWrap.includes('Its work-item goes to `design-spec-builder`, which under a Goal Wrap infers the Design section'));
  // Derivation must hand the new screen to design, or breakdown runs with no Design section to plan against.
  assert.ok(devPlanBuilder.includes('Route any other Design section to `design-spec-builder` before breakdown.'));
  assert.ok(devPlanBuilder.includes('a phase that adds a screen that `design-spec.md` does not cover'));
  assert.ok(designSpecBuilder.includes('**Under a Goal Wrap** (single work-item or multi-phase): do not interview'));
  // The inferred design is unconfirmed, so it must be surfaced, not passed off as decided.
  assert.ok(goalWrap.includes('lists every such screen as designed without user confirmation'));
});

test('routes hand off forward but stop before changing confirmed work, and side bugs do not hijack a run', () => {
  const constitution = read(CONSTITUTION);
  const devBuilder = read('skills/dev-builder/SKILL.md');
  const devPlanBuilder = read('skills/dev-plan-builder/SKILL.md');
  const designSpecBuilder = read('skills/design-spec-builder/SKILL.md');
  const orchestrator = read('skills/workflow-orchestrator/SKILL.md');

  // One rule decides what "route to" means everywhere, so no call site has to guess.
  assert.ok(constitution.includes('"route to X" hands the work to X in the same run'));
  // Changing what the user approved needs the user, whatever the call site says and in every mode.
  assert.ok(constitution.includes("report why and wait for the user's confirmation, whatever the route's wording and under a Goal Wrap too"));
  // A goal run confirmed nothing it inferred, so routing upstream to fix its own guess must not stop it.
  assert.ok(constitution.includes('Content that a Goal Wrap inferred is not user-confirmed: a route that changes only such content continues, even where it says "and stop"'));
  // Each "route ... and stop" call site points at that rule instead of restating it.
  assert.ok(devBuilder.includes("current story's scope → route to `dev-plan-builder` and stop. Under a Goal Wrap, follow constitution §7 Routing instead."));
  assert.ok(devBuilder.includes('Route and stop. Under a Goal Wrap, follow constitution §7 Routing instead.'));
  assert.ok(devBuilder.includes('route to `dev-plan-builder` Breakdown Mode and stop. Under a Goal Wrap, follow constitution §7 Routing instead.'));
  assert.ok(devPlanBuilder.includes('route to its owner and stop. Under a Goal Wrap, follow constitution §7 Routing instead.'));
  assert.ok(designSpecBuilder.includes('stop for explicit user confirmation. Under a Goal Wrap, follow constitution §7 Routing instead.'));
  // The builder cannot add AC citations itself, so a criterion added upstream reaches the Plan before building resumes.
  assert.ok(devBuilder.includes('After the owner updates its section, route to `dev-plan-builder` so the Plan cites the new criteria before building resumes'));
  // A defect found in passing must not silently abandon the work-item being built; the user picks one of three paths.
  assert.ok(devBuilder.includes('**It surfaces while another work-item is in progress**: report it and ask'));
  assert.ok(devBuilder.includes('(a) start it now, setting the current work aside;'));
  assert.ok(devBuilder.includes('(b) add it to `BACKLOG.md`;'));
  assert.ok(devBuilder.includes('(c) finish the current work first, and raise it again at the end.'));
  // A goal run asks nothing, so the side bug waits for the final report, and is written down so a session break does not lose it.
  assert.ok(devBuilder.includes("Under a Goal Wrap, do not ask. Note the bug in the Execution Record. Finish the current work. Then list the bug in the run's final report."));
  // Five rules defer to "the run's final report"; it must say what it holds, or the deferred items silently vanish.
  assert.ok(orchestrator.includes('When a Goal Wrap ends, finished or stopped, its final report also lists:'));
  assert.ok(orchestrator.includes('every assumption the run recorded, highest risk first;'));
  assert.ok(orchestrator.includes('every design made without user confirmation;'));
  assert.ok(orchestrator.includes('every bug found in passing.'));
  assert.ok(orchestrator.includes('For each bug in the final report, ask whether to start it now'));
  // dev-builder's own end-of-work report is a different report, so it must not share the name.
  assert.ok(devBuilder.includes('**Completion report**'));
  assert.ok(!devBuilder.includes('**Final report**'));
});

test('project tests run in tiers: fast per story, touched-module full tier at the end', () => {
  const planningRules = read('skills/dev-plan-builder/references/planning-rules.md');
  const template = read('skills/dev-plan-builder/references/plan-section-template.md');
  const devPlanBuilder = read('skills/dev-plan-builder/SKILL.md');
  const devBuilder = read('skills/dev-builder/SKILL.md');
  const reviewer = read('skills/code-reviewer/SKILL.md');

  // The final gate builds only the modules the change touches; untouched modules are left to CI, by the user's choice.
  assert.ok(planningRules.includes('The **full tier** builds every module that the change touches'));
  assert.ok(planningRules.includes('even when they depend on a touched module. CI covers those after the push'));
  // A root build file reaches every module, so building only the touched ones would miss its breakage.
  assert.ok(planningRules.includes('a root build file, touches every module. The full tier then builds the whole project'));
  assert.ok(!planningRules.includes("what the project's CI runs, plus the build"));
  // Narrowing is the toolchain's job; an agent guessing "related tests" misses regressions.
  assert.ok(planningRules.includes('never by guessing which tests are related'));
  // Discovered once and reused, not re-derived by every Plan.
  assert.ok(planningRules.includes('record them as a dated entry in `memory/decisions.md`'));
  // Risky stories surface their breakage at the story, not at the end; the risk list lives in one place.
  assert.ok(planningRules.includes('`Tests: full` when it touches shared modules'));
  // A Plan with no story layer has nowhere to put a story tier, so the work-item's full tier and Exit Criteria cover it.
  assert.ok(planningRules.includes('the Exit Criteria take the place of `Done when:`. No `Tests:` line is needed'));
  assert.ok(template.includes('Tests: <fast | full>'));
  assert.ok(template.includes('the full test tier passes in a fresh run'));
  assert.ok(devPlanBuilder.includes('the Plan names no test tiers or a story names no `Tests:` tier'));
  assert.ok(devBuilder.includes('run the test tier the story names'));
  assert.ok(devBuilder.includes('including the full test tier (the build of every touched module, with its tests)'));
  assert.ok(reviewer.includes('the test tier the story names is green at its completion'));
  assert.ok(reviewer.includes('The full tier builds every module that the change touches, with its tests.'));
  assert.ok(template.includes('full `<build of each touched module>` touched modules: <module list>'));
  assert.ok(!template.includes('<duration>'));
});

test('a reported bug is triaged and registered before it is diagnosed', () => {
  const devBuilder = read('skills/dev-builder/SKILL.md');
  const productSpecBuilder = read('skills/product-spec-builder/SKILL.md');

  // Diagnosing before a work-item exists leaves the trail nowhere to live and skips the execution-mode question.
  assert.ok(devBuilder.includes('A reported bug with no work-item yet takes the **Independent bugs** route first'));
  assert.ok(devBuilder.includes('**The bug is your assignment and has no work-item yet**'));
  // A requirement written blind can miss scope-changing facts, so cheap read-only triage feeds it.
  assert.ok(productSpecBuilder.includes('For a Bug Fix, triage before asking'));
  assert.ok(productSpecBuilder.includes('no code changes and no root-cause hunt, which belongs to Diagnosis Mode'));
  // Nothing is written into the Requirement before asking, so triage findings wait for the answers.
  assert.ok(productSpecBuilder.includes('When the questions are answered, record it as observed facts in Existing Context'));
  // Reproducing a data-loss bug is not read-only unless it runs on a copy.
  assert.ok(productSpecBuilder.includes('on a copy or test data, never on real user data'));
});

test('in goal mode the AI owns UI decisions and checks them itself, and says so', () => {
  const designSpecBuilder = read('skills/design-spec-builder/SKILL.md');
  const devPlanBuilder = read('skills/dev-plan-builder/SKILL.md');
  const goalWrap = read(GOAL_WRAP);
  const devBuilder = read('skills/dev-builder/SKILL.md');
  const constitution = read(CONSTITUTION);
  const productSpecBuilder = read('skills/product-spec-builder/SKILL.md');
  const planningRules = read('skills/dev-plan-builder/references/planning-rules.md');
  const planTemplate = read('skills/dev-plan-builder/references/plan-section-template.md');
  const orchestrator = read('skills/workflow-orchestrator/SKILL.md');

  // Goal mode must not stall on design: decisions are inferred and Story 0 does not stop.
  assert.ok(designSpecBuilder.includes('**Under a Goal Wrap** (single work-item or multi-phase): do not interview'));
  assert.ok(goalWrap.includes('Its design is inferred rather than interviewed'));
  // Story 0 exists only for a new screen, so goal mode must not read as always creating one.
  assert.ok(goalWrap.includes('Any Story 0 it needs is recorded `[stop: skip]`'));
  // Goal mode is meant to finish unattended, so no stage may stop to ask; every guess stays visible instead.
  assert.ok(constitution.includes('except a Goal Wrap, which asks nothing once it starts'));
  assert.ok(constitution.includes("is recorded as an assumption (`A-n`), and is listed in the run's final report"));
  // Implementation unknowns ("why is this code shaped like this?") must not stop a goal run either.
  assert.ok(constitution.includes('whether about the requirement, design, plan, or implementation'));
  assert.ok(devBuilder.includes('Under a Goal Wrap, do not ask: keep the existing structure and record the open point in the Execution Record'));
  // A multi-phase run also routes scope gaps to product-spec-builder, so its waiver covers every Goal Wrap.
  assert.ok(productSpecBuilder.includes('**Under a Goal Wrap**: do not interview (constitution §7)'));
  assert.ok(!productSpecBuilder.includes('single-work-item Goal Wrap'));
  assert.ok(productSpecBuilder.includes('Settle every unknown, whatever its risk tag, with its recommended option'));
  assert.ok(productSpecBuilder.includes("record it as an assumption (`A-n`), and have the run's final report list these assumptions"));
  assert.ok(productSpecBuilder.includes('surface the conflict and ask which stands. Under a Goal Wrap, take the recommended option and record it as an assumption (constitution §7)'));
  // Planning's own "ask and stop" rules would otherwise halt the run the requirement stage just kept going.
  assert.ok(devPlanBuilder.includes('Under a Goal Wrap, take the recommended option and record it as an assumption instead'));
  assert.ok(planningRules.includes('Under a Goal Wrap, record the recommended option as an assumption instead.'));
  assert.ok(planTemplate.includes('a required decision is missing. Under a Goal Wrap, record the recommended option as an assumption instead.'));
  assert.ok(!goalWrap.includes('a blocking question still stops the run'));
  // Accepted assumptions must not send the Pre-Spec Gate back into questioning forever.
  assert.ok(productSpecBuilder.includes('or a Goal Wrap has accepted the remaining unknowns as recorded assumptions'));
  // Skipping the user's look is only safe if the agent looks instead, and the unconfirmed design stays visible.
  assert.ok(devBuilder.includes('self-check the artifact against the Design section and `design-spec.md`'));
  assert.ok(designSpecBuilder.includes('each labeled an assumption (`A-n`)'));
  assert.ok(designSpecBuilder.includes('lists these designs as made without user confirmation'));
  // Planning settings are collected before the run starts, so an autonomous run never pauses to plan.
  assert.ok(orchestrator.includes('When the user picks (c), ask once, right away'));
  assert.ok(orchestrator.includes('so planning never stops the run'));
  assert.ok(devPlanBuilder.includes('Inside a Goal Wrap, apply the answers it collected up front, and record whole-work-item granularity'));
  // A new page found mid-run cannot reopen a planning question.
  assert.ok(goalWrap.includes('with the recommended `html` direction source'));
  // Goal mode has no reporting stops, so its intake does not ask a granularity that could add some back.
  assert.ok(orchestrator.includes('A Goal Wrap asks nothing after this intake'));
  assert.ok(orchestrator.includes("the Plan's commit policy, with the options that `dev-plan-builder` Breakdown Mode lists"));
  assert.ok(goalWrap.includes('Its Plan records whole-work-item granularity'));
  // The generic "wait for confirmation" report must not override the goal-mode waivers.
  assert.ok(orchestrator.includes('a Goal Wrap reports and continues'));
});

test('branch commits have a defined home, and a multi-phase run stays on one branch', () => {
  const devBuilder = read('skills/dev-builder/SKILL.md');
  const goalWrap = read(GOAL_WRAP);

  // Later phases build on earlier unmerged phases, so they cannot each branch from mainline.
  assert.ok(devBuilder.includes("on `aipilot/<work-item slug>`, or in a multi-phase Goal Wrap on the run's single `aipilot/<objective slug>` branch"));
  assert.ok(devBuilder.includes('record its name and starting point in the Execution Record'));
  assert.ok(goalWrap.includes("each phase's merge-back is its own commit there, so the user does one git merge into mainline at the end"));
  // "Directly" left the target branch open; auto commits where the work already is.
  assert.ok(devBuilder.includes('`auto` — commit the same way on the current branch'));
});

test('builder and reviewer agree on the review anchor under every commit policy', () => {
  const devBuilder = read('skills/dev-builder/SKILL.md');
  const reviewer = read('skills/code-reviewer/SKILL.md');

  // Under the recommended manual policy there is no new commit, so a git-ref-only reviewer would reject or re-review.
  assert.ok(devBuilder.includes("the next review request names the work-item's starting ref plus the files changed since this review"));
  assert.ok(reviewer.includes("Under `Commit policy: manual`, the anchor is the work-item's starting ref plus the files changed since the previous round"));
});

test('an interrupted merge-back is detected by the final review, not by a story review', () => {
  const constitution = read(CONSTITUTION);

  // Story reviews also pass and are recorded, so "a passed review" would merge a half-built work-item.
  assert.ok(constitution.includes('a passed final code review with no CHANGELOG entry'));
});

test('every design question in the bank is asked as multiple choice', () => {
  const bank = read('skills/design-spec-builder/references/question-bank.md');

  assert.ok(bank.includes('Ask each one as multiple choice (constitution §7)'));
  // Open prompts force the agent to invent options on the fly, so every question in the bank carries its options.
  const questions = bank.split(/\r?\n/).filter(line => line.startsWith('- ') && line.includes('?'));
  assert.ok(questions.length > 30, 'the bank must still hold its questions');
  for (const question of questions) {
    assert.ok(
      / or |from the category|as options|pick all that apply/.test(question),
      `question without options: ${question}`,
    );
  }
  // States that the Completion Standard requires must have a question, or the agent invents them.
  assert.ok(bank.includes('What should success confirm'));
  assert.ok(bank.includes('readable at a glance or from a distance'));
});

test('project documents are written to be read, not just to be complete', () => {
  const constitution = read(CONSTITUTION);
  const planTemplate = read('skills/dev-plan-builder/references/plan-section-template.md');
  const designTemplate = read('skills/design-spec-builder/references/design-spec-template.md');
  const productSpecBuilder = read('skills/product-spec-builder/SKILL.md');

  // "Dense" produced long, many-clause sentences that looked detailed but were hard to review.
  assert.ok(!constitution.includes('dense, no padding'));
  assert.ok(constitution.includes('by this condensed ASD-STE100'));
  // The limits and the one-term rule are what make a document checkable; naming the standard alone is not enough.
  assert.ok(constitution.includes('One idea per sentence: at most 20 words in a step, 25 in a description'));
  assert.ok(constitution.includes('One term, one meaning'));
  assert.ok(constitution.includes('Open each section with its conclusion'));
  // Word limits tempt a writer to drop words, qualifiers, and hedges; a shorter sentence that says something
  // different is not a simplification. The limit is met by splitting, never by cutting meaning.
  assert.ok(constitution.includes('Cut padding, not meaning:'));
  assert.ok(constitution.includes('Never drop words to meet a word limit.'));
  assert.ok(constitution.includes('If a sentence is too long, split it. Keep every condition, number, scope limit, and exception.'));
  assert.ok(constitution.includes('"May" stays "may", and a hedge never becomes a fact.'));
  assert.ok(constitution.includes('When you rewrite or summarize text, add no fact that the original does not state.'));
  // The skill text already followed these two rules, but the documents it writes did not have to.
  assert.ok(constitution.includes('Put a condition before its action: "If <condition>, <action>."'));
  assert.ok(constitution.includes('Use a vertical list for three or more items, steps, or options.'));
  // The required version stamp is metadata, so it must not count as a section that buries its conclusion.
  assert.ok(constitution.includes('a metadata line, such as the version stamp, may come before it'));
  // An acceptance criterion with several results cannot pass or fail as one unit.
  assert.ok(constitution.includes('one trigger and one result each, as "When <trigger>, the system shall <result>"'));
  // A static design check has no trigger, so EARS needs its triggerless form too.
  assert.ok(constitution.includes('for a check with no trigger, "The system shall <result>"'));
  assert.ok(designTemplate.includes('When <trigger>, the system shall <observable result>.'));
  // STE and EARS are English standards, so the document language is fixed rather than left to each run.
  assert.ok(constitution.includes('write every project document in English, whatever the conversation language'));
  // A task and its Verify stay on one line so an inserted task cannot detach them; the label marks the sentence break instead.
  assert.ok(constitution.includes('A template field label, such as `— Verify:` or `Done when:`, starts a new sentence'));
  assert.ok(planTemplate.includes('<smallest coherent change> — Verify:'));
  // Fixed text is copied into every document, so it must meet the same rules.
  assert.match(planTemplate, /Stop and ask the user when:\r?\n- a required decision is missing\./);
  assert.ok(planTemplate.includes('Under `[stop: skip]`, leave out its STOP line'));
  // A writer dropped the second sentence when it was unclear whether it belonged to the stamp.
  assert.ok(productSpecBuilder.includes('with these two sentences, as written: "Version <n>, <date>. Each later version states what changed and why."'));
  // A Goal Wrap writes specs the user never confirmed, so the stamp must not claim they were.
  assert.ok(!productSpecBuilder.includes('decisions confirmed as of this date'));
});

test('non-goals have one home, and a known risk becomes a check instead of a reviewer note', () => {
  const constitution = read(CONSTITUTION);
  const productSpecBuilder = read('skills/product-spec-builder/SKILL.md');
  const planTemplate = read('skills/dev-plan-builder/references/plan-section-template.md');
  const codeReviewer = read('skills/code-reviewer/SKILL.md');

  // Two Non-Goals blocks with no split made writers either repeat the list or leave a pointer stub.
  assert.ok(constitution.includes('the scope with its product non-goals'));
  assert.ok(constitution.includes('and implementation non-goals'));
  assert.ok(productSpecBuilder.includes('These are product non-goals; the Plan holds implementation ones'));
  assert.ok(planTemplate.includes('Non-Goals here are implementation exclusions only. Product non-goals live in the Requirement'));
  // Real Review Focus lists mostly restated the acceptance criteria that the reviewer checks anyway.
  // A known risk is worth more as a check that runs every time, citing the criterion that it protects.
  assert.ok(!planTemplate.includes('### Review Focus'));
  assert.ok(planTemplate.includes('When you know a risk at planning time, give it a task or a `— Verify:` that catches it.'));
  assert.ok(planTemplate.includes('If no test can check a constraint, write it as a Stop Condition or a Non-Goal.'));
  assert.ok(!codeReviewer.includes('Review Focus'));
});

test('rules that several skills need are stated once, and the others point to them', () => {
  const constitution = read(CONSTITUTION);
  const releaseBuilder = read('skills/release-builder/SKILL.md');
  const doctrine = read('skills/product-spec-builder/references/interview-doctrine.md');
  const devBuilder = read('skills/dev-builder/SKILL.md');

  // Two copies of the release marker format had already drifted apart.
  assert.ok(constitution.includes('`RELEASE <version or channel> — <timestamp>`'));
  assert.ok(releaseBuilder.includes('in the format of constitution §2'));
  assert.ok(!releaseBuilder.includes('RELEASE <version'));
  // The high-risk list is the constitution's; the doctrine only says what it covers in interviews.
  assert.ok(doctrine.includes('the constitution §7 list'));
  // Story 0 direction options live in planning-rules; the builder points there.
  assert.ok(devBuilder.includes('offering the options in `planning-rules.md` Story 0'));
});

test('a lasting preference is captured from any stage, and note-keeper finds the documents root alone', () => {
  const constitution = read(CONSTITUTION);
  const noteKeeper = read('skills/note-keeper/SKILL.md');

  // Without a pointer, a preference stated mid-build lives only in the current conversation.
  assert.ok(constitution.includes('invoke `note-keeper`, a capture reflex rather than a stage'));
  // note-keeper often fires on its own, so it needs the constitution path, not just "constitution §7".
  assert.ok(noteKeeper.includes('`../workflow-orchestrator/references/document-system-spec.md` §7'));
});

test('startup, review, and overlay checks keep the rules the rewrite had dropped', () => {
  const orchestrator = read('skills/workflow-orchestrator/SKILL.md');
  const runtime = read('skills/workflow-orchestrator/references/review-runtime.md');
  const devBuilder = read('skills/dev-builder/SKILL.md');
  const backendChecks = read('skills/java-backend-expert/references/backend-checks.md');

  // Deferred work, including bugs a Goal Wrap listed, must shape "what next?".
  assert.ok(orchestrator.includes('`BACKLOG.md` when deferred items may shape the next step'));
  // design-spec-builder calls the runtime from another skill, so the placeholder must name one directory.
  assert.ok(runtime.includes('`<this-skill>` in every command below is the `workflow-orchestrator` skill directory'));
  // Trust and integration boundaries need the maintainability checks even when no domain logic changes.
  assert.ok(devBuilder.includes('an integration or trust boundary'));
  // API changes such as POST → PUT or a reversed layer dependency need a checklist line to be caught.
  assert.ok(backendChecks.includes('Name the route and HTTP method'));
  assert.ok(backendChecks.includes('Dependencies point one way: controllers → services → repositories'));
  assert.ok(backendChecks.includes('contract tests when an API contract changes'));
  assert.ok(backendChecks.includes('unless required and the risk is accepted'));
});

test('interview reading is paid only by stages that interview', () => {
  const productSpecBuilder = read('skills/product-spec-builder/SKILL.md');
  const designSpecBuilder = read('skills/design-spec-builder/SKILL.md');

  // The fast track and a Goal Wrap never interview, so they skip the doctrine except its boundary sections.
  assert.ok(productSpecBuilder.includes('Before a full interview, read `references/interview-doctrine.md`'));
  assert.ok(productSpecBuilder.includes('they read only its first two sections. These are the Product vs Design Boundary and the Product vs Plan Boundary'));
  assert.ok(designSpecBuilder.includes('A Goal Wrap does not interview, so it reads only the doctrine'));
});

test('every question comes before the spec is written, and the review offer comes last', () => {
  const constitution = read(CONSTITUTION);
  const productSpecBuilder = read('skills/product-spec-builder/SKILL.md');

  // A live run wrote assumptions it wanted confirmed, then asked only "review in the browser?", so the confirmations were never asked.
  assert.ok(constitution.includes('neither is asking the user, after the work exists, to confirm a decision you made'));
  // Asking about every class name would bury the user; the agent judges which decisions need them.
  assert.ok(constitution.includes('Which decisions need the user is your judgment: ask those before writing'));
  assert.ok(constitution.includes('a class name rarely needs the user; one that clashes with an existing name may'));
  // The review offer closes the stage, so nothing may still be waiting for an answer when it appears.
  assert.ok(constitution.includes('Finish the stage first: every question it needs is asked and answered, and the deliverable is written'));
  assert.ok(constitution.includes('it is never folded into the review offer'));
  // The report must be visible: the question in that run said "the key decisions are above" when nothing was above.
  assert.ok(constitution.includes('as chat text before any question'));
  assert.ok(productSpecBuilder.includes('If a decision still needs the user, ask about it before writing (constitution §7), never in the stage report'));
});

test('implementation approaches are explored, gated, ranked, and chosen by the builder', () => {
  const devBuilder = read('skills/dev-builder/SKILL.md');
  const devPlanBuilder = read('skills/dev-plan-builder/SKILL.md');
  const reviewer = read('skills/code-reviewer/SKILL.md');
  const orchestrator = read('skills/workflow-orchestrator/SKILL.md');

  // A model tends to build its first idea, so candidates are listed before code, across different strategies.
  assert.ok(devBuilder.includes('List every candidate that takes a different direction, up to 10. Variants of one idea are one candidate.'));
  // A blind test (2026-10-07) found no loss without a menu of typical candidates, which could anchor the search.
  assert.ok(!devBuilder.includes('Typical candidates are these'));
  assert.ok(devBuilder.includes('Make each one the best version of its strategy'));
  // Skipping obvious tasks keeps the discipline from slowing every change down.
  assert.ok(devBuilder.includes('Skip it when the way is obvious or the Plan already fixed it'));
  // Touching unrelated code or weakening tests is disqualifying, not merely a lower rank.
  assert.ok(devBuilder.includes('violates the Surgical changes or Keep existing tests rule in the Engineering Rules'));
  // Read literally, "breaks existing tests" would drop every candidate of a UI task, since its snapshot must change.
  assert.ok(devBuilder.includes('a test that changes because the requirement changed does not count'));
  assert.ok(devBuilder.includes('never weaken, skip, or delete a test to make a change pass'));
  assert.ok(devBuilder.includes('Run a formatter only over the lines you change, unless CI formats whole files'));
  // "Best" needs one fixed order, or minimal-change and cleaner candidates win at random.
  const order = ['1. reuse before new code', '2. smallest blast radius:', '3. consistency', '4. simplicity:', '5. testability', '6. reversibility', '7. runtime qualities'];
  let last = -1;
  for (const criterion of order) {
    const at = devBuilder.indexOf(criterion);
    assert.ok(at > last, `ranking criterion out of order or missing: ${criterion}`);
    last = at;
  }
  assert.ok(devBuilder.includes('prefer a cleaner candidate only if it still passes the scope gate'));
  // Within reuse, the existing Reuse Scan order breaks ties, so project code beats the standard library.
  assert.ok(devBuilder.includes("preferring sources in the Reuse Scan's order"));
  // A deciding claim is checked, not assumed, including the claims the Gate itself depends on.
  assert.ok(devBuilder.includes('**Evidence** (at any step): when a claim decides a gate or a ranking'));
  assert.ok(devBuilder.includes('check it with a probe that leaves project files untouched'));
  // The builder decides; only user-owned trade-offs reach the user.
  assert.ok(devBuilder.includes('choose the best candidate yourself. Ask a §7 question, led by your recommendation and its trade-off, only when the choice adds a dependency'));
  // An approach that turns out wrong is reconsidered instead of forced through.
  assert.ok(devBuilder.includes('stop forcing it. Return to the Gate with the new evidence, and record why the approach changed'));
  assert.ok(devBuilder.includes('When the root cause allows more than one fix, choose it by the Approach Decision Discipline'));
  // Plan-shaping choices are made before the Plan, by the same rules.
  assert.ok(devPlanBuilder.includes("choose it by `dev-builder`'s Approach Decision Discipline"));
  // The reviewer checks what the builder promised, and a goal run shows the choices it made alone.
  assert.ok(reviewer.includes('or an existing test weakened, skipped, or deleted without a requirement change, is a finding'));
  assert.ok(orchestrator.includes('every approach choice that would otherwise have been asked'));
});

test('workflow terms keep one meaning, and their retired synonyms stay out of the skills', () => {
  const constitution = read(CONSTITUTION);

  // Several retest failures came from one word with two meanings ("final report", "merge", "confirmed").
  assert.ok(constitution.includes('## 9. Terms'));
  for (const term of ['**stop**', '**ask**', '**confirm**', '**assumption**', '**route to X**', '**Goal Wrap**', '**stage**', '**code review**', '**browser review**', '**stage report**', '**completion report**', '**final report**', '**merge-back**', '**git merge**',
    '**the user**', '**end users**', '**execution mode**', '**blocker**', '**blocking question**', '**scope type**', '**review scope**', '**release scope**', '**fresh**', '**evidence**']) {
    assert.ok(constitution.includes(term), `glossary must define ${term}`);
  }
  // The glossary only helps if the old words do not creep back in later edits.
  const skillFiles = [];
  const walk = dir => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) { if (entry.name !== 'vendor') walk(full); } else if (full.endsWith('.md')) skillFiles.push(full);
    }
  };
  walk(path.join(root, 'skills'));
  const retired = [
    [/\b[Hh]alt\b/, 'use "stop"'],
    [/\bhand (to|control)\b|\bhand-off\b/, 'use "route to" or "handoff"'],
    [/\b(completion|stage) summary\b/, 'use "stage report"'],
    [/\bexplicitly approved\b/, 'use "confirmed"'],
    [/(?<!git )\bmerges?\b(?!-back| map)/, 'use "merge-back", "merged", or "git merge"'],
    // "Users" alone mixed up the person working with AIPilot and the product's end users.
    [/(?<!\b(end|power) )\busers\b/i, 'use "the user" or "end users"'],
    [/\b(the|chosen|no) mode\b/, 'name the mode: "execution mode", "planning mode", or a capitalized skill mode'],
    [/Stop Conditions block\b/, 'use "Stop Conditions section"'],
  ];
  for (const file of skillFiles) {
    // The frontmatter description routes the skill and stays as written, so only the body is checked.
    const text = fs.readFileSync(file, 'utf8').replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n/, '')
      .replace(/"Halt" and "pause" are not used for it\./, '');
    for (const [pattern, hint] of retired) {
      const hit = text.match(pattern);
      assert.ok(!hit, `${path.relative(root, file)}: "${hit && hit[0]}" — ${hint} (constitution §9)`);
    }
  }
});

test('skill text keeps every sentence at 25 words or fewer', () => {
  // Retests kept finding misreadings inside long, many-clause sentences, so the skill text follows the
  // same condensed ASD-STE100 limit as the documents it writes. Frontmatter, headings, and code are not prose.
  const files = [path.join(root, 'commands/aipilot.md')];
  const walk = dir => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) { if (entry.name !== 'vendor') walk(full); } else if (full.endsWith('.md')) files.push(full);
    }
  };
  walk(path.join(root, 'skills'));
  const tooLong = [];
  for (const file of files) {
    const body = fs.readFileSync(file, 'utf8').replace(/\r\n/g, '\n')
      .replace(/^---\n[\s\S]*?\n---\n/, '').replace(/```[\s\S]*?```/g, '');
    for (let line of body.split('\n')) {
      line = line.trim();
      if (!line || /^#/.test(line) || /^\|?[\s:|-]+\|?$/.test(line)) continue;
      const cells = line.startsWith('|') ? line.split('|').map(c => c.trim()).filter(Boolean) : [line];
      for (let cell of cells) {
        cell = cell.replace(/^>\s*/, '').replace(/^[-*]\s+/, '').replace(/^\d+\.\s+/, '').replace(/\*\*|`/g, '');
        for (const sentence of cell.split(/(?<=[.!?])\s+|\s+—\s*(?=Verify:)/)) {
          const words = sentence.split(/\s+/).filter(w => /[A-Za-z0-9]/.test(w)).length;
          if (words > 25) tooLong.push(`${path.relative(root, file)} (${words} words): ${sentence.slice(0, 80)}`);
        }
      }
    }
  }
  assert.deepStrictEqual(tooLong, [], 'split each long sentence (constitution §7 Writing)');
});

test('a UI request that breaks common conventions is challenged before it is built', () => {
  const constitution = read(CONSTITUTION);
  const orchestrator = read('skills/workflow-orchestrator/SKILL.md');

  // Users are often not designers, so following every UI request literally builds screens that fight user habits.
  assert.ok(constitution.includes('the user is often not a UI or UX designer. Check each request about screens, components, or interactions'));
  assert.ok(constitution.includes('Name the convention and what it costs end users.'));
  assert.ok(constitution.includes('Recommend the conventional option first.'));
  assert.ok(constitution.includes('Follow the request only if the user still chooses it.'));
  // A deliberate deviation is recorded, so a later change or review does not "fix" it back.
  assert.ok(constitution.includes('record it as a deliberate deviation with its reason'));
  // Accessibility failures hurt every user and can carry compliance risk, so they need an explicit acceptance.
  assert.ok(constitution.includes("A request below WCAG 2.2 AA needs the user's explicit acceptance of the risk"));
  // A goal run cannot ask, so it builds the conventional option and shows what it overrode.
  assert.ok(constitution.includes('Under a Goal Wrap, follow the convention and list each overridden request in the final report'));
  assert.ok(orchestrator.includes('every UI request a convention overrode (the request, what was built, and why)'));
});

test('fixes from the post-rewrite retests stay in place', () => {
  const devBuilder = read('skills/dev-builder/SKILL.md');
  const devPlanBuilder = read('skills/dev-plan-builder/SKILL.md');
  const orchestrator = read('skills/workflow-orchestrator/SKILL.md');
  const reviewer = read('skills/code-reviewer/SKILL.md');
  const planningRules = read('skills/dev-plan-builder/references/planning-rules.md');
  const productSpecBuilder = read('skills/product-spec-builder/SKILL.md');

  // Fixes can break tests the task's own Verify does not cover, so the re-review sees a fresh story tier.
  assert.ok(devBuilder.includes("When you have handled all findings of the round, rerun the story's test tier and record the fresh evidence. Then rerun the review."));
  // Each section has one owner, so moving deferred criteria is routed, and design criteria are not merged early.
  assert.ok(devPlanBuilder.includes('`product-spec-builder` moves them in the Requirement, and `design-spec-builder` moves them in the Design section'));
  // "Never stop to ask" covers review findings only; a dependency or other blocker still reaches the user.
  assert.ok(orchestrator.includes('never stop to ask about code review findings'));
  assert.ok(orchestrator.includes('A blocker still stops the run for the user'));
  // The first manual round has no previous round to diff from.
  assert.ok(reviewer.includes('In the first round, list the files changed since the start'));
  // The last phase always has an empty Enables line, so it must not be collapsed by that rule.
  assert.ok(planningRules.includes('If a phase other than the last has an empty Enables line'));
  // "Review" already has three kinds; the stage report's highlight is not a fourth.
  assert.ok(productSpecBuilder.includes('**Highest-risk decisions**'));
  assert.ok(!productSpecBuilder.includes('Final user review'));
  // Candidates dropped at the gate and candidates that lost the ranking are both recorded.
  assert.ok(devBuilder.includes('each other candidate with the gate that it failed or the criterion that it lost on'));
  // A Goal Wrap fixes the granularity, so the builder must not stop to ask for a confirmation nobody gave.
  assert.ok(devBuilder.includes('Under a Goal Wrap, use whole-work-item granularity without asking.'));
  // Every later-phase item, not only its criteria, waits for its phase, and the Impact maps match the first phase.
  assert.ok(devPlanBuilder.includes('These items are acceptance criteria, assumptions, and non-goals.'));
  assert.ok(devPlanBuilder.includes('Each owner also trims its Impact map to the first phase.'));
  // Only a phase without a recorded mode falls back to (a); a multi-phase Goal Wrap keeps running.
  assert.ok(orchestrator.includes('a roadmap phase that starts with no recorded execution mode'));
});

test('diagrams use a Mermaid subset that draws readably on the review page, and a script checks them', () => {
  const constitution = read(CONSTITUTION);

  // Text diagrams showed as raw code on the review page, where reviewers expect a picture.
  assert.ok(constitution.includes('a visual flow sized to the change, drawn per §7 Diagrams'));
  assert.ok(constitution.includes('draw every diagram as a Mermaid flowchart, never as ASCII art'));
  assert.ok(constitution.includes('In the Quick Overview, every code block is a Mermaid block.'));
  assert.ok(constitution.includes('every label is in double quotes'));
  // Long Java names made left-to-right diagrams too wide, and Mermaid drew unordered tracks After first.
  assert.ok(constitution.includes('every diagram starts with `flowchart TD`'));
  assert.ok(constitution.includes('subgraphs, such as Before and After tracks, stack top-down too'));
  assert.ok(constitution.includes('has `direction TB` as its first line'));
  assert.ok(constitution.includes('`BEFORE ~~~ AFTER`. Without it, Mermaid may draw After first'));
  // The rule binds only because the writer runs the deterministic check and fixes what it reports.
  assert.ok(constitution.includes('run `node <workflow-orchestrator>/scripts/check-mermaid.js <doc.md>`'));
  assert.ok(constitution.includes('run the check again until it passes'));
  assert.ok(fs.existsSync(path.join(root, 'skills/workflow-orchestrator/scripts/check-mermaid.js')));
});

test('the spec states what a mechanism must meet, and the plan chooses the mechanism', () => {
  const doctrine = read('skills/product-spec-builder/references/interview-doctrine.md');
  const productSpecBuilder = read('skills/product-spec-builder/SKILL.md');
  const devPlanBuilder = read('skills/dev-plan-builder/SKILL.md');
  const planTemplate = read('skills/dev-plan-builder/references/plan-section-template.md');

  // A live run wrote "the switch is an environment variable" as an assumption, so the plan never
  // compared it with the job configuration field that the module already used per country.
  assert.ok(doctrine.includes('## Product vs Plan Boundary'));
  assert.ok(doctrine.includes('If two mechanisms could both meet the stated constraints, the choice belongs to the plan'));
  assert.ok(doctrine.includes('Never record a mechanism choice as an assumption (`A-n`)'));
  // A file path that consumers read is still a contract, so it stays in the spec.
  assert.ok(doctrine.includes('that form is a contract. It belongs to the spec'));
  // The spec still asks who controls a switch; only the answers' form is constrained.
  assert.ok(productSpecBuilder.includes('**Control provenance**'));
  assert.ok(productSpecBuilder.includes('Record the answers as constraints. Leave the mechanism to the plan'));
  assert.ok(productSpecBuilder.includes('**deferred to plan**'));
  assert.ok(productSpecBuilder.includes('Have I written a mechanism choice into a requirement or an assumption?'));
  assert.ok(productSpecBuilder.includes('Approach suggestions belong in the Plan\'s Approach Decisions'));
  // The plan settles every deferred choice by the existing discipline, with the spec's constraints as gates.
  assert.ok(devPlanBuilder.includes("Each `[plan]` line in the Requirement's Deferred Choices is such a choice"));
  assert.ok(devPlanBuilder.includes('a `[plan]` line in Deferred Choices has no recorded choice'));
  // Premises make a later proposal to switch approach checkable against evidence instead of taste.
  assert.ok(devPlanBuilder.includes('the dropped candidates, and the premises of the choice'));
  assert.ok(planTemplate.includes('- (P1) <checkable claim that the choice relies on>'));
});

test('a builder challenges a planned approach with evidence, and a clean-context arbiter rules on it', () => {
  const constitution = read(CONSTITUTION);
  const orchestrator = read('skills/workflow-orchestrator/SKILL.md');
  const devBuilder = read('skills/dev-builder/SKILL.md');
  const devPlanBuilder = read('skills/dev-plan-builder/SKILL.md');

  // The Plan owns its approach choices; a builder that quietly swaps one bypasses the plan's comparison.
  assert.ok(devBuilder.includes('## Approach Challenge'));
  assert.ok(devBuilder.includes('Never change such a choice yourself'));
  assert.ok(devBuilder.includes('An approach choice that the Approach Decisions record changes only through an Approach Challenge'));
  // Taste is not evidence: only a broken premise or a better unlisted candidate opens a challenge.
  assert.ok(devBuilder.includes('Evidence contradicts a premise that the Approach Decisions record'));
  assert.ok(devBuilder.includes('A preference without evidence is not a trigger'));
  // The proposer cannot judge its own proposal, so the arbiter gets the documents, not the conversation.
  assert.ok(devBuilder.includes('Do not give it this conversation'));
  assert.ok(devPlanBuilder.includes('## Arbitration Mode'));
  assert.ok(devPlanBuilder.includes('Judge only the challenge, the work-item, and the code. Change no project file'));
  // Two instances of one model agree too easily, so the exchange ends after two rulings.
  assert.ok(devBuilder.includes('Allow at most two rulings'));
  // Outside goal mode the user owns a confirmed Plan; in goal mode the arbiter decides and the run continues.
  assert.ok(devBuilder.includes('**Switch**: outside a Goal Wrap, ask the user (constitution §7)'));
  assert.ok(devPlanBuilder.includes('Under a Goal Wrap, never rule Escalate. Rule Keep or Switch instead'));
  assert.ok(constitution.includes('under a Goal Wrap, an Approach Challenge ruling may change an approach choice in a user-confirmed Plan without a stop'));
  // Sub-agents stay judges; implementation never leaves the main agent.
  assert.ok(devBuilder.includes('Implementation never runs in sub-agents. Sub-agents are clean-context judges only'));
  assert.ok(orchestrator.includes('the arbiter of an Approach Challenge, run by `dev-builder` in `dev-plan-builder` Arbitration Mode'));
  assert.ok(orchestrator.includes('every Approach Challenge and its ruling'));
  assert.ok(constitution.includes('**Approach Challenge**'));
});

test('code names follow one shared naming rule, and only the project form comes from the surrounding code', () => {
  const constitution = read(CONSTITUTION);
  const devBuilder = read('skills/dev-builder/SKILL.md');
  const reviewer = read('skills/code-reviewer/SKILL.md');
  const backendChecks = read('skills/java-backend-expert/references/backend-checks.md');

  // A live run wrote `List<ExchangeConfiguration> enabled`: an adjective named a list, and no rule caught it.
  assert.ok(constitution.includes('- **Code naming (all skills)**'));
  assert.ok(constitution.includes('Name each value by its role, not by its type'));
  assert.ok(constitution.includes('a collection: a plural noun for its elements'));
  assert.ok(constitution.includes('It never stands alone as the name of a non-boolean value'));
  assert.ok(constitution.includes('Do not use the `keyToValue` form'));
  assert.ok(constitution.includes('Name each method with a verb or a verb phrase'));
  // The rules choose words only; case and prefix stay with the language and the project.
  assert.ok(constitution.includes('The language and the project decide the form of a name'));
  // Contract-bound names and untouched names stay as they are.
  assert.ok(constitution.includes('If an external contract or a framework fixes a name, keep that name'));
  assert.ok(constitution.includes('Do not rename an existing name only to follow them'));
  assert.ok(constitution.includes('Only a naming convention in `memory/agent-guideline.md` overrides them'));
  // Every "follow the surrounding code" rule must step aside for naming, or it pulls names back to the old style.
  assert.ok(devBuilder.includes('Naming is the exception: follow constitution §7 Code naming'));
  assert.ok(devBuilder.includes("consistency with the surrounding code's structure and layering"));
  assert.ok(!devBuilder.includes('structure, naming, and layering'));
  // The clean-context reviewer reads only the constitution, so the rule text lives there.
  assert.ok(reviewer.includes('Added or renamed names follow constitution §7 Code naming'));
  assert.ok(backendChecks.includes('Name values and methods by constitution §7 Code naming'));
  assert.ok(!backendChecks.includes('naming conventions'));
});

test('a work-item has one fixed structure, with no empty or duplicate subsections', () => {
  const constitution = read(CONSTITUTION);
  const productSpecBuilder = read('skills/product-spec-builder/SKILL.md');
  const devBuilder = read('skills/dev-builder/SKILL.md');
  const designSpecBuilder = read('skills/design-spec-builder/SKILL.md');

  // 41 of 47 real work-items carried an Impact map that only said there was no product-spec.md.
  assert.ok(productSpecBuilder.includes('Never write a subsection that only says "None".'));
  assert.ok(productSpecBuilder.includes('Write it only when `product-spec.md` exists and the change alters it.'));
  assert.ok(constitution.includes('Without the map, leave `product-spec.md` unchanged.'));
  // The Quick Overview already holds the summary, and scope, non-goals, and out-of-scope said the same thing.
  assert.ok(productSpecBuilder.includes('The Quick Overview holds the summary, so the Requirement has no Summary.'));
  assert.ok(productSpecBuilder.includes('2. **Scope**: an `#### In scope` list and an `#### Out of scope` list.'));
  // Out of scope reads like In scope: plain bullets. NG-n numbers only the Plan's implementation non-goals.
  assert.ok(productSpecBuilder.includes('Write both as plain bullets, with no IDs.'));
  assert.ok(!productSpecBuilder.includes('**Non-Goals** (`NG-n`)'));
  assert.ok(constitution.includes('`NG-n`: implementation non-goals in the Plan.'));
  // Functional requirements restated the criteria and drifted from them; plans and reviews cite only AC-n.
  assert.ok(!productSpecBuilder.includes('Functional Requirements'));
  assert.ok(!productSpecBuilder.includes('Implementation Notes'));
  // Edge cases become testable criteria, so plans and code reviews cover them. Old EC-n IDs stay valid.
  assert.ok(productSpecBuilder.includes('Then write the boundary and error cases in the same list.'));
  assert.ok(!productSpecBuilder.includes('#### Boundary and error cases'));
  assert.ok(productSpecBuilder.includes('"If <unwanted event>, then the system shall <result>"'));
  assert.ok(constitution.includes('`EC-n`: edge cases, only in older documents.'));
  // Hand-offs to design and plan stay, in one subsection that exists only when it has content.
  assert.ok(productSpecBuilder.includes('7. **Deferred Choices**: one line for each choice that another stage settles.'));
  assert.ok(designSpecBuilder.includes("Settle each `[design]` line in the Requirement's Deferred Choices."));
  // 46 of 47 work-items carried a Design heading that said "not applicable".
  assert.ok(constitution.includes('If the change has no UI surface, leave out the Design heading'));
  assert.ok(designSpecBuilder.includes('If the work-item has no `## Design` heading, add it after the Requirement.'));
  // Execution Records used five names for the same entry, so readers could not find the review or the risks.
  assert.ok(devBuilder.includes('## Execution Record Format'));
  assert.ok(devBuilder.includes('### Completion — <YYYY-MM-DD>'));
  assert.ok(constitution.includes("`dev-builder`'s Execution Record Format defines the entries."));
});
test('a plan opens with its approach decisions, one table per choice, and reuse notes hold only reuse', () => {
  const planTemplate = read('skills/dev-plan-builder/references/plan-section-template.md');
  const devPlanBuilder = read('skills/dev-plan-builder/SKILL.md');
  const devBuilder = read('skills/dev-builder/SKILL.md');

  // Approach records inside Reuse Notes ran to about 95 words each, so readers could not compare the candidates.
  const plan = planTemplate.slice(planTemplate.indexOf('## Plan'));
  assert.ok(plan.indexOf('### Approach Decisions') < plan.indexOf('### Story 0'), 'the decisions come before the stories that follow from them');
  assert.ok(planTemplate.includes('| Candidate | How it works | Strengths | Weaknesses | Result |'));
  assert.ok(planTemplate.includes('Dropped: <failed gate or lost criterion>'));
  assert.ok(!planTemplate.includes('- Approach for <choice>'));
  assert.ok(planTemplate.includes('Reuse Notes record only what the stories reuse'));
  // Premises stay, because an Approach Challenge and the arbiter judge a recorded choice by them.
  assert.ok(planTemplate.includes('Number the premises across the whole Plan: P1, P2, and so on.'));
  assert.ok(devPlanBuilder.includes("the premises of the choice in the Plan's Approach Decisions."));
  assert.ok(devPlanBuilder.includes('It marks the old decision heading `[superseded]`. It adds the new decision after it.'));
  assert.ok(devBuilder.includes('The Plan owns each approach choice that its Approach Decisions record.'));
  assert.ok(!devBuilder.includes('Reuse Notes record'));
});
test('a failed premise has one path, an Approach Challenge, never a Stop Condition', () => {
  const planTemplate = read('skills/dev-plan-builder/references/plan-section-template.md');
  const devPlanBuilder = read('skills/dev-plan-builder/SKILL.md');

  // A real plan listed "Task 1.2 fails, so the F2 reasoning falls" as a stop, so the builder would stop at once
  // instead of letting an arbiter judge the premise. One premise must not trigger two different paths.
  assert.ok(planTemplate.includes('Never write a premise as a Stop Condition.'));
  assert.ok(planTemplate.includes('When a premise fails, `dev-builder` raises an Approach Challenge, and an arbiter rules on it.'));
  assert.ok(devPlanBuilder.includes('- a Stop Condition restates a premise;'));
  // Plan-specific stops stay: units run alone, and the builder executes the Plan's list, not a memorized one.
  assert.ok(planTemplate.includes('- <a stop that is specific to this change>'));
  assert.ok(planTemplate.includes('After them, add the stops that are specific to this change.'));
});

test('a phase with a UI surface always has a Design section, so its design criteria are planned and reviewed', () => {
  const constitution = read(CONSTITUTION);
  const devPlanBuilder = read('skills/dev-plan-builder/SKILL.md');
  const devBuilder = read('skills/dev-builder/SKILL.md');
  const reviewer = read('skills/code-reviewer/SKILL.md');

  // The planner splits confirmed requirements into phases; the constitution named only product-spec-builder,
  // so a strict reader treated the planner's phase Requirement as a section written by the wrong owner.
  assert.ok(constitution.includes('## Requirement        <- product-spec-builder (dev-plan-builder on phase-derived items)'));
  assert.ok(constitution.includes('`dev-plan-builder` writes the Quick Overview and the Requirement from these sources, and never invents content.'));
  // Plans cite only the Requirement and Design sections. A UI phase without a Design section left every
  // design-spec D-n outside the Plan and the final code review.
  assert.ok(devPlanBuilder.includes('every story or task AC traces to a criterion in the Requirement or Design section'));
  assert.ok(constitution.includes('A phase with a UI surface always has a Design section'));
  assert.ok(constitution.includes('Plans and code reviews cite these `D-n` like any other Design criterion.'));
  // Screens that design-spec.md already covers hold no design decision, so they cost no extra stage or stop.
  assert.ok(constitution.includes('`dev-plan-builder` writes a reference-only Design section'));
  assert.ok(constitution.includes('Otherwise, `design-spec-builder` writes the Design section before breakdown.'));
  assert.ok(devPlanBuilder.includes('by constitution §3 Phase-derived items'));
  // "No Design section" and "an empty Design section" gave three shapes for one case; one rule remains.
  assert.ok(!devPlanBuilder.includes('A phase work-item without a Design section is normal'));
  assert.ok(!devBuilder.includes('An empty Design section'));
  assert.ok(devBuilder.includes('A reference-only Design section on a phase work-item is complete'));
  assert.ok(!reviewer.includes('all five sections'), 'a change without a UI surface has only four sections');
});

test('merge-back is committed on the work branch, so one git merge carries the code and the documents', () => {
  const constitution = read(CONSTITUTION);
  const goalWrap = read(GOAL_WRAP);

  // The last code commit came before the Completion entry and the merge-back, so the branch the user merged
  // lacked the spec updates, and the working tree stayed dirty.
  const commitStep = constitution.indexOf("6. If the Plan's `Commit policy` is `branch` or `auto`, commit the merge-back as one commit");
  assert.ok(commitStep > 0);
  assert.ok(commitStep > constitution.indexOf('5. For a phase work-item'), 'the commit comes last, so it holds the moved work-item');
  assert.ok(constitution.includes('The commit holds the Completion entry, the changes of steps 1–5, and the moved work-item.'));
  // There is nothing to commit when the user commits, when there is no git, or when the documents live elsewhere.
  assert.ok(constitution.includes("Commit nothing under `manual`, in a project without a repository, or when the documents root is not in the project's repository."));
  // The multi-phase wrap already committed each merge-back; it now points to the one rule.
  assert.ok(goalWrap.includes('one git merge into mainline at the end (constitution §6)'));
});

test('user stories and task groups share one number sequence, so every story and task has one name', () => {
  const planningRules = read('skills/dev-plan-builder/references/planning-rules.md');

  // With separate sequences, "Story 1" and "Task 1.1" each named two units: citations, code review scopes,
  // and the review page's anchors (story-1, task-1-1) pointed at either one.
  assert.ok(planningRules.includes('User Stories and Task Groups share one number sequence after Story 0'));
  assert.ok(planningRules.includes('A task number starts with its story or group number, such as Task 2.1.'));
});

test('requirement criteria are numbered AC-n to match their heading, and older R-n stay valid', () => {
  const constitution = read(CONSTITUTION);
  const planTemplate = read('skills/dev-plan-builder/references/plan-section-template.md');

  // "R-1" under an "Acceptance Criteria" heading read as a requirement number, not as a criterion.
  assert.ok(constitution.includes('`AC-n`: requirement acceptance criteria.'));
  assert.ok(constitution.includes('9. Acceptance criteria (`AC-n`, `D-n`)'));
  assert.ok(planTemplate.includes('(AC: AC-3, D-1)'));
  // IDs already cited downstream never change, and one document never mixes two prefixes for one kind.
  assert.ok(constitution.includes('Older documents number them `R-n`, and those IDs stay valid.'));
  assert.ok(constitution.includes('An older document keeps `R-n` for its new criteria too'));
  // Only that compatibility note may still name R-n; any other mention would tell a writer to use it.
  const mentions = [];
  const walk = dir => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) { if (entry.name !== 'vendor') walk(full); } else if (full.endsWith('.md')) {
        for (const line of fs.readFileSync(full, 'utf8').split(/\r?\n/)) {
          if (/\bR-(n|\d+)\b/.test(line) && !line.includes('Older documents number them `R-n`')) mentions.push(`${path.relative(root, full)}: ${line.trim()}`);
        }
      }
    }
  };
  walk(path.join(root, 'skills'));
  assert.deepStrictEqual(mentions, []);
});

test('a project without a repository is never asked for a commit policy it cannot use', () => {
  const constitution = read(CONSTITUTION);
  const orchestrator = read('skills/workflow-orchestrator/SKILL.md');
  const devPlanBuilder = read('skills/dev-plan-builder/SKILL.md');
  const goalWrap = read(GOAL_WRAP);

  // `branch` and `auto` need git, so offering them there invites a choice that fails at the first commit.
  assert.ok(constitution.includes('Nobody asks for the commit policy there, and the Plan records `Commit policy: manual`.'));
  // Every place that asks points to that rule.
  assert.ok(orchestrator.includes("the Plan's commit policy, except in a project without a repository (constitution §5)"));
  assert.ok(devPlanBuilder.includes('Commit policy, except in a project without a repository (constitution §5)'));
  assert.ok(goalWrap.includes('In a project without a repository, leave the commit policy out of the batch (constitution §5).'));
});