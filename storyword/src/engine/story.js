// Story engine: pure functions over chapter data and a "run" (one playthrough
// of one chapter). Nothing here touches the DOM or storage, so the whole
// branch-and-converge logic is testable in Node.
//
// A saga is a sequence of chapters. Stats, flags and the chosen point-of-view
// character carry from one chapter's run into the next (see nextChapter and
// the `carry` argument of newRun).
//
// Besides the global stats, a run tracks each love interest's `intimacy`
// and `tension` (run.rel), and secrets double as leverage: a choice can
// require a secret and spend it.

// trust/affection/reputation are the original hidden stats; desire, control
// and loyalty (high = loyalty, low = luxury) are the relational axes.
export const STATS = ['trust', 'affection', 'reputation', 'desire', 'control', 'loyalty'];
export const REL_KEYS = ['intimacy', 'tension'];
const STAT_MIN = 0;
const STAT_MAX = 100;

// Scene phases, in the order a scene plays them. Any phase a scene has no
// content for is skipped.
//   lines    -> the scene's dialogue
//   choice   -> waiting for the player to pick
//   response -> the chosen option's reaction lines
//   puzzle   -> the scene's word puzzle
export const PHASES = ['lines', 'choice', 'response', 'puzzle'];

export function newRun(chapter, carry = {}) {
  const stats = carry.stats ?? { ...defaultStats(), ...(chapter.initialStats || {}) };
  const flags = carry.flags ?? [];
  const pov = carry.pov ?? null;
  const rel = structuredClone(carry.rel ?? chapter.initialRel ?? {});
  const run = {
    chapterId: chapter.id,
    sceneId: chapter.start,
    phase: 'lines',
    lineIndex: 0,
    carry: { stats, flags, pov, rel: structuredClone(rel) }, // the chapter's starting state, for replays
    pov,
    rel,
    stats: { ...stats },
    flags: [...flags],
    choices: [],      // [{ sceneId, choiceId, text }]
    checkpoints: [],  // snapshots taken just before each choice, for replay
    puzzles: {},      // puzzleId -> summary once solved
    response: null,   // lines of the choice just made
    pendingNext: null,
    complete: false,
  };
  return enterScene(run, getScene(chapter, chapter.start));
}

// Flags a scene sets just by being reached (deaths, endings, places visited).
function enterScene(run, scene) {
  if (!scene.setFlags?.length) return run;
  return { ...run, flags: [...new Set([...run.flags, ...scene.setFlags])] };
}

function defaultStats() {
  return Object.fromEntries(STATS.map((s) => [s, 50]));
}

// A condition is an object; every key present must hold.
//   flags:    all of these flags are set
//   anyFlags: at least one of these flags is set
//   notFlags: none of these flags are set
//   min/max:  { stat: value } bounds, inclusive
//   pov / notPov: the point-of-view character is (not) one of these ids
//   count:    { of: [flags], min: n } at least n of these flags are set
//   rel:      { kolade: { minTension: 50, maxIntimacy: 30 } } relationship bounds
//   any / all: lists of nested conditions (at least one / every one holds)
export function checkCondition(cond, run) {
  if (!cond) return true;
  if (cond.any && !cond.any.some((c) => checkCondition(c, run))) return false;
  if (cond.all && !cond.all.every((c) => checkCondition(c, run))) return false;
  const has = (f) => run.flags.includes(f);
  if (cond.flags && !cond.flags.every(has)) return false;
  if (cond.anyFlags && !cond.anyFlags.some(has)) return false;
  if (cond.notFlags && cond.notFlags.some(has)) return false;
  if (cond.pov && !asList(cond.pov).includes(run.pov)) return false;
  if (cond.notPov && asList(cond.notPov).includes(run.pov)) return false;
  if (cond.count && cond.count.of.filter(has).length < cond.count.min) return false;
  for (const [stat, v] of Object.entries(cond.min || {})) {
    if ((run.stats[stat] ?? 0) < v) return false;
  }
  for (const [stat, v] of Object.entries(cond.max || {})) {
    if ((run.stats[stat] ?? 0) > v) return false;
  }
  for (const [who, bounds] of Object.entries(cond.rel || {})) {
    if (!relWithin(run.rel?.[who], bounds)) return false;
  }
  return true;
}

// bounds: { minIntimacy, maxIntimacy, minTension, maxTension }
export function relWithin(values = {}, bounds = {}) {
  for (const key of REL_KEYS) {
    const cap = key[0].toUpperCase() + key.slice(1);
    const v = values[key] ?? 0;
    if (bounds[`min${cap}`] != null && v < bounds[`min${cap}`]) return false;
    if (bounds[`max${cap}`] != null && v > bounds[`max${cap}`]) return false;
  }
  return true;
}

export function applyRel(rel, deltas) {
  const out = structuredClone(rel || {});
  for (const [who, d] of Object.entries(deltas || {})) {
    const cur = out[who] ?? { intimacy: 0, tension: 0 };
    out[who] = Object.fromEntries(REL_KEYS.map((k) => [k, clamp((cur[k] ?? 0) + (d[k] ?? 0))]));
  }
  return out;
}

// A character's status label, e.g. "Dangerous Alliance". `labels` comes
// from characters.json: the first whose bounds hold wins.
export function relStatus(relationship, values) {
  if (!relationship) return null;
  const hit = (relationship.labels || []).find((l) => relWithin(values, l.when));
  return hit?.label ?? relationship.default ?? null;
}

// A choice can be shown but locked: `gate` is a condition (with a label for
// the UI), `leverage` names a secret flag the player must hold and will spend.
export function lockReason(choice, run) {
  if (choice.leverage) {
    if (!run.flags.includes(choice.leverage)) return { kind: 'leverage', secret: choice.leverage };
    if (run.flags.includes(`spent_${choice.leverage}`)) return { kind: 'spent', secret: choice.leverage };
  }
  if (choice.gate && !checkCondition(choice.gate.if, run)) return { kind: 'gate', label: choice.gate.label };
  return null;
}

// Secrets held and not yet spent.
export function heldLeverage(run, secretIds) {
  return secretIds.filter((id) => run.flags.includes(id) && !run.flags.includes(`spent_${id}`));
}

const asList = (v) => (Array.isArray(v) ? v : [v]);

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
    // Leverage choices appear only while you hold the secret (they're a
    // reward for finding it); condition-gated ones show locked as a goal.
    const choices = visibleChoices(scene, run)
      .map((c) => ({ ...c, locked: lockReason(c, run) }))
      .filter((c) => !c.locked || c.locked.kind === 'gate');
    return { type: 'choice', scene, prompt: resolvePrompt(scene.prompt, run), choices };
  }
  if (run.phase === 'puzzle') {
    return { type: 'puzzle', scene, puzzleId: scene.puzzle };
  }
  throw new Error(`Bad phase ${run.phase}`);
}

// A prompt is a string, or a list of { if, text } where the first match wins.
export function resolvePrompt(prompt, run) {
  if (!Array.isArray(prompt)) return prompt;
  return prompt.find((p) => checkCondition(p.if, run))?.text ?? '';
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
  return enterPhase(chapter, enterScene({ ...base, sceneId }, getScene(chapter, sceneId)), 'lines');
}

export function choose(chapter, run, choiceId) {
  if (run.phase !== 'choice') throw new Error('Not waiting for a choice');
  const scene = getScene(chapter, run.sceneId);
  const choice = visibleChoices(scene, run).find((c) => c.id === choiceId);
  if (!choice) throw new Error(`Unknown choice "${choiceId}" in scene ${scene.id}`);
  if (lockReason(choice, run)) throw new Error(`Choice "${choiceId}" is locked`);

  const checkpoint = snapshot(run);
  const flags = [...new Set([...run.flags, ...(choice.setFlags || [])])].filter(
    (f) => !(choice.clearFlags || []).includes(f),
  );
  const pov = choice.pov ?? run.pov;
  if (choice.pov) flags.push(`pov_${choice.pov}`);
  if (choice.leverage) flags.push(`spent_${choice.leverage}`);
  let r = {
    ...run,
    pov,
    rel: applyRel(run.rel, choice.rel),
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

// The chapter that follows `chapterId` for this run: the next entry in the
// story manifest whose condition holds (POV chapters are conditional on the
// chosen character). Returns the manifest entry, or null at the saga's end.
export function nextChapter(story, chapterId, run) {
  const i = story.chapters.findIndex((c) => c.id === chapterId);
  return story.chapters.slice(i + 1).find((c) => checkCondition(c.if, run)) ?? null;
}

// What the next chapter's run starts with.
export function carryFrom(run) {
  return { stats: { ...run.stats }, flags: [...run.flags], pov: run.pov, rel: structuredClone(run.rel ?? {}) };
}

// Merge the unlocked 18+ content into the chapters. The bundle adds choices
// to existing scenes, whole new scenes, routes checked before a scene's own
// `next`, outcomes and reflections. Added scenes and choices are marked
// `plus: true`. Returns new chapter objects; the originals are untouched.
export function applyPlus(chapters, plus) {
  const out = structuredClone(chapters);
  const byId = Object.fromEntries(out.map((c) => [c.id, c]));
  const find = (path) => {
    const [cid, sid] = path.split('/');
    const scene = byId[cid]?.scenes.find((s) => s.id === sid);
    if (!scene) throw new Error(`18+ content targets unknown scene "${path}"`);
    return scene;
  };
  for (const { chapter, scene } of plus.scenes || []) byId[chapter].scenes.push({ ...scene, plus: true });
  for (const { at, choice } of plus.choices || []) (find(at).choices ??= []).push({ ...choice, plus: true });
  for (const { at, routes } of plus.routes || []) {
    const scene = find(at);
    const base = Array.isArray(scene.next) ? scene.next : [{ to: scene.next ?? null }];
    scene.next = [...routes, ...base];
  }
  for (const { chapter, outcome, before } of plus.outcomes || []) {
    const list = (byId[chapter].outcomes ??= []);
    const i = list.findIndex((o) => o.id === before);
    list.splice(i < 0 ? 0 : i, 0, outcome);
  }
  for (const { chapter, reflection } of plus.reflections || []) (byId[chapter].reflections ??= []).unshift(reflection);
  return out;
}
