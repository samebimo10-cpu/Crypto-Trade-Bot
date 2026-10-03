#!/usr/bin/env node
// Validate every content file. Run after editing content:
//   node tools/validate-content.js
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { validateChapter, validateDaily, validatePuzzle, validateStory } from '../src/engine/validate.js';
import { missingWords } from './words.js';
import { MUSIC, SFX, AMBIENCE } from '../src/ui/audio.js';

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
  const { story, characters, puzzleList, puzzles, chapters, daily } = await loadAll();
  const missing = [];
  for (const p of [...puzzleList, ...daily.entries.map((e) => e.puzzle)]) {
    const words = await missingWords(p);
    if (words.length) missing.push(`${p.id}: real words not accepted: ${words.join(' ')} (run: node tools/words.js fill)`);
  }
  const audio = [];
  for (const ch of chapters) {
    for (const sc of ch.scenes) {
      const at = `${ch.id}/${sc.id}`;
      if (sc.music && !MUSIC.includes(sc.music)) audio.push(`${at}: unknown music "${sc.music}"`);
      if (sc.ambience && !AMBIENCE.includes(sc.ambience)) audio.push(`${at}: unknown ambience "${sc.ambience}"`);
      const lines = [...(sc.lines || []), ...(sc.choices || []).flatMap((c) => c.response || [])];
      for (const l of lines) if (l.sfx && !SFX.includes(l.sfx)) audio.push(`${at}: unknown sound effect "${l.sfx}"`);
      for (const c of sc.choices || []) if (c.sfx && !SFX.includes(c.sfx)) audio.push(`${at}/${c.id}: unknown sound effect "${c.sfx}"`);
    }
  }
  return [
    ...audio,
    ...puzzleList.flatMap((p) => validatePuzzle(p)),
    ...chapters.flatMap((c) => validateChapter(c, { characters, puzzles })),
    ...validateStory(story, chapters, { characters }),
    ...validateDaily(daily, { characters }),
    ...missing,
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
