#!/usr/bin/env node

// Renders a markdown document into a one-off review HTML for the review
// runtime (see ../references/review-runtime.md, Phase 2). The markdown stays
// the source of truth; the produced HTML is a disposable projection.
//
// Usage: node render-review.js <input.md> <output.html> [--title "Title"]

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const MARKED_VERSION = '18.0.6';

function fail(message) {
  console.error(`render-review: ${message}`);
  process.exit(1);
}

const args = process.argv.slice(2);
const positional = [];
let title = null;
for (let i = 0; i < args.length; i++) {
  if (args[i] === '--title') {
    title = args[++i];
  } else {
    positional.push(args[i]);
  }
}

const [inputPath, outputPath] = positional;
if (!inputPath || !outputPath) {
  fail('usage: node render-review.js <input.md> <output.html> [--title "Title"]');
}
if (!fs.existsSync(inputPath)) {
  fail(`input not found: ${inputPath}`);
}
if (!title) {
  title = path.basename(inputPath);
}

const marked = spawnSync(`npx -y marked@${MARKED_VERSION} --gfm -i "${path.resolve(inputPath)}"`, {
  shell: true,
  encoding: 'utf8',
  maxBuffer: 32 * 1024 * 1024,
});
if (marked.status !== 0) {
  fail(`marked failed (exit ${marked.status}): ${marked.stderr}`);
}
const body = marked.stdout;

function escapeHtml(text) {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

const sourceMd = path.resolve(inputPath).replace(/\\/g, '/');

const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Review: ${escapeHtml(title)}</title>
<style>
  * { box-sizing: border-box; }
  body { margin: 0; font-family: -apple-system, "Segoe UI", "Noto Sans SC", sans-serif; color: #1f2328; background: #f6f8fa; }
  .review-banner { background: #0969da; color: #fff; padding: 10px 24px; font-size: 13px; display: flex; justify-content: space-between; gap: 16px; flex-wrap: wrap; }
  .review-banner code { background: rgba(255,255,255,0.2); padding: 1px 6px; border-radius: 3px; }
  main { max-width: 860px; margin: 24px auto 120px; background: #fff; border: 1px solid #d1d9e0; border-radius: 6px; padding: 32px 40px; line-height: 1.6; }
  main h1, main h2, main h3 { line-height: 1.25; }
  main h1 { border-bottom: 1px solid #d1d9e0; padding-bottom: 8px; }
  main h2 { border-bottom: 1px solid #eaeef2; padding-bottom: 6px; margin-top: 32px; }
  main pre { background: #f6f8fa; padding: 12px; border-radius: 6px; overflow-x: auto; font-size: 13px; }
  main code { font-family: Consolas, monospace; font-size: 0.92em; }
  main table { border-collapse: collapse; display: block; overflow-x: auto; }
  main th, main td { border: 1px solid #d1d9e0; padding: 6px 12px; }
  main th { background: #f6f8fa; }
  main blockquote { border-left: 4px solid #d1d9e0; margin-left: 0; padding-left: 16px; color: #59636e; }
  .review-actions { position: fixed; bottom: 0; left: 0; right: 0; background: #fff; border-top: 1px solid #d1d9e0; padding: 14px 24px; display: flex; gap: 12px; justify-content: center; box-shadow: 0 -2px 8px rgba(0,0,0,0.06); }
  .review-actions button { padding: 10px 24px; font-size: 14px; font-weight: 600; border-radius: 6px; cursor: pointer; border: 1px solid #d1d9e0; background: #f6f8fa; color: #1f2328; }
  .review-actions button.primary { background: #1f883d; border-color: #1f883d; color: #fff; }
</style>
</head>
<body data-source-md="${escapeHtml(sourceMd)}">
<div class="review-banner">
  <span>Document review — click any element and comment to request a change; edits land in the markdown source.</span>
  <span>source: <code>${escapeHtml(sourceMd)}</code></span>
</div>
<main>
${body}
</main>
<div class="review-actions">
  <button class="primary" onclick="window.lavish && window.lavish.queuePrompt('confirm-document')">Confirm document</button>
  <button onclick="window.lavish && window.lavish.queuePrompt('request-changes')">Request changes</button>
</div>
</body>
</html>
`;

fs.writeFileSync(outputPath, html, 'utf8');
console.log(`render-review: wrote ${outputPath} (${html.length} chars) from ${inputPath}`);
