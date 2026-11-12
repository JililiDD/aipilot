#!/usr/bin/env node

const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { test } = require('node:test');

const root = path.resolve(__dirname, '..');
const checker = path.join(root, 'skills/workflow-orchestrator/scripts/check-writing.js');

function check(content) {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'aipilot-writing-'));
  try {
    const file = path.join(directory, 'work-item.md');
    fs.writeFileSync(file, content);
    return spawnSync(process.execPath, [checker, file], { encoding: 'utf8' });
  } finally {
    fs.rmSync(directory, { recursive: true, force: true });
  }
}

test('writing check accepts wrapped EARS criteria and ignores Markdown metadata and code', () => {
  const result = check(`---
created: 2026-01-01
---
# Plan
- **AC-1 (Save):** When the user saves a document,
  the system shall store the document.
- **D-2 (Failure):** If the request fails, then the system shall report an error.
\`\`\`md
- **AC-3:** Missing EARS in a code block.
\`\`\`
| Column | Value |
|---|---|
| AC-4 | Missing EARS inside a table. |
`);
  assert.equal(result.status, 0, result.stdout + result.stderr);
  assert.match(result.stdout, /check-writing: OK/);
});

test('writing check rejects non-EARS acceptance criteria and long task steps', () => {
  const result = check(`- **AC-1 (Save):** Save the document.
- [ ] Write this very long task with enough words to cross the allowed word limit while still looking like a normal task in a plan.
`);
  assert.equal(result.status, 1);
  assert.match(result.stdout, /:1: write AC-1 in an EARS form/);
  assert.match(result.stdout, /:2: \d+ words in one sentence\. The limit is 20 in a step/);
});

test('writing check counts inline code as one word and rejects long descriptions', () => {
  const code = check('The \`very long inline command with many individual words inside it\` is short.\n');
  assert.equal(code.status, 0, code.stdout + code.stderr);
  const description = check('A user can write a long description that contains more than twenty five ordinary words when the text describes many different conditions without splitting them into separate sentences.\n');
  assert.equal(description.status, 1);
  assert.match(description.stdout, /The limit is 25 in a description/);
});

test('writing check reports missing files and requires an input', () => {
  const missing = spawnSync(process.execPath, [checker, path.join(os.tmpdir(), 'aipilot-missing-writing-document.md')], { encoding: 'utf8' });
  assert.equal(missing.status, 1);
  assert.match(missing.stderr, /check-writing: cannot read/);
  const empty = spawnSync(process.execPath, [checker], { encoding: 'utf8' });
  assert.equal(empty.status, 1);
  assert.match(empty.stderr, /check-writing: usage:/);
});
