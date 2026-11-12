#!/usr/bin/env node

// Checks Markdown project documents against the countable Writing rules (constitution §7, Writing).
// Rule 1: a sentence has at most 20 words in a step and at most 25 words in a description.
// Rule 9: an AC-n or D-n criterion uses an EARS form.
// Front matter, code blocks, tables, and headings are not checked. Inline code counts as one word.
// Prints each failing line as <file>:<line>: <reason> and exits 1; exits 0 when every file passes.

const fs = require('fs');

const files = process.argv.slice(2);
if (files.length === 0) {
  console.error('check-writing: usage: node check-writing.js <doc.md> [more.md ...]');
  process.exit(1);
}

const STEP_LIMIT = 20;
const DESCRIPTION_LIMIT = 25;
const FENCE = /^\s*(```|~~~)/;
const LIST_ITEM = /^\s*(?:[-*+]|\d+[.)])\s+/;
// A step is a numbered item or a checkbox task.
const STEP_ITEM = /^\s*(?:\d+[.)]\s+|[-*+]\s+\[[ xX]\]\s+)/;
const CRITERION = /^\s*[-*+]\s+\*\*((?:AC|D)-\d+)\b[^*]*\*\*:?\s*(.*)$/;
const ID_LABEL = /^\*\*[A-Z]+-\d+\b[^*]*\*\*:?\s*/;
const EARS = /^(?:(?:When|While|If)\b.*\bshall\b|The\b.*\bshall\b)/;
// A sentence ends at ., !, or ? before a new sentence, or at a colon. A field label such as "Done when:" ends one too.
const SENTENCE_END = /(?<=[.!?])["')\]]*\s+(?=[A-Z"'(\[])|:\s+/;

// Splits a document into units of prose: one list item, or one paragraph with its wrapped lines.
function proseUnits(lines) {
  const units = [];
  let current = null;
  let inFence = false;
  let inFrontMatter = lines[0] !== undefined && lines[0].replace(/^﻿/, '').trim() === '---';
  lines.forEach((rawLine, index) => {
    if (inFrontMatter) {
      if (index > 0 && rawLine.trim() === '---') inFrontMatter = false;
      return;
    }
    if (FENCE.test(rawLine)) {
      inFence = !inFence;
      current = null;
      return;
    }
    const line = rawLine.replace(/^\s*(?:>\s?)+/, '');
    const skipped = inFence || line.trim() === '' || /^\s*(#|\||<!--|---+\s*$)/.test(line);
    if (skipped) {
      current = null;
      return;
    }
    if (LIST_ITEM.test(line) || current === null) {
      current = { lineNumber: index + 1, isStep: STEP_ITEM.test(line), text: line };
      units.push(current);
    } else {
      current.text += ` ${line.trim()}`;
    }
  });
  return units;
}

// Removes Markdown markup, so that only the words of the sentence remain.
function plainText(text) {
  return text
    .replace(STEP_ITEM, '')
    .replace(LIST_ITEM, '')
    .replace(ID_LABEL, '')
    .replace(/`[^`]*`/g, 'code')
    .replace(/!?\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/\*\*|__/g, '');
}

function wordCount(sentence) {
  return sentence.split(/\s+/).filter((word) => /[A-Za-z0-9]/.test(word)).length;
}

let failureCount = 0;
for (const file of files) {
  let content;
  try {
    content = fs.readFileSync(file, 'utf8');
  } catch (error) {
    console.error(`check-writing: cannot read ${file}: ${error.message}`);
    process.exit(1);
  }
  const report = (lineNumber, reason) => {
    failureCount += 1;
    console.log(`${file}:${lineNumber}: ${reason}`);
  };
  for (const unit of proseUnits(content.split(/\r?\n/))) {
    const criterion = unit.text.match(CRITERION);
    if (criterion && !EARS.test(criterion[2].replace(/\*\*|__/g, ''))) {
      report(unit.lineNumber, `write ${criterion[1]} in an EARS form, such as "When <trigger>, the system shall <result>".`);
    }
    const limit = unit.isStep ? STEP_LIMIT : DESCRIPTION_LIMIT;
    for (const sentence of plainText(unit.text).split(SENTENCE_END)) {
      const count = wordCount(sentence);
      if (count > limit) {
        const opening = sentence.trim().split(/\s+/).slice(0, 6).join(' ');
        report(unit.lineNumber, `${count} words in one sentence. The limit is ${limit} in a ${unit.isStep ? 'step' : 'description'}. Split it: "${opening} ..."`);
      }
    }
  }
}

if (failureCount > 0) {
  console.log(`check-writing: ${failureCount} problem(s).`);
  process.exit(1);
}
console.log('check-writing: OK');
