/* High Seas — AI captains: cruising, patrolling, hunting, fleeing, hailing. */
(function () {
  const HS = (window.HS = window.HS || {});

  const AI = (HS.AI = {
    update(ship, game, dt) {
      const ai = ship.ai || (ship.ai = { state: 'cruise', think: Math.random(), avoidT: 0, avoid: 0, tack: 0, tackT: 0, wp: null, target: null });
      if (ship.struck) { ship.sail = 0; ship.rudder *= 0.95; return; }
      ai.think -= dt;
      if (ai.think <= 0) { ai.think = 0.6 + Math.random() * 0.5; this.think(ship, ai, game); }
      const tgt = ai.target;
      switch (ai.state) {
        case 'attack': if (tgt && !tgt.sinking && !tgt.dead) this.attack(ship, ai, tgt, game, dt); else ai.state = 'cruise'; break;
        case 'flee': if (tgt) this.flee(ship, ai, tgt, game, dt); else ai.state = 'cruise'; break;
        case 'approach': this.approach(ship, ai, game, dt); break;
        case 'escort': this.escort(ship, ai, game, dt); break;
        case 'leave': this.steer(ship, ai, ai.leaveDir, game, dt); ship.sail = 3; break;
        default: this.cruise(ship, ai, game, dt);
      }
    },

    think(ship, ai, game) {
      const role = ship.role;
      let best = null, bd = Infinity;
      for (const o of game.ships) {
        if (o === ship || o.sinking || o.dead || o.struck) continue;
        if (!game.hostile(ship, o)) continue;
        const d = HS.distW(ship.x, ship.y, o.x, o.y);
        if (d < bd) { bd = d; best = o; }
      }
      if (ai.state === 'approach' || ai.state === 'escort' || ai.state === 'leave') {
        if (best && bd < 700 && game.hostile(ship, game.player) && best === game.player) { ai.state = 'attack'; ai.target = best; }
        return;
      }
      const detect = role === 'merchant' ? 650 : role === 'coastguard' ? 900 : 1100;
      if (role === 'merchant') {
        if (best && bd < detect) { ai.state = 'flee'; ai.target = best; }
        else if (ai.state === 'flee' && (!ai.target || HS.distW(ship.x, ship.y, ai.target.x, ai.target.y) > 1100)) { ai.state = 'cruise'; ai.target = null; }
        return;
      }
      if (best && bd < detect) {
        const weak = ship.hull < ship.hullMax * 0.3 && (role === 'pirate' || role === 'hunter') && best.hullMax > ship.hullMax * 0.8;
        ai.state = weak ? 'flee' : 'attack';
        ai.target = best;
        return;
      }
      if (ai.state === 'attack' || ai.state === 'flee') { ai.state = 'cruise'; ai.target = null; }
      // revenue cutters want a word with passing ships
      if (role === 'coastguard' && game.mode === 'campaign' && game.wantsInspection(ship)) {
        const d = HS.distW(ship.x, ship.y, game.player.x, game.player.y);
        if (d < 950) { ai.state = 'approach'; ai.target = game.player; }
      }
    },

    /** set rudder toward a desired heading, avoiding land and respecting the wind */
    steer(ship, ai, desired, game, dt) {
      const W = HS.World;
      if (!ship.T.steam) {
        const wind = game.wind;
        const upwind = HS.angNorm(wind.dir + Math.PI);
        const off = HS.angNorm(desired - upwind);
        const limit = 0.85; // closest she will lie to the wind
        if (Math.abs(off) < limit) {
          ai.tackT -= dt;
          if (ai.tackT <= 0 || !ai.tack) { ai.tack = off >= 0 ? 1 : -1; ai.tackT = 9 + Math.random() * 6; }
          desired = upwind + ai.tack * (limit + 0.05);
        } else ai.tackT = 0;
      }
      ai.avoidT -= dt;
      if (ai.avoidT <= 0) {
        ai.avoidT = 0.3;
        const look = 110 + Math.abs(ship.speed) * 14 + ship.L;
        ai.avoid = 0;
        if (W.rayLand(ship.x, ship.y, desired, look, 28) < look) {
          ai.avoid = Math.PI * 0.9;
          for (const d of [0.4, -0.4, 0.8, -0.8, 1.2, -1.2, 1.7, -1.7, 2.3, -2.3]) {
            if (W.rayLand(ship.x, ship.y, desired + d, look, 28) === Infinity) { ai.avoid = d; break; }
          }
        }
      }
      const want = desired + ai.avoid;
      const diff = HS.angNorm(want - ship.angle);
      ship.rudder = HS.clamp(diff * 2.4, -1, 1);
    },

    cruise(ship, ai, game, dt) {
      if (!ai.wp || HS.distW(ship.x, ship.y, ai.wp.x, ai.wp.y) < 160 || (ai.wpT -= dt) < 0) {
        let base = { x: ship.x, y: ship.y }, r0 = 900, r1 = 2400;
        if ((ship.role === 'coastguard' || ship.role === 'navy') && ship.home) { base = ship.home; r0 = 250; r1 = 1100; }
        ai.wp = HS.World.randomWater(base.x, base.y, r0, r1, 20) || { x: ship.x + HS.rand(-800, 800), y: ship.y + HS.rand(-800, 800) };
        ai.wpT = 60;
      }
      const des = Math.atan2(ai.wp.y - ship.y, HS.dxw(ship.x, ai.wp.x));
      this.steer(ship, ai, des, game, dt);
      ship.sail = ship.T.steam ? 2 : 2;
      ship.ammo = 'round';
    },

    flee(ship, ai, tgt, game, dt) {
      const away = Math.atan2(ship.y - tgt.y, HS.dxw(tgt.x, ship.x));
      this.steer(ship, ai, away, game, dt);
      ship.sail = 3;
      // a stern-chaser parting shot
      const d = HS.distW(ship.x, ship.y, tgt.x, tgt.y);
      if (d < ship.range() * 0.9) this.tryFire(ship, tgt, game, 0.25);
    },

    approach(ship, ai, game, dt) {
      const p = game.player;
      const d = HS.distW(ship.x, ship.y, p.x, p.y);
      const des = Math.atan2(p.y - ship.y, HS.dxw(ship.x, p.x));
      this.steer(ship, ai, des, game, dt);
      ship.sail = 3;
      if (d < 300) { ai.state = 'escort'; game.coastguardHail(ship); }
      if (d > 1500) ai.state = 'cruise';
    },
    escort(ship, ai, game, dt) {
      const p = game.player;
      const d = HS.distW(ship.x, ship.y, p.x, p.y);
      const des = Math.atan2(p.y - ship.y, HS.dxw(ship.x, p.x));
      this.steer(ship, ai, d > 240 ? des : p.angle, game, dt);
      ship.sail = d > 260 ? 3 : 1;
    },

    attack(ship, ai, tgt, game, dt) {
      const dx = HS.dxw(ship.x, tgt.x), dy = tgt.y - ship.y;
      const dist = Math.hypot(dx, dy);
      const bearing = Math.atan2(dy, dx);
      if (ship.T.steam) {
        const tu = ship.T.turrets[0];
        const lead = dist / 560;
        const tx = tgt.x + Math.cos(tgt.angle) * tgt.speed * HS.KN * lead, ty = tgt.y + Math.sin(tgt.angle) * tgt.speed * HS.KN * lead;
        ship.aimTurrets(tx, ty, dt);
        const ideal = tu.range * 0.65;
        const k = HS.clamp((dist - ideal) / ideal, -0.8, 0.8);
        const side = ai.circle || (ai.circle = Math.random() < 0.5 ? 1 : -1);
        this.steer(ship, ai, bearing - side * (Math.PI / 2 - k * 1.2), game, dt);
        ship.sail = 3;
        if (dist < tu.range) ship.fireTurrets(game);
        if (ship.torps && dist < 650 && Math.abs(HS.angNorm(bearing - ship.angle)) < 0.2) ship.fireTorpedo(game);
        return;
      }
      const range = ship.range('round');
      // choose shot for the work at hand
      if (dist < 200 && tgt.crew > ship.crew * 0.4) ship.ammo = 'grape';
      else if ((ship.role === 'pirate' || ship.role === 'hunter') && tgt.sails > tgt.sailsMax * 0.5 && dist < 250) ship.ammo = 'chain';
      else ship.ammo = 'round';

      if (dist > range * 0.95) {
        this.steer(ship, ai, bearing, game, dt);
        ship.sail = 3;
      } else {
        const relB = HS.angNorm(bearing - ship.angle);
        const facing = relB > 0 ? 1 : -1;
        const side = ship.reload[facing] <= 0 ? facing : ship.reload[-facing] <= 0 ? -facing : facing;
        const ideal = range * 0.55;
        const k = HS.clamp(((dist - ideal) / ideal) * 0.8, -0.5, 0.6);
        this.steer(ship, ai, bearing - side * (Math.PI / 2 - k), game, dt);
        ship.sail = 2;
      }
      this.tryFire(ship, tgt, game, 0.3);
      // pirates grapple struck or crippled prey
      if ((ship.role === 'pirate' || ship.role === 'hunter') && tgt.isPlayer && dist < (ship.L + tgt.L) / 2 + 25 && tgt.crew < ship.crew * 0.6) game.aiBoardsPlayer(ship);
    },
    tryFire(ship, tgt, game, arc) {
      const dx = HS.dxw(ship.x, tgt.x), dy = tgt.y - ship.y;
      const dist = Math.hypot(dx, dy);
      if (dist > ship.range() * 0.98) return;
      const relB = HS.angNorm(Math.atan2(dy, dx) - ship.angle);
      for (const side of [-1, 1]) {
        if (Math.abs(HS.angNorm(relB - (side * Math.PI) / 2)) < arc && ship.canFire(side)) {
          // don't fire through friends
          const blocked = game.ships.some((o) => o !== ship && o !== tgt && !game.hostile(ship, o) && !o.sinking && HS.distW(ship.x, ship.y, o.x, o.y) < dist && Math.abs(HS.angNorm(Math.atan2(o.y - ship.y, HS.dxw(ship.x, o.x)) - Math.atan2(dy, dx))) < 0.15);
          if (!blocked) ship.fire(side, game);
        }
      }
    },
  });
})();
