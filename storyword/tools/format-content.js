#!/usr/bin/env node
// Re-indent content JSON, keeping short arrays/objects on one line so word
// lists and conditions stay easy to scan:  node tools/format-content.js
import { readFile, writeFile, readdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const contentDir = join(dirname(fileURLToPath(import.meta.url)), '..', 'content');
const WIDTH = 110;

function fmt(value, indent = '') {
  const flat = JSON.stringify(value, null, 1).replace(/\n\s*/g, ' ').replace(/([[{]) /g, '$1').replace(/ ([\]}])/g, '$1');
  if (flat.length + indent.length <= WIDTH || value === null || typeof value !== 'object') return flat;
  const inner = indent + '  ';
  if (Array.isArray(value)) {
    if (value.every((v) => typeof v !== 'object')) {
      // Wrap primitive lists across lines rather than one item per line.
      const lines = [];
      let line = '';
      for (const item of value.map((v) => JSON.stringify(v))) {
        if (line && inner.length + line.length + item.length + 2 > WIDTH) {
          lines.push(line);
          line = '';
        }
        line += (line ? ', ' : '') + item;
      }
      lines.push(line);
      return `[\n${lines.map((l) => inner + l).join(',\n')}\n${indent}]`;
    }
    return `[\n${value.map((v) => inner + fmt(v, inner)).join(',\n')}\n${indent}]`;
  }
  const entries = Object.entries(value).map(([k, v]) => `${inner}${JSON.stringify(k)}: ${fmt(v, inner)}`);
  return `{\n${entries.join(',\n')}\n${indent}}`;
}

async function files(dir) {
  const out = [];
  for (const e of await readdir(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) out.push(...(await files(p)));
    else if (e.name.endsWith('.json')) out.push(p);
  }
  return out;
}

for (const f of await files(contentDir)) {
  await writeFile(f, fmt(JSON.parse(await readFile(f, 'utf8'))) + '\n');
}
