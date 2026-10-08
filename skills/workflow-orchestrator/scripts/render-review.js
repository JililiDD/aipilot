#!/usr/bin/env node
// Render an AIPilot markdown document into the review page that ezreview opens (the design in render-review.template.html).
// The document text stays verbatim and in order: the converter only adds structure, classes, and links,
// so that each ezreview annotation maps back to its markdown text.
//
// Usage:
//   node render-review.js <doc.md> <out.html> [--title "<Stage>: <doc name>"] [--issue-url <url-prefix> --issue-projects <KEY,KEY>]
//
// --issue-url and --issue-projects link issue keys such as BTE-1373 to <url-prefix>BTE-1373.
const fs = require('fs');
const path = require('path');
const { pathToFileURL } = require('url');

const MARKED_PATH = path.resolve(__dirname, '../vendor/marked/marked.esm.mjs');
const MERMAID_PATH = path.resolve(__dirname, '../vendor/mermaid/mermaid.min.js');
const TEMPLATE_PATH = path.join(__dirname, 'render-review.template.html');

function fail(message) {
  console.error(`render-review: ${message}`);
  process.exit(1);
}

// ---------- arguments ----------
const options = { title: '', issueUrl: '', issueProjects: new Set() };
const files = [];
const argv = process.argv.slice(2);
for (let i = 0; i < argv.length; i++) {
  if (argv[i] === '--title') options.title = argv[++i] || '';
  else if (argv[i] === '--issue-url') options.issueUrl = argv[++i] || '';
  else if (argv[i] === '--issue-projects') options.issueProjects = new Set((argv[++i] || '').split(',').map((k) => k.trim()).filter(Boolean));
  else files.push(argv[i]);
}
if (files.length !== 2) fail('usage: node render-review.js <doc.md> <out.html> [--title "<Stage>: <doc name>"] [--issue-url <url-prefix> --issue-projects <KEY,KEY>]');
const [inputPath, outputPath] = files;
for (const required of [inputPath, TEMPLATE_PATH, MARKED_PATH]) {
  if (!fs.existsSync(required)) fail(`file not found: ${required}`);
}

// Resolves the character references a browser would decode in the attribute and drops the whitespace
// and control characters it ignores, so `&#106;avascript:` or `java\tscript:` cannot hide the scheme.
function isSafeHref(href) {
  const fromCode = code => (code <= 0x10ffff ? String.fromCodePoint(code) : '\uFFFD');
  const target = String(href || '')
    .replace(/&#x([0-9a-f]+);?/gi, (m, hex) => fromCode(parseInt(hex, 16)))
    .replace(/&#(\d+);?/g, (m, dec) => fromCode(Number(dec)))
    .replace(/&colon;/gi, ':')
    .replace(/&(?:tab|newline);|[\u0000-\u0020\u007f-\u009f]/gi, '');
  const scheme = target.match(/^([^/?#]*?):/);
  return !scheme || /^(?:https?|mailto)$/i.test(scheme[1]);
}

async function main() {
const { marked } = await import(pathToFileURL(MARKED_PATH).href);
// Raw HTML in the markdown is shown as text; it never executes inside the review page.
// Links and images keep only web, mail, in-page, and relative targets: the page shares an origin
// with the review tool's approve endpoint, so a `javascript:` URL must render as plain text.
marked.use({
  renderer: {
    html: ({ text }) => escapeHtml(text),
    link(token) {
      return isSafeHref(token.href) ? false : this.parser.parseInline(token.tokens);
    },
    image: ({ href, text }) => (isSafeHref(href) ? false : escapeHtml(text)),
  },
});

// ---------- source ----------
// PowerShell 5.1 writes a UTF-8 BOM; it would hide the front matter fence.
let source = fs.readFileSync(inputPath, 'utf8').replace(/^\uFEFF/, '').replace(/\r\n/g, '\n');
const frontmatter = [];
const fence = source.match(/^---\n([\s\S]*?)\n---\n/);
if (fence) {
  for (const line of fence[1].split('\n')) {
    if (!line.trim()) continue;
    const pair = line.match(/^([\w-]+):\s*(.*)$/);
    frontmatter.push(pair ? [pair[1], pair[2]] : ['', line]);
  }
  source = source.slice(fence[0].length);
}
const tokens = marked.lexer(source, { gfm: true });

// ---------- shared helpers ----------
const LOCAL_PREFIXES = new Set(['AC', 'R', 'D', 'NG', 'EC', 'A', 'Q']);
const ID_ITEM = /^\*\*([A-Z]{1,3})-(\d+)(?: \(([^)]*)\))?:\*\*\s*([\s\S]*)$/;
const TASK = /^Task (\d+)\.(\d+):\s*([\s\S]*)$/;
const STORY = /^(User Story|Task Group|Story) (\d+):\s*([\s\S]*?)(?:\s+\((AC:[^)]*)\))?(\s+\[[^\]]*\])?\s*$/;
const FIELD_LINE = /^[A-Z][^:\n`]{0,40}:\s+\S/;
const PREMISE = /^\((P\d+)\)\s+([\s\S]*)$/;
const TERM_SECTIONS = new Set(['existing context', 'scope']);

const escapeHtml = (text) => String(text).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const plain = (markdown) => markdown.replace(/[`*_]/g, '').trim();
const slugOf = (text) => plain(text).replace(/\s*\([^)]*\)\s*$/, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'section';

// Pass 1: every anchor a reference may point to.
const definitions = new Set();
function collectDefinitions(list) {
  for (const token of list) {
    if (token.type === 'heading') {
      const story = token.text.match(STORY);
      if (story && token.depth === 3) definitions.add(`story-${story[2]}`);
    }
    if (token.type === 'list') {
      for (const item of token.items) {
        const id = item.text.match(ID_ITEM);
        if (id) definitions.add(`${id[1]}-${id[2]}`);
        const task = item.text.replace(/^\[[ xX]\]\s+/, '').match(TASK);
        if (task) definitions.add(`task-${task[1]}-${task[2]}`);
        for (const premise of item.text.matchAll(/\((P\d+)\)/g)) {
          if (/^Approach for /.test(item.text)) definitions.add(premise[1]);
        }
        // Approach Decisions list each premise as its own item, such as "(P1) <claim>".
        const premise = item.text.match(PREMISE);
        if (premise) definitions.add(premise[1]);
        if (item.tokens) collectDefinitions(item.tokens);
      }
    }
    if (token.type === 'blockquote' && token.tokens) collectDefinitions(token.tokens);
  }
}
collectDefinitions(tokens);

const REFERENCE = /\b(?:(AC|R|D|NG|EC|A|Q)-(\d+)|Task (\d+)\.(\d+)|(?<!User )Story (\d+)|([A-Z][A-Z0-9]{1,9})-(\d+))\b/g;
function linkify(html) {
  let insideLinkOrCode = 0;
  return html.split(/(<[^>]+>)/).map((part) => {
    if (part.startsWith('<')) {
      if (/^<(a|code)\b/i.test(part)) insideLinkOrCode += 1;
      else if (/^<\/(a|code)>/i.test(part)) insideLinkOrCode -= 1;
      return part;
    }
    if (insideLinkOrCode > 0) return part;
    return part.replace(REFERENCE, (match, prefix, number, taskMajor, taskMinor, storyNumber, issueProject) => {
      let anchor = null;
      if (prefix) anchor = `${prefix}-${number}`;
      else if (taskMajor) anchor = `task-${taskMajor}-${taskMinor}`;
      else if (storyNumber) anchor = `story-${storyNumber}`;
      // An ID reference takes the color of its type, like its definition chip.
      const typeClass = prefix ? ` t-${prefix.toLowerCase()}` : '';
      if (anchor) return definitions.has(anchor) ? `<a class="ref${typeClass}" href="#${anchor}">${match}</a>` : match;
      if (issueProject && !LOCAL_PREFIXES.has(issueProject) && options.issueUrl && options.issueProjects.has(issueProject)) {
        return `<a class="ext" href="${escapeHtml(options.issueUrl + match)}" target="_blank" rel="noopener">${match}</a>`;
      }
      return match;
    });
  }).join('');
}
const inline = (markdown) => linkify(marked.parseInline(markdown, { gfm: true }));
const inlineNoLinks = (markdown) => marked.parseInline(markdown, { gfm: true });

// ---------- block renderers ----------
// An item's first text line drives its layout; nested blocks (lists, code) render below it.
const TASK_BOX = /^\[[ xX]\]\s+/;
function splitItem(item) {
  if (item.task) item.text = item.text.replace(TASK_BOX, '');
  const children = (item.tokens || []).filter((token) => token.type !== 'space');
  const hasBlocks = children.some((token) => ['list', 'code', 'table', 'blockquote'].includes(token.type));
  if (!hasBlocks) return { text: item.text, blocks: '' };
  const first = children.find((token) => token.type === 'text' || token.type === 'paragraph');
  if (first && item.task) first.text = first.text.replace(TASK_BOX, '');
  const rest = children.filter((token) => token !== first);
  return { text: first ? first.text : '', blocks: rest.map((token) => renderBlock(token, {})).join('\n') };
}

// An ID and its concept anchor read as one colored chip, such as "AC-1 (ETF Files)".
function idChip(prefix, id, name) {
  return `<span class="idchip t-${prefix.toLowerCase()}"><span class="id-k">${id}</span>${name ? ` <span class="id-n">(${inlineNoLinks(name)})</span>` : ''}</span>`;
}

function idDefinition(prefix, number, name, text, blocks) {
  const id = `${prefix}-${number}`;
  return `<li id="${id}" data-id="${id}" data-name="${escapeHtml(plain(name || id))}">`
    + `${idChip(prefix, id, name)}<div class="def-body">${inline(text)}${blocks ? `\n${blocks}` : ''}</div></li>`;
}

function criterionItem(prefix, number, name, text, blocks) {
  const id = `${prefix}-${number}`;
  // Highlight EARS words after markdown renders, while keeping the entire criterion together and verbatim.
  const body = inline(text).replace(/^(When|While|If|Where)\b/, '<span class="kw">$1</span>')
    .replace(/\bthen\b(?=\s+the system shall)/, '<span class="kw">then</span>')
    .replace(/\b([Tt]he system) shall\b/, '$1 <span class="shall">shall</span>');
  return `<li id="${id}" data-id="${id}" data-name="${escapeHtml(plain(name || id))}">`
    + `${idChip(prefix, id, name)}`
    + `<div class="criterion-body">${body}${blocks ? `\n${blocks}` : ''}</div></li>`;
}

function taskItem(item) {
  const { text, blocks } = splitItem(item);
  const [doPart, ...verifyParts] = text.split(/\s+—\s+Verify:\s+/);
  const verify = verifyParts.join(' — Verify: ');
  const task = doPart.match(TASK);
  const checkbox = (labelId) => `<input type="checkbox" disabled${item.checked ? ' checked' : ''}${labelId ? ` aria-labelledby="${labelId}"` : ''}>`;
  const verifyHtml = verifyParts.length ? ` <span class="verify"><span class="verify-label">— Verify:</span> ${inline(verify)}</span>` : '';
  if (task) {
    const id = `task-${task[1]}-${task[2]}`;
    return `<li id="${id}" data-id="${id}" data-name="Task ${task[1]}.${task[2]}">${checkbox(`l-${id}`)}<div>`
      + `<span class="task-id" id="l-${id}">Task ${task[1]}.${task[2]}:</span> <span class="task-do">${inline(task[3])}</span>${verifyHtml}${blocks ? `\n${blocks}` : ''}</div></li>`;
  }
  const label = doPart.match(/^([A-Z][A-Za-z ]{0,20}:)\s*([\s\S]*)$/);
  const body = label ? `<span class="task-id">${escapeHtml(label[1])}</span> <span class="task-do">${inline(label[2])}</span>` : `<span class="task-do">${inline(doPart)}</span>`;
  return `<li>${checkbox('')}<div>${body}${verifyHtml}${blocks ? `\n${blocks}` : ''}</div></li>`;
}

function approachItem(text) {
  const lead = text.match(/^(Approach for [^:]*:)\s+([\s\S]*)$/);
  if (!lead) return null;
  const segments = lead[2].split(/\s+(?=(?:Dropped|Premises):)/);
  let html = `<li class="approach"><span class="lead-in">${inline(lead[1])}</span> <span class="choice">${inline(segments[0])}</span>`;
  for (const segment of segments.slice(1)) {
    if (segment.startsWith('Premises:')) {
      html += ' <span class="row"><span class="row-label">Premises:</span></span>';
      const rest = segment.slice('Premises:'.length).trim();
      for (const premise of rest.split(/\s+(?=\(P\d+\))/)) {
        const parts = premise.match(/^\((P\d+)\)\s*([\s\S]*)$/);
        html += parts
          ? ` <span class="premise" id="${parts[1]}" data-id="${parts[1]}" data-name="Premise"><span class="pid">(${parts[1]})</span> ${inline(parts[2])}</span>`
          : ` <span class="row">${inline(premise)}</span>`;
      }
    } else {
      const parts = segment.match(/^(Dropped:)\s*([\s\S]*)$/);
      html += ` <span class="row"><span class="row-label">${parts[1]}</span> ${inline(parts[2])}</span>`;
    }
  }
  return `${html}</li>`;
}

function fieldList(lines, className) {
  const rows = lines.map((line) => {
    const pair = line.match(/^([^:]+:)\s+([\s\S]*)$/);
    const key = pair[1];
    let value = pair[2];
    let valueHtml;
    if (/^Tests:$/.test(key) && /^\w+$/.test(value)) valueHtml = `<span class="chip">${escapeHtml(value)}</span>`;
    else if (value.includes(' · ')) valueHtml = tiers(value);
    else valueHtml = inline(value);
    return `<dt>${escapeHtml(key)}</dt><dd>${valueHtml}</dd>`;
  });
  return `<dl class="${className}">\n${rows.join('\n')}\n</dl>`;
}

function tiers(value) {
  const parts = value.split(' · ');
  return parts.map((part, index) => {
    const tier = part.match(/^(\w+)\s+(`[^`]+`)\s*([\s\S]*)$/);
    const separator = index < parts.length - 1 ? ' <span class="sep">·</span>' : '';
    if (!tier) return `<span class="tier">${inline(part)}${separator}</span>`;
    // A note such as "touched modules: x" sits on the tier's name line, so the command keeps its own line.
    const noteText = tier[3].trim().replace(/^\(([\s\S]*)\)$/, '$1');
    const note = noteText ? ` <span class="tnote">${inline(noteText)}</span>` : '';
    return `<span class="tier"><span class="tname">${escapeHtml(tier[1])}</span>${note} ${inline(tier[2])}${separator}</span>`;
  }).join('\n');
}

function renderTable(token) {
  const header = token.header.map((cell) => cell.text);
  const beforeColumn = header.findIndex((text) => /^before$/i.test(plain(text)));
  const afterColumn = header.findIndex((text) => /^after\b/i.test(plain(text)));
  const compare = beforeColumn >= 0 && afterColumn >= 0;
  const align = (index) => (token.align[index] ? ` style="text-align:${token.align[index]}"` : '');
  const head = header.map((text, index) => `<th${align(index)}>${inline(text)}</th>`).join('');
  const body = token.rows.map((row) => {
    const cells = row.map((cell, index) => {
      let className = '';
      if (compare && index === afterColumn) {
        if (/^unchanged$/i.test(plain(cell.text))) className = 'same';
        else if (plain(cell.text) !== plain(row[beforeColumn].text)) className = 'changed';
      }
      return `<td${className ? ` class="${className}"` : ''}${align(index)}>${inline(cell.text)}</td>`;
    });
    // The chosen candidate of an Approach Decisions table stands out from the dropped ones.
    const chosen = row.some((cell) => /^chosen$/i.test(plain(cell.text)));
    return `<tr${chosen ? ' class="chosen"' : ''}>${cells.join('')}</tr>`;
  }).join('\n');
  return `<div class="table-card wide${compare ? ' compare' : ''}">\n<table>\n<thead><tr>${head}</tr></thead>\n<tbody>\n${body}\n</tbody>\n</table>\n</div>`;
}

function renderCode(token) {
  if ((token.lang || '').trim().toLowerCase() === 'mermaid') {
    usesMermaid = true;
    return `<figure class="diagram wide">\n<div class="diagram-view"></div>\n<details class="source"><summary data-chrome>Diagram source</summary>\n<pre class="mermaid-src"><code>${escapeHtml(token.text)}</code></pre>\n</details>\n</figure>`;
  }
  return `<pre class="code"><code>${escapeHtml(token.text)}</code></pre>`;
}

// A list item can swallow the next line as a lazy continuation, such as a "Done when:" line.
function splitLazyDone(items) {
  let done = null;
  for (const item of items) {
    const at = item.text.search(/\n(?=Done when:)/);
    if (at >= 0) {
      done = item.text.slice(at + 1);
      item.text = item.text.slice(0, at);
    }
  }
  return done;
}

function itemContent(item) {
  const hasBlocks = (item.tokens || []).some((token) => ['list', 'code', 'table', 'blockquote'].includes(token.type));
  if (!hasBlocks) return inline(item.text);
  return item.tokens.map((token) => {
    if (token.type === 'text') return inline(token.text);
    if (token.type === 'paragraph') return `<p>${inline(token.text)}</p>`;
    if (token.type === 'space') return '';
    return renderBlock(token, {});
  }).join('\n');
}

function renderList(token, context) {
  const done = splitLazyDone(token.items);
  const doneHtml = done ? `\n<p class="done"><span class="done-label">Done when:</span> ${inline(done.replace(/^Done when:\s*/, ''))}</p>` : '';
  const items = token.items;
  if (token.ordered) {
    const start = token.start && token.start !== 1 ? ` start="${token.start}"` : '';
    return `<ol class="steps"${start}>\n${items.map((item) => `<li>${itemContent(item)}</li>`).join('\n')}\n</ol>${doneHtml}`;
  }
  const parts = items.map(splitItem);
  const premises = parts.map((part) => (part.blocks ? null : part.text.match(PREMISE)));
  if (context.h3 === 'approach decisions' && premises.length && premises.every(Boolean)) {
    const rows = premises.map(([, id, text]) => `<li class="premise" id="${id}" data-id="${id}" data-name="Premise"><span class="pid">(${id})</span> ${inline(text)}</li>`);
    return `<ul class="premises">\n${rows.join('\n')}\n</ul>${doneHtml}`;
  }
  const ids = parts.map((part) => part.text.match(ID_ITEM));
  if (ids.length && ids.every(Boolean)) {
    const prefixes = new Set(ids.map((id) => id[1]));
    if ([...prefixes].every((prefix) => ['AC', 'R', 'D'].includes(prefix))) {
      const rows = ids.map((id, k) => criterionItem(id[1], id[2], id[3], id[4], parts[k].blocks)).join('\n');
      return `<ul class="criteria wide">\n${rows}\n</ul>${doneHtml}`;
    }
    const assume = prefixes.size === 1 && prefixes.has('A');
    return `<ul class="defs${assume ? ' assume' : ''}">\n${ids.map((id, k) => idDefinition(id[1], id[2], id[3], id[4], parts[k].blocks)).join('\n')}\n</ul>${doneHtml}`;
  }
  if (items.some((item) => item.task)) {
    return `<ul class="tasks">\n${items.map(taskItem).join('\n')}\n</ul>${doneHtml}`;
  }
  if (context.h3 === 'review focus') {
    const cards = items.map((item, k) => {
      const head = parts[k].blocks ? null : item.text.match(/^([^:`]+?:)\s+([\s\S]*)$/);
      return head ? `<li><span class="f-head">${inline(head[1])}</span> ${inline(head[2])}</li>` : `<li>${itemContent(item)}</li>`;
    });
    return `<ul class="focus wide">\n${cards.join('\n')}\n</ul>${doneHtml}`;
  }
  const rendered = items.map((item, k) => {
    if (context.h3 === 'reuse notes' && !parts[k].blocks) {
      const approach = approachItem(item.text);
      if (approach) return approach;
    }
    // In a list that mixes ID items with plain items, each ID item still gets its chip.
    if (ids[k]) return idDefinition(ids[k][1], ids[k][2], ids[k][3], ids[k][4], parts[k].blocks);
    let html = itemContent(item);
    if (TERM_SECTIONS.has(context.h3)) html = html.replace(/<strong>/g, '<strong class="term">');
    return `<li>${html}</li>`;
  });
  return `<ul class="notes${context.h2 === 'plan' && context.h3 === 'non-goals' ? ' non-goals' : ''}">\n${rendered.join('\n')}\n</ul>${doneHtml}`;
}

function renderParagraph(token, context) {
  const text = token.text;
  if (/^Done when:\s/.test(text)) {
    return `<p class="done"><span class="done-label">Done when:</span> ${inline(text.replace(/^Done when:\s*/, ''))}</p>`;
  }
  const lines = text.split('\n');
  if (context.fields && lines.every((line) => FIELD_LINE.test(line))) return fieldList(lines, context.fields);
  if (context.h3 === 'assumptions' && context.firstInH3) return `<p class="note">${inline(text)}</p>`;
  let html = inline(text);
  if (TERM_SECTIONS.has(context.h3)) html = html.replace(/<strong>/g, '<strong class="term">');
  return `<p>${html}</p>`;
}

function renderBlock(token, context) {
  switch (token.type) {
    case 'paragraph': return renderParagraph(token, context);
    case 'list': return renderList(token, context);
    case 'table': return renderTable(token);
    case 'code': return renderCode(token);
    case 'hr': return '<hr>';
    case 'html': return `<p>${escapeHtml(token.text.trim())}</p>`;
    case 'blockquote': {
      const inner = (token.tokens || []).map((child) => renderBlock(child, {})).join('\n');
      return `<blockquote class="${context.h2 === 'quick overview' && context.firstInH2 ? 'lead' : 'quote'}">\n${inner}\n</blockquote>`;
    }
    case 'heading': {
      const tag = `h${Math.min(token.depth, 6)}`;
      // In scope and Out of scope get the review page's green and rose.
      let className = token.depth === 1 ? 'in-section' : '';
      if (token.depth === 4 && /^in scope$/i.test(plain(token.text))) className = 'scope-in';
      if (token.depth === 4 && /^out of scope$/i.test(plain(token.text))) className = 'scope-out';
      return `<${tag}${className ? ` class="${className}"` : ''}>${inline(token.text)}</${tag}>`;
    }
    case 'space': return '';
    default: return token.text ? `<p>${inline(token.text)}</p>` : '';
  }
}

// ---------- pass 2: walk the document ----------
let usesMermaid = false;
let title = '';
let stamp = '';
const headerExtras = [];
const sections = [];
const usedIds = new Set();
let current = null;
let h3 = '';
let firstInH2 = false;
let firstInH3 = false;

function uniqueId(text, parent) {
  let id = slugOf(text);
  if (usedIds.has(id) && parent) id = `${parent}-${id}`;
  let candidate = id;
  for (let n = 2; usedIds.has(candidate); n++) candidate = `${id}-${n}`;
  usedIds.add(candidate);
  return candidate;
}

for (let i = 0; i < tokens.length; i++) {
  const token = tokens[i];
  if (token.type === 'space') continue;

  // An h1 heads the page only before the first section; later it stays in place to keep the order.
  if (token.type === 'heading' && token.depth === 1 && !title && !current) {
    title = token.text;
    usedIds.add(slugOf(title));
    continue;
  }
  if (!current && !stamp && token.type === 'paragraph' && /^Version \d+/.test(token.text)) {
    stamp = token.text;
    continue;
  }
  if (token.type === 'heading' && token.depth === 2) {
    current = { id: uniqueId(token.text), title: token.text, blocks: [] };
    sections.push(current);
    h3 = '';
    firstInH2 = true;
    firstInH3 = false;
    continue;
  }
  if (!current) {
    headerExtras.push(renderBlock(token, {}));
    continue;
  }
  const context = {
    h2: plain(current.title).toLowerCase(),
    h3: h3.replace(/\s*\(.*$/, '').toLowerCase(),
    firstInH2,
    firstInH3,
    fields: plain(current.title).toLowerCase() === 'plan' && !h3 ? 'settings wide' : '',
  };

  if (token.type === 'heading' && token.depth === 3) {
    const story = token.text.match(STORY);
    if (story) {
      const number = story[2];
      const titleMarkdown = `${story[1]} ${number}: ${story[3]}`;
      const ac = story[4] ? story[4].replace(/^AC:\s*/, '').split(',').map((id) => id.trim()).filter(Boolean) : [];
      const acHtml = ac.length
        ? ` <span class="acs"><span class="p">(AC:</span> ${ac.map((id) => linkify(escapeHtml(id))).join('<span class="p">,</span> ')}<span class="p">)</span></span>`
        : '';
      const marker = story[5] ? ` <span class="p">${escapeHtml(story[5].trim())}</span>` : '';
      const id = `story-${number}`;
      usedIds.add(id);
      const body = [];
      while (i + 1 < tokens.length && !(tokens[i + 1].type === 'heading' && tokens[i + 1].depth <= 3)) {
        const next = tokens[++i];
        if (next.type === 'space') continue;
        body.push(renderBlock(next, { h2: context.h2, h3: 'story', fields: 'facts' }));
      }
      current.blocks.push(`<div class="story wide">\n<h3 id="${id}" data-id="${id}" data-name="${escapeHtml(plain(titleMarkdown))}"><span class="h-title">${inlineNoLinks(titleMarkdown)}${marker}</span>${acHtml}</h3>\n${body.join('\n')}\n</div>`);
      h3 = 'story';
      firstInH2 = false;
      continue;
    }
    h3 = token.text;
    current.blocks.push(`<h3 id="${uniqueId(token.text, current.id)}">${inline(token.text)}</h3>`);
    firstInH2 = false;
    firstInH3 = true;
    continue;
  }

  // Approach Decisions: each choice's heading, table, and premises form one card.
  if (context.h3 === 'approach decisions' && token.type === 'heading' && token.depth === 4) {
    const parts = [`<h4>${inline(token.text)}</h4>`];
    while (i + 1 < tokens.length && !(tokens[i + 1].type === 'heading' && tokens[i + 1].depth <= 4)) {
      const next = tokens[++i];
      if (next.type === 'space') continue;
      if (next.type === 'paragraph' && /^Premises:\s*$/.test(next.text)) parts.push(`<p class="premises-label">${inline(next.text)}</p>`);
      else parts.push(renderBlock(next, context));
    }
    current.blocks.push(`<div class="decision wide">\n${parts.join('\n')}\n</div>`);
    firstInH2 = false;
    firstInH3 = false;
    continue;
  }

  // Stop Conditions: the lead-in paragraph and its list form one callout.
  if (context.h3 === 'stop conditions' && token.type === 'paragraph' && tokens[i + 1] && tokens[i + 1].type === 'list') {
    const list = tokens[++i];
    current.blocks.push(`<div class="stops">\n<p>${inline(token.text)}</p>\n<ul>\n${list.items.map((item) => `<li>${itemContent(item)}</li>`).join('\n')}\n</ul>\n</div>`);
    firstInH2 = false;
    firstInH3 = false;
    continue;
  }

  current.blocks.push(renderBlock(token, context));
  firstInH2 = false;
  firstInH3 = false;
}

// The tab shows the review stage, as before; the source path lets ezreview tie the page to its markdown.
const headTitle = `Review: ${options.title || path.basename(inputPath)}`;
const sourceMd = path.resolve(inputPath).replace(/\\/g, '/');

// ---------- assemble ----------
const meta = frontmatter.length
  ? `<dl class="meta">\n${frontmatter.map(([key, value]) => (key
    ? `<div><dt>${escapeHtml(key)}:</dt><dd${key === 'status' ? ' class="status"' : ''}>${escapeHtml(value)}</dd></div>`
    : `<div><dd>${escapeHtml(value)}</dd></div>`)).join('\n')}\n</dl>\n`
  : '';
const header = `<header>\n${meta}${title ? `<h1 id="${slugOf(title)}">${inlineNoLinks(title)}</h1>\n` : ''}`
  + `${stamp ? `<p class="stamp">${inline(stamp)}</p>\n` : ''}${headerExtras.join('\n')}</header>`;
const body = sections.map((section) => {
  const content = section.blocks.filter(Boolean).join('\n');
  // The toggle folds the section; the page script wires it.
  const toggle = `<button type="button" class="band-toggle" aria-expanded="true" aria-label="Collapse ${escapeHtml(plain(section.title))}" title="Collapse section"><svg viewBox="0 0 16 16" aria-hidden="true"><path d="M4 6l4 4 4-4" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg></button>`;
  return `<section class="band" id="${section.id}">\n<h2><span class="h-title">${inline(section.title)}</span>${toggle}</h2>\n${content || '<div class="empty" aria-hidden="true"></div>'}\n</section>`;
}).join('\n\n');
const article = `<!-- CONTENT:START -->\n<article class="doc">\n\n${header}\n\n${body}\n\n</article>\n<!-- CONTENT:END -->`;

let mermaidScript = '';
if (usesMermaid) {
  if (!fs.existsSync(MERMAID_PATH)) fail(`vendored mermaid not found: ${MERMAID_PATH}`);
  mermaidScript = `<script>${fs.readFileSync(MERMAID_PATH, 'utf8').replace(/<\/script/gi, '<\\/script')}</script>`;
}
const template = fs.readFileSync(TEMPLATE_PATH, 'utf8');
// One pass over the template, so placeholder text inside the document or the library is never replaced.
const html = template.split('{{HEAD_TITLE}}').join(escapeHtml(headTitle))
  .split('{{SOURCE_MD}}').join(escapeHtml(sourceMd))
  .replace(/\{\{(CONTENT|MERMAID)\}\}/g, (match, name) => (name === 'CONTENT' ? article : mermaidScript));
fs.writeFileSync(outputPath, html);
console.log(`render-review: wrote ${outputPath} (${html.length} chars, ${sections.length} sections${usesMermaid ? ', mermaid inlined' : ''})`);
}

main().catch((error) => fail(error.message));
