#!/usr/bin/env node

// Enhanced deterministic Markdown-to-HTML review renderer
// Zero token cost: LLM writes standard Markdown, this script renders rich visual UI projection.

const fs = require('fs');
const path = require('path');
const { pathToFileURL } = require('url');

const MARKED_PATH = path.resolve(__dirname, '../vendor/marked/marked.esm.mjs');

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

function escapeHtml(text) {
  return String(text || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function transformArchitectureSpikeToVisual(rawText) {
  const hasLayers = /\[[^\]]+(?:Layer|Tier|Component|Service|Module)[^\]]*\]/i.test(rawText);
  const hasStatus = /\[[^\]]+(?:Status|Matrix|Probe|Check|Platform)[^\]]*\]/i.test(rawText);
  const hasVerdict = /\[[^\]]+(?:Verdict|Outcome|Result|Decision|Status|Gate)[^\]]*\]/i.test(rawText);

  if (!hasLayers && !hasStatus && !hasVerdict) {
    return null;
  }

  const firstLine = rawText.trim().split('\n')[0].replace(/[┌─┐└┘═]/g, '').trim();
  const boardTitle = firstLine.length > 3 && !firstLine.startsWith('[') ? firstLine : 'System Architecture & Execution Pipeline';

  const layerRegex = /\[\s*([^\]]+(?:Layer|Tier|Component|Service|Module|Store|UI|Database)[^\]]*)\s*\]\s*\n\s*(?:[^\n]*\s*)?([^\n│▼]+)/gi;
  let layerMatches = [];
  let match;
  while ((match = layerRegex.exec(rawText)) !== null) {
    layerMatches.push({
      badge: match[1].trim(),
      title: match[2].trim()
    });
  }

  const connMatch = rawText.match(/│\s*\(([^)]+)\)/i);
  const connProtocol = connMatch ? connMatch[1].trim() : 'Protocol / Data Flow';

  let stackHtml = '';
  if (layerMatches.length > 0) {
    stackHtml = `<div class="arch-stack">` + layerMatches.map((layer, idx) => {
      const isTop = idx === 0;
      const layerClass = isTop ? 'app-layer' : 'engine-layer';
      const badgeClass = isTop ? 'app-badge' : 'engine-badge';
      return `
        <div class="arch-layer-card ${layerClass}">
          <div class="layer-badge ${badgeClass}">${escapeHtml(layer.badge)}</div>
          <div class="layer-content">
            <div class="layer-main-title">${escapeHtml(layer.title)}</div>
          </div>
        </div>
        ${idx < layerMatches.length - 1 ? `
        <div class="arch-connector">
          <div class="connector-line"></div>
          <div class="connector-badge">${escapeHtml(connProtocol)}</div>
          <div class="connector-arrow">▼</div>
        </div>` : ''}
      `;
    }).join('') + `</div>`;
  }

  const statusLineRegex = /(?:[•\-\*]|\s{2,})([^\n:]+?):\s*([✅🛑⚠️✔✖❌][^\n]+)/gi;
  let statusCards = [];
  while ((match = statusLineRegex.exec(rawText)) !== null) {
    const name = match[1].trim();
    const rest = match[2].trim();
    const isPass = /✅|✔|PASS|VIABLE|SUPPORTED|OK|READY/i.test(rest);
    const isFail = /🛑|✖|❌|FAIL|BLOCKED|REJECTED|ERROR/i.test(rest);
    const cardClass = isPass ? 'android-pass' : (isFail ? 'ios-blocked' : 'generic-status-card');
    const pillClass = isPass ? 'pass-pill' : (isFail ? 'fail-pill' : 'warn-pill');
    const badge = isPass ? 'PASS' : (isFail ? 'BLOCKED' : 'INFO');

    statusCards.push(`
      <div class="platform-status-card ${cardClass}">
        <div class="platform-header">
          <span>${escapeHtml(name)}</span>
          <span class="status-pill ${pillClass}">${badge}</span>
        </div>
        <div class="platform-desc">${escapeHtml(rest.replace(/^[✅🛑⚠️✔✖❌]\s*(?:VIABLE|BLOCKED|PASS|FAIL|SUPPORTED)?\s*\(?/, '').replace(/\)?$/, '').trim() || rest)}</div>
      </div>
    `);
  }

  let statusGridHtml = '';
  if (statusCards.length > 0) {
    statusGridHtml = `
      <div class="platform-status-grid">
        ${statusCards.join('')}
      </div>
    `;
  }

  const verdictRegex = /\[\s*(?:Spike\s*)?(?:Verdict|Outcome|Result|Decision|Status|Gate)\s*\]\s*\n?\s*([🛑✅⚠️✔✖❌]?[^\n]+)/i;
  const vMatch = rawText.match(verdictRegex);
  let verdictHtml = '';
  if (vMatch) {
    const fullVerdict = vMatch[1].trim();
    const isStop = /🛑|✖|❌|STOP|BLOCKED|FAIL/i.test(fullVerdict);
    const isPass = /✅|✔|PASS|GO|READY|APPROVED/i.test(fullVerdict);
    const vIcon = isStop ? '🛑' : (isPass ? '✅' : '⚠️');
    const vClass = isStop ? 'verdict-banner-stop' : (isPass ? 'verdict-banner-pass' : 'verdict-banner-warn');
    
    verdictHtml = `
      <div class="verdict-banner ${vClass}">
        <div class="verdict-icon">${vIcon}</div>
        <div>
          <div class="verdict-title">Stage Verdict</div>
          <div class="verdict-desc">${escapeHtml(fullVerdict.replace(/^[🛑✅⚠️✔✖❌]\s*/, ''))}</div>
        </div>
      </div>
    `;
  }

  return `
    <div class="arch-board-container">
      <div class="arch-board-header">
        <span class="arch-board-title">${escapeHtml(boardTitle)}</span>
      </div>
      ${stackHtml}
      ${statusGridHtml}
      ${verdictHtml}
    </div>
  `;
}

function transformAsciiToMiniScreens(rawAscii) {
  if (!rawAscii.includes('┌') || !rawAscii.includes('┘')) {
    return null;
  }

  // Check if this is an Architecture / Feasibility Spike diagram
  if (/Layer|Tier|Status|Verdict|Protocol/i.test(rawAscii) && (rawAscii.includes('═') || rawAscii.includes('▼'))) {
    const archResult = transformArchitectureSpikeToVisual(rawAscii);
    if (archResult) return archResult;
  }

  // Line-by-line track parser for screen workflows
  const lines = rawAscii.split(/\r?\n/);
  const tracks = [];
  let currentTrack = null;

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    const isTrackHeader = /(?:BEFORE|AFTER)/i.test(trimmed) && !trimmed.includes('│') && !trimmed.includes('┌');
    if (isTrackHeader) {
      currentTrack = { title: trimmed, lines: [] };
      tracks.push(currentTrack);
    } else if (currentTrack) {
      currentTrack.lines.push(line);
    } else if (line.includes('┌')) {
      currentTrack = { title: 'Workflow Flow', lines: [line] };
      tracks.push(currentTrack);
    }
  }

  if (tracks.length === 0) return null;

  let htmlTracks = '';

  for (const track of tracks) {
    const isBefore = /BEFORE|🛑/i.test(track.title);
    const isAfter = /AFTER|🚀/i.test(track.title);
    const trackClass = isBefore ? 'before-track' : (isAfter ? 'after-track' : 'generic-track');
    const badgeText = isBefore ? 'OLD' : (isAfter ? 'NEW' : 'FLOW');

    const trackLines = track.lines;
    let boxColumns = [];
    let topBorderLine = trackLines.find(l => l.includes('┌') && l.includes('┐'));

    if (topBorderLine) {
      let regex = /┌[─]+┐/g;
      let match;
      while ((match = regex.exec(topBorderLine)) !== null) {
        boxColumns.push({
          start: match.index,
          end: match.index + match[0].length,
          lines: []
        });
      }

      for (const line of trackLines) {
        if (!line.includes('│')) continue;
        boxColumns.forEach(box => {
          if (line.length >= box.start) {
            let content = line.substring(box.start + 1, Math.min(line.length, box.end - 1)).replace(/[│┌┐└┘]/g, '').trim();
            if (content) box.lines.push(content);
          }
        });
      }
    }

    if (boxColumns.length === 0) continue;

    let arrowLabels = [];
    for (let i = 0; i < boxColumns.length - 1; i++) {
      const gapStart = boxColumns[i].end;
      const gapEnd = boxColumns[i + 1].start;
      let label = i === 0 ? 'Tap' : 'Next';
      for (const line of trackLines) {
        if (line.length >= gapStart) {
          let gapSlice = line.substring(Math.max(0, gapStart - 1), Math.min(line.length, gapEnd + 1)).replace(/[│┌┐└┘─>]/g, '').trim();
          if (gapSlice.length > 0) {
            label = gapSlice;
            break;
          }
        }
      }
      arrowLabels.push(label);
    }

    let screensHtml = '';
    boxColumns.forEach((box, idx) => {
      let screenTitle = box.lines[0] || 'Step ' + (idx + 1);
      let bodyLines = box.lines.slice(1);

      let bodyElements = bodyLines.map((l, lIdx) => {
        if (l.includes('[') && l.includes(']')) {
          let btnText = l.replace(/[•\*\-]/g, '').trim();
          let isRemoved = /[*~]|Manually|Removed|Delete|Deprecated/i.test(btnText);
          let isHighlight = !isRemoved && (/^[+]|Submit|Save|Start|Create|Upload|Confirm|Primary/i.test(btnText) || lIdx === 0);
          let chipClass = isRemoved ? 'node-chip node-btn-chip removed' : (isHighlight ? 'node-chip node-btn-chip' : 'node-chip');
          return `<div class="${chipClass}">${escapeHtml(btnText.replace(/[\[\]]/g, ''))}</div>`;
        }
        return `<div class="node-chip">${escapeHtml(l)}</div>`;
      }).join('');

      let isLargeScreen = (box.end - box.start) > 30;
      let screenWidthStyle = isLargeScreen ? 'width:260px;' : 'width:210px;';
      let stepNum = idx < 9 ? ('0' + (idx + 1)) : String(idx + 1);

      screensHtml += `
        <div class="flow-node" style="${screenWidthStyle}">
          <div class="node-header">
            <span class="node-title">${escapeHtml(screenTitle)}</span>
            <span class="node-step-tag">${stepNum}</span>
          </div>
          <div class="node-body">
            ${bodyElements || '<div class="node-chip">Step Action</div>'}
          </div>
        </div>
      `;

      if (idx < boxColumns.length - 1) {
        screensHtml += `
          <div class="flow-connector">
            <span class="connector-label-pill">${escapeHtml(arrowLabels[idx] || 'Next')}</span>
            <div class="connector-line-wrap">
              <div class="connector-line"></div>
              <div class="connector-arrow-head">➔</div>
            </div>
            <span class="connector-step-indicator">Step ${idx + 1}</span>
          </div>
        `;
      }
    });

    htmlTracks += `
      <div class="flow-track ${trackClass}">
        <div class="track-header">
          <span class="track-title">${escapeHtml(track.title)}</span>
          <span class="track-step-badge">${escapeHtml(badgeText)}</span>
        </div>
        <div class="pipeline-row">
          ${screensHtml}
        </div>
      </div>
    `;
  }

  return htmlTracks ? `<div class="flow-comparison-container">${htmlTracks}</div>` : null;
}

async function render() {
  if (!fs.existsSync(MARKED_PATH)) {
    fail(`vendored marked not found: ${MARKED_PATH}`);
  }

  const { marked } = await import(pathToFileURL(MARKED_PATH).href);
  let markdown = fs.readFileSync(inputPath, 'utf8');

  // Extract frontmatter for header metadata
  let meta = {};
  const frontmatterMatch = markdown.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n/);
  if (frontmatterMatch) {
    const rawYaml = frontmatterMatch[1];
    rawYaml.split('\n').forEach(line => {
      const parts = line.split(':');
      if (parts.length >= 2) {
        meta[parts[0].trim()] = parts.slice(1).join(':').trim();
      }
    });
    markdown = markdown.replace(frontmatterMatch[0], '');
  }

  let body = marked.parse(markdown, { gfm: true });

  // Deterministic transformation: convert ASCII screen / architecture diagrams into visual components
  body = body.replace(/<pre><code>([\s\S]*?<\/code><\/pre>)/gi, (fullMatch, codeContent) => {
    const decoded = codeContent
      .replace(/<\/code><\/pre>/, '')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&amp;/g, '&')
      .replace(/&quot;/g, '"');

    const visualHtml = transformAsciiToMiniScreens(decoded);
    if (visualHtml) {
      return visualHtml;
    }
    return fullMatch;
  });

  // Clean nested / redundant numbering in markdown lists
  body = body.replace(/<ol[^>]*>\s*<li>\s*<ol[^>]*>\s*<li>/gi, '<ol><li>');
  body = body.replace(/<\/li>\s*<\/ol>\s*<\/li>/gi, '</li>');
  body = body.replace(/<li>(\s*<p>)?\s*\d+[\.\)]\s*/gi, '<li>$1');

  // Deterministic visual post-processing for badges and keywords
  body = body.replace(/<strong>((?:[A-Z0-9]+-)?(?:AC|R|D)-\d+[^<]*):<\/strong>/g, '<span class="ac-badge">$1</span>');
  body = body.replace(/—\s*Verify:/gi, '<span class="verify-badge">VERIFY</span>');
  body = body.replace(/<strong>Touches:<\/strong>|Touches:/gi, '<span class="touches-badge">TOUCHES</span>');
  body = body.replace(/<strong>Done when:<\/strong>|Done when:/gi, '<span class="donewhen-badge">DONE WHEN</span>');

  // Deterministic section card wrapping: wrap each <h2> block into its own collapsible <section class="section-card">
  const sections = body.split(/(?=<h2>)/g);
  let processedSections = sections.map((sec, idx) => {
    if (!sec.trim()) return '';
    const h2Match = sec.match(/<h2>([\s\S]*?)<\/h2>/i);
    const headingHtml = h2Match ? h2Match[1] : `Section ${idx}`;
    const headingText = headingHtml.replace(/<[^>]+>/g, '').trim();
    const contentAfterH2 = sec.replace(/<h2>[\s\S]*?<\/h2>/i, '').trim();

    let secClass = 'section-card';
    if (/Quick Overview|Summary/i.test(headingText)) {
      secClass += ' overview-card';
    } else if (/Requirement/i.test(headingText)) {
      secClass += ' req-card';
    } else if (/Design/i.test(headingText)) {
      secClass += ' design-card';
    } else if (/Plan/i.test(headingText)) {
      secClass += ' plan-card';
    } else if (/Execution Record/i.test(headingText)) {
      secClass += ' exec-card';
    }

    const secId = 'sec-' + idx;

    return `
      <section class="${secClass}" id="${secId}">
        <div class="section-header" onclick="toggleSection(this)">
          <div class="section-title-wrap">
            <h2>${headingHtml}</h2>
          </div>
          <button type="button" class="section-toggle-btn" aria-label="Toggle section" title="Collapse / Expand">
            <span class="toggle-icon">▼</span>
          </button>
        </div>
        <div class="section-content">
          ${contentAfterH2}
        </div>
      </section>
    `;
  }).join('\n');

  // Enhance In Scope vs Out of Scope subsections into distinct side-by-side / bordered cards
  processedSections = processedSections.replace(/<h4>In scope<\/h4>([\s\S]*?)<h4>Out of scope<\/h4>([\s\S]*?)(?=<h[2-4]>|<\/div>|<\/section>)/gi, (m, inScope, outScope) => {
    return `<div class="scope-grid">
      <div class="scope-box in-scope-box">
        <div class="scope-header in-scope-header"><span>✔</span> In Scope</div>
        ${inScope}
      </div>
      <div class="scope-box out-scope-box">
        <div class="scope-header out-scope-header"><span>✖</span> Out of Scope</div>
        ${outScope}
      </div>
    </div>`;
  });

  // Enhance Exit Criteria & Stop Conditions callouts
  processedSections = processedSections.replace(/<h3>Exit Criteria([^<]*)<\/h3>([\s\S]*?)(?=<h3>|<h2>|<\/div>|<\/section>)/gi, (m, title, content) => {
    return `<div class="callout-card exit-criteria-box">
      <div class="callout-header exit-criteria-header">🎯 Exit Criteria ${title}</div>
      ${content}
    </div>`;
  });

  processedSections = processedSections.replace(/<h3>Stop Conditions([^<]*)<\/h3>([\s\S]*?)(?=<h3>|<h2>|<\/div>|<\/section>)/gi, (m, title, content) => {
    return `<div class="callout-card stop-conditions-box">
      <div class="callout-header stop-conditions-header">🛑 Stop Conditions ${title}</div>
      ${content}
    </div>`;
  });

  // Enhance User Story / Task Group subheadings into story cards
  processedSections = processedSections.replace(/<h3>(User Story \d+:[^<]*|Task Group \d+:[^<]*|Story 0:[^<]*)<\/h3>/gi, (m, title) => {
    return `<div class="story-header-banner">
      <span class="story-icon">📦</span>
      <span class="story-title-text">${title}</span>
    </div>`;
  });

  const sourceMd = path.resolve(inputPath).replace(/\\/g, '/');

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Review: ${escapeHtml(title)}</title>
<style>
  :root {
    --bg: #070b14;
    --card-bg: #131b2e;
    --card-border: #23314d;
    --card-border-subtle: #1c273e;
    --text-main: #f8fafc;
    --text-muted: #94a3b8;
    --accent: #38bdf8;
    --accent-glow: rgba(56, 189, 248, 0.12);
    --success: #34d399;
    --success-bg: rgba(52, 211, 153, 0.12);
    --danger: #f87171;
    --danger-bg: rgba(248, 113, 113, 0.12);
    --warning: #fbbf24;
    --warning-bg: rgba(251, 191, 36, 0.12);
    --code-bg: #090e1a;
  }
  * { box-sizing: border-box; }
  body {
    margin: 0;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Noto Sans SC", sans-serif;
    color: var(--text-main);
    background: var(--bg);
    line-height: 1.65;
  }
  
  /* Top Banner */
  .source-banner {
    background: #0284c7;
    color: #fff;
    padding: 10px 24px;
    font-size: 13px;
    display: flex;
    justify-content: space-between;
    align-items: center;
    position: sticky;
    top: 0;
    z-index: 100;
    box-shadow: 0 2px 8px rgba(0,0,0,0.4);
  }
  .source-banner code { font-family: Consolas, monospace; font-weight: 600; }

  /* 2-Column Responsive Layout */
  .layout {
    max-width: 1160px;
    margin: 24px auto 140px;
    padding: 0 20px;
    display: grid;
    grid-template-columns: 240px 1fr;
    gap: 24px;
  }
  @media (max-width: 920px) {
    .layout { grid-template-columns: 1fr; }
    .toc-sidebar { display: none; }
  }

  /* Left Navigation Sidebar */
  .toc-sidebar {
    position: sticky;
    top: 60px;
    height: fit-content;
    background: var(--card-bg);
    border: 1px solid var(--card-border);
    border-radius: 12px;
    padding: 16px;
    box-shadow: 0 4px 12px rgba(0,0,0,0.2);
  }
  .toc-header-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 12px;
    padding-bottom: 8px;
    border-bottom: 1px solid var(--card-border-subtle);
  }
  .toc-title {
    font-size: 11px;
    font-weight: 700;
    color: var(--text-muted);
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }
  .toc-global-actions {
    display: flex;
    gap: 4px;
  }
  .toc-action-btn {
    background: #1e293b;
    border: 1px solid var(--card-border);
    color: var(--text-muted);
    font-size: 10px;
    padding: 2px 6px;
    border-radius: 4px;
    cursor: pointer;
    transition: all 0.15s;
  }
  .toc-action-btn:hover {
    color: var(--accent);
    border-color: var(--accent);
    background: var(--accent-glow);
  }
  .toc-list {
    list-style: none;
    padding: 0;
    margin: 0;
    display: flex;
    flex-direction: column;
    gap: 6px;
    font-size: 13px;
  }
  .toc-link {
    color: var(--text-muted);
    text-decoration: none;
    display: block;
    padding: 6px 10px;
    border-radius: 6px;
    transition: all 0.15s;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    border-left: 2px solid transparent;
  }
  .toc-link:hover {
    color: var(--accent);
    background: var(--accent-glow);
    border-left-color: var(--accent);
  }

  /* Main Container */
  main {
    display: flex;
    flex-direction: column;
    gap: 20px;
    min-width: 0;
  }

  /* Metadata Card */
  .meta-card {
    background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%);
    border: 1px solid var(--card-border);
    border-radius: 14px;
    padding: 22px 28px;
    box-shadow: 0 4px 12px rgba(0,0,0,0.25);
  }
  .meta-badge {
    display: inline-block;
    font-size: 11px;
    font-weight: 700;
    padding: 3px 10px;
    border-radius: 9999px;
    background: var(--success-bg);
    color: var(--success);
    border: 1px solid rgba(52, 211, 153, 0.3);
    text-transform: uppercase;
    letter-spacing: 0.5px;
    margin-bottom: 8px;
  }
  .meta-title { font-size: 22px; font-weight: 700; margin: 0 0 6px 0; color: #fff; }
  .meta-tags { font-size: 13px; color: var(--text-muted); }

  /* Section Cards */
  .section-card {
    background: var(--card-bg);
    border: 1px solid var(--card-border);
    border-radius: 14px;
    padding: 24px 30px;
    box-shadow: 0 4px 12px rgba(0,0,0,0.2);
    position: relative;
    overflow: hidden;
    transition: all 0.2s ease;
  }
  
  /* Color-coded Section Top Borders */
  .overview-card { border-top: 3px solid #38bdf8; }
  .req-card { border-top: 3px solid #60a5fa; }
  .design-card { border-top: 3px solid #a78bfa; }
  .plan-card { border-top: 3px solid #34d399; }
  .exec-card { border-top: 3px solid #fbbf24; }

  /* Interactive Section Header (Collapsible) */
  .section-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    cursor: pointer;
    user-select: none;
    padding-bottom: 12px;
    border-bottom: 1px solid var(--card-border);
    margin-bottom: 16px;
    transition: all 0.15s;
  }
  .section-header:hover h2 {
    color: var(--accent);
  }
  .section-header h2 {
    border-bottom: none !important;
    padding-bottom: 0 !important;
    margin: 0 !important;
    font-size: 19px;
    display: flex;
    align-items: center;
    gap: 8px;
    transition: color 0.15s;
  }
  .section-toggle-btn {
    background: rgba(255, 255, 255, 0.04);
    border: 1px solid var(--card-border);
    color: var(--text-muted);
    width: 28px;
    height: 28px;
    border-radius: 6px;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    transition: all 0.15s;
  }
  .section-header:hover .section-toggle-btn {
    color: var(--accent);
    border-color: var(--accent);
    background: var(--accent-glow);
  }
  .toggle-icon {
    font-size: 11px;
    line-height: 1;
    display: inline-block;
    transition: transform 0.2s ease;
  }

  /* Collapsed Section State */
  .section-card.is-collapsed {
    padding: 16px 24px;
    opacity: 0.85;
  }
  .section-card.is-collapsed .section-header {
    border-bottom: none;
    margin-bottom: 0;
    padding-bottom: 0;
  }
  .section-card.is-collapsed .section-content {
    display: none;
  }
  .section-card.is-collapsed .toggle-icon {
    transform: rotate(-90deg);
  }

  /* Typography */
  h1, h2, h3, h4 { color: #fff; line-height: 1.3; }
  h3 { font-size: 15px; margin-top: 24px; color: #e2e8f0; }
  h4 { font-size: 13px; margin-top: 16px; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.5px; }

  /* Callout / Blockquote */
  blockquote {
    background: var(--accent-glow);
    border-left: 4px solid var(--accent);
    margin: 16px 0;
    padding: 14px 18px;
    border-radius: 0 8px 8px 0;
    color: #e2e8f0;
    font-size: 14.5px;
  }
  blockquote p { margin: 0; }

  /* Architecture & Feasibility Board Styles */
  .arch-board-container {
    background: var(--code-bg);
    border: 1px solid var(--card-border);
    border-radius: 12px;
    padding: 20px;
    margin: 18px 0;
    display: flex;
    flex-direction: column;
    gap: 18px;
  }
  .arch-board-header {
    font-size: 14px;
    font-weight: 700;
    color: var(--accent);
    border-bottom: 1px solid var(--card-border-subtle);
    padding-bottom: 8px;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }
  .arch-stack {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 4px;
  }
  .arch-layer-card {
    width: 100%;
    max-width: 540px;
    background: #131d2f;
    border: 1px solid var(--card-border);
    border-radius: 10px;
    padding: 14px 18px;
    box-shadow: 0 2px 8px rgba(0,0,0,0.3);
  }
  .app-layer { border-left: 4px solid var(--accent); }
  .engine-layer { border-left: 4px solid #a78bfa; }
  .layer-badge {
    font-size: 10px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    margin-bottom: 6px;
  }
  .app-badge { color: var(--accent); }
  .engine-badge { color: #a78bfa; }
  .layer-content {
    display: flex;
    align-items: center;
    gap: 12px;
  }
  .layer-main-title { font-size: 14px; font-weight: 700; color: #fff; }

  .arch-connector {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 2px;
    color: var(--accent);
  }
  .connector-line { width: 2px; height: 10px; background: rgba(56, 189, 248, 0.4); }
  .connector-badge {
    font-size: 11px;
    font-weight: 600;
    background: #18263f;
    border: 1px solid rgba(56, 189, 248, 0.3);
    color: var(--accent);
    padding: 3px 12px;
    border-radius: 9999px;
    font-family: Consolas, monospace;
  }
  .connector-arrow { font-size: 12px; line-height: 1; color: var(--accent); }

  .platform-status-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 14px;
  }
  @media (max-width: 680px) {
    .platform-status-grid { grid-template-columns: 1fr; }
  }
  .platform-status-card {
    background: #101828;
    border: 1px solid var(--card-border);
    border-radius: 8px;
    padding: 12px 16px;
  }
  .android-pass { border-left: 3px solid var(--success); }
  .ios-blocked { border-left: 3px solid var(--danger); }
  .generic-status-card { border-left: 3px solid var(--accent); }
  .platform-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    font-size: 13px;
    font-weight: 700;
    margin-bottom: 6px;
  }
  .status-pill {
    font-size: 10px;
    font-weight: 700;
    padding: 2px 6px;
    border-radius: 4px;
  }
  .pass-pill { background: var(--success-bg); color: var(--success); }
  .fail-pill { background: var(--danger-bg); color: var(--danger); }
  .warn-pill { background: var(--warning-bg); color: var(--warning); }
  .platform-desc { font-size: 12px; color: var(--text-muted); line-height: 1.4; }

  .verdict-banner {
    border-radius: 8px;
    padding: 12px 16px;
    display: flex;
    align-items: center;
    gap: 12px;
  }
  .verdict-banner-stop {
    background: rgba(248, 113, 113, 0.1);
    border: 1px solid rgba(248, 113, 113, 0.4);
  }
  .verdict-banner-pass {
    background: rgba(52, 211, 153, 0.1);
    border: 1px solid rgba(52, 211, 153, 0.4);
  }
  .verdict-banner-warn {
    background: rgba(251, 191, 36, 0.1);
    border: 1px solid rgba(251, 191, 36, 0.4);
  }
  .verdict-icon { font-size: 24px; flex-shrink: 0; }
  .verdict-title { font-size: 13px; font-weight: 700; color: #fff; }
  .verdict-desc { font-size: 12px; color: #cbd5e1; margin-top: 2px; }

  /* Visual Flow Diagram & Flowchart Pipeline */
  .flow-comparison-container {
    display: flex;
    flex-direction: column;
    gap: 20px;
    margin: 18px 0;
  }
  .flow-track {
    background: linear-gradient(180deg, rgba(15, 23, 42, 0.85) 0%, rgba(9, 14, 26, 0.95) 100%);
    border: 1px solid var(--card-border);
    border-radius: 14px;
    padding: 20px 24px;
    box-shadow: 0 8px 24px -4px rgba(0, 0, 0, 0.4);
    position: relative;
    overflow: hidden;
  }
  .flow-track::before {
    content: "";
    position: absolute;
    top: 0; left: 0; bottom: 0;
    width: 4px;
  }
  .flow-track.before-track {
    border-color: rgba(248, 113, 113, 0.25);
  }
  .flow-track.before-track::before {
    background: linear-gradient(180deg, #f87171 0%, #ef4444 100%);
  }
  .flow-track.after-track {
    border-color: rgba(52, 211, 153, 0.3);
  }
  .flow-track.after-track::before {
    background: linear-gradient(180deg, #38bdf8 0%, #34d399 100%);
  }
  .flow-track.generic-track::before {
    background: var(--accent);
  }

  .track-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 18px;
  }
  .track-title {
    font-size: 13.5px;
    font-weight: 700;
    letter-spacing: 0.5px;
    text-transform: uppercase;
  }
  .before-track .track-title { color: #fca5a5; }
  .after-track .track-title { color: #86efac; }
  .generic-track .track-title { color: var(--accent); }
  
  .track-step-badge {
    font-size: 11px;
    font-weight: 700;
    padding: 2px 10px;
    border-radius: 9999px;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }
  .before-track .track-step-badge {
    background: rgba(239, 68, 68, 0.15);
    color: #f87171;
    border: 1px solid rgba(239, 68, 68, 0.3);
  }
  .after-track .track-step-badge {
    background: rgba(52, 211, 153, 0.15);
    color: #34d399;
    border: 1px solid rgba(52, 211, 153, 0.3);
  }
  .generic-track .track-step-badge {
    background: var(--accent-glow);
    color: var(--accent);
  }

  /* Pipeline Row */
  .pipeline-row {
    display: flex;
    align-items: center;
    gap: 0;
    overflow-x: auto;
    padding: 6px 0 16px 0;
  }

  /* Flow Node Box */
  .flow-node {
    background: #131d31;
    border: 1px solid #283753;
    border-radius: 12px;
    min-height: 130px;
    padding: 14px;
    display: flex;
    flex-direction: column;
    flex-shrink: 0;
    box-shadow: 0 4px 14px rgba(0, 0, 0, 0.35);
    transition: all 0.2s ease;
  }
  .flow-node:hover {
    border-color: #38bdf8;
    transform: translateY(-2px);
    box-shadow: 0 8px 24px rgba(56, 189, 248, 0.18);
  }
  .after-track .flow-node {
    background: #101e38;
    border-color: #1e3a5f;
  }
  .after-track .flow-node:hover {
    border-color: #34d399;
    box-shadow: 0 8px 24px rgba(52, 211, 153, 0.18);
  }

  .node-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 10px;
    padding-bottom: 8px;
    border-bottom: 1px solid rgba(255, 255, 255, 0.08);
  }
  .node-step-tag {
    font-size: 10px;
    font-weight: 800;
    font-family: Consolas, monospace;
    color: var(--accent);
    background: rgba(56, 189, 248, 0.12);
    padding: 2px 6px;
    border-radius: 4px;
  }
  .after-track .node-step-tag {
    color: #34d399;
    background: rgba(52, 211, 153, 0.12);
  }
  .node-title {
    font-size: 13px;
    font-weight: 700;
    color: #fff;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    flex: 1;
    margin-right: 6px;
  }

  .node-body {
    display: flex;
    flex-direction: column;
    gap: 6px;
    flex-grow: 1;
    justify-content: center;
  }
  .node-chip {
    font-size: 11.5px;
    color: #cbd5e1;
    background: rgba(255, 255, 255, 0.03);
    border: 1px solid rgba(255, 255, 255, 0.06);
    border-radius: 6px;
    padding: 5px 8px;
    line-height: 1.35;
  }
  .node-btn-chip {
    background: #0284c7;
    color: #fff;
    font-weight: 600;
    border-color: #38bdf8;
    text-align: center;
  }
  .after-track .node-btn-chip {
    background: #059669;
    border-color: #34d399;
  }
  .node-btn-chip.removed {
    background: rgba(239, 68, 68, 0.1);
    border-color: #ef4444;
    color: #f87171;
    text-decoration: line-through;
  }

  /* Flow Connector Arrow */
  .flow-connector {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    min-width: 85px;
    padding: 0 6px;
    flex-shrink: 0;
    position: relative;
  }
  .connector-line-wrap {
    width: 100%;
    display: flex;
    align-items: center;
    position: relative;
  }
  .connector-line {
    flex: 1;
    height: 2px;
    background: linear-gradient(90deg, #334155 0%, #475569 100%);
  }
  .after-track .connector-line {
    background: linear-gradient(90deg, #0284c7 0%, #10b981 100%);
  }
  .connector-arrow-head {
    font-size: 14px;
    color: #64748b;
    margin-left: -4px;
  }
  .after-track .connector-arrow-head {
    color: #34d399;
  }
  .connector-label-pill {
    position: absolute;
    top: -18px;
    font-size: 10.5px;
    font-weight: 700;
    color: var(--accent);
    background: #090e1a;
    border: 1px solid #334155;
    padding: 2px 8px;
    border-radius: 9999px;
    white-space: nowrap;
    box-shadow: 0 2px 6px rgba(0, 0, 0, 0.3);
  }
  .after-track .connector-label-pill {
    color: #38bdf8;
    border-color: #0284c7;
    background: #0d1a2d;
  }
  .connector-step-indicator {
    font-size: 9.5px;
    color: var(--text-muted);
    margin-top: 6px;
    text-transform: uppercase;
    font-weight: 600;
  }

  /* In Scope vs Out of Scope Visual Grid */
  .scope-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 16px;
    margin: 16px 0;
  }
  @media (max-width: 680px) {
    .scope-grid { grid-template-columns: 1fr; }
  }
  .scope-box {
    background: var(--code-bg);
    border: 1px solid var(--card-border);
    border-radius: 10px;
    padding: 16px;
  }
  .in-scope-box { border-top: 3px solid var(--success); }
  .out-scope-box { border-top: 3px solid var(--danger); }
  .scope-header {
    font-size: 13px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    margin-bottom: 10px;
    display: flex;
    align-items: center;
    gap: 6px;
  }
  .in-scope-header { color: var(--success); }
  .out-scope-header { color: var(--danger); }
  .scope-box ul { padding-left: 18px; margin: 0; font-size: 13px; }

  /* Story Header Banner */
  .story-header-banner {
    background: #18233c;
    border: 1px solid var(--card-border);
    border-left: 4px solid #34d399;
    border-radius: 8px;
    padding: 10px 16px;
    margin-top: 24px;
    margin-bottom: 12px;
    display: flex;
    align-items: center;
    gap: 8px;
    font-weight: 600;
    font-size: 14px;
    color: #f1f5f9;
  }
  .story-icon { font-size: 16px; }

  /* Callout Containers (Exit Criteria / Stop Conditions) */
  .callout-card {
    border-radius: 10px;
    padding: 16px 20px;
    margin: 20px 0;
    font-size: 13.5px;
  }
  .exit-criteria-box {
    background: rgba(52, 211, 153, 0.08);
    border: 1px solid rgba(52, 211, 153, 0.3);
  }
  .exit-criteria-header {
    font-weight: 700;
    color: var(--success);
    margin-bottom: 8px;
    text-transform: uppercase;
    font-size: 12px;
    letter-spacing: 0.5px;
  }
  .stop-conditions-box {
    background: rgba(248, 113, 113, 0.08);
    border: 1px solid rgba(248, 113, 113, 0.3);
  }
  .stop-conditions-header {
    font-weight: 700;
    color: var(--danger);
    margin-bottom: 8px;
    text-transform: uppercase;
    font-size: 12px;
    letter-spacing: 0.5px;
  }

  /* Badges */
  .ac-badge {
    display: inline-block;
    background: rgba(56, 189, 248, 0.15);
    color: var(--accent);
    border: 1px solid rgba(56, 189, 248, 0.3);
    padding: 2px 8px;
    border-radius: 6px;
    font-weight: 700;
    font-size: 12px;
    margin-right: 6px;
    font-family: Consolas, monospace;
  }
  .verify-badge {
    display: inline-block;
    background: var(--success-bg);
    color: var(--success);
    border: 1px solid rgba(52, 211, 153, 0.3);
    padding: 1px 6px;
    border-radius: 4px;
    font-weight: 700;
    font-size: 11px;
    margin-right: 4px;
    font-family: Consolas, monospace;
  }
  .touches-badge {
    display: inline-block;
    background: var(--warning-bg);
    color: var(--warning);
    border: 1px solid rgba(251, 191, 36, 0.3);
    padding: 1px 6px;
    border-radius: 4px;
    font-weight: 700;
    font-size: 11px;
    margin-right: 4px;
    font-family: Consolas, monospace;
  }
  .donewhen-badge {
    display: inline-block;
    background: rgba(168, 85, 247, 0.15);
    color: #c084fc;
    border: 1px solid rgba(168, 85, 247, 0.3);
    padding: 1px 6px;
    border-radius: 4px;
    font-weight: 700;
    font-size: 11px;
    margin-right: 4px;
    font-family: Consolas, monospace;
  }

  /* Code & ASCII Diagrams */
  pre {
    background: var(--code-bg);
    border: 1px solid var(--card-border);
    padding: 14px 16px;
    border-radius: 8px;
    overflow-x: auto;
    font-size: 13px;
    line-height: 1.45;
  }
  code {
    font-family: Consolas, "JetBrains Mono", Monaco, monospace;
    font-size: 0.92em;
    color: var(--accent);
  }
  pre code { color: #e2e8f0; }

  /* Tables */
  table {
    width: 100%;
    border-collapse: collapse;
    margin: 18px 0;
    font-size: 13px;
    background: var(--code-bg);
    border-radius: 8px;
    overflow: hidden;
    border: 1px solid var(--card-border);
    display: table;
  }
  th, td {
    padding: 10px 14px;
    text-align: left;
    border: 1px solid var(--card-border);
  }
  th {
    background: #0d1424;
    color: var(--text-muted);
    font-weight: 600;
    text-transform: uppercase;
    font-size: 11px;
    letter-spacing: 0.5px;
  }
  tr:hover td { background: rgba(255,255,255,0.02); }
  td strong { color: var(--accent); }

  /* Task Checkbox List */
  ul { padding-left: 0; color: #cbd5e1; list-style: none; margin: 12px 0; }
  li { margin-bottom: 6px; }
  li:has(input[type="checkbox"]) {
    list-style-type: none;
    padding: 10px 14px;
    background: var(--code-bg);
    border: 1px solid var(--card-border);
    border-radius: 8px;
    margin-bottom: 8px;
  }
  li input[type="checkbox"] {
    margin-right: 8px;
    transform: scale(1.1);
  }

  /* Numbered Step Cards (e.g. Proposed Behavior, Sequences) */
  ol {
    list-style: none;
    counter-reset: custom-step;
    padding-left: 0;
    display: flex;
    flex-direction: column;
    gap: 10px;
    margin: 16px 0;
  }
  ol > li {
    counter-increment: custom-step;
    display: flex;
    align-items: flex-start;
    gap: 14px;
    background: #090e1a;
    border: 1px solid var(--card-border);
    border-radius: 10px;
    padding: 14px 18px;
    font-size: 13.5px;
    color: #e2e8f0;
    line-height: 1.6;
    transition: all 0.15s ease;
  }
  ol > li:hover {
    border-color: #38bdf8;
    background: #0e1628;
    transform: translateX(2px);
  }
  ol > li::before {
    content: counter(custom-step, decimal-leading-zero);
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-width: 32px;
    height: 32px;
    background: rgba(56, 189, 248, 0.12);
    color: var(--accent);
    border: 1px solid rgba(56, 189, 248, 0.3);
    border-radius: 8px;
    font-weight: 800;
    font-size: 12px;
    font-family: Consolas, monospace;
    flex-shrink: 0;
    margin-top: 1px;
  }

  /* Acceptance Criteria Card Rows */
  li:has(.ac-badge) {
    list-style-type: none;
    padding: 12px 16px;
    background: #090e1a;
    border: 1px solid var(--card-border);
    border-radius: 8px;
    margin-bottom: 8px;
    display: flex;
    align-items: flex-start;
    gap: 10px;
    font-size: 13.5px;
    line-height: 1.6;
    transition: all 0.15s ease;
  }
  li:has(.ac-badge):hover {
    border-color: rgba(56, 189, 248, 0.4);
    background: #0e1628;
  }

  /* Nested lists inside cards (sub-bullets inside requirements) */
  li ul, li ol {
    padding-left: 18px !important;
    margin: 8px 0 4px !important;
    display: flex !important;
    flex-direction: column !important;
    gap: 4px !important;
    list-style: disc !important;
    width: 100%;
  }
  li ul li, li ol li {
    background: transparent !important;
    border: none !important;
    padding: 0 !important;
    margin: 0 !important;
    font-size: 13px !important;
    color: #94a3b8 !important;
    list-style-type: disc !important;
    display: list-item !important;
    position: static !important;
    transform: none !important;
  }
  li ol li::before {
    display: none !important;
  }
  li p {
    margin: 0 0 6px 0;
  }
  li p:last-child {
    margin-bottom: 0;
  }

  hr {
    border: none;
    border-top: 1px solid var(--card-border);
    margin: 28px 0;
  }
</style>
</head>
<body data-source-md="${escapeHtml(sourceMd)}">
<header class="source-banner">source: <code>${escapeHtml(sourceMd)}</code></header>
<div class="layout">
  <aside class="toc-sidebar">
    <div class="toc-header-row">
      <div class="toc-title">Sections</div>
      <div class="toc-global-actions">
        <button type="button" class="toc-action-btn" onclick="toggleAllSections(true)">Expand</button>
        <button type="button" class="toc-action-btn" onclick="toggleAllSections(false)">Minimize</button>
      </div>
    </div>
    <ul class="toc-list" id="toc-nav"></ul>
  </aside>
  <main id="main-content">
    ${meta.status || meta.scope ? `
    <div class="meta-card">
      <span class="meta-badge">${escapeHtml(meta.status || 'Active')}</span>
      <h1 class="meta-title">${escapeHtml(title.replace(/\.md$/, ''))}</h1>
      <div class="meta-tags">
        <strong>Scope:</strong> ${escapeHtml(meta.scope || 'Unspecified')}
        ${meta.phase ? ` · <strong>Phase:</strong> ${escapeHtml(meta.phase)}` : ''}
        ${meta.created ? ` · <strong>Created:</strong> ${escapeHtml(meta.created)}` : ''}
      </div>
    </div>` : ''}
    ${processedSections}
  </main>
</div>
<script>
  // Auto-expand section if an inner element is scrolled into view (e.g. from clicking a comment in ezreview)
  const origScrollIntoView = Element.prototype.scrollIntoView;
  Element.prototype.scrollIntoView = function(...args) {
    const card = this.closest && this.closest('.section-card');
    if (card && card.classList.contains('is-collapsed')) {
      card.classList.remove('is-collapsed');
    }
    return origScrollIntoView.apply(this, args);
  };

  // Auto-expand on focus / target selection
  document.addEventListener('focusin', (e) => {
    const card = e.target.closest && e.target.closest('.section-card');
    if (card && card.classList.contains('is-collapsed')) {
      card.classList.remove('is-collapsed');
    }
  }, true);

  addEventListener('hashchange', () => {
    if (location.hash) {
      try {
        const el = document.querySelector(location.hash);
        const card = el && el.closest('.section-card');
        if (card && card.classList.contains('is-collapsed')) {
          card.classList.remove('is-collapsed');
        }
      } catch (_) {}
    }
  });

  function toggleSection(headerEl) {
    const card = headerEl.closest('.section-card');
    if (card) {
      card.classList.toggle('is-collapsed');
    }
  }

  function toggleAllSections(expand) {
    document.querySelectorAll('.section-card').forEach(card => {
      if (expand) {
        card.classList.remove('is-collapsed');
      } else {
        card.classList.add('is-collapsed');
      }
    });
  }

  document.addEventListener('DOMContentLoaded', () => {
    const headings = document.querySelectorAll('#main-content .section-card h2');
    const toc = document.getElementById('toc-nav');
    if (!toc) return;
    headings.forEach((h, index) => {
      const card = h.closest('.section-card');
      const id = card ? card.id : ('sec-' + index);
      const li = document.createElement('li');
      const a = document.createElement('a');
      a.className = 'toc-link';
      a.href = '#' + id;
      a.textContent = h.textContent.trim();
      a.addEventListener('click', (e) => {
        if (card && card.classList.contains('is-collapsed')) {
          card.classList.remove('is-collapsed');
        }
      });
      li.appendChild(a);
      toc.appendChild(li);
    });
  });
</script>
</body>
</html>
`;

  fs.writeFileSync(outputPath, html, 'utf8');
  console.log(`render-review: wrote ${outputPath} (${html.length} chars) from ${inputPath}`);
}

render().catch(error => fail(`marked failed: ${error.message}`));
