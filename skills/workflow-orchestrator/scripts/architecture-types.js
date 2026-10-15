// Element types of the architecture views (constitution §7, Architecture views).
// check-mermaid.js checks node labels against them, and render-review.js colors nodes by their group.

const fs = require('fs');
const path = require('path');

// Each core type with its group. The core groups take the first colors of the review page.
const CORE_GROUPS_BY_TYPE = new Map([
  ['Person', 'External'],
  ['Service', 'Compute'],
  ['Batch job', 'Compute'],
  ['Function', 'Compute'],
  ['Component', 'Compute'],
  ['Data store', 'Storage'],
  ['Object storage', 'Storage'],
  ['Cache', 'Storage'],
  ['Queue', 'Messaging'],
  ['External system', 'External'],
]);
const CORE_GROUPS = ['Compute', 'Storage', 'Messaging', 'External'];

const splitCells = (line) => line.trim().replace(/^\|/, '').replace(/\|$/, '').split('|')
  .map((cell) => cell.trim().replace(/^`(.*)`$/, '$1'));

// Returns the rows of every Element Types table (Type | Group | Definition) in a markdown file, in file order.
function findDeclaredTypes(file) {
  const declarations = [];
  if (!file || !fs.existsSync(file)) return declarations;
  const lines = fs.readFileSync(file, 'utf8').replace(/^\uFEFF/, '').split(/\r?\n/);
  let insideFence = false;
  for (let i = 0; i < lines.length; i++) {
    // A table inside a code block is an example, not a declaration.
    if (/^ {0,3}(`{3,}|~{3,})/.test(lines[i])) insideFence = !insideFence;
    if (insideFence || i + 1 >= lines.length) continue;
    const header = splitCells(lines[i]).map((cell) => cell.toLowerCase());
    if (header.join('|') !== 'type|group|definition' || !/^\s*\|?\s*:?-{3,}/.test(lines[i + 1])) continue;
    for (let j = i + 2; j < lines.length && /^\s*\|/.test(lines[j]); j++) {
      const [type, group] = splitCells(lines[j]);
      if (type && group) declarations.push({ type, group });
    }
  }
  return declarations;
}

// Finds the documents root's architecture.md: the file itself, or up to two levels above a work-item.
function findArchitectureFile(file) {
  let dir = path.dirname(path.resolve(file));
  for (let level = 0; level < 3; level++) {
    const candidate = path.join(dir, 'architecture.md');
    if (fs.existsSync(candidate)) return candidate;
    dir = path.dirname(dir);
  }
  return null;
}

// Returns the group of every known type, and the groups in color order.
// architecture.md is read first, so that a new group keeps the same color in every document.
function loadTypeCatalog(file) {
  const groupsByType = new Map(CORE_GROUPS_BY_TYPE);
  const groups = [...CORE_GROUPS];
  const sources = [findArchitectureFile(file), path.resolve(file)].filter((source, i, all) => source && all.indexOf(source) === i);
  for (const source of sources) {
    for (const { type, group } of findDeclaredTypes(source)) {
      if (!groupsByType.has(type)) groupsByType.set(type, group);
      if (!groups.includes(group)) groups.push(group);
    }
  }
  return { groupsByType, groups };
}

module.exports = { loadTypeCatalog };
