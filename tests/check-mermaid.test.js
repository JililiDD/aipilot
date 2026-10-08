#!/usr/bin/env node

const assert = require('assert');
const { spawnSync } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { test, after } = require('node:test');

const root = path.resolve(__dirname, '..');
const checker = path.join(root, 'skills/workflow-orchestrator/scripts/check-mermaid.js');
const renderer = path.join(root, 'skills/workflow-orchestrator/scripts/render-review.js');
const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'aipilot-check-mermaid-'));
after(() => fs.rmSync(tempDir, { recursive: true, force: true }));

let docCount = 0;
function writeDoc(markdown) {
  docCount += 1;
  const file = path.join(tempDir, `doc-${docCount}.md`);
  fs.writeFileSync(file, markdown);
  return file;
}

function check(markdown) {
  const result = spawnSync(process.execPath, [checker, writeDoc(markdown)], { encoding: 'utf8', timeout: 10_000 });
  return { status: result.status, problems: result.stderr.split('\n').filter(line => /\.md:\d+: /.test(line)) };
}

// The block starts on line 5 of this document, so its first statement is on line 7.
function quickOverview(source) {
  return `# Work-item\n\n## Quick Overview\n\n\`\`\`mermaid\n${source}\n\`\`\`\n`;
}

const BEFORE_AFTER = [
  'flowchart TD',
  '  subgraph BEFORE["Before"]',
  '    direction TB',
  '    B1["Reader"] --> B2["SQL inline"]',
  '  end',
  '  subgraph AFTER["After"]',
  '    direction TB',
  '    A1["findSymbolMappings(exchangeSymbol)"]',
  '    A1 -->|"exchangeSymbol"| A2["ExchangeSymbolMappingDao"]',
  '    A2 --> A3["List of ExchangeSymbolMapping"]',
  '  end',
  '  BEFORE ~~~ AFTER',
].join('\n');

const SAFE_DIAGRAMS = {
  'before and after tracks': BEFORE_AFTER,
  'pipeline with punctuation in labels': [
    'flowchart TD',
    '  %% a comment',
    '  A["findSymbolMappings(exchangeSymbol)"] --> B["Dao.findByExchangeSymbol: 1 statement"]',
    '  B -->|"SELECT a, b WHERE c = ?; no ORDER BY"| C{"rows[0] exists?"}',
    '  C -->|"yes"| D["caller\'s {map}: a/b & C# * 100%"]',
    '  C -->|"no"| E["empty list, never null"]',
  ].join('\n'),
  'chained links and a back link': 'flowchart TD\n  A["Start"] --> B["Middle"] --> C["Finish"]\n  C --> A',
  'a single node': 'flowchart TD\n  A["Only step"]',
};

test('every safe-subset diagram passes the check and becomes a figure on the review page', () => {
  // The check exists so that a passing diagram reaches the review page as a drawable figure.
  // These samples also parse in Mermaid 11; that was verified with the real parser when the subset was set.
  for (const [name, source] of Object.entries(SAFE_DIAGRAMS)) {
    const doc = writeDoc(quickOverview(source));
    const result = spawnSync(process.execPath, [checker, doc], { encoding: 'utf8' });
    assert.strictEqual(result.status, 0, `${name}: ${result.stderr}`);

    const html = path.join(tempDir, `${path.basename(doc)}.html`);
    const render = spawnSync(process.execPath, [renderer, doc, html], { encoding: 'utf8', timeout: 10_000 });
    assert.strictEqual(render.status, 0, render.stderr);
    assert.match(fs.readFileSync(html, 'utf8'), /<figure class="diagram wide">/, name);
  }
});

test('each construct that breaks Mermaid, mangles a label, or lays out badly is rejected at its line', () => {
  // Each case is a real failure: a parse error, a label Mermaid strips, a picture too wide to read, or tracks out of order.
  const withoutOrder = BEFORE_AFTER.replace('\n  BEFORE ~~~ AFTER', '');
  const cases = [
    ['unquoted label with parentheses', 'flowchart TD\n  A[findSymbolMappings(exchangeSymbol)] --> B["Dao"]', 7, /unsupported syntax/],
    ['generic type in a label', 'flowchart TD\n  A["Dao"] --> B["List<Mapping>"]', 7, /unsupported syntax/],
    ['HTML line break in a label', 'flowchart TD\n  A["Reader<br/>no SQL"] --> B["Dao"]', 7, /unsupported syntax/],
    ['backtick in a label', 'flowchart TD\n  A["`code`"] --> B["Dao"]', 7, /unsupported syntax/],
    ['keyword as a node ID', 'flowchart TD\n  start --> end', 7, /"end" is a reserved word/],
    ['init directive before the header', "%%{init: {'theme':'neutral'}}%%\nflowchart TD\n  A --> B", 6, /start the block with "flowchart TD"/],
    ['another diagram type', 'sequenceDiagram\n  A->>B: call', 6, /start the block with "flowchart TD"/],
    ['pipeline drawn left to right', 'flowchart LR\n  A["Reader"] --> B["Dao"]', 6, /start the block with "flowchart TD"/],
    ['tracks drawn left to right', BEFORE_AFTER.replace('flowchart TD', 'flowchart LR'), 6, /start the block with "flowchart TD"/],
    ['track without its direction', BEFORE_AFTER.replace('    direction TB\n    B1', '    B1'), 8, /start each subgraph with "direction TB"/],
    ['tracks without an order', withoutOrder, 17, /add "BEFORE ~~~ AFTER" to keep them in order/],
    ['order line between nodes', 'flowchart TD\n  A["One"] --> B["Two"]\n  A ~~~ B', 8, /"A" is not a subgraph above/],
    ['two statements on one line', 'flowchart TD\n  A --> B; B --> C', 7, /unsupported syntax/],
    ['open link', 'flowchart TD\n  A --- B', 7, /unsupported syntax/],
    ['nested subgraph', 'flowchart TD\n  subgraph S1["Outer"]\n    direction TB\n    subgraph S2["Inner"]\n      A --> B\n    end\n  end', 9, /do not nest/],
    ['link to a subgraph', 'flowchart TD\n  subgraph S["Group"]\n    direction TB\n    A --> B\n  end\n  S --> C', 11, /Link nodes, not subgraphs/],
  ];
  for (const [name, source, line, reason] of cases) {
    const { status, problems } = check(quickOverview(source));
    assert.strictEqual(status, 1, name);
    assert.ok(problems.some(problem => problem.includes(`.md:${line}: `) && reason.test(problem)), `${name}: ${problems.join('\n')}`);
  }
});

test('a text diagram in the Quick Overview is rejected, and code blocks elsewhere are left alone', () => {
  // A text diagram in the Quick Overview shows as raw code on the review page; reviewers expect a picture there.
  const textDiagram = '# Work-item\n\n## Quick Overview\n\n### Proposed Pipeline\n\n```\nReader\n  │\n  ▼\nDao\n```\n';
  const { status, problems } = check(textDiagram);
  assert.strictEqual(status, 1);
  assert.ok(problems.some(problem => problem.includes('.md:7: ') && /as a Mermaid block, not as text/.test(problem)), problems.join('\n'));

  // A Plan may show a file tree or code; only diagrams must be Mermaid.
  const planTree = '# Work-item\n\n## Plan\n\n```\nsrc/\n├── Reader.java\n└── Dao.java\n```\n';
  assert.strictEqual(check(planTree).status, 0);
});
