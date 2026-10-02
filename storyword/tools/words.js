#!/usr/bin/env node
// Word tools for puzzle writers. Uses tools/data/common-words.txt, a vetted
// list of ~11k common English words (Google's 20k frequency list intersected
// with a Scrabble-style dictionary, profanity removed).
//
//   node tools/words.js suggest SECRET     list common words spelled from the letters
//   node tools/words.js fill               add every missing common word to each
//                                          puzzle's bonusWords (chapter + daily)
//
// `fill` is why real words players try are never rejected: the validator fails
// if a puzzle is missing a common word its letters can spell.
import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { canBuild, normalize } from '../src/engine/puzzle.js';

const here = dirname(fileURLToPath(import.meta.url));
const contentDir = join(here, '..', 'content');

let cache;
export async function commonWords() {
  cache ??= (await readFile(join(here, 'data', 'common-words.txt'), 'utf8')).split('\n').filter(Boolean).map(normalize);
  return cache;
}

export async function wordsFrom(letters, minLength = 3) {
  return (await commonWords()).filter((w) => w.length >= minLength && canBuild(w, letters));
}

// Common words the puzzle's letters spell but the puzzle doesn't list.
export async function missingWords(puzzle) {
  const listed = new Set([...puzzle.requiredWords, ...(puzzle.bonusWords || [])].map(normalize));
  return (await wordsFrom(puzzle.letters, puzzle.minLength ?? 3)).filter((w) => !listed.has(w));
}

async function fill() {
  const files = ['puzzles.json', 'daily.json'];
  for (const f of files) {
    const path = join(contentDir, f);
    const data = JSON.parse(await readFile(path, 'utf8'));
    const puzzles = data.puzzles ?? data.entries.map((e) => e.puzzle);
    for (const p of puzzles) {
      const add = await missingWords(p);
      if (add.length) {
        p.bonusWords = [...(p.bonusWords || []), ...add].sort((a, b) => a.length - b.length || a.localeCompare(b));
        console.log(`${p.id}: +${add.join(' ')}`);
      }
    }
    await writeFile(path, JSON.stringify(data, null, 2) + '\n');
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const [cmd, arg] = process.argv.slice(2);
  if (cmd === 'suggest' && arg) {
    const words = await wordsFrom(normalize(arg).split(''));
    console.log(`${arg.toUpperCase()}: ${words.length} words\n${words.sort((a, b) => b.length - a.length).join(' ')}`);
  } else if (cmd === 'fill') {
    await fill();
  } else {
    console.log('usage: node tools/words.js suggest LETTERS | fill');
  }
}
