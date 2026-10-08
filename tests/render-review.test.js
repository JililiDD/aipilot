#!/usr/bin/env node

const assert = require('assert');
const { spawnSync } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { test, after } = require('node:test');

const root = path.resolve(__dirname, '..');
const renderer = path.join(root, 'skills/workflow-orchestrator/scripts/render-review.js');
const templatePath = path.join(root, 'skills/workflow-orchestrator/scripts/render-review.template.html');
const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'aipilot-render-review-'));
after(() => fs.rmSync(tempDir, { recursive: true, force: true }));

let renderCount = 0;
// Returns the whole page, head included; `render` narrows it to the document content for content checks.
function renderPage(markdown, extraArgs = [], inputName = null) {
  renderCount += 1;
  const input = path.join(tempDir, inputName || `doc-${renderCount}.md`);
  const output = path.join(tempDir, `doc-${renderCount}.html`);
  fs.writeFileSync(input, markdown);
  // The timeout turns a renderer hang into a failing test instead of a stuck review gate.
  const result = spawnSync(process.execPath, [renderer, input, output, ...extraArgs], {
    encoding: 'utf8',
    timeout: 10_000,
  });
  assert.strictEqual(result.error, undefined, `renderer did not finish: ${result.error}`);
  assert.strictEqual(result.status, 0, result.stderr);
  return fs.readFileSync(output, 'utf8');
}

function render(markdown, extraArgs = []) {
  const html = renderPage(markdown, extraArgs);
  return html.slice(html.indexOf('<!-- CONTENT:START -->'), html.indexOf('<!-- CONTENT:END -->'));
}

function mermaid(source) {
  return `# Review\n\n## Quick Overview\n\n\`\`\`mermaid\n${source}\n\`\`\`\n`;
}

const BLOCK_TAGS = /<(\/?)(div|section|ul|ol|li|details|figure|table|tr)\b[^>]*>/g;

function assertWellNested(html) {
  const stack = [];
  let tag;
  BLOCK_TAGS.lastIndex = 0;
  while ((tag = BLOCK_TAGS.exec(html)) !== null) {
    if (!tag[1]) stack.push(tag[2]);
    else assert.strictEqual(stack.pop(), tag[2], `</${tag[2]}> at ${tag.index} closes the wrong element`);
  }
  assert.deepStrictEqual(stack, [], 'every block element is closed');
}

// The bundled library starts with this text; counting it shows how often a page inlines the library.
const MERMAID_BUNDLE_HEAD = fs.readFileSync(
  path.join(root, 'skills/workflow-orchestrator/vendor/mermaid/mermaid.min.js'),
  'utf8',
).slice(0, 80);

// ---------- the ezreview contract ----------

test('the head title and the source path attribute keep the review contract, escaped', () => {
  // ezreview ties the page to its markdown by data-source-md; both carry author text into markup, where it must not run.
  const page = renderPage('# Review\n', ['--title', 'x</title><script>alert(1)</script>'], 'notes&draft.md');

  assert.ok(page.includes('<title>Review: x&lt;/title&gt;&lt;script&gt;alert(1)&lt;/script&gt;</title>'));
  assert.doesNotMatch(page, /<script>alert/);
  assert.match(page, /<body data-source-md="[^"]*\/notes&amp;draft\.md">/);
});

test('a folded section opens when ezreview scrolls to an annotated element inside it', () => {
  // Clicking a comment in ezreview scrolls the page to the annotated element; a folded section would hide it.
  const template = fs.readFileSync(templatePath, 'utf8');

  assert.ok(template.includes('Element.prototype.scrollIntoView = function () {'));
  assert.ok(template.includes('if (s && s.classList.contains("collapsed")) setBand(s, true);'));
  assert.ok(template.includes('document.addEventListener("focusin"'));
});

test('the page follows the ezreview theme setting and has no theme control or top bar of its own', () => {
  // Two theme controls disagree; ezreview's settings own the choice, and its top bar already names the document.
  const template = fs.readFileSync(templatePath, 'utf8');

  // Before the first paint, so a live reload does not flash the other theme.
  assert.ok(template.indexOf('window.parent.document.documentElement.getAttribute("data-theme")') < template.indexOf('<aside class="rail"'));
  assert.ok(template.includes('}).observe(shellRoot, { attributes: true, attributeFilter: ["data-theme"] });'));
  assert.doesNotMatch(template, /"Auto", "Light", "Dark"|class="topbar"|\.crumb/);
});

test('the page makes no request outside the plugin', () => {
  // PRIVACY.md promises that the review renderer works offline and calls no third party.
  const page = renderPage(mermaid('flowchart TD\n  A["One"] --> B["Two"]'));

  assert.doesNotMatch(page, /<(?:link|script|img)[^>]+(?:href|src)="https?:/i);
  assert.ok(!page.includes('googleapis'));
});

test('the page adds no banner and no text that is missing from the markdown', () => {
  const content = render('# Title\n\nIntro before any section.\n\n## Requirement\n\nBody.\n');

  assert.ok(content.includes('Intro before any section.'));
  assert.doesNotMatch(content, /source-banner|review-banner|annotate/i);
});

// ---------- inert input ----------

test('raw HTML in the markdown is displayed, not executed', () => {
  const content = render('# Review\n\n## Notes\n\n<img src=x onerror="alert(1)">\n');

  assert.doesNotMatch(content, /<img/);
  assert.match(content, /&lt;img src=x onerror=&quot;alert\(1\)&quot;&gt;/);
});

test('inline raw HTML inside a paragraph is displayed, not executed', () => {
  // marked hands inline tags to the renderer separately from block HTML; both must stay inert.
  const content = render('# Review\n\n## Notes\n\nSee <img src=x onerror=alert(1)> and <b>bold</b>.\n');

  assert.doesNotMatch(content, /<img|<b>/);
  assert.match(content, /See &lt;img src=x onerror=alert\(1\)&gt; and &lt;b&gt;bold&lt;\/b&gt;\./);
});

test('links and images with a script URL render as text, not live targets', () => {
  // The page shares an origin with the review tool's approve endpoint, so a live script link could approve for the reviewer.
  const content = render(`# Review

## Notes

[click](javascript:alert(3)) <javascript:alert(4)> [enc](&#106;avascript:alert(5)) [tab](java&#x09;script:alert(6))
![pic](javascript:alert(7)) [ref][bad] [ok](https://example.com/a) [rel](./b.md#c) [mail](mailto:a@b.co) [top](#sec-1)

[bad]: javascript:alert(8)
`);

  assert.doesNotMatch(content, /(?:href|src)="[^"]*script/i);
  for (const href of ['https://example.com/a', './b.md#c', 'mailto:a@b.co', '#sec-1']) {
    assert.ok(content.includes(`<a href="${href}">`), `${href} stays a live link`);
  }
});

test('front matter becomes the meta line, and the --title names a document without an h1', () => {
  const content = render(
    '---\ncreated: 2026-07-02 14:32\nscope: Bug Fix\nstatus: active\nphase: 2\n---\n\n## Requirement\n\nBody.\n',
    ['--title', 'Plan <script>x</script>'],
  );

  assert.ok(content.includes('<div><dt>status:</dt><dd class="status">active</dd></div>'));
  assert.ok(content.includes('<div><dt>scope:</dt><dd>Bug Fix</dd></div>'));
  assert.ok(content.includes('<div><dt>phase:</dt><dd>2</dd></div>'));
  assert.doesNotMatch(content, /<script>x/);
  assert.doesNotMatch(content, /^created:/m, 'front matter must not leak into the body');
});

test('front matter written by PowerShell 5.1 (BOM and CRLF) still becomes the meta line', () => {
  // Windows authors would otherwise get raw front matter in the body and no status or scope.
  const content = render('﻿---\r\nscope: Bug Fix\r\nstatus: active\r\n---\r\n\r\n## Requirement\r\n\r\nBody.\r\n');

  assert.ok(content.includes('<dd class="status">active</dd>'));
  assert.doesNotMatch(content, /scope: Bug Fix/);
});

// ---------- structure that annotations rely on ----------

test('list text survives verbatim, and a nested list closes inside its parent item', () => {
  // ezreview maps an annotation back by its text, so the page must not reword or regroup it.
  const content = render(`# Review

## Plan

- 1.2.0 release notes
- 3.5x faster startup

1. Parent step
   1. Child a
   2. Child b
2. Next step
`);

  assert.ok(content.includes('1.2.0 release notes'));
  assert.ok(content.includes('3.5x faster startup'));
  const outer = content.slice(content.indexOf('Parent step'));
  assert.ok(outer.indexOf('Child b') < outer.indexOf('</ol>') && outer.indexOf('</ol>') < outer.indexOf('Next step'));
  assertWellNested(content);
});

test('a heading inside a quote or a list does not start a new section', () => {
  // Splitting there cuts the quote or list in half and moves the rest of the section into a fake one.
  const content = render(`# Review

## Requirement

> ## Quoted
> still quoted

- ## Listed

After both.
`);

  assertWellNested(content);
  assert.strictEqual((content.match(/<section /g) || []).length, 1);
  assert.ok(content.includes('Quoted') && content.includes('Listed') && content.includes('After both.'));
});

test('a section with no content yet shows a pending placeholder', () => {
  // Stages fill in over time; an empty heading reads as "pending", not as a section the reviewer must check.
  const content = render('# Review\n\n## Design\n\n## Plan\n\nBody.\n');

  assert.match(content, /<section class="band" id="design">\n<h2>[\s\S]*?<\/h2>\n<div class="empty" aria-hidden="true"><\/div>/);
});

test('every section heading carries a fold toggle', () => {
  const content = render('# Work-item\n\n## Requirement\n\nBody.\n\n## Plan\n\nMore.\n');

  assert.strictEqual((content.match(/<button type="button" class="band-toggle" aria-expanded="true"/g) || []).length, 2);
  assert.ok(content.includes('<h2><span class="h-title">Requirement</span><button'));
});

test('the navigation rail can fold away, and the page remembers the choice', () => {
  // The rail takes about 250 px; a reviewer folds it for room, and every re-render reloads the page.
  const template = fs.readFileSync(templatePath, 'utf8');

  assert.match(template, /<button type="button" class="rail-toggle" id="rail-toggle" aria-expanded="true"/);
  assert.ok(template.indexOf('localStorage.getItem("aipilot-review-rail")') < template.indexOf('<aside class="rail"'), 'the state applies before the rail is parsed');
  assert.ok(template.includes('localStorage.setItem("aipilot-review-rail"'));
  assert.ok(template.includes('.shell.rail-hidden { grid-template-columns: 48px minmax(0, 1fr); }'));
  // Tables, cards, and diagrams stay inside the text column, so none reaches past its heading.
  assert.ok(template.includes('.doc .wide { grid-column: content; }'));
});

// ---------- IDs, criteria, and plan blocks ----------

test('an ID and its concept anchor read as one chip colored by type, and references share the color', () => {
  // Readers scan by the pair "R-1 (ETF Files)", not by the bare number.
  const content = render([
    '# Work-item', '', '## Requirement', '',
    '### Acceptance Criteria', '',
    '- **R-1 (ETF Files):** When the switch is on, the system shall write the ETF files.', '',
    '### Assumptions', '',
    '- **A-1 (Consumer Scope):** The consumer expects five files. See R-1.', '',
    '### Open Questions', '',
    '- **Q-1 (Rate Limit):** [risk: blocks implementation] What is the limit?', '',
    '### Older Items', '',
    '- **NG-1 (Mobile):** No mobile app.',
    '- **EC-1 (Disconnect):** Reconnect within 5 seconds.', '',
  ].join('\n'));

  assert.ok(content.includes('<li id="R-1" data-id="R-1" data-name="ETF Files"><span class="idchip t-r"><span class="id-k">R-1</span> <span class="id-n">(ETF Files)</span></span><div class="criterion-body">'));
  // The EARS keywords are markup, not escaped text: raw HTML escaping must not catch the renderer's own spans.
  assert.ok(content.includes('<div class="criterion-body"><span class="kw">When</span> the switch is on, the system <span class="shall">shall</span> write the ETF files.</div>'));
  assert.ok(!content.includes('&lt;span'));
  assert.ok(content.includes('<ul class="criteria wide">'), 'the title and complete sentence occupy consecutive lines, not table columns');
  assert.doesNotMatch(content, /<th>Condition<\/th>|<th>System response<\/th>/);
  for (const [type, id, name] of [['a', 'A-1', 'Consumer Scope'], ['q', 'Q-1', 'Rate Limit'], ['ng', 'NG-1', 'Mobile'], ['ec', 'EC-1', 'Disconnect']]) {
    assert.ok(content.includes(`<span class="idchip t-${type}"><span class="id-k">${id}</span> <span class="id-n">(${name})</span></span>`), id);
  }
  assert.ok(content.includes('<a class="ref t-r" href="#R-1">R-1</a>'));
});

test('AC-n criteria render like R-n: one EARS list, the requirement color, and links, never an issue link', () => {
  // New documents number requirement criteria AC-n to match their heading, and older documents keep R-n.
  // An AC criterion that fell out of the EARS list, or linked out as an issue key, would break the review.
  const content = render([
    '# Work-item', '', '## Requirement', '',
    '### Acceptance Criteria', '',
    '- **AC-1 (ETF Files):** When the switch is on, the system shall write the ETF files.',
    '- **AC-2 (Default Off):** The system shall keep the switch off by default.', '',
    '## Plan', '',
    '### User Story 1: Split files   (AC: AC-1, AC-2)', '',
    '- [ ] Task 1.1: Add the switch. — Verify: A unit test covers AC-2.', '',
  ].join('\n'), ['--issue-url', 'https://tracker.example/browse/', '--issue-projects', 'AC,BTE']);

  assert.ok(content.includes('<ul class="criteria wide">'));
  assert.ok(content.includes('<li id="AC-1" data-id="AC-1" data-name="ETF Files"><span class="idchip t-ac"><span class="id-k">AC-1</span>'));
  assert.ok(content.includes('<li id="AC-2"'), 'every AC item stays in the one EARS list');
  assert.ok(content.includes('<div class="criterion-body">The system <span class="shall">shall</span> keep the switch off by default.</div>'));
  assert.ok(content.includes('<a class="ref t-ac" href="#AC-1">AC-1</a>'));
  assert.ok(content.includes('<a class="ref t-ac" href="#AC-2">AC-2</a>'));
  assert.ok(!content.includes('tracker.example'), 'an AC ID is local, even when a tracker project is named AC');
  const template = fs.readFileSync(templatePath, 'utf8');
  assert.ok(template.includes('.t-ac, .t-r { --t: var(--r); }'), 'AC-n takes the requirement color');
  assert.ok(template.includes('t.querySelector(".criterion-body").textContent'), 'reference previews still show the complete criterion');
  assert.ok(template.includes('count("ul.criteria > li")'), 'rail criteria count follows the new structure');
});

test('condition, unwanted event, and action-only criteria keep their original wording on one line', () => {
  const content = render(`# Review

## Requirement

### Acceptance Criteria

- **AC-1 (While Ready):** While connected, the system shall show the status.
- **AC-2 (On Failure):** If the request fails, then the system shall show an error.
- **AC-3 (Default):** The system shall start offline.
`);

  assert.ok(content.includes('<span class="kw">While</span> connected, the system <span class="shall">shall</span> show the status.'));
  assert.ok(content.includes('<span class="kw">If</span> the request fails, <span class="kw">then</span> the system <span class="shall">shall</span> show an error.'));
  assert.ok(content.includes('<div class="criterion-body">The system <span class="shall">shall</span> start offline.</div>'));
  assert.strictEqual((content.match(/class="criterion-body"/g) || []).length, 3);
  assertWellNested(content);
});

test('Plan Non-Goals show plain bullets like Requirement Out of scope, while older NG IDs remain readable', () => {
  const content = render(`# Review

## Requirement

### Scope

#### Out of scope

- No mobile app.

## Plan

### Non-Goals

- No migration.
- No separate admin panel.
`);

  assert.ok(content.includes('<ul class="notes non-goals">\n<li>No migration.</li>\n<li>No separate admin panel.</li>'));
  assert.doesNotMatch(content, /data-id="NG-|class="idchip t-ng"/);
  const template = fs.readFileSync(templatePath, 'utf8');
  assert.ok(template.includes('count("ul.non-goals > li")'), 'rail count includes unnumbered non-goals');
  assertWellNested(content);

  const legacy = render('# Review\n\n## Plan\n\n### Non-Goals\n\n- **NG-1 (Migration):** No migration.\n');
  assert.ok(legacy.includes('<li id="NG-1" data-id="NG-1" data-name="Migration">'));
  assert.ok(legacy.includes('<span class="idchip t-ng">'));
});

test('an item without a concept anchor still gets its chip, and bold prose stays plain', () => {
  // Chipping ordinary words sends reviewers looking for requirement IDs that do not exist.
  const content = render(`# Review

## Plan

**a11y**, **e2e**, **Q3 goals**, **D3.js** and **R2 bucket** are prose.

- **Q3 goals** list lead-in
- **R-2:** a real item
`);

  for (const word of ['a11y', 'e2e', 'Q3 goals', 'D3.js', 'R2 bucket']) {
    assert.ok(content.includes(`<strong>${word}</strong>`), `${word} stays bold prose`);
  }
  assert.ok(content.includes('<span class="idchip t-r"><span class="id-k">R-2</span></span>'));
  assert.strictEqual((content.match(/class="idchip/g) || []).length, 1);
});

test('stop conditions form one callout that holds every item and ends at the next heading', () => {
  // Stop conditions tell the builder when to stop; they must stand out and keep all of their items.
  const content = render('# Review\n\n## Plan\n\n### Stop Conditions\n\nStop and ask the user when:\n- data loss is possible\n- CI is red\n\n### Next\n\nafter\n');

  const box = content.slice(content.indexOf('<div class="stops">'), content.indexOf('<h3', content.indexOf('<div class="stops">')));
  assert.ok(box.includes('data loss is possible') && box.includes('CI is red'));
  assert.ok(!box.includes('after'), 'the box ends at the next heading');
  assertWellNested(content);
});

test('each approach decision is one card that holds its heading, table, and premises', () => {
  // Premises read as loose text when they sit apart from the table of the choice that they support.
  const content = render([
    '# Work-item', '', '## Plan', '', '### Approach Decisions', '',
    '#### Switch (R-8)', '',
    '| Candidate | How it works | Strengths | Weaknesses | Result |', '|---|---|---|---|---|',
    '| Country list | An environment property. | Java change only. | One more variable. | **Chosen** |',
    '| Chosen-name job | The conductor sets it. | Explicit per run. | Needs Perl changes. | Dropped: lost on blast radius |', '',
    'Premises:', '- (P1) A value change needs no code change.', '',
    '#### Field (R-6)', '',
    '| Candidate | Result |', '|---|---|', '| Issue type | **Chosen** |', '',
    'Premises:', '- (P2) The lookup returns the issue type.', '',
  ].join('\n'));

  // Each chunk runs from one card's start to the next card's start, or to the end of the section.
  const cards = content.split('<div class="decision wide">').slice(1).map((card) => card.split('</section>')[0]);
  assert.strictEqual(cards.length, 2);
  assert.ok(cards[0].startsWith('\n<h4>Switch (R-8)</h4>'));
  assert.ok(cards[0].includes('<p class="premises-label">Premises:</p>'));
  assert.ok(cards[0].includes('<li class="premise" id="P1" data-id="P1" data-name="Premise"><span class="pid">(P1)</span> A value change needs no code change.</li>'));
  assert.ok(cards[1].includes('id="P2"') && !cards[1].includes('id="P1"'));
  // Only the row whose Result says Chosen is marked, not a row whose name merely starts with "Chosen".
  const rows = [...cards[0].matchAll(/<tr( class="chosen")?><td>([^<]*)</g)].map((match) => `${match[2]}:${Boolean(match[1])}`);
  assert.deepStrictEqual(rows, ['Country list:true', 'Chosen-name job:false']);
  assertWellNested(content);
});

test('an older plan keeps its premises from an Approach line in Reuse Notes', () => {
  // Merged work-items stay as written, so the old format must still render its premises.
  const content = render([
    '# Work-item', '', '## Plan', '', '### Reuse Notes',
    '- Approach for the switch (R-8): a country list. Dropped: a job parameter. Premises: (P1) A value change needs no code change.', '',
  ].join('\n'));

  assert.ok(content.includes('<li class="approach">'));
  assert.ok(content.includes('<span class="premise" id="P1" data-id="P1" data-name="Premise">'));
});

test('a test tier shows its touched modules on the name line, with the command below', () => {
  const content = render('# Work-item\n\n## Plan\n\nTest tiers: fast `./gradlew test` · full `./gradlew build` touched modules: `feed`\n');

  assert.ok(content.includes('<span class="tname">fast</span> <code>./gradlew test</code>'));
  assert.ok(content.includes('<span class="tname">full</span> <span class="tnote">touched modules: <code>feed</code></span> <code>./gradlew build</code>'));
});

// ---------- diagrams ----------

test('a Mermaid block becomes a figure that the bundled Mermaid fills, with its source kept once in a closed disclosure', () => {
  const page = renderPage(mermaid('flowchart TD\n  A["Start"] --> B["Choose Range"]'));
  const content = page.slice(page.indexOf('<!-- CONTENT:START -->'), page.indexOf('<!-- CONTENT:END -->'));

  assert.ok(content.includes('<figure class="diagram wide">\n<div class="diagram-view"></div>\n<details class="source"><summary data-chrome>Diagram source</summary>'));
  assert.strictEqual((content.match(/flowchart TD/g) || []).length, 1, 'source appears once, inside the disclosure');
  // ezreview serves one HTML file, so the library is inlined, once, and never fetched.
  assert.strictEqual(page.split(MERMAID_BUNDLE_HEAD).length - 1, 1);
  assert.match(page, /securityLevel: "strict"/);
});

test('a page without a Mermaid block does not carry the 3.5 MB library', () => {
  // Most review pages have no diagram; inlining the library everywhere would slow every review.
  const page = renderPage('# Review\n\n## Plan\n\n```java\nint rows = 1;\n```\n');

  assert.ok(!page.includes(MERMAID_BUNDLE_HEAD));
  assert.ok(page.length < 200_000, `page is ${page.length} chars`);
});

test('the inlined library cannot end its script element early', () => {
  // An early </script> would print the rest of the library as page text and stop every diagram.
  const page = renderPage(mermaid('flowchart TD\n  A["One"] --> B["Two"]'));

  assert.strictEqual(page.split('</script>').length, page.split(/<script>/).length);
});

test('placeholder text in the document stays text, and the library lands only in its own slot', () => {
  // Documents about AIPilot can quote the template's placeholders. The second replacement used to hit that
  // quote, so the library landed inside the prose and the real slot showed "{{MERMAID}}" on the page.
  const page = renderPage(`${mermaid('flowchart TD\n  A["One"] --> B["Two"]')}\nThe template has {{MERMAID}} and {{CONTENT}} slots.\n`);
  const content = page.slice(page.indexOf('<!-- CONTENT:START -->'), page.indexOf('<!-- CONTENT:END -->'));

  assert.ok(content.includes('The template has {{MERMAID}} and {{CONTENT}} slots.'));
  assert.ok(!content.includes(MERMAID_BUNDLE_HEAD), 'the library is not inside the document');
  assert.strictEqual(page.split(MERMAID_BUNDLE_HEAD).length - 1, 1);
  assert.strictEqual(page.split('{{MERMAID}}').length - 1, 1, 'only the quoted placeholder remains');
});

test('Mermaid source is escaped, so markup in a label cannot run before Mermaid sanitizes it', () => {
  const content = render(mermaid('flowchart TD\n  A["<img src=x onerror=alert(1)>"] --> B["x"]'));

  assert.doesNotMatch(content, /<img/);
  assert.ok(content.includes('A[&quot;&lt;img src=x onerror=alert(1)&gt;&quot;]'));
});

test('a text diagram stays as its original code block', () => {
  const diagram = 'Before        After\n┌────┐        ┌────┐\n│ A  │        │ B  │\n└────┘        └────┘';
  const content = render(`# Review\n\n## Quick Overview\n\n\`\`\`text\n${diagram}\n\`\`\`\n`);

  // The reviewer annotates what the markdown says; no screens or labels are invented.
  assert.ok(content.includes(`<pre class="code"><code>${diagram}</code></pre>`));
});
