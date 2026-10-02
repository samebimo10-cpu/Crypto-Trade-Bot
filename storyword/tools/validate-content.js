#!/usr/bin/env node
// Validate every content file. Run after editing content:
//   node tools/validate-content.js
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { validateChapter, validateDaily, validatePuzzle } from '../src/engine/validate.js';

const contentDir = join(dirname(fileURLToPath(import.meta.url)), '..', 'content');
const read = async (f) => JSON.parse(await readFile(join(contentDir, f), 'utf8'));

export async function loadAll() {
  const story = await read('story.json');
  const characters = await read('characters.json');
  const puzzleList = (await read('puzzles.json')).puzzles;
  const puzzles = Object.fromEntries(puzzleList.map((p) => [p.id, p]));
  const chapters = await Promise.all(story.chapters.map((c) => read(c.file)));
  const daily = await read('daily.json');
  return { story, characters, puzzleList, puzzles, chapters, daily };
}

export async function validateAll() {
  const { characters, puzzleList, puzzles, chapters, daily } = await loadAll();
  return [
    ...puzzleList.flatMap((p) => validatePuzzle(p)),
    ...chapters.flatMap((c) => validateChapter(c, { characters, puzzles })),
    ...validateDaily(daily, { characters }),
  ];
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const errors = await validateAll();
  if (errors.length) {
    console.error(errors.map((e) => `✗ ${e}`).join('\n'));
    process.exit(1);
  }
  console.log('✓ content is valid');
}
