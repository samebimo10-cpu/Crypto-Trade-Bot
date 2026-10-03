// The game's score, sound effects and ambience, all synthesised live with the
// Web Audio API: no audio files, so it works offline and in the single-file
// build.
//
//   Music:    a small step sequencer plays one of several cues (title, romance,
//             tension, danger, night, sorrow, triumph, calm) built from taiko-
//             style drums, a talking drum, string ostinatos, brass swells, a
//             choir pad and kora-like plucked strings (Karplus-Strong).
//   SFX:      one-shot sounds for taps, choices, puzzle results, secrets and
//             story beats (thunder, gunshots, glass, heartbeat...).
//   Ambience: continuous rain, wind, waves, crickets or fire under the music.
//
// Everything is voiced above ~150 Hz as well as below, so phone speakers
// (which can't play deep bass) still carry it. Browsers only allow audio
// after a tap: call unlock() from a click handler.

export const MUSIC = ['title', 'romance', 'tension', 'danger', 'night', 'sorrow', 'triumph', 'calm', 'mystic'];
export const SFX = [
  'tap', 'select', 'letter', 'correct', 'bonus', 'wrong', 'solved', 'secret', 'keepsake', 'page', 'phone',
  'thunder', 'gunshot', 'heartbeat', 'splash', 'glass', 'knock', 'door', 'fire', 'engine',
  'sting_death', 'sting_romance', 'sting_reveal', 'swell', 'whisper', 'chime',
];
export const AMBIENCE = ['rain', 'storm', 'wind', 'waves', 'crickets', 'fire'];

let ctx = null;
let master, musicBus, sfxBus, ambBus, verbSend;
let enabled = false;
let silentEl = null;
const seq = { mood: null, timer: null, next: 0, step: 0 };
const amb = { kind: null, nodes: null, timer: null };
const ksCache = new Map();
let noise = null;
let analyser = null;

const midi = (m) => 440 * 2 ** ((m - 69) / 12);

export function isOn() {
  return enabled;
}

// Call from inside a tap/click handler.
export function unlock() {
  enabled = true;
  if (!ctx) create();
  if (!ctx) return;
  ctx.resume?.().catch?.(() => {});
  unlockIOS();
  if (seq.pending) {
    const m = seq.pending;
    seq.pending = null;
    playMusic(m);
  }
  if (amb.pending) {
    const a = amb.pending;
    amb.pending = null;
    setAmbience(a);
  }
}

export function disable() {
  enabled = false;
  stopMusic();
  stopAmbience();
  try {
    silentEl?.pause();
  } catch {
    /* ignore */
  }
  ctx?.suspend?.().catch?.(() => {});
}

// iPhones mute Web Audio when the ringer switch is on silent, unless an
// HTML media element is playing. A looping silent WAV switches the page to
// the "playback" audio session so the score is heard.
function unlockIOS() {
  if (silentEl || typeof Audio === 'undefined') return;
  try {
    const rate = 8000;
    const n = rate / 2;
    const buf = new ArrayBuffer(44 + n);
    const v = new DataView(buf);
    const w = (o, s) => [...s].forEach((c, i) => v.setUint8(o + i, c.charCodeAt(0)));
    w(0, 'RIFF'); v.setUint32(4, 36 + n, true); w(8, 'WAVE'); w(12, 'fmt ');
    v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, 1, true);
    v.setUint32(24, rate, true); v.setUint32(28, rate, true); v.setUint16(32, 1, true); v.setUint16(34, 8, true);
    w(36, 'data'); v.setUint32(40, n, true);
    for (let i = 0; i < n; i++) v.setUint8(44 + i, 128);
    silentEl = new Audio(URL.createObjectURL(new Blob([buf], { type: 'audio/wav' })));
    silentEl.loop = true;
    silentEl.setAttribute('playsinline', '');
    silentEl.play()?.catch?.(() => {});
  } catch {
    /* not essential */
  }
}

function create() {
  const AC = globalThis.AudioContext || globalThis.webkitAudioContext;
  if (!AC) return;
  ctx = new AC();
  const comp = ctx.createDynamicsCompressor();
  comp.threshold.value = -14;
  comp.ratio.value = 4;
  comp.connect(ctx.destination);
  master = ctx.createGain();
  master.gain.value = 0.9;
  master.connect(comp);
  analyser = ctx.createAnalyser();
  analyser.fftSize = 2048;
  comp.connect(analyser);
  musicBus = bus(0.42);
  sfxBus = bus(0.75);
  ambBus = bus(0.3);
  const verb = ctx.createConvolver();
  verb.buffer = impulse(2.8, 2.2);
  verbSend = ctx.createGain();
  verbSend.gain.value = 0.35;
  verbSend.connect(verb).connect(master);
  noise = makeNoise(2);
}

function bus(level) {
  const g = ctx.createGain();
  g.gain.value = level;
  g.connect(master);
  return g;
}

function impulse(seconds, decay) {
  const len = Math.floor(ctx.sampleRate * seconds);
  const b = ctx.createBuffer(2, len, ctx.sampleRate);
  for (let ch = 0; ch < 2; ch++) {
    const d = b.getChannelData(ch);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len) ** decay;
  }
  return b;
}

function makeNoise(seconds) {
  const len = Math.floor(ctx.sampleRate * seconds);
  const b = ctx.createBuffer(1, len, ctx.sampleRate);
  const d = b.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
  return b;
}

// --- Instruments ------------------------------------------------------------

function env(g, t, peak, attack, decay, hold = 0) {
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(peak, t + attack);
  if (hold) g.gain.setValueAtTime(peak, t + attack + hold);
  g.gain.exponentialRampToValueAtTime(0.0001, t + attack + hold + decay);
}

function wet(node, amount = 1) {
  if (amount <= 0) return;
  const s = ctx.createGain();
  s.gain.value = amount;
  node.connect(s).connect(verbSend);
}

function noiseBurst(t, dur, { type = 'bandpass', freq = 1000, q = 1, gain = 0.5, dest = sfxBus, attack = 0.005, sweepTo = null, verb = 0.3 } = {}) {
  const src = ctx.createBufferSource();
  src.buffer = noise;
  const f = ctx.createBiquadFilter();
  f.type = type;
  f.frequency.setValueAtTime(freq, t);
  if (sweepTo) f.frequency.exponentialRampToValueAtTime(sweepTo, t + dur);
  f.Q.value = q;
  const g = ctx.createGain();
  env(g, t, gain, attack, dur);
  src.connect(f).connect(g).connect(dest);
  wet(g, verb);
  src.start(t, Math.random() * 1.5);
  src.stop(t + attack + dur + 0.05);
}

// Taiko-style drum: a pitched body plus a skin slap the phone speaker can carry.
function drum(t, { f0 = 140, f1 = 50, dur = 0.7, gain = 0.9, dest = musicBus } = {}) {
  const o = ctx.createOscillator();
  o.type = 'sine';
  o.frequency.setValueAtTime(f0, t);
  o.frequency.exponentialRampToValueAtTime(f1, t + dur * 0.6);
  const g = ctx.createGain();
  env(g, t, gain, 0.004, dur);
  o.connect(g).connect(dest);
  wet(g, 0.4);
  o.start(t);
  o.stop(t + dur + 0.05);
  const o2 = ctx.createOscillator();
  o2.type = 'triangle';
  o2.frequency.setValueAtTime(f0 * 2.3, t);
  o2.frequency.exponentialRampToValueAtTime(f0 * 1.1, t + 0.08);
  const g2 = ctx.createGain();
  env(g2, t, gain * 0.6, 0.002, 0.16);
  o2.connect(g2).connect(dest);
  o2.start(t);
  o2.stop(t + 0.2);
  noiseBurst(t, 0.09, { type: 'lowpass', freq: 1800, gain: gain * 0.35, dest, verb: 0.2 });
  // The "skin": a mid-range thump so phones hear the hit, not just feel it.
  noiseBurst(t, 0.14, { type: 'bandpass', freq: f0 * 3, q: 2.5, gain: gain * 0.7, dest, verb: 0.3, attack: 0.002 });
}

// Talking drum: a pitch glide, the voice of West African percussion.
function talkingDrum(t, from, to, { gain = 0.5, dest = musicBus } = {}) {
  for (const [mult, lvl] of [[1, 1], [2, 0.35], [3.1, 0.12]]) {
    const o = ctx.createOscillator();
    o.type = 'sine';
    o.frequency.setValueAtTime(from * mult, t);
    o.frequency.exponentialRampToValueAtTime(to * mult, t + 0.16);
    const g = ctx.createGain();
    env(g, t, gain * lvl, 0.003, 0.32);
    o.connect(g).connect(dest);
    o.start(t);
    o.stop(t + 0.4);
  }
  noiseBurst(t, 0.03, { type: 'highpass', freq: 2500, gain: gain * 0.2, dest, verb: 0 });
}

// Plucked string (kora / harp) via Karplus-Strong, rendered once per pitch.
function ksBuffer(freq) {
  const key = Math.round(freq * 10);
  if (ksCache.has(key)) return ksCache.get(key);
  const sr = ctx.sampleRate;
  const len = Math.floor(sr * 1.8);
  const b = ctx.createBuffer(1, len, sr);
  const d = b.getChannelData(0);
  const period = Math.max(2, Math.round(sr / freq));
  for (let i = 0; i < period; i++) d[i] = Math.random() * 2 - 1;
  for (let i = period; i < len; i++) d[i] = 0.4985 * (d[i - period] + d[i - period + 1]);
  ksCache.set(key, b);
  return b;
}

function pluck(t, freq, { gain = 0.4, dest = musicBus, verb = 0.5 } = {}) {
  const src = ctx.createBufferSource();
  src.buffer = ksBuffer(freq);
  const g = ctx.createGain();
  g.gain.value = gain;
  const f = ctx.createBiquadFilter();
  f.type = 'lowpass';
  f.frequency.value = Math.min(9000, freq * 7);
  src.connect(f).connect(g).connect(dest);
  wet(g, verb);
  src.start(t);
}

function strings(t, freq, dur, { gain = 0.18, attack = 0.06, cutoff = 1800, dest = musicBus, verb = 0.6 } = {}) {
  const f = ctx.createBiquadFilter();
  f.type = 'lowpass';
  f.frequency.value = cutoff;
  f.Q.value = 0.8;
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.linearRampToValueAtTime(gain, t + attack);
  g.gain.setValueAtTime(gain, t + Math.max(attack, dur - 0.15));
  g.gain.linearRampToValueAtTime(0.0001, t + dur + 0.25);
  f.connect(g).connect(dest);
  wet(g, verb);
  for (const det of [-8, 7]) {
    const o = ctx.createOscillator();
    o.type = 'sawtooth';
    o.frequency.value = freq;
    o.detune.value = det;
    o.connect(f);
    o.start(t);
    o.stop(t + dur + 0.3);
  }
}

function brass(t, freqs, dur, { gain = 0.11, dest = musicBus } = {}) {
  for (const freq of freqs) {
    const f = ctx.createBiquadFilter();
    f.type = 'lowpass';
    f.frequency.setValueAtTime(250, t);
    f.frequency.linearRampToValueAtTime(2600, t + Math.min(0.9, dur * 0.4));
    f.frequency.linearRampToValueAtTime(900, t + dur);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(gain, t + 0.25);
    g.gain.setValueAtTime(gain, t + dur - 0.3);
    g.gain.linearRampToValueAtTime(0.0001, t + dur + 0.4);
    const o = ctx.createOscillator();
    o.type = 'sawtooth';
    o.frequency.value = freq;
    o.connect(f).connect(g).connect(dest);
    wet(g, 0.7);
    o.start(t);
    o.stop(t + dur + 0.5);
  }
}

// "Aah" choir: sawtooth chords through two vowel formants.
function choir(t, freqs, dur, { gain = 0.07, dest = musicBus } = {}) {
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.linearRampToValueAtTime(gain, t + 1.2);
  g.gain.setValueAtTime(gain, t + dur - 0.8);
  g.gain.linearRampToValueAtTime(0.0001, t + dur + 0.6);
  g.connect(dest);
  wet(g, 1);
  for (const [fc, q, lvl] of [[730, 6, 1], [1090, 8, 0.6]]) {
    const bp = ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.value = fc;
    bp.Q.value = q;
    const lg = ctx.createGain();
    lg.gain.value = lvl;
    bp.connect(lg).connect(g);
    for (const freq of freqs) {
      for (const det of [-10, 10]) {
        const o = ctx.createOscillator();
        o.type = 'sawtooth';
        o.frequency.value = freq;
        o.detune.value = det;
        o.connect(bp);
        o.start(t);
        o.stop(t + dur + 0.7);
      }
    }
  }
}

function bell(t, freq, { gain = 0.25, dur = 2.4, dest = musicBus } = {}) {
  for (const [ratio, lvl] of [[1, 1], [2.76, 0.45], [5.4, 0.25], [8.93, 0.12]]) {
    const o = ctx.createOscillator();
    o.type = 'sine';
    o.frequency.value = freq * ratio;
    const g = ctx.createGain();
    env(g, t, gain * lvl, 0.003, dur / ratio ** 0.5);
    o.connect(g).connect(dest);
    wet(g, 0.6);
    o.start(t);
    o.stop(t + dur + 0.1);
  }
}

function hat(t, gain = 0.08, dest = musicBus) {
  noiseBurst(t, 0.05, { type: 'highpass', freq: 7000, gain, dest, verb: 0.1, attack: 0.002 });
}

function swell(t, dur = 1.6, gain = 0.25, dest = musicBus) {
  const src = ctx.createBufferSource();
  src.buffer = noise;
  const f = ctx.createBiquadFilter();
  f.type = 'highpass';
  f.frequency.value = 4000;
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(gain, t + dur);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur + 0.15);
  src.connect(f).connect(g).connect(dest);
  wet(g, 0.6);
  src.start(t);
  src.stop(t + dur + 0.2);
}

// --- The score -------------------------------------------------------------

const D = 62; // D4
const CHORDS_DM = [
  [D - 12, D - 5, D, D + 3], // Dm
  [D - 16, D - 9, D - 4, D], // Bb
  [D - 14, D - 7, D - 2, D + 2], // C
  [D - 17, D - 10, D - 5, D - 1], // A
];

const CUES = {
  title: {
    bpm: 76,
    step(s, t, bar) {
      const beat = s % 16;
      if (beat === 0) drum(t, { f0: 150, gain: 1 });
      if (beat === 6 || beat === 10) drum(t, { f0: 180, gain: 0.6 });
      if (beat === 12 && bar % 2) drum(t, { f0: 210, gain: 0.5 });
      if (s % 2 === 0) {
        const ost = [D - 12, D - 12, D - 5, D - 12, D - 9, D - 12, D - 5, D - 2];
        strings(t, midi(ost[(s / 2) % 8] + (bar % 4 === 3 ? -1 : 0)), 0.22, { gain: 0.13, cutoff: 1400, attack: 0.02 });
      }
      if (beat === 0) brass(t, CHORDS_DM[bar % 4].map(midi), 3.4, { gain: 0.07 });
      if (beat === 0 && bar % 2 === 0) choir(t, CHORDS_DM[bar % 4].slice(1).map((m) => midi(m + 12)), 6.5, { gain: 0.05 });
      const mel = { 0: 74, 3: 77, 6: 79, 8: 81, 12: 79, 14: 77 };
      if (bar % 4 >= 2 && mel[beat]) pluck(t, midi(mel[beat] - (bar % 4 === 3 ? 2 : 0)), { gain: 0.35 });
    },
  },
  romance: {
    bpm: 66,
    step(s, t, bar) {
      const chords = [[65, 69, 72, 76], [62, 65, 69, 72], [58, 62, 65, 69], [60, 64, 67, 70]];
      const c = chords[bar % 4];
      const beat = s % 16;
      if (beat === 0) {
        strings(t, midi(c[0] - 12), 3.6, { gain: 0.09, attack: 0.9, cutoff: 1300 });
        strings(t, midi(c[2]), 3.6, { gain: 0.06, attack: 1.1, cutoff: 1600 });
        strings(t, midi(c[3]), 3.6, { gain: 0.05, attack: 1.2, cutoff: 1800 });
      }
      if (s % 2 === 0) {
        const arp = [0, 1, 2, 3, 2, 1, 2, 3];
        pluck(t, midi(c[arp[(s / 2) % 8]] + 12), { gain: 0.24 });
      }
      if (beat === 4 || beat === 12) hat(t, 0.03);
      if (beat === 0 && bar % 4 === 0) bell(t, midi(c[3] + 12), { gain: 0.12 });
    },
  },
  tension: {
    bpm: 84,
    step(s, t, bar) {
      const beat = s % 16;
      if (beat === 0 || beat === 8) drum(t, { f0: 120, f1: 55, gain: 0.8, dur: 0.4 });
      if (beat === 2 || beat === 10) drum(t, { f0: 105, f1: 50, gain: 0.55, dur: 0.35 });
      strings(t, midi(s % 2 ? 53 : 52), 0.11, { gain: 0.06, cutoff: 1000, attack: 0.01, verb: 0.3 });
      if (beat === 0 && bar % 2 === 0) {
        const o = ctx.createOscillator();
        o.type = 'sine';
        o.frequency.value = midi(83);
        const g = ctx.createGain();
        g.gain.setValueAtTime(0.0001, t);
        g.gain.linearRampToValueAtTime(0.05, t + 2.5);
        g.gain.linearRampToValueAtTime(0.0001, t + 5.5);
        o.connect(g).connect(musicBus);
        wet(g, 1);
        o.start(t);
        o.stop(t + 5.6);
      }
      if (beat % 4 === 0) hat(t, 0.05);
      if (beat === 0 && bar % 4 === 3) swell(t, 2.6, 0.12);
      if (beat === 0 && bar % 4 === 0) choir(t, [midi(52), midi(53), midi(59)], 7, { gain: 0.035 });
    },
  },
  danger: {
    bpm: 128,
    step(s, t, bar) {
      const beat = s % 16;
      if (beat === 0 || beat === 8 || beat === 11) drum(t, { f0: 160, gain: 0.9, dur: 0.5 });
      const td = { 2: [220, 150], 5: [190, 240], 6: [200, 140], 13: [240, 160], 14: [180, 260] };
      if (td[beat]) talkingDrum(t, ...td[beat], { gain: 0.45 });
      const ost = [52, 52, 55, 52, 59, 52, 57, 55];
      strings(t, midi(ost[s % 8] - (bar % 2 ? 2 : 0)), 0.1, { gain: 0.12, cutoff: 2200, attack: 0.008, verb: 0.25 });
      if (s % 2 === 0) hat(t, 0.06);
      if (beat === 0) brass(t, [midi(52), midi(59), midi(64), midi(67)], 0.6, { gain: 0.1 });
      if (beat === 8 && bar % 2) brass(t, [midi(50), midi(57), midi(62), midi(66)], 0.5, { gain: 0.09 });
      if (beat === 0 && bar % 4 === 3) swell(t, 1.8, 0.2);
    },
  },
  night: {
    bpm: 60,
    step(s, t, bar) {
      const beat = s % 16;
      if (beat === 0) strings(t, midi(bar % 2 ? 53 : 57) - 0, 3.9, { gain: 0.06, attack: 1.4, cutoff: 900 });
      if (beat === 0) strings(t, midi(bar % 2 ? 60 : 64), 3.9, { gain: 0.04, attack: 1.6, cutoff: 1100 });
      const pent = [69, 72, 74, 76, 79, 81];
      const pattern = [0, -1, -1, 3, -1, 2, -1, -1, 4, -1, -1, 1, -1, 5, -1, -1];
      if (pattern[beat] >= 0 && (bar + beat) % 3 !== 0) pluck(t, midi(pent[pattern[beat]]), { gain: 0.34, verb: 0.8 });
    },
  },
  sorrow: {
    bpm: 54,
    step(s, t, bar) {
      const beat = s % 16;
      const chords = [[50, 57, 62, 65], [55, 58, 62, 67], [57, 61, 64, 69], [50, 57, 62, 65]];
      const c = chords[bar % 4];
      if (beat === 0) {
        for (const m of c) strings(t, midi(m), 4.3, { gain: 0.05, attack: 1.2, cutoff: 1200 });
        if (bar % 2 === 0) bell(t, midi(50 + 12), { gain: 0.14, dur: 4 });
      }
      const mel = [74, 72, 69, 65, 67, 69, 70, 69];
      if (beat === 0 || beat === 8) strings(t, midi(mel[(bar * 2 + beat / 8) % 8]), 2, { gain: 0.07, attack: 0.4, cutoff: 2600 });
    },
  },
  triumph: {
    bpm: 96,
    step(s, t, bar) {
      const beat = s % 16;
      const chords = [[62, 66, 69], [67, 71, 74], [69, 73, 76], [62, 66, 69]];
      const c = chords[bar % 4];
      if (beat % 4 === 0) drum(t, { f0: beat === 0 ? 150 : 190, gain: beat === 0 ? 1 : 0.6, dur: 0.5 });
      if (beat === 0) brass(t, c.map((m) => midi(m - 12)), 2.4, { gain: 0.09 });
      if (beat === 0) choir(t, c.map(midi), 2.6, { gain: 0.05 });
      if (s % 2 === 0) pluck(t, midi(c[(s / 2) % 3] + 12), { gain: 0.25 });
      if (s % 2) hat(t, 0.04);
      if (beat === 7 || beat === 15) talkingDrum(t, 200, 260, { gain: 0.35 });
    },
  },
  calm: {
    bpm: 72,
    step(s, t, bar) {
      const beat = s % 16;
      if (beat === 0) strings(t, midi(bar % 2 ? 57 : 62), 3.3, { gain: 0.05, attack: 1, cutoff: 1100 });
      const pent = [74, 76, 79, 81, 84];
      const pattern = [0, -1, 2, -1, 1, -1, 3, -1, 2, -1, 4, -1, 3, -1, 1, -1];
      if (pattern[beat] >= 0 && !(bar % 2 && beat > 8)) pluck(t, midi(pent[pattern[beat]]), { gain: 0.32 });
      if (beat === 4 || beat === 12) hat(t, 0.02);
    },
  },
  // The dream river: a slow modal choir, distant bells and a kora that
  // circles but never resolves.
  mystic: {
    bpm: 58,
    step(s, t, bar) {
      const beat = s % 16;
      const chords = [[50, 57, 62, 64], [48, 55, 62, 64], [46, 53, 60, 62], [48, 55, 59, 64]];
      const c = chords[bar % 4];
      if (beat === 0) {
        choir(t, c.slice(1).map((m) => midi(m + 12)), 4.6, { gain: 0.06 });
        strings(t, midi(c[0]), 4.4, { gain: 0.05, attack: 1.6, cutoff: 800 });
      }
      if (beat === 0 && bar % 2 === 0) bell(t, midi(74 + (bar % 4 ? 3 : 0)), { gain: 0.11, dur: 5 });
      if (beat === 8 && bar % 4 === 3) bell(t, midi(81), { gain: 0.07, dur: 4 });
      const dor = [74, 76, 77, 81, 83, 86];
      const pattern = [0, -1, -1, 2, -1, -1, 4, -1, 3, -1, -1, 1, -1, 5, -1, -1];
      if (pattern[beat] >= 0 && (bar + beat) % 4 !== 1) pluck(t, midi(dor[pattern[beat]]), { gain: 0.26, verb: 0.9 });
    },
  },
};

export function playMusic(mood) {
  if (!MUSIC.includes(mood)) return;
  if (!enabled || !ctx) {
    seq.pending = mood;
    return;
  }
  if (seq.mood === mood && seq.timer) return;
  const fadeOut = seq.timer != null;
  stopMusic(fadeOut);
  seq.mood = mood;
  seq.step = 0;
  seq.next = ctx.currentTime + (fadeOut ? 0.5 : 0.08);
  seq.out = musicBus;
  musicBus.gain.cancelScheduledValues(ctx.currentTime);
  musicBus.gain.setValueAtTime(0.0001, seq.next - 0.05);
  musicBus.gain.linearRampToValueAtTime(0.42, seq.next + 1.5);
  seq.timer = setInterval(tick, 25);
}

function tick() {
  if (!ctx) return;
  const cue = CUES[seq.mood];
  const stepDur = 60 / cue.bpm / 4;
  while (seq.next < ctx.currentTime + 0.15) {
    try {
      cue.step(seq.step, seq.next, Math.floor(seq.step / 16));
    } catch {
      /* a single bad note shouldn't stop the score */
    }
    seq.next += stepDur;
    seq.step++;
  }
}

function stopMusic(fade = true) {
  if (seq.timer) clearInterval(seq.timer);
  seq.timer = null;
  seq.mood = null;
  if (ctx && fade) {
    // Fade the old notes out by swapping in a fresh music bus.
    const old = musicBus;
    old.gain.cancelScheduledValues(ctx.currentTime);
    old.gain.setValueAtTime(old.gain.value, ctx.currentTime);
    old.gain.linearRampToValueAtTime(0.0001, ctx.currentTime + 0.45);
    setTimeout(() => old.disconnect(), 3000);
    musicBus = bus(0.42);
  }
}

// --- Ambience --------------------------------------------------------------

export function setAmbience(kind) {
  if (kind && !AMBIENCE.includes(kind)) kind = null;
  if (!enabled || !ctx) {
    amb.pending = kind;
    return;
  }
  if (kind === amb.kind) return;
  stopAmbience();
  amb.kind = kind;
  if (!kind) return;
  const src = ctx.createBufferSource();
  src.buffer = noise;
  src.loop = true;
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, ctx.currentTime);
  const f = ctx.createBiquadFilter();
  const lfo = ctx.createOscillator();
  const lfoGain = ctx.createGain();
  let level = 0.35;
  if (kind === 'rain' || kind === 'storm') {
    f.type = 'bandpass';
    f.frequency.value = 2400;
    f.Q.value = 0.4;
    level = kind === 'storm' ? 0.55 : 0.4;
    lfo.frequency.value = 0.13;
    lfoGain.gain.value = 300;
    lfo.connect(lfoGain).connect(f.frequency);
  } else if (kind === 'wind') {
    f.type = 'bandpass';
    f.frequency.value = 600;
    f.Q.value = 1.6;
    lfo.frequency.value = 0.09;
    lfoGain.gain.value = 380;
    lfo.connect(lfoGain).connect(f.frequency);
    level = 0.95;
  } else if (kind === 'waves') {
    f.type = 'lowpass';
    f.frequency.value = 1100;
    lfo.frequency.value = 0.12;
    lfoGain.gain.value = 0.3;
    lfo.connect(lfoGain).connect(g.gain);
    level = 0.4;
  } else if (kind === 'fire') {
    f.type = 'lowpass';
    f.frequency.value = 700;
    level = 0.25;
  } else if (kind === 'crickets') {
    f.type = 'highpass';
    f.frequency.value = 9000;
    level = 0.03;
  }
  src.connect(f).connect(g).connect(ambBus);
  g.gain.linearRampToValueAtTime(level, ctx.currentTime + 2);
  src.start();
  lfo.start();
  amb.nodes = { src, g, lfo };
  // Occasional events on top of the bed.
  amb.timer = setInterval(() => {
    if (!ctx || !enabled) return;
    const t = ctx.currentTime + 0.05;
    if (kind === 'storm' && Math.random() < 0.12) thunder(t, 0.7);
    if (kind === 'fire') for (let i = 0; i < 3; i++) noiseBurst(t + Math.random() * 0.8, 0.02, { type: 'highpass', freq: 3000, gain: 0.12, dest: ambBus, verb: 0 });
    if (kind === 'crickets' && Math.random() < 0.7) {
      for (let i = 0; i < 3; i++) {
        const o = ctx.createOscillator();
        o.frequency.value = 4400 + Math.random() * 200;
        const cg = ctx.createGain();
        env(cg, t + i * 0.07, 0.03, 0.005, 0.04);
        o.connect(cg).connect(ambBus);
        o.start(t + i * 0.07);
        o.stop(t + i * 0.07 + 0.06);
      }
    }
    if (kind === 'waves' && Math.random() < 0.15) noiseBurst(t, 1.6, { type: 'lowpass', freq: 2500, sweepTo: 500, gain: 0.25, dest: ambBus, attack: 0.6 });
  }, 1000);
}

function stopAmbience() {
  if (amb.timer) clearInterval(amb.timer);
  amb.timer = null;
  if (amb.nodes && ctx) {
    const { src, g, lfo } = amb.nodes;
    g.gain.cancelScheduledValues(ctx.currentTime);
    g.gain.setValueAtTime(g.gain.value, ctx.currentTime);
    g.gain.linearRampToValueAtTime(0.0001, ctx.currentTime + 1);
    setTimeout(() => {
      try {
        src.stop();
        lfo.stop();
      } catch {
        /* already stopped */
      }
    }, 1200);
  }
  amb.nodes = null;
  amb.kind = null;
}

// --- Sound effects ---------------------------------------------------------

function thunder(t, gain = 0.9) {
  noiseBurst(t, 0.15, { type: 'highpass', freq: 1500, gain: gain * 0.5, verb: 0.4 });
  noiseBurst(t + 0.05, 3.2, { type: 'lowpass', freq: 900, sweepTo: 120, gain, attack: 0.05, verb: 0.8 });
  drum(t + 0.02, { f0: 90, f1: 35, gain: gain * 0.8, dur: 1.8, dest: sfxBus });
}

const PENT = [74, 76, 79, 81, 84, 86, 88];

export function sfx(name, opts = {}) {
  if (!enabled || !ctx) return;
  const t = ctx.currentTime + 0.01;
  switch (name) {
    case 'tap':
      pluck(t, midi(81), { gain: 0.18, dest: sfxBus, verb: 0.2 });
      break;
    case 'letter':
      pluck(t, midi(PENT[(opts.index ?? 0) % PENT.length]), { gain: 0.3, dest: sfxBus, verb: 0.3 });
      break;
    case 'select':
      noiseBurst(t, 0.28, { type: 'bandpass', freq: 500, sweepTo: 3000, q: 2, gain: 0.25 });
      drum(t, { f0: 200, f1: 90, gain: 0.35, dur: 0.25, dest: sfxBus });
      break;
    case 'correct':
      bell(t, midi(84), { gain: 0.22, dur: 1.2, dest: sfxBus });
      bell(t + 0.09, midi(91), { gain: 0.18, dur: 1.4, dest: sfxBus });
      break;
    case 'bonus':
      [88, 91, 96].forEach((m, i) => bell(t + i * 0.07, midi(m), { gain: 0.14, dur: 1, dest: sfxBus }));
      break;
    case 'wrong':
      drum(t, { f0: 110, f1: 60, gain: 0.6, dur: 0.3, dest: sfxBus });
      strings(t, midi(47), 0.25, { gain: 0.1, cutoff: 900, attack: 0.01, dest: sfxBus, verb: 0.1 });
      strings(t, midi(48), 0.25, { gain: 0.1, cutoff: 900, attack: 0.01, dest: sfxBus, verb: 0.1 });
      break;
    case 'solved':
      [62, 66, 69, 74].forEach((m, i) => brass(t + i * 0.12, [midi(m)], 0.5 + (i === 3 ? 1.2 : 0), { gain: 0.12, dest: sfxBus }));
      drum(t, { f0: 160, gain: 0.8, dest: sfxBus });
      drum(t + 0.36, { f0: 160, gain: 0.9, dest: sfxBus });
      swell(t, 0.4, 0.15, sfxBus);
      bell(t + 0.36, midi(86), { gain: 0.15, dest: sfxBus });
      break;
    case 'secret':
      swell(t, 1.1, 0.22, sfxBus);
      bell(t + 1.1, midi(50 + 12), { gain: 0.35, dur: 4, dest: sfxBus });
      choir(t + 1.0, [midi(62), midi(65), midi(69)], 2.5, { gain: 0.07, dest: sfxBus });
      break;
    case 'keepsake':
      [84, 88, 91, 96, 91].forEach((m, i) => pluck(t + i * 0.13, midi(m), { gain: 0.22, dest: sfxBus, verb: 0.7 }));
      break;
    case 'page':
      noiseBurst(t, 0.12, { type: 'bandpass', freq: 3500, q: 0.8, gain: 0.25, verb: 0.1 });
      noiseBurst(t + 0.15, 0.18, { type: 'bandpass', freq: 2800, q: 0.8, gain: 0.2, verb: 0.1 });
      break;
    case 'phone':
      for (const off of [0, 0.35]) {
        const o = ctx.createOscillator();
        o.type = 'square';
        o.frequency.value = 170;
        const g = ctx.createGain();
        env(g, t + off, 0.12, 0.01, 0.22, 0.05);
        const f = ctx.createBiquadFilter();
        f.type = 'bandpass';
        f.frequency.value = 900;
        o.connect(f).connect(g).connect(sfxBus);
        o.start(t + off);
        o.stop(t + off + 0.35);
      }
      break;
    case 'thunder':
      thunder(t);
      break;
    case 'gunshot':
      noiseBurst(t, 0.12, { type: 'highpass', freq: 900, gain: 0.95, attack: 0.001, verb: 1 });
      drum(t, { f0: 160, f1: 40, gain: 0.9, dur: 0.5, dest: sfxBus });
      break;
    case 'heartbeat':
      for (const off of [0, 0.22, 0.9, 1.12]) drum(t + off, { f0: 95, f1: 45, gain: off % 0.9 ? 0.55 : 0.8, dur: 0.3, dest: sfxBus });
      break;
    case 'splash':
      noiseBurst(t, 0.9, { type: 'bandpass', freq: 3200, sweepTo: 400, q: 0.7, gain: 0.6, attack: 0.01, verb: 0.5 });
      break;
    case 'glass':
      noiseBurst(t, 0.25, { type: 'highpass', freq: 4000, gain: 0.5, attack: 0.001, verb: 0.6 });
      [3100, 4250, 5300, 6900].forEach((f, i) => bell(t + i * 0.03, f / 2.76, { gain: 0.08, dur: 0.8, dest: sfxBus }));
      break;
    case 'knock':
      for (const off of [0, 0.22, 0.44]) {
        drum(t + off, { f0: 260, f1: 180, gain: 0.5, dur: 0.12, dest: sfxBus });
      }
      break;
    case 'door': {
      const o = ctx.createOscillator();
      o.type = 'sawtooth';
      o.frequency.setValueAtTime(220, t);
      o.frequency.exponentialRampToValueAtTime(130, t + 0.9);
      const f = ctx.createBiquadFilter();
      f.type = 'bandpass';
      f.frequency.value = 900;
      f.Q.value = 6;
      const g = ctx.createGain();
      env(g, t, 0.12, 0.1, 0.8);
      o.connect(f).connect(g).connect(sfxBus);
      o.start(t);
      o.stop(t + 1);
      drum(t + 0.95, { f0: 120, f1: 60, gain: 0.6, dur: 0.4, dest: sfxBus });
      break;
    }
    case 'fire':
      for (let i = 0; i < 12; i++) noiseBurst(t + Math.random() * 1.4, 0.03, { type: 'highpass', freq: 2500, gain: 0.25, verb: 0.1 });
      noiseBurst(t, 1.6, { type: 'lowpass', freq: 600, gain: 0.35, attack: 0.3 });
      break;
    case 'engine': {
      const o = ctx.createOscillator();
      o.type = 'sawtooth';
      o.frequency.setValueAtTime(90, t);
      o.frequency.exponentialRampToValueAtTime(260, t + 1.1);
      const f = ctx.createBiquadFilter();
      f.type = 'lowpass';
      f.frequency.value = 1400;
      const g = ctx.createGain();
      env(g, t, 0.2, 0.1, 1.3);
      o.connect(f).connect(g).connect(sfxBus);
      o.start(t);
      o.stop(t + 1.5);
      break;
    }
    case 'sting_death':
      drum(t, { f0: 130, f1: 40, gain: 1, dur: 1.5, dest: sfxBus });
      brass(t, [midi(50), midi(57), midi(62), midi(65)], 2.4, { gain: 0.12, dest: sfxBus });
      bell(t, midi(50), { gain: 0.3, dur: 5, dest: sfxBus });
      choir(t + 0.3, [midi(50), midi(53), midi(57)], 3.5, { gain: 0.07, dest: sfxBus });
      break;
    case 'sting_romance':
      [65, 69, 72, 76, 77, 81, 84, 88].forEach((m, i) => pluck(t + i * 0.07, midi(m), { gain: 0.22, dest: sfxBus, verb: 0.9 }));
      for (const m of [65, 72, 76]) strings(t + 0.3, midi(m), 2.2, { gain: 0.06, attack: 0.7, cutoff: 2200, dest: sfxBus });
      break;
    case 'whisper':
      // breath through a closed door: filtered noise rising and falling
      noiseBurst(t, 1.4, { type: 'bandpass', freq: 2400, sweepTo: 4200, q: 6, gain: 0.18, attack: 0.4, verb: 0.9 });
      noiseBurst(t + 0.5, 1.1, { type: 'bandpass', freq: 3200, sweepTo: 1800, q: 7, gain: 0.12, attack: 0.3, verb: 0.9 });
      choir(t + 0.2, [midi(74), midi(75)], 2.2, { gain: 0.03, dest: sfxBus });
      break;
    case 'chime':
      [86, 93, 89, 98].forEach((m, i) => bell(t + i * 0.18, midi(m), { gain: 0.12, dur: 2.6, dest: sfxBus }));
      break;
    case 'sting_reveal':
      drum(t, { f0: 150, f1: 45, gain: 1, dur: 1, dest: sfxBus });
      brass(t, [midi(50), midi(51), midi(56), midi(57)], 1.4, { gain: 0.12, dest: sfxBus });
      noiseBurst(t, 1.2, { type: 'highpass', freq: 5000, gain: 0.25, attack: 0.002, verb: 0.9 });
      break;
    case 'swell':
      swell(t, 1.4, 0.25, sfxBus);
      break;
    default:
      break;
  }
}

// Output level, for checking the mix: overall RMS, and the share of energy
// above 200 Hz (what a phone speaker can actually reproduce).
export function meter() {
  if (!analyser) return { rms: 0, audible: 0 };
  const t = new Float32Array(analyser.fftSize);
  analyser.getFloatTimeDomainData(t);
  const rms = Math.sqrt(t.reduce((a, v) => a + v * v, 0) / t.length);
  const f = new Float32Array(analyser.frequencyBinCount);
  analyser.getFloatFrequencyData(f);
  const hz = ctx.sampleRate / analyser.fftSize;
  let lo = 0;
  let hi = 0;
  f.forEach((db, i) => {
    const p = 10 ** (db / 10);
    if (i * hz < 200) lo += p;
    else hi += p;
  });
  return { rms, audible: hi / (lo + hi || 1) };
}
