// Word puzzle engine. A puzzle gives the player a set of letter tiles; they
// complete it by finding every required word. Bonus words are also accepted
// and rewarded, and a puzzle can hide secret words that unlock story secrets.

export const HINT_LEVELS = {
  FIRST_LETTER: 1, // reveal the first letter of the current target word
  REMOVE_LETTERS: 2, // disable tiles the target word does not use
  REVEAL_WORD: 3, // solve the target word outright
};

export function normalize(word) {
  return String(word).trim().toUpperCase();
}

// True when `word` can be spelled from `letters`, each tile used at most once.
export function canBuild(word, letters) {
  const pool = countLetters(letters);
  for (const ch of normalize(word)) {
    if (!pool[ch]) return false;
    pool[ch] -= 1;
  }
  return true;
}

function countLetters(letters) {
  const pool = {};
  for (const l of letters) {
    const ch = normalize(l);
    pool[ch] = (pool[ch] || 0) + 1;
  }
  return pool;
}

export function requiredWords(puzzle) {
  return puzzle.requiredWords.map(normalize);
}

export function bonusWords(puzzle) {
  return (puzzle.bonusWords || []).map(normalize);
}

export function secretFor(puzzle, word) {
  return (puzzle.secrets || []).find((s) => normalize(s.word) === word) ?? null;
}

export function newPuzzleState() {
  return {
    found: [], // required words found, in order
    bonus: [], // bonus words found
    revealed: [], // required words solved by the reveal hint
    hintLevel: 0, // hints used on the current target word
    hintsUsed: 0, // hints used on the whole puzzle
    disabledTiles: [], // tile indices removed by the REMOVE_LETTERS hint
    mistakes: 0,
  };
}

// The required word hints currently apply to: the shortest one not yet found,
// so hints help with the easiest remaining word first.
export function currentTarget(puzzle, state) {
  const remaining = requiredWords(puzzle).filter((w) => !state.found.includes(w));
  if (!remaining.length) return null;
  return remaining.reduce((a, b) => (b.length < a.length ? b : a));
}

export function isComplete(puzzle, state) {
  return requiredWords(puzzle).every((w) => state.found.includes(w));
}

// Submit a guess. Returns { state, result, word, secret? } where result is
//   'required' | 'bonus' | 'repeat' | 'too-short' | 'unknown'
export function submitGuess(puzzle, state, guess) {
  const word = normalize(guess);
  const minLength = puzzle.minLength ?? 3;
  if (word.length < minLength) return { state, result: 'too-short', word };
  if (state.found.includes(word) || state.bonus.includes(word)) {
    return { state, result: 'repeat', word };
  }
  if (!canBuild(word, puzzle.letters)) {
    return { state: { ...state, mistakes: state.mistakes + 1 }, result: 'unknown', word };
  }
  const secret = secretFor(puzzle, word);
  if (requiredWords(puzzle).includes(word)) {
    const wasTarget = currentTarget(puzzle, state) === word;
    const next = { ...state, found: [...state.found, word] };
    // Finding the hinted word moves hints on to a fresh target.
    if (wasTarget) Object.assign(next, { hintLevel: 0, disabledTiles: [] });
    return { state: next, result: 'required', word, secret };
  }
  if (bonusWords(puzzle).includes(word)) {
    return { state: { ...state, bonus: [...state.bonus, word] }, result: 'bonus', word, secret };
  }
  return { state: { ...state, mistakes: state.mistakes + 1 }, result: 'unknown', word };
}

// Apply the next hint level to the current target. The caller is responsible
// for charging the player's hint tokens.
export function applyHint(puzzle, state) {
  const target = currentTarget(puzzle, state);
  if (!target) return { state, hint: null };
  const level = state.hintLevel + 1;
  let next = { ...state, hintLevel: level, hintsUsed: state.hintsUsed + 1 };

  if (level === HINT_LEVELS.REMOVE_LETTERS) {
    next.disabledTiles = tilesNotIn(puzzle.letters, target);
  } else if (level >= HINT_LEVELS.REVEAL_WORD) {
    next = {
      ...next,
      found: [...next.found, target],
      revealed: [...next.revealed, target],
      hintLevel: 0,
      disabledTiles: [],
    };
  }
  return { state: next, hint: { level: Math.min(level, HINT_LEVELS.REVEAL_WORD), word: target } };
}

// Indices of tiles the target word does not need. Duplicate letters are
// handled: with tiles A,A,T and target "AT", one A is still removable.
export function tilesNotIn(letters, target) {
  const need = countLetters(target);
  const out = [];
  letters.forEach((l, i) => {
    const ch = normalize(l);
    if (need[ch]) need[ch] -= 1;
    else out.push(i);
  });
  return out;
}

// 3 stars with no hints, 2 with hints but no reveals, 1 if any word was revealed.
export function starsFor(state) {
  if (state.revealed.length) return 1;
  if (state.hintsUsed) return 2;
  return 3;
}

// The letter shown in each slot of a required word's row: the word itself
// once found, the first letter if it's the hinted target, otherwise blanks.
export function slotsFor(puzzle, state, word) {
  if (state.found.includes(word)) return word.split('');
  const showFirst = currentTarget(puzzle, state) === word && state.hintLevel >= HINT_LEVELS.FIRST_LETTER;
  return word.split('').map((ch, i) => (showFirst && i === 0 ? ch : ''));
}
