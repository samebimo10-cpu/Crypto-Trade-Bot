// Expressive character portraits drawn as inline SVG, so the MVP needs no art
// assets. Each character's look comes from characters.json; the expression
// comes from the dialogue line's `mood`.

const MOUTHS = {
  neutral: '<path d="M43 71 Q50 73 57 71" />',
  smile: '<path d="M41 68 Q50 78 59 68" />',
  sad: '<path d="M42 74 Q50 67 58 74" />',
  angry: '<path d="M42 72 L58 71" />',
  surprised: '<ellipse cx="50" cy="71" rx="4" ry="5" fill="#5a2a2a" stroke="none" />',
  worried: '<path d="M42 72 Q46 69 50 72 Q54 75 58 71" />',
};

const BROWS = {
  neutral: ['M33 47 L43 46', 'M57 46 L67 47'],
  smile: ['M33 46 Q38 43 43 45', 'M57 45 Q62 43 67 46'],
  sad: ['M33 46 L43 43', 'M57 43 L67 46'],
  angry: ['M33 43 L43 47', 'M57 47 L67 43'],
  surprised: ['M33 42 Q38 39 43 41', 'M57 41 Q62 39 67 42'],
  worried: ['M33 46 L43 42', 'M57 42 L67 46'],
};

const HAIR = {
  short: (c) => `<path d="M24 50 Q22 20 50 18 Q78 20 76 50 Q72 32 50 30 Q28 32 24 50Z" fill="${c}"/>`,
  long: (c) =>
    `<path d="M22 92 Q16 40 30 24 Q50 8 70 24 Q84 40 78 92 L70 92 Q74 52 66 36 Q50 30 34 36 Q26 52 30 92Z" fill="${c}"/>` +
    `<path d="M28 44 Q34 24 54 24 Q70 26 72 44 Q60 32 42 34Z" fill="${c}"/>`,
  bun: (c) => `<circle cx="50" cy="16" r="9" fill="${c}"/><path d="M24 48 Q24 22 50 22 Q76 22 76 48 Q66 30 50 30 Q34 30 24 48Z" fill="${c}"/>`,
  messy: (c) => `<path d="M23 50 L26 28 L32 32 L36 18 L44 26 L50 14 L56 26 L64 18 L68 32 L74 28 L77 50 Q70 32 50 31 Q30 32 23 50Z" fill="${c}"/>`,
  neat: (c) => `<path d="M24 48 Q24 20 52 20 Q78 22 76 46 Q74 34 60 32 L36 32 Q28 36 24 48Z" fill="${c}"/>`,
  bald: (c) => `<path d="M24 52 Q24 44 28 40 L28 54Z M76 52 Q76 44 72 40 L72 54Z" fill="${c}"/>`,
};

export function portraitSVG(character, mood = 'neutral') {
  if (!character || character.narration || character.message) return '';
  const m = MOUTHS[mood] ? mood : 'neutral';
  const [bl, br] = BROWS[m];
  const hair = (HAIR[character.hairStyle] || HAIR.short)(character.hair);
  const eyesOpen = m === 'surprised' ? 3.4 : 2.6;
  const glasses = character.glasses
    ? '<g fill="none" stroke="#222" stroke-width="1.6"><circle cx="38" cy="54" r="7"/><circle cx="62" cy="54" r="7"/><path d="M45 54 L55 54"/></g>'
    : '';
  const beard = character.beard
    ? `<path d="M30 62 Q32 86 50 88 Q68 86 70 62 Q64 76 50 77 Q36 76 30 62Z" fill="${character.hair}"/>`
    : '';
  return `
<svg class="portrait-svg" viewBox="0 0 100 100" role="img" aria-label="${character.name}, ${m}">
  <circle cx="50" cy="50" r="49" fill="${character.accent}" opacity="0.25"/>
  <path d="M18 100 Q22 82 50 82 Q78 82 82 100Z" fill="${character.accent}"/>
  <ellipse cx="50" cy="54" rx="26" ry="29" fill="${character.skin}"/>
  ${hair}
  <ellipse cx="38" cy="54" rx="2.6" ry="${eyesOpen}" fill="#2a1d1a"/>
  <ellipse cx="62" cy="54" rx="2.6" ry="${eyesOpen}" fill="#2a1d1a"/>
  <g fill="none" stroke="#2a1d1a" stroke-width="2" stroke-linecap="round"><path d="${bl}"/><path d="${br}"/></g>
  ${beard}
  <g fill="none" stroke="#5a2a2a" stroke-width="2.2" stroke-linecap="round">${MOUTHS[m]}</g>
  ${glasses}
</svg>`;
}
