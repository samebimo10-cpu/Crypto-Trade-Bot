// StoryWord UI. Screens are rendered as HTML strings into #app; all input
// goes through one delegated click handler keyed on data-action. Game rules
// live in src/engine/*; this file only wires them to the screen.

import * as Story from './engine/story.js';
import * as Puzzle from './engine/puzzle.js';
import * as Progress from './engine/progress.js';
import { portraitSVG } from './ui/portrait.js';

const app = document.getElementById('app');
const toastHost = document.getElementById('toasts');
const storage = safeStorage();

let C; // loaded content
let profile;
const ui = {
  screen: 'home',
  puzzle: null, // { key, id, puzzle, state, order, guess, feedback, secretFlags, context }
  overlay: null,
  daily: null, // { key, entry, lineIndex, phase }
  shake: false,
};

// --- Boot -------------------------------------------------------------------

async function boot() {
  try {
    C = await loadContent();
  } catch (e) {
    app.innerHTML = `<main class="screen center"><p>Couldn't load the story.</p><p class="muted">${esc(e.message)}</p>
      <p class="muted">Serve this folder over HTTP (npm start) rather than opening the file directly.</p></main>`;
    return;
  }
  profile = Progress.load(storage);
  app.addEventListener('click', onClick);
  document.addEventListener('keydown', onKey);
  render();
}

async function loadContent() {
  const get = async (f) => {
    const res = await fetch(`content/${f}`);
    if (!res.ok) throw new Error(`${f}: HTTP ${res.status}`);
    return res.json();
  };
  const [story, characters, puzzles, daily] = await Promise.all([
    get('story.json'),
    get('characters.json'),
    get('puzzles.json'),
    get('daily.json'),
  ]);
  const chapters = await Promise.all(story.chapters.map((c) => get(c.file)));
  return {
    story,
    characters,
    daily,
    chapters,
    puzzles: Object.fromEntries(puzzles.puzzles.map((p) => [p.id, p])),
  };
}

function safeStorage() {
  try {
    const s = window.localStorage;
    s.setItem('storyword.probe', '1');
    s.removeItem('storyword.probe');
    return s;
  } catch {
    return null; // private mode etc.: the game still plays, it just won't save
  }
}

// --- Helpers ----------------------------------------------------------------

function esc(s) {
  return String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
}

const chapterById = (id) => C.chapters.find((c) => c.id === id);
const currentChapter = () => chapterById(profile.run?.chapterId) ?? C.chapters[0];

function persist() {
  Progress.save(storage, profile);
}

function toast(message) {
  const el = document.createElement('div');
  el.className = 'toast';
  el.textContent = message;
  toastHost.appendChild(el);
  setTimeout(() => el.classList.add('out'), 2400);
  setTimeout(() => el.remove(), 2900);
}

function go(screen) {
  ui.screen = screen;
  ui.overlay = null;
  render();
  window.scrollTo(0, 0);
}

function topbar(label, { hints = false } = {}) {
  return `<header class="topbar">
    <button class="icon-btn" data-action="home" aria-label="Home">⌂</button>
    <span class="topbar-label">${esc(label)}</span>
    ${hints ? `<span class="pill" title="Hints">💡 ${profile.hints}</span>` : '<span class="pill-spacer"></span>'}
  </header>`;
}

// --- Rendering --------------------------------------------------------------

function render() {
  const screens = { home: renderHome, story: renderStory, results: renderResults, profile: renderProfile, memories: renderMemories, daily: renderDaily };
  app.innerHTML = (screens[ui.screen] || renderHome)() + renderOverlay();
  if (ui.shake) {
    ui.shake = false;
    app.querySelector('.guess')?.classList.add('shake');
  }
}

function renderHome() {
  const chapter = currentChapter();
  const run = profile.run;
  const inProgress = run && !run.complete;
  const scene = Story.getScene(chapter, inProgress ? run.sceneId : chapter.start);
  const today = Progress.dateKey();
  const dailyDone = Progress.dailyDone(profile, today);
  const label = inProgress ? 'Continue' : profile.completedChapters.includes(chapter.id) ? 'Play again' : 'Play';
  return `<main class="screen home">
    <header class="topbar">
      <span class="pill">⭐ ${profile.stars}</span>
      <span class="pill">🪙 ${profile.coins}</span>
      <button class="icon-btn" data-action="profile" aria-label="Your progress">☰</button>
    </header>
    <h1 class="logo">STORY<span>WORD</span></h1>
    <section class="scene-card bg-${esc(scene.background)}">
      <p class="eyebrow">Season ${C.story.season} · ${esc(C.story.seasonTitle)}</p>
      <h2>Chapter ${chapter.id}: ${esc(chapter.title)}</h2>
      <p>${inProgress ? 'Continue the story…' : esc(chapter.teaser)}</p>
    </section>
    <button class="btn primary big" data-action="play">${label}</button>
    <nav class="home-links">
      <button class="link-card" data-action="daily">
        <span>📅 Daily Word</span>
        <small>${dailyDone ? `Done today · 🔥 ${profile.daily.streak}` : 'A new scene is waiting'}</small>
      </button>
      <button class="link-card" data-action="memories">
        <span>📸 Memories</span>
        <small>${profile.memories.length} collected</small>
      </button>
    </nav>
  </main>`;
}

function lineHTML(line, { tapHint = true } = {}) {
  const ch = C.characters[line.speaker] || {};
  if (ch.message) {
    return `<div class="stage"><div class="phone"><p class="phone-from">${esc(ch.name)}</p>
      <p class="bubble">${esc(line.text)}</p></div></div>
      <div class="dialogue message-line">${tapHint ? '<span class="tap">tap to continue</span>' : ''}</div>`;
  }
  if (ch.narration) {
    return `<div class="stage"></div>
      <div class="dialogue narration"><p class="line">${esc(line.text)}</p>
      ${tapHint ? '<span class="tap">tap to continue</span>' : ''}</div>`;
  }
  return `<div class="stage"><div class="portrait mood-${esc(line.mood || 'neutral')}">${portraitSVG(ch, line.mood)}</div></div>
    <div class="dialogue"><p class="speaker" style="--accent:${esc(ch.accent)}">${esc(ch.name)}</p>
    <p class="line">“${esc(line.text)}”</p>
    ${tapHint ? '<span class="tap">tap to continue</span>' : ''}</div>`;
}

function renderStory() {
  const chapter = currentChapter();
  const run = profile.run;
  if (!run) return renderHome();
  if (run.complete) {
    finishChapter();
    return renderResults();
  }
  // Keep the solved puzzle under its results sheet; the next scene appears
  // only once the player taps continue.
  if (ui.overlay?.type === 'solved' && ui.puzzle) return renderPuzzle(`Chapter ${chapter.id}`);
  const view = Story.currentView(chapter, run);
  unlockSceneMemory(chapter, view.scene);

  if (view.type === 'puzzle') {
    startPuzzle(`ch${chapter.id}:${view.puzzleId}`, C.puzzles[view.puzzleId], 'story');
    return renderPuzzle(`Chapter ${chapter.id}`);
  }
  const bg = `bg-${esc(view.scene.background)}`;
  if (view.type === 'choice') {
    return `<main class="screen story ${bg}">
      ${topbar(`Chapter ${chapter.id}`)}
      ${choiceStage(view.scene, run)}
      <div class="dialogue choices">
        <p class="prompt-line">${esc(view.prompt)}</p>
        ${view.choices.map((c) => `<button class="choice" data-action="choose" data-id="${esc(c.id)}">${esc(c.text)}</button>`).join('')}
      </div>
    </main>`;
  }
  return `<main class="screen story ${bg}" data-action="advance">
    ${topbar(`Chapter ${chapter.id}`)}
    ${lineHTML(view.line)}
  </main>`;
}

// The character the player is answering: the last one who spoke in the scene.
function choiceStage(scene, run) {
  const line = Story.visibleLines(scene.lines, run).findLast((l) => {
    const ch = C.characters[l.speaker];
    return ch && !ch.narration && !ch.message;
  });
  if (!line) return '<div class="stage"></div>';
  return `<div class="stage"><div class="portrait small mood-${esc(line.mood || 'neutral')}">${portraitSVG(C.characters[line.speaker], line.mood)}</div></div>`;
}

function unlockSceneMemory(chapter, scene) {
  if (!scene?.memory) return;
  const { profile: next, isNew } = Progress.addMemory(profile, scene.memory);
  if (!isNew) return;
  profile = next;
  persist();
  toast(`📸 Memory unlocked: ${chapter.memories[scene.memory].title}`);
}

function collectSecrets(chapter, flags) {
  for (const f of flags) {
    const secret = chapter.secrets?.[f];
    if (!secret) continue;
    const { profile: next, isNew } = Progress.addSecret(profile, f);
    if (isNew) {
      profile = next;
      toast(`🔍 Secret discovered: ${secret.title}`);
    }
  }
}

// --- Puzzle -----------------------------------------------------------------

function shuffledOrder(n) {
  const order = [...Array(n).keys()];
  for (let tries = 0; tries < 5; tries++) {
    for (let i = n - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [order[i], order[j]] = [order[j], order[i]];
    }
    if (order.some((v, i) => v !== i)) break;
  }
  return order;
}

function startPuzzle(key, puzzle, context) {
  if (ui.puzzle?.key === key) return;
  const saved = profile.puzzleProgress?.key === key ? profile.puzzleProgress : null;
  ui.puzzle = {
    key,
    puzzle,
    context,
    state: saved?.state ?? Puzzle.newPuzzleState(),
    secretFlags: saved?.secretFlags ?? [],
    order: shuffledOrder(puzzle.letters.length),
    guess: [],
    feedback: '',
  };
}

function savePuzzleProgress() {
  const p = ui.puzzle;
  profile.puzzleProgress = { key: p.key, state: p.state, secretFlags: p.secretFlags };
  persist();
}

function renderPuzzle(label) {
  const { puzzle, state, order, guess, feedback } = ui.puzzle;
  const words = Puzzle.requiredWords(puzzle).sort((a, b) => a.length - b.length || a.localeCompare(b));
  const rows = words
    .map((w) => {
      const found = state.found.includes(w);
      const slots = Puzzle.slotsFor(puzzle, state, w).map((ch) => `<span class="slot">${esc(ch)}</span>`).join('');
      return `<div class="row${found ? ' found' : ''}" aria-label="${found ? w : `${w.length} letters`}">${slots}</div>`;
    })
    .join('');
  const tiles = order
    .map((i) => {
      const used = guess.includes(i);
      const off = state.disabledTiles.includes(i);
      return `<button class="tile${used ? ' used' : ''}${off ? ' off' : ''}" data-action="tile" data-i="${i}" ${used || off ? 'disabled' : ''}>${esc(puzzle.letters[i])}</button>`;
    })
    .join('');
  const word = guess.map((i) => puzzle.letters[i]).join('');
  return `<main class="screen puzzle">
    ${topbar(label, { hints: true })}
    <blockquote class="prompt">${esc(puzzle.prompt)}</blockquote>
    <p class="clue">${esc(puzzle.hint)}</p>
    <div class="rows">${rows}</div>
    <p class="bonus">${state.bonus.length ? `Bonus words: ${state.bonus.length} ✨` : '&nbsp;'}</p>
    <button class="guess${word ? '' : ' empty'}" data-action="backspace" aria-label="Current word; tap to delete a letter">${word ? esc(word) : 'tap the letters'}</button>
    <p class="feedback" role="status">${esc(feedback) || '&nbsp;'}</p>
    <div class="tiles">${tiles}</div>
    <div class="puzzle-actions">
      <button class="icon-btn" data-action="shuffle" aria-label="Shuffle">⤮</button>
      <button class="icon-btn" data-action="clear" aria-label="Clear">✕</button>
      <button class="btn primary" data-action="submit" ${word ? '' : 'disabled'}>Submit</button>
      <button class="btn hint" data-action="hint">💡 Hint</button>
    </div>
  </main>`;
}

function submitGuess() {
  const p = ui.puzzle;
  const word = p.guess.map((i) => p.puzzle.letters[i]).join('');
  if (!word) return;
  const res = Puzzle.submitGuess(p.puzzle, p.state, word);
  p.state = res.state;
  p.guess = [];
  p.feedback = {
    required: `✓ ${res.word}`,
    bonus: `Bonus word! ${res.word} +${Progress.REWARDS.coinsPerBonusWord} 🪙`,
    repeat: `Already found ${res.word}`,
    'too-short': `Words need ${p.puzzle.minLength ?? 3}+ letters`,
    unknown: `${res.word} isn't one of this scene's words`,
  }[res.result];
  if (res.result === 'unknown' || res.result === 'too-short') ui.shake = true;
  if (res.result === 'bonus') {
    const credit = Progress.creditBonusWord(profile);
    profile = credit.profile;
    if (credit.hintEarned) p.feedback += ' · +1 💡';
  }
  if (res.secret && !p.secretFlags.includes(res.secret.id)) {
    p.secretFlags.push(res.secret.id);
    collectSecrets(currentChapter(), [res.secret.id]);
  }
  afterPuzzleChange();
}

function useHint() {
  const p = ui.puzzle;
  const spent = Progress.spendHint(profile);
  if (!spent) {
    p.feedback = `No hints left. Find ${Progress.REWARDS.bonusWordsPerHint - (profile.bonusTowardHint ?? 0)} more bonus word(s) to earn one.`;
    render();
    return;
  }
  profile = spent;
  const { state, hint } = Puzzle.applyHint(p.puzzle, p.state);
  if (!hint) return;
  p.state = state;
  p.guess = [];
  p.feedback = {
    [Puzzle.HINT_LEVELS.FIRST_LETTER]: 'First letter revealed',
    [Puzzle.HINT_LEVELS.REMOVE_LETTERS]: "Letters you don't need are gone",
    [Puzzle.HINT_LEVELS.REVEAL_WORD]: `Revealed: ${hint.word}`,
  }[hint.level];
  afterPuzzleChange();
}

function afterPuzzleChange() {
  const p = ui.puzzle;
  if (Puzzle.isComplete(p.puzzle, p.state)) {
    finishPuzzle();
  } else {
    savePuzzleProgress();
  }
  render();
}

function finishPuzzle() {
  const p = ui.puzzle;
  const stars = Puzzle.starsFor(p.state);
  const res = Progress.rewardPuzzle(profile, p.state, stars);
  const extra = p.puzzle.reward?.coins ?? 0;
  profile = { ...res.profile, coins: res.profile.coins + extra, puzzleProgress: null };
  ui.overlay = {
    type: 'solved',
    stars,
    coins: res.reward.coins + extra,
    streak: res.reward.streak,
    hintsGained: res.reward.hintsGained,
    words: [...p.state.found, ...p.state.bonus],
    context: p.context,
  };
  if (p.context === 'story') {
    const chapter = currentChapter();
    profile.run = Story.completePuzzle(chapter, profile.run, p.puzzle.id, {
      stars,
      coins: res.reward.coins + extra,
      words: [...p.state.found, ...p.state.bonus],
      flags: p.secretFlags,
    });
  } else {
    const daily = Progress.completeDaily(profile, ui.daily.key);
    profile = daily.profile;
    ui.overlay.daily = daily.reward;
  }
  persist();
}

function renderOverlay() {
  const o = ui.overlay;
  if (!o) return '';
  if (o.type === 'solved') {
    const stars = [1, 2, 3].map((n) => `<span class="${n <= o.stars ? 'on' : ''}">★</span>`).join('');
    const extras = [
      `+${o.coins} 🪙`,
      o.streak > 1 ? `🔥 ${o.streak} in a row` : '',
      o.hintsGained ? `+${o.hintsGained} 💡` : '',
      o.daily ? `+${o.daily.coins} 🪙 +${o.daily.stars} ⭐ daily · 🔥 ${o.daily.streak} day${o.daily.streak === 1 ? '' : 's'}` : '',
    ].filter(Boolean);
    return `<div class="overlay"><div class="sheet pop">
      <h2>Solved</h2>
      <div class="stars">${stars}</div>
      <p class="reward-line">${extras.map(esc).join(' · ')}</p>
      <p class="chips">${o.words.map((w) => `<span class="chip">${esc(w)}</span>`).join('')}</p>
      <button class="btn primary" data-action="overlay-continue">${o.context === 'story' ? 'Continue the story' : 'Done'}</button>
    </div></div>`;
  }
  if (o.type === 'confirm-reset') {
    return `<div class="overlay"><div class="sheet pop">
      <h2>Start over?</h2>
      <p>This erases your choices, words, memories and rewards.</p>
      <button class="btn danger" data-action="reset-confirm">Erase progress</button>
      <button class="btn" data-action="overlay-close">Keep playing</button>
    </div></div>`;
  }
  return '';
}

// --- Results ----------------------------------------------------------------

function finishChapter() {
  const run = profile.run;
  if (run.finished) return;
  const chapter = currentChapter();
  const outcome = Story.pickOutcome(chapter, run);
  const res = Progress.completeChapter(profile, chapter.id, outcome?.id);
  profile = { ...res.profile, lastStats: run.stats };
  profile.run = { ...run, finished: true, chapterReward: res.reward, outcomeId: outcome?.id ?? null };
  persist();
}

function statBar(name, value) {
  return `<div class="stat"><span>${name}</span><div class="bar"><i style="width:${value}%"></i></div><b>${value}</b></div>`;
}

function renderResults() {
  const run = profile.run;
  if (!run?.complete) return renderHome();
  const chapter = currentChapter();
  const outcome = chapter.outcomes.find((o) => o.id === run.outcomeId);
  const reflections = (chapter.reflections || []).filter((r) => Story.checkCondition(r.if, run));
  const puzzles = Object.values(run.puzzles);
  const stars = puzzles.reduce((s, p) => s + p.stars, 0) + (run.chapterReward?.stars ?? 0);
  const coins = puzzles.reduce((s, p) => s + p.coins, 0) + (run.chapterReward?.coins ?? 0);
  const words = puzzles.reduce((s, p) => s + p.words.length, 0);
  const total = C.story.totalChapters;
  return `<main class="screen results">
    ${topbar(`Chapter ${chapter.id} of ${total}`)}
    <p class="eyebrow center">Chapter ${chapter.id} complete</p>
    <h1 class="center">${esc(chapter.title)}</h1>
    ${outcome ? `<section class="card outcome"><h2>${esc(outcome.title)}</h2><p>${esc(outcome.text)}</p>
      ${reflections.length ? `<ul>${reflections.map((r) => `<li>${esc(r.text)}</li>`).join('')}</ul>` : ''}</section>` : ''}
    <section class="card">
      ${statBar('Trust', run.stats.trust)}
      ${statBar('Affection', run.stats.affection)}
      ${statBar('Reputation', run.stats.reputation)}
    </section>
    <section class="card reward-grid">
      <div><b>⭐ ${stars}</b><span>stars</span></div>
      <div><b>🪙 ${coins}</b><span>coins</span></div>
      <div><b>${words}</b><span>words</span></div>
      <div><b>🔥 ${profile.streak}</b><span>streak</span></div>
    </section>
    <section class="card path">
      <h3>Your path</h3>
      <p class="muted">Wonder what would have happened? Rewind to any decision.</p>
      <ol>${run.choices
        .map((c, i) => `<li><div><span>${esc(c.text)}</span><button class="mini" data-action="rewind" data-i="${i}" aria-label="Replay from this choice">↺</button></div></li>`)
        .join('')}</ol>
    </section>
    <p class="muted center">Endings seen: ${profile.endings.length} · Chapter ${chapter.id + 1} is coming soon.</p>
    <div class="actions">
      <button class="btn" data-action="replay">Replay chapter</button>
      <button class="btn primary" data-action="home">Home</button>
    </div>
  </main>`;
}

// --- Profile and memories ---------------------------------------------------

function renderProfile() {
  const run = profile.run;
  const stats = run && !run.complete ? run.stats : profile.lastStats ?? run?.stats;
  const chapterNo = run && !run.complete ? run.chapterId : Math.min(C.story.totalChapters, profile.completedChapters.length || 1);
  const row = (k, v) => `<div class="kv"><span>${k}</span><b>${v}</b></div>`;
  return `<main class="screen profile">
    ${topbar('Your story')}
    <section class="card">
      ${row('Chapter', `${chapterNo}/${C.story.totalChapters}`)}
      ${row('Words Found', profile.wordsFound.length)}
      ${row('Trust', stats?.trust ?? '—')}
      ${row('Affection', stats?.affection ?? '—')}
      ${row('Reputation', stats?.reputation ?? '—')}
      ${row('Secrets Discovered', `${profile.secrets.length}/${C.story.totalSecrets}`)}
    </section>
    <section class="card">
      ${row('⭐ Stars', profile.stars)}
      ${row('🪙 Coins', profile.coins)}
      ${row('💡 Hints', profile.hints)}
      ${row('🔥 Best word streak', profile.bestStreak)}
      ${row('📅 Daily streak', profile.daily.streak)}
      ${row('Endings seen', profile.endings.length)}
    </section>
    <button class="btn link danger" data-action="reset">Reset progress</button>
  </main>`;
}

function renderMemories() {
  const cards = C.chapters.flatMap((ch) =>
    Object.entries(ch.memories || {}).map(([id, m]) =>
      profile.memories.includes(id)
        ? `<figure class="memory bg-${esc(m.background)}"><figcaption><b>${esc(m.title)}</b><span>${esc(m.text)}</span></figcaption></figure>`
        : `<figure class="memory locked"><figcaption><b>???</b><span>Keep playing to remember.</span></figcaption></figure>`,
    ),
  );
  const found = C.chapters.flatMap((ch) =>
    Object.entries(ch.secrets || {})
      .filter(([id]) => profile.secrets.includes(id))
      .map(([, s]) => `<li><b>${esc(s.title)}</b><span>${esc(s.text)}</span></li>`),
  );
  const hidden = C.story.totalSecrets - found.length;
  return `<main class="screen memories">
    ${topbar('Memories')}
    <div class="memory-grid">${cards.join('')}</div>
    <h3>Secrets <small>${found.length}/${C.story.totalSecrets}</small></h3>
    <ul class="secrets">${found.join('')}${hidden > 0 ? `<li class="locked"><b>${hidden} still hidden</b><span>Some words hide more than they say.</span></li>` : ''}</ul>
  </main>`;
}

// --- Daily Word -------------------------------------------------------------

function openDaily() {
  const key = Progress.dateKey();
  if (ui.daily?.key !== key) {
    ui.daily = { key, entry: Progress.dailyEntryFor(C.daily.entries, key), lineIndex: 0, phase: 'lines' };
  }
  go('daily');
}

function renderDaily() {
  const d = ui.daily;
  const e = d.entry;
  if (Progress.dailyDone(profile, d.key) && !ui.overlay) {
    return `<main class="screen story bg-${esc(e.background)}">
      ${topbar('Daily Word')}
      <div class="stage"></div>
      <div class="dialogue narration"><p class="speaker">${esc(e.title)}</p>
        <p class="line">Today's story is told. Come back tomorrow for the next one.</p>
        <p class="muted">🔥 ${profile.daily.streak} day streak</p>
        <button class="btn primary" data-action="home">Home</button></div>
    </main>`;
  }
  if (d.phase === 'puzzle') {
    startPuzzle(`daily:${d.key}`, e.puzzle, 'daily');
    return renderPuzzle('Daily Word');
  }
  return `<main class="screen story bg-${esc(e.background)}" data-action="daily-advance">
    ${topbar('Daily Word')}
    ${lineHTML(e.lines[d.lineIndex])}
  </main>`;
}

// --- Input ------------------------------------------------------------------

const actions = {
  home: () => go('home'),
  profile: () => go('profile'),
  memories: () => go('memories'),
  daily: openDaily,
  play() {
    const chapter = currentChapter();
    if (!profile.run || profile.run.complete) {
      profile.run = Story.newRun(chapter);
      ui.puzzle = null;
      persist();
    }
    go('story');
  },
  replay() {
    profile.run = Story.newRun(currentChapter());
    profile.puzzleProgress = null;
    ui.puzzle = null;
    persist();
    go('story');
  },
  rewind(el) {
    profile.run = Story.restoreCheckpoint(currentChapter(), profile.run, Number(el.dataset.i));
    profile.puzzleProgress = null;
    ui.puzzle = null;
    persist();
    go('story');
  },
  advance() {
    profile.run = Story.advance(currentChapter(), profile.run);
    persist();
    render();
  },
  choose(el) {
    const chapter = currentChapter();
    const { run, choice } = Story.choose(chapter, profile.run, el.dataset.id);
    profile.run = run;
    collectSecrets(chapter, run.flags);
    persist();
    if (choice.echo) toast(choice.echo);
    render();
  },
  'daily-advance'() {
    const d = ui.daily;
    if (d.lineIndex + 1 < d.entry.lines.length) d.lineIndex += 1;
    else d.phase = 'puzzle';
    render();
  },
  tile(el) {
    const i = Number(el.dataset.i);
    const p = ui.puzzle;
    if (!p.guess.includes(i) && !p.state.disabledTiles.includes(i)) {
      p.guess.push(i);
      p.feedback = '';
      render();
    }
  },
  backspace() {
    ui.puzzle.guess.pop();
    render();
  },
  clear() {
    ui.puzzle.guess = [];
    render();
  },
  shuffle() {
    ui.puzzle.order = shuffledOrder(ui.puzzle.puzzle.letters.length);
    render();
  },
  submit: submitGuess,
  hint: useHint,
  'overlay-continue'() {
    const context = ui.overlay?.context;
    ui.overlay = null;
    ui.puzzle = null;
    if (context === 'daily') go('home');
    else render();
  },
  'overlay-close'() {
    ui.overlay = null;
    render();
  },
  reset() {
    ui.overlay = { type: 'confirm-reset' };
    render();
  },
  'reset-confirm'() {
    profile = Progress.reset(storage);
    ui.puzzle = null;
    ui.daily = null;
    go('home');
  },
};

function onClick(e) {
  const el = e.target.closest('[data-action]');
  if (!el || el.disabled) return;
  // While an overlay is up, only its own buttons respond.
  if (ui.overlay && !el.closest('.overlay')) return;
  actions[el.dataset.action]?.(el);
}

function onKey(e) {
  if (e.metaKey || e.ctrlKey || e.altKey || ui.overlay) return;
  const inPuzzle = app.querySelector('.screen.puzzle');
  if (inPuzzle) {
    const p = ui.puzzle;
    if (e.key === 'Enter') return submitGuess();
    if (e.key === 'Backspace') return actions.backspace();
    const letter = e.key.length === 1 ? e.key.toUpperCase() : '';
    const i = p.order.find((idx) => p.puzzle.letters[idx] === letter && !p.guess.includes(idx) && !p.state.disabledTiles.includes(idx));
    if (i !== undefined) {
      p.guess.push(i);
      p.feedback = '';
      render();
    }
    return;
  }
  if (e.key === ' ' || e.key === 'Enter') {
    const tappable = app.querySelector('main[data-action]');
    if (tappable) {
      e.preventDefault();
      actions[tappable.dataset.action]?.(tappable);
    }
  }
}

boot();
