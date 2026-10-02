// Animated character portraits, drawn as inline SVG so the game ships with no
// image assets and works offline. A character's look (skin, hair, headwear,
// outfit, jewellery) comes from characters.json; the expression comes from the
// dialogue line's `mood`. CSS animates the `.breathe`, `.lid` and `.sway`
// groups (idle breathing, blinking, swaying earrings).

const MOODS = ['neutral', 'smile', 'sad', 'angry', 'surprised', 'worried'];

// Brows: [left, right] paths, eyes centred at x=82 and x=118, y=98.
const BROWS = {
  neutral: ['M70 86 Q81 82 92 86', 'M108 86 Q119 82 130 86'],
  smile: ['M70 85 Q81 80 92 84', 'M108 84 Q119 80 130 85'],
  sad: ['M70 86 Q82 84 92 80', 'M108 80 Q118 84 130 86'],
  angry: ['M70 81 Q82 84 93 89', 'M107 89 Q118 84 130 81'],
  surprised: ['M70 80 Q81 74 92 79', 'M108 79 Q119 74 130 80'],
  worried: ['M70 87 Q81 84 92 80', 'M108 80 Q119 84 130 87'],
};

function mouth(mood, lips, full) {
  const upper = lips;
  const lower = shade(lips, 0.12);
  if (full && (mood === 'neutral' || mood === 'worried' || mood === 'angry')) {
    const drop = mood === 'worried' ? 1.5 : 0;
    return `<path d="M83 126 Q90 119.5 96 121.5 Q100 123.5 104 121.5 Q110 119.5 117 126 Q100 ${128 + drop} 83 126Z" fill="${upper}"/>
      <path d="M83 126 Q100 ${128 + drop} 117 126 Q111 137 100 138 Q89 137 83 126Z" fill="${lower}"/>
      <ellipse cx="102" cy="132" rx="5" ry="1.6" fill="#fff" opacity="0.32"/>`;
  }
  if (full && mood === 'sad') {
    return `<path d="M85 129 Q92 122 100 124 Q108 122 115 129 Q100 128 85 129Z" fill="${upper}"/>
      <path d="M85 129 Q100 128 115 129 Q110 137 100 137 Q90 137 85 129Z" fill="${lower}"/>
      <ellipse cx="102" cy="133" rx="4" ry="1.4" fill="#fff" opacity="0.3"/>`;
  }
  switch (mood) {
    case 'smile':
      if (full) {
        return `<path d="M82 123 Q100 121 118 123 Q111 140 100 141 Q89 140 82 123Z" fill="${lower}"/>
          <path d="M85 124.5 Q100 124 115 124.5 Q108 131 100 131 Q92 131 85 124.5Z" fill="#fffaf5"/>
          <path d="M81 123 Q90 117 96 119 Q100 121 104 119 Q110 117 119 123 Q100 124.5 81 123Z" fill="${upper}"/>
          <ellipse cx="103" cy="136" rx="5" ry="1.5" fill="#fff" opacity="0.3"/>`;
      }
      return `<path d="M86 124 Q100 121 114 124 Q108 135 100 136 Q92 135 86 124Z" fill="${lower}"/>
        <path d="M88 125 Q100 124 112 125 Q106 129 100 129 Q94 129 88 125Z" fill="#fffaf5"/>
        <path d="M85 124 Q93 119 100 121 Q107 119 115 124 Q100 124 85 124Z" fill="${upper}"/>`;
    case 'sad':
      return `<path d="M88 129 Q100 123 112 129 Q100 127 88 129Z" fill="${upper}"/>
        <path d="M88 129 Q100 127 112 129 Q100 134 88 129Z" fill="${lower}"/>`;
    case 'angry':
      return `<path d="M88 127 Q100 124 112 127 L112 128 Q100 127 88 128Z" fill="${upper}"/>
        <path d="M88 128 Q100 127 112 128 Q100 132 88 128Z" fill="${lower}"/>`;
    case 'surprised':
      return `<ellipse cx="100" cy="128" rx="7" ry="8" fill="${upper}"/><ellipse cx="100" cy="129" rx="4.2" ry="5" fill="#3b1a1a"/>`;
    case 'worried':
      return `<path d="M88 127 Q94 124 100 126 Q106 123 112 127 Q100 127 88 127Z" fill="${upper}"/>
        <path d="M88 127 Q100 127 112 127 Q100 132 88 127Z" fill="${lower}"/>`;
    default:
      return `<path d="M87 126 Q94 122 100 124 Q106 122 113 126 Q100 126 87 126Z" fill="${upper}"/>
        <path d="M87 126 Q100 126 113 126 Q100 133 87 126Z" fill="${lower}"/>`;
  }
}

// Darken (amount > 0) or lighten (amount < 0) a #rrggbb colour.
export function shade(hex, amount) {
  const n = parseInt(hex.slice(1), 16);
  const f = (c) => Math.max(0, Math.min(255, Math.round(amount > 0 ? c * (1 - amount) : c + (255 - c) * -amount)));
  const r = f(n >> 16), g = f((n >> 8) & 255), b = f(n & 255);
  return `#${((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1)}`;
}

function defs(id, c) {
  const o = c.outfit || {};
  const [a, b, d] = [o.color || '#c0392b', o.color2 || '#f1c40f', o.color3 || '#16a085'];
  return `<defs>
    <radialGradient id="sk-${id}" cx="45%" cy="38%" r="70%">
      <stop offset="0" stop-color="${shade(c.skin, -0.12)}"/><stop offset="0.65" stop-color="${c.skin}"/><stop offset="1" stop-color="${shade(c.skin, 0.18)}"/>
    </radialGradient>
    <linearGradient id="gl-${id}" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="${c.accent}" stop-opacity="0.55"/><stop offset="1" stop-color="${c.accent}" stop-opacity="0.08"/>
    </linearGradient>
    <pattern id="pt-${id}" width="22" height="22" patternUnits="userSpaceOnUse">
      <rect width="22" height="22" fill="${a}"/>
      <circle cx="11" cy="11" r="6" fill="${b}"/><circle cx="11" cy="11" r="2.6" fill="${d}"/>
      <path d="M0 0 L5 0 L0 5Z M22 22 L17 22 L22 17Z M22 0 L22 5 L17 0Z M0 22 L0 17 L5 22Z" fill="${d}"/>
    </pattern>
    <pattern id="lc-${id}" width="10" height="10" patternUnits="userSpaceOnUse">
      <rect width="10" height="10" fill="${a}"/><circle cx="5" cy="5" r="2.2" fill="none" stroke="${b}" stroke-width="1"/>
    </pattern>
  </defs>`;
}

const TORSO = 'M24 240 Q28 184 76 172 L124 172 Q172 184 176 240Z';

function outfit(id, c) {
  const o = c.outfit || { style: 'plain', color: '#666' };
  const col = o.color;
  const neck = `<path d="M86 136 L86 176 Q100 186 114 176 L114 136Z" fill="${shade(c.skin, 0.1)}"/>`;
  switch (o.style) {
    case 'ankara':
      return `${neck}<path d="${TORSO}" fill="url(#pt-${id})"/>
        <path d="M76 172 Q100 200 124 172" fill="none" stroke="${o.color2}" stroke-width="5"/>`;
    case 'lace':
      return `${neck}<path d="${TORSO}" fill="url(#lc-${id})"/>
        <path d="M78 173 Q100 194 122 173" fill="none" stroke="${shade(col, 0.25)}" stroke-width="4"/>`;
    case 'agbada':
      return `${neck}<path d="M14 240 Q20 178 76 170 L124 170 Q180 178 186 240Z" fill="${col}"/>
        <path d="M80 172 Q100 206 120 172" fill="none" stroke="${o.color2}" stroke-width="4"/>
        <path d="M88 186 Q100 214 112 186 M92 196 Q100 212 108 196" fill="none" stroke="${o.color2}" stroke-width="2"/>`;
    case 'suit':
      return `${neck}<path d="${TORSO}" fill="${col}"/>
        <path d="M84 172 L100 214 L116 172Z" fill="${o.color2 || '#f5f5f5'}"/>
        ${o.tie ? `<path d="M97 180 L103 180 L106 212 L100 220 L94 212Z" fill="${o.tie}"/>` : ''}
        <path d="M76 172 L100 226 L82 240 M124 172 L100 226 L118 240" fill="none" stroke="${shade(col, 0.35)}" stroke-width="3"/>`;
    case 'etibo':
      return `${neck}<path d="${TORSO}" fill="${col}"/>
        <path d="M84 174 Q100 186 116 174" fill="none" stroke="${shade(col, 0.2)}" stroke-width="3"/>
        <path d="M100 186 L100 240" stroke="${shade(col, 0.15)}" stroke-width="2"/>
        <circle cx="100" cy="196" r="2.4" fill="${o.color2}"/><circle cx="100" cy="210" r="2.4" fill="${o.color2}"/><circle cx="100" cy="224" r="2.4" fill="${o.color2}"/>`;
    case 'kaftan':
      return `${neck}<path d="${TORSO}" fill="${col}"/>
        <path d="M86 172 L100 204 L114 172" fill="${shade(c.skin, 0.08)}" stroke="${o.color2}" stroke-width="3"/>`;
    case 'coat':
      return `${neck}<path d="${TORSO}" fill="${col}"/>
        <path d="M86 172 Q100 190 114 172 L112 196 Q100 204 88 196Z" fill="${o.color2 || '#f3eadf'}"/>
        <path d="M78 172 L96 222 M122 172 L104 222" stroke="${shade(col, 0.3)}" stroke-width="3" fill="none"/>`;
    case 'abaya':
      return `<path d="${TORSO}" fill="${col}"/><path d="M60 240 Q100 214 140 240" fill="none" stroke="${o.color2}" stroke-width="3"/>`;
    default:
      return `${neck}<path d="${TORSO}" fill="${col}"/>`;
  }
}

function necklace(c) {
  switch (c.necklace) {
    case 'coral': {
      const beads = [];
      for (let i = 0; i <= 14; i++) {
        const t = i / 14;
        const x = 80 + 40 * t;
        const y = 174 + Math.sin(t * Math.PI) * 18;
        beads.push(`<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="3.3" fill="${i % 3 ? '#e2553f' : '#c7362a'}"/>`);
      }
      return beads.join('');
    }
    case 'gold':
      return `<path d="M82 172 Q100 194 118 172" fill="none" stroke="#e8b84a" stroke-width="2.5"/><circle cx="100" cy="190" r="4.5" fill="#f2c94c" stroke="#b8862b"/>`;
    case 'beads':
      return `<path d="M80 172 Q100 198 120 172" fill="none" stroke="#f2c94c" stroke-width="4" stroke-dasharray="3 3"/>`;
    case 'pearls':
      return `<path d="M82 174 Q100 192 118 174" fill="none" stroke="#f5f1e8" stroke-width="4.5" stroke-dasharray="0.1 5.5" stroke-linecap="round"/>`;
    default:
      return '';
  }
}

function hairBack(c) {
  const h = c.hair;
  switch (c.hairStyle) {
    case 'braids': {
      const strands = [];
      for (let i = 0; i < 18; i++) {
        const x = 52 + i * 5.6;
        const len = 210 + (i % 3) * 8;
        const sway = i < 9 ? -6 : 6;
        strands.push(`<path d="M${x} 70 Q${x + sway} ${len - 60} ${x + sway * 1.6} ${len}" stroke="${i % 2 ? h : shade(h, -0.08)}" stroke-width="6" fill="none" stroke-linecap="round"/>`);
        if (i % 4 === 1) strands.push(`<rect x="${x + sway * 1.4 - 3.5}" y="${len - 26}" width="7" height="5" rx="1.5" fill="#e8b84a"/>`);
      }
      return `<g class="sway-slow">${strands.join('')}</g>`;
    }
    case 'locs': {
      const strands = [];
      for (let i = 0; i < 14; i++) {
        const x = 56 + i * 6.6;
        strands.push(`<path d="M${x} 66 Q${x + (i < 7 ? -10 : 10)} 140 ${x + (i < 7 ? -14 : 14)} ${176 + (i % 3) * 6}" stroke="${shade(h, i % 2 ? 0 : -0.12)}" stroke-width="8" fill="none" stroke-linecap="round"/>`);
      }
      return strands.join('');
    }
    case 'long':
      return `<path d="M58 80 Q50 180 64 200 L136 200 Q150 180 142 80Z" fill="${h}"/>`;
    default:
      return '';
  }
}

function hairFront(c) {
  const h = c.hair;
  switch (c.hairStyle) {
    case 'braids': {
      const front = [];
      for (const [x0, dir] of [[53, -1], [57, -1], [61, -1], [139, 1], [143, 1], [147, 1]]) {
        front.push(`<path d="M${x0} 100 Q${x0 + dir * 4} 170 ${x0 + dir * 14} 236" stroke="${shade(h, x0 % 2 ? -0.1 : 0)}" stroke-width="5.5" fill="none" stroke-linecap="round"/>`);
      }
      return `<g class="sway-slow">${front.join('')}
          <rect x="${63 - 10}" y="196" width="7" height="5" rx="1.5" fill="#e8b84a" transform="rotate(-8 56 198)"/>
          <rect x="${137 + 4}" y="186" width="7" height="5" rx="1.5" fill="#e8b84a" transform="rotate(8 144 188)"/></g>
        <path d="M57 104 Q52 46 100 42 Q148 46 143 104 Q140 72 126 62 Q108 56 88 58 Q70 62 64 78 Q58 90 57 104Z" fill="${h}"/>
        <g stroke="${shade(h, -0.2)}" stroke-width="1.2" fill="none">
          <path d="M86 46 Q68 54 60 84"/><path d="M80 50 Q66 60 59 96"/><path d="M106 45 Q130 50 140 80"/><path d="M116 48 Q136 58 142 96"/>
        </g>
        <path d="M88 44 Q92 52 88 58" stroke="${shade(c.skin, 0.05)}" stroke-width="1.4" fill="none"/>`;
    }
    case 'lowcut':
      return `<path d="M60 92 Q58 52 100 48 Q142 52 140 92 Q136 66 100 62 Q64 66 60 92Z" fill="${h}" opacity="0.92"/>`;
    case 'waves':
      return `<path d="M60 90 Q58 50 100 46 Q142 50 140 90 Q134 64 100 60 Q66 64 60 90Z" fill="${h}"/>
        <g stroke="${shade(h, -0.3)}" stroke-width="1.4" fill="none" opacity="0.7">
          <path d="M72 64 Q80 58 88 64 Q96 70 104 64 Q112 58 120 64 Q128 70 132 66"/><path d="M66 76 Q74 70 82 76"/><path d="M118 76 Q126 70 134 76"/>
        </g>`;
    case 'locs':
      return `<path d="M58 94 Q54 46 100 42 Q146 46 142 94 Q132 62 100 60 Q68 62 58 94Z" fill="${h}"/>`;
    case 'bun':
      return `<circle cx="100" cy="40" r="15" fill="${h}"/><path d="M60 94 Q58 50 100 48 Q142 50 140 94 Q130 62 100 60 Q70 62 60 94Z" fill="${h}"/>
        <path d="M76 60 Q100 52 128 64" stroke="${shade(h, -0.2)}" fill="none" stroke-width="1.5"/>`;
    case 'side-part':
      return `<path d="M60 94 Q56 50 100 46 Q144 50 140 94 Q136 70 118 62 Q96 70 70 70 Q62 78 60 94Z" fill="${h}"/>`;
    case 'short':
      return `<path d="M60 90 Q58 52 100 48 Q142 52 140 90 Q134 66 100 62 Q66 66 60 90Z" fill="${h}"/>`;
    default:
      return '';
  }
}

function headwear(c) {
  const col = c.headColor || '#7d3c98';
  switch (c.headwear) {
    case 'gele':
      return `<g>
        <path d="M54 84 Q40 40 82 30 Q100 8 124 26 Q166 30 150 84 Q126 60 100 62 Q74 60 54 84Z" fill="${col}"/>
        <path d="M70 52 Q100 30 134 50 M64 66 Q100 46 140 64 M96 22 Q104 40 98 58 M118 26 Q126 40 120 56" stroke="${shade(col, 0.25)}" stroke-width="2.4" fill="none"/>
        <path d="M150 84 Q172 64 160 40 Q150 58 140 62Z" fill="${shade(col, -0.15)}"/>
      </g>`;
    case 'wrap':
      return `<path d="M56 88 Q50 42 100 38 Q150 42 144 88 Q130 62 100 62 Q70 62 56 88Z" fill="${col}"/>
        <path d="M66 62 Q100 44 136 62" stroke="${shade(col, 0.25)}" stroke-width="2" fill="none"/>
        <path d="M138 52 Q156 44 150 64 Q144 58 138 60Z" fill="${shade(col, 0.15)}"/>`;
    case 'redcap':
      return `<path d="M62 74 Q60 40 100 36 Q140 40 138 74 Q100 64 62 74Z" fill="#b8241c"/>
        <path d="M64 70 Q100 60 136 70" stroke="#7d1510" stroke-width="2" fill="none"/>`;
    case 'fila':
      return `<path d="M60 74 Q62 40 104 38 Q146 42 140 70 Q100 62 60 74Z" fill="${col}"/>
        <path d="M110 40 Q150 44 152 64 Q144 56 136 58" fill="${shade(col, 0.2)}"/>`;
    default:
      return '';
  }
}

function hijab(c, layer) {
  const col = c.headColor || '#1e8449';
  if (layer === 'back') {
    return `<path d="M50 104 Q44 40 100 34 Q156 40 150 104 Q156 150 138 178 Q100 196 62 178 Q44 150 50 104Z" fill="${col}"/>`;
  }
  return `<path d="M62 102 Q60 52 100 48 Q140 52 138 102 Q136 70 100 64 Q64 70 62 102Z" fill="${col}"/>
    <path d="M70 150 Q100 176 130 150 Q138 170 128 184 Q100 196 72 184 Q62 170 70 150Z" fill="${shade(col, 0.08)}"/>`;
}

function earrings(c) {
  if (c.headwear === 'hijab' || !c.earrings) return '';
  if (c.earrings === 'hoops') {
    return `<g class="sway"><circle cx="58" cy="122" r="8" fill="none" stroke="#e8b84a" stroke-width="2.6"/></g>
      <g class="sway sway-alt"><circle cx="142" cy="122" r="8" fill="none" stroke="#e8b84a" stroke-width="2.6"/></g>`;
  }
  if (c.earrings === 'pearls') return '<circle cx="59" cy="116" r="3.4" fill="#f5f1e8"/><circle cx="141" cy="116" r="3.4" fill="#f5f1e8"/>';
  if (c.earrings === 'coral') return '<g class="sway"><circle cx="59" cy="118" r="4" fill="#d64532"/></g><g class="sway sway-alt"><circle cx="141" cy="118" r="4" fill="#d64532"/></g>';
  return '<circle cx="59" cy="114" r="2.6" fill="#e8b84a"/><circle cx="141" cy="114" r="2.6" fill="#e8b84a"/>';
}

function eye(cx, c, mood) {
  const big = c.lashes ? 1.15 : 1;
  const open = (mood === 'surprised' ? 8 : mood === 'smile' ? 5.4 : 6.6) * big;
  const w = 10 * big;
  const shape = `M${cx - w} 98 Q${cx} ${98 - open - 1} ${cx + w} 98 Q${cx} ${98 + open - 1} ${cx - w} 98Z`;
  const lid = shade(c.skin, 0.08);
  const lashes = c.lashes
    ? `<path d="M${cx - w - 1} 98 Q${cx} ${98 - open - 2.5} ${cx + w + 1} 97" stroke="#120a08" stroke-width="2.6" fill="none" stroke-linecap="round"/>
       <path d="M${cx + (cx < 100 ? -w - 1 : w + 1)} 97.5 l${cx < 100 ? -5 : 5} -3.5" stroke="#120a08" stroke-width="2.2" stroke-linecap="round"/>
       <path d="M${cx + (cx < 100 ? -w + 2 : w - 2)} 94 l${cx < 100 ? -2.5 : 2.5} -3" stroke="#120a08" stroke-width="1.3" stroke-linecap="round"/>`
    : `<path d="M${cx - 10} 98 Q${cx} ${98 - open - 1} ${cx + 10} 98" stroke="#1c120e" stroke-width="1.4" fill="none"/>`;
  return `<path d="${shape}" fill="#fbf6ef"/>
    <circle cx="${cx}" cy="98" r="${5.2 * big}" fill="${c.iris || '#4a2a18'}"/><circle cx="${cx}" cy="98" r="${2.5 * big}" fill="#0e0705"/>
    <circle cx="${cx + 1.9}" cy="96" r="1.5" fill="#fff"/><circle cx="${cx - 1.6}" cy="99.6" r="0.7" fill="#fff" opacity="0.8"/>
    <path class="lid" style="transform-box:fill-box;transform-origin:50% 0;transform:scaleY(0.02)" d="M${cx - w - 1} 98 Q${cx} ${98 - open - 2} ${cx + w + 1} 98 Q${cx} ${98 + open} ${cx - w - 1} 98Z" fill="${lid}"/>
    ${lashes}`;
}

function beard(c) {
  const h = c.beardColor || c.hair;
  switch (c.beard) {
    case 'full':
      return `<path d="M62 112 Q64 160 100 168 Q136 160 138 112 Q130 140 116 140 Q100 132 84 140 Q70 140 62 112Z" fill="${h}"/>
        <path d="M88 118 Q100 114 112 118 Q100 122 88 118Z" fill="${h}"/>`;
    case 'goatee':
      return `<path d="M88 119 Q100 115 112 119 Q100 121 88 119Z M92 136 Q100 148 108 136 Q100 140 92 136Z" fill="${h}"/>`;
    case 'stubble':
      return `<path d="M66 116 Q70 156 100 164 Q130 156 134 116 Q126 146 100 150 Q74 146 66 116Z" fill="${h}" opacity="0.35"/>`;
    default:
      return '';
  }
}

export function portraitSVG(character, mood = 'neutral', key = 'x') {
  const c = character;
  if (!c || c.narration || c.message || c.letter) return '';
  const m = MOODS.includes(mood) ? mood : 'neutral';
  const id = `${key}-${Math.random().toString(36).slice(2, 7)}`;
  const [bl, br] = BROWS[m];
  const isHijab = c.headwear === 'hijab';
  const ears = isHijab
    ? ''
    : `<ellipse cx="60" cy="104" rx="6" ry="10" fill="${shade(c.skin, 0.08)}"/><ellipse cx="140" cy="104" rx="6" ry="10" fill="${shade(c.skin, 0.08)}"/>`;
  const age = c.age === 'old'
    ? `<g stroke="${shade(c.skin, 0.28)}" stroke-width="1.2" fill="none" opacity="0.7"><path d="M84 116 Q80 124 82 132"/><path d="M116 116 Q120 124 118 132"/><path d="M84 70 Q100 66 116 70"/></g>`
    : '';
  const glasses = c.glasses
    ? `<g fill="none" stroke="${c.glasses === true ? '#2b2b2b' : c.glasses}" stroke-width="2"><rect x="70" y="89" width="24" height="17" rx="6"/><rect x="106" y="89" width="24" height="17" rx="6"/><path d="M94 96 L106 96 M70 95 L61 92 M130 95 L139 92"/></g>`
    : '';
  const blush = c.blush ? `<ellipse cx="76" cy="114" rx="9" ry="5" fill="${c.blush}" opacity="0.32"/><ellipse cx="124" cy="114" rx="9" ry="5" fill="${c.blush}" opacity="0.32"/>` : '';
  return `<svg class="portrait-svg" viewBox="0 0 200 240" role="img" aria-label="${c.name}, ${m}">
  ${defs(id, c)}
  <circle cx="100" cy="112" r="96" fill="url(#gl-${id})"/>
  <g class="breathe">
    ${hairBack(c)}
    ${isHijab ? hijab(c, 'back') : ''}
    ${outfit(id, c)}
    ${necklace(c)}
    ${ears}
    ${c.lashes
      ? `<path d="M60 98 Q60 52 100 52 Q140 52 140 98 Q140 128 122 143 Q110 153 100 153 Q90 153 78 143 Q60 128 60 98Z" fill="url(#sk-${id})"/>`
      : `<ellipse cx="100" cy="102" rx="40" ry="49" fill="url(#sk-${id})"/>`}
    <ellipse cx="78" cy="108" rx="10" ry="5" fill="#fff" opacity="0.06"/><ellipse cx="122" cy="108" rx="10" ry="5" fill="#fff" opacity="0.06"/>
    ${isHijab ? hijab(c, 'front') : ''}
    ${blush}${age}
    <g class="eyes">${eye(82, c, m)}${eye(118, c, m)}</g>
    <g fill="none" stroke="${shade(c.browColor || c.hair || '#1a0f0a', 0)}" stroke-width="3" stroke-linecap="round"><path d="${bl}"/><path d="${br}"/></g>
    ${c.lashes
      ? `<path d="M93 115 Q96 119 100 118 Q104 119 107 115" fill="none" stroke="${shade(c.skin, 0.3)}" stroke-width="1.6" stroke-linecap="round"/>
         <path d="M98 104 Q97 110 96 113" fill="none" stroke="${shade(c.skin, 0.18)}" stroke-width="1.2" stroke-linecap="round"/>
         <ellipse cx="100" cy="110" rx="2" ry="4" fill="#fff" opacity="0.08"/>`
      : `<path d="M97 102 Q95 113 91 116 Q96 120 100 118 Q104 120 109 116 Q105 113 103 102" fill="none" stroke="${shade(c.skin, 0.28)}" stroke-width="1.6" stroke-linecap="round"/>`}
    ${beard(c)}
    <g class="mouth">${mouth(m, c.lips || shade(c.skin, 0.3), c.lashes)}</g>
    ${hairFront(c)}
    ${headwear(c)}
    ${earrings(c)}
    ${glasses}
  </g>
</svg>`;
}
