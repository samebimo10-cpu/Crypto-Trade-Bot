// Story engine: pure functions over chapter data and a "run" (one playthrough
// of one chapter). Nothing here touches the DOM or storage, so the whole
// branch-and-converge logic is testable in Node.

export const STATS = ['trust', 'affection', 'reputation'];
const STAT_MIN = 0;
const STAT_MAX = 100;

// Scene phases, in the order a scene plays them. Any phase a scene has no
// content for is skipped.
//   lines    -> the scene's dialogue
//   choice   -> waiting for the player to pick
//   response -> the chosen option's reaction lines
//   puzzle   -> the scene's word puzzle
export const PHASES = ['lines', 'choice', 'response', 'puzzle'];

export function newRun(chapter) {
  return {
    chapterId: chapter.id,
    sceneId: chapter.start,
    phase: 'lines',
    lineIndex: 0,
    stats: { ...defaultStats(), ...(chapter.initialStats || {}) },
    flags: [],
    choices: [],      // [{ sceneId, choiceId, text }]
    checkpoints: [],  // snapshots taken just before each choice, for replay
    puzzles: {},      // puzzleId -> summary once solved
    response: null,   // lines of the choice just made
    pendingNext: null,
    complete: false,
  };
}

function defaultStats() {
  return Object.fromEntries(STATS.map((s) => [s, 50]));
}

// A condition is an object; every key present must hold.
//   flags:    all of these flags are set
//   anyFlags: at least one of these flags is set
//   notFlags: none of these flags are set
//   min/max:  { stat: value } bounds, inclusive
export function checkCondition(cond, run) {
  if (!cond) return true;
  const has = (f) => run.flags.includes(f);
  if (cond.flags && !cond.flags.every(has)) return false;
  if (cond.anyFlags && !cond.anyFlags.some(has)) return false;
  if (cond.notFlags && cond.notFlags.some(has)) return false;
  for (const [stat, v] of Object.entries(cond.min || {})) {
    if ((run.stats[stat] ?? 0) < v) return false;
  }
  for (const [stat, v] of Object.entries(cond.max || {})) {
    if ((run.stats[stat] ?? 0) > v) return false;
  }
  return true;
}

export function getScene(chapter, sceneId) {
  const scene = chapter.scenes.find((s) => s.id === sceneId);
  if (!scene) throw new Error(`Unknown scene "${sceneId}" in chapter ${chapter.id}`);
  return scene;
}

export function visibleLines(lines, run) {
  return (lines || []).filter((l) => checkCondition(l.if, run));
}

export function visibleChoices(scene, run) {
  return (scene.choices || []).filter((c) => checkCondition(c.if, run));
}

// `next` is either a scene id, or a list of { if, to } evaluated in order.
// A list must end with an unconditional entry so routing never dead-ends.
export function resolveNext(next, run) {
  if (next == null) return null;
  if (typeof next === 'string') return next;
  for (const route of next) {
    if (checkCondition(route.if, run)) return route.to;
  }
  throw new Error('No route matched; a next-list needs an unconditional fallback');
}

export function applyEffects(stats, effects) {
  const out = { ...stats };
  for (const [stat, delta] of Object.entries(effects || {})) {
    out[stat] = clamp((out[stat] ?? 50) + delta);
  }
  return out;
}

function clamp(v) {
  return Math.max(STAT_MIN, Math.min(STAT_MAX, v));
}

// What the player sees right now.
export function currentView(chapter, run) {
  if (run.complete) return { type: 'complete' };
  const scene = getScene(chapter, run.sceneId);
  if (run.phase === 'lines' || run.phase === 'response') {
    const lines = run.phase === 'lines' ? visibleLines(scene.lines, run) : run.response;
    return { type: 'line', scene, line: lines[run.lineIndex], index: run.lineIndex, total: lines.length };
  }
  if (run.phase === 'choice') {
    return { type: 'choice', scene, prompt: scene.prompt, choices: visibleChoices(scene, run) };
  }
  if (run.phase === 'puzzle') {
    return { type: 'puzzle', scene, puzzleId: scene.puzzle };
  }
  throw new Error(`Bad phase ${run.phase}`);
}

// Advance past the current dialogue line. Returns the new run.
export function advance(chapter, run) {
  const scene = getScene(chapter, run.sceneId);
  if (run.phase !== 'lines' && run.phase !== 'response') return run;
  const lines = run.phase === 'lines' ? visibleLines(scene.lines, run) : run.response;
  if (run.lineIndex + 1 < lines.length) {
    return { ...run, lineIndex: run.lineIndex + 1 };
  }
  return enterPhase(chapter, run, nextPhase(run.phase));
}

function nextPhase(phase) {
  return PHASES[PHASES.indexOf(phase) + 1] ?? 'end';
}

// Move to `phase`, skipping any phase the scene has nothing for.
function enterPhase(chapter, run, phase) {
  const scene = getScene(chapter, run.sceneId);
  let r = { ...run, phase, lineIndex: 0 };
  if (phase === 'lines' && visibleLines(scene.lines, r).length === 0) return enterPhase(chapter, r, 'choice');
  if (phase === 'choice' && visibleChoices(scene, r).length === 0) return enterPhase(chapter, r, 'response');
  if (phase === 'response' && !(r.response && r.response.length)) return enterPhase(chapter, r, 'puzzle');
  if (phase === 'puzzle' && (!scene.puzzle || r.puzzles[scene.puzzle])) return enterPhase(chapter, r, 'end');
  if (phase === 'end') return goToScene(chapter, r, r.pendingNext ?? resolveNext(scene.next, r));
  return r;
}

function goToScene(chapter, run, sceneId) {
  const base = { ...run, response: null, pendingNext: null };
  if (!sceneId) return { ...base, complete: true, phase: 'end' };
  return enterPhase(chapter, { ...base, sceneId }, 'lines');
}

export function choose(chapter, run, choiceId) {
  if (run.phase !== 'choice') throw new Error('Not waiting for a choice');
  const scene = getScene(chapter, run.sceneId);
  const choice = visibleChoices(scene, run).find((c) => c.id === choiceId);
  if (!choice) throw new Error(`Unknown choice "${choiceId}" in scene ${scene.id}`);

  const checkpoint = snapshot(run);
  const flags = [...new Set([...run.flags, ...(choice.setFlags || [])])].filter(
    (f) => !(choice.clearFlags || []).includes(f),
  );
  let r = {
    ...run,
    stats: applyEffects(run.stats, choice.effects),
    flags,
    choices: [...run.choices, { sceneId: scene.id, choiceId: choice.id, text: choice.text }],
    checkpoints: [...run.checkpoints, { sceneId: scene.id, label: scene.prompt || choice.text, run: checkpoint }],
  };
  r.response = visibleLines(choice.response, r);
  r.pendingNext = choice.next ? resolveNext(choice.next, r) : null;
  return { run: enterPhase(chapter, r, 'response'), choice };
}

export function completePuzzle(chapter, run, puzzleId, summary) {
  if (run.phase !== 'puzzle') throw new Error('Not in a puzzle');
  const r = {
    ...run,
    puzzles: { ...run.puzzles, [puzzleId]: summary },
    flags: [...new Set([...run.flags, ...(summary.flags || [])])],
  };
  return enterPhase(chapter, r, 'end');
}

// Checkpoints hold a copy of the run minus its own checkpoint list (which is
// rebuilt as the player replays), keeping saves from growing quadratically.
function snapshot(run) {
  const { checkpoints, ...rest } = run;
  return structuredClone(rest);
}

export function restoreCheckpoint(chapter, run, index) {
  const cp = run.checkpoints[index];
  if (!cp) throw new Error(`No checkpoint ${index}`);
  return { ...structuredClone(cp.run), checkpoints: run.checkpoints.slice(0, index) };
}

// The first outcome whose condition holds; outcomes summarise what the
// player's choices led to on the results screen.
export function pickOutcome(chapter, run) {
  return (chapter.outcomes || []).find((o) => checkCondition(o.if, run)) ?? null;
}
