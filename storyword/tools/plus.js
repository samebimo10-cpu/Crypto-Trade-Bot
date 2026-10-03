#!/usr/bin/env node
// Manage the encrypted 18+ content. The plaintext never lives in the repo.
//
//   STORYWORD_PLUS_KEY=<setup code> node tools/plus.js seal <plain.json>
//       encrypt plain.json into content/plus.enc.json
//   STORYWORD_PLUS_KEY=<setup code> node tools/plus.js open [out.json]
//       decrypt content/plus.enc.json for editing
//       (default: content-plus/plus.json, which git ignores)
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { sealBundle, openBundle, unlockWithSetupCode } from '../src/engine/vault.js';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
export const BUNDLE = join(root, 'content', 'plus.enc.json');

export async function openWithCode(code) {
  const bundle = JSON.parse(await readFile(BUNDLE, 'utf8'));
  return openBundle(bundle, await unlockWithSetupCode(bundle, code));
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const [cmd, file] = process.argv.slice(2);
  const code = process.env.STORYWORD_PLUS_KEY;
  if (!code) {
    console.error('Set STORYWORD_PLUS_KEY to the setup code.');
    process.exit(1);
  }
  if (cmd === 'seal' && file) {
    const content = JSON.parse(await readFile(file, 'utf8'));
    await writeFile(BUNDLE, JSON.stringify(await sealBundle(content, code)) + '\n');
    console.log('✓ sealed content/plus.enc.json');
  } else if (cmd === 'open') {
    const out = file ?? join(root, 'content-plus', 'plus.json');
    await mkdir(dirname(out), { recursive: true });
    await writeFile(out, JSON.stringify(await openWithCode(code), null, 2) + '\n');
    console.log(`✓ decrypted to ${out} (do not commit it)`);
  } else {
    console.log('usage: node tools/plus.js seal <plain.json> | open [out.json]');
  }
}
