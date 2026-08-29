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

const markdown = `# Review\n\n## Quick Overview\n\nA bounded workflow.\n\n\`\`\`mermaid\nflowchart TD\n  A[Start] --> B[Choose Range]\n  B -->|Confirm| C[Apply Filter]\n\`\`\`\n\n## Requirement\n\n#### In scope\n\n- Keep the workflow readable.\n- Preserve the source content.\n\n#### Out of scope\n\n- Add unrelated behavior.\n\n### Plan\n\n- Task 1 — Verify: run the focused tests and inspect the output.\n\n### Rules\n\nThese rules have an introductory paragraph.\n\n- Rule one remains readable.\n- Rule two remains complete.\n\n#### Detail\n\n- Detail one remains reachable.\n\n### Exit Criteria\n\n- The rendered artifact is validated.\n\n### Before vs After\n\n\`\`\`text\nBefore                                      After\n┌──────────────────────┐    ┌──────────────────────┐\n│ Old card             │    │ New card             │\n└──────────────────────┘    └──────────────────────┘\n\`\`\`\n`;
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
assert.strictEqual((html.match(/class="flow-track [^"]*comparison-panel/g) || []).length, 2, 'Before and After should render as separate panels');
assert.match(html, /<span class="track-title">BEFORE<\/span>/);
assert.match(html, /<span class="track-title">AFTER<\/span>/);
assert.match(html, /<span class="track-step-badge">OLD<\/span>/);
assert.match(html, /<span class="track-step-badge">NEW<\/span>/);
assert.match(html, /class="verification-block"/);
assert.match(html, /class="verification-content"/);
assert.match(html, /\.section-content > ul > li:not\(:has\(\.ac-badge\)\)/);
assert.match(html, /\.section-content > h4/);
assert.match(html, /\.callout-card > ul > li/);

console.log('ok - Mermaid and Before/After diagrams render visually while preserving source content');
