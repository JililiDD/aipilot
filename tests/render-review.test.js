#!/usr/bin/env node

const assert = require('assert');
const { spawnSync } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');

const root = path.resolve(__dirname, '..');
const renderer = path.join(root, 'skills/workflow-orchestrator/scripts/render-review.js');
const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'aipilot-render-review-'));
const input = path.join(tempDir, 'diagram.md');
const output = path.join(tempDir, 'diagram.html');

const markdown = `# Review\n\n## Quick Overview\n\nA bounded workflow.\n\n\`\`\`mermaid\nflowchart TD\n  A[Start] --> B[Choose Range]\n  B -->|Confirm| C[Apply Filter]\n\`\`\`\n`;
fs.writeFileSync(input, markdown);

const result = spawnSync(process.execPath, [renderer, input, output], { encoding: 'utf8' });
assert.strictEqual(result.status, 0, result.stderr);
const html = fs.readFileSync(output, 'utf8');

assert.match(html, /class="workflow-map"/);
assert.match(html, /Start/);
assert.match(html, /Choose Range/);
assert.match(html, /Apply Filter/);
assert.match(html, /Confirm/);
assert.match(html, /<details class="diagram-source">/);
assert.match(html, /<code class="language-mermaid">flowchart TD/);
assert.strictEqual((html.match(/flowchart TD/g) || []).length, 1, 'Mermaid source should appear once, inside the closed source disclosure');

console.log('ok - Mermaid flowcharts render visually while preserving source content');
