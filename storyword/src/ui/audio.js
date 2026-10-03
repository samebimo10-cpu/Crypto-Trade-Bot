// Ambient score, synthesised with the Web Audio API so the game needs no
// audio files and still plays offline. Each mood is a slow pad of a few
// detuned voices through a low-pass filter; switching mood crossfades.
// Browsers only allow sound after a tap, so enable() must be called from a
// click handler.

const MOODS = {
  // warm open fifths
  calm: { notes: [110, 164.81, 220, 277.18], cutoff: 900, pulse: 0.08 },
  // a low minor second that never resolves, with a slow heartbeat swell
  tension: { notes: [73.42, 77.78, 110, 155.56], cutoff: 520, pulse: 0.9 },
  // dark minor chord for night scenes
  night: { notes: [98, 116.54, 146.83, 196], cutoff: 650, pulse: 0.15 },
};

let ctx = null;
let master = null;
let voices = null;
let current = null;

export function isOn() {
  return Boolean(ctx);
}

export function enable(mood = 'calm') {
  if (ctx) return;
  const AC = globalThis.AudioContext || globalThis.webkitAudioContext;
  if (!AC) return;
  ctx = new AC();
  master = ctx.createGain();
  master.gain.value = 0;
  master.connect(ctx.destination);
  master.gain.linearRampToValueAtTime(0.06, ctx.currentTime + 2);
  current = null;
  setMood(mood);
}

export function disable() {
  if (!ctx) return;
  const c = ctx;
  master.gain.cancelScheduledValues(c.currentTime);
  master.gain.linearRampToValueAtTime(0, c.currentTime + 0.6);
  setTimeout(() => c.close().catch(() => {}), 800);
  ctx = null;
  master = null;
  voices = null;
  current = null;
}

export function setMood(mood) {
  if (!ctx || mood === current || !MOODS[mood]) return;
  current = mood;
  const spec = MOODS[mood];
  const now = ctx.currentTime;
  if (voices) {
    const old = voices;
    old.out.gain.linearRampToValueAtTime(0, now + 2.5);
    setTimeout(() => old.stop(), 2800);
  }
  voices = pad(spec, now);
}

function pad(spec, now) {
  const out = ctx.createGain();
  out.gain.value = 0;
  out.gain.linearRampToValueAtTime(1, now + 3);
  const filter = ctx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.value = spec.cutoff;
  filter.Q.value = 0.7;
  filter.connect(out);
  out.connect(master);

  // A slow swell on the filter: barely there when calm, a heartbeat when tense.
  const lfo = ctx.createOscillator();
  const lfoGain = ctx.createGain();
  lfo.frequency.value = spec.pulse;
  lfoGain.gain.value = spec.cutoff * 0.35;
  lfo.connect(lfoGain).connect(filter.frequency);
  lfo.start(now);

  const oscs = [lfo];
  spec.notes.forEach((f, i) => {
    for (const detune of [-6, 6]) {
      const o = ctx.createOscillator();
      o.type = i === 0 ? 'sine' : 'triangle';
      o.frequency.value = f;
      o.detune.value = detune;
      const g = ctx.createGain();
      g.gain.value = i === 0 ? 0.5 : 0.22;
      o.connect(g).connect(filter);
      o.start(now);
      oscs.push(o);
    }
  });
  return {
    out,
    stop() {
      for (const o of oscs) {
        try {
          o.stop();
        } catch {
          /* already stopped */
        }
      }
      out.disconnect();
    },
  };
}
