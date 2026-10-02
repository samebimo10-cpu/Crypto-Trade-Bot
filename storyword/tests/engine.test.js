import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as Story from '../src/engine/story.js';
import * as Puzzle from '../src/engine/puzzle.js';
import * as Progress from '../src/engine/progress.js';
import { loadAll, validateAll } from '../tools/validate-content.js';

const { chapters, puzzles } = await loadAll();
const ch1 = chapters[0];

// Drive a run to the end, picking choices by id (or the first when unlisted)
// and solving every puzzle. Returns the final run and the scenes visited.
function playThrough(chapter, picks = {}) {
  let run = Story.newRun(chapter);
  const visited = [];
  for (let steps = 0; steps < 500 && !run.complete; steps++) {
    const view = Story.currentView(chapter, run);
    if (visited.at(-1) !== view.scene.id) visited.push(view.scene.id);
    if (view.type === 'line') run = Story.advance(chapter, run);
    else if (view.type === 'choice') run = Story.choose(chapter, run, picks[view.scene.id] ?? view.choices[0].id).run;
    else if (view.type === 'puzzle') run = Story.completePuzzle(chapter, run, view.puzzleId, { stars: 3, coins: 0, words: [] });
  }
  assert.ok(run.complete, 'run should reach the end');
  return { run, visited };
}

test('content validates', async () => {
  assert.deepEqual(await validateAll(), []);
});

test('chapter 1 meets the MVP content scope', () => {
  const choicePoints = (visited) => visited.filter((id) => Story.getScene(ch1, id).choices?.length).length;
  const { visited } = playThrough(ch1);
  assert.ok(visited.length >= 5 && visited.length <= 10, `scenes per playthrough: ${visited.length}`);
  assert.ok(choicePoints(visited) >= 8 && choicePoints(visited) <= 12, `choices: ${choicePoints(visited)}`);
  const puzzleCount = ch1.scenes.filter((s) => s.puzzle).length;
  assert.ok(puzzleCount >= 3 && puzzleCount <= 5);
  const speakers = new Set(ch1.scenes.flatMap((s) => (s.lines || []).map((l) => l.speaker)));
  speakers.delete('narrator');
  assert.ok(speakers.size >= 5 && speakers.size <= 8, `characters: ${speakers.size}`);
});

test('the Eli decision branches and then converges', () => {
  const paths = {
    c_tell_eli: { scene: 's7_fallout', outcome: 'ch1_fallout' },
    c_lie: { scene: 's7_tracks', outcome: 'ch1_useful_lie' },
    c_protect: { scene: 's7_kept', outcome: 'ch1_shield' },
  };
  for (const [choiceId, expected] of Object.entries(paths)) {
    const { run, visited } = playThrough(ch1, { s4_harbor: choiceId });
    assert.ok(visited.includes(expected.scene), `${choiceId} should visit ${expected.scene}`);
    assert.ok(visited.includes('s8_night'), `${choiceId} should converge on s8_night`);
    assert.equal(Story.pickOutcome(ch1, run).id, expected.outcome);
  }
});

test('conditional lines follow earlier choices', () => {
  let run = Story.newRun(ch1);
  run = { ...run, flags: ['told_jun'] };
  const cafe = Story.getScene(ch1, 's2_cafe');
  const withFlag = Story.visibleLines(cafe.lines, run).length;
  const without = Story.visibleLines(cafe.lines, { ...run, flags: [] }).length;
  assert.equal(withFlag, without + 1);
});

test('choices apply clamped effects, flags, and record a checkpoint', () => {
  const chapter = {
    id: 9,
    start: 'a',
    scenes: [
      { id: 'a', lines: [{ speaker: 'narrator', text: 'x' }], prompt: 'p', choices: [{ id: 'up', text: 'Up', effects: { trust: 80 }, setFlags: ['f'] }], next: 'b' },
      { id: 'b', lines: [{ speaker: 'narrator', text: 'y' }], next: null },
    ],
  };
  let run = Story.advance(chapter, Story.newRun(chapter));
  assert.equal(run.phase, 'choice');
  run = Story.choose(chapter, run, 'up').run;
  assert.equal(run.stats.trust, 100);
  assert.deepEqual(run.flags, ['f']);
  assert.equal(run.sceneId, 'b');
  assert.equal(run.checkpoints.length, 1);

  const rewound = Story.restoreCheckpoint(chapter, run, 0);
  assert.equal(rewound.sceneId, 'a');
  assert.equal(rewound.phase, 'choice');
  assert.equal(rewound.stats.trust, 50);
  assert.deepEqual(rewound.flags, []);
});

test('resolveNext requires a fallback route', () => {
  const run = { flags: [], stats: {} };
  assert.equal(Story.resolveNext([{ if: { flags: ['x'] }, to: 'a' }, { to: 'b' }], run), 'b');
  assert.throws(() => Story.resolveNext([{ if: { flags: ['x'] }, to: 'a' }], run));
});

test('word validation accepts required and bonus words only', () => {
  const p = puzzles.p_heart;
  let s = Puzzle.newPuzzleState();
  let r = Puzzle.submitGuess(p, s, 'heart');
  assert.equal(r.result, 'required');
  s = r.state;
  assert.equal(Puzzle.submitGuess(p, s, 'HEART').result, 'repeat');
  assert.equal(Puzzle.submitGuess(p, s, 'EARTH').result, 'bonus');
  assert.equal(Puzzle.submitGuess(p, s, 'HE').result, 'too-short');
  assert.equal(Puzzle.submitGuess(p, s, 'HATTER').result, 'unknown'); // needs two Ts
  assert.equal(Puzzle.submitGuess(p, s, 'RHET').result, 'unknown'); // buildable, not a word
  s = Puzzle.submitGuess(p, s, 'HEAR').state;
  s = Puzzle.submitGuess(p, s, 'HEAT').state;
  assert.ok(Puzzle.isComplete(p, s));
});

test('secret words are reported', () => {
  const r = Puzzle.submitGuess(puzzles.p_tale, Puzzle.newPuzzleState(), 'STEAL');
  assert.equal(r.result, 'bonus');
  assert.equal(r.secret.id, 's_stolen');
});

test('hints escalate: first letter, remove letters, reveal', () => {
  const p = puzzles.p_secret; // S E C R E T, shortest target REST or TREE
  let s = Puzzle.newPuzzleState();
  const target = Puzzle.currentTarget(p, s);
  assert.equal(target.length, 4);

  let h = Puzzle.applyHint(p, s);
  s = h.state;
  assert.equal(h.hint.level, 1);
  assert.equal(Puzzle.slotsFor(p, s, target)[0], target[0]);

  h = Puzzle.applyHint(p, s);
  s = h.state;
  assert.equal(h.hint.level, 2);
  const remaining = p.letters.filter((_, i) => !s.disabledTiles.includes(i)).sort().join('');
  assert.equal(remaining, target.split('').sort().join(''));

  h = Puzzle.applyHint(p, s);
  s = h.state;
  assert.equal(h.hint.level, 3);
  assert.ok(s.found.includes(target));
  assert.deepEqual(s.revealed, [target]);
  assert.equal(s.hintLevel, 0);
  assert.equal(Puzzle.starsFor(s), 1);
});

test('tilesNotIn keeps duplicate letters the target needs', () => {
  assert.deepEqual(Puzzle.tilesNotIn(['A', 'A', 'T'], 'AT'), [1]);
  assert.deepEqual(Puzzle.tilesNotIn(['S', 'E', 'C', 'R', 'E', 'T'], 'TREE'), [0, 2]);
});

test('puzzle rewards, streaks and hint recovery', () => {
  let profile = Progress.newProfile();
  const clean = { found: ['A', 'B', 'C'], bonus: ['D'], revealed: [], hintsUsed: 0 };
  let res = Progress.rewardPuzzle(profile, clean, 3);
  assert.equal(res.reward.coins, 3 + 2);
  assert.equal(res.profile.streak, 1);
  assert.equal(res.profile.hints, Progress.REWARDS.startingHints + 1);
  res = Progress.rewardPuzzle(res.profile, clean, 3);
  assert.equal(res.profile.streak, 2);
  assert.equal(res.reward.streakBonus, 2);
  res = Progress.rewardPuzzle(res.profile, { ...clean, revealed: ['A'] }, 1);
  assert.equal(res.profile.streak, 0);
  assert.equal(res.profile.bestStreak, 2);
  assert.equal(res.profile.wordsFound.length, 4);
});

test('chapter completion pays once', () => {
  let { profile, reward } = Progress.completeChapter(Progress.newProfile(), 1, 'ch1_shield');
  assert.equal(reward.coins, Progress.REWARDS.chapterCoins);
  ({ profile, reward } = Progress.completeChapter(profile, 1, 'ch1_fallout'));
  assert.equal(reward.coins, 0);
  assert.deepEqual(profile.endings, ['ch1_shield', 'ch1_fallout']);
});

test('daily word streak counts consecutive days', () => {
  let p = Progress.newProfile();
  p = Progress.completeDaily(p, '2026-10-01').profile;
  assert.equal(Progress.completeDaily(p, '2026-10-01').reward, null);
  p = Progress.completeDaily(p, '2026-10-02').profile;
  assert.equal(p.daily.streak, 2);
  p = Progress.completeDaily(p, '2026-10-05').profile;
  assert.equal(p.daily.streak, 1);
});

test('save and load round-trip, and survive bad data', () => {
  const store = new Map();
  const storage = { getItem: (k) => store.get(k) ?? null, setItem: (k, v) => store.set(k, v), removeItem: (k) => store.delete(k) };
  const p = { ...Progress.newProfile(), coins: 42, run: Story.newRun(ch1) };
  Progress.save(storage, p);
  const loaded = Progress.load(storage);
  assert.equal(loaded.coins, 42);
  assert.equal(loaded.run.sceneId, ch1.start);
  store.set('storyword.save', '{not json');
  assert.equal(Progress.load(storage).coins, 0);
  assert.equal(Progress.load(null).coins, 0);
});

test('bonus words earn hints back', () => {
  let p = { ...Progress.newProfile(), hints: 0 };
  for (let i = 0; i < Progress.REWARDS.bonusWordsPerHint - 1; i++) {
    const r = Progress.creditBonusWord(p);
    assert.equal(r.hintEarned, false);
    p = r.profile;
  }
  const r = Progress.creditBonusWord(p);
  assert.equal(r.hintEarned, true);
  assert.equal(r.profile.hints, 1);
  assert.equal(r.profile.bonusTowardHint, 0);
});
