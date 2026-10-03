// Illustrated, animated scene backgrounds drawn as inline SVG: no image files,
// so every location works offline. Each scene is a portrait 400x700 canvas
// (scaled to cover the screen); landmarks sit in the upper two-thirds because
// the dialogue box covers the bottom. Animated parts carry CSS classes
// (.drift .shimmer .flicker .rain .snow .palm .bob .jet .twinkle .flash .fly).

let uid = 0;

// Deterministic pseudo-random numbers, so a scene looks the same every time.
function rng(seed) {
  let s = seed >>> 0;
  return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
}

function sky(id, stops) {
  const s = stops.map(([o, c]) => `<stop offset="${o}" stop-color="${c}"/>`).join('');
  return `<defs><linearGradient id="sky${id}" x1="0" y1="0" x2="0" y2="1">${s}</linearGradient></defs><rect width="400" height="700" fill="url(#sky${id})"/>`;
}

const sun = (x, y, r, c, glow = c) =>
  `<circle cx="${x}" cy="${y}" r="${r * 2.6}" fill="${glow}" opacity="0.18"/><circle cx="${x}" cy="${y}" r="${r * 1.6}" fill="${glow}" opacity="0.25"/><circle cx="${x}" cy="${y}" r="${r}" fill="${c}"/>`;

const moon = (x, y) =>
  `<circle cx="${x}" cy="${y}" r="60" fill="#fff8d8" opacity="0.08"/><circle cx="${x}" cy="${y}" r="22" fill="#fff6d6"/><circle cx="${x + 9}" cy="${y - 6}" r="19" fill="#fffbe8" opacity="0.6"/>`;

function stars(n, seed, maxY = 360) {
  const r = rng(seed);
  let out = '';
  for (let i = 0; i < n; i++) {
    out += `<circle class="twinkle" style="animation-delay:${(r() * 4).toFixed(2)}s" cx="${(r() * 400).toFixed(1)}" cy="${(r() * maxY).toFixed(1)}" r="${(0.6 + r() * 1.4).toFixed(2)}" fill="#fff"/>`;
  }
  return out;
}

function cloud(x, y, s, c = '#fff', o = 0.85, speed = 60) {
  return `<g class="drift" style="animation-duration:${speed}s"><g transform="translate(${x} ${y}) scale(${s})" fill="${c}" opacity="${o}">
    <ellipse cx="0" cy="0" rx="40" ry="16"/><ellipse cx="-24" cy="4" rx="24" ry="12"/><ellipse cx="22" cy="-8" rx="26" ry="18"/><ellipse cx="40" cy="4" rx="22" ry="11"/></g></g>`;
}

function water(y, top, bottom, shimmer = '#ffffff', id = ++uid) {
  let lines = '';
  const r = rng(y * 7 + 3);
  for (let i = 0; i < 26; i++) {
    const yy = y + 12 + r() * (700 - y - 20);
    const x = r() * 380;
    lines += `<rect class="shimmer" style="animation-delay:${(r() * 3).toFixed(2)}s" x="${x.toFixed(0)}" y="${yy.toFixed(0)}" width="${(14 + r() * 40).toFixed(0)}" height="2" rx="1" fill="${shimmer}" opacity="0.35"/>`;
  }
  return `<defs><linearGradient id="w${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${top}"/><stop offset="1" stop-color="${bottom}"/></linearGradient></defs>
    <rect y="${y}" width="400" height="${700 - y}" fill="url(#w${id})"/>${lines}`;
}

function palm(x, y, s = 1, c = '#1d5a3a', trunk = '#6b4a2b', delay = 0) {
  const leaves = [-70, -35, -5, 25, 60, 95, 140]
    .map((a) => `<path d="M0 0 Q30 -14 64 6 Q30 -2 0 0Z" fill="${c}" transform="rotate(${a})"/>`)
    .join('');
  return `<g transform="translate(${x} ${y}) scale(${s})">
    <path d="M0 0 Q-10 -90 6 -180" stroke="${trunk}" stroke-width="9" fill="none" stroke-linecap="round"/>
    <g class="palm" style="animation-delay:${delay}s" transform="translate(6 -180)">${leaves}<circle r="6" fill="#5a3a1a"/></g></g>`;
}

function skyline(seed, baseY, color, lit, opts = {}) {
  const r = rng(seed);
  let x = opts.x0 ?? -10;
  let out = '';
  while (x < 410) {
    const w = 18 + r() * (opts.maxW ?? 34);
    const h = (opts.minH ?? 40) + r() * (opts.maxH ?? 150);
    out += `<rect x="${x.toFixed(0)}" y="${(baseY - h).toFixed(0)}" width="${w.toFixed(0)}" height="${h.toFixed(0)}" fill="${color}"/>`;
    if (lit) {
      for (let wy = baseY - h + 8; wy < baseY - 6; wy += 10) {
        for (let wx = x + 4; wx < x + w - 5; wx += 7) {
          if (r() < (opts.density ?? 0.35)) out += `<rect x="${wx.toFixed(0)}" y="${wy.toFixed(0)}" width="3" height="4" fill="${lit}" opacity="${(0.5 + r() * 0.5).toFixed(2)}"/>`;
        }
      }
    }
    x += w + (opts.gap ?? 2);
  }
  return out;
}

function rainLines(n = 70, color = '#cfe3ff') {
  const r = rng(42);
  let out = '';
  for (let i = 0; i < n; i++) {
    const x = r() * 420;
    const y = r() * 700;
    out += `<line class="rain" style="animation-delay:${(r() * 1.4).toFixed(2)}s" x1="${x.toFixed(0)}" y1="${y.toFixed(0)}" x2="${(x - 6).toFixed(0)}" y2="${(y + 22).toFixed(0)}" stroke="${color}" stroke-width="1.3" opacity="0.45"/>`;
  }
  return out;
}

function snow(n = 70, big = false) {
  const r = rng(7);
  let out = '';
  for (let i = 0; i < n; i++) {
    out += `<circle class="snow" style="animation-delay:${(r() * 8).toFixed(2)}s;animation-duration:${(6 + r() * 6).toFixed(1)}s" cx="${(r() * 400).toFixed(0)}" cy="${(r() * 700).toFixed(0)}" r="${(big ? 1.6 : 1) + r() * (big ? 2.6 : 1.8)}" fill="#fff" opacity="${(0.6 + r() * 0.4).toFixed(2)}"/>`;
  }
  return out;
}

function birds(x, y, n = 4, c = '#2b2233') {
  let out = `<g class="fly" transform="translate(${x} ${y})">`;
  for (let i = 0; i < n; i++) out += `<path d="M${i * 22} ${(i % 2) * 10} q6 -6 12 0 q6 -6 12 0" stroke="${c}" stroke-width="2" fill="none"/>`;
  return out + '</g>';
}

function boulders(seed, baseY, colors) {
  // Jos Plateau granite: piles of rounded, balanced rocks.
  const r = rng(seed);
  let out = '';
  for (let pile = 0; pile < 4; pile++) {
    const px = 30 + pile * 105 + r() * 20;
    let y = baseY;
    let w = 70 + r() * 30;
    for (let k = 0; k < 3; k++) {
      const c = colors[(pile + k) % colors.length];
      out += `<ellipse cx="${(px + (r() - 0.5) * 12).toFixed(0)}" cy="${(y - w * 0.32).toFixed(0)}" rx="${(w / 2).toFixed(0)}" ry="${(w * 0.34).toFixed(0)}" fill="${c}"/>`;
      out += `<ellipse cx="${(px - w * 0.12).toFixed(0)}" cy="${(y - w * 0.45).toFixed(0)}" rx="${(w / 5).toFixed(0)}" ry="${(w / 12).toFixed(0)}" fill="#fff" opacity="0.12"/>`;
      y -= w * 0.58;
      w *= 0.62 + r() * 0.12;
    }
  }
  return out;
}

function flare(x, y, s = 1) {
  return `<g transform="translate(${x} ${y}) scale(${s})"><rect x="-2" y="0" width="4" height="60" fill="#2a2a2a"/>
    <g class="flicker"><path d="M0 2 Q-10 -18 0 -38 Q10 -18 0 2Z" fill="#ff8a1e"/><path d="M0 0 Q-5 -12 0 -24 Q5 -12 0 0Z" fill="#ffe14d"/></g>
    <circle cx="0" cy="-16" r="30" fill="#ff8a1e" opacity="0.15" class="flicker"/></g>`;
}

function danfo(x, y, s = 1) {
  return `<g class="bob" transform="translate(${x} ${y}) scale(${s})"><rect x="0" y="0" width="54" height="24" rx="5" fill="#f7c600"/>
    <rect x="0" y="12" width="54" height="3" fill="#111"/><rect x="5" y="3" width="10" height="7" fill="#1d3557"/><rect x="18" y="3" width="10" height="7" fill="#1d3557"/><rect x="31" y="3" width="10" height="7" fill="#1d3557"/><rect x="44" y="3" width="8" height="7" fill="#1d3557"/>
    <circle cx="12" cy="25" r="5" fill="#222"/><circle cx="42" cy="25" r="5" fill="#222"/></g>`;
}

function canoe(x, y, s = 1, c = '#5b3a1e') {
  return `<g class="bob" transform="translate(${x} ${y}) scale(${s})"><path d="M-50 0 Q0 18 50 0 Q0 8 -50 0Z" fill="${c}"/>
    <path d="M-6 -2 L-2 -34 L4 -2Z" fill="#1a1a1a"/><circle cx="-2" cy="-38" r="5" fill="#1a1a1a"/><path d="M8 -26 L30 6" stroke="#3a2a1a" stroke-width="2.5"/></g>`;
}

function house(x, y, w, h, wall, roof, door = '#5a3a2a') {
  return `<g><rect x="${x}" y="${y - h}" width="${w}" height="${h}" fill="${wall}"/><path d="M${x - 6} ${y - h} L${x + w / 2} ${y - h - w * 0.45} L${x + w + 6} ${y - h}Z" fill="${roof}"/>
    <rect x="${x + w * 0.4}" y="${y - h * 0.55}" width="${w * 0.2}" height="${h * 0.55}" fill="${door}"/><rect x="${x + w * 0.12}" y="${y - h * 0.75}" width="${w * 0.18}" height="${h * 0.22}" fill="#fff6c8" opacity="0.85"/></g>`;
}

function mountains(base, peaks, color, snowCap) {
  let d = `M-10 ${base}`;
  for (const [x, y] of peaks) d += ` L${x} ${y}`;
  d += ` L410 ${base} Z`;
  let caps = '';
  if (snowCap) {
    for (const [x, y] of peaks) {
      if (y < base - 120) caps += `<path d="M${x - 22} ${y + 34} L${x} ${y} L${x + 22} ${y + 34} L${x + 10} ${y + 28} L${x} ${y + 38} L${x - 10} ${y + 28}Z" fill="${snowCap}"/>`;
    }
  }
  return `<path d="${d}" fill="${color}"/>${caps}`;
}

function pines(seed, baseY, n, color) {
  const r = rng(seed);
  let out = '';
  for (let i = 0; i < n; i++) {
    const x = r() * 400;
    const h = 30 + r() * 40;
    const y = baseY + r() * 30;
    out += `<path d="M${x} ${y - h} L${x - h * 0.3} ${y} L${x + h * 0.3} ${y}Z" fill="${color}"/>`;
  }
  return out;
}

function stalls(seed, baseY) {
  const r = rng(seed);
  const colors = ['#e63946', '#f4a261', '#2a9d8f', '#e9c46a', '#8e44ad', '#ff6b9a', '#3a86ff'];
  let out = '';
  for (let i = 0; i < 6; i++) {
    const x = i * 70 - 10;
    const c1 = colors[(i * 3) % colors.length];
    const c2 = colors[(i * 3 + 2) % colors.length];
    out += `<rect x="${x + 6}" y="${baseY - 50}" width="56" height="50" fill="#6b4a2b"/>
      <path d="M${x} ${baseY - 50} L${x + 34} ${baseY - 78} L${x + 68} ${baseY - 50}Z" fill="${c1}"/>
      <path d="M${x + 12} ${baseY - 50} L${x + 34} ${baseY - 78} L${x + 22} ${baseY - 50}Z M${x + 46} ${baseY - 50} L${x + 34} ${baseY - 78} L${x + 56} ${baseY - 50}Z" fill="${c2}"/>`;
    for (let k = 0; k < 5; k++) {
      out += `<circle cx="${x + 14 + k * 10}" cy="${baseY - 8 - (k % 2) * 6}" r="5" fill="${colors[Math.floor(r() * colors.length)]}"/>`;
    }
  }
  return out;
}

function bunting(y, seed) {
  const r = rng(seed);
  const colors = ['#e63946', '#f4a261', '#2a9d8f', '#e9c46a', '#3a86ff', '#ff6b9a'];
  let out = `<path d="M-10 ${y} Q200 ${y + 30} 410 ${y}" stroke="#333" stroke-width="1" fill="none"/>`;
  for (let i = 0; i < 18; i++) {
    const x = i * 24;
    const yy = y + Math.sin((i / 17) * Math.PI) * 15;
    out += `<path class="palm" style="animation-delay:${(r() * 2).toFixed(1)}s;transform-origin:${x + 6}px ${yy}px" d="M${x} ${yy} L${x + 12} ${yy} L${x + 6} ${yy + 14}Z" fill="${colors[i % colors.length]}"/>`;
  }
  return out;
}

function lanterns(y, seed, n = 9) {
  const r = rng(seed);
  let out = '';
  for (let i = 0; i < n; i++) {
    const x = 20 + i * (360 / (n - 1));
    const yy = y + Math.sin(i) * 12;
    out += `<g class="flicker" style="animation-delay:${(r() * 2).toFixed(1)}s"><circle cx="${x}" cy="${yy}" r="16" fill="#ffd27a" opacity="0.18"/><circle cx="${x}" cy="${yy}" r="6" fill="#ffd27a"/></g>`;
  }
  return out;
}

function fireflies(n, seed) {
  const r = rng(seed);
  let out = '';
  for (let i = 0; i < n; i++) {
    out += `<circle class="firefly" style="animation-delay:${(r() * 6).toFixed(1)}s;animation-duration:${(5 + r() * 5).toFixed(1)}s" cx="${(r() * 400).toFixed(0)}" cy="${(300 + r() * 300).toFixed(0)}" r="2" fill="#f9f871"/>`;
  }
  return out;
}

// --- Locations ----------------------------------------------------------------

const SCENES = {
  // Port Harcourt, night of the storm: the river, the Okoro mansion, gas flares.
  ph_night: () => `${sky('phn', [[0, '#0b0f24'], [0.55, '#2a2350'], [1, '#4b2b4a']])}
    <rect class="flash" style="opacity:0" width="400" height="700" fill="#e8f0ff"/>
    ${cloud(60, 90, 1.8, '#1b1f3a', 0.9, 40)}${cloud(260, 140, 2.2, '#22264a', 0.9, 55)}
    ${flare(60, 300, 0.8)}${flare(330, 290, 0.6)}
    <path d="M0 330 L400 330 L400 360 L0 360Z" fill="#141228"/>
    <g><rect x="120" y="220" width="170" height="120" fill="#1e1b33"/><path d="M110 222 L205 170 L300 222Z" fill="#2c2546"/>
      ${[0, 1, 2, 3].map((i) => `<rect x="${136 + i * 38}" y="245" width="16" height="22" fill="#ffcf6b" opacity="0.85"/><rect x="${136 + i * 38}" y="290" width="16" height="22" fill="#ffcf6b" opacity="${i === 2 ? 0.95 : 0.4}"/>`).join('')}
      <rect x="186" y="300" width="38" height="40" fill="#120f22"/></g>
    ${palm(70, 360, 0.9, '#0f2a24', '#2a1d14')}${palm(345, 362, 1.05, '#0f2a24', '#2a1d14', 1)}
    ${water(360, '#1d1b3c', '#08070f', '#ffcf6b')}
    ${rainLines(90)}`,

  // Port Harcourt by day: Garden City waterfront, ships on the Bonny River.
  ph_day: () => `${sky('phd', [[0, '#3fa7e0'], [0.6, '#9fd8f2'], [1, '#e9f7fb']])}
    ${sun(320, 110, 28, '#fff3b0', '#ffe066')}${cloud(80, 120, 1.2)}${cloud(250, 200, 0.9, '#fff', 0.7, 80)}
    ${flare(40, 335, 0.55)}${flare(370, 330, 0.5)}
    ${skyline(11, 380, '#6b7d99', null, { maxH: 90, maxW: 26 })}
    <rect y="378" width="400" height="12" fill="#3d6e3a"/>
    <g class="bob"><path d="M210 420 L330 420 L318 440 L222 440Z" fill="#c0392b"/><rect x="240" y="398" width="50" height="22" fill="#ecf0f1"/><rect x="262" y="384" width="8" height="14" fill="#2c3e50"/></g>
    ${water(388, '#2e8bb8', '#145a7a')}
    ${canoe(90, 470, 0.8)}
    ${palm(30, 400, 1.1)}${palm(380, 405, 0.95, '#1d5a3a', '#6b4a2b', 1.2)}`,

  // The mansion garden at midnight: fountain, palms, fireflies, lit windows.
  ph_garden: () => `${sky('pg', [[0, '#071022'], [0.6, '#16264a'], [1, '#1d3a3a']])}
    ${stars(60, 17, 260)}${moon(80, 100)}
    <rect x="200" y="160" width="200" height="200" fill="#141a30"/>${[0, 1, 2, 3].map((i) => `<rect x="${220 + i * 44}" y="200" width="18" height="26" fill="#ffcf6b" opacity="${i === 1 ? 0.95 : 0.5}"/>`).join('')}
    <rect y="350" width="400" height="350" fill="#0f2a22"/>
    <ellipse cx="200" cy="470" rx="90" ry="22" fill="#1e3d4a"/><ellipse class="shimmer" cx="200" cy="466" rx="70" ry="12" fill="#5fb0c8" opacity="0.4"/>
    <g class="jet"><path d="M196 468 Q194 420 200 392 Q206 420 204 468Z" fill="#cfe9ff" opacity="0.7"/></g>
    ${[60, 120, 280, 340].map((x) => `<circle cx="${x}" cy="400" r="${22 + (x % 3) * 4}" fill="#1a4a30"/><circle cx="${x + 6}" cy="394" r="4" fill="#ff6b9a"/><circle cx="${x - 8}" cy="404" r="4" fill="#ffd166"/>`).join('')}
    ${palm(30, 420, 1, '#0d241a', '#1a1410')}${palm(380, 430, 1.1, '#0d241a', '#1a1410', 1)}
    ${fireflies(30, 13)}`,

  // Inside the Okoro mansion: gold hall, chandelier, funeral flowers.
  mansion: () => `${sky('mh', [[0, '#2b1a12'], [0.5, '#5a3a1e'], [1, '#2a1a10']])}
    ${[40, 140, 260, 360].map((x) => `<rect x="${x - 14}" y="120" width="28" height="420" fill="#c9a227" opacity="0.85"/><rect x="${x - 20}" y="110" width="40" height="14" fill="#e8c56a"/>`).join('')}
    <rect x="150" y="150" width="100" height="130" fill="#3b2412" stroke="#e8c56a" stroke-width="6"/>
    <circle cx="200" cy="200" r="26" fill="#5a3522"/><path d="M174 196 Q172 168 200 166 Q228 168 226 196 Q200 186 174 196Z" fill="#b8241c"/><path d="M168 280 Q170 236 200 232 Q230 236 232 280Z" fill="#f2e6cf"/>
    <g class="flicker"><circle cx="200" cy="70" r="60" fill="#ffd27a" opacity="0.15"/></g>
    <path d="M150 40 L250 40 L230 90 L170 90Z" fill="#e8c56a"/>${[160, 180, 200, 220, 240].map((x) => `<circle class="flicker" cx="${x}" cy="94" r="4" fill="#fff4c2"/>`).join('')}
    ${[60, 110, 290, 340].map((x) => `<g><rect x="${x - 3}" y="430" width="6" height="40" fill="#e8d9b8"/><g class="flicker"><path d="M${x} 430 Q${x - 5} 418 ${x} 408 Q${x + 5} 418 ${x} 430Z" fill="#ffcf6b"/></g></g>`).join('')}
    <rect y="470" width="400" height="230" fill="#4a2c16"/>
    ${[0, 1, 2, 3, 4, 5, 6, 7].map((i) => `<circle cx="${30 + i * 48}" cy="470" r="18" fill="${['#fff', '#f7e8c8', '#ffffff', '#e9d5ff'][i % 4]}"/>`).join('')}`,

  // Jos at sunrise: the Shere Hills, granite boulders, a blue mining pond.
  jos: () => `${sky('jos', [[0, '#ff9a5a'], [0.35, '#ffcf87'], [0.7, '#bfe3ef'], [1, '#e8f3e0']])}
    ${sun(300, 210, 34, '#fff1b8', '#ffb347')}${cloud(70, 100, 1.1, '#fff', 0.8, 70)}${birds(80, 160, 4, '#5a3a3a')}
    <path d="M-10 330 Q60 270 130 300 Q200 250 270 290 Q340 260 410 300 L410 420 L-10 420Z" fill="#7a8f5a"/>
    ${boulders(5, 380, ['#a58c7a', '#8f7766', '#bca393'])}
    <path d="M-10 400 Q200 370 410 400 L410 700 L-10 700Z" fill="#c9a24a"/>
    <ellipse cx="250" cy="470" rx="120" ry="26" fill="#3fb6c9"/><ellipse cx="250" cy="466" rx="90" ry="14" fill="#8de0ea" opacity="0.6" class="shimmer"/>
    ${house(40, 470, 46, 34, '#b5653e', '#6b3a1e')}${house(100, 480, 36, 28, '#c97a4a', '#6b3a1e')}
    <path d="M-10 520 Q200 500 410 530 L410 700 L-10 700Z" fill="#a8843a"/>`,

  // Plateau dusk: balanced rocks against a violet and orange sky.
  jos_dusk: () => `${sky('jd', [[0, '#2b1a4a'], [0.45, '#b04a6a'], [0.75, '#ff9a4a'], [1, '#ffd27a']])}
    ${stars(40, 3, 200)}${sun(200, 380, 30, '#ffdd88', '#ff7a3c')}
    ${boulders(17, 420, ['#3b2433', '#2d1b29', '#4a2c3c'])}
    <path d="M-10 410 Q200 390 410 412 L410 700 L-10 700Z" fill="#2a1626"/>
    ${birds(240, 250, 3, '#2a1626')}${fireflies(14, 5)}`,

  // Jos market: striped awnings, fruit, bunting.
  jos_market: () => `${sky('jm', [[0, '#5fc3f0'], [1, '#d8f4ff']])}
    ${cloud(300, 90, 1)}${bunting(170, 2)}
    ${boulders(23, 300, ['#a58c7a', '#bca393'])}
    <rect y="300" width="400" height="400" fill="#d9b26a"/>
    ${stalls(4, 420)}${stalls(9, 520)}`,

  // The Plateau road at night: a bus's headlights on the long way south.
  road_night: () => `${sky('rn', [[0, '#070b1e'], [0.6, '#1b2350'], [1, '#2c2a4a']])}
    ${stars(80, 11)}${moon(320, 110)}
    ${boulders(31, 380, ['#141a33', '#1a2140'])}
    <path d="M-10 380 L410 380 L410 700 L-10 700Z" fill="#121629"/>
    <path d="M150 700 L195 380 L205 380 L250 700Z" fill="#2a2e44"/><path d="M198 700 L199 380 L201 380 L202 700Z" fill="#f7d26b" opacity="0.6" stroke-dasharray="10 14"/>
    <g class="bob"><rect x="160" y="430" width="80" height="44" rx="6" fill="#e9eef7"/><circle cx="172" cy="466" r="5" fill="#fff8b0"/><circle cx="228" cy="466" r="5" fill="#fff8b0"/>
      <path d="M160 470 L90 700 L310 700 L240 470Z" fill="#fff8b0" opacity="0.12"/></g>`,

  // Bayelsa: mangrove creeks, mist, a canoe, stilt houses, egrets.
  bayelsa: () => `${sky('by', [[0, '#a8e0d8'], [0.5, '#e6f6ea'], [1, '#d7efe0']])}
    ${sun(90, 140, 26, '#fff7d0', '#ffe9a0')}${birds(220, 150, 3, '#ffffff')}
    <path d="M-10 330 Q100 290 200 320 Q300 280 410 320 L410 380 L-10 380Z" fill="#2f6b4a"/>
    ${[30, 80, 140, 300, 360].map((x, i) => `<g><ellipse cx="${x}" cy="${300 + (i % 2) * 14}" rx="42" ry="30" fill="${i % 2 ? '#2b7a50' : '#3a8f5c'}"/>${[0, 1, 2, 3].map((k) => `<path d="M${x - 24 + k * 16} ${320} Q${x - 30 + k * 16} 350 ${x - 36 + k * 16} 372" stroke="#4a3220" stroke-width="2.5" fill="none"/>`).join('')}</g>`).join('')}
    <g><rect x="210" y="300" width="70" height="40" fill="#b8865a"/><path d="M204 302 L245 276 L286 302Z" fill="#7a4a2a"/>${[214, 238, 262, 276].map((x) => `<rect x="${x}" y="340" width="4" height="36" fill="#5a3a20"/>`).join('')}</g>
    ${water(372, '#3f9a8c', '#1d5a54', '#e9fff8')}
    ${cloud(100, 390, 2.4, '#ffffff', 0.35, 90)}${cloud(320, 420, 2, '#ffffff', 0.3, 110)}
    ${canoe(170, 470, 1)}`,

  // The creeks at night: moon on black water, fireflies, a speedboat's lamp.
  creek_night: () => `${sky('cn', [[0, '#050a18'], [0.6, '#0e2a3a'], [1, '#0b3a3a']])}
    ${stars(70, 21, 280)}${moon(300, 120)}
    ${[20, 90, 160, 250, 330, 390].map((x, i) => `<ellipse cx="${x}" cy="${310 + (i % 2) * 12}" rx="46" ry="34" fill="#0a1f1a"/>`).join('')}
    ${water(350, '#0f3340', '#03101a', '#fff6d6')}
    <path d="M300 360 L290 700" stroke="#fff6d6" stroke-width="20" opacity="0.08"/>
    <g class="bob"><path d="M120 450 L230 450 L215 470 L135 470Z" fill="#dfe6ee"/><circle cx="226" cy="452" r="4" fill="#fff8b0"/><path d="M226 452 L400 420 L400 490Z" fill="#fff8b0" opacity="0.1"/></g>
    ${fireflies(22, 9)}`,

  // Kano: ochre mud walls with horned pinnacles, the city gate, indigo dye pits.
  kano: () => `${sky('kn', [[0, '#f2b45a'], [0.5, '#f7d79a'], [1, '#f3e2c0']])}
    ${sun(80, 120, 30, '#fff0c8', '#ffcf6b')}${birds(230, 120, 4, '#7a4a2a')}
    <circle cx="300" cy="250" r="34" fill="#4e9a6a"/><rect x="266" y="250" width="68" height="70" fill="#e8d2a6"/><rect x="340" y="190" width="10" height="130" fill="#e8d2a6"/><circle cx="345" cy="186" r="7" fill="#4e9a6a"/>
    ${[0, 1, 2, 3].map((i) => `<g><rect x="${10 + i * 62}" y="${250 + (i % 2) * 18}" width="54" height="${90 - (i % 2) * 18}" fill="${i % 2 ? '#c8763a' : '#b5652e'}"/>
      <path d="M${10 + i * 62} ${250 + (i % 2) * 18} l-4 -14 l8 6 M${64 + i * 62} ${250 + (i % 2) * 18} l4 -14 l-8 6 M${37 + i * 62} ${250 + (i % 2) * 18} l0 -16" stroke="#9a4f22" stroke-width="5" stroke-linecap="round"/>
      <rect x="${30 + i * 62}" y="${300}" width="14" height="40" rx="7" fill="#5a2c12"/></g>`).join('')}
    <rect x="-10" y="330" width="420" height="40" fill="#a85a2a"/><path d="M170 370 L170 330 Q200 300 230 330 L230 370Z" fill="#5a2c12"/>
    ${[0, 1, 2, 3, 4].map((i) => `<path d="M${-10 + i * 90} 330 l10 -12 l10 12" fill="#a85a2a"/>`).join('')}
    <rect y="370" width="400" height="330" fill="#d6a865"/>
    ${[[70, 450], [170, 470], [270, 450], [120, 530], [230, 540], [330, 520]].map(([x, y], i) => `<ellipse cx="${x}" cy="${y}" rx="36" ry="13" fill="#5a3a20"/><ellipse class="shimmer" cx="${x}" cy="${y}" rx="30" ry="9" fill="${['#1b2a8a', '#2a3ab8', '#0f1f6a', '#b8241c', '#1b2a8a', '#e0a020'][i]}"/>`).join('')}`,

  // Kano Durbar: horsemen in bright regalia, flags, the palace wall.
  kano_durbar: () => `${sky('kd', [[0, '#5ab8f0'], [1, '#f6e7c4']])}
    ${sun(330, 90, 24, '#fff6d0', '#ffe48a')}
    <rect y="230" width="400" height="120" fill="#c8763a"/>${[0, 1, 2, 3, 4, 5, 6].map((i) => `<path d="M${i * 62} 230 l12 -18 l12 18" fill="#c8763a"/>`).join('')}
    ${bunting(210, 5)}
    <rect y="350" width="400" height="350" fill="#e2c48a"/>
    ${[[60, 430, '#e63946', '#f4d35e'], [180, 450, '#2a9d8f', '#ffffff'], [300, 430, '#7b2cbf', '#f4a261']].map(([x, y, c1, c2], i) => `<g class="bob" style="animation-delay:${i * 0.4}s" transform="translate(${x} ${y})">
      <ellipse cx="0" cy="0" rx="46" ry="22" fill="#6b3a1e"/><path d="M36 -6 Q58 -40 46 -54 Q34 -40 26 -14Z" fill="#6b3a1e"/><path d="M-46 0 Q-62 10 -58 26" stroke="#3a1e0e" stroke-width="5" fill="none"/>
      <path d="M-38 -10 L34 -10 L30 22 L-34 22Z" fill="${c1}"/><path d="M-38 6 L34 6" stroke="${c2}" stroke-width="5"/>
      ${[-30, -12, 12, 30].map((lx) => `<rect x="${lx - 3}" y="18" width="6" height="34" fill="#4a2a14"/>`).join('')}
      <rect x="-8" y="-50" width="18" height="40" fill="${c2}"/><circle cx="1" cy="-58" r="10" fill="#5a3522"/><path d="M-12 -62 Q1 -82 14 -62Z" fill="${c1}"/><path d="M14 -62 Q20 -40 26 -30" stroke="${c1}" stroke-width="4"/>
      <path d="M12 -40 L12 -100" stroke="#3a1e0e" stroke-width="2"/><path d="M12 -100 L36 -92 L12 -84Z" fill="${c1}"/></g>`).join('')}`,

  // Kano market at night: lantern light and bolts of bright cloth.
  kano_market: () => `${sky('km', [[0, '#120c2a'], [0.6, '#3a1c4a'], [1, '#5a2a3a']])}
    ${stars(40, 8, 200)}${lanterns(230, 4)}
    <rect y="280" width="400" height="420" fill="#2a1a24"/>
    ${[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map((i) => `<rect x="${i * 42}" y="${300 + (i % 3) * 8}" width="34" height="140" fill="${['#e63946', '#f4a261', '#2a9d8f', '#e9c46a', '#3a86ff', '#ff6b9a', '#8e44ad', '#1b2a8a', '#f7c600', '#2ec4b6'][i]}"/><path d="M${i * 42} ${300 + (i % 3) * 8} l34 0 l-6 140 l-22 0Z" fill="#000" opacity="0.15"/>`).join('')}
    ${lanterns(270, 6, 7)}`,

  // Lagos: the lagoon, Third Mainland Bridge, yellow danfos, the island skyline.
  lagos: () => `${sky('lg', [[0, '#ff7e5f'], [0.45, '#feb47b'], [0.8, '#ffe6a8'], [1, '#ffd6a0']])}
    ${sun(90, 230, 32, '#fff1c0', '#ffb347')}${birds(250, 120, 5, '#6b2a3a')}
    ${skyline(3, 300, '#5a3a5a', '#ffe6a8', { maxH: 170, minH: 50, density: 0.25 })}
    ${water(300, '#e98a6a', '#4a5a8a', '#fff1c0')}
    <path d="M-10 360 Q200 340 410 360" stroke="#d8d0c8" stroke-width="12" fill="none"/>
    ${[0, 1, 2, 3, 4, 5, 6, 7, 8].map((i) => `<rect x="${i * 50}" y="${352 + Math.abs(4 - i) * 0.8}" width="6" height="70" fill="#c8c0b8"/>`).join('')}
    ${danfo(60, 326, 0.8)}${danfo(220, 322, 0.8)}${danfo(320, 328, 0.75)}
    ${canoe(300, 520, 0.9, '#3a2a2a')}`,

  // Lagos night: Victoria Island towers, the lit cable bridge, reflections.
  lagos_night: () => `${sky('ln', [[0, '#090523'], [0.55, '#2a0f4a'], [1, '#6a1f5a']])}
    ${stars(30, 13, 160)}
    ${skyline(21, 360, '#160c2e', '#ffd166', { maxH: 230, minH: 80, density: 0.45 })}
    <g><path d="M200 360 L200 180" stroke="#cfd6ff" stroke-width="5"/>${[-1, 1].map((d) => [0, 1, 2, 3, 4, 5].map((k) => `<path d="M200 ${190 + k * 12} L${200 + d * (40 + k * 26)} 360" stroke="#ff5fa2" stroke-width="1.4" class="shimmer"/>`).join('')).join('')}</g>
    ${water(360, '#2a1050', '#05020f', '#ff5fa2')}
    ${[40, 120, 280, 350].map((x, i) => `<rect class="shimmer" style="animation-delay:${i * 0.5}s" x="${x}" y="380" width="10" height="160" fill="#ffd166" opacity="0.15"/>`).join('')}`,

  // A Lagos beach at sunset: umbrellas, surf, the Atlantic.
  lagos_beach: () => `${sky('lb', [[0, '#ff5f6d'], [0.5, '#ffc371'], [1, '#ffe8b0']])}
    ${sun(200, 300, 40, '#fff4c8', '#ff9a5a')}${birds(80, 140, 4, '#7a2a3a')}
    ${water(320, '#f08a5a', '#2a6a8a', '#fff4c8')}
    ${[0, 1, 2].map((i) => `<path class="shimmer" d="M-10 ${440 + i * 24} Q100 ${430 + i * 24} 200 ${440 + i * 24} T410 ${440 + i * 24}" stroke="#fff" stroke-width="3" fill="none" opacity="0.6"/>`).join('')}
    <path d="M-10 500 Q200 480 410 500 L410 700 L-10 700Z" fill="#f2d39a"/>
    ${[[60, 520, '#e63946', '#f4d35e'], [200, 540, '#2a9d8f', '#fff'], [330, 520, '#3a86ff', '#ffbe0b']].map(([x, y, a, b]) => `<path d="M${x} ${y} L${x} ${y - 60}" stroke="#5a3a2a" stroke-width="3"/><path d="M${x - 40} ${y - 56} Q${x} ${y - 90} ${x + 40} ${y - 56}Z" fill="${a}"/><path d="M${x - 14} ${y - 60} Q${x} ${y - 88} ${x + 14} ${y - 60}Z" fill="${b}"/>`).join('')}
    ${palm(370, 520, 0.9, '#2a3a1a', '#4a3020')}`,

  // London: rain, the Thames, Elizabeth Tower, Tower Bridge, a red bus.
  london: () => `${sky('lo', [[0, '#7a8494'], [0.6, '#a9b2bf'], [1, '#c8cdd4']])}
    ${cloud(80, 90, 1.8, '#8a93a2', 0.9, 70)}${cloud(280, 140, 2, '#959eac', 0.9, 90)}
    <g fill="#4a4f5c"><rect x="40" y="150" width="34" height="200"/><path d="M36 150 L57 100 L78 150Z"/><rect x="50" y="170" width="14" height="14" fill="#f2e6b0"/><circle cx="57" cy="177" r="6" fill="#f2e6b0"/><path d="M57 100 L57 80" stroke="#4a4f5c" stroke-width="3"/></g>
    <g fill="#5a6070"><rect x="200" y="200" width="30" height="150"/><rect x="320" y="200" width="30" height="150"/><path d="M196 200 L215 170 L234 200Z M316 200 L335 170 L354 200Z"/>
      <rect x="230" y="236" width="90" height="10"/><rect x="180" y="300" width="190" height="14"/><path d="M230 300 Q275 260 320 300" stroke="#5a6070" stroke-width="3" fill="none"/></g>
    ${skyline(41, 350, '#6a7080', null, { maxH: 40, minH: 10 })}
    ${water(350, '#6a7686', '#3a4252', '#dfe6ee')}
    <g class="bob"><rect x="40" y="430" width="120" height="56" rx="6" fill="#d7262e"/><rect x="40" y="456" width="120" height="3" fill="#a01a20"/>${[0, 1, 2, 3, 4].map((i) => `<rect x="${48 + i * 22}" y="436" width="16" height="14" fill="#cfe3ff"/><rect x="${48 + i * 22}" y="462" width="16" height="12" fill="#cfe3ff"/>`).join('')}<circle cx="64" cy="488" r="8" fill="#222"/><circle cx="136" cy="488" r="8" fill="#222"/></g>
    <g><rect x="300" y="400" width="30" height="80" fill="#d7262e"/><rect x="304" y="410" width="22" height="50" fill="#cfe3ff" opacity="0.6"/></g>
    ${rainLines(70, '#e6eef8')}`,

  // London at night: fog, lamplight on the Embankment, the river.
  london_night: () => `${sky('lnn', [[0, '#0b1020'], [0.6, '#232c44'], [1, '#3a4058']])}
    <g fill="#141a2c"><rect x="40" y="150" width="34" height="200"/><path d="M36 150 L57 100 L78 150Z"/><circle cx="57" cy="177" r="7" fill="#ffe9a8"/></g>
    <g fill="#1a2034"><rect x="200" y="200" width="30" height="150"/><rect x="320" y="200" width="30" height="150"/><rect x="230" y="236" width="90" height="10"/><rect x="180" y="300" width="190" height="14"/></g>
    ${[205, 222, 325, 342].map((x) => `<rect x="${x}" y="260" width="4" height="6" fill="#ffe9a8"/>`).join('')}
    ${water(350, '#1c2438', '#05070f', '#ffe9a8')}
    ${[30, 130, 230, 330].map((x) => `<g><rect x="${x}" y="360" width="4" height="70" fill="#111"/><g class="flicker"><circle cx="${x + 2}" cy="356" r="22" fill="#ffd27a" opacity="0.18"/><circle cx="${x + 2}" cy="356" r="6" fill="#ffe9a8"/></g></g>`).join('')}
    ${cloud(100, 420, 3, '#9aa4ba', 0.2, 60)}${cloud(300, 380, 3, '#9aa4ba', 0.18, 80)}`,

  // Geneva: the lake, the Jet d'Eau, Alps beyond, a Swiss flag.
  geneva: () => `${sky('gv', [[0, '#5ab0ff'], [0.6, '#bfe3ff'], [1, '#eaf6ff']])}
    ${sun(320, 90, 24, '#fffbe0', '#fff1a8')}
    ${mountains(330, [[30, 230], [110, 180], [180, 240], [260, 160], [340, 220], [400, 190]], '#8aa4c4', '#ffffff')}
    ${skyline(51, 330, '#e8dccb', '#5a6a7a', { maxH: 40, minH: 18, maxW: 30, density: 0.4 })}
    ${water(330, '#3a8ad8', '#1a4a8a', '#ffffff')}
    <g class="jet"><path d="M196 330 Q192 220 200 120 Q208 220 204 330Z" fill="#ffffff" opacity="0.85"/><circle cx="200" cy="120" r="16" fill="#ffffff" opacity="0.6"/><path d="M200 120 Q240 160 250 220" stroke="#fff" stroke-width="6" opacity="0.4" fill="none"/></g>
    <g class="palm" style="transform-origin:60px 400px"><rect x="58" y="380" width="3" height="80" fill="#555"/><rect x="61" y="380" width="34" height="34" fill="#d52b1e"/><path d="M72 397 L84 397 M78 391 L78 403" stroke="#fff" stroke-width="5"/></g>
    ${[0, 1].map((i) => `<g class="bob" style="animation-delay:${i}s"><ellipse cx="${300 + i * 40}" cy="${470 + i * 20}" rx="12" ry="7" fill="#fff"/><path d="M${308 + i * 40} ${466 + i * 20} q6 -14 0 -18" stroke="#fff" stroke-width="4" fill="none"/></g>`).join('')}`,

  // Montreux at night: moon over Lake Geneva, the Alps in silhouette, a grand
  // hotel balcony strung with lights.
  montreux_night: () => `${sky('mx', [[0, '#05081a'], [0.55, '#1a2350'], [1, '#2a3a6a']])}
    ${stars(70, 33, 240)}${moon(300, 110)}
    ${mountains(330, [[0, 230], [90, 170], [170, 220], [260, 150], [340, 210], [400, 180]], '#121a38', '#c9d3ee')}
    ${skyline(61, 340, '#0d1230', '#ffd98a', { maxH: 40, minH: 14, maxW: 22, density: 0.5 })}
    ${water(340, '#1c2a5a', '#060a1c', '#ffe9b0')}
    <path d="M300 345 L292 700" stroke="#fff6d6" stroke-width="26" opacity="0.07"/>
    <g><rect x="-10" y="150" width="120" height="330" fill="#1a1630"/>${[0, 1, 2, 3, 4, 5].map((r) => [0, 1, 2].map((c) => `<rect x="${8 + c * 34}" y="${172 + r * 48}" width="18" height="26" fill="#ffd98a" opacity="${(r + c) % 3 ? 0.85 : 0.3}"/>`).join('')).join('')}</g>
    <rect y="470" width="400" height="12" fill="#2a2440"/>${[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map((i) => `<rect x="${i * 44}" y="482" width="6" height="60" fill="#2a2440"/>`).join('')}<rect y="540" width="400" height="160" fill="#14102a"/>
    <path d="M-10 455 Q200 495 410 455" stroke="#3a3458" stroke-width="1" fill="none"/>${lanterns(470, 21, 10)}
    ${fireflies(10, 41)}`,

  // The Alps: snow peaks, pines, a red mountain train on a viaduct, a chalet.
  alps: () => `${sky('al', [[0, '#3a7bd5'], [0.7, '#a8d4ff'], [1, '#e8f4ff']])}
    ${mountains(420, [[0, 200], [80, 110], [150, 230], [240, 80], [330, 200], [400, 140]], '#6a86b0', '#ffffff')}
    ${mountains(470, [[0, 340], [120, 260], [220, 330], [320, 270], [400, 320]], '#e8f0fa')}
    ${pines(3, 430, 26, '#1f4a3a')}
    <path d="M-10 420 L410 420" stroke="#8a5a3a" stroke-width="8"/>${[0, 1, 2, 3, 4, 5, 6].map((i) => `<path d="M${i * 64} 424 Q${i * 64 + 32} 470 ${i * 64 + 64} 424" stroke="#8a5a3a" stroke-width="6" fill="none"/>`).join('')}
    <g class="train">${[0, 1, 2].map((i) => `<rect x="${i * 58}" y="392" width="54" height="26" rx="4" fill="#d52b1e"/><rect x="${i * 58 + 6}" y="398" width="42" height="9" fill="#ffffff" opacity="0.85"/>`).join('')}</g>
    <path d="M-10 500 Q200 470 410 500 L410 700 L-10 700Z" fill="#f4f8ff"/>
    <g><rect x="270" y="500" width="80" height="54" fill="#8a5a3a"/><path d="M260 504 L310 466 L360 504Z" fill="#5a3a2a"/><path d="M262 502 L310 468 L358 502" stroke="#fff" stroke-width="6" fill="none"/><rect x="282" y="516" width="16" height="14" fill="#ffe9a8"/><rect x="322" y="516" width="16" height="14" fill="#ffe9a8"/></g>
    ${snow(50)}`,

  // An Alpine storm: whiteout on the pass.
  alps_storm: () => `${sky('as', [[0, '#2a3248'], [0.6, '#6a7590'], [1, '#c8d0e0']])}
    ${mountains(420, [[0, 220], [100, 130], [200, 210], [300, 110], [400, 200]], '#4a5570', '#dfe6f2')}
    <path d="M-10 440 Q200 400 410 440 L410 700 L-10 700Z" fill="#dfe6f2"/>
    ${pines(9, 450, 14, '#1a2a2a')}
    <rect width="400" height="700" fill="#ffffff" opacity="0.18"/>
    ${snow(130, true)}`,

  // A bank vault: steel, bolts, a round door glowing gold.
  vault: () => `${sky('vt', [[0, '#141820'], [1, '#2a303c']])}
    ${[0, 1, 2, 3, 4, 5].map((i) => `<rect x="${i * 70}" y="0" width="66" height="700" fill="#1d222c" stroke="#2c3340" stroke-width="2"/>`).join('')}
    <circle cx="200" cy="300" r="150" fill="#ffd27a" opacity="0.12" class="flicker"/>
    <circle cx="200" cy="300" r="120" fill="#8a94a4" stroke="#c8d0dc" stroke-width="8"/><circle cx="200" cy="300" r="90" fill="#6a7484"/>
    ${Array.from({ length: 12 }, (_, i) => { const a = (i / 12) * Math.PI * 2; return `<circle cx="${200 + Math.cos(a) * 105}" cy="${300 + Math.sin(a) * 105}" r="6" fill="#c8d0dc"/>`; }).join('')}
    <g class="spin" style="transform-origin:200px 300px">${[0, 60, 120].map((a) => `<rect x="196" y="230" width="8" height="140" rx="4" fill="#e8c56a" transform="rotate(${a} 200 300)"/>`).join('')}<circle cx="200" cy="300" r="16" fill="#e8c56a"/></g>
    <rect y="470" width="400" height="230" fill="#11141a"/>`,

  // The Caribbean: turquoise water, white sand, palms, painted houses.
  caribbean: () => `${sky('cb', [[0, '#1ec8ff'], [0.6, '#9ff0ff'], [1, '#e6fcff']])}
    ${sun(80, 100, 30, '#fffbe0', '#fff1a0')}${cloud(260, 110, 1.1)}${birds(190, 170, 3, '#2a5a6a')}
    <path d="M220 330 Q280 250 340 270 Q380 280 410 330Z" fill="#2ea36a"/><path d="M260 300 Q290 270 320 284" stroke="#1f7a4a" stroke-width="3" fill="none"/>
    ${water(320, '#16d2d0', '#0a7ab8', '#ffffff')}
    ${[0, 1].map((i) => `<path class="shimmer" d="M-10 ${470 + i * 18} Q100 ${462 + i * 18} 200 ${470 + i * 18} T410 ${470 + i * 18}" stroke="#fff" stroke-width="3" fill="none" opacity="0.8"/>`).join('')}
    <path d="M-10 500 Q200 470 410 500 L410 700 L-10 700Z" fill="#fff1d0"/>
    ${[['#ff6b9a', '#2ec4b6'], ['#ffd166', '#e63946'], ['#3a86ff', '#ffbe0b'], ['#06d6a0', '#ef476f']].map(([w, r], i) => house(20 + i * 52, 520 + (i % 2) * 6, 42, 34, w, r, '#fff')).join('')}
    <g class="bob"><path d="M240 410 L320 410 L310 426 L250 426Z" fill="#fff"/><path d="M278 408 L278 350 L310 404Z" fill="#ff6b9a"/></g>
    ${palm(350, 560, 1.15, '#1d8a4a', '#8a5a2a')}${palm(250, 575, 0.9, '#22a05a', '#8a5a2a', 1.4)}`,

  // A Caribbean sunset: magenta sky, palm silhouettes, string lights.
  caribbean_sunset: () => `${sky('cs', [[0, '#3a0ca3'], [0.35, '#b5179e'], [0.65, '#f72585'], [0.85, '#ff9e00'], [1, '#ffd60a']])}
    ${sun(200, 330, 44, '#fff3b0', '#ffb703')}
    ${water(340, '#e5487a', '#3a0c5a', '#ffe08a')}
    <path d="M-10 470 Q200 450 410 470 L410 700 L-10 700Z" fill="#2a0a2a"/>
    <path d="M-10 160 Q200 240 410 160" stroke="#2a0a2a" stroke-width="1" fill="none"/>${lanterns(190, 12, 11)}
    ${palm(40, 480, 1.25, '#1a0418', '#1a0418')}${palm(370, 486, 1.1, '#1a0418', '#1a0418', 0.8)}${fireflies(16, 3)}`,
  // The dream river: black water under a violet moon, floating lanterns,
  // and a woman in white standing on the water.
  dream_river: () => `${sky('dr', [[0, '#05030f'], [0.5, '#1d0f33'], [0.8, '#3a1a4a'], [1, '#12081e']])}
    ${stars(90, 77, 330)}
    <circle cx="200" cy="170" r="70" fill="#d9c8ff" opacity="0.08"/><circle cx="200" cy="170" r="44" fill="#efe6ff" opacity="0.9"/><circle cx="214" cy="160" r="40" fill="#1d0f33" opacity="0.35"/>
    ${mountains(360, [[0, 300], [90, 250], [180, 310], [280, 240], [400, 290]], '#0c0618')}
    ${water(360, '#140a26', '#020108', '#cdb8ff')}
    <path d="M200 362 L188 700 L212 700Z" fill="#efe6ff" opacity="0.08"/>
    <g class="apparition"><ellipse cx="200" cy="452" rx="26" ry="5" fill="#efe6ff" opacity="0.25"/>
      <path d="M200 340 C188 344 184 360 186 380 L172 452 Q200 460 228 452 L214 380 C216 360 212 344 200 340Z" fill="#f4efff" opacity="0.82"/>
      <circle cx="200" cy="332" r="11" fill="#2a1a24"/><path d="M188 330 Q200 300 212 330 Q214 360 222 380 Q200 360 178 380 Q186 360 188 330Z" fill="#120a14"/>
      <path d="M172 452 Q150 470 120 466 M228 452 Q250 470 280 466" stroke="#f4efff" stroke-width="2" opacity="0.35" fill="none"/></g>
    ${[[60, 520], [120, 600], [300, 560], [350, 630], [240, 650], [90, 470], [320, 480]].map(([x, y], i) => `<g class="bob" style="animation-delay:${i * 0.7}s"><path d="M${x - 10} ${y} L${x + 10} ${y} L${x + 6} ${y + 8} L${x - 6} ${y + 8}Z" fill="#5a2a3a"/><circle cx="${x}" cy="${y - 6}" r="16" fill="#ffb86b" opacity="0.15"/><g class="flicker" style="animation-delay:${i * 0.4}s"><path d="M${x} ${y - 14} Q${x + 5} ${y - 6} ${x} ${y - 2} Q${x - 5} ${y - 6} ${x} ${y - 14}Z" fill="#ffd27a"/></g></g>`).join('')}
    ${fireflies(14, 91)}`,
};

export const SCENE_KEYS = Object.keys(SCENES);

export function sceneSVG(key) {
  const draw = SCENES[key] || SCENES.ph_day;
  return `<svg class="scene-svg" viewBox="0 0 400 700" preserveAspectRatio="xMidYMid slice" aria-hidden="true">${draw()}</svg>`;
}
