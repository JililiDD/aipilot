#!/usr/bin/env node

// Checks every Mermaid block in Markdown files against the safe subset (constitution §7, Diagrams).
// The subset parses in every Mermaid viewer, keeps labels intact, and lays out readably on the review page.
// A diagram of an architecture view also gets the checks of constitution §7, Architecture views.
// Prints each failing line as <file>:<line>: <reason> and exits 1; exits 0 when every block passes.

const fs = require('fs');
const path = require('path');
const { loadTypeCatalog } = require('./architecture-types');

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
const VIEW = /^(Container|Component) View\b/i;
const TYPED_LABEL = /^([^:]+): \S/;

// Returns the nodes of a statement such as `A["x"] -->|"y"| B --> C`, with its unlabeled link count,
// or null when any part is outside the subset.
function parseStatement(line) {
  const nodes = [];
  let unlabeledLinks = 0;
  let pos = 0;
  for (;;) {
    NODE.lastIndex = pos;
    const node = NODE.exec(line);
    if (!node) return null;
    nodes.push({ id: node[1], label: node[2] !== undefined ? node[2] : node[3] });
    pos = NODE.lastIndex;
    if (pos === line.length) return { nodes, unlabeledLinks };
    LINK.lastIndex = pos;
    const link = LINK.exec(line);
    if (!link) return null;
    if (link[1] === undefined) unlabeledLinks += 1;
    pos = LINK.lastIndex;
  }
}

// In an architecture view, a node label names a core or declared type before its name.
function checkNodeType(label, lineNumber, catalog, view, report) {
  const typeMatch = label.match(TYPED_LABEL);
  if (!typeMatch) report(lineNumber, `write the label "${label}" as "<Type>: <name> (<technology>)".`);
  else if (!catalog.groupsByType.has(typeMatch[1])) report(lineNumber, `"${typeMatch[1]}" is not a core type, and no Element Types table declares it.`);
  // A Component node is a part of one element's code, so only the view that opens that element shows it.
  else if (typeMatch[1] === 'Component' && !/^component$/i.test(view)) report(lineNumber, 'use the Component type only in a Component view.');
}

// Checks a flowchart. The catalog and the view are set only for an architecture view, which adds the Architecture views checks.
function checkBlock(lines, startLine, report, catalog, view) {
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
      else {
        subgraphIds.push(subgraph[1]);
        const typeMatch = subgraph[2].match(TYPED_LABEL);
        if (catalog && !/^System: \S/.test(subgraph[2]) && !(typeMatch && catalog.groupsByType.has(typeMatch[1]))) {
          report(lineNumber, 'title the subgraph "System: <name>", or with the node label of the element that a Component view opens.');
        }
      }
      openSubgraph = { directed: false };
      return;
    }
    if (ORDER.test(line)) {
      const ids = line.split(' ~~~ ');
      ids.slice(1).forEach((id, i) => orderPairs.add(`${ids[i]}>${id}`));
      ids.forEach(id => { if (!subgraphIds.includes(id)) report(lineNumber, `"${id}" is not a subgraph above. "~~~" only orders subgraphs.`); });
      return;
    }
    const statement = parseStatement(line);
    if (!statement) {
      report(lineNumber, UNSUPPORTED);
      return;
    }
    statement.nodes.forEach(({ id, label }) => {
      uses.push({ id, lineNumber });
      if (catalog && label !== undefined) checkNodeType(label, lineNumber, catalog, view, report);
    });
    // In an architecture view, each link reads as a sentence, so it needs its verb phrase.
    if (catalog && statement.unlabeledLinks > 0) report(lineNumber, 'label every link with a verb phrase, such as -->|"saves fetched data"|.');
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

// Sends a block to its check. Only a diagram in an architecture section gets the Architecture views checks.
function checkDiagram(lines, startLine, report, context, catalog) {
  if (!context.architecture) {
    checkBlock(lines, startLine, report, null);
    return;
  }
  const view = (context.heading.match(VIEW) || [])[1];
  if (!view) {
    report(startLine, 'name the view in the heading above the diagram: Container View or Component View.');
    return;
  }
  checkBlock(lines, startLine, report, catalog, view);
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
  const catalog = loadTypeCatalog(file);
  // architecture.md is one architecture section; a work-item has one under its "### Architecture" heading.
  const wholeFileIsArchitecture = path.basename(file).toLowerCase() === 'architecture.md';
  let insideArchitecture = wholeFileIsArchitecture;
  let fence = null;
  let section = null;
  let heading = '';
  for (let i = 0; i < lines.length; i++) {
    if (!fence) {
      const anyHeading = lines[i].match(/^(#{1,6}) +(.+?)\s*$/);
      if (anyHeading) {
        const depth = anyHeading[1].length;
        heading = anyHeading[2];
        if (depth === 2) section = heading;
        if (!wholeFileIsArchitecture && depth <= 3) insideArchitecture = depth === 3 && /^Architecture$/i.test(heading);
      }
      const open = lines[i].match(/^ {0,3}(`{3,}|~{3,})\s*(\S*)/);
      if (open) {
        fence = { marker: open[1], mermaid: /^mermaid$/i.test(open[2]), start: i, heading, architecture: insideArchitecture };
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
      else checkDiagram(body, fence.start + 2, report, fence, catalog);
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
