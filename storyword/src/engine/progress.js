// Player profile and rewards. The profile persists across chapters and
// replays; a run (see story.js) is one playthrough of one chapter.
//
// Resources are deliberately few: stars, coins, hint tokens, plus the
// collectible memories and the word streak.

export const SAVE_VERSION = 2;

export const REWARDS = {
  coinsPerWord: 1,
  coinsPerBonusWord: 2,
  coinsPerStreak: 2, // per consecutive clean puzzle, capped below
  maxStreakBonus: 10,
  chapterCoins: 20,
  chapterStars: 3,
  startingHints: 3,
  maxHints: 9,
  hintsPerPuzzle: 1, // hints recover by playing, not by paying
  bonusWordsPerHint: 3, // ...and by finding bonus words, so a player is never stuck
  dailyCoins: 15,
  dailyStars: 1,
};

export function newProfile() {
  return {
    version: SAVE_VERSION,
    coins: 0,
    stars: 0,
    hints: REWARDS.startingHints,
    bonusTowardHint: 0, // bonus words found toward the next free hint
    wordsFound: [], // unique words ever found
    totalWords: 0, // every accepted word, including repeats across replays
    streak: 0, // consecutive puzzles solved without a reveal
    bestStreak: 0,
    memories: [], // memory ids
    secrets: [], // secret ids
    completedChapters: [], // chapter ids
    endings: [], // outcome ids seen
    daily: { lastDate: null, streak: 0, completed: [] },
    run: null, // the chapter in progress
  };
}

// Every few bonus words earn a hint, so a player who has run out can always
// earn one by exploring the letters.
export function creditBonusWord(profile) {
  const progress = (profile.bonusTowardHint ?? 0) + 1;
  if (progress < REWARDS.bonusWordsPerHint) return { profile: { ...profile, bonusTowardHint: progress }, hintEarned: false };
  return {
    profile: { ...profile, bonusTowardHint: 0, hints: Math.min(REWARDS.maxHints, profile.hints + 1) },
    hintEarned: true,
  };
}

export function spendHint(profile) {
  if (profile.hints <= 0) return null;
  return { ...profile, hints: profile.hints - 1 };
}

// Fold a solved puzzle into the profile. Returns { profile, reward } where
// reward describes what to show the player.
export function rewardPuzzle(profile, puzzleState, stars) {
  const words = [...puzzleState.found, ...puzzleState.bonus];
  const clean = puzzleState.revealed.length === 0;
  const streak = clean ? profile.streak + 1 : 0;
  const streakBonus = clean ? Math.min(REWARDS.maxStreakBonus, (streak - 1) * REWARDS.coinsPerStreak) : 0;
  const coins =
    puzzleState.found.length * REWARDS.coinsPerWord +
    puzzleState.bonus.length * REWARDS.coinsPerBonusWord +
    streakBonus;
  const hints = Math.min(REWARDS.maxHints, profile.hints + REWARDS.hintsPerPuzzle);
  return {
    profile: {
      ...profile,
      coins: profile.coins + coins,
      stars: profile.stars + stars,
      hints,
      wordsFound: [...new Set([...profile.wordsFound, ...words])],
      totalWords: profile.totalWords + words.length,
      streak,
      bestStreak: Math.max(profile.bestStreak, streak),
    },
    reward: { coins, stars, streak, streakBonus, hintsGained: hints - profile.hints },
  };
}

export function addSecret(profile, secretId) {
  if (profile.secrets.includes(secretId)) return { profile, isNew: false };
  return { profile: { ...profile, secrets: [...profile.secrets, secretId] }, isNew: true };
}

export function addMemory(profile, memoryId) {
  if (profile.memories.includes(memoryId)) return { profile, isNew: false };
  return { profile: { ...profile, memories: [...profile.memories, memoryId] }, isNew: true };
}

// Chapter completion pays out once per chapter; replays still record new
// endings and memories but don't farm currency.
export function completeChapter(profile, chapterId, outcomeId) {
  const first = !profile.completedChapters.includes(chapterId);
  return {
    profile: {
      ...profile,
      coins: profile.coins + (first ? REWARDS.chapterCoins : 0),
      stars: profile.stars + (first ? REWARDS.chapterStars : 0),
      completedChapters: first ? [...profile.completedChapters, chapterId] : profile.completedChapters,
      endings: outcomeId && !profile.endings.includes(outcomeId) ? [...profile.endings, outcomeId] : profile.endings,
    },
    reward: first ? { coins: REWARDS.chapterCoins, stars: REWARDS.chapterStars } : { coins: 0, stars: 0 },
  };
}

// --- Daily Word -----------------------------------------------------------

export function dateKey(date = new Date()) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function dayNumber(key) {
  const [y, m, d] = key.split('-').map(Number);
  return Math.floor(Date.UTC(y, m - 1, d) / 86400000);
}

// Each calendar day maps to one entry, cycling through the list.
export function dailyEntryFor(entries, key) {
  return entries[((dayNumber(key) % entries.length) + entries.length) % entries.length];
}

export function dailyDone(profile, key) {
  return profile.daily.lastDate === key;
}

export function completeDaily(profile, key) {
  if (dailyDone(profile, key)) return { profile, reward: null };
  const consecutive = profile.daily.lastDate && dayNumber(key) - dayNumber(profile.daily.lastDate) === 1;
  const streak = consecutive ? profile.daily.streak + 1 : 1;
  return {
    profile: {
      ...profile,
      coins: profile.coins + REWARDS.dailyCoins,
      stars: profile.stars + REWARDS.dailyStars,
      daily: { lastDate: key, streak, completed: [...profile.daily.completed, key].slice(-60) },
    },
    reward: { coins: REWARDS.dailyCoins, stars: REWARDS.dailyStars, streak },
  };
}

// --- Persistence ------------------------------------------------------------

const KEY = 'storyword.save';

export function load(storage) {
  try {
    const raw = storage?.getItem(KEY);
    if (!raw) return newProfile();
    const data = JSON.parse(raw);
    if (data.version !== SAVE_VERSION) return newProfile();
    return { ...newProfile(), ...data, daily: { ...newProfile().daily, ...data.daily } };
  } catch {
    return newProfile();
  }
}

export function save(storage, profile) {
  try {
    storage?.setItem(KEY, JSON.stringify(profile));
    return true;
  } catch {
    return false;
  }
}

export function reset(storage) {
  try {
    storage?.removeItem(KEY);
  } catch {
    /* storage unavailable: nothing to clear */
  }
  return newProfile();
}
