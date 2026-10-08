#!/usr/bin/env node

// Checks every Mermaid block in Markdown files against the safe subset (constitution §7, Diagrams).
// The subset parses in every Mermaid viewer, keeps labels intact, and lays out readably on the review page.
// Prints each failing line as <file>:<line>: <reason> and exits 1; exits 0 when every block passes.

const fs = require('fs');

function fail(message) {
  console.error(`check-mermaid: ${message}`);
  process.exit(1);
}

const files = process.argv.slice(2);
if (files.length === 0) {
  fail('usage: node check-mermaid.js <doc.md> [more.md ...]');
}

// Mermaid keywords break a statement when used as a node ID.
const RESERVED_IDS = new Set(['end', 'subgraph', 'graph', 'flowchart', 'direction', 'class', 'classdef', 'style', 'linkstyle', 'click', 'default']);
const LABEL = '"([^"<>|`]+)"';
const ID = '([A-Za-z][A-Za-z0-9_]*)';
const NODE = new RegExp(`\\s*${ID}(?:\\[${LABEL}\\]|\\{${LABEL}\\})?\\s*`, 'y');
const LINK = new RegExp(`-->(?:\\|${LABEL}\\|)?`, 'y');
const SUBGRAPH = new RegExp(`^subgraph ${ID}\\[${LABEL}\\]$`);
const ORDER = /^[A-Za-z][A-Za-z0-9_]*(?: ~~~ [A-Za-z][A-Za-z0-9_]*)+$/;
const UNSUPPORTED = 'unsupported syntax. Use ID["label"], ID{"label"}, A --> B, A -->|"label"| B, '
  + 'subgraph ID["title"] ... end, BEFORE ~~~ AFTER, or a %% comment. A label never contains ", <, >, |, or a backtick.';

// Returns the node IDs of a statement such as `A["x"] -->|"y"| B --> C`, or null when any part is outside the subset.
function parseStatement(line) {
  const ids = [];
  let pos = 0;
  for (;;) {
    NODE.lastIndex = pos;
    const node = NODE.exec(line);
    if (!node) return null;
    ids.push(node[1]);
    pos = NODE.lastIndex;
    if (pos === line.length) return ids;
    LINK.lastIndex = pos;
    if (!LINK.exec(line)) return null;
    pos = LINK.lastIndex;
  }
}

function checkBlock(lines, startLine, report) {
  // Long code names make a left-to-right picture too wide, so every diagram and every track runs top-down.
  if (lines[0].trim() !== 'flowchart TD') {
    report(startLine, 'start the block with "flowchart TD" on its first line.');
    return;
  }
  const subgraphIds = [];
  const uses = [];
  const orderPairs = new Set();
  let openSubgraph = null;
  lines.slice(1).forEach((rawLine, index) => {
    const lineNumber = startLine + index + 1;
    const line = rawLine.trim();
    if (!line || /^%%(?!\{)/.test(line)) return;
    if (openSubgraph && !openSubgraph.directed) {
      openSubgraph.directed = true;
      if (line === 'direction TB') return;
      report(lineNumber, 'start each subgraph with "direction TB", so that its track runs top-down.');
      if (/^direction\s/.test(line)) return;
    }
    if (line === 'end') {
      if (!openSubgraph) report(lineNumber, '"end" closes no subgraph.');
      openSubgraph = null;
      return;
    }
    if (/^subgraph(?:\s|$)/.test(line)) {
      const subgraph = line.match(SUBGRAPH);
      if (openSubgraph) report(lineNumber, 'do not nest subgraphs.');
      else if (!subgraph) report(lineNumber, UNSUPPORTED);
      else subgraphIds.push(subgraph[1]);
      openSubgraph = { directed: false };
      return;
    }
    if (ORDER.test(line)) {
      const ids = line.split(' ~~~ ');
      ids.slice(1).forEach((id, i) => orderPairs.add(`${ids[i]}>${id}`));
      ids.forEach(id => { if (!subgraphIds.includes(id)) report(lineNumber, `"${id}" is not a subgraph above. "~~~" only orders subgraphs.`); });
      return;
    }
    const ids = parseStatement(line);
    if (!ids) {
      report(lineNumber, UNSUPPORTED);
      return;
    }
    ids.forEach(id => uses.push({ id, lineNumber }));
  });
  if (openSubgraph) report(startLine + lines.length, 'close the subgraph with "end".');
  for (const { id, lineNumber } of uses) {
    if (RESERVED_IDS.has(id.toLowerCase())) report(lineNumber, `"${id}" is a reserved word. Use another node ID.`);
    else if (subgraphIds.includes(id)) report(lineNumber, `"${id}" is a subgraph. Link nodes, not subgraphs.`);
  }
  // Without an order, Mermaid may place After before Before.
  const missing = subgraphIds.slice(1).filter((id, i) => !orderPairs.has(`${subgraphIds[i]}>${id}`));
  if (missing.length > 0) {
    report(startLine + lines.length, `after the subgraphs, add "${subgraphIds.join(' ~~~ ')}" to keep them in order.`);
  }
}

let blocks = 0;
let errors = 0;
for (const file of files) {
  if (!fs.existsSync(file)) fail(`file not found: ${file}`);
  const lines = fs.readFileSync(file, 'utf8').replace(/^\uFEFF/, '').split(/\r?\n/);
  const report = (lineNumber, message) => {
    errors += 1;
    console.error(`${file}:${lineNumber}: ${message}`);
  };
  let fence = null;
  let section = null;
  for (let i = 0; i < lines.length; i++) {
    if (!fence) {
      const heading = lines[i].match(/^## +(.+?)\s*$/);
      if (heading) section = heading[1];
      const open = lines[i].match(/^ {0,3}(`{3,}|~{3,})\s*(\S*)/);
      if (open) {
        fence = { marker: open[1], mermaid: /^mermaid$/i.test(open[2]), start: i };
        // A text diagram here shows as raw code on the review page.
        if (!fence.mermaid && section === 'Quick Overview') {
          report(i + 1, 'draw the Quick Overview diagram as a Mermaid block, not as text.');
        }
      }
      continue;
    }
    const close = lines[i].match(/^ {0,3}(`{3,}|~{3,})\s*$/);
    if (!close || close[1][0] !== fence.marker[0] || close[1].length < fence.marker.length) continue;
    if (fence.mermaid) {
      blocks += 1;
      const body = lines.slice(fence.start + 1, i);
      if (body.length === 0) report(fence.start + 2, 'the Mermaid block is empty.');
      else checkBlock(body, fence.start + 2, report);
    }
    fence = null;
  }
  if (fence && fence.mermaid) report(fence.start + 1, 'the Mermaid block has no closing fence.');
}

if (errors > 0) {
  console.error(`check-mermaid: ${errors} problem(s). Fix each line above, then run the check again.`);
  process.exit(1);
}
console.log(`check-mermaid: ${blocks} Mermaid block(s) in ${files.length} file(s) pass.`);
