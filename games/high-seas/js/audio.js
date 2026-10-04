/* High Seas — fully synthesised sound: ocean, wind, cannon, bells and a sea shanty.
   Nothing is downloaded, so it works offline. */
(function () {
  const HS = (window.HS = window.HS || {});

  const A = (HS.Audio = {
    ctx: null, master: null, sfx: null, musicGain: null, enabled: true, musicOn: true,
    noise: null, ocean: null, wind: null, nextNote: 0, noteIdx: 0, musicTimer: null,

    init() {
      if (this.ctx) { if (this.ctx.state === 'suspended') this.ctx.resume(); return; }
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) { this.enabled = false; return; }
      const ctx = (this.ctx = new AC());
      this.master = ctx.createGain(); this.master.gain.value = 0.8; this.master.connect(ctx.destination);
      this.sfx = ctx.createGain(); this.sfx.gain.value = 0.9; this.sfx.connect(this.master);
      this.musicGain = ctx.createGain(); this.musicGain.gain.value = this.musicOn ? 0.16 : 0; this.musicGain.connect(this.master);

      // two seconds of white noise, reused by every noisy sound
      const len = ctx.sampleRate * 2;
      const buf = ctx.createBuffer(1, len, ctx.sampleRate);
      const d = buf.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
      this.noise = buf;

      this.ocean = this._loop(380, 0.6, 'lowpass');
      this.wind = this._loop(900, 1.2, 'bandpass');
      this.ocean.gain.gain.value = 0.18;
      this.wind.gain.gain.value = 0.02;
      // slow swell on the ocean bed
      const lfo = ctx.createOscillator(); lfo.frequency.value = 0.11;
      const lg = ctx.createGain(); lg.gain.value = 0.08;
      lfo.connect(lg).connect(this.ocean.gain.gain); lfo.start();
      this._startMusic();
    },
    _loop(freq, q, type) {
      const ctx = this.ctx;
      const src = ctx.createBufferSource(); src.buffer = this.noise; src.loop = true;
      const f = ctx.createBiquadFilter(); f.type = type; f.frequency.value = freq; f.Q.value = q;
      const g = ctx.createGain(); g.gain.value = 0;
      src.connect(f).connect(g).connect(this.master); src.start();
      return { src, filter: f, gain: g };
    },
    setAmbient(windKn, storm, inPort) {
      if (!this.ctx) return;
      const t = this.ctx.currentTime;
      const w = HS.clamp(windKn / 45, 0, 1);
      this.wind.gain.gain.setTargetAtTime(inPort ? 0.01 : 0.015 + w * 0.12 + (storm ? 0.08 : 0), t, 0.8);
      this.wind.filter.frequency.setTargetAtTime(600 + w * 900, t, 1);
      this.ocean.filter.frequency.setTargetAtTime(inPort ? 260 : 320 + w * 300, t, 1);
    },
    _env(node, t, peak, attack, decay) {
      node.gain.setValueAtTime(0.0001, t);
      node.gain.exponentialRampToValueAtTime(peak, t + attack);
      node.gain.exponentialRampToValueAtTime(0.0001, t + attack + decay);
    },
    _pan(p) {
      if (this.ctx.createStereoPanner) { const s = this.ctx.createStereoPanner(); s.pan.value = HS.clamp(p, -1, 1); return s; }
      return this.ctx.createGain();
    },
    cannon(vol = 1, pan = 0, heavy = false) {
      if (!this.ctx || vol < 0.02) return;
      const ctx = this.ctx, t = ctx.currentTime + Math.random() * 0.03;
      const out = this._pan(pan); out.connect(this.sfx);
      const n = ctx.createBufferSource(); n.buffer = this.noise; n.playbackRate.value = heavy ? 0.6 : 0.8;
      const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.setValueAtTime(heavy ? 1400 : 2200, t); f.frequency.exponentialRampToValueAtTime(120, t + 0.9);
      const g = ctx.createGain(); this._env(g, t, 0.9 * vol, 0.005, heavy ? 1.6 : 1.1);
      n.connect(f).connect(g).connect(out); n.start(t, Math.random()); n.stop(t + 2);
      const o = ctx.createOscillator(); o.type = 'sine'; o.frequency.setValueAtTime(heavy ? 70 : 95, t); o.frequency.exponentialRampToValueAtTime(30, t + 0.6);
      const og = ctx.createGain(); this._env(og, t, 0.8 * vol, 0.004, 0.7);
      o.connect(og).connect(out); o.start(t); o.stop(t + 0.8);
    },
    splash(vol = 0.5, pan = 0) {
      if (!this.ctx || vol < 0.02) return;
      const ctx = this.ctx, t = ctx.currentTime;
      const out = this._pan(pan); out.connect(this.sfx);
      const n = ctx.createBufferSource(); n.buffer = this.noise;
      const f = ctx.createBiquadFilter(); f.type = 'bandpass'; f.frequency.setValueAtTime(1800, t); f.frequency.exponentialRampToValueAtTime(400, t + 0.5); f.Q.value = 0.8;
      const g = ctx.createGain(); this._env(g, t, 0.35 * vol, 0.01, 0.55);
      n.connect(f).connect(g).connect(out); n.start(t, Math.random()); n.stop(t + 0.8);
    },
    crunch(vol = 0.6, pan = 0) {
      if (!this.ctx || vol < 0.02) return;
      const ctx = this.ctx, t = ctx.currentTime;
      const out = this._pan(pan); out.connect(this.sfx);
      const n = ctx.createBufferSource(); n.buffer = this.noise; n.playbackRate.value = 0.5;
      const f = ctx.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 500; f.Q.value = 2;
      const g = ctx.createGain(); this._env(g, t, 0.7 * vol, 0.002, 0.3);
      n.connect(f).connect(g).connect(out); n.start(t, Math.random()); n.stop(t + 0.4);
    },
    bell(times = 2) {
      if (!this.ctx) return;
      const ctx = this.ctx;
      for (let i = 0; i < times; i++) {
        const t = ctx.currentTime + i * (i % 2 ? 0.25 : 0.55);
        [1, 2.76, 5.4].forEach((m, k) => {
          const o = ctx.createOscillator(); o.frequency.value = 880 * m * 0.5;
          const g = ctx.createGain(); this._env(g, t, [0.25, 0.1, 0.05][k], 0.003, 1.6);
          o.connect(g).connect(this.sfx); o.start(t); o.stop(t + 1.8);
        });
      }
    },
    thunder() {
      if (!this.ctx) return;
      const ctx = this.ctx, t = ctx.currentTime + 0.3 + Math.random() * 1.2;
      const n = ctx.createBufferSource(); n.buffer = this.noise; n.playbackRate.value = 0.25;
      const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 300;
      const g = ctx.createGain(); this._env(g, t, 0.9, 0.05, 3.2);
      n.connect(f).connect(g).connect(this.sfx); n.start(t); n.stop(t + 4);
    },
    coins() {
      if (!this.ctx) return;
      const ctx = this.ctx;
      for (let i = 0; i < 6; i++) {
        const t = ctx.currentTime + i * 0.06 + Math.random() * 0.03;
        const o = ctx.createOscillator(); o.type = 'triangle'; o.frequency.value = 1800 + Math.random() * 1600;
        const g = ctx.createGain(); this._env(g, t, 0.08, 0.002, 0.18);
        o.connect(g).connect(this.sfx); o.start(t); o.stop(t + 0.25);
      }
    },
    click() {
      if (!this.ctx) return;
      const ctx = this.ctx, t = ctx.currentTime;
      const o = ctx.createOscillator(); o.type = 'square'; o.frequency.value = 520;
      const g = ctx.createGain(); this._env(g, t, 0.04, 0.001, 0.05);
      o.connect(g).connect(this.sfx); o.start(t); o.stop(t + 0.08);
    },
    toggleMusic() {
      this.musicOn = !this.musicOn;
      if (this.musicGain) this.musicGain.gain.setTargetAtTime(this.musicOn ? 0.16 : 0, this.ctx.currentTime, 0.3);
      return this.musicOn;
    },

    // "What Shall We Do with the Drunken Sailor" — traditional, public domain.
    _song: (() => {
      const N = { C4: 261.63, D4: 293.66, E4: 329.63, F4: 349.23, G4: 392, A4: 440, B4: 493.88, C5: 523.25, D5: 587.33 };
      const verse = 'A4:2 A4:1 A4:1 A4:2 A4:1 A4:1 A4:2 D4:2 F4:2 A4:2 G4:2 G4:1 G4:1 G4:2 G4:1 G4:1 G4:2 C4:2 E4:2 G4:2 A4:2 A4:1 A4:1 A4:2 A4:1 A4:1 A4:2 B4:2 C5:2 D5:2 C5:2 A4:2 G4:2 E4:2 D4:4 D4:4';
      const chorus = 'A4:4 A4:4 A4:2 D4:2 F4:2 A4:2 G4:4 G4:4 G4:2 C4:2 E4:2 G4:2 A4:4 A4:4 A4:2 B4:2 C5:2 D5:2 C5:2 A4:2 G4:2 E4:2 D4:4 D4:4';
      return (verse + ' ' + chorus).split(' ').map((s) => { const [n, d] = s.split(':'); return [N[n], +d]; });
    })(),
    _startMusic() {
      const ctx = this.ctx;
      this.nextNote = ctx.currentTime + 0.5;
      const eighth = 0.19;
      this.musicTimer = setInterval(() => {
        if (!this.musicOn) { this.nextNote = ctx.currentTime + 0.2; return; }
        while (this.nextNote < ctx.currentTime + 0.4) {
          const [f, d] = this._song[this.noteIdx % this._song.length];
          const t = this.nextNote, dur = d * eighth;
          // squeezebox: two detuned saws through a lowpass
          [1, 1.004].forEach((m) => {
            const o = ctx.createOscillator(); o.type = 'sawtooth'; o.frequency.value = f * m;
            const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 1400;
            const g = ctx.createGain();
            g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.18, t + 0.03);
            g.gain.setValueAtTime(0.16, t + dur * 0.8); g.gain.exponentialRampToValueAtTime(0.0001, t + dur * 0.98);
            o.connect(lp).connect(g).connect(this.musicGain); o.start(t); o.stop(t + dur);
          });
          // bass on the beat
          if (this.noteIdx % 2 === 0) {
            const bassF = (this.noteIdx % 16) >= 8 && (this.noteIdx % 32) < 16 ? 65.41 : 73.42;
            const o = ctx.createOscillator(); o.type = 'triangle'; o.frequency.value = bassF;
            const g = ctx.createGain(); this._env(g, t, 0.35, 0.01, eighth * 1.6);
            o.connect(g).connect(this.musicGain); o.start(t); o.stop(t + eighth * 2);
          }
          this.nextNote += dur;
          this.noteIdx++;
        }
      }, 100);
    },
  });
})();
