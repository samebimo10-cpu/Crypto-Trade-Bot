/* High Seas — vessels: sailing physics, gunnery, damage and rendering. */
(function () {
  const HS = (window.HS = window.HS || {});

  // Points of sail. x = angle between heading and the direction the wind blows TO
  // (0 = running dead downwind, PI = head to wind / in irons).
  const POLAR_SQUARE = [[0, 0.78], [0.5, 0.92], [1.0, 1.0], [1.57, 0.92], [1.95, 0.7], [2.2, 0.42], [2.4, 0.15], [2.6, 0.03], [Math.PI, 0]];
  const POLAR_FORE_AFT = [[0, 0.66], [0.6, 0.82], [1.2, 0.97], [1.57, 1.0], [2.0, 0.88], [2.3, 0.62], [2.55, 0.3], [2.75, 0.06], [Math.PI, 0]];
  function interp(tbl, x) {
    for (let i = 1; i < tbl.length; i++) {
      if (x <= tbl[i][0]) { const [x0, y0] = tbl[i - 1], [x1, y1] = tbl[i]; return y0 + ((y1 - y0) * (x - x0)) / (x1 - x0); }
    }
    return tbl[tbl.length - 1][1];
  }
  HS.polar = (a, rig) => HS.lerp(interp(POLAR_SQUARE, a), interp(POLAR_FORE_AFT, a), rig);
  HS.pointOfSail = (a) => {
    if (a < 0.35) return 'Running before the wind';
    if (a < 1.25) return 'Broad reach';
    if (a < 1.85) return 'Beam reach';
    if (a < 2.35) return 'Close-hauled';
    return 'In irons!';
  };
  HS.AMMO = {
    round: { name: 'Round shot', range: 360, desc: 'Smashes hull timbers' },
    chain: { name: 'Chain shot', range: 260, desc: 'Shreds sails & rigging' },
    grape: { name: 'Grapeshot', range: 190, desc: 'Sweeps the enemy deck' },
  };
  HS.SAIL_NAMES = ['Sails furled', 'Battle sails', 'Plain sail', 'All plain sail'];
  HS.STEAM_NAMES = ['All stop', 'Slow ahead', 'Half ahead', 'Full ahead'];

  const IBERIAN = /^(San |Santa |Nuestra|São |Esperança)/;
  HS.shipName = (nation, role) => {
    const all = HS.NAMES.ship;
    if (role === 'pirate' || role === 'hunter') return HS.pick(['Revenge', 'Kraken', 'Raven', 'Black Swan', 'Sea Serpent', 'Queen Anne\'s Revenge', 'Whydah', 'Fancy', 'Banshee', 'Corsair', 'Siren', 'Tempest', 'Dragon', 'Sea Wolf', 'Leviathan', 'Adventure Galley', 'Royal Fortune', 'Flying Dragon']);
    if (nation === 'spanish' || nation === 'portuguese') return HS.pick(all.filter((n) => IBERIAN.test(n)).concat(['Santísima Trinidad', 'San Juan', 'Santa Ana', 'San Martín', 'Nossa Senhora', 'Santo António']));
    if (nation === 'french') return HS.pick(['La Belle', 'L\'Hermione', 'Le Téméraire', 'La Gloire', 'Le Redoutable', 'La Licorne', 'Le Soleil Royal', 'La Sirène']);
    if (nation === 'dutch') return HS.pick(['Zeven Provinciën', 'Hollandia', 'De Ruyter', 'Batavia', 'Amsterdam', 'Gouden Leeuw', 'Eendracht', 'Duyfken']);
    return HS.pick(all.filter((n) => !IBERIAN.test(n) && !/^(La |L'|Zeven|Hollandia)/.test(n)));
  };
  let nextId = 1;
  class Ship {
    constructor(type, o = {}) {
      const T = HS.SHIPS[type];
      this.id = nextId++;
      this.type = type; this.T = T;
      this.x = o.x || 0; this.y = o.y || 0;
      this.angle = o.angle || 0;
      this.speed = o.speed || 0;
      this.rudder = 0;
      this.sail = o.sail !== undefined ? o.sail : 2;
      this.upgrades = Object.assign({}, o.upgrades || {});
      this.L = T.len; this.B = T.len * (T.steam ? 0.2 : 0.3);
      this.hullMax = Math.round(T.hull * (this.upgrades.oak ? 1.2 : 1) * (o.hullMul || 1));
      this.hull = o.hull !== undefined ? o.hull : this.hullMax;
      this.sailsMax = T.sails; this.sails = o.sails !== undefined ? o.sails : T.sails;
      this.crew = o.crew !== undefined ? o.crew : Math.round(T.crewMax * HS.rand(0.65, 0.9));
      this.nation = o.nation || 'british';
      this.role = o.role || 'merchant';
      this.name = o.name || HS.shipName(this.nation, this.role);
      this.captain = o.captain || HS.makeCaptain(this.role, this.nation);
      this.isPlayer = !!o.isPlayer;
      this.team = o.team || null;
      this.reload = { '-1': 0, '1': 0 };
      this.ammo = 'round';
      this.turretAng = (T.turrets || []).map(() => 0);
      this.turretReload = (T.turrets || []).map(() => Math.random());
      this.torps = T.torpedoes || 0; this.torpReload = 0;
      this.cargo = o.cargo || {};
      this.gold = o.gold || 0;
      this.struck = false; this.sinking = 0; this.dead = false;
      this.hostileToPlayer = !!o.hostileToPlayer;
      this.onFire = 0; this.crewLossAcc = 0;
      this.recoil = { '-1': 0, '1': 0 };
      this.wakeT = 0; this.smokeT = 0; this.groundT = 0;
      this.flash = 0;
      this.ai = o.ai || null;
      this.lastHitBy = null;
      this.mission = o.mission || null;
      this.seen = false;
    }
    get radius() { return this.L * 0.5; }
    maxSpeed() { return this.T.speed * (this.upgrades.copper ? 1.08 : 1); }
    cargoUsed() { let n = 0; for (const k in this.cargo) n += this.cargo[k]; return n; }
    cargoCap() { return this.T.cargo; }
    flagNation() { return this.struck ? 'white' : this.role === 'pirate' || this.role === 'hunter' ? 'pirate' : this.nation; }
    reloadTime() {
      const T = this.T;
      const need = Math.min(T.crewMin + T.guns * 2.2, T.crewMax * 0.8);
      const f = HS.clamp(this.crew / need, 0.2, 1);
      return (6.2 + T.gunCal * 0.05) * (this.upgrades.gunlocks ? 0.85 : 1) / (0.3 + 0.7 * f);
    }
    range(ammo) { return HS.AMMO[ammo || this.ammo].range * (this.upgrades.longguns ? 1.18 : 1); }
    relWind(wind) { return HS.angNorm(wind.dir - this.angle); }

    update(dt, game) {
      const T = this.T, W = HS.World;
      for (const s of ['-1', '1']) { if (this.reload[s] > 0) this.reload[s] -= dt; this.recoil[s] = Math.max(0, this.recoil[s] - dt * 2); }
      for (let i = 0; i < this.turretReload.length; i++) if (this.turretReload[i] > 0) this.turretReload[i] -= dt;
      if (this.torpReload > 0) this.torpReload -= dt;
      this.flash = Math.max(0, this.flash - dt * 3);

      if (this.sinking > 0) {
        this.sinking += dt / 7;
        this.speed *= 1 - dt * 0.5;
        this.angle += dt * 0.08;
        this.x = HS.wrapX(this.x + Math.cos(this.angle) * this.speed * HS.KN * dt);
        this.y += Math.sin(this.angle) * this.speed * HS.KN * dt;
        if (this.sinking >= 1) this.dead = true;
        return;
      }

      // fire aboard
      if (this.onFire > 0) {
        this.onFire -= dt;
        this.hull -= dt * 1.4;
        if (this.hull <= 0) { this.sink(game); return; }
      }

      const wind = game.wind;
      let target;
      if (T.steam) {
        target = this.maxSpeed() * [0, 0.34, 0.67, 1][this.sail];
      } else {
        const rel = Math.abs(this.relWind(wind));
        const eff = HS.polar(rel, T.rig);
        const wf = HS.clamp(Math.pow(wind.speed / 14, 0.6), 0.15, 1.35);
        const sailF = [0, 0.42, 0.72, 1][this.sail];
        target = this.maxSpeed() * sailF * eff * wf * (0.3 + 0.7 * this.sails / this.sailsMax);
      }
      if (this.struck) target = 0;
      target *= 1 - 0.18 * HS.clamp(this.cargoUsed() / Math.max(1, this.cargoCap()), 0, 1);
      if (this.crew < T.crewMin) target *= 0.45 + 0.55 * (this.crew / T.crewMin);
      const acc = (T.steam ? 0.55 : 0.3) * (50 / this.L);
      this.speed += (target - this.speed) * Math.min(1, dt * acc);
      if (Math.abs(this.speed) < 0.02) this.speed = 0;

      const steer = T.turn * this.rudder * (0.28 + 0.72 * Math.min(1, Math.abs(this.speed) / (this.maxSpeed() * 0.4)));
      this.angle = HS.angNorm(this.angle + steer * dt);
      this.turnRate = steer;

      const v = this.speed * HS.KN;
      let nx = this.x + Math.cos(this.angle) * v * dt;
      let ny = this.y + Math.sin(this.angle) * v * dt;
      if (!T.steam && this.sail > 0) {
        // leeway — the wind sets her slowly to leeward
        const lw = wind.speed * 0.06 * (this.sail / 3);
        nx += Math.cos(wind.dir) * lw * dt; ny += Math.sin(wind.dir) * lw * dt;
      }
      this.groundT = Math.max(0, this.groundT - dt);
      const bx = nx + Math.cos(this.angle) * this.L * 0.45, by = ny + Math.sin(this.angle) * this.L * 0.45;
      if (W.isLand(bx, by) || W.isLand(nx, ny)) {
        if (this.speed > 2.5 && this.groundT <= 0) {
          const dmg = this.speed * 1.4;
          this.hull -= dmg;
          this.groundT = 1.5;
          game.onGrounding(this, dmg);
          if (this.hull <= 0) { this.sink(game); return; }
        }
        this.speed = Math.min(this.speed, 0) - 0.4;
        nx = this.x - Math.cos(this.angle) * 1.5;
        ny = this.y - Math.sin(this.angle) * 1.5;
        if (W.isLand(nx, ny)) { nx = this.x; ny = this.y; }
      }
      this.x = HS.wrapX(nx);
      this.y = HS.clamp(ny, W.iceTop + 20, W.iceBot - 20);
    }

    contains(px, py, pad = 0) {
      const dx = HS.dxw(this.x, px), dy = py - this.y;
      const c = Math.cos(-this.angle), s = Math.sin(-this.angle);
      const lx = dx * c - dy * s, ly = dx * s + dy * c;
      const a = this.L / 2 + pad, b = this.B / 2 + pad;
      return (lx * lx) / (a * a) + (ly * ly) / (b * b) <= 1;
    }
    local(lx, ly) {
      const c = Math.cos(this.angle), s = Math.sin(this.angle);
      return { x: this.x + lx * c - ly * s, y: this.y + lx * s + ly * c };
    }

    canFire(side) { return !this.struck && this.sinking === 0 && this.T.guns > 0 && this.reload[side] <= 0; }
    /** side: -1 = larboard (port), 1 = starboard */
    fire(side, game) {
      if (!this.canFire(side)) return false;
      const T = this.T;
      const n = Math.min(T.guns, 8 + Math.floor(T.guns / 8));
      const perGun = 0.9 + T.gunCal * 0.09;
      const dmg = (T.guns * perGun) / n;
      const range = this.range();
      for (let i = 0; i < n; i++) {
        const along = n === 1 ? 0 : (i / (n - 1) - 0.5) * this.L * 0.66;
        game.addShot({
          owner: this, side, along, delay: i * 0.045 + Math.random() * 0.05,
          dmg: dmg * HS.rand(0.8, 1.2), type: this.ammo, range: range * HS.rand(0.9, 1.05), speed: 330,
          spread: this.ammo === 'grape' ? 0.12 : 0.045,
        });
      }
      this.reload[side] = this.reloadTime();
      this.recoil[side] = 1;
      game.onFire(this, side);
      return true;
    }
    turretWorldPos(i) { return this.local(this.T.turrets[i].pos * this.L, 0); }
    aimTurrets(tx, ty, dt) {
      const tur = this.T.turrets || [];
      for (let i = 0; i < tur.length; i++) {
        const p = this.turretWorldPos(i);
        const want = Math.atan2(ty - p.y, HS.dxw(p.x, tx));
        const cur = this.angle + this.turretAng[i];
        const d = HS.angNorm(want - cur);
        this.turretAng[i] = HS.angNorm(this.turretAng[i] + HS.clamp(d, -1.6 * dt, 1.6 * dt));
      }
    }
    fireTurrets(game, onlyReady = true) {
      if (this.struck || this.sinking) return false;
      let fired = false;
      (this.T.turrets || []).forEach((tu, i) => {
        if (onlyReady && this.turretReload[i] > 0) return;
        // don't shoot through our own superstructure
        const rel = Math.abs(HS.angNorm(this.turretAng[i] - (tu.pos > 0 ? Math.PI : 0)));
        if (rel < 0.35) return;
        const p = this.turretWorldPos(i);
        const a = this.angle + this.turretAng[i];
        game.addShell({ owner: this, x: p.x + Math.cos(a) * 12, y: p.y + Math.sin(a) * 12, ang: a, dmg: tu.dmg, range: tu.range, speed: 560 });
        this.turretReload[i] = tu.reload * (0.6 + 0.4 * HS.clamp(this.T.crewMin / Math.max(1, this.crew) , 0, 2));
        fired = true;
      });
      return fired;
    }
    fireTorpedo(game) {
      if (!this.torps || this.torpReload > 0 || this.struck || this.sinking) return false;
      const p = this.local(this.L * 0.5, 0);
      game.addTorpedo({ owner: this, x: p.x, y: p.y, ang: this.angle, speed: 150, range: 950, dmg: 160 });
      this.torps--; this.torpReload = 6;
      return true;
    }

    takeHit(dmg, type, from, game) {
      if (this.sinking) return;
      let crewLoss = 0;
      switch (type) {
        case 'chain': this.sails -= dmg * 1.8; this.hull -= dmg * 0.15; crewLoss = dmg * 0.04; break;
        case 'grape': crewLoss = dmg * 0.9; this.hull -= dmg * 0.12; this.sails -= dmg * 0.25; break;
        case 'shell': this.hull -= dmg; crewLoss = dmg * 0.18; this.sails -= dmg * 0.3; if (Math.random() < 0.12) this.onFire = HS.rand(5, 11); break;
        case 'torpedo': this.hull -= dmg; crewLoss = dmg * 0.25; break;
        case 'fort': this.hull -= dmg; crewLoss = dmg * 0.15; break;
        default: this.hull -= dmg; this.sails -= dmg * 0.18; crewLoss = dmg * 0.13; if (Math.random() < 0.035) this.onFire = HS.rand(4, 9);
      }
      this.sails = Math.max(0, this.sails);
      this.crewLossAcc += crewLoss;
      const lost = Math.floor(this.crewLossAcc);
      if (lost > 0) { this.crewLossAcc -= lost; this.crew = Math.max(0, this.crew - lost); }
      this.lastHitBy = from;
      this.flash = 1;
      game.onShipHit(this, from, type, dmg);
      if (this.hull <= 0) this.sink(game);
      else if (!this.isPlayer && !this.struck) {
        const pirate = this.role === 'pirate' || this.role === 'hunter';
        const hullLim = pirate ? 0.08 : this.role === 'merchant' ? 0.3 : 0.15;
        if (this.hull < this.hullMax * hullLim || this.crew < Math.max(3, this.T.crewMax * (pirate ? 0.06 : 0.12))) {
          this.struck = true;
          game.onStrike(this);
        }
      }
    }
    sink(game) {
      if (this.sinking) return;
      this.hull = 0;
      this.sinking = 0.0001;
      game.onSink(this);
    }

    // ------------------------------------------------------------------ drawing
    hullPath(ctx, L, B) {
      ctx.beginPath();
      if (this.T.steam) {
        ctx.moveTo(L * 0.5, 0);
        ctx.bezierCurveTo(L * 0.38, -B * 0.45, L * 0.2, -B * 0.5, L * 0.05, -B * 0.5);
        ctx.lineTo(-L * 0.4, -B * 0.5);
        ctx.quadraticCurveTo(-L * 0.5, -B * 0.48, -L * 0.5, 0);
        ctx.quadraticCurveTo(-L * 0.5, B * 0.48, -L * 0.4, B * 0.5);
        ctx.lineTo(L * 0.05, B * 0.5);
        ctx.bezierCurveTo(L * 0.2, B * 0.5, L * 0.38, B * 0.45, L * 0.5, 0);
      } else {
        ctx.moveTo(L * 0.5, 0);
        ctx.bezierCurveTo(L * 0.42, -B * 0.34, L * 0.24, -B * 0.5, L * 0.04, -B * 0.5);
        ctx.lineTo(-L * 0.36, -B * 0.47);
        ctx.quadraticCurveTo(-L * 0.47, -B * 0.44, -L * 0.48, -B * 0.22);
        ctx.lineTo(-L * 0.49, B * 0.22);
        ctx.quadraticCurveTo(-L * 0.47, B * 0.44, -L * 0.36, B * 0.47);
        ctx.lineTo(L * 0.04, B * 0.5);
        ctx.bezierCurveTo(L * 0.24, B * 0.5, L * 0.42, B * 0.34, L * 0.5, 0);
      }
      ctx.closePath();
    }

    draw(ctx, sx, sy, z, env) {
      const T = this.T, L = this.L, B = this.B;
      const nat = HS.NATIONS[this.role === 'pirate' || this.role === 'hunter' ? 'pirate' : this.nation] || HS.NATIONS.british;
      ctx.save();
      ctx.translate(sx, sy);
      const sk = this.sinking;
      const sc = z * (1 - sk * 0.3);
      ctx.scale(sc, sc);
      ctx.globalAlpha = 1 - sk * 0.85;
      ctx.rotate(this.angle + sk * 0.5);

      // bow wave & stern wash
      const spd = Math.abs(this.speed);
      if (spd > 1 && !sk) {
        const k = Math.min(1, spd / 12);
        ctx.strokeStyle = `rgba(255,255,255,${0.55 * k})`; ctx.lineWidth = 2.2;
        ctx.beginPath();
        ctx.moveTo(L * 0.52, 0);
        ctx.quadraticCurveTo(L * 0.35, -B * 0.75, L * 0.05 - k * 10, -B * (0.75 + k * 0.6));
        ctx.moveTo(L * 0.52, 0);
        ctx.quadraticCurveTo(L * 0.35, B * 0.75, L * 0.05 - k * 10, B * (0.75 + k * 0.6));
        ctx.stroke();
        ctx.fillStyle = `rgba(255,255,255,${0.3 * k})`;
        ctx.beginPath(); ctx.ellipse(-L * 0.52, 0, 6 + k * 6, B * 0.4, 0, 0, HS.TAU); ctx.fill();
      }

      // shadow
      ctx.save();
      ctx.translate(3, 5);
      ctx.fillStyle = 'rgba(0,25,40,0.35)';
      this.hullPath(ctx, L * 1.02, B * 1.08); ctx.fill();
      ctx.restore();

      // hull
      const hullCol = T.steam ? '#555b61' : this.role === 'pirate' || this.role === 'hunter' ? '#2a2119' : nat.hull;
      const g = ctx.createLinearGradient(0, -B / 2, 0, B / 2);
      g.addColorStop(0, shade(hullCol, -20)); g.addColorStop(0.5, shade(hullCol, 30)); g.addColorStop(1, shade(hullCol, -30));
      this.hullPath(ctx, L, B);
      ctx.fillStyle = g; ctx.fill();
      ctx.save();
      ctx.clip();
      ctx.strokeStyle = T.steam ? '#2f3337' : nat.band; ctx.lineWidth = B * 0.24;
      this.hullPath(ctx, L, B); ctx.stroke();
      ctx.restore();
      ctx.strokeStyle = 'rgba(10,8,5,0.9)'; ctx.lineWidth = 1.2;
      this.hullPath(ctx, L, B); ctx.stroke();

      // deck
      ctx.save();
      ctx.scale(0.86, 0.78);
      this.hullPath(ctx, L, B);
      ctx.fillStyle = T.steam ? '#7b7f82' : '#b8915f';
      ctx.fill();
      ctx.clip();
      ctx.strokeStyle = T.steam ? 'rgba(40,40,40,0.25)' : 'rgba(90,60,30,0.35)'; ctx.lineWidth = 0.6;
      for (let y = -B / 2; y < B / 2; y += 2.3) { ctx.beginPath(); ctx.moveTo(-L / 2, y); ctx.lineTo(L / 2, y); ctx.stroke(); }
      ctx.restore();

      if (T.steam) this._drawSteamTop(ctx, env);
      else this._drawSailTop(ctx, env, nat);

      // fire & damage
      if (this.onFire > 0) {
        for (let i = 0; i < 3; i++) {
          const fx = -L * 0.2 + i * L * 0.18 + Math.sin(env.t * 9 + i) * 2, fy = Math.cos(env.t * 7 + i) * B * 0.15;
          ctx.fillStyle = `rgba(255,${120 + i * 40},30,${0.6 + 0.3 * Math.sin(env.t * 20 + i)})`;
          ctx.beginPath(); ctx.arc(fx, fy, 3.5 + Math.sin(env.t * 13 + i) * 1.5, 0, HS.TAU); ctx.fill();
        }
      }
      if (this.flash > 0) {
        ctx.globalAlpha = this.flash * 0.5;
        ctx.fillStyle = '#fff';
        this.hullPath(ctx, L, B); ctx.fill();
      }
      ctx.restore();
    }

    _drawSailTop(ctx, env, nat) {
      const T = this.T, L = this.L, B = this.B;
      // gunports & guns
      const nPorts = Math.min(T.guns, 15);
      for (const side of [-1, 1]) {
        const loaded = this.reload[side] <= 0;
        for (let i = 0; i < nPorts; i++) {
          const x = nPorts === 1 ? 0 : -L * 0.32 + (i / (nPorts - 1)) * L * 0.6;
          const y = side * (B * 0.5 - 1.6);
          ctx.fillStyle = '#16100a'; ctx.fillRect(x - 1.2, y - 1.1, 2.4, 2.2);
          if (loaded) { ctx.fillStyle = '#1b1b1b'; ctx.fillRect(x - 0.8, y + side * 0.6 - (side < 0 ? 2.6 : 0), 1.6, 2.6 - this.recoil[side] * 2); }
        }
      }
      // quarterdeck & forecastle
      ctx.fillStyle = 'rgba(140,100,60,0.9)';
      ctx.fillRect(-L * 0.44, -B * 0.33, L * 0.2, B * 0.66);
      ctx.strokeStyle = 'rgba(60,40,20,0.8)'; ctx.lineWidth = 0.8; ctx.strokeRect(-L * 0.44, -B * 0.33, L * 0.2, B * 0.66);
      ctx.fillStyle = '#5a3a1c'; ctx.beginPath(); ctx.arc(-L * 0.27, 0, 1.8, 0, HS.TAU); ctx.fill();
      ctx.fillStyle = 'rgba(150,108,66,0.9)';
      ctx.beginPath(); ctx.moveTo(L * 0.42, 0); ctx.lineTo(L * 0.3, -B * 0.28); ctx.lineTo(L * 0.3, B * 0.28); ctx.closePath(); ctx.fill();
      // hatches & ship's boat
      ctx.fillStyle = '#4a3218';
      ctx.fillRect(-L * 0.08, -B * 0.1, L * 0.07, B * 0.2);
      ctx.fillRect(L * 0.12, -B * 0.08, L * 0.05, B * 0.16);
      if (L > 45) { ctx.fillStyle = '#8a6a44'; ctx.beginPath(); ctx.ellipse(-L * 0.04, 0, L * 0.08, B * 0.12, 0, 0, HS.TAU); ctx.fill(); }
      // bowsprit
      ctx.strokeStyle = '#4a3218'; ctx.lineWidth = 1.6;
      ctx.beginPath(); ctx.moveTo(L * 0.42, 0); ctx.lineTo(L * 0.7, 0); ctx.stroke();

      const rel = this.relWind(env.wind);
      const absRel = Math.abs(rel);
      const inIrons = absRel > 2.55;
      const power = HS.clamp(env.wind.speed / 18, 0.35, 1.2);
      const masts = T.masts === 3 ? [L * 0.26, L * 0.02, -L * 0.21] : T.masts === 2 ? [L * 0.16, -L * 0.14] : [L * 0.06];
      const sailCloth = this.role === 'pirate' || this.role === 'hunter' ? ['#3a3430', '#211d1a'] : ['#f4efe0', '#d6cdb5'];
      const sailHealth = this.sails / this.sailsMax;

      // shrouds
      ctx.strokeStyle = 'rgba(30,20,10,0.55)'; ctx.lineWidth = 0.5;
      for (const mx of masts) { ctx.beginPath(); ctx.moveTo(mx, 0); ctx.lineTo(mx - 3, -B / 2); ctx.moveTo(mx, 0); ctx.lineTo(mx - 3, B / 2); ctx.stroke(); }

      const isFA = (i) => T.rig >= 0.9 || (T.rig >= 0.4 && i > 0) || (T.rig > 0.1 && T.rig < 0.4 && i === masts.length - 1 && masts.length > 1);
      // jib on fore-and-aft and mixed rigs
      if (this.sail > 0 && T.rig > 0.1) {
        const side = Math.sign(Math.sin(rel)) || 1;
        const belly = inIrons ? Math.sin(env.t * 18) * 2 : side * 5 * power;
        ctx.fillStyle = sailCloth[0];
        ctx.beginPath(); ctx.moveTo(L * 0.68, 0); ctx.quadraticCurveTo(L * 0.5, belly, masts[0] + 2, side * 1.5); ctx.lineTo(masts[0] + 2, 0); ctx.closePath(); ctx.fill();
        ctx.strokeStyle = 'rgba(0,0,0,0.25)'; ctx.lineWidth = 0.5; ctx.stroke();
      }
      masts.forEach((mx, i) => {
        if (isFA(i)) {
          // gaff/boom sail swung to leeward
          const side = Math.sign(Math.sin(rel)) || 1;
          const swing = HS.clamp((Math.PI - absRel) * 0.55, 0.12, 1.35);
          const ba = Math.PI - side * swing;
          const bl = (i === masts.length - 1 ? L * 0.42 : L * 0.3);
          const ex = mx + Math.cos(ba) * bl, ey = Math.sin(ba) * bl;
          if (this.sail > 0) {
            // belly bulges to leeward, perpendicular to the boom
            const nx = side * Math.sin(ba), ny = -side * Math.cos(ba);
            const bel = inIrons ? Math.sin(env.t * 16 + i) * 3 : 7 * power * (this.sail / 3 + 0.3);
            ctx.fillStyle = sailCloth[0];
            ctx.beginPath(); ctx.moveTo(mx, 0);
            ctx.quadraticCurveTo((mx + ex) / 2 + nx * bel, ey / 2 + ny * bel, ex, ey);
            ctx.lineTo(mx + Math.cos(ba) * bl * 0.2, Math.sin(ba) * bl * 0.2);
            ctx.closePath(); ctx.fill();
            ctx.strokeStyle = 'rgba(0,0,0,0.25)'; ctx.lineWidth = 0.6; ctx.stroke();
            this._holes(ctx, (mx + ex) / 2, ey / 2, sailHealth, i);
          }
          ctx.strokeStyle = '#3c2814'; ctx.lineWidth = 1.4;
          ctx.beginPath(); ctx.moveTo(mx, 0); ctx.lineTo(ex, ey); ctx.stroke();
        } else {
          // square sails on braced yards
          const brace = Math.sign(rel) * Math.min(absRel * 0.5, 0.62);
          const ux = -Math.sin(brace), uy = Math.cos(brace);
          const nx = Math.cos(brace), ny = Math.sin(brace);
          const span0 = B * (i === 1 || masts.length === 1 ? 1.75 : 1.55);
          const tiers = this.sail === 0 ? [] : this.sail === 1 ? [0.8] : this.sail === 2 ? [1, 0.8] : [1, 0.8, 0.6];
          ctx.strokeStyle = '#3c2814'; ctx.lineWidth = 1.5;
          ctx.beginPath(); ctx.moveTo(mx - ux * span0 / 2, -uy * span0 / 2); ctx.lineTo(mx + ux * span0 / 2, uy * span0 / 2); ctx.stroke();
          if (this.sail === 0) {
            ctx.strokeStyle = sailCloth[1]; ctx.lineWidth = 2.4;
            ctx.beginPath(); ctx.moveTo(mx - ux * span0 * 0.45, -uy * span0 * 0.45); ctx.lineTo(mx + ux * span0 * 0.45, uy * span0 * 0.45); ctx.stroke();
          }
          tiers.forEach((tf, k) => {
            const span = span0 * tf;
            const off = k * 2.2;
            const cx = mx + nx * off, cy = ny * off;
            const ax = cx - ux * span / 2, ay = cy - uy * span / 2, bx = cx + ux * span / 2, by = cy + uy * span / 2;
            const flutter = inIrons ? Math.sin(env.t * 20 + i + k) * 2.5 : 0;
            const d = (inIrons ? -1 : 5.5) * power * tf + flutter;
            const gr = ctx.createLinearGradient(cx, cy, cx + nx * d * 2, cy + ny * d * 2);
            gr.addColorStop(0, sailCloth[1]); gr.addColorStop(1, sailCloth[0]);
            ctx.fillStyle = gr;
            ctx.beginPath();
            ctx.moveTo(ax, ay);
            ctx.quadraticCurveTo(cx + nx * d * 2.2, cy + ny * d * 2.2, bx, by);
            ctx.quadraticCurveTo(cx + nx * d * 0.6, cy + ny * d * 0.6, ax, ay);
            ctx.fill();
            ctx.strokeStyle = 'rgba(60,50,30,0.35)'; ctx.lineWidth = 0.5; ctx.stroke();
            if (k === 0) this._holes(ctx, cx + nx * d, cy + ny * d, sailHealth, i);
          });
        }
        // mast top & crow's nest
        ctx.fillStyle = '#3c2814'; ctx.beginPath(); ctx.arc(mx, 0, 2.2, 0, HS.TAU); ctx.fill();
        ctx.strokeStyle = '#6b4a2a'; ctx.lineWidth = 0.8; ctx.beginPath(); ctx.arc(mx, 0, 3.4, 0, HS.TAU); ctx.stroke();
      });
      // pennant & ensign stream downwind
      const flagA = rel;
      HS.drawFlag(ctx, this.flagNation(), -L * 0.49, 0, 11, 7, env.t + this.id, flagA);
      const mainX = masts[masts.length > 1 ? 1 : 0];
      ctx.save(); ctx.translate(mainX, 0); ctx.rotate(flagA);
      ctx.fillStyle = this.struck ? '#f4f4f0' : nat.color;
      ctx.beginPath(); ctx.moveTo(0, -1); ctx.lineTo(14 + Math.sin(env.t * 8 + this.id) * 2, Math.sin(env.t * 6) * 1.5); ctx.lineTo(0, 1); ctx.fill();
      ctx.restore();
    }
    _holes(ctx, x, y, health, i) {
      if (health > 0.85) return;
      const n = Math.floor((1 - health) * 6);
      ctx.fillStyle = 'rgba(25,20,15,0.75)';
      for (let k = 0; k < n; k++) {
        const h1 = HS.hash(this.id * 7 + i, k), h2 = HS.hash(k, this.id + i * 3);
        ctx.beginPath(); ctx.arc(x + (h1 - 0.5) * 12, y + (h2 - 0.5) * 10, 1 + h1 * 1.3, 0, HS.TAU); ctx.fill();
      }
    }
    _drawSteamTop(ctx, env) {
      const T = this.T, L = this.L, B = this.B;
      if (this.type === 'ironclad') {
        ctx.fillStyle = '#41464b';
        ctx.beginPath(); ctx.roundRect ? ctx.roundRect(-L * 0.3, -B * 0.32, L * 0.6, B * 0.64, 3) : ctx.rect(-L * 0.3, -B * 0.32, L * 0.6, B * 0.64); ctx.fill();
        ctx.strokeStyle = '#2b2f33'; ctx.lineWidth = 1; ctx.stroke();
      } else {
        ctx.fillStyle = '#62676c'; ctx.fillRect(L * 0.08, -B * 0.28, L * 0.16, B * 0.56);
        ctx.fillStyle = '#c9c3b3'; ctx.fillRect(L * 0.12, -B * 0.2, L * 0.06, B * 0.4);
      }
      // funnels
      const funnels = this.type === 'ironclad' ? [0] : [L * 0.02, -L * 0.1, -L * 0.2];
      for (const fx of funnels) {
        ctx.fillStyle = '#1e1e1e'; ctx.beginPath(); ctx.ellipse(fx, 0, 3.6, 2.8, 0, 0, HS.TAU); ctx.fill();
        ctx.fillStyle = '#b5332b'; ctx.beginPath(); ctx.ellipse(fx, 0, 3.6, 2.8, 0, 0, HS.TAU); ctx.lineWidth = 1; ctx.strokeStyle = '#b5332b'; ctx.stroke();
        ctx.fillStyle = '#0c0c0c'; ctx.beginPath(); ctx.ellipse(fx, 0, 2.4, 1.8, 0, 0, HS.TAU); ctx.fill();
      }
      // turrets
      (T.turrets || []).forEach((tu, i) => {
        const tx = tu.pos * L;
        ctx.save(); ctx.translate(tx, 0); ctx.rotate(this.turretAng[i]);
        const big = this.type === 'ironclad';
        ctx.fillStyle = '#2b2f33';
        ctx.fillRect(0, -2.6, big ? 15 : 11, 1.8); if (big) ctx.fillRect(0, 0.8, 15, 1.8);
        ctx.fillStyle = big ? '#5a6066' : '#6c7276';
        ctx.beginPath(); ctx.arc(0, 0, big ? 6.5 : 4.2, 0, HS.TAU); ctx.fill();
        ctx.strokeStyle = '#25282b'; ctx.lineWidth = 1; ctx.stroke();
        ctx.restore();
      });
      // mast & ensign
      ctx.fillStyle = '#2b2b2b'; ctx.beginPath(); ctx.arc(L * 0.16, 0, 1.6, 0, HS.TAU); ctx.fill();
      HS.drawFlag(ctx, this.flagNation(), -L * 0.49, 0, 11, 7, env.t + this.id, Math.PI + Math.sin(env.t) * 0.1);
    }
  }
  HS.Ship = Ship;

  function shade(hex, amt) {
    const n = parseInt(hex.slice(1), 16);
    const r = HS.clamp((n >> 16) + amt, 0, 255), g = HS.clamp(((n >> 8) & 255) + amt, 0, 255), b = HS.clamp((n & 255) + amt, 0, 255);
    return `rgb(${r},${g},${b})`;
  }
  HS.shade = shade;

  // ---------------------------------------------------------------- side-view ship (port scenes, menus)
  HS.drawShipProfile = (ctx, type, x, y, scale, opts = {}) => {
    const T = HS.SHIPS[type];
    const L = T.len * scale * 3.2, H = L * 0.16;
    const t = opts.t || 0;
    const nat = HS.NATIONS[opts.nation || 'british'] || HS.NATIONS.british;
    ctx.save();
    ctx.translate(x, y + Math.sin(t * 1.3) * 2);
    ctx.rotate(Math.sin(t * 0.9) * 0.015);
    if (T.steam) {
      ctx.fillStyle = '#4c5257';
      ctx.beginPath(); ctx.moveTo(-L / 2, -H * 0.6); ctx.lineTo(L / 2, -H * 0.6); ctx.lineTo(L * 0.45, H * 0.35); ctx.lineTo(-L * 0.46, H * 0.35); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#7a2a22'; ctx.fillRect(-L * 0.46, H * 0.15, L * 0.91, H * 0.2);
      ctx.fillStyle = '#5d6368';
      ctx.fillRect(-L * 0.15, -H * 1.3, L * 0.3, H * 0.7);
      const funnels = type === 'ironclad' ? [0] : [-0.08, 0.04, 0.16];
      for (const f of funnels) { ctx.fillStyle = '#222'; ctx.fillRect(L * f - 4 * scale, -H * 2.6, 8 * scale, H * 1.4); ctx.fillStyle = '#b5332b'; ctx.fillRect(L * f - 4 * scale, -H * 2.6, 8 * scale, H * 0.3); }
      ctx.strokeStyle = '#333'; ctx.lineWidth = 2 * scale; ctx.beginPath(); ctx.moveTo(L * 0.25, -H * 0.6); ctx.lineTo(L * 0.25, -H * 3.5); ctx.stroke();
      for (const tu of T.turrets) { ctx.fillStyle = '#3c4146'; ctx.fillRect(tu.pos * L - 8 * scale, -H * 1.05, 16 * scale, H * 0.45); ctx.fillRect(tu.pos * L + (tu.pos > 0 ? 8 : -22) * scale, -H * 0.95, 14 * scale, 2.5 * scale); }
      HS.drawFlag(ctx, opts.nation || 'british', -L * 0.48, -H * 1.6, 22 * scale, 14 * scale, t, Math.PI);
      ctx.restore();
      return;
    }
    // hull
    const hullCol = opts.pirate ? '#2a2119' : nat.hull;
    ctx.fillStyle = hullCol;
    ctx.beginPath();
    ctx.moveTo(-L * 0.5, -H * 1.2);
    ctx.lineTo(-L * 0.36, -H * 0.9);
    ctx.lineTo(L * 0.35, -H * 0.75);
    ctx.lineTo(L * 0.52, -H * 1.05);
    ctx.quadraticCurveTo(L * 0.44, H * 0.4, L * 0.25, H * 0.55);
    ctx.lineTo(-L * 0.4, H * 0.55);
    ctx.quadraticCurveTo(-L * 0.5, H * 0.1, -L * 0.5, -H * 1.2);
    ctx.fill();
    ctx.fillStyle = opts.pirate ? '#6b1212' : nat.band;
    ctx.fillRect(-L * 0.46, -H * 0.6, L * 0.86, H * 0.35);
    const n = Math.min(T.guns, 16);
    ctx.fillStyle = '#111';
    for (let i = 0; i < n; i++) ctx.fillRect(-L * 0.36 + (i / Math.max(1, n - 1)) * L * 0.68, -H * 0.55, 4 * scale, 4 * scale);
    if (T.guns > 20) for (let i = 0; i < n; i++) ctx.fillRect(-L * 0.34 + (i / Math.max(1, n - 1)) * L * 0.64, -H * 0.05, 4 * scale, 4 * scale);
    // stern windows
    ctx.fillStyle = '#e8c56a'; ctx.fillRect(-L * 0.49, -H * 1.1, 4 * scale, H * 0.6);
    // masts & sails
    const masts = T.masts === 3 ? [0.26, 0.02, -0.22] : T.masts === 2 ? [0.15, -0.15] : [0.05];
    const mh = [L * 0.62, L * 0.7, L * 0.55];
    masts.forEach((m, i) => {
      const mx = m * L, h = mh[Math.min(i, 2)] * (T.masts === 1 ? 1.05 : 1);
      ctx.strokeStyle = '#3c2814'; ctx.lineWidth = 3 * scale;
      ctx.beginPath(); ctx.moveTo(mx, -H * 0.8); ctx.lineTo(mx, -H * 0.8 - h); ctx.stroke();
      const fa = T.rig >= 0.9 || (T.rig >= 0.4 && i > 0);
      const cloth = opts.pirate ? '#2c2622' : '#f1ebdc';
      if (fa) {
        ctx.fillStyle = cloth;
        if (opts.furled) { ctx.fillRect(mx - L * 0.25, -H * 1.1, L * 0.25, 4 * scale); }
        else { ctx.beginPath(); ctx.moveTo(mx - 2, -H - h * 0.9); ctx.lineTo(mx - 2, -H * 1.1); ctx.lineTo(mx - L * 0.27, -H * 1.1); ctx.closePath(); ctx.fill(); }
      } else {
        for (let k = 0; k < 3; k++) {
          const yy = -H * 0.8 - h * (0.28 + k * 0.27), w = L * (0.2 - k * 0.04);
          ctx.strokeStyle = '#3c2814'; ctx.lineWidth = 2 * scale;
          ctx.beginPath(); ctx.moveTo(mx - w / 2, yy); ctx.lineTo(mx + w / 2, yy); ctx.stroke();
          ctx.fillStyle = cloth;
          if (opts.furled) ctx.fillRect(mx - w / 2, yy, w, 3 * scale);
          else {
            ctx.beginPath(); ctx.moveTo(mx - w / 2, yy); ctx.lineTo(mx + w / 2, yy);
            ctx.quadraticCurveTo(mx + w * 0.58, yy + h * 0.13, mx + w * 0.5, yy + h * 0.24);
            ctx.lineTo(mx - w * 0.5, yy + h * 0.24); ctx.quadraticCurveTo(mx - w * 0.58, yy + h * 0.13, mx - w / 2, yy); ctx.fill();
            ctx.strokeStyle = 'rgba(0,0,0,0.15)'; ctx.lineWidth = 1; ctx.stroke();
          }
        }
      }
      if (i === (masts.length > 1 ? 1 : 0)) HS.drawFlag(ctx, opts.pirate ? 'pirate' : opts.nation || 'british', mx, -H * 0.8 - h - 2, 26 * scale, 16 * scale, t);
    });
    // rigging
    ctx.strokeStyle = 'rgba(30,20,10,0.6)'; ctx.lineWidth = 0.8;
    ctx.beginPath(); ctx.moveTo(L * 0.62, -H * 1.2); ctx.lineTo(masts[0] * L, -H * 0.8 - mh[0]);
    ctx.moveTo(L * 0.5, -H * 1.05); ctx.lineTo(L * 0.62, -H * 1.25); ctx.stroke();
    ctx.strokeStyle = '#3c2814'; ctx.lineWidth = 2.5 * scale;
    ctx.beginPath(); ctx.moveTo(L * 0.5, -H * 1.0); ctx.lineTo(L * 0.66, -H * 1.3); ctx.stroke();
    ctx.restore();
  };
})();
