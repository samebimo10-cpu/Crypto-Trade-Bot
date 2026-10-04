/* High Seas — shot, shell, torpedo and particle effects. */
(function () {
  const HS = (window.HS = window.HS || {});

  const FX = (HS.FX = {
    shots: [], pending: [], torps: [], parts: [], MAX_PARTS: 2200,
    reset() { this.shots = []; this.pending = []; this.torps = []; this.parts = []; },

    part(o) {
      if (this.parts.length >= this.MAX_PARTS) this.parts.shift();
      o.life = o.life || 1; o.age = 0; o.vx = o.vx || 0; o.vy = o.vy || 0;
      this.parts.push(o);
      return o;
    },
    smoke(x, y, n, opts = {}) {
      for (let i = 0; i < n; i++) {
        this.part({ type: 'smoke', x: x + HS.rand(-4, 4), y: y + HS.rand(-4, 4), vx: (opts.vx || 0) + HS.rand(-8, 8), vy: (opts.vy || 0) + HS.rand(-8, 8), size: opts.size || HS.rand(6, 11), grow: opts.grow || 14, life: opts.life || HS.rand(2, 3.5), col: opts.col || 225, delay: opts.delay || 0 });
      }
    },
    splash(x, y, big = 1) {
      this.part({ type: 'ring', x, y, size: 3 * big, grow: 26 * big, life: 1.1 });
      for (let i = 0; i < 8 * big; i++) {
        const a = Math.random() * HS.TAU, v = HS.rand(10, 40) * big;
        this.part({ type: 'spray', x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, size: HS.rand(1.2, 2.6), life: HS.rand(0.4, 0.9), h: 0, vh: HS.rand(30, 70) * big });
      }
      this.part({ type: 'column', x, y, size: 4 * big, life: 0.7 });
    },
    splinters(x, y, n = 8) {
      for (let i = 0; i < n; i++) {
        const a = Math.random() * HS.TAU, v = HS.rand(20, 70);
        this.part({ type: 'splinter', x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, rot: Math.random() * 6, vr: HS.rand(-10, 10), size: HS.rand(1.5, 4), life: HS.rand(0.6, 1.3) });
      }
    },
    explosion(x, y, big = 1) {
      this.part({ type: 'flash', x, y, size: 26 * big, life: 0.25 });
      for (let i = 0; i < 10 * big; i++) {
        const a = Math.random() * HS.TAU, v = HS.rand(15, 60) * big;
        this.part({ type: 'ember', x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, size: HS.rand(1.5, 3.5), life: HS.rand(0.4, 1) });
      }
      this.smoke(x, y, 5 * big, { col: 70, size: 10 * big, grow: 20, life: 3.5 });
    },
    foam(x, y, size, life = 3) { this.part({ type: 'foam', x, y, size, grow: 6, life }); },

    addShot(o) { this.pending.push(o); },
    addShell(o) {
      this.shots.push({ x: o.x, y: o.y, vx: Math.cos(o.ang) * o.speed, vy: Math.sin(o.ang) * o.speed, dist: 0, range: o.range, dmg: o.dmg, type: 'shell', owner: o.owner, arc: 10 });
      this.part({ type: 'flash', x: o.x, y: o.y, size: 12, life: 0.12 });
      this.smoke(o.x, o.y, 2, { size: 6, life: 1.6, col: 200 });
    },
    addRaw(s) { s.dist = 0; s.arc = s.arc || 16; this.shots.push(s); },
    addTorpedo(o) {
      this.torps.push({ x: o.x, y: o.y, ang: o.ang, speed: o.speed, dist: 0, range: o.range, dmg: o.dmg, owner: o.owner, trail: 0 });
    },

    update(dt, game) {
      // rippling broadsides — each gun fires a beat after the last
      for (let i = this.pending.length - 1; i >= 0; i--) {
        const p = this.pending[i];
        p.delay -= dt;
        if (p.delay > 0) continue;
        this.pending.splice(i, 1);
        const o = p.owner;
        if (o.sinking || o.dead) continue;
        const pos = o.local(p.along, p.side * o.B * 0.55);
        const a = o.angle + (p.side * Math.PI) / 2 + HS.rand(-p.spread, p.spread);
        const ov = o.speed * HS.KN;
        const balls = p.type === 'grape' ? 3 : 1;
        for (let b = 0; b < balls; b++) {
          const aa = a + (balls > 1 ? HS.rand(-p.spread, p.spread) : 0);
          this.shots.push({
            x: pos.x, y: pos.y, vx: Math.cos(aa) * p.speed + Math.cos(o.angle) * ov, vy: Math.sin(aa) * p.speed + Math.sin(o.angle) * ov,
            dist: 0, range: p.range * (balls > 1 ? HS.rand(0.85, 1.05) : 1), dmg: p.dmg / balls, type: p.type, owner: o, arc: 16,
          });
        }
        this.part({ type: 'flash', x: pos.x + Math.cos(a) * 4, y: pos.y + Math.sin(a) * 4, size: 9, life: 0.14 });
        this.smoke(pos.x + Math.cos(a) * 6, pos.y + Math.sin(a) * 6, 2, { vx: Math.cos(a) * 22, vy: Math.sin(a) * 22, size: HS.rand(5, 9), grow: 16, life: HS.rand(2.4, 4) });
      }

      const W = HS.World;
      for (let i = this.shots.length - 1; i >= 0; i--) {
        const s = this.shots[i];
        const step = Math.hypot(s.vx, s.vy) * dt;
        s.x = HS.wrapX(s.x + s.vx * dt); s.y += s.vy * dt; s.dist += step;
        if (s.type === 'shell' && Math.random() < 0.5) this.part({ type: 'trail', x: s.x, y: s.y, size: 1.5, life: 0.35 });
        let hit = null;
        for (const sh of game.ships) {
          if (sh === s.owner || sh.sinking || sh.dead) continue;
          if (Math.abs(HS.dxw(sh.x, s.x)) > sh.L || Math.abs(sh.y - s.y) > sh.L) continue;
          if (sh.contains(s.x, s.y, 1)) { hit = sh; break; }
        }
        if (hit) {
          hit.takeHit(s.dmg, s.type, s.owner, game);
          this.splinters(s.x, s.y, s.type === 'grape' ? 3 : 7);
          if (s.type === 'shell' || s.type === 'fort') this.explosion(s.x, s.y, 0.6);
          else this.smoke(s.x, s.y, 1, { size: 5, life: 1.2, col: 160 });
          game.sound('hit', s.x, s.y);
          this.shots.splice(i, 1);
          continue;
        }
        if (s.dist >= s.range) {
          if (W.isLand(s.x, s.y)) this.smoke(s.x, s.y, 2, { col: 150, size: 5, life: 1.2 });
          else { this.splash(s.x, s.y, s.type === 'shell' ? 1.4 : 1); game.sound('splash', s.x, s.y); }
          this.shots.splice(i, 1);
        }
      }

      for (let i = this.torps.length - 1; i >= 0; i--) {
        const t = this.torps[i];
        t.x = HS.wrapX(t.x + Math.cos(t.ang) * t.speed * dt); t.y += Math.sin(t.ang) * t.speed * dt; t.dist += t.speed * dt;
        t.trail -= dt;
        if (t.trail <= 0) { t.trail = 0.05; this.foam(t.x, t.y, 2, 2.2); }
        let hit = null;
        for (const sh of game.ships) if (sh !== t.owner && !sh.sinking && sh.contains(t.x, t.y, 2)) { hit = sh; break; }
        if (hit) {
          hit.takeHit(t.dmg, 'torpedo', t.owner, game);
          this.splash(t.x, t.y, 3); this.explosion(t.x, t.y, 1.5);
          game.sound('boom', t.x, t.y);
          this.torps.splice(i, 1);
        } else if (t.dist > t.range || W.isLand(t.x, t.y)) this.torps.splice(i, 1);
      }

      for (let i = this.parts.length - 1; i >= 0; i--) {
        const p = this.parts[i];
        if (p.delay > 0) { p.delay -= dt; continue; }
        p.age += dt;
        if (p.age >= p.life) { this.parts.splice(i, 1); continue; }
        p.x += p.vx * dt; p.y += p.vy * dt;
        if (p.type === 'smoke') { p.vx *= 1 - dt * 0.6; p.vy *= 1 - dt * 0.6; p.x += game.wind.vx * dt * 0.5; p.y += game.wind.vy * dt * 0.5; }
        if (p.type === 'spray') { p.h += p.vh * dt; p.vh -= 160 * dt; if (p.h < 0) p.age = p.life; }
        if (p.type === 'splinter') { p.rot += p.vr * dt; p.vx *= 1 - dt * 2; p.vy *= 1 - dt * 2; }
        if (p.type === 'ember') { p.vx *= 1 - dt * 1.5; p.vy *= 1 - dt * 1.5; }
      }
    },

    _sp(p, cam, w, h) { return [HS.dxw(cam.x, p.x) * cam.zoom + w / 2, (p.y - cam.y) * cam.zoom + h / 2]; },
    /** layer 'low' = on the water (wakes, rings); 'high' = above ships */
    draw(ctx, cam, env, layer) {
      const z = cam.zoom, w = env.w, h = env.h;
      for (const p of this.parts) {
        if (p.delay > 0) continue;
        const low = p.type === 'foam' || p.type === 'ring';
        if ((layer === 'low') !== low) continue;
        const [sx, sy] = this._sp(p, cam, w, h);
        if (sx < -80 || sy < -80 || sx > w + 80 || sy > h + 80) continue;
        const k = p.age / p.life;
        switch (p.type) {
          case 'foam': {
            ctx.fillStyle = `rgba(240,250,255,${0.42 * (1 - k)})`;
            const r = (p.size + p.grow * k) * z;
            ctx.beginPath(); ctx.ellipse(sx, sy, r, r * 0.8, 0, 0, HS.TAU); ctx.fill();
            break;
          }
          case 'ring':
            ctx.strokeStyle = `rgba(235,248,255,${0.7 * (1 - k)})`; ctx.lineWidth = 2 * z;
            ctx.beginPath(); ctx.arc(sx, sy, (p.size + p.grow * k) * z, 0, HS.TAU); ctx.stroke();
            break;
          case 'smoke': {
            const r = (p.size + p.grow * k) * z;
            const c = p.col;
            ctx.fillStyle = `rgba(${c},${c},${c},${0.5 * (1 - k) * (1 - k)})`;
            ctx.beginPath(); ctx.arc(sx, sy, r, 0, HS.TAU); ctx.fill();
            break;
          }
          case 'spray':
            ctx.fillStyle = `rgba(240,250,255,${0.9 * (1 - k)})`;
            ctx.beginPath(); ctx.arc(sx, sy - p.h * z * 0.3, p.size * z, 0, HS.TAU); ctx.fill();
            break;
          case 'column': {
            const hh = Math.sin(k * Math.PI) * 22 * z * (p.size / 4);
            const g = ctx.createLinearGradient(sx, sy, sx, sy - hh);
            g.addColorStop(0, 'rgba(255,255,255,0.85)'); g.addColorStop(1, 'rgba(255,255,255,0)');
            ctx.fillStyle = g;
            ctx.fillRect(sx - p.size * z * 0.8, sy - hh, p.size * z * 1.6, hh);
            break;
          }
          case 'splinter':
            ctx.save(); ctx.translate(sx, sy); ctx.rotate(p.rot);
            ctx.fillStyle = `rgba(110,72,36,${1 - k})`; ctx.fillRect(-p.size * z, -0.6 * z, p.size * 2 * z, 1.2 * z);
            ctx.restore();
            break;
          case 'flash': {
            const r = p.size * z * (1 + k);
            const g = ctx.createRadialGradient(sx, sy, 0, sx, sy, r);
            g.addColorStop(0, `rgba(255,250,210,${1 - k})`); g.addColorStop(0.4, `rgba(255,170,60,${0.8 * (1 - k)})`); g.addColorStop(1, 'rgba(255,120,30,0)');
            ctx.fillStyle = g; ctx.beginPath(); ctx.arc(sx, sy, r, 0, HS.TAU); ctx.fill();
            break;
          }
          case 'ember':
            ctx.fillStyle = `rgba(255,${150 + 100 * (1 - k)},60,${1 - k})`;
            ctx.beginPath(); ctx.arc(sx, sy, p.size * z, 0, HS.TAU); ctx.fill();
            break;
          case 'trail':
            ctx.fillStyle = `rgba(255,220,160,${0.6 * (1 - k)})`;
            ctx.beginPath(); ctx.arc(sx, sy, p.size * z, 0, HS.TAU); ctx.fill();
            break;
        }
      }
      if (layer !== 'high') return;
      for (const s of this.shots) {
        const [sx, sy] = this._sp(s, cam, w, h);
        if (sx < -20 || sy < -20 || sx > w + 20 || sy > h + 20) continue;
        const k = s.dist / s.range;
        const lift = Math.sin(k * Math.PI) * s.arc * z;
        ctx.fillStyle = 'rgba(0,20,30,0.3)';
        ctx.beginPath(); ctx.arc(sx, sy, 2 * z, 0, HS.TAU); ctx.fill();
        if (s.type === 'chain') {
          const a = s.dist * 0.08;
          ctx.strokeStyle = '#222'; ctx.lineWidth = 1 * z;
          ctx.beginPath(); ctx.moveTo(sx - Math.cos(a) * 4 * z, sy - lift - Math.sin(a) * 4 * z); ctx.lineTo(sx + Math.cos(a) * 4 * z, sy - lift + Math.sin(a) * 4 * z); ctx.stroke();
          ctx.fillStyle = '#111';
          ctx.beginPath(); ctx.arc(sx - Math.cos(a) * 4 * z, sy - lift - Math.sin(a) * 4 * z, 1.8 * z, 0, HS.TAU); ctx.arc(sx + Math.cos(a) * 4 * z, sy - lift + Math.sin(a) * 4 * z, 1.8 * z, 0, HS.TAU); ctx.fill();
        } else {
          ctx.fillStyle = s.type === 'shell' ? '#3a3a3a' : '#111';
          ctx.beginPath(); ctx.arc(sx, sy - lift, (s.type === 'grape' ? 1.3 : 2.2) * z, 0, HS.TAU); ctx.fill();
        }
      }
      for (const t of this.torps) {
        const [sx, sy] = this._sp(t, cam, w, h);
        ctx.save(); ctx.translate(sx, sy); ctx.rotate(t.ang);
        ctx.fillStyle = 'rgba(30,40,45,0.8)'; ctx.fillRect(-6 * z, -1.2 * z, 12 * z, 2.4 * z);
        ctx.restore();
      }
    },
    lights() {
      const out = [];
      for (const p of this.parts) if ((p.type === 'flash' || p.type === 'ember') && !(p.delay > 0)) out.push({ x: p.x, y: p.y, r: p.type === 'flash' ? 90 : 25, a: 1 - p.age / p.life });
      return out;
    },
  });
})();
