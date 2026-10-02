import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import * as Story from '../src/engine/story.js';
import * as Puzzle from '../src/engine/puzzle.js';
import * as Progress from '../src/engine/progress.js';
import { portraitSVG } from '../src/ui/portrait.js';
import { sceneSVG, SCENE_KEYS } from '../src/ui/scenes.js';
import { loadAll, validateAll } from '../tools/validate-content.js';
import { build, OUTPUT } from '../tools/build.js';

const { story, characters, chapters, puzzles, daily } = await loadAll();
const byId = (id) => chapters.find((c) => c.id === id);
const POVS = ['nabyen', 'tari', 'hadiza', 'kolade'];

function rng(seed) {
  let s = seed >>> 0;
  return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
}

// Play the whole saga as `pov`. `prefer` lists choice ids to take when
// offered; otherwise `random` (if given) or the first choice is taken.
// With `secrets`, every puzzle's secret words count as found.
function playSaga(pov, { prefer = [], random = null, secrets = false } = {}) {
  let chapter = chapters[0];
  let run = Story.newRun(chapter);
  const scenes = [];
  const played = [];
  for (let guard = 0; guard < 20; guard++) {
    played.push(chapter.id);
    for (let steps = 0; steps < 1000 && !run.complete; steps++) {
      const view = Story.currentView(chapter, run);
      if (scenes.at(-1)?.id !== view.scene.id) scenes.push({ chapter: chapter.id, id: view.scene.id });
      if (view.type === 'line') {
        run = Story.advance(chapter, run);
      } else if (view.type === 'choice') {
        const ids = view.choices.map((c) => c.id);
        const id =
          ids.find((i) => i === `pick_${pov}`) ??
          prefer.find((p) => ids.includes(p)) ??
          (random ? ids[Math.floor(random() * ids.length)] : ids[0]);
        run = Story.choose(chapter, run, id).run;
      } else if (view.type === 'puzzle') {
        const flags = secrets ? (puzzles[view.puzzleId].secrets || []).map((s) => s.id) : [];
        run = Story.completePuzzle(chapter, run, view.puzzleId, { stars: 3, coins: 0, words: [], flags });
      }
    }
    assert.ok(run.complete, `${chapter.id} should complete`);
    const next = Story.nextChapter(story, chapter.id, run);
    if (!next) break;
    chapter = byId(next.id);
    run = Story.newRun(chapter, Story.carryFrom(run));
  }
  return { run, scenes, played };
}

const ending = (run) => run.flags.find((f) => f.startsWith('end_') && f !== 'end_secret');

test('content validates', async () => {
  assert.deepEqual(await validateAll(), []);
});

test('every POV plays its own first chapter, then the shared saga, to an ending', () => {
  for (const pov of POVS) {
    const { run, played } = playSaga(pov);
    assert.equal(run.pov, pov);
    assert.deepEqual(played, ['prologue', `c1_${pov}`, 'c2_funeral', 'c3_london', 'c4_alps', 'c5_caribbean']);
    assert.ok(ending(run), `${pov} should reach an ending`);
  }
});

test('each chapter has 3+ scenes, real choices and 2 puzzles per playthrough', () => {
  for (const pov of POVS) {
    const { scenes } = playSaga(pov);
    for (const ch of chapters.filter((c) => c.number > 0)) {
      const visited = scenes.filter((s) => s.chapter === ch.id);
      if (!visited.length) continue;
      assert.ok(visited.length >= 3, `${ch.id}: ${visited.length} scenes`);
      const withPuzzles = visited.filter((s) => Story.getScene(ch, s.id).puzzle).length;
      assert.equal(withPuzzles, 2, `${ch.id} should have two puzzles`);
    }
  }
});

test('ending: a beach wedding when romance blooms and the partner lives', () => {
  const { run } = playSaga('tari', { prefer: ['c_hug', 'c_hold', 'c_kiss_n', 'c_send_kolade', 'c_council'] });
  assert.equal(ending(run), 'end_wedding');
  assert.ok(run.flags.includes('romance_nabyen'));
});

test('ending: tragedy when Nabyen sends the man she loves down the mountain', () => {
  const { run } = playSaga('nabyen', { prefer: ['c_tari', 'c_sit_tari', 'c_kiss_tari', 'c_send_tari'] });
  assert.ok(run.flags.includes('dead_tari'));
  assert.equal(ending(run), 'end_ashes');
});

test('ending: Kolade betrays everyone for Elise', () => {
  const { run } = playSaga('kolade', { prefer: ['c_accept', 'c_betray'] });
  assert.equal(ending(run), 'end_betrayal');
});

test('ending: confessing to the others redeems Kolade', () => {
  const { run } = playSaga('kolade', { prefer: ['c_accept', 'c_confess', 'c_council'] });
  assert.notEqual(ending(run), 'end_betrayal');
  assert.ok(run.flags.includes('confessed'));
});

test('ending: taking the crown alone, or sharing it', () => {
  assert.equal(ending(playSaga('hadiza', { prefer: ['c_honest', 'c_stay_n', 'c_crown_self'] }).run), 'end_crown');
  assert.equal(ending(playSaga('hadiza', { prefer: ['c_honest', 'c_stay_n', 'c_council'] }).run), 'end_council');
});

test('secret ending needs four hidden words in one story', () => {
  const found = playSaga('hadiza', { prefer: ['c_council'], secrets: true }).run;
  assert.ok(found.flags.includes('end_secret'));
  const missed = playSaga('hadiza', { prefer: ['c_council'] }).run;
  assert.ok(!missed.flags.includes('end_secret'));
});

test('carrying the ledger yourself means nobody dies, but Elise escapes', () => {
  const { run } = playSaga('nabyen', { prefer: ['c_send_self'] });
  assert.ok(run.flags.includes('elise_escaped'));
  assert.ok(!run.flags.some((f) => /^dead_(tari|hadiza|kolade)$/.test(f)));
});

test('you can never send yourself to die, and the dead never speak again', () => {
  for (let seed = 1; seed <= 160; seed++) {
    const pov = POVS[seed % 4];
    const random = rng(seed);
    const { run, scenes } = playSaga(pov, { random });
    assert.ok(!run.flags.includes(`dead_${pov}`), `${pov} died in their own story (seed ${seed})`);
    assert.ok(ending(run), `seed ${seed} reached no ending`);
    // After the mountain, the fallen must not appear in dialogue.
    const dead = ['tari', 'hadiza', 'kolade'].filter((id) => run.flags.includes(`dead_${id}`));
    const finale = byId('c5_caribbean');
    for (const s of scenes.filter((x) => x.chapter === 'c5_caribbean')) {
      for (const line of Story.visibleLines(Story.getScene(finale, s.id).lines, run)) {
        assert.ok(!dead.includes(line.speaker), `${line.speaker} speaks after dying (seed ${seed})`);
      }
    }
  }
});

test('POV picks set the POV and condition later lines', () => {
  const pro = chapters[0];
  let run = Story.newRun(pro);
  while (Story.currentView(pro, run).type !== 'choice') {
    const v = Story.currentView(pro, run);
    run = v.type === 'puzzle' ? Story.completePuzzle(pro, run, v.puzzleId, { stars: 3, coins: 0, words: [] }) : Story.advance(pro, run);
  }
  run = Story.choose(pro, run, 'pick_hadiza').run;
  assert.equal(run.pov, 'hadiza');
  assert.ok(run.flags.includes('pov_hadiza'));
  const funeral = Story.getScene(byId('c2_funeral'), 'f2_accuse');
  const ids = Story.visibleChoices(funeral, run).map((c) => c.id);
  assert.ok(ids.includes('c_defend') && !ids.includes('c_answer'));
});

test('conditions: pov, notPov and count', () => {
  const run = { pov: 'tari', flags: ['a', 'b', 'c'], stats: {} };
  assert.ok(Story.checkCondition({ pov: 'tari' }, run));
  assert.ok(Story.checkCondition({ pov: ['nabyen', 'tari'] }, run));
  assert.ok(!Story.checkCondition({ notPov: 'tari' }, run));
  assert.ok(Story.checkCondition({ count: { of: ['a', 'b', 'z'], min: 2 } }, run));
  assert.ok(!Story.checkCondition({ count: { of: ['a', 'y', 'z'], min: 2 } }, run));
});

test('choices apply clamped effects, flags, and record a checkpoint', () => {
  const chapter = {
    id: 'x',
    start: 'a',
    scenes: [
      { id: 'a', lines: [{ speaker: 'narrator', text: 'x' }], prompt: 'p', choices: [{ id: 'up', text: 'Up', effects: { trust: 80 }, setFlags: ['f'] }], next: 'b' },
      { id: 'b', setFlags: ['reached_b'], lines: [{ speaker: 'narrator', text: 'y' }], next: null },
    ],
  };
  let run = Story.advance(chapter, Story.newRun(chapter));
  assert.equal(run.phase, 'choice');
  run = Story.choose(chapter, run, 'up').run;
  assert.equal(run.stats.trust, 100);
  assert.deepEqual(run.flags, ['f', 'reached_b']);
  assert.equal(run.sceneId, 'b');
  const rewound = Story.restoreCheckpoint(chapter, run, 0);
  assert.equal(rewound.sceneId, 'a');
  assert.equal(rewound.stats.trust, 50);
  assert.deepEqual(rewound.flags, []);
});

test('word validation accepts required and real bonus words only', () => {
  const p = puzzles.c_palms;
  let s = Puzzle.newPuzzleState();
  let r = Puzzle.submitGuess(p, s, 'palms');
  assert.equal(r.result, 'required');
  s = r.state;
  assert.equal(Puzzle.submitGuess(p, s, 'PALMS').result, 'repeat');
  assert.equal(Puzzle.submitGuess(p, s, 'SLAP').result, 'bonus');
  assert.equal(Puzzle.submitGuess(p, s, 'PSALM').secret.id, 's_psalm');
  assert.equal(Puzzle.submitGuess(p, s, 'MLAPS').result, 'unknown');
  assert.equal(Puzzle.submitGuess(p, s, 'PA').result, 'too-short');
  s = Puzzle.submitGuess(p, s, 'LAMPS').state;
  s = Puzzle.submitGuess(p, s, 'PALM').state;
  assert.ok(Puzzle.isComplete(p, s));
});

test('hints escalate: first letter, remove letters, reveal', () => {
  const p = puzzles.a_snow;
  let s = Puzzle.newPuzzleState();
  const target = Puzzle.currentTarget(p, s);
  let h = Puzzle.applyHint(p, s);
  s = h.state;
  assert.equal(h.hint.level, 1);
  assert.equal(Puzzle.slotsFor(p, s, target)[0], target[0]);
  h = Puzzle.applyHint(p, s);
  s = h.state;
  const remaining = p.letters.filter((_, i) => !s.disabledTiles.includes(i)).sort().join('');
  assert.equal(remaining, target.split('').sort().join(''));
  h = Puzzle.applyHint(p, s);
  s = h.state;
  assert.ok(s.found.includes(target));
  assert.equal(Puzzle.starsFor(s), 1);
});

test('tilesNotIn keeps duplicate letters the target needs', () => {
  assert.deepEqual(Puzzle.tilesNotIn(['A', 'A', 'T'], 'AT'), [1]);
});

test('rewards, streaks, hint recovery and daily streaks', () => {
  let res = Progress.rewardPuzzle(Progress.newProfile(), { found: ['A', 'B', 'C'], bonus: ['D'], revealed: [], hintsUsed: 0 }, 3);
  assert.equal(res.reward.coins, 5);
  assert.equal(res.profile.hints, Progress.REWARDS.startingHints + 1);
  let p = { ...Progress.newProfile(), hints: 0 };
  for (let i = 0; i < Progress.REWARDS.bonusWordsPerHint; i++) p = Progress.creditBonusWord(p).profile;
  assert.equal(p.hints, 1);
  let d = Progress.completeDaily(Progress.newProfile(), '2026-10-01').profile;
  d = Progress.completeDaily(d, '2026-10-02').profile;
  assert.equal(d.daily.streak, 2);
});

test('save and load round-trip, and survive bad or old data', () => {
  const store = new Map();
  const storage = { getItem: (k) => store.get(k) ?? null, setItem: (k, v) => store.set(k, v), removeItem: (k) => store.delete(k) };
  Progress.save(storage, { ...Progress.newProfile(), coins: 42, run: Story.newRun(chapters[0]) });
  assert.equal(Progress.load(storage).coins, 42);
  store.set('storyword.save', JSON.stringify({ version: 1, coins: 9 }));
  assert.equal(Progress.load(storage).coins, 0);
  store.set('storyword.save', '{not json');
  assert.equal(Progress.load(storage).coins, 0);
});

test('every speaker and background in the content can be drawn', () => {
  const backgrounds = new Set([
    ...chapters.flatMap((c) => c.scenes.map((s) => s.background)),
    ...chapters.flatMap((c) => Object.values(c.memories || {}).map((m) => m.background)),
    ...daily.entries.map((e) => e.background),
  ]);
  for (const b of backgrounds) assert.ok(SCENE_KEYS.includes(b), `no scene art for "${b}"`);
  for (const k of SCENE_KEYS) assert.match(sceneSVG(k), /^<svg[\s\S]*<\/svg>$/);
  for (const [id, c] of Object.entries(characters)) {
    if (c.narration || c.message || c.letter) continue;
    for (const mood of ['neutral', 'smile', 'sad', 'angry', 'surprised', 'worried']) {
      assert.match(portraitSVG(c, mood, id), /<svg[\s\S]*<\/svg>/, `${id} ${mood}`);
    }
  }
});

test('the offline single-file build is up to date', async () => {
  const current = await readFile(OUTPUT, 'utf8');
  assert.equal(current, await build(), 'run: npm run build');
});
