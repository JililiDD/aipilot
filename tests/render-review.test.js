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

const markdown = `# Review

## Quick Overview

A bounded workflow.

\`\`\`mermaid
flowchart TD
  A[Start] --> B[Choose Range]
  B -->|Confirm| C[Apply Filter]
\`\`\`

## Requirement

#### In scope

- Keep the workflow readable.
- Preserve the source content.

#### Out of scope

- Add unrelated behavior.

### Acceptance Criteria

- **R-1 (Multi-PGN Intercept):** When the player moves, validate against legal move matrix.
- **R-2 (Timer Sync):** Clocks count down synchronously.

### Assumptions

- **A-1 (Single-Tenant DB):** Each tenant has a dedicated PostgreSQL schema.
- **A-2 (Node 20+ Runtime):** Host environment supports modern ESM modules.

### Open Questions

- **Q-1 (Rate Limiting Threshold):** [risk: blocks implementation] What is the max allowed requests per minute per IP?
- **Q-2 (Legacy Fallback):** [risk: risks rework] Do we need IE11 polyfills?

### Non-Goals

- **NG-1 (Mobile Support):** Native iOS/Android apps are deferred to Phase 3.

### Edge Cases

- **EC-1 (Network Disconnect):** Reconnect automatically within 5 seconds with exponential retry.

### Plan

- Task 1 — Verify: run the focused tests and inspect the output.

### Rules

These rules have an introductory paragraph.

- Rule one remains readable.
- Rule two remains complete.

#### Detail

- Detail one remains reachable.

### Exit Criteria

- The rendered artifact is validated.

### Before vs After

\`\`\`text
Before                                      After
┌──────────────────────┐    ┌──────────────────────┐
│ Old card             │    │ New card             │
└──────────────────────┘    └──────────────────────┘
\`\`\`
`;
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

// Structured item cards & badges assertions
assert.match(html, /<span class="ac-badge badge-req">R-1 \(Multi-PGN Intercept\)<\/span>/);
assert.match(html, /<span class="ac-badge badge-assumption">A-1 \(Single-Tenant DB\)<\/span>/);
assert.match(html, /<span class="ac-badge badge-assumption">A-2 \(Node 20\+ Runtime\)<\/span>/);
assert.match(html, /<span class="ac-badge badge-question">Q-1 \(Rate Limiting Threshold\)<\/span>/);
assert.match(html, /<span class="ac-badge badge-question">Q-2 \(Legacy Fallback\)<\/span>/);
assert.match(html, /<span class="ac-badge badge-nongoal">NG-1 \(Mobile Support\)<\/span>/);
assert.match(html, /<span class="ac-badge badge-edgecase">EC-1 \(Network Disconnect\)<\/span>/);
assert.match(html, /<span class="risk-pill risk-pill-danger">BLOCKS IMPLEMENTATION<\/span>/);
assert.match(html, /<span class="risk-pill risk-pill-warn">RISKS REWORK<\/span>/);
assert.match(html, /<div class="card-body-text">Each tenant has a dedicated PostgreSQL schema\.<\/div>/);
assert.match(html, /<div class="card-body-text">Native iOS\/Android apps are deferred to Phase 3\.<\/div>/);
assert.match(html, /<div class="card-body-text">Reconnect automatically within 5 seconds with exponential retry\.<\/div>/);

console.log('ok - Mermaid and Before/After diagrams render visually while preserving source content');
