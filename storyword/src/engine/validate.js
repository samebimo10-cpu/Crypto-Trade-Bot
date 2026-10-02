// Content validation. Writers add chapters by editing JSON; this catches the
// mistakes that would otherwise only show up mid-playthrough: dangling scene
// links, unreachable scenes, unknown speakers, unbuildable puzzle words.
// Returns a list of error strings (empty when the content is sound).

import { canBuild, normalize } from './puzzle.js';

export function validatePuzzle(p, where = p.id) {
  const errors = [];
  const err = (m) => errors.push(`${where}: ${m}`);
  if (!p.id) err('missing id');
  if (!Array.isArray(p.letters) || p.letters.length < 3) err('needs at least 3 letters');
  if (!p.requiredWords?.length) err('needs at least one required word');
  const req = (p.requiredWords || []).map(normalize);
  const bonus = (p.bonusWords || []).map(normalize);
  const all = [...req, ...bonus];
  const minLength = p.minLength ?? 3;
  for (const w of all) {
    if (!canBuild(w, p.letters || [])) err(`"${w}" cannot be spelled from ${(p.letters || []).join('')}`);
    if (w.length < minLength) err(`"${w}" is shorter than minLength ${minLength}`);
  }
  const seen = new Set();
  for (const w of all) {
    if (seen.has(w)) err(`"${w}" listed twice`);
    seen.add(w);
  }
  for (const s of p.secrets || []) {
    if (!all.includes(normalize(s.word))) err(`secret word "${s.word}" is not a required or bonus word`);
    if (!s.id) err(`secret word "${s.word}" has no id`);
  }
  return errors;
}

export function validateChapter(chapter, { characters, puzzles }) {
  const errors = [];
  const where = `chapter ${chapter.id}`;
  const err = (m) => errors.push(`${where}: ${m}`);
  const scenes = new Map();
  for (const s of chapter.scenes || []) {
    if (scenes.has(s.id)) err(`duplicate scene id "${s.id}"`);
    scenes.set(s.id, s);
  }
  if (!scenes.has(chapter.start)) err(`start scene "${chapter.start}" does not exist`);

  const secrets = chapter.secrets || {};
  const memories = chapter.memories || {};
  const targets = (next) => (next == null ? [] : typeof next === 'string' ? [next] : next.map((r) => r.to));
  const checkNextList = (next, at) => {
    if (Array.isArray(next) && next.length && next[next.length - 1].if) {
      err(`${at}: next-list must end with an unconditional route`);
    }
    for (const t of targets(next)) {
      if (t != null && !scenes.has(t)) err(`${at}: links to unknown scene "${t}"`);
    }
  };
  const checkLines = (lines, at) => {
    for (const l of lines || []) {
      if (!characters[l.speaker]) err(`${at}: unknown speaker "${l.speaker}"`);
      if (!l.text) err(`${at}: line with no text`);
    }
  };

  for (const s of scenes.values()) {
    const at = `scene ${s.id}`;
    checkLines(s.lines, at);
    checkNextList(s.next, at);
    if (s.puzzle && !puzzles[s.puzzle]) err(`${at}: unknown puzzle "${s.puzzle}"`);
    if (s.memory && !memories[s.memory]) err(`${at}: unknown memory "${s.memory}"`);
    if (s.choices?.length && !s.prompt) err(`${at}: has choices but no prompt`);
    const ids = new Set();
    for (const c of s.choices || []) {
      if (ids.has(c.id)) err(`${at}: duplicate choice id "${c.id}"`);
      ids.add(c.id);
      checkLines(c.response, `${at}/${c.id}`);
      checkNextList(c.next, `${at}/${c.id}`);
      for (const f of c.setFlags || []) {
        if (f.startsWith('s_') && !secrets[f]) err(`${at}/${c.id}: flag "${f}" looks like a secret but is not defined`);
      }
    }
  }

  for (const s of scenes.values()) {
    for (const sec of puzzles[s.puzzle]?.secrets || []) {
      if (!secrets[sec.id]) err(`puzzle ${s.puzzle}: secret "${sec.id}" not defined in chapter secrets`);
    }
  }

  // Every scene should be reachable, and at least one path should end.
  const reached = new Set();
  const stack = [chapter.start];
  let ends = false;
  while (stack.length) {
    const id = stack.pop();
    if (reached.has(id) || !scenes.has(id)) continue;
    reached.add(id);
    const s = scenes.get(id);
    const outs = [...targets(s.next), ...(s.choices || []).flatMap((c) => targets(c.next))];
    if (s.next == null && !(s.choices || []).some((c) => c.next)) ends = true;
    stack.push(...outs.filter((t) => t != null));
  }
  for (const id of scenes.keys()) if (!reached.has(id)) err(`scene "${id}" is unreachable`);
  if (!ends) err('no scene ends the chapter (set "next": null on the last scene)');

  const outcomes = chapter.outcomes || [];
  if (outcomes.length && outcomes[outcomes.length - 1].if) err('the last outcome must be unconditional');
  return errors;
}

export function validateDaily(daily, { characters }) {
  const errors = [];
  for (const e of daily.entries || []) {
    for (const l of e.lines || []) {
      if (!characters[l.speaker]) errors.push(`daily ${e.id}: unknown speaker "${l.speaker}"`);
    }
    errors.push(...validatePuzzle(e.puzzle, `daily ${e.id}`));
  }
  return errors;
}
