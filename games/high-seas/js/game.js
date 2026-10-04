/* High Seas — the game: state, simulation loop, campaign rules, economy, rendering. */
(function () {
  const HS = (window.HS = window.HS || {});
  const Input = HS.Input;

  const HOURS_PER_SEC = 0.2;          // 1 real second at 1x = 12 minutes aboard
  const START_DATE = Date.UTC(1715, 5, 1);
  const RIVALS = {
    british: ['spanish', 'french'], spanish: ['british', 'dutch'], french: ['british'], dutch: ['spanish', 'portuguese'],
    portuguese: ['dutch'], ottoman: ['venetian'], venetian: ['ottoman'], american: ['british'],
  };
  const GOOD = {};
  HS.GOODS.forEach((g, i) => { GOOD[g.id] = Object.assign({ idx: i }, g); });
  HS.GOOD = GOOD;
  const SAVE_KEY = 'highseas.save.v1';

  // ---------------------------------------------------------------- economy
  const Econ = (HS.Econ = {
    price(port, id) {
      const g = GOOD[id];
      const day = Math.floor(G.clock / 24);
      let f = port.produces.includes(id) ? 0.58 : port.demands.includes(id) ? 1.6 : 1;
      if (g.illicit) f = port.haven ? 0.55 : 1.75;
      const h = HS.hash(port.id, g.idx);
      const fl = 1 + 0.12 * Math.sin(day / 5 + h * 20) + 0.05 * Math.sin(day / 1.7 + g.idx);
      const m = (G.markets[port.id] && G.markets[port.id][id]) || 0;
      return Math.max(2, Math.round(g.base * f * fl * (1 + m)));
    },
    buyPrice(port, id) { return Math.ceil(this.price(port, id) * 1.05); },
    sellPrice(port, id) { return Math.floor(this.price(port, id) * 0.95); },
    trade(port, id, qty) {
      const p = G.player, pl = G.pl;
      if (qty > 0) {
        const unit = this.buyPrice(port, id);
        qty = Math.min(qty, Math.floor(pl.gold / unit), p.cargoCap() - p.cargoUsed());
        if (qty <= 0) return 0;
        pl.gold -= unit * qty;
        p.cargo[id] = (p.cargo[id] || 0) + qty;
      } else {
        qty = Math.min(-qty, p.cargo[id] || 0);
        if (qty <= 0) return 0;
        const unit = this.sellPrice(port, id);
        pl.gold += unit * qty;
        p.cargo[id] -= qty;
        if (!p.cargo[id]) delete p.cargo[id];
        pl.stats.trades += unit * qty;
        qty = -qty;
      }
      const mk = G.markets[port.id] || (G.markets[port.id] = {});
      mk[id] = HS.clamp((mk[id] || 0) + qty * 0.005, -0.5, 0.6);
      return qty;
    },
    cargoValue(cargo, port) {
      let v = 0;
      for (const k in cargo) v += cargo[k] * (port ? this.sellPrice(port, k) : GOOD[k].base);
      return v;
    },
  });

  // ---------------------------------------------------------------- the game object
  const G = (HS.Game = {
    mode: 'menu', state: 'menu', t: 0, clock: 8, timeScale: 1,
    ships: [], player: null, flotsam: [], messages: [], markets: {},
    wind: { dir: 2.4, speed: 14, tdir: 2.4, tspeed: 14, vx: 0, vy: 0 },
    weather: { storm: 0, stormT: 0, lightning: 0, nextCheck: 0 },
    cam: { x: 0, y: 0, zoom: 1, tz: 1 },
    pl: null, spawnT: 0, hostT: 0, dockable: null, fortT: {}, lastBell: -1,

    init() {
      this.canvas = document.getElementById('game');
      this.ctx = this.canvas.getContext('2d');
      this.light = document.createElement('canvas');
      this.lctx = this.light.getContext('2d');
      window.addEventListener('resize', () => this.resize());
      this.resize();
      Input.init(this.canvas);
      HS.World.init(1715);
      HS.Voice.init();
      HS.Dialog.init();
      this._makeClouds();
      this.rain = Array.from({ length: 260 }, () => ({ x: Math.random(), y: Math.random(), l: HS.rand(0.6, 1.2) }));
      HS.UI.init();
      this.startMenu();
      let last = performance.now();
      const loop = (now) => {
        const dt = Math.min(0.05, (now - last) / 1000); last = now;
        try { this.frame(dt); } catch (e) { console.error(e); }
        Input.endFrame();
        requestAnimationFrame(loop);
      };
      requestAnimationFrame(loop);
    },
    resize() {
      this.dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      this.w = window.innerWidth; this.h = window.innerHeight;
      for (const c of [this.canvas, this.light]) { c.width = Math.round(this.w * this.dpr); c.height = Math.round(this.h * this.dpr); }
      this.canvas.style.width = this.w + 'px'; this.canvas.style.height = this.h + 'px';
    },

    // ------------------------------------------------------------ modes
    startMenu() {
      this.mode = 'menu'; this.state = 'menu';
      HS.FX.reset();
      this.ships = []; this.player = null; this.flotsam = [];
      const c = HS.toWorld(-77.6, 16.9);
      this.menuCenter = c;
      this.cam.x = c.x; this.cam.y = c.y; this.cam.zoom = this.cam.tz = 1.5;
      this.wind = { dir: 2.6, speed: 16, tdir: 2.6, tspeed: 16, vx: 0, vy: 0 };
      this.weather.storm = 0;
      this.clock = 16.5;
      const roles = [['frigate', 'navy', 'british'], ['brigantine', 'pirate', 'pirate'], ['indiaman', 'merchant', 'british'], ['sloop', 'pirate', 'pirate'], ['galleon', 'merchant', 'spanish']];
      roles.forEach(([type, role, nation], i) => {
        const pos = HS.World.randomWater(c.x, c.y, 120, 520) || c;
        const s = new HS.Ship(type, { x: pos.x, y: pos.y, angle: Math.random() * 6, role, nation, sail: 2 });
        s.hostileToPlayer = role === 'pirate';
        this.ships.push(s);
        void i;
      });
      HS.UI.showMenu();
    },

    newCampaign(opts) {
      this.mode = 'campaign';
      HS.FX.reset();
      this.ships = []; this.flotsam = []; this.messages = []; this.markets = {};
      this.clock = 8;
      const nation = opts.nation;
      const startPort = { british: 'Port Royal', spanish: 'Havana', french: 'Fort-de-France', dutch: 'Willemstad', portuguese: 'Salvador', pirate: 'Tortuga' }[nation] || 'Port Royal';
      const port = HS.World.ports.find((p) => p.name === startPort);
      const rep = {};
      for (const k in HS.NATIONS) rep[k] = 0;
      if (nation === 'pirate') { for (const k in rep) rep[k] = -10; rep.pirate = 45; }
      else { rep[nation] = 25; (RIVALS[nation] || []).forEach((r) => (rep[r] = -10)); rep.pirate = -5; }
      this.pl = {
        name: opts.name || 'Jack Hawkins', nation, gold: nation === 'pirate' ? 1200 : 1800, rep, notoriety: nation === 'pirate' ? 40 : 0, fame: 0,
        rations: 45 * 30, missions: [], maps: [], discovered: [], looted: [], visited: [port.id], nextMission: 1,
        inspected: {}, stats: { sunk: 0, captured: 0, treasures: 0, nm: 0, trades: 0, shotsFired: 0, isles: 0 },
        portrait: HS.makeCaptain('player', nation === 'pirate' ? 'british' : nation, { gender: opts.gender }),
      };
      this.pl.portrait.name = this.pl.name; this.pl.portrait.title = 'Captain'; this.pl.portrait.role = 'player';
      HS.World.isles.forEach((i) => (i.discovered = false));
      this.player = new HS.Ship(opts.ship || 'sloop', { x: port.berth.x, y: port.berth.y, angle: port.seaDir, isPlayer: true, nation: nation === 'pirate' ? 'pirate' : nation, role: 'player', name: opts.shipName || 'Fortune', crew: 30, sail: 0 });
      this.player.captain = this.pl.portrait;
      this.player.cargo = { rum: 5 };
      this.ships.push(this.player);
      this.cam.x = this.player.x; this.cam.y = this.player.y; this.cam.zoom = this.cam.tz = 1.6;
      this.setPrevailingWind(true);
      this.enterPort(port, true);
      this.log(`${this.dateString()} — Captain ${this.pl.name} takes command of the ${HS.SHIPS[this.player.type].name} ${this.player.name}.`, '#e8c86a');
    },

    startSkirmish(cfg) {
      this.mode = 'skirmish';
      HS.FX.reset();
      this.ships = []; this.flotsam = []; this.messages = [];
      this.pl = null;
      const site = cfg.site;
      const c = HS.toWorld(site.lon, site.lat);
      this.clock = { day: 11, dusk: 18.6, night: 23, dawn: 5.6 }[cfg.time] || 11;
      const ws = { calm: 7, breeze: 16, gale: 36 }[cfg.weather] || 16;
      const wd = Math.random() * HS.TAU;
      this.wind = { dir: wd, speed: ws, tdir: wd, tspeed: ws, vx: 0, vy: 0 };
      this.weather.storm = cfg.weather === 'gale' ? 0.8 : 0;
      this.weather.stormT = cfg.weather === 'gale' ? 1e9 : 0;
      const start = HS.World.randomWater(c.x, c.y, 0, 200, 60) || c;
      const enemyNation = cfg.enemyNation;
      this.player = new HS.Ship(cfg.ship, { x: start.x, y: start.y, angle: wd + Math.PI / 2, isPlayer: true, team: 'A', nation: cfg.nation, role: 'navy', name: cfg.shipName || HS.pick(HS.NAMES.ship), crew: HS.SHIPS[cfg.ship].crewMax, sail: 2 });
      this.player.captain = HS.makeCaptain('navy', cfg.nation);
      this.ships.push(this.player);
      const pickType = (i) => cfg.enemyType === 'match' ? cfg.ship : cfg.enemyType === 'random' ? HS.pick(HS.SKIRMISH_ORDER.filter((t) => !HS.SHIPS[t].steam || HS.SHIPS[cfg.ship].steam)) : cfg.enemyType;
      const a0 = Math.random() * HS.TAU;
      for (let i = 0; i < cfg.enemies; i++) {
        const pos = HS.World.randomWater(start.x + Math.cos(a0) * 1000, start.y + Math.sin(a0) * 1000, 0, 260, 60) || { x: start.x + Math.cos(a0) * 1000 + i * 120, y: start.y + Math.sin(a0) * 1000 };
        const s = new HS.Ship(pickType(i), { x: pos.x, y: pos.y, angle: a0 + Math.PI + HS.rand(-0.3, 0.3), team: 'B', nation: enemyNation === 'pirate' ? 'pirate' : enemyNation, role: enemyNation === 'pirate' ? 'pirate' : 'navy', sail: 3 });
        s.crew = s.T.crewMax;
        this.ships.push(s);
      }
      for (let i = 0; i < cfg.allies; i++) {
        const pos = HS.World.randomWater(start.x, start.y, 150, 320, 60) || { x: start.x - 150 * (i + 1), y: start.y };
        const s = new HS.Ship(i === 0 ? cfg.ship : pickType(i), { x: pos.x, y: pos.y, angle: this.player.angle, team: 'A', nation: cfg.nation, role: 'navy', sail: 2 });
        s.crew = s.T.crewMax;
        this.ships.push(s);
      }
      this.skirmish = { cfg, fired: 0, hits: 0, dmg: 0, start: this.t, over: false };
      this.cam.x = this.player.x; this.cam.y = this.player.y; this.cam.zoom = this.cam.tz = 1.25;
      this.state = 'sea';
      HS.UI.hideAll();
      this.log(`Beat to quarters! ${cfg.enemies} enemy ${cfg.enemies > 1 ? 'sail' : 'sail'} sighted — ${site.name}.`, '#ff9c7a');
      HS.Audio.bell(4);
    },

    // ------------------------------------------------------------ frame
    frame(dt) {
      this.t += dt;
      // the world holds its breath while someone is talking
      if ((this.state === 'sea' && !HS.Dialog.open) || this.state === 'menu') {
        let steps = 1, sdt = dt;
        if (this.state === 'sea' && this.mode === 'campaign' && this.timeScale > 1) { steps = this.timeScale; }
        for (let i = 0; i < steps; i++) this.update(sdt);
      }
      if (this.state === 'sea') this.controls(dt);
      this.updateCamera(dt);
      if (this.state !== 'port') this.render();
      HS.Audio.setAmbient(this.wind.speed, this.weather.storm > 0.4, this.state === 'port');
      HS.UI.frame(dt);
    },

    controls(dt) {
      const p = this.player;
      if (!p) return;
      if (HS.Dialog.open) return;
      const I = Input;
      if (I.hit('Escape', 'KeyP')) { HS.UI.showPause(); return; }
      if (I.hit('KeyH', 'F1')) { HS.UI.showHelp(); return; }
      if (I.hit('KeyN')) this.log(HS.Audio.toggleMusic() ? 'Music on' : 'Music off');
      if (I.hit('KeyV')) this.log(HS.Voice.toggle() ? 'Voices on' : 'Voices off');
      if (I.wheel) this.cam.tz = HS.clamp(this.cam.tz * (I.wheel > 0 ? 0.88 : 1.14), 0.28, 3.2);
      if (I.hit('Equal', 'NumpadAdd')) this.cam.tz = HS.clamp(this.cam.tz * 1.2, 0.28, 3.2);
      if (I.hit('Minus', 'NumpadSubtract')) this.cam.tz = HS.clamp(this.cam.tz / 1.2, 0.28, 3.2);
      if (p.sinking) return;
      const names = p.T.steam ? HS.STEAM_NAMES : HS.SAIL_NAMES;
      if (I.hit('KeyW', 'ArrowUp') && p.sail < 3) { p.sail++; this.log(p.T.steam ? `Engine room: ${names[p.sail]}!` : `"${['', 'Loose topsails!', 'Make plain sail!', 'Crowd on all canvas!'][p.sail]}" — ${names[p.sail]}`); }
      if (I.hit('KeyS', 'ArrowDown') && p.sail > 0) { p.sail--; this.log(p.T.steam ? `Engine room: ${names[p.sail]}.` : `"${['Furl all sails!', 'Shorten sail to topsails!', 'Take in the royals!'][p.sail]}" — ${names[p.sail]}`); }
      const steer = (I.down('KeyA', 'ArrowLeft') ? -1 : 0) + (I.down('KeyD', 'ArrowRight') ? 1 : 0);
      if (steer) p.rudder = HS.clamp(p.rudder + steer * dt * 2.6, -1, 1);
      else p.rudder *= 1 - Math.min(1, dt * 2.5);
      if (I.hit('KeyX')) p.rudder = 0;
      if (I.hit('Digit1')) { p.ammo = 'round'; this.log('Load round shot!'); }
      if (I.hit('Digit2')) { p.ammo = 'chain'; this.log('Load chain shot — aim for her rigging!'); }
      if (I.hit('Digit3')) { p.ammo = 'grape'; this.log('Load grape — sweep her decks!'); }
      if (I.hit('KeyQ')) this.playerFire(-1);
      if (I.hit('KeyE')) this.playerFire(1);
      if (I.hit('Space')) { this.playerFire(-1); this.playerFire(1); }
      if (p.T.turrets) {
        const mw = this.screenToWorld(I.mouse.x, I.mouse.y);
        p.aimTurrets(mw.x, mw.y, dt);
        if (I.mouse.down || I.down('Space')) { if (p.fireTurrets(this)) { if (this.skirmish) this.skirmish.fired++; } }
        if (I.hit('KeyF')) { if (p.fireTorpedo(this)) this.log(`Torpedo away! (${p.torps} remaining)`); else if (!p.torps) this.log('No torpedoes left in the tubes.'); }
      }
      if (I.hit('KeyB')) this.tryBoard();
      if (I.hit('KeyG')) this.hailNearest();
      if (this.mode === 'campaign') {
        if (I.hit('Enter', 'NumpadEnter')) this.tryDock();
        if (I.hit('KeyL')) this.landingParty();
        if (I.hit('KeyM')) HS.UI.showChart();
        if (I.hit('KeyC')) HS.UI.showLog();
        if (I.hit('BracketRight', 'Period')) this.setTimeScale(this.timeScale * 2);
        if (I.hit('BracketLeft', 'Comma')) this.setTimeScale(this.timeScale / 2);
      }
    },
    setTimeScale(s) {
      s = HS.clamp(Math.round(s), 1, 8);
      if (s > 1 && this.enemiesNear(1600)) { this.log('Not with enemy sail in sight, Captain!', '#ff9c7a'); s = 1; }
      this.timeScale = s;
      this.log(`Time: ×${s}`);
    },
    enemiesNear(r) { return this.ships.some((s) => s !== this.player && !s.sinking && !s.struck && this.hostile(s, this.player) && HS.distW(s.x, s.y, this.player.x, this.player.y) < r); },
    playerFire(side) {
      const p = this.player;
      if (p.T.guns <= 0) return;
      if (p.fire(side, this)) {
        if (this.pl) this.pl.stats.shotsFired++;
        if (this.skirmish) this.skirmish.fired++;
        this.log(side < 0 ? 'Larboard battery — FIRE!' : 'Starboard battery — FIRE!', '#ffd28a');
      } else if (p.reload[side] > 0 && this.t - (this._reloadMsgT || 0) > 1.5) {
        this._reloadMsgT = this.t;
        this.log(`${side < 0 ? 'Larboard' : 'Starboard'} guns still reloading (${p.reload[side].toFixed(1)}s)`);
      }
    },

    // ------------------------------------------------------------ simulation
    update(dt) {
      const camp = this.mode === 'campaign' && this.state === 'sea';
      const gameDt = dt;
      if (this.mode !== 'skirmish') this.clock += gameDt * HOURS_PER_SEC;
      this.updateWind(gameDt);
      this.updateWeather(gameDt);
      for (const s of this.ships) {
        if (!s.isPlayer && !s.sinking) HS.AI.update(s, this, gameDt);
        s.update(gameDt, this);
        // wake
        s.wakeT -= gameDt;
        if (s.wakeT <= 0 && Math.abs(s.speed) > 0.8 && !s.sinking) {
          s.wakeT = 0.09;
          const a = s.local(-s.L * 0.48, HS.rand(-2, 2));
          HS.FX.foam(a.x, a.y, s.B * 0.28, 3.2);
        }
        if (s.T.steam && !s.sinking) {
          s.smokeT -= gameDt;
          if (s.smokeT <= 0) {
            s.smokeT = 0.12;
            const funnels = s.type === 'ironclad' ? [0] : [0.02, -0.1, -0.2];
            for (const f of funnels) { const q = s.local(s.L * f, 0); HS.FX.smoke(q.x, q.y, 1, { col: 55, size: 4, grow: 18, life: 2.6 }); }
          }
        }
        if (s.onFire > 0 && Math.random() < gameDt * 8) { const q = s.local(HS.rand(-s.L * 0.3, s.L * 0.3), 0); HS.FX.smoke(q.x, q.y, 1, { col: 60, size: 5, grow: 20, life: 3 }); }
        if (s.sinking && Math.random() < gameDt * 10) HS.FX.foam(s.x + HS.rand(-s.L / 2, s.L / 2), s.y + HS.rand(-8, 8), 4, 1.5);
      }
      this.collide();
      HS.FX.update(gameDt, this);
      // the dead go to Davy Jones
      for (let i = this.ships.length - 1; i >= 0; i--) {
        const s = this.ships[i];
        if (s.dead) { this.ships.splice(i, 1); if (s.isPlayer) this.playerLost(); }
      }
      if (camp) this.campaignTick(gameDt);
      if (this.mode === 'skirmish' && this.state === 'sea') this.skirmishTick();
    },

    collide() {
      const ships = this.ships;
      for (let i = 0; i < ships.length; i++) {
        for (let j = i + 1; j < ships.length; j++) {
          const a = ships[i], b = ships[j];
          if (a.sinking || b.sinking) continue;
          const dx = HS.dxw(a.x, b.x), dy = b.y - a.y;
          const d = Math.hypot(dx, dy), min = (a.B + b.B) * 0.5 + Math.min(a.L, b.L) * 0.18;
          if (d >= min || d === 0) continue;
          if (!(a.contains(b.x, b.y, b.B * 0.6) || b.contains(a.x, a.y, a.B * 0.6) || d < min * 0.8)) continue;
          const push = (min - d) * 0.5, nx = dx / d, ny = dy / d;
          const ma = a.L * a.L, mb = b.L * b.L;
          a.x = HS.wrapX(a.x - nx * push * (mb / (ma + mb)) * 2); a.y -= ny * push * (mb / (ma + mb)) * 2;
          b.x = HS.wrapX(b.x + nx * push * (ma / (ma + mb)) * 2); b.y += ny * push * (ma / (ma + mb)) * 2;
          const rel = Math.abs(a.speed - b.speed) + Math.abs(a.speed + b.speed) * 0.3;
          if (rel > 4 && !a._bump && !b._bump) {
            a.hull -= rel * 0.6 * (mb / ma); b.hull -= rel * 0.6 * (ma / mb);
            a.speed *= 0.5; b.speed *= 0.5;
            a._bump = b._bump = 1;
            setTimeout(() => { a._bump = b._bump = 0; }, 1500);
            HS.FX.splinters((a.x + HS.wrapX(a.x + dx / 2)) / 2, a.y + dy / 2, 10);
            this.sound('crunch', a.x, a.y);
            if (a.isPlayer || b.isPlayer) this.log('Collision! Timbers groan as the hulls grind together.', '#ff9c7a');
            if (a.hull <= 0) a.sink(this);
            if (b.hull <= 0) b.sink(this);
          }
        }
      }
    },

    // ------------------------------------------------------------ wind & weather
    prevailing(lat) {
      const a = Math.abs(lat);
      if (a < 5) return { dir: Math.random() * HS.TAU, speed: HS.rand(3, 8) };
      if (a < 30) return { dir: lat > 0 ? 2.35 : -2.35, speed: HS.rand(12, 19) };
      if (a < 38) return { dir: Math.random() * HS.TAU, speed: HS.rand(6, 14) };          // horse latitudes
      if (a < 62) return { dir: lat > 0 ? -0.3 : 0.25, speed: lat < -38 ? HS.rand(22, 32) : HS.rand(14, 23) };
      return { dir: Math.PI, speed: HS.rand(10, 18) };
    },
    setPrevailingWind(now) {
      if (!this.player) return;
      const { lat } = HS.toLonLat(this.player.x, this.player.y);
      const p = this.prevailing(lat);
      this.wind.tdir = p.dir + HS.rand(-0.5, 0.5);
      this.wind.tspeed = p.speed;
      if (now) { this.wind.dir = this.wind.tdir; this.wind.speed = this.wind.tspeed; }
    },
    updateWind(dt) {
      const w = this.wind;
      if (this.mode === 'campaign') {
        w.retarget = (w.retarget || 0) - dt;
        if (w.retarget <= 0) { w.retarget = HS.rand(25, 60); this.setPrevailingWind(false); }
      }
      const target = w.tspeed * (1 + this.weather.storm * 1.6) + Math.sin(this.t * 0.37) * 1.5 + Math.sin(this.t * 1.3) * 0.8;
      w.speed += (target - w.speed) * Math.min(1, dt * 0.15);
      w.dir += HS.angNorm(w.tdir + Math.sin(this.t * 0.05) * 0.25 - w.dir) * Math.min(1, dt * 0.04);
      w.vx = Math.cos(w.dir) * w.speed * 0.9; w.vy = Math.sin(w.dir) * w.speed * 0.9;
    },
    updateWeather(dt) {
      const wt = this.weather;
      if (this.mode === 'campaign' && this.player) {
        wt.nextCheck -= dt;
        if (wt.nextCheck <= 0) {
          wt.nextCheck = 40;
          if (wt.stormT <= 0) {
            const { lon, lat } = HS.toLonLat(this.player.x, this.player.y);
            let p = 0.025;
            if (lon > -95 && lon < -55 && lat > 10 && lat < 32) p = 0.06;      // hurricane belt
            if (lat < -38) p = 0.09;                                       // roaring forties
            if (lon > 105 && lon < 140 && lat > 10 && lat < 35) p = 0.06;  // typhoons
            if (Math.random() < p) {
              wt.stormT = HS.rand(60, 160);
              this.log('The glass is falling fast — a storm is brewing. Shorten sail, Captain!', '#9fd0ff');
            }
          }
        }
        if (wt.stormT > 0) wt.stormT -= dt;
      }
      const target = wt.stormT > 0 ? 1 : 0;
      wt.storm += (target - wt.storm) * Math.min(1, dt * 0.06);
      if (wt.storm > 0.55 && Math.random() < dt * 0.12) { wt.lightning = 1; HS.Audio.thunder(); }
      wt.lightning = Math.max(0, wt.lightning - dt * 2.5);
    },

    // ------------------------------------------------------------ campaign rules
    campaignTick(dt) {
      const p = this.player, pl = this.pl, W = HS.World;
      if (!p || p.sinking) return;
      const days = (dt * HOURS_PER_SEC) / 24;
      pl.stats.nm += Math.abs(p.speed) * HS.KN * dt * HS.NM_PER_PX;
      // provisions
      pl.rations -= p.crew * days;
      if (pl.rations <= 0) {
        pl.rations = 0;
        pl.starveT = (pl.starveT || 0) + days;
        if (pl.starveT > 0.5) { pl.starveT = 0; const lost = Math.max(1, Math.round(p.crew * 0.04)); p.crew = Math.max(1, p.crew - lost); this.log(`The larder is empty! ${lost} hands have perished or deserted.`, '#ff7a6a'); }
      } else if (pl.rations < p.crew * 3 && !pl.lowFoodWarned) { pl.lowFoodWarned = true; this.log('Purser reports: less than three days of provisions remain!', '#ffb36a'); }
      if (pl.rations > p.crew * 5) pl.lowFoodWarned = false;
      // gale damage to canvas
      if (!p.T.steam && this.wind.speed > 30 && p.sail >= 2) {
        const k = (this.wind.speed - 30) / 10 * (p.sail - 1);
        p.sails -= dt * k * 1.2;
        pl.galeWarn = (pl.galeWarn || 0) - dt;
        if (pl.galeWarn <= 0) { pl.galeWarn = 14; this.log(`${HS.pick(['The fore-topsail has split!', 'A main topgallant blows out of its bolt-ropes!', 'The rigging shrieks in the gale!'])} Shorten sail!`, '#ffb36a'); }
        if (p.sails <= 0) p.sails = 0;
      }
      // a bell for each change of watch
      const watch = Math.floor(this.clock / 4);
      if (watch !== this.lastBell) { if (this.lastBell >= 0) HS.Audio.bell(4); this.lastBell = watch; }
      // daily market drift
      const day = Math.floor(this.clock / 24);
      if (day !== this.lastDay) {
        this.lastDay = day;
        for (const pid in this.markets) for (const g in this.markets[pid]) this.markets[pid][g] *= 0.85;
        this.checkDeadlines();
      }

      // spawn & despawn
      this.spawnT -= dt;
      if (this.spawnT <= 0) { this.spawnT = 1.2; this.spawnShips(); }
      this.hostT -= dt;
      if (this.hostT <= 0) { this.hostT = 1.5; for (const s of this.ships) if (!s.isPlayer) this.updateHostility(s); }

      // discovery
      for (const isle of W.isles) {
        if (isle.discovered) continue;
        if (HS.distW(p.x, p.y, isle.x, isle.y) < 650) {
          isle.discovered = true; pl.discovered.push(isle.idx); pl.stats.isles++; pl.fame += 15;
          const rel = HS.angNorm(Math.atan2(isle.y - p.y, HS.dxw(p.x, isle.x)) - p.angle);
          const where = Math.abs(rel) < 0.5 ? 'dead ahead' : Math.abs(rel) > 2.6 ? 'astern' : rel > 0 ? 'off the starboard bow' : 'off the larboard bow';
          this.log(`LAND HO! An uncharted island ${where} — we'll call her ${isle.name}.`, '#9fe8a0');
          HS.Audio.bell(2);
        }
      }
      // flotsam
      for (let i = this.flotsam.length - 1; i >= 0; i--) {
        const f = this.flotsam[i];
        f.life -= dt;
        f.x = HS.wrapX(f.x + this.wind.vx * dt * 0.08); f.y += this.wind.vy * dt * 0.08;
        if (f.life <= 0) { this.flotsam.splice(i, 1); continue; }
        if (HS.distW(p.x, p.y, f.x, f.y) < p.L * 0.6 + 14) { this.pickFlotsam(f); this.flotsam.splice(i, 1); }
      }
      // docking & forts
      const near = W.nearestPort(p.x, p.y);
      this.dockable = near.dist < 230 ? near.port : null;
      for (const port of W.ports) {
        const d = HS.distW(p.x, p.y, port.x, port.y);
        if (d > 1600 || !this.portHostile(port)) continue;
        if (!port._layout) W._layoutPort(port);
        this.fortT[port.id] = (this.fortT[port.id] || 0) - dt;
        if (d < 480 && this.fortT[port.id] <= 0) {
          this.fortT[port.id] = 3.2;
          const f = port.fortPos;
          const dist = HS.distW(f.x, f.y, p.x, p.y), lead = dist / 340;
          const tx = p.x + Math.cos(p.angle) * p.speed * HS.KN * lead, ty = p.y + Math.sin(p.angle) * p.speed * HS.KN * lead;
          const a = Math.atan2(ty - f.y, HS.dxw(f.x, tx)) + HS.rand(-0.05, 0.05);
          for (let k = 0; k < 3; k++) {
            const aa = a + HS.rand(-0.06, 0.06);
            HS.FX.addRaw({ x: f.x, y: f.y, vx: Math.cos(aa) * 340, vy: Math.sin(aa) * 340, range: dist * HS.rand(0.95, 1.08), dmg: 9, type: 'fort', owner: { isFort: true, nation: port.nation, name: port.name } });
          }
          HS.FX.smoke(f.x, f.y, 4, { size: 9, life: 3 });
          HS.FX.part({ type: 'flash', x: f.x, y: f.y, size: 16, life: 0.2 });
          this.sound('cannon', f.x, f.y);
          if (!port._warned) { port._warned = true; this.log(`The fort at ${port.name} opens fire upon us!`, '#ff7a6a'); }
        }
      }
      // bounty targets appear when we reach their cruising ground
      for (const m of pl.missions) {
        if (m.type !== 'bounty' || m.done || m.failed || m.spawned) continue;
        if (HS.distW(p.x, p.y, m.x, m.y) < 1500) this.spawnMissionShip(m);
      }
    },

    spawnShips() {
      const p = this.player, W = HS.World;
      const { lon, lat } = HS.toLonLat(p.x, p.y);
      let n = 0;
      for (let i = this.ships.length - 1; i >= 0; i--) {
        const s = this.ships[i];
        if (s.isPlayer) continue;
        const d = HS.distW(s.x, s.y, p.x, p.y);
        if (d > 3400 && !s.mission) { this.ships.splice(i, 1); continue; }
        if (d > 5000 && s.mission) { const m = this.pl.missions.find((mm) => mm.id === s.mission); if (m) m.spawned = false; this.ships.splice(i, 1); continue; }
        n++;
      }
      const near = W.nearestPort(p.x, p.y, (pp) => pp.nation !== 'pirate');
      const nearDeg = near.dist / HS.S;
      const want = nearDeg < 10 ? 7 : nearDeg < 20 ? 5 : 3;
      if (n >= want) return;
      const viewR = Math.max(this.w, this.h) / 2 / this.cam.zoom;
      const pos = W.randomWater(p.x, p.y, Math.max(1300, viewR + 150), Math.max(2000, viewR + 700), 12);
      if (!pos) return;
      // who sails these waters?
      let pirateP = 0.12;
      if (lon > -92 && lon < -58 && lat > 8 && lat < 30) pirateP = 0.32;
      const haven = W.nearestPort(p.x, p.y, (pp) => pp.haven);
      if (haven.dist < 12 * HS.S) pirateP = 0.42;
      if (lon > 95 && lon < 120 && lat > -8 && lat < 12) pirateP = 0.28;
      if (lon > -8 && lon < 15 && lat > 34 && lat < 44) pirateP = 0.25;
      pirateP *= 1 + Math.min(1, this.pl.fame / 4000) * 0.4;
      const r = Math.random();
      let role, type, nation = near.port.nation;
      const fameK = Math.min(1, this.pl.fame / 2500);
      if (r < pirateP) {
        role = 'pirate'; nation = 'pirate';
        type = HS.pick(fameK > 0.5 ? ['brigantine', 'brig', 'corvette', 'frigate', 'schooner'] : ['sloop', 'schooner', 'sloop', 'brigantine', 'brig']);
      } else if (r < pirateP + (nearDeg < 8 ? 0.22 : 0.05)) {
        role = 'coastguard'; type = HS.pick(['cutter', 'cutter', 'brig']);
      } else if (r < pirateP + (nearDeg < 8 ? 0.22 : 0.05) + 0.1) {
        role = 'navy'; type = HS.pick(['corvette', 'frigate', 'frigate', 'brig', 'shipOfLine']);
      } else {
        role = 'merchant';
        const asia = lon > 40 && lon < 150;
        type = HS.pick(asia ? ['indiaman', 'fluyt', 'brigantine', 'indiaman'] : nation === 'spanish' ? ['galleon', 'fluyt', 'brigantine', 'schooner'] : ['fluyt', 'brigantine', 'schooner', 'sloop', 'indiaman']);
      }
      const hullMul = role === 'pirate' && fameK > 0.3 ? 1 + fameK * 0.3 : 1;
      const s = new HS.Ship(type, { x: pos.x, y: pos.y, angle: Math.random() * HS.TAU, role, nation, sail: 2, hullMul });
      s.home = near.port;
      if (role === 'merchant') {
        const goods = near.port.produces.filter((g) => !GOOD[g].illicit);
        const cap = s.cargoCap();
        s.cargo = {};
        goods.forEach((g) => (s.cargo[g] = Math.round(cap * HS.rand(0.15, 0.4))));
        s.gold = Math.round(HS.rand(100, 600) * (cap / 100));
        if (type === 'galleon') { s.cargo.silver = Math.round(cap * 0.3); s.gold += 2000; }
      } else if (role === 'pirate') {
        s.gold = Math.round(HS.rand(200, 900) * (1 + fameK));
        s.cargo = { [HS.pick(['rum', 'contraband', 'sugar', 'spices', 'silk'])]: Math.round(s.cargoCap() * HS.rand(0.1, 0.4)) };
      } else s.gold = Math.round(HS.rand(100, 400));
      this.updateHostility(s);
      this.ships.push(s);
    },
    spawnMissionShip(m) {
      const pos = HS.World.randomWater(m.x, m.y, 0, 500, 30);
      if (!pos) return;
      const s = new HS.Ship(m.shipType, { x: pos.x, y: pos.y, angle: Math.random() * 6, role: m.role, nation: m.nation, name: m.shipName, sail: 2 });
      s.captain = m.captain;
      s.mission = m.id;
      s.crew = s.T.crewMax;
      s.gold = m.loot || 800;
      if (m.role === 'merchant') { s.cargo = { silver: Math.round(s.cargoCap() * 0.35), cocoa: Math.round(s.cargoCap() * 0.2) }; }
      else s.cargo = { contraband: Math.round(s.cargoCap() * 0.3) };
      this.updateHostility(s);
      if (m.role !== 'merchant') s.hostileToPlayer = true;
      this.ships.push(s);
      m.spawned = true;
      this.log(`Lookout: "Sail ho! She's flying ${m.role === 'merchant' ? 'Spanish colours — the galleon!' : 'the black flag — it\'s the ' + m.shipName + '!'}"`, '#ffd28a');
    },

    hostile(a, b) {
      if (a.team && b.team) return a.team !== b.team;
      if (a.isPlayer) return b.hostileToPlayer;
      if (b.isPlayer) return a.hostileToPlayer;
      const pa = a.role === 'pirate' || a.role === 'hunter', pb = b.role === 'pirate' || b.role === 'hunter';
      if (pa !== pb) return true;
      return false;
    },
    updateHostility(s) {
      if (!this.pl || s.team) return;
      const pl = this.pl;
      if (s.role === 'pirate') s.hostileToPlayer = s.provoked || !(pl.notoriety >= 60 || pl.rep.pirate >= 40);
      else if (s.role === 'hunter') s.hostileToPlayer = true;
      else if (s.role === 'coastguard' || s.role === 'navy') s.hostileToPlayer = s.provoked || pl.rep[s.nation] <= -30 || pl.notoriety >= 55;
      else s.hostileToPlayer = !!s.provoked;
      if (s.struck) s.hostileToPlayer = false;
    },
    portHostile(port) {
      if (!this.pl) return false;
      if (port.nation === 'pirate') return this.pl.rep.pirate <= -40;
      return this.pl.rep[port.nation] <= -30 || this.pl.notoriety >= 70;
    },
    changeRep(nation, d, quiet) {
      const pl = this.pl;
      if (!pl || !(nation in pl.rep)) return;
      const before = pl.rep[nation];
      pl.rep[nation] = HS.clamp(pl.rep[nation] + d, -100, 100);
      if (d < 0) (RIVALS[nation] || []).forEach((r) => (pl.rep[r] = HS.clamp(pl.rep[r] + Math.abs(d) * 0.25, -100, 100)));
      if (!quiet && before > -30 && pl.rep[nation] <= -30) this.log(`${HS.NATIONS[nation].name} now counts you an enemy. Their ports and warships will be hostile.`, '#ff7a6a');
    },
    repName(v) { return v >= 60 ? 'Honoured' : v >= 25 ? 'Friendly' : v > -10 ? 'Neutral' : v > -30 ? 'Suspicious' : v > -60 ? 'Hostile' : 'At war'; },
    rank() {
      const pl = this.pl;
      if (!pl) return '';
      const lawful = [[0, 'Ship\'s Master'], [200, 'Captain'], [700, 'Post-Captain'], [1600, 'Commodore'], [3200, 'Rear Admiral'], [6000, 'Admiral of the Fleet']];
      const pirate = [[0, 'Sea Rover'], [200, 'Buccaneer'], [700, 'Corsair'], [1600, 'Pirate Captain'], [3200, 'Terror of the Seas'], [6000, 'Pirate King']];
      const tbl = pl.notoriety >= 60 ? pirate : lawful;
      let r = tbl[0][1];
      for (const [f, n] of tbl) if (pl.fame >= f) r = n;
      return r;
    },

    // ------------------------------------------------------------ events from ships & shots
    onGrounding(ship, dmg) {
      if (ship.isPlayer) { this.log(`We've run aground! The keel grinds on the shoals (−${Math.round(dmg)} hull).`, '#ff9c7a'); this.sound('crunch', ship.x, ship.y); HS.UI.shake(6); }
    },
    onFire(ship, side) {
      this.sound('cannon', ship.x, ship.y, ship.T.gunCal >= 18);
      if (ship.isPlayer) HS.UI.shake(3);
      void side;
    },
    onShipHit(ship, from, type, dmg) {
      if (ship.isPlayer) HS.UI.shake(type === 'torpedo' ? 12 : 4);
      if (this.skirmish && from && from.isPlayer) { this.skirmish.hits++; this.skirmish.dmg += dmg; }
      if (this.mode !== 'campaign' || !from) return;
      if (from.isPlayer && !ship.isPlayer && !ship.hostileToPlayer && !ship.struck) {
        // we fired on someone who meant us no harm
        ship.provoked = true; ship.hostileToPlayer = true;
        const pl = this.pl;
        const penalty = ship.role === 'navy' ? 20 : ship.role === 'coastguard' ? 15 : ship.role === 'merchant' ? 12 : 4;
        if (ship.role !== 'pirate') {
          this.changeRep(ship.nation, -penalty);
          pl.notoriety = HS.clamp(pl.notoriety + (ship.role === 'merchant' ? 6 : 8), 0, 100);
          this.log(`You have fired upon a ${HS.NATIONS[ship.nation].adj} ${ship.role === 'merchant' ? 'merchantman' : 'warship'}! ${ship.role === 'merchant' ? 'This is piracy, Captain.' : 'This means war.'}`, '#ff7a6a');
        } else { ship.provoked = true; this.changeRep('pirate', -4, true); }
        for (const o of this.ships) {
          if (o === ship || o.isPlayer || o.nation !== ship.nation) continue;
          if ((o.role === 'navy' || o.role === 'coastguard' || o.role === 'pirate') && HS.distW(o.x, o.y, ship.x, ship.y) < 1400) { o.provoked = true; o.hostileToPlayer = true; }
        }
      }
      if (from.isFort && ship.isPlayer) { /* the fort's gunners are simply doing their duty */ }
    },
    onStrike(ship) {
      ship.sail = 0;
      ship.hostileToPlayer = false;
      if (ship.lastHitBy && ship.lastHitBy.isPlayer) {
        this.log(`The ${ship.name} strikes her colours! Close and board her (B).`, '#9fe8a0');
        HS.Audio.bell(2);
      }
      if (ship.ai) ship.ai.state = 'cruise';
    },
    onSink(ship) {
      this.sound('boom', ship.x, ship.y);
      HS.FX.explosion(ship.x, ship.y, 1.2);
      HS.FX.smoke(ship.x, ship.y, 10, { col: 90, size: 12, grow: 30, life: 5 });
      if (ship.isPlayer) { this.log('She\'s going down! Abandon ship!', '#ff6a5a'); return; }
      const byPlayer = ship.lastHitBy && ship.lastHitBy.isPlayer;
      if (this.mode === 'campaign') {
        // flotsam: barrels, crates and sometimes a sealed bottle
        const goods = Object.keys(ship.cargo).filter((k) => ship.cargo[k] > 0);
        const n = 2 + Math.floor(Math.random() * 3);
        for (let i = 0; i < n; i++) {
          const g = goods.length && Math.random() < 0.7 ? HS.pick(goods) : null;
          this.flotsam.push({ x: HS.wrapX(ship.x + HS.rand(-40, 40)), y: ship.y + HS.rand(-30, 30), good: g, qty: g ? Math.max(1, Math.round(ship.cargo[g] * HS.rand(0.1, 0.3))) : 0, gold: g ? 0 : Math.round(ship.gold * HS.rand(0.15, 0.35)) + 20, life: 120, seed: Math.random() * 10 });
        }
        if ((ship.role === 'pirate' || ship.role === 'hunter') && Math.random() < 0.35) this.flotsam.push({ x: ship.x, y: ship.y, map: true, life: 140, seed: 1 });
        if (byPlayer) {
          const pl = this.pl;
          pl.stats.sunk++;
          if (ship.role === 'pirate' || ship.role === 'hunter') {
            const bounty = Math.round(ship.T.price * 0.06 + 120);
            pl.gold += bounty; pl.fame += 30 + Math.round(ship.T.price / 1000);
            pl.notoriety = Math.max(0, pl.notoriety - 2);
            this.changeRep('pirate', -5, true);
            for (const k in pl.rep) if (k !== 'pirate') pl.rep[k] = Math.min(100, pl.rep[k] + 1.5);
            this.log(`The pirate ${ship.name} is sent to Davy Jones' locker! Bounty paid: ${bounty} pieces of eight.`, '#9fe8a0');
            HS.Audio.coins();
          } else {
            pl.fame += 15;
            pl.notoriety = Math.min(100, pl.notoriety + (ship.role === 'merchant' ? 5 : 3));
            this.changeRep(ship.nation, -10);
            this.log(`The ${HS.NATIONS[ship.nation].adj} ${ship.name} founders and goes down.`, '#ffb36a');
          }
          this.completeMissionFor(ship, 'sunk');
        }
      }
    },

    // ------------------------------------------------------------ ordnance (ships fire through the game)
    addShot(o) { HS.FX.addShot(o); },
    addShell(o) { HS.FX.addShell(o); },
    addTorpedo(o) { HS.FX.addTorpedo(o); },

    // ------------------------------------------------------------ sound helper
    sound(kind, x, y, heavy) {
      if (!HS.Audio.ctx) return;
      const dx = HS.dxw(this.cam.x, x), dy = y - this.cam.y;
      const d = Math.hypot(dx, dy);
      const vol = HS.clamp(1 - d / 2200, 0, 1) * (this.state === 'menu' ? 0.35 : 1);
      const pan = HS.clamp(dx / 900, -1, 1);
      if (kind === 'cannon') HS.Audio.cannon(vol, pan, heavy);
      else if (kind === 'boom') HS.Audio.cannon(vol * 1.2, pan, true);
      else if (kind === 'splash') HS.Audio.splash(vol * 0.6, pan);
      else if (kind === 'hit' || kind === 'crunch') HS.Audio.crunch(vol, pan);
    },
    log(text, color) {
      this.messages.push({ text, color: color || '#f2ead6', t: this.t });
      if (this.messages.length > 7) this.messages.shift();
      if (this.pl) { (this.pl.journal || (this.pl.journal = [])).push(`${this.dateString(true)} — ${text}`); if (this.pl.journal.length > 80) this.pl.journal.shift(); }
    },

    // ------------------------------------------------------------ time
    dateString(short) {
      const d = new Date(START_DATE + Math.floor(this.clock / 24) * 86400000);
      const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
      const s = `${d.getUTCDate()} ${short ? months[d.getUTCMonth()].slice(0, 3) : months[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
      return s;
    },
    hour() { return ((this.clock % 24) + 24) % 24; },
    watch() {
      const h = this.hour();
      const names = ['Middle watch', 'Morning watch', 'Forenoon watch', 'Afternoon watch', h < 18 ? 'First dog watch' : 'Last dog watch', 'First watch'];
      const bells = (Math.floor(((h % 4) * 60) / 30) % 8) || 8;
      return `${names[Math.floor(h / 4)]}, ${bells} bell${bells > 1 ? 's' : ''}`;
    },
    night() {
      const h = this.hour();
      if (h < 4 || h >= 21) return 1;
      if (h < 7) return 1 - (h - 4) / 3;
      if (h < 18) return 0;
      return (h - 18) / 3;
    },
    day() { return Math.floor(this.clock / 24); },

    // ------------------------------------------------------------ player actions
    nearestShip(maxD, filter) {
      let best = null, bd = maxD;
      for (const s of this.ships) {
        if (s.isPlayer || s.sinking || (filter && !filter(s))) continue;
        const d = HS.distW(s.x, s.y, this.player.x, this.player.y);
        if (d < bd) { bd = d; best = s; }
      }
      return best;
    },
    tryDock() {
      const port = this.dockable;
      if (!port) { this.log('No harbour close enough to drop anchor.'); return; }
      if (this.enemiesNear(700)) { this.log('Enemy sail too close to make harbour safely!', '#ff9c7a'); return; }
      if (this.portHostile(port)) { this.log(`${port.name}'s harbour is closed to you — the boom is across and the fort's guns are run out!`, '#ff7a6a'); return; }
      if (Math.abs(this.player.speed) > 6) { this.log('Shorten sail first — we\'re coming in too fast to anchor!'); return; }
      this.enterPort(port);
    },
    enterPort(port, first) {
      const p = this.player, pl = this.pl;
      p.x = port.berth.x; p.y = port.berth.y; p.speed = 0; p.sail = 0; p.rudder = 0; p.angle = port.seaDir + Math.PI;
      this.timeScale = 1;
      this.state = 'port';
      this.port = port;
      // the wider world moves on while we are ashore
      this.ships = this.ships.filter((s) => s.isPlayer || s.mission);
      HS.FX.reset();
      if (!pl.visited.includes(port.id)) { pl.visited.push(port.id); pl.fame += 5; }
      pl.lastPort = port.id;
      if (!first) HS.Audio.bell(2);
      const msgs = this.settleMissions(port);
      this.save(true);
      HS.UI.showPort(port, msgs);
    },
    leavePort() {
      const port = this.port, p = this.player;
      p.x = port.berth.x; p.y = port.berth.y; p.angle = port.seaDir; p.sail = 2; p.speed = 1.5;
      this.state = 'sea';
      this.port = null;
      this.spawnT = 3;
      this.cam.x = p.x; this.cam.y = p.y;
      this.setPrevailingWind(true);
      HS.UI.hideAll();
      this.log(`Weighed anchor at ${port.name}. ${this.watch()}.`, '#e8c86a');
    },

    hailNearest() {
      const s = this.nearestShip(420);
      if (!s) { this.log('No vessel within hailing distance.'); return; }
      if (this.mode !== 'campaign') { this.log(`Speaking trumpet raised — the ${s.name} answers only with her guns.`); return; }
      const c = s.captain, pl = this.pl;
      if (s.struck) { HS.Dialog.show(c, `We've struck, Captain! We yield — show mercy, I beg you.`, [{ label: 'Board her (B)', fn: () => this.tryBoard(s) }, { label: 'Leave them be' }]); return; }
      const nat = HS.NATIONS[s.nation];
      if (s.role === 'pirate' || s.role === 'hunter') {
        if (!s.hostileToPlayer) {
          HS.Dialog.show(c, `Ahoy, ${this.rank()} ${pl.name}! Your fame runs before ye. The Brethren don't prey on their own — fair winds and full holds, mate.`, [{ label: '"Fair winds to you, brother."' }, { label: 'Attack anyway (piracy among pirates!)', cls: 'danger', fn: () => { s.provoked = true; s.hostileToPlayer = true; } }]);
          return;
        }
        HS.Dialog.show(c, HS.pick([`Avast! Ye've sailed into the wrong waters. Strike yer colours and hand over the cargo, or we'll send ye to Davy Jones!`, `Heave to, ye lubbers! I'll be havin' yer gold — or yer guts for garters!`, `That's a fine ship ye've got. Be a shame to put holes in her. Pay up, and we'll let ye pass.`]), [
          { label: 'Fight! "You\'ll get naught but iron from us!"', cls: 'danger' },
          { label: `Pay tribute (${Math.round(pl.gold * 0.15)} gold)`, fn: () => { const g = Math.round(pl.gold * 0.15); pl.gold -= g; s.hostileToPlayer = false; s.provoked = false; s.ai = { state: 'leave', leaveDir: Math.random() * 6, think: 30, avoidT: 0, avoid: 0 }; this.log(`Paid ${g} pieces of eight. The pirates sheer off, laughing.`); } },
          { label: 'Parley — "Do you know who I am?"', disabled: pl.notoriety < 35 && pl.fame < 800, fn: () => { if (Math.random() < 0.4 + pl.fame / 4000 + pl.notoriety / 200) { s.hostileToPlayer = false; s.ai = { state: 'leave', leaveDir: Math.random() * 6, think: 30, avoidT: 0, avoid: 0 }; HS.Dialog.show(c, `...${pl.name}? Blimey. No offence meant, Cap'n. We'll be on our way.`, []); } else HS.Dialog.show(c, `Never heard of ye! Run out the guns, lads!`, []); } },
        ]);
        return;
      }
      if (s.hostileToPlayer) {
        HS.Dialog.show(c, `This is ${nat.prefix ? nat.prefix + ' ' : ''}${s.name} of the ${nat.navy}. ${pl.name}, you are a wanted criminal. Strike your colours and surrender, or be sunk!`, [
          { label: '"Never!" — fight', cls: 'danger' },
          { label: 'Surrender (lose cargo & a fine)', fn: () => this.surrender(s) },
        ]);
        return;
      }
      if (s.role === 'merchant') {
        HS.Dialog.show(c, HS.pick([`Ahoy there! The ${s.name}, ${HS.SHIPS[s.type].name.toLowerCase()} out of ${s.home ? s.home.name : 'port'}. Fair winds to you, Captain.`, `Good day, Captain! We're bound for warmer waters with a full hold. Any news from the sea lanes?`, `Ahoy! Keep a weather eye — pirates have been sighted hereabouts.`]), [
          { label: 'Exchange news', fn: () => HS.Dialog.show(c, this.rumour(), []) },
          { label: 'Demand they heave to and surrender cargo (piracy)', cls: 'danger', fn: () => this.demandCargo(s) },
          { label: '"Fair winds to you."' },
        ]);
        return;
      }
      HS.Dialog.show(c, `${nat.prefix ? nat.prefix + ' ' : ''}${s.name}, ${nat.navy}. ${HS.pick(['All quiet on this station, Captain.', 'We hunt pirates in these waters. Report any black flags to the governor.', 'Mind your papers, Captain, and we shall get along famously.'])}`, [
        { label: 'Ask for news', fn: () => HS.Dialog.show(c, this.rumour(), []) },
        { label: '"Good hunting."' },
      ]);
    },
    demandCargo(s) {
      const p = this.player;
      const power = p.T.guns * (0.9 + p.T.gunCal * 0.09) * (p.hull / p.hullMax), theirs = s.T.guns * (0.9 + s.T.gunCal * 0.09);
      s.provoked = true; s.hostileToPlayer = true;
      this.changeRep(s.nation, -12); this.pl.notoriety = Math.min(100, this.pl.notoriety + 6);
      if (power > theirs * 2.2) {
        s.hostileToPlayer = false; s.struck = true; this.onStrike(s); s.lastHitBy = p;
        HS.Dialog.show(s.captain, `All right, all right! Don't fire! We strike — take what you will and leave us our lives.`, [{ label: 'Board her', fn: () => this.tryBoard(s) }]);
      } else HS.Dialog.show(s.captain, `Pirates! Beat to quarters, lads — we'll not give up without a fight!`, []);
    },
    surrender(s) {
      const p = this.player, pl = this.pl;
      const fine = Math.round(pl.gold * 0.4);
      pl.gold -= fine; p.cargo = {};
      pl.notoriety = Math.max(0, pl.notoriety - 15);
      this.changeRep(s.nation, 10, true);
      for (const o of this.ships) if (o.nation === s.nation) { o.provoked = false; this.updateHostility(o); }
      s.hostileToPlayer = false;
      this.log(`You strike your colours. Your cargo is seized and you pay ${fine} in fines — but you keep your ship and your neck.`, '#ffb36a');
    },

    // revenue cutters
    wantsInspection(cg) {
      if (!this.pl || !this.player || this.state !== 'sea' || cg.hostileToPlayer) return false;
      if (cg.inspectedPlayer) return false;
      const until = this.pl.inspected[cg.nation] || -1;
      return this.clock > until && !HS.Dialog.open;
    },
    coastguardHail(cg) {
      if (HS.Dialog.open || this.state !== 'sea') return;
      cg.inspectedPlayer = true;
      const pl = this.pl, p = this.player, nat = HS.NATIONS[cg.nation];
      pl.inspected[cg.nation] = this.clock + 24;
      const contra = p.cargo.contraband || 0;
      if (!contra && pl.rep[cg.nation] > 20 && Math.random() < 0.5) {
        this.log(`The revenue cutter ${cg.name} dips her ensign and passes — your good name precedes you.`);
        cg.ai.state = 'cruise';
        return;
      }
      const bribe = 100 + contra * 15;
      const done = () => { cg.ai.state = 'cruise'; };
      const inspect = (forced) => {
        if (contra) {
          const fine = Math.min(pl.gold, Math.round(contra * GOOD.contraband.base * (forced ? 0.8 : 0.4)));
          pl.gold -= fine; delete p.cargo.contraband;
          pl.notoriety = Math.min(100, pl.notoriety + 3);
          this.changeRep(cg.nation, -5);
          HS.Dialog.show(cg.captain, `Well, well. ${contra} tons of contraband! Confiscated in the name of ${nat.name}, and you'll pay a fine of ${fine} pieces of eight. Count yourself lucky I don't clap you in irons.`, [{ label: 'Grumble and pay', fn: done }]);
        } else {
          this.changeRep(cg.nation, 2, true);
          HS.Dialog.show(cg.captain, `Your papers are in order and your hold is clean, Captain. My apologies for the delay — fair winds to you.`, [{ label: '"Good day, Lieutenant."', fn: done }]);
        }
      };
      HS.Dialog.show(cg.captain, `Ahoy the ${p.name}! This is ${nat.prefix ? nat.prefix + ' ' : 'the cutter '}${cg.name} of the ${nat.guard}. Heave to and prepare to be boarded for inspection, Captain ${pl.name}.`, [
        { label: 'Heave to for inspection', fn: () => { p.sail = 0; inspect(false); } },
        { label: `Offer a "gift" (${bribe} gold)`, disabled: pl.gold < bribe, fn: () => {
          pl.gold -= bribe;
          if (Math.random() < 0.55 + pl.rep[cg.nation] / 200) { HS.Dialog.show(cg.captain, `Hmm. Most... generous. I see nothing amiss here, Captain. Carry on.`, [{ label: 'Wink', fn: done }]); }
          else { this.changeRep(cg.nation, -6); HS.Dialog.show(cg.captain, `A bribe? To an officer of the ${nat.guard}? Search the hold, lads — every last cask!`, [{ label: 'Curse your luck', fn: () => inspect(true) }]); }
        } },
        { label: 'Crowd on sail and run for it', cls: 'warn', fn: () => { cg.provoked = true; cg.hostileToPlayer = true; cg.ai.state = 'attack'; cg.ai.target = p; this.changeRep(cg.nation, -8); pl.notoriety = Math.min(100, pl.notoriety + 4); p.sail = 3; this.log('"After them! Fire across her bows!"', '#ff9c7a'); } },
        { label: 'Run out the guns!', cls: 'danger', fn: () => { cg.provoked = true; cg.hostileToPlayer = true; cg.ai.state = 'attack'; cg.ai.target = p; this.changeRep(cg.nation, -15); pl.notoriety = Math.min(100, pl.notoriety + 6); this.log('Beat to quarters! The cutter is now an enemy.', '#ff7a6a'); } },
      ]);
    },

    // boarding
    tryBoard(target) {
      const p = this.player;
      const s = target || this.nearestShip(p.L + 90, (o) => !o.sinking);
      if (!s) { this.log('No ship close enough to throw grapples.'); return; }
      const d = HS.distW(s.x, s.y, p.x, p.y);
      if (d > (s.L + p.L) / 2 + 45) { this.log('Bring us alongside first — closer!'); return; }
      if (Math.abs(p.speed - s.speed) > 6) { this.log('Match her speed before boarding!'); return; }
      if (!s.struck && !this.hostile(p, s) && this.mode === 'campaign') {
        HS.Dialog.show(this.pl.portrait, `Board a ship that has done us no harm? That's piracy, plain and simple.`, [{ label: 'Board her anyway!', cls: 'danger', fn: () => { s.provoked = true; s.hostileToPlayer = true; this.changeRep(s.nation, -12); this.pl.notoriety = Math.min(100, this.pl.notoriety + 6); this.board(s); } }, { label: 'Belay that order' }]);
        return;
      }
      this.board(s);
    },
    board(s) {
      const p = this.player;
      HS.Audio.crunch(1);
      if (!s.struck) {
        const fame = this.pl ? this.pl.fame : 600;
        const my = p.crew * HS.rand(0.75, 1.25) * (1 + fame / 3000) * (p.ammo === 'grape' ? 1.05 : 1);
        const theirs = s.crew * HS.rand(0.75, 1.2) * (s.role === 'pirate' || s.role === 'hunter' ? 1.2 : s.role === 'merchant' ? 0.75 : 1);
        if (my <= theirs) {
          const lost = Math.round(p.crew * HS.rand(0.25, 0.4));
          p.crew = Math.max(1, p.crew - lost); s.crew = Math.max(1, s.crew - Math.round(lost * 0.6));
          HS.Dialog.show(s.captain, `Ha! Back to your ship, dogs! We've repelled your boarders — ${lost} of your hands lie dead on my deck!`, [{ label: 'Cut the grapples and fall back', cls: 'danger' }]);
          return;
        }
        const lost = Math.round(Math.min(p.crew * 0.5, s.crew * HS.rand(0.25, 0.5)));
        p.crew = Math.max(1, p.crew - lost);
        this.log(`Boarders away! Cutlass and pistol across her decks... she is ours! (${lost} hands lost)`, '#ffd28a');
      }
      s.struck = true; s.hostileToPlayer = false; s.sail = 0;
      if (this.mode === 'skirmish') { s.captured = true; this.log(`The ${s.name} is captured! A prize crew is put aboard.`, '#9fe8a0'); s.sink(this); return; }
      this.capture(s);
    },
    capture(s) {
      const p = this.player, pl = this.pl;
      pl.stats.captured++;
      pl.gold += s.gold;
      const taken = [];
      const goods = Object.keys(s.cargo).sort((a, b) => GOOD[b].base - GOOD[a].base);
      for (const g of goods) {
        const free = p.cargoCap() - p.cargoUsed();
        if (free <= 0) break;
        const q = Math.min(free, s.cargo[g]);
        if (q > 0) { p.cargo[g] = (p.cargo[g] || 0) + q; s.cargo[g] -= q; taken.push(`${q} ${GOOD[g].name}`); }
      }
      let mapMsg = '';
      if ((s.role === 'pirate' || s.role === 'hunter') && Math.random() < 0.45) { const m = this.newTreasureMap(); mapMsg = ` In the captain's sea-chest you find a treasure map: ${m.title}!`; }
      const pirate = s.role === 'pirate' || s.role === 'hunter';
      if (pirate) {
        const bounty = Math.round(s.T.price * 0.08 + 150);
        pl.gold += bounty; pl.fame += 45; this.changeRep('pirate', -6, true);
        for (const k in pl.rep) if (k !== 'pirate') pl.rep[k] = Math.min(100, pl.rep[k] + 2);
        mapMsg += ` Bounty for the pirate crew: ${bounty}.`;
      } else { pl.fame += 20; pl.notoriety = Math.min(100, pl.notoriety + 4); this.changeRep(s.nation, -8); }
      HS.Audio.coins();
      this.completeMissionFor(s, 'captured');
      const better = s.T.price > p.T.price && !s.T.skirmishOnly;
      const opts = [];
      if (better) opts.push({ label: `Take her as your flagship (${HS.SHIPS[s.type].name})`, fn: () => this.swapShip(s) });
      opts.push({ label: 'Set her adrift with her crew', fn: () => { s.ai = { state: 'leave', leaveDir: Math.random() * 6, think: 60, avoidT: 0, avoid: 0 }; s.struck = false; s.hostileToPlayer = false; s.sail = 2; s.cargo = {}; s.gold = 0; } });
      opts.push({ label: 'Scuttle her', cls: 'danger', fn: () => { if (!pirate) pl.notoriety = Math.min(100, pl.notoriety + 2); s.lastHitBy = null; s.sink(this); } });
      const prisoners = Math.round(s.crew * 0.25);
      const room = p.T.crewMax - p.crew;
      const joined = Math.min(room, prisoners);
      p.crew += joined;
      HS.Dialog.show(s.captain, `${pirate ? 'Ye fought well... curse ye.' : 'You have us, Captain. I ask only that my crew be spared.'} The ${s.name} is yours.\n\nPlunder: ${s.gold} gold${taken.length ? ', ' + taken.join(', ') : ''}.${joined ? ` ${joined} of her hands sign your articles.` : ''}${mapMsg}`, opts);
      s.gold = 0;
    },
    swapShip(s) {
      const p = this.player;
      const ns = new HS.Ship(s.type, { x: p.x, y: p.y, angle: p.angle, isPlayer: true, nation: p.nation, role: 'player', name: s.name, crew: Math.min(s.T.crewMax, p.crew), hull: s.hull, sails: s.sails, sail: 1 });
      ns.cargo = {};
      let room = ns.cargoCap();
      for (const g in p.cargo) { const q = Math.min(room, p.cargo[g]); if (q > 0) { ns.cargo[g] = q; room -= q; } }
      ns.captain = p.captain;
      ns.hull = Math.max(ns.hull, ns.hullMax * 0.3);
      const i = this.ships.indexOf(p);
      this.ships[i] = ns;
      this.player = ns;
      const si = this.ships.indexOf(s);
      if (si >= 0) this.ships.splice(si, 1);
      this.log(`You shift your flag to the ${ns.name}. Your old ship is sailed off by a prize crew to be sold.`, '#9fe8a0');
      this.pl.gold += Math.round(p.T.price * 0.25);
    },
    aiBoardsPlayer(ship) {
      if (HS.Dialog.open || this.mode !== 'campaign' || ship._boardT > this.t) return;
      ship._boardT = this.t + 20;
      const p = this.player, pl = this.pl;
      const my = p.crew * HS.rand(0.8, 1.2), theirs = ship.crew * HS.rand(0.8, 1.2) * 1.1;
      if (my > theirs) {
        const lost = Math.round(Math.min(p.crew * 0.3, ship.crew * 0.3));
        p.crew = Math.max(1, p.crew - lost);
        ship.crew = Math.round(ship.crew * 0.4);
        this.log(`Pirates swarm over the rail — and are thrown back into the sea! (${lost} of our hands lost)`, '#ffd28a');
        if (ship.crew < ship.T.crewMax * 0.2) { ship.struck = true; this.onStrike(ship); ship.lastHitBy = p; }
        return;
      }
      const goldLost = Math.round(pl.gold * 0.5);
      pl.gold -= goldLost;
      const lostCargo = Object.keys(p.cargo).length;
      p.cargo = {};
      p.crew = Math.max(4, Math.round(p.crew * 0.5));
      ship.ai = { state: 'leave', leaveDir: Math.random() * 6, think: 60, avoidT: 0, avoid: 0 };
      ship.hostileToPlayer = false;
      HS.Dialog.show(ship.captain, `Har! Your ship is taken, Captain! We'll relieve ye of ${goldLost} gold${lostCargo ? ' and every scrap of cargo' : ''}. Keep yer leaky tub — consider it a kindness.`, [{ label: 'Swear vengeance' }]);
    },

    // treasure
    newTreasureMap(bought) {
      const pl = this.pl, W = HS.World;
      const free = W.isles.filter((i) => !pl.looted.includes(i.idx) && !pl.maps.some((m) => m.isle === i.idx && !m.found));
      let x, y, isle = null;
      if (free.length) { isle = HS.pick(free); x = isle.x; y = isle.y; }
      else { const port = HS.pick(W.ports); const pos = W.randomWater(port.x, port.y, 900, 2000) || port; x = pos.x; y = pos.y; }
      const { lon, lat } = HS.toLonLat(x, y);
      const m = {
        id: pl.nextMission++, title: HS.pick(HS.NAMES.treasure), isle: isle ? isle.idx : null, x, y, found: false,
        clue: `${isle ? 'Buried on a lonely isle' : 'Sunk in shoal water'} near ${HS.fmtLat(Math.round(lat))}, ${HS.fmtLon(Math.round(lon))}. "Ten paces from the tallest palm, where the shadow falls at noon."`,
        forged: bought && Math.random() < 0.12,
      };
      pl.maps.push(m);
      return m;
    },
    landingParty() {
      const p = this.player, pl = this.pl;
      if (Math.abs(p.speed) > 3) { this.log('Heave to before lowering the boats!'); return; }
      const map = pl.maps.find((m) => !m.found && HS.distW(p.x, p.y, m.x, m.y) < (m.isle !== null ? HS.World.isles[m.isle].r + 160 : 160));
      const isle = HS.World.isles.find((i) => HS.distW(p.x, p.y, i.x, i.y) < i.r + 160);
      const mate = this.firstMate();
      if (!map && !isle) { this.log('Nothing ashore worth sending a landing party for.'); return; }
      HS.Dialog.show(mate, map ? `Aye, Captain — this matches the map! Lower the jolly boat, lads, and bring the spades!` : `The landing party is away to search ${isle.name}, Captain.`, [{ label: 'Wait for the boats to return…', fn: () => setTimeout(() => this.digResult(map, isle), 400) }]);
    },
    digResult(map, isle) {
      const pl = this.pl, mate = this.firstMate();
      if (map) {
        map.found = true;
        if (map.isle !== null) pl.looted.push(map.isle);
        if (map.forged) { HS.Dialog.show(mate, `Nothing, Captain. We dug till our hands bled. That map was a forgery — some tavern rogue has made fools of us.`, []); return; }
        const gold = Math.round(HS.rand(2500, 7000) * (1 + pl.fame / 5000));
        const item = HS.pick(['a jewelled Aztec idol', 'a chest of Spanish doubloons', 'a pearl necklace fit for a queen', 'a golden astrolabe', 'a crown set with emeralds', 'a pirate captain\'s silver cutlass']);
        pl.gold += gold; pl.fame += 80; pl.stats.treasures++;
        HS.Audio.coins();
        HS.Dialog.show(mate, `Captain! We struck wood six feet down — an iron-bound chest! ${gold} pieces of eight, and ${item}! ${map.title} is ours!`, [{ label: '"Splice the mainbrace!"' }]);
        this.log(`Treasure found: ${map.title} — ${gold} gold!`, '#ffd700');
        return;
      }
      if (isle && !pl.looted.includes(isle.idx) && Math.random() < 0.35) {
        pl.looted.push(isle.idx);
        const gold = HS.randi(80, 450);
        pl.gold += gold; pl.rations += 200;
        HS.Dialog.show(mate, `We found an old castaway's camp on ${isle.name}, Captain — a rotted sea-chest with ${gold} pieces of eight, and fresh water and coconuts besides.`, []);
      } else {
        pl.rations += 120;
        HS.Dialog.show(mate, `Nothing but sand, crabs and gulls on ${isle ? isle.name : 'that shore'}, Captain. We filled the water casks, at least.`, []);
      }
    },
    firstMate() {
      if (!this.pl.mate) { this.pl.mate = HS.makeCaptain('oldsalt', 'british'); this.pl.mate.title = 'First Mate'; this.pl.mate.role = 'oldsalt'; this.pl.mate.name = this.pl.mate.name.replace(/^"[^"]+" /, 'Mr. '); }
      return this.pl.mate;
    },
    pickFlotsam(f) {
      const p = this.player, pl = this.pl;
      if (f.map) { const m = this.newTreasureMap(); this.log(`A sealed bottle bobs alongside — inside, a treasure map: ${m.title}!`, '#ffd700'); HS.Audio.bell(1); return; }
      if (f.gold) { pl.gold += f.gold; this.log(`Flotsam recovered: a strongbox with ${f.gold} pieces of eight.`, '#ffd28a'); HS.Audio.coins(); return; }
      if (f.good) {
        const q = Math.min(f.qty, p.cargoCap() - p.cargoUsed());
        if (q > 0) { p.cargo[f.good] = (p.cargo[f.good] || 0) + q; this.log(`Flotsam hauled aboard: ${q} tons of ${GOOD[f.good].name}.`, '#ffd28a'); }
        else this.log('Flotsam sighted, but the hold is full.');
      }
    },

    // missions
    rumour() {
      const W = HS.World, pl = this.pl;
      const r = Math.random();
      if (r < 0.4) {
        const port = HS.pick(W.ports.filter((p) => p.nation !== 'pirate'));
        const g = HS.pick(port.demands);
        return `They say ${GOOD[g].name.toLowerCase()} fetches a king's ransom in ${port.name} these days. And ${GOOD[HS.pick(port.produces)].name.toLowerCase()} is cheap as dirt there.`;
      }
      if (r < 0.65) {
        const haven = HS.pick(W.ports.filter((p) => p.haven));
        return `Pirates out of ${haven.name} have been raiding these lanes. Keep your powder dry and your gun-ports open.`;
      }
      if (r < 0.85 && W.isles.some((i) => !i.discovered)) {
        const isle = HS.pick(W.isles.filter((i) => !i.discovered));
        return `An old whaler swore to me there's an uncharted island near ${HS.fmtLat(Math.round(isle.lat))}, ${HS.fmtLon(Math.round(isle.lon))}. Palm trees and a lagoon blue as sapphire, he said.`;
      }
      return HS.pick([`The Spanish treasure fleet sails from Veracruz and Havana, heavy with silver. Many a captain has grown rich... or died trying.`, `Watch the glass in the hurricane months. The Caribbean can swallow a fleet whole.`, `In the Roaring Forties the westerlies blow fierce — a fast passage east, but mind your canvas.`, `They say Captain Kidd buried his treasure on an island no chart shows.`, `The trade winds blow steady from the north-east above the line, and from the south-east below it. Use them, Captain.`]);
    },
    offerMissions(port) {
      const week = Math.floor(this.day() / 7);
      const rnd = HS.rng(port.seed + week * 7919);
      const out = [];
      const W = HS.World;
      // bounty / raid
      const pos = (() => { for (let i = 0; i < 20; i++) { const a = rnd() * HS.TAU, d = (6 + rnd() * 10) * HS.S; const x = HS.wrapX(port.x + Math.cos(a) * d), y = port.y + Math.sin(a) * d; if (!W.isLand(x, y)) return { x, y }; } return null; })();
      if (pos) {
        const haven = port.nation === 'pirate';
        const type = HS.pick(haven ? ['galleon', 'indiaman', 'galleon'] : ['brigantine', 'brig', 'corvette', 'frigate', 'schooner'], rnd);
        const cap = HS.makeCaptain(haven ? 'merchant' : 'hunter', haven ? 'spanish' : 'pirate');
        out.push({
          type: 'bounty', role: haven ? 'merchant' : 'hunter', nation: haven ? 'spanish' : 'pirate', shipType: type, shipName: haven ? `Nuestra Señora de ${HS.pick(['la Concepción', 'Atocha', 'Guadalupe', 'las Maravillas', 'la Soledad'], rnd)}` : HS.pick(HS.NAMES.ship, rnd),
          captain: cap, x: pos.x, y: pos.y, giver: port.nation, port: port.id,
          reward: Math.round(HS.SHIPS[type].price * (haven ? 0.06 : 0.12) + 400), loot: haven ? 4000 : 600,
          title: haven ? `Raid the treasure galleon` : `Bounty: ${cap.name}`,
          text: haven ? `A Spanish treasure galleon, heavy with silver, is cruising near ${HS.fmtLat(HS.toLonLat(pos.x, pos.y).lat)}, ${HS.fmtLon(HS.toLonLat(pos.x, pos.y).lon)}. Take her and the Brethren will pay you a finder's share.` : `The pirate ${cap.name} commands the ${HS.SHIPS[type].name.toLowerCase()} raiding near ${HS.fmtLat(HS.toLonLat(pos.x, pos.y).lat)}, ${HS.fmtLon(HS.toLonLat(pos.x, pos.y).lon)}. Sink or capture that ship and the Crown will reward you.`,
        });
      }
      // delivery contract
      const dests = W.ports.filter((p) => p !== port && p.nation !== 'pirate' && HS.distW(p.x, p.y, port.x, port.y) < 45 * HS.S && HS.distW(p.x, p.y, port.x, port.y) > 4 * HS.S);
      if (dests.length && port.nation !== 'pirate') {
        const dest = HS.pick(dests, rnd);
        const good = HS.pick(port.produces.filter((g) => !GOOD[g].illicit), rnd);
        const qty = Math.round(15 + rnd() * 45);
        const distDeg = HS.distW(dest.x, dest.y, port.x, port.y) / HS.S;
        const days = Math.ceil(distDeg * 0.9 + 6);
        out.push({ type: 'delivery', good, qty, dest: dest.id, days, reward: Math.round(qty * GOOD[good].base * 0.35 + distDeg * 40), giver: port.nation, port: port.id, title: `Carry ${qty} tons of ${GOOD[good].name} to ${dest.name}`, text: `Deliver ${qty} tons of ${GOOD[good].name} to ${dest.name} within ${days} days. The cargo is loaded at our expense.` });
      }
      return out.filter((o) => !this.pl.missions.some((m) => m.key === `${port.id}:${week}:${o.type}`)).map((o) => Object.assign(o, { key: `${port.id}:${week}:${o.type}` }));
    },
    acceptMission(m) {
      const pl = this.pl, p = this.player;
      if (m.type === 'delivery') {
        if (p.cargoCap() - p.cargoUsed() < m.qty) return 'Not enough room in the hold for that consignment.';
        p.cargo[m.good] = (p.cargo[m.good] || 0) + m.qty;
        m.deadline = this.day() + m.days;
      }
      m.id = pl.nextMission++;
      pl.missions.push(m);
      return null;
    },
    completeMissionFor(ship, how) {
      if (!ship.mission || !this.pl) return;
      const m = this.pl.missions.find((mm) => mm.id === ship.mission);
      if (!m || m.done) return;
      m.done = true;
      this.log(`Mission accomplished: ${m.title}. Return to a ${HS.NATIONS[m.giver].adj} port to claim ${m.reward} gold.`, '#9fe8a0');
      void how;
    },
    settleMissions(port) {
      const pl = this.pl, p = this.player, msgs = [];
      for (const m of pl.missions) {
        if (m.paid || m.failed) continue;
        if (m.type === 'bounty' && m.done && (port.nation === m.giver)) {
          m.paid = true; pl.gold += m.reward; pl.fame += 60; this.changeRep(m.giver, 12, true);
          msgs.push(`Reward of ${m.reward} gold paid for "${m.title}".`);
        }
        if (m.type === 'delivery' && m.dest === port.id) {
          if ((p.cargo[m.good] || 0) >= m.qty) {
            p.cargo[m.good] -= m.qty; if (!p.cargo[m.good]) delete p.cargo[m.good];
            m.paid = m.done = true; pl.gold += m.reward; pl.fame += 20; this.changeRep(m.giver, 6, true); this.changeRep(port.nation, 3, true);
            msgs.push(`Consignment delivered — ${m.reward} gold received.`);
          } else msgs.push(`The factor expected ${m.qty} tons of ${GOOD[m.good].name}, but your hold is short.`);
        }
      }
      pl.missions = pl.missions.filter((m) => !m.paid && !m.failed);
      return msgs;
    },
    checkDeadlines() {
      if (!this.pl) return;
      for (const m of this.pl.missions) {
        if (m.type === 'delivery' && !m.done && this.day() > m.deadline) {
          m.failed = true; this.changeRep(m.giver, -6, true);
          this.log(`Contract failed: "${m.title}" is overdue. Your name suffers in ${HS.NATIONS[m.giver].name}.`, '#ff9c7a');
        }
      }
      this.pl.missions = this.pl.missions.filter((m) => !m.failed);
    },

    playerLost() {
      if (this.mode === 'skirmish') { this.endSkirmish(false); return; }
      if (this.mode !== 'campaign') return;
      const pl = this.pl;
      const W = HS.World;
      const port = W.nearestPort(this.player ? this.player.x : 0, this.player ? this.player.y : 0, (p) => !this.portHostile(p)).port || W.ports[0];
      pl.gold = Math.round(pl.gold * 0.5);
      pl.fame = Math.round(pl.fame * 0.9);
      const ns = new HS.Ship('sloop', { x: port.berth.x, y: port.berth.y, angle: port.seaDir, isPlayer: true, nation: this.player.nation, role: 'player', name: 'Second Chance', crew: 20, sail: 0 });
      ns.captain = pl.portrait;
      this.player = ns;
      this.ships = [ns];
      this.state = 'over';
      HS.UI.showGameOver(`Your ship has foundered beneath you. Clinging to a spar, you and a handful of survivors are picked up by a fishing smack and landed at ${port.name}. With half your purse, you scrape together a battered sloop...`, () => this.enterPort(port, true));
    },

    skirmishTick() {
      const sk = this.skirmish;
      if (!sk || sk.over) return;
      const foes = this.ships.filter((s) => s.team === 'B' && !s.sinking && !s.struck);
      if (!foes.length) { sk.over = true; setTimeout(() => this.endSkirmish(true), 2500); }
    },
    endSkirmish(won) {
      const sk = this.skirmish;
      if (!sk || sk.ended) return;
      sk.ended = true;
      this.state = 'over';
      const acc = sk.fired ? Math.round((sk.hits / Math.max(1, sk.fired * Math.min(HS.SHIPS[sk.cfg.ship].guns || 1, 10))) * 100) : 0;
      void acc;
      HS.UI.showSkirmishResult(won, { time: this.t - sk.start, fired: sk.fired, hits: sk.hits, dmg: Math.round(sk.dmg), cfg: sk.cfg });
    },

    // ------------------------------------------------------------ save / load
    save(quiet) {
      if (this.mode !== 'campaign' || !this.pl) return false;
      const p = this.player;
      const data = {
        v: 1, clock: this.clock, markets: this.markets, pl: this.pl,
        ship: { type: p.type, name: p.name, hull: p.hull, sails: p.sails, crew: p.crew, cargo: p.cargo, upgrades: p.upgrades, nation: p.nation, x: p.x, y: p.y, angle: p.angle },
        discovered: HS.World.isles.filter((i) => i.discovered).map((i) => i.idx),
        port: this.port ? this.port.id : null,
      };
      try { localStorage.setItem(SAVE_KEY, JSON.stringify(data)); if (!quiet) this.log('Ship\'s log saved.'); return true; } catch (e) { return false; }
    },
    hasSave() { try { return !!localStorage.getItem(SAVE_KEY); } catch (e) { return false; } },
    load() {
      let data;
      try { data = JSON.parse(localStorage.getItem(SAVE_KEY)); } catch (e) { return false; }
      if (!data) return false;
      this.mode = 'campaign';
      HS.FX.reset();
      this.clock = data.clock; this.markets = data.markets || {}; this.pl = data.pl;
      this.pl.portrait.role = 'player';
      this.messages = []; this.flotsam = [];
      HS.World.isles.forEach((i) => (i.discovered = data.discovered.includes(i.idx)));
      const s = data.ship;
      this.player = new HS.Ship(s.type, { x: s.x, y: s.y, angle: s.angle, isPlayer: true, nation: s.nation, role: 'player', name: s.name, hull: s.hull, sails: s.sails, crew: s.crew, upgrades: s.upgrades, sail: 0 });
      this.player.cargo = s.cargo;
      this.player.captain = this.pl.portrait;
      this.ships = [this.player];
      this.cam.x = this.player.x; this.cam.y = this.player.y; this.cam.zoom = this.cam.tz = 1.6;
      this.setPrevailingWind(true);
      const port = data.port !== null ? HS.World.ports[data.port] : null;
      if (port) this.enterPort(port, true);
      else { this.state = 'sea'; HS.UI.hideAll(); }
      this.log(`Ship's log resumed — ${this.dateString()}.`, '#e8c86a');
      return true;
    },

    // ------------------------------------------------------------ camera & rendering
    screenToWorld(sx, sy) { return { x: HS.wrapX(this.cam.x + (sx - this.w / 2) / this.cam.zoom), y: this.cam.y + (sy - this.h / 2) / this.cam.zoom }; },
    toScreen(x, y) { return { x: HS.dxw(this.cam.x, x) * this.cam.zoom + this.w / 2, y: (y - this.cam.y) * this.cam.zoom + this.h / 2 }; },
    updateCamera(dt) {
      const c = this.cam;
      c.zoom += (c.tz - c.zoom) * Math.min(1, dt * 6);
      if (this.state === 'menu') {
        const mc = this.menuCenter;
        c.x = HS.wrapX(mc.x + Math.sin(this.t * 0.06) * 380); c.y = mc.y + Math.cos(this.t * 0.045) * 220;
        return;
      }
      const p = this.player;
      if (!p) return;
      const look = 0.9;
      const tx = p.x + Math.cos(p.angle) * p.speed * HS.KN * look, ty = p.y + Math.sin(p.angle) * p.speed * HS.KN * look;
      c.x = HS.wrapX(c.x + HS.dxw(c.x, tx) * Math.min(1, dt * 3));
      c.y += (ty - c.y) * Math.min(1, dt * 3);
    },
    _makeClouds() {
      this.cloudSprites = [0, 1, 2].map((k) => {
        const c = document.createElement('canvas'); c.width = 320; c.height = 200;
        const g = c.getContext('2d');
        const rnd = HS.rng(k * 31 + 5);
        for (let i = 0; i < 16; i++) {
          const x = 70 + rnd() * 180, y = 60 + rnd() * 80, r = 25 + rnd() * 45;
          const gr = g.createRadialGradient(x, y, 0, x, y, r);
          gr.addColorStop(0, 'rgba(255,255,255,0.9)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
          g.fillStyle = gr; g.fillRect(x - r, y - r, r * 2, r * 2);
        }
        return c;
      });
      this.cloudShadows = this.cloudSprites.map((src) => {
        const c = document.createElement('canvas'); c.width = src.width; c.height = src.height;
        const g = c.getContext('2d');
        g.drawImage(src, 0, 0);
        g.globalCompositeOperation = 'source-in';
        g.fillStyle = '#0a1a24'; g.fillRect(0, 0, c.width, c.height);
        return c;
      });
    },

    render() {
      const ctx = this.ctx, w = this.w, h = this.h, cam = this.cam, dpr = this.dpr;
      const shake = HS.UI.shakeOffset();
      const camR = { x: HS.wrapX(cam.x + shake.x / cam.zoom), y: cam.y + shake.y / cam.zoom, zoom: cam.zoom };
      const night = this.night();
      const storm = this.weather.storm;
      const env = { t: this.t, w, h, dpr, night, storm: storm > 0.4, wind: this.wind, windDir: this.wind.dir, windSpeed: this.wind.speed };
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      HS.World.draw(ctx, camR, env);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      // ports
      const W = HS.World;
      for (const port of W.ports) {
        const s = this.toScreenC(port.x, port.y, camR);
        if (s.x < -200 || s.y < -200 || s.x > w + 200 || s.y > h + 200) continue;
        W.drawPort(ctx, port, s.x, s.y, camR.zoom, this.t, this.portHostile(port));
      }
      // flotsam
      for (const f of this.flotsam) {
        const s = this.toScreenC(f.x, f.y, camR);
        const bob = Math.sin(this.t * 2 + f.seed) * 1.5;
        ctx.save(); ctx.translate(s.x, s.y + bob); ctx.scale(camR.zoom, camR.zoom); ctx.rotate(f.seed);
        if (f.map) { ctx.fillStyle = '#7fb0a0'; ctx.fillRect(-2, -6, 4, 12); ctx.fillStyle = '#5a3a1c'; ctx.fillRect(-1.5, -8, 3, 3); }
        else if (f.gold) { ctx.fillStyle = '#6a4a22'; ctx.fillRect(-6, -4, 12, 8); ctx.fillStyle = '#d4af37'; ctx.fillRect(-6, -1, 12, 2); }
        else { ctx.fillStyle = '#7a5532'; ctx.beginPath(); ctx.ellipse(0, 0, 6, 4.5, 0, 0, HS.TAU); ctx.fill(); ctx.strokeStyle = '#3a2a14'; ctx.lineWidth = 1; ctx.stroke(); }
        ctx.restore();
        ctx.strokeStyle = `rgba(255,255,255,${0.3 + 0.2 * Math.sin(this.t * 3 + f.seed)})`; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.arc(s.x, s.y + bob, 9 * camR.zoom, 0, HS.TAU); ctx.stroke();
      }
      HS.FX.draw(ctx, camR, env, 'low');
      // ships, smallest first so the great ships sit atop
      const vis = this.ships.slice().sort((a, b) => a.L - b.L);
      for (const s of vis) {
        const sc = this.toScreenC(s.x, s.y, camR);
        if (sc.x < -150 || sc.y < -150 || sc.x > w + 150 || sc.y > h + 150) continue;
        s.draw(ctx, sc.x, sc.y, camR.zoom, env);
      }
      HS.FX.draw(ctx, camR, env, 'high');
      this.drawClouds(ctx, camR, env);
      this.drawLighting(ctx, camR, env, night, storm);
      if (storm > 0.05) this.drawRain(ctx, storm);
      if (this.weather.lightning > 0) { ctx.fillStyle = `rgba(230,240,255,${this.weather.lightning * 0.55})`; ctx.fillRect(0, 0, w, h); }
      if (this.state === 'menu') return;
      this.drawLabels(ctx, camR);
      HS.UI.drawHUD(ctx, this);
    },
    toScreenC(x, y, c) { return { x: HS.dxw(c.x, x) * c.zoom + this.w / 2, y: (y - c.y) * c.zoom + this.h / 2 }; },

    drawClouds(ctx, cam, env) {
      const z = cam.zoom;
      const alpha = HS.clamp(0.62 - z * 0.42, 0.06, 0.45) * (1 + this.weather.storm * 0.8);
      const cell = 1500;
      const driftX = this.t * this.wind.vx * 0.9, driftY = this.t * this.wind.vy * 0.9;
      const halfW = env.w / 2 / z, halfH = env.h / 2 / z;
      const i0 = Math.floor((cam.x - halfW - driftX) / cell) - 1, i1 = Math.floor((cam.x + halfW - driftX) / cell) + 1;
      const j0 = Math.floor((cam.y - halfH - driftY) / cell) - 1, j1 = Math.floor((cam.y + halfH - driftY) / cell) + 1;
      const sky = this.weather.storm > 0.4 ? 0.55 : 1;
      for (let pass = 0; pass < 2; pass++) {
        for (let i = i0; i <= i1; i++) {
          for (let j = j0; j <= j1; j++) {
            const hh = HS.hash(i * 3 + 7, j * 5 + 1);
            if (hh > 0.55 + this.weather.storm * 0.4) continue;
            const sc = (2.2 + HS.hash(j, i) * 2.6);
            const wx = i * cell + HS.hash(i, j + 9) * cell + driftX, wy = j * cell + hh * cell + driftY;
            const sx = HS.dxw(cam.x, wx) * z + env.w / 2, sy = (wy - cam.y) * z + env.h / 2;
            const cw = 320 * sc * z, ch = 200 * sc * z;
            if (sx + cw < -300 || sx - cw > env.w + 300 || sy + ch < -300 || sy - ch > env.h + 300) continue;
            const k = Math.floor(hh * 3) % 3;
            if (pass === 0) {
              ctx.globalAlpha = alpha * 0.45;
              ctx.drawImage(this.cloudShadows[k], sx - cw / 2 + 140 * z, sy - ch / 2 + 220 * z, cw, ch);
            } else {
              ctx.globalAlpha = alpha * sky;
              ctx.drawImage(this.cloudSprites[k], sx - cw / 2, sy - ch / 2, cw, ch);
            }
          }
        }
      }
      ctx.globalAlpha = 1;
    },
    drawLighting(ctx, cam, env, night, storm) {
      const dark = Math.min(0.82, night * 0.72 + storm * 0.32);
      const h = this.hour();
      // golden hour
      const golden = (h > 5 && h < 8) ? 1 - Math.abs(h - 6.3) / 1.7 : (h > 17 && h < 20.5) ? 1 - Math.abs(h - 18.8) / 1.7 : 0;
      if (golden > 0 && storm < 0.5) { ctx.fillStyle = `rgba(255,140,60,${golden * 0.18})`; ctx.fillRect(0, 0, env.w, env.h); }
      if (dark < 0.02) return;
      const l = this.lctx, dpr = this.dpr;
      l.setTransform(dpr, 0, 0, dpr, 0, 0);
      l.globalCompositeOperation = 'source-over';
      l.clearRect(0, 0, env.w, env.h);
      l.fillStyle = storm > 0.5 ? `rgba(8,14,22,${dark})` : `rgba(4,10,32,${dark})`;
      l.fillRect(0, 0, env.w, env.h);
      l.globalCompositeOperation = 'destination-out';
      const z = cam.zoom;
      const hole = (x, y, r, a) => {
        const s = this.toScreenC(x, y, cam);
        if (s.x < -r * z || s.y < -r * z || s.x > env.w + r * z || s.y > env.h + r * z) return;
        const g = l.createRadialGradient(s.x, s.y, 0, s.x, s.y, r * z);
        g.addColorStop(0, `rgba(0,0,0,${a})`); g.addColorStop(1, 'rgba(0,0,0,0)');
        l.fillStyle = g; l.beginPath(); l.arc(s.x, s.y, r * z, 0, HS.TAU); l.fill();
      };
      const glows = [];
      if (night > 0.3) {
        for (const s of this.ships) {
          if (s.sinking) continue;
          const st = s.local(-s.L * 0.48, 0), bw = s.local(s.L * 0.4, 0);
          hole(st.x, st.y, 70, 0.85 * night); hole(bw.x, bw.y, 40, 0.6 * night);
          glows.push(st, bw);
        }
        for (const port of HS.World.ports) {
          if (Math.abs(HS.dxw(cam.x, port.x)) > env.w / z || Math.abs(port.y - cam.y) > env.h / z) continue;
          hole(port.x, port.y, 140, 0.8 * night);
          if (port.lightPos) {
            hole(port.lightPos.x, port.lightPos.y, 60, 0.9);
            // sweeping beam of the lighthouse
            const s = this.toScreenC(port.lightPos.x, port.lightPos.y, cam);
            const a = this.t * 0.9 + port.id;
            l.save(); l.translate(s.x, s.y); l.rotate(a);
            const g = l.createLinearGradient(0, 0, 520 * z, 0);
            g.addColorStop(0, 'rgba(0,0,0,0.8)'); g.addColorStop(1, 'rgba(0,0,0,0)');
            l.fillStyle = g; l.beginPath(); l.moveTo(0, 0); l.lineTo(520 * z, -60 * z); l.lineTo(520 * z, 60 * z); l.closePath(); l.fill();
            l.restore();
            glows.push(port.lightPos);
          }
        }
      }
      for (const L of HS.FX.lights()) hole(L.x, L.y, L.r, L.a);
      for (const s of this.ships) if (s.onFire > 0) { hole(s.x, s.y, 90, 0.9); glows.push(s); }
      ctx.save();
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.drawImage(this.light, 0, 0);
      ctx.restore();
      // warm lantern glow
      ctx.globalCompositeOperation = 'lighter';
      for (const gpt of glows) {
        const s = this.toScreenC(gpt.x, gpt.y, cam);
        const r = 14 * z;
        const g = ctx.createRadialGradient(s.x, s.y, 0, s.x, s.y, r);
        g.addColorStop(0, `rgba(255,200,110,${0.55 * night})`); g.addColorStop(1, 'rgba(255,160,60,0)');
        ctx.fillStyle = g; ctx.beginPath(); ctx.arc(s.x, s.y, r, 0, HS.TAU); ctx.fill();
      }
      ctx.globalCompositeOperation = 'source-over';
    },
    drawRain(ctx, storm) {
      const w = this.w, h = this.h;
      const vx = this.wind.vx * 6, vy = 600;
      const len = 0.035;
      ctx.strokeStyle = `rgba(200,215,230,${0.35 * storm})`; ctx.lineWidth = 1;
      ctx.beginPath();
      const n = Math.floor(this.rain.length * storm);
      for (let i = 0; i < n; i++) {
        const r = this.rain[i];
        r.y += 0.016 * r.l * 1.4; r.x += (vx / w) * 0.016;
        if (r.y > 1) { r.y -= 1; r.x = Math.random(); }
        if (r.x > 1) r.x -= 1; if (r.x < 0) r.x += 1;
        const x = r.x * w, y = r.y * h;
        ctx.moveTo(x, y); ctx.lineTo(x - vx * len * r.l, y - vy * len * r.l);
      }
      ctx.stroke();
    },
    drawLabels(ctx, cam) {
      const p = this.player;
      const z = cam.zoom;
      ctx.textAlign = 'center';
      // port names
      ctx.font = '600 13px Georgia, serif';
      for (const port of HS.World.ports) {
        const s = this.toScreenC(port.x, port.y, cam);
        if (s.x < -100 || s.y < -100 || s.x > this.w + 100 || s.y > this.h + 100) continue;
        const ly = s.y - 70 * z - 8;
        ctx.fillStyle = 'rgba(10,15,25,0.55)';
        const tw = ctx.measureText(port.name).width;
        ctx.fillRect(s.x - tw / 2 - 6, ly - 13, tw + 12, 18);
        ctx.fillStyle = this.portHostile(port) ? '#ff8a7a' : port.haven ? '#e0c080' : '#f4ecd6';
        ctx.fillText(port.name, s.x, ly);
      }
      for (const isle of HS.World.isles) {
        if (!isle.discovered) continue;
        const s = this.toScreenC(isle.x, isle.y, cam);
        if (s.x < -100 || s.y < -100 || s.x > this.w + 100 || s.y > this.h + 100) continue;
        ctx.font = 'italic 12px Georgia, serif'; ctx.fillStyle = 'rgba(255,250,230,0.85)';
        ctx.fillText(isle.name, s.x, s.y + isle.r * z + 16);
      }
      // treasure X on the sea when near
      if (this.pl) for (const m of this.pl.maps) {
        if (m.found) continue;
        const s = this.toScreenC(m.x, m.y, cam);
        if (s.x < -50 || s.y < -50 || s.x > this.w + 50 || s.y > this.h + 50) continue;
        ctx.strokeStyle = '#c0261c'; ctx.lineWidth = 4;
        ctx.beginPath(); ctx.moveTo(s.x - 10, s.y - 10); ctx.lineTo(s.x + 10, s.y + 10); ctx.moveTo(s.x + 10, s.y - 10); ctx.lineTo(s.x - 10, s.y + 10); ctx.stroke();
      }
      if (!p) return;
      // ship names & condition
      ctx.font = '12px Georgia, serif';
      for (const s of this.ships) {
        if (s.isPlayer || s.sinking) continue;
        const d = HS.distW(s.x, s.y, p.x, p.y);
        if (d > 1300) continue;
        const sc = this.toScreenC(s.x, s.y, cam);
        if (sc.x < -60 || sc.y < -60 || sc.x > this.w + 60 || sc.y > this.h + 60) continue;
        const hostile = this.hostile(s, p);
        const top = sc.y - s.L * 0.55 * z - 22;
        const label = `${s.name}${s.struck ? ' (struck)' : ''}`;
        const roleTxt = { merchant: 'merchantman', pirate: '', hunter: '', coastguard: 'revenue cutter', navy: 'man-of-war' }[s.role] || '';
        ctx.fillStyle = s.struck ? '#c8c8c8' : s.mission ? '#ffd76a' : hostile ? '#ff8a7a' : '#e8f2ff';
        ctx.fillText(label, sc.x, top);
        ctx.font = '10px Georgia, serif';
        ctx.fillStyle = 'rgba(230,230,230,0.75)';
        ctx.fillText(`${s.team ? (s.team === p.team ? 'Allied' : 'Enemy') : HS.NATIONS[s.role === 'pirate' || s.role === 'hunter' ? 'pirate' : s.nation].adj}${roleTxt ? ' ' + roleTxt : ''} · ${HS.SHIPS[s.type].name}`, sc.x, top + 12);
        ctx.font = '12px Georgia, serif';
        if (s.hull < s.hullMax || hostile) {
          const bw = 46;
          ctx.fillStyle = 'rgba(0,0,0,0.5)'; ctx.fillRect(sc.x - bw / 2, top + 16, bw, 4);
          ctx.fillStyle = s.hull / s.hullMax > 0.5 ? '#7bd36a' : s.hull / s.hullMax > 0.25 ? '#e8c34a' : '#e8564a';
          ctx.fillRect(sc.x - bw / 2, top + 16, bw * HS.clamp(s.hull / s.hullMax, 0, 1), 4);
          ctx.fillStyle = '#e8e8e8'; ctx.fillRect(sc.x - bw / 2, top + 21, bw * HS.clamp(s.sails / s.sailsMax, 0, 1), 2);
        }
        if (hostile && !s.struck) {
          ctx.strokeStyle = 'rgba(255,90,70,0.6)'; ctx.lineWidth = 1.5;
          ctx.beginPath(); ctx.arc(sc.x, sc.y, s.L * 0.62 * z + 6, 0, HS.TAU); ctx.stroke();
        }
      }
      // firing arcs
      if (p.T.guns > 0 && !p.sinking && (this.enemiesNear(1000) || Input.down('Tab') || this.mode === 'skirmish')) {
        const sp = this.toScreenC(p.x, p.y, cam);
        const r = p.range() * z;
        for (const side of [-1, 1]) {
          const a = p.angle + side * Math.PI / 2;
          const ready = p.reload[side] <= 0;
          const g = ctx.createRadialGradient(sp.x, sp.y, p.B * z, sp.x, sp.y, r);
          g.addColorStop(0, ready ? 'rgba(120,255,140,0.09)' : 'rgba(255,110,90,0.05)'); g.addColorStop(1, 'rgba(0,0,0,0)');
          ctx.fillStyle = g;
          ctx.beginPath(); ctx.moveTo(sp.x, sp.y); ctx.arc(sp.x, sp.y, r, a - 0.3, a + 0.3); ctx.closePath(); ctx.fill();
          ctx.strokeStyle = ready ? 'rgba(150,255,160,0.45)' : 'rgba(255,140,120,0.3)'; ctx.setLineDash([6, 6]); ctx.lineWidth = 1;
          ctx.beginPath(); ctx.arc(sp.x, sp.y, r, a - 0.3, a + 0.3); ctx.stroke(); ctx.setLineDash([]);
          if (!ready) {
            const k = 1 - p.reload[side] / p.reloadTime();
            ctx.strokeStyle = 'rgba(255,220,120,0.55)'; ctx.lineWidth = 2;
            ctx.beginPath(); ctx.arc(sp.x, sp.y, r, a - 0.3, a - 0.3 + 0.6 * k); ctx.stroke();
          }
        }
      }
      if (p.T.turrets) {
        const sp = this.toScreenC(p.x, p.y, cam);
        ctx.strokeStyle = 'rgba(255,255,255,0.25)'; ctx.setLineDash([4, 6]);
        ctx.beginPath(); ctx.moveTo(sp.x, sp.y); ctx.lineTo(Input.mouse.x, Input.mouse.y); ctx.stroke(); ctx.setLineDash([]);
        ctx.strokeStyle = 'rgba(255,230,150,0.8)'; ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.arc(Input.mouse.x, Input.mouse.y, 10, 0, HS.TAU); ctx.moveTo(Input.mouse.x - 15, Input.mouse.y); ctx.lineTo(Input.mouse.x + 15, Input.mouse.y); ctx.moveTo(Input.mouse.x, Input.mouse.y - 15); ctx.lineTo(Input.mouse.x, Input.mouse.y + 15); ctx.stroke();
      }
    },
  });

  window.addEventListener('load', () => G.init());
})();
