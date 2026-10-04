/* High Seas — the world: coastlines, land test, uncharted isles, terrain and port rendering, flags. */
(function () {
  const HS = (window.HS = window.HS || {});
  const S = HS.S;

  function pip(pts, x, y) {
    let inside = false;
    for (let i = 0, j = pts.length - 2; i < pts.length; j = i, i += 2) {
      const xi = pts[i], yi = pts[i + 1], xj = pts[j], yj = pts[j + 1];
      if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
    }
    return inside;
  }
  // smooth value noise in degrees-space, for natural coastlines
  function vnoise(x, y) {
    const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi;
    const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
    const a = HS.hash(xi, yi), b = HS.hash(xi + 1, yi), c = HS.hash(xi, yi + 1), d = HS.hash(xi + 1, yi + 1);
    return HS.lerp(HS.lerp(a, b, u), HS.lerp(c, d, u), v);
  }
  function chaikin(pts) {
    const out = [];
    for (let i = 0; i < pts.length; i++) {
      const [x0, y0] = pts[i], [x1, y1] = pts[(i + 1) % pts.length];
      out.push([x0 * 0.75 + x1 * 0.25, y0 * 0.75 + y1 * 0.25], [x0 * 0.25 + x1 * 0.75, y0 * 0.25 + y1 * 0.75]);
    }
    return out;
  }
  /** Subdivide a coarse outline, roughen it with fractal noise, then round the corners.
      Original vertices stay put so ports remain where history put them. */
  function refine(lonlat) {
    const out = [];
    const n = lonlat.length;
    for (let i = 0; i < n; i++) {
      const [x0, y0] = lonlat[i], [x1, y1] = lonlat[(i + 1) % n];
      const len = Math.hypot(x1 - x0, y1 - y0) || 1e-6;
      const steps = Math.max(1, Math.ceil(len / 0.3));
      const nx = -(y1 - y0) / len, ny = (x1 - x0) / len;
      const amp = Math.min(0.2, len * 0.09);
      for (let k = 0; k < steps; k++) {
        const t = k / steps;
        let x = x0 + (x1 - x0) * t, y = y0 + (y1 - y0) * t;
        if (k > 0) {
          const j = (vnoise(x * 2.3, y * 2.3) - 0.5) * 2 + (vnoise(x * 7.1 + 50, y * 7.1) - 0.5) * 0.8;
          const taper = Math.sin(t * Math.PI);
          x += nx * amp * j * taper; y += ny * amp * j * taper;
        }
        out.push([x, y]);
      }
    }
    return chaikin(out);
  }
  function makePoly(lonlat, kind) {
    if (kind !== 'r' && kind !== 'f' && kind !== 'd') lonlat = kind === 'small' || kind === 'isle' ? chaikin(lonlat) : refine(lonlat);
    const pts = [];
    for (const [lon, lat] of lonlat) { const w = HS.toWorld(lon, lat); pts.push(w.x, w.y); }
    // normalise winding so a combined Path2D with nonzero fill is the union
    let area = 0;
    for (let i = 0, j = pts.length - 2; i < pts.length; j = i, i += 2) area += (pts[j] - pts[i]) * (pts[j + 1] + pts[i + 1]);
    if (area < 0) {
      const rev = [];
      for (let i = pts.length - 2; i >= 0; i -= 2) rev.push(pts[i], pts[i + 1]);
      pts.length = 0; pts.push(...rev);
    }
    let minx = Infinity, miny = Infinity, maxx = -Infinity, maxy = -Infinity;
    for (let i = 0; i < pts.length; i += 2) {
      minx = Math.min(minx, pts[i]); maxx = Math.max(maxx, pts[i]);
      miny = Math.min(miny, pts[i + 1]); maxy = Math.max(maxy, pts[i + 1]);
    }
    return { pts, minx, miny, maxx, maxy, kind };
  }
  function blob(lon, lat, rDeg, rnd, n = 13) {
    const out = [];
    const ph = rnd() * 6;
    for (let i = 0; i < n; i++) {
      const a = (i / n) * HS.TAU;
      const rr = rDeg * (0.72 + 0.28 * Math.sin(a * 2 + ph) + rnd() * 0.22);
      out.push([lon + Math.cos(a) * rr * 1.15, lat + Math.sin(a) * rr]);
    }
    return out;
  }
  function addToPath(path, p) {
    const pts = p.pts;
    path.moveTo(pts[0], pts[1]);
    for (let i = 2; i < pts.length; i += 2) path.lineTo(pts[i], pts[i + 1]);
    path.closePath();
  }
  const MASK_CELL = 8; // world px per land-mask cell

  const World = (HS.World = {
    polys: [], lakes: [], isles: [], ports: [], decor: new Map(), mountains: [],
    landPath: null, lakePath: null, terrain: null, T: 12, iceTop: S * 0.7, iceBot: 0,

    init(seed = 1715) {
      this.iceBot = HS.H - S * 1.1;
      this.polys = Object.entries(HS.LAND).map(([k, v]) => makePoly(v, k));
      this.lakes = Object.values(HS.LAKES).map((v) => makePoly(v, 'lake'));
      const r0 = HS.rng(99);
      for (const [lon, lat, r] of HS.SMALL_ISLES) this.polys.push(makePoly(blob(lon, lat, r, r0, 10), 'small'));

      this.ports = HS.PORTS.map((p, i) => {
        const w = HS.toWorld(p.lon, p.lat);
        return Object.assign({}, p, { id: i, x: w.x, y: w.y, seed: HS.strHash(p.name) });
      });
      this.lakePath = new Path2D();
      for (const l of this.lakes) addToPath(this.lakePath, l);
      this._buildPaths();
      this._buildMask();
      this._makeIsles(seed);
      this._buildPaths();
      this._buildMask();
      for (const p of this.ports) this._seaDir(p);

      this._buildTerrain();
      this._buildDecor();
      this._buildOceanTex();
    },

    _buildPaths() {
      this.landPath = new Path2D();
      for (const p of this.polys) {
        p.path = new Path2D();
        addToPath(p.path, p);
        addToPath(this.landPath, p);
      }
      this._visKey = null;
    },
    /** Rasterise the coastline once; every land test afterwards is a single array lookup. */
    _buildMask() {
      const mw = Math.ceil(HS.W / MASK_CELL), mh = Math.ceil(HS.H / MASK_CELL);
      const c = document.createElement('canvas'); c.width = mw; c.height = mh;
      const g = c.getContext('2d');
      g.scale(1 / MASK_CELL, 1 / MASK_CELL);
      g.fillStyle = '#000'; g.fill(this.landPath);
      g.globalCompositeOperation = 'destination-out'; g.fill(this.lakePath);
      const data = g.getImageData(0, 0, mw, mh).data;
      const mask = new Uint8Array(mw * mh);
      for (let i = 0; i < mask.length; i++) mask[i] = data[i * 4 + 3] > 127 ? 1 : 0;
      this.mask = mask; this.mw = mw; this.mh = mh;
    },
    isLand(x, y) {
      if (y < this.iceTop || y > this.iceBot) return true;
      x = HS.wrapX(x);
      return this.mask[((y / MASK_CELL) | 0) * this.mw + ((x / MASK_CELL) | 0)] === 1;
    },
    /** exact polygon test (used where the mask is too coarse) */
    isLandExact(x, y) {
      x = HS.wrapX(x);
      for (const p of this.polys) {
        if (x < p.minx || x > p.maxx || y < p.miny || y > p.maxy) continue;
        if (pip(p.pts, x, y)) return !this.lakes.some((l) => pip(l.pts, x, y));
      }
      return false;
    },
    /** a Path2D of just the landmasses inside the given world rectangle */
    visiblePath(left, right, top, bottom) {
      const m = 80;
      const ids = [];
      for (let i = 0; i < this.polys.length; i++) {
        const p = this.polys[i];
        if (p.maxx < left - m || p.minx > right + m || p.maxy < top - m || p.miny > bottom + m) continue;
        ids.push(i);
      }
      const key = ids.join(',');
      if (this._visCache && this._visCache.has(key)) return this._visCache.get(key);
      const path = new Path2D();
      for (const i of ids) path.addPath(this.polys[i].path);
      if (!this._visCache || this._visCache.size > 24) this._visCache = new Map();
      this._visCache.set(key, path);
      return path;
    },
    /** distance (px) to nearest land along a ray, up to max */
    rayLand(x, y, ang, max, step = 20) {
      const c = Math.cos(ang), s = Math.sin(ang);
      for (let d = step; d <= max; d += step) if (this.isLand(x + c * d, y + s * d)) return d;
      return Infinity;
    },
    nearestPort(x, y, filter) {
      let best = null, bd = Infinity;
      for (const p of this.ports) {
        if (filter && !filter(p)) continue;
        const d = HS.distW(x, y, p.x, p.y);
        if (d < bd) { bd = d; best = p; }
      }
      return { port: best, dist: bd };
    },
    randomWater(cx, cy, rMin, rMax, tries = 30) {
      for (let i = 0; i < tries; i++) {
        const a = Math.random() * HS.TAU, r = HS.rand(rMin, rMax);
        const x = HS.wrapX(cx + Math.cos(a) * r), y = cy + Math.sin(a) * r;
        if (!this.isLand(x, y) && !this.isLand(x + 40, y) && !this.isLand(x - 40, y) && !this.isLand(x, y + 40) && !this.isLand(x, y - 40)) return { x, y };
      }
      return null;
    },

    _makeIsles(seed) {
      const rnd = HS.rng(seed);
      const names = HS.NAMES.isle.slice();
      const zones = [
        { lon: [-88, -60], lat: [11, 27], n: 7 }, { lon: [-55, -15], lat: [-30, 38], n: 5 },
        { lon: [42, 98], lat: [-32, 12], n: 5 }, { lon: [105, 178], lat: [-28, 28], n: 5 },
        { lon: [-175, -85], lat: [-38, 35], n: 6 }, { lon: [-30, -8], lat: [40, 58], n: 2 },
        { lon: [-50, 10], lat: [-45, -20], n: 2 },
      ];
      for (const z of zones) {
        let made = 0, guard = 0;
        while (made < z.n && guard++ < 400) {
          const lon = HS.lerp(z.lon[0], z.lon[1], rnd()), lat = HS.lerp(z.lat[0], z.lat[1], rnd());
          const rDeg = 0.3 + rnd() * 0.5;
          const c = HS.toWorld(lon, lat), r = rDeg * S;
          let ok = !this.isLand(c.x, c.y);
          for (let k = 0; ok && k < 16; k++) {
            const a = (k / 16) * HS.TAU;
            if (this.isLand(c.x + Math.cos(a) * (r + 90), c.y + Math.sin(a) * (r + 90))) ok = false;
          }
          if (!ok) continue;
          if (this.ports.some((p) => HS.distW(p.x, p.y, c.x, c.y) < 300)) continue;
          if (this.isles.some((i) => HS.distW(i.x, i.y, c.x, c.y) < 360)) continue;
          const name = names.splice(Math.floor(rnd() * names.length), 1)[0] || `Unnamed Isle ${this.isles.length}`;
          const poly = makePoly(blob(lon, lat, rDeg, rnd, 14), 'isle');
          const isle = { idx: this.isles.length, name, lon, lat, x: c.x, y: c.y, r, poly, discovered: false, palms: [] };
          for (let k = 0; k < 4 + rnd() * 6; k++) {
            const a = rnd() * HS.TAU, d = rnd() * r * 0.6;
            isle.palms.push({ x: c.x + Math.cos(a) * d, y: c.y + Math.sin(a) * d * 0.85, s: 0.7 + rnd() * 0.6, a: rnd() * 6 });
          }
          this.isles.push(isle);
          this.polys.push(poly);
          made++;
        }
      }
    },
    _seaDir(p) {
      let vx = 0, vy = 0, n = 0;
      for (let k = 0; k < 24; k++) {
        const a = (k / 24) * HS.TAU;
        for (const d of [40, 80, 130]) {
          if (!this.isLand(p.x + Math.cos(a) * d, p.y + Math.sin(a) * d)) { vx += Math.cos(a); vy += Math.sin(a); n++; }
        }
      }
      p.seaDir = n ? Math.atan2(vy, vx) : 0;
      // a mooring spot in open water just off the town
      p.berth = { x: p.x, y: p.y };
      for (let d = 30; d < 200; d += 10) {
        const bx = p.x + Math.cos(p.seaDir) * d, by = p.y + Math.sin(p.seaDir) * d;
        if (!this.isLand(bx, by) && !this.isLand(bx + 25, by) && !this.isLand(bx - 25, by)) { p.berth = { x: HS.wrapX(bx), y: by }; break; }
      }
    },

    _buildTerrain() {
      const T = this.T, k = T / S;
      const c = document.createElement('canvas');
      c.width = 360 * T; c.height = (HS.LAT_MAX - HS.LAT_MIN) * T;
      const g = c.getContext('2d');
      // Climate tints are painted on a tiny canvas; bilinear upscaling softens their edges
      // (a blur filter on the full-size canvas costs seconds on software renderers).
      const LO = 2;
      const lo = document.createElement('canvas');
      lo.width = 360 * LO; lo.height = (HS.LAT_MAX - HS.LAT_MIN) * LO;
      const lg = lo.getContext('2d');
      lg.scale(LO / S, LO / S);
      const yl = (lat) => (HS.LAT_MAX - lat) / (HS.LAT_MAX - HS.LAT_MIN);
      const gr = lg.createLinearGradient(0, 0, 0, HS.H);
      [[72, '#c9d3cf'], [66, '#93a07f'], [58, '#5f7f48'], [45, '#6f9150'], [33, '#94955b'], [24, '#a49a62'],
        [12, '#5a8a3e'], [0, '#3e7633'], [-12, '#4f7e3a'], [-24, '#8f8c58'], [-36, '#6f8d4d'], [-50, '#7a8a6a'], [-62, '#d6dede']]
        .forEach(([lat, col]) => gr.addColorStop(HS.clamp(yl(lat), 0, 1), col));
      lg.fillStyle = gr;
      lg.fillRect(0, 0, HS.W, HS.H);
      for (const r of HS.REGIONS) {
        const p = makePoly(r.pts, 'r');
        const path = new Path2D(); addToPath(path, p);
        lg.globalAlpha = 0.85; lg.fillStyle = r.c; lg.fill(path);
      }
      lg.globalAlpha = 0.55; lg.strokeStyle = '#7a6a4d'; lg.lineCap = 'round'; lg.lineJoin = 'round';
      lg.lineWidth = S * 1.6;
      for (const range of HS.RANGES) {
        lg.beginPath();
        range.forEach(([lon, lat], i) => { const w = HS.toWorld(lon, lat); i ? lg.lineTo(w.x, w.y) : lg.moveTo(w.x, w.y); });
        lg.stroke();
      }
      // a second, smaller pass softens the edges further
      const lo2 = document.createElement('canvas'); lo2.width = lo.width / 2; lo2.height = lo.height / 2;
      const l2 = lo2.getContext('2d'); l2.imageSmoothingEnabled = true; l2.drawImage(lo, 0, 0, lo2.width, lo2.height);
      lg.setTransform(1, 0, 0, 1, 0, 0); lg.globalAlpha = 0.6; lg.imageSmoothingEnabled = true;
      lg.drawImage(lo2, 0, 0, lo.width, lo.height);
      lg.globalAlpha = 1;
      g.save();
      g.scale(k, k);
      g.clip(this.landPath);
      g.setTransform(1, 0, 0, 1, 0, 0);
      g.imageSmoothingEnabled = true;
      if ('imageSmoothingQuality' in g) g.imageSmoothingQuality = 'high';
      g.drawImage(lo, 0, 0, c.width, c.height);
      g.restore();
      // grain
      const nz = document.createElement('canvas'); nz.width = nz.height = 128;
      const nctx = nz.getContext('2d'); const id = nctx.createImageData(128, 128);
      for (let i = 0; i < id.data.length; i += 4) { const v = 90 + Math.random() * 80; id.data[i] = id.data[i + 1] = id.data[i + 2] = v; id.data[i + 3] = 255; }
      nctx.putImageData(id, 0, 0);
      g.globalCompositeOperation = 'source-atop';
      g.globalAlpha = 0.18;
      g.fillStyle = g.createPattern(nz, 'repeat'); g.fillRect(0, 0, c.width, c.height);
      g.globalAlpha = 0.25;
      g.save(); g.scale(6, 6); g.imageSmoothingEnabled = true; g.fillRect(0, 0, c.width / 6, c.height / 6); g.restore();
      g.globalCompositeOperation = 'source-over'; g.globalAlpha = 1;
      this.terrain = c;
      this.grain = nz;
      this.grainPattern = null;
    },
    _buildDecor() {
      const rnd = HS.rng(7);
      const step = 0.75;
      const inPolys = (polys, x, y) => polys.some((p) => x >= p.minx && x <= p.maxx && y >= p.miny && y <= p.maxy && pip(p.pts, x, y));
      const forest = HS.REGIONS.filter((r) => /^#(2f|3a)6/.test(r.c)).map((r) => makePoly(r.pts, 'f'));
      const desert = HS.REGIONS.filter((r) => /^#(c|d|b)/.test(r.c) && !/^#d9e1|#e8ee/.test(r.c)).map((r) => makePoly(r.pts, 'd'));
      for (let lat = HS.LAT_MAX - 2; lat > HS.LAT_MIN + 2; lat -= step) {
        for (let lon = -180; lon < 180; lon += step) {
          const jl = lon + (rnd() - 0.5) * step, jt = lat + (rnd() - 0.5) * step;
          const w = HS.toWorld(jl, jt);
          if (!this.isLand(w.x, w.y)) continue;
          let type = null;
          const r = rnd();
          if (inPolys(desert, w.x, w.y)) type = r < 0.35 ? 'dune' : null;
          else if (inPolys(forest, w.x, w.y)) type = Math.abs(jt) > 45 ? 'pine' : 'tree';
          else if (Math.abs(jt) > 62) type = r < 0.15 ? 'pine' : null;
          else if (Math.abs(jt) > 46) type = r < 0.55 ? 'pine' : null;
          else if (Math.abs(jt) < 22) type = r < 0.6 ? (r < 0.2 ? 'palm' : 'tree') : null;
          else type = r < 0.45 ? 'tree' : r < 0.55 ? 'hill' : null;
          if (!type) continue;
          const key = `${Math.floor(w.x / (S * 5))},${Math.floor(w.y / (S * 5))}`;
          if (!this.decor.has(key)) this.decor.set(key, []);
          this.decor.get(key).push({ x: w.x, y: w.y, t: type, s: 0.7 + rnd() * 0.7, h: rnd() });
        }
      }
      for (const range of HS.RANGES) {
        for (let i = 0; i < range.length - 1; i++) {
          const a = HS.toWorld(...range[i]), b = HS.toWorld(...range[i + 1]);
          const len = Math.hypot(b.x - a.x, b.y - a.y), n = Math.ceil(len / (S * 0.45));
          for (let k = 0; k < n; k++) {
            const t = k / n, x = HS.lerp(a.x, b.x, t) + (rnd() - 0.5) * S * 0.7, y = HS.lerp(a.y, b.y, t) + (rnd() - 0.5) * S * 0.7;
            if (this.isLand(x, y)) this.mountains.push({ x, y, s: 0.8 + rnd() * 0.8, snow: rnd() < 0.6 });
          }
        }
      }
    },
    _buildOceanTex() {
      const c = document.createElement('canvas'); c.width = c.height = 512;
      const g = c.getContext('2d');
      g.fillStyle = 'rgba(0,0,0,0)'; g.fillRect(0, 0, 512, 512);
      const rnd = HS.rng(3);
      for (let i = 0; i < 70; i++) {
        const x = rnd() * 512, y = rnd() * 512, r = 30 + rnd() * 90;
        const light = rnd() < 0.5;
        for (const ox of [-512, 0, 512]) for (const oy of [-512, 0, 512]) {
          const gr = g.createRadialGradient(x + ox, y + oy, 0, x + ox, y + oy, r);
          gr.addColorStop(0, light ? 'rgba(120,200,230,0.10)' : 'rgba(0,20,50,0.12)');
          gr.addColorStop(1, 'rgba(0,0,0,0)');
          g.fillStyle = gr; g.fillRect(x + ox - r, y + oy - r, r * 2, r * 2);
        }
      }
      this.oceanTex = c;
    },

    // ------------------------------------------------------------------ rendering
    /** Draw ocean, land and ports. cam = {x, y, zoom}; env = {t, night, storm, w, h} */
    draw(ctx, cam, env) {
      const { w, h, t } = env;
      const z = cam.zoom, d = env.dpr || 1;
      // ocean base
      const deep = env.storm ? '#1b3d4f' : '#175d80';
      ctx.fillStyle = deep;
      ctx.fillRect(0, 0, w, h);

      const halfW = w / 2 / z, halfH = h / 2 / z;
      const left = cam.x - halfW, right = cam.x + halfW, top = cam.y - halfH, bottom = cam.y + halfH;
      const offsets = [0];
      if (left < 0) offsets.push(-HS.W);
      if (right > HS.W) offsets.push(HS.W);

      // drifting ocean texture, tiled in screen space (pattern fills lose precision at large world coordinates)
      this._oceanLayer(ctx, cam, env, 1, -t * 3, -t * 1.5, 1);
      this._oceanLayer(ctx, cam, env, 1.7, t * 2, -t * 3.5, 0.7);

      // wave crests
      this._drawWaves(ctx, cam, env, left, right, top, bottom);

      for (const off of offsets) {
        ctx.save();
        ctx.setTransform(z * d, 0, 0, z * d, (w / 2 - (cam.x - off) * z) * d, (h / 2 - cam.y * z) * d);
        this._drawLand(ctx, cam, env, left - off, right - off, top, bottom, z);
        ctx.restore();
      }
      this._drawIce(ctx, cam, env, top, bottom);
    },
    _oceanLayer(ctx, cam, env, scale, driftX, driftY, alpha) {
      // one pattern fill, offset by less than a tile, keeps coordinates small (precise) and seamless
      if (!this.oceanPat) this.oceanPat = ctx.createPattern(this.oceanTex, 'repeat');
      const k = scale * cam.zoom, tile = 512 * k;
      const mod = (v) => ((v % tile) + tile) % tile;
      const ox = mod(env.w / 2 - (cam.x + driftX) * cam.zoom), oy = mod(env.h / 2 - (cam.y + driftY) * cam.zoom);
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.translate(ox - tile, oy - tile);
      ctx.scale(k, k);
      ctx.fillStyle = this.oceanPat;
      ctx.fillRect(0, 0, (env.w + tile * 2) / k, (env.h + tile * 2) / k);
      ctx.restore();
    },
    _drawWaves(ctx, cam, env, left, right, top, bottom) {
      const z = cam.zoom, t = env.t;
      const step = z < 0.5 ? 140 : 80;
      const i0 = Math.floor(left / step) - 1, i1 = Math.ceil(right / step) + 1;
      const j0 = Math.floor(top / step) - 1, j1 = Math.ceil(bottom / step) + 1;
      const windA = env.windDir || 0;
      const ca = Math.cos(windA + Math.PI / 2), sa = Math.sin(windA + Math.PI / 2);
      const sea = HS.clamp((env.windSpeed || 10) / 30, 0.25, 1.4);
      ctx.save();
      ctx.lineCap = 'round';
      ctx.strokeStyle = env.storm ? 'rgba(220,235,240,0.9)' : 'rgba(210,240,255,0.85)';
      ctx.lineWidth = Math.max(1, 1.6 * z);
      for (let i = i0; i <= i1; i++) {
        for (let j = j0; j <= j1; j++) {
          const hh = HS.hash(i, j);
          if (hh > 0.35 + sea * 0.4) continue;
          const wx = i * step + HS.hash(j, i) * step, wy = j * step + hh * step;
          const ph = t * (0.8 + hh) + hh * 40;
          const a = Math.sin(ph);
          if (a < 0.1) continue;
          const sx = (HS.dxw(cam.x, wx)) * z + env.w / 2, sy = (wy - cam.y) * z + env.h / 2;
          if (sx < -30 || sy < -30 || sx > env.w + 30 || sy > env.h + 30) continue;
          const L = (8 + hh * 14) * z * (0.6 + sea * 0.6);
          ctx.globalAlpha = a * 0.45 * (0.5 + sea * 0.5);
          ctx.beginPath();
          ctx.moveTo(sx - ca * L, sy - sa * L);
          ctx.quadraticCurveTo(sx + Math.cos(windA) * L * 0.35, sy + Math.sin(windA) * L * 0.35, sx + ca * L, sy + sa * L);
          ctx.stroke();
        }
      }
      ctx.restore();
    },
    _drawLand(ctx, cam, env, left, right, top, bottom, z) {
      const t = env.t;
      const land = this.visiblePath(left, right, top, bottom);
      // shallows and surf
      ctx.lineJoin = 'round';
      ctx.strokeStyle = 'rgba(64,170,190,0.35)'; ctx.lineWidth = 60; ctx.stroke(land);
      ctx.strokeStyle = 'rgba(95,200,205,0.45)'; ctx.lineWidth = 28; ctx.stroke(land);
      ctx.strokeStyle = 'rgba(140,220,215,0.55)'; ctx.lineWidth = 12; ctx.stroke(land);
      ctx.save();
      ctx.setLineDash([14, 22]);
      ctx.lineDashOffset = -t * 9;
      ctx.strokeStyle = `rgba(255,255,255,${0.45 + 0.25 * Math.sin(t * 1.3)})`;
      ctx.lineWidth = 3 + Math.sin(t * 0.9) * 1.2;
      ctx.stroke(land);
      ctx.restore();
      ctx.strokeStyle = '#e2cf98'; ctx.lineWidth = 6; ctx.stroke(land);

      // terrain texture, clipped to the crisp vector coastline
      ctx.save();
      ctx.clip(land);
      const k = this.T / S;
      const sx = HS.clamp(left * k, 0, this.terrain.width), sy = HS.clamp(top * k, 0, this.terrain.height);
      const ex = HS.clamp(right * k, 0, this.terrain.width), ey = HS.clamp(bottom * k, 0, this.terrain.height);
      if (ex - sx > 1 && ey - sy > 1) {
        ctx.imageSmoothingEnabled = true;
        ctx.drawImage(this.terrain, sx, sy, ex - sx, ey - sy, sx / k, sy / k, (ex - sx) / k, (ey - sy) / k);
      }
      if (z > 0.45) {
        if (!this.grainPattern) this.grainPattern = ctx.createPattern(this.grain, 'repeat');
        ctx.globalAlpha = 0.1;
        ctx.globalCompositeOperation = 'overlay';
        ctx.fillStyle = this.grainPattern;
        ctx.fillRect(left, top, right - left, bottom - top);
        ctx.globalCompositeOperation = 'source-over';
        ctx.globalAlpha = 1;
      }
      // inner coast shadow for relief
      ctx.strokeStyle = 'rgba(40,60,20,0.25)'; ctx.lineWidth = 16; ctx.stroke(land);
      ctx.restore();

      // lakes
      ctx.fillStyle = '#2a6d8a'; ctx.fill(this.lakePath);
      ctx.strokeStyle = 'rgba(140,220,215,0.5)'; ctx.lineWidth = 8; ctx.stroke(this.lakePath);

      if (z > 0.3) this._drawDecor(ctx, left, right, top, bottom, z, t);
    },
    _drawDecor(ctx, left, right, top, bottom, z, t) {
      const cs = S * 5;
      const ci0 = Math.floor(left / cs), ci1 = Math.floor(right / cs), cj0 = Math.floor(top / cs), cj1 = Math.floor(bottom / cs);
      const drawTrees = z > 0.5;
      for (let ci = ci0; ci <= ci1; ci++) {
        for (let cj = cj0; cj <= cj1; cj++) {
          const list = this.decor.get(`${ci},${cj}`);
          if (!list || !drawTrees) continue;
          for (const d of list) {
            if (d.x < left - 40 || d.x > right + 40 || d.y < top - 40 || d.y > bottom + 40) continue;
            const s = d.s * 9;
            if (d.t === 'tree') {
              ctx.fillStyle = 'rgba(20,40,10,0.35)';
              ctx.beginPath(); ctx.arc(d.x + 3, d.y + 3, s, 0, HS.TAU); ctx.fill();
              ctx.fillStyle = d.h < 0.5 ? '#2f5e27' : '#3c6d2c';
              ctx.beginPath(); ctx.arc(d.x, d.y, s, 0, HS.TAU); ctx.arc(d.x + s * 0.8, d.y + s * 0.3, s * 0.75, 0, HS.TAU); ctx.arc(d.x - s * 0.6, d.y + s * 0.5, s * 0.7, 0, HS.TAU); ctx.fill();
              ctx.fillStyle = 'rgba(160,200,110,0.35)';
              ctx.beginPath(); ctx.arc(d.x - s * 0.3, d.y - s * 0.35, s * 0.4, 0, HS.TAU); ctx.fill();
            } else if (d.t === 'pine') {
              ctx.fillStyle = 'rgba(20,30,10,0.3)';
              ctx.beginPath(); ctx.moveTo(d.x + 3, d.y - s + 3); ctx.lineTo(d.x + s * 0.7 + 3, d.y + s * 0.8 + 3); ctx.lineTo(d.x - s * 0.7 + 3, d.y + s * 0.8 + 3); ctx.fill();
              ctx.fillStyle = d.h < 0.5 ? '#244a2b' : '#2d5634';
              ctx.beginPath(); ctx.moveTo(d.x, d.y - s * 1.1); ctx.lineTo(d.x + s * 0.7, d.y + s * 0.8); ctx.lineTo(d.x - s * 0.7, d.y + s * 0.8); ctx.fill();
            } else if (d.t === 'palm') {
              this.drawPalm(ctx, d.x, d.y, d.s, t + d.h * 5);
            } else if (d.t === 'dune') {
              ctx.strokeStyle = 'rgba(150,110,60,0.45)'; ctx.lineWidth = 2;
              ctx.beginPath(); ctx.arc(d.x, d.y + s, s * 1.4, -2.4, -0.7); ctx.stroke();
            } else if (d.t === 'hill') {
              ctx.fillStyle = 'rgba(90,80,40,0.25)';
              ctx.beginPath(); ctx.ellipse(d.x, d.y, s * 1.5, s * 0.9, 0, 0, HS.TAU); ctx.fill();
            }
          }
        }
      }
      for (const m of this.mountains) {
        if (m.x < left - 60 || m.x > right + 60 || m.y < top - 60 || m.y > bottom + 60) continue;
        const s = m.s * 22;
        ctx.fillStyle = '#7d6c55';
        ctx.beginPath(); ctx.moveTo(m.x, m.y - s); ctx.lineTo(m.x + s * 0.9, m.y + s * 0.5); ctx.lineTo(m.x - s * 0.9, m.y + s * 0.5); ctx.fill();
        ctx.fillStyle = '#5b4d3c';
        ctx.beginPath(); ctx.moveTo(m.x, m.y - s); ctx.lineTo(m.x + s * 0.9, m.y + s * 0.5); ctx.lineTo(m.x + s * 0.1, m.y + s * 0.5); ctx.fill();
        if (m.snow) {
          ctx.fillStyle = '#f1f3f2';
          ctx.beginPath(); ctx.moveTo(m.x, m.y - s); ctx.lineTo(m.x + s * 0.32, m.y - s * 0.45); ctx.lineTo(m.x + s * 0.05, m.y - s * 0.55); ctx.lineTo(m.x - s * 0.3, m.y - s * 0.45); ctx.fill();
        }
      }
      // palms on the uncharted isles
      if (z > 0.35) {
        for (const isle of this.isles) {
          if (isle.x < left - 200 || isle.x > right + 200 || isle.y < top - 200 || isle.y > bottom + 200) continue;
          for (const p of isle.palms) this.drawPalm(ctx, p.x, p.y, p.s * 1.3, t + p.a);
        }
      }
    },
    drawPalm(ctx, x, y, s, t) {
      const sway = Math.sin(t * 1.3) * 0.12;
      ctx.save();
      ctx.translate(x, y);
      ctx.fillStyle = 'rgba(0,0,0,0.25)';
      ctx.beginPath(); ctx.ellipse(4 * s, 4 * s, 9 * s, 5 * s, 0.5, 0, HS.TAU); ctx.fill();
      ctx.rotate(sway);
      ctx.strokeStyle = '#2f7a2c'; ctx.lineWidth = 3.2 * s; ctx.lineCap = 'round';
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * HS.TAU + 0.3;
        ctx.beginPath(); ctx.moveTo(0, 0);
        ctx.quadraticCurveTo(Math.cos(a) * 7 * s, Math.sin(a) * 7 * s - 2 * s, Math.cos(a) * 12 * s, Math.sin(a) * 12 * s);
        ctx.stroke();
      }
      ctx.fillStyle = '#5a3a1c'; ctx.beginPath(); ctx.arc(0, 0, 2.2 * s, 0, HS.TAU); ctx.fill();
      ctx.restore();
    },
    _drawIce(ctx, cam, env, top, bottom) {
      const z = cam.zoom;
      const drawBand = (y0, y1, dir) => {
        const sy0 = (y0 - cam.y) * z + env.h / 2, sy1 = (y1 - cam.y) * z + env.h / 2;
        const g = ctx.createLinearGradient(0, sy0, 0, sy1);
        g.addColorStop(0, 'rgba(235,245,250,1)'); g.addColorStop(1, 'rgba(235,245,250,0)');
        ctx.fillStyle = g;
        ctx.fillRect(0, Math.min(sy0, sy1) - (dir < 0 ? 4000 : 0), env.w, Math.abs(sy1 - sy0) + 4000);
      };
      if (top < this.iceTop + S) {
        const sy = (this.iceTop - cam.y) * z + env.h / 2;
        ctx.fillStyle = '#eef6f9'; ctx.fillRect(0, 0, env.w, Math.max(0, sy));
        const g = ctx.createLinearGradient(0, sy, 0, sy + S * 0.8 * z);
        g.addColorStop(0, 'rgba(238,246,249,1)'); g.addColorStop(1, 'rgba(238,246,249,0)');
        ctx.fillStyle = g; ctx.fillRect(0, sy, env.w, S * 0.8 * z);
      }
      if (bottom > this.iceBot - S) {
        const sy = (this.iceBot - cam.y) * z + env.h / 2;
        ctx.fillStyle = '#eef6f9'; ctx.fillRect(0, sy, env.w, env.h - sy + 10);
        const g = ctx.createLinearGradient(0, sy, 0, sy - S * 0.8 * z);
        g.addColorStop(0, 'rgba(238,246,249,1)'); g.addColorStop(1, 'rgba(238,246,249,0)');
        ctx.fillStyle = g; ctx.fillRect(0, sy - S * 0.8 * z, env.w, S * 0.8 * z);
      }
      void drawBand;
    },

    /** Draws a port town in screen space at (sx, sy). */
    drawPort(ctx, p, sx, sy, z, t, hostile) {
      if (!p._layout) this._layoutPort(p);
      ctx.save();
      ctx.translate(sx, sy);
      ctx.scale(z, z);
      const L = p._layout;
      // pier
      ctx.save();
      ctx.rotate(p.seaDir);
      ctx.fillStyle = 'rgba(0,0,0,0.25)'; ctx.fillRect(4, -5, 62, 12);
      ctx.fillStyle = '#7a5532'; ctx.fillRect(0, -6, 60, 12);
      ctx.strokeStyle = '#5a3d22'; ctx.lineWidth = 1;
      for (let i = 4; i < 60; i += 5) { ctx.beginPath(); ctx.moveTo(i, -6); ctx.lineTo(i, 6); ctx.stroke(); }
      ctx.fillStyle = '#7a5532'; ctx.fillRect(40, -18, 8, 36);
      ctx.restore();
      // buildings
      for (const b of L.buildings) this._drawBuilding(ctx, b, p.style, t);
      // fort
      const f = L.fort;
      ctx.save();
      ctx.translate(f.x, f.y);
      ctx.fillStyle = 'rgba(0,0,0,0.3)';
      this._star(ctx, 4, 4, 22, 14, 5); ctx.fill();
      ctx.fillStyle = '#9b9488'; this._star(ctx, 0, 0, 22, 14, 5); ctx.fill();
      ctx.strokeStyle = '#6d675d'; ctx.lineWidth = 2; ctx.stroke();
      ctx.fillStyle = '#b8b2a5'; ctx.fillRect(-8, -8, 16, 16);
      ctx.fillStyle = '#222';
      for (let i = 0; i < 5; i++) { const a = (i / 5) * HS.TAU - Math.PI / 2; ctx.fillRect(Math.cos(a) * 19 - 1.5, Math.sin(a) * 19 - 1.5, 3, 3); }
      ctx.strokeStyle = '#3a2a1a'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, -26); ctx.stroke();
      HS.drawFlag(ctx, p.nation, 0, -26, 16, 10, t);
      if (hostile) { ctx.strokeStyle = 'rgba(220,40,30,0.8)'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(0, 0, 30, 0, HS.TAU); ctx.stroke(); }
      ctx.restore();
      // lighthouse
      const lh = L.light;
      ctx.fillStyle = 'rgba(0,0,0,0.3)'; ctx.beginPath(); ctx.arc(lh.x + 3, lh.y + 3, 7, 0, HS.TAU); ctx.fill();
      ctx.fillStyle = '#f2efe6'; ctx.beginPath(); ctx.arc(lh.x, lh.y, 7, 0, HS.TAU); ctx.fill();
      ctx.fillStyle = '#b3342a'; ctx.beginPath(); ctx.arc(lh.x, lh.y, 4, 0, HS.TAU); ctx.fill();
      ctx.restore();
    },
    _star(ctx, x, y, r1, r2, n) {
      ctx.beginPath();
      for (let i = 0; i < n * 2; i++) {
        const a = (i / (n * 2)) * HS.TAU - Math.PI / 2, r = i % 2 ? r2 : r1;
        ctx.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r);
      }
      ctx.closePath();
    },
    _layoutPort(p) {
      const rnd = HS.rng(p.seed);
      const land = p.seaDir + Math.PI;
      const buildings = [];
      const n = 9 + Math.floor(rnd() * 7);
      for (let i = 0; i < n; i++) {
        const a = land + (rnd() - 0.5) * 2.4, d = 18 + rnd() * 52;
        const x = Math.cos(a) * d, y = Math.sin(a) * d;
        if (this.isLand(p.x + x, p.y + y) || i < 3) {
          buildings.push({ x, y, w: 9 + rnd() * 9, h: 8 + rnd() * 7, rot: land + (rnd() - 0.5) * 0.5, c: rnd(), kind: rnd() < 0.12 ? 'special' : 'house' });
        }
      }
      const fa = land + 1.2;
      const lh = p.seaDir - 1.0;
      p._layout = {
        buildings,
        fort: { x: Math.cos(fa) * 46, y: Math.sin(fa) * 46 },
        light: { x: Math.cos(lh) * 52, y: Math.sin(lh) * 52 },
      };
      p.lightPos = { x: p.x + p._layout.light.x, y: p.y + p._layout.light.y };
      p.fortPos = { x: p.x + p._layout.fort.x, y: p.y + p._layout.fort.y };
    },
    _drawBuilding(ctx, b, style, t) {
      const pal = {
        euro: [['#a5432f', '#8a3324'], ['#57575f', '#45454c'], ['#9a5a3a', '#7d472c']],
        carib: [['#b9473a', '#9b3a2f'], ['#4b8f8c', '#3c7471'], ['#d0a14a', '#b0863a']],
        asia: [['#3e4548', '#2f3537'], ['#7a2d24', '#5e211a'], ['#3e4548', '#2f3537']],
        arab: [['#e8e0cc', '#d4cab2'], ['#efe8d8', '#ddd3bd'], ['#d9c9a3', '#c4b48e']],
        pirate: [['#6b4b2e', '#553b23'], ['#5b4630', '#493724'], ['#7a5a38', '#604529']],
        africa: [['#b8955a', '#9c7c47'], ['#c2a066', '#a88a54'], ['#a8854d', '#8e703f']],
      }[style] || [['#a5432f', '#8a3324']];
      const [c1, c2] = pal[Math.floor(b.c * pal.length) % pal.length];
      ctx.save();
      ctx.translate(b.x, b.y);
      ctx.rotate(b.rot);
      ctx.fillStyle = 'rgba(0,0,0,0.3)'; ctx.fillRect(-b.w / 2 + 3, -b.h / 2 + 3, b.w, b.h);
      if (style === 'africa') {
        ctx.fillStyle = c1; ctx.beginPath(); ctx.arc(0, 0, b.w * 0.5, 0, HS.TAU); ctx.fill();
        ctx.fillStyle = c2; ctx.beginPath(); ctx.arc(0, 0, b.w * 0.25, 0, HS.TAU); ctx.fill();
      } else if (style === 'arab' && b.kind === 'special') {
        ctx.fillStyle = c1; ctx.fillRect(-b.w / 2, -b.h / 2, b.w, b.h);
        const g = ctx.createRadialGradient(-2, -2, 1, 0, 0, b.w * 0.45);
        g.addColorStop(0, '#fff6dc'); g.addColorStop(1, '#c9a54c');
        ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, b.w * 0.42, 0, HS.TAU); ctx.fill();
      } else if (style === 'asia' && b.kind === 'special') {
        for (let k = 0; k < 3; k++) {
          const s = b.w * (1 - k * 0.28);
          ctx.fillStyle = k % 2 ? '#7a2d24' : '#3e4548';
          ctx.fillRect(-s / 2, -s / 2, s, s);
        }
      } else if (b.kind === 'special' && style === 'euro') {
        // church with spire
        ctx.fillStyle = '#cfc6b4'; ctx.fillRect(-b.w / 2, -b.h / 2, b.w * 1.3, b.h);
        ctx.fillStyle = '#57575f'; ctx.fillRect(-b.w / 2, -b.h / 2, b.w * 1.3, b.h / 2);
        ctx.fillStyle = '#45454c'; ctx.beginPath(); ctx.arc(b.w * 0.6, 0, 4, 0, HS.TAU); ctx.fill();
      } else {
        ctx.fillStyle = c1; ctx.fillRect(-b.w / 2, -b.h / 2, b.w, b.h / 2);
        ctx.fillStyle = c2; ctx.fillRect(-b.w / 2, 0, b.w, b.h / 2);
        ctx.strokeStyle = 'rgba(0,0,0,0.35)'; ctx.lineWidth = 0.8; ctx.strokeRect(-b.w / 2, -b.h / 2, b.w, b.h);
        if (style === 'euro' && b.c > 0.5) { ctx.fillStyle = '#3a3a3a'; ctx.fillRect(b.w * 0.2, -b.h * 0.4, 2, 2); }
      }
      ctx.restore();
    },
  });

  // ---------------------------------------------------------------- flags
  const flagCache = {};
  function flagCanvas(nation) {
    if (flagCache[nation]) return flagCache[nation];
    const c = document.createElement('canvas'); c.width = 48; c.height = 32;
    const g = c.getContext('2d');
    const W = 48, H = 32;
    const stripesH = (cols) => cols.forEach((col, i) => { g.fillStyle = col; g.fillRect(0, (i * H) / cols.length, W, H / cols.length + 1); });
    const stripesV = (cols) => cols.forEach((col, i) => { g.fillStyle = col; g.fillRect((i * W) / cols.length, 0, W / cols.length + 1, H); });
    switch (nation) {
      case 'british':
        g.fillStyle = '#012169'; g.fillRect(0, 0, W, H);
        g.strokeStyle = '#fff'; g.lineWidth = 6; g.beginPath(); g.moveTo(0, 0); g.lineTo(W, H); g.moveTo(W, 0); g.lineTo(0, H); g.stroke();
        g.strokeStyle = '#c8102e'; g.lineWidth = 2; g.stroke();
        g.fillStyle = '#fff'; g.fillRect(0, H / 2 - 5, W, 10); g.fillRect(W / 2 - 5, 0, 10, H);
        g.fillStyle = '#c8102e'; g.fillRect(0, H / 2 - 3, W, 6); g.fillRect(W / 2 - 3, 0, 6, H);
        break;
      case 'spanish': g.fillStyle = '#aa151b'; g.fillRect(0, 0, W, H); g.fillStyle = '#f1bf00'; g.fillRect(0, H / 4, W, H / 2); break;
      case 'french': stripesV(['#1f3d8c', '#ffffff', '#d52b1e']); break;
      case 'dutch': stripesH(['#ae1c28', '#ffffff', '#21468b']); break;
      case 'portuguese': stripesV(['#006600', '#ff0000', '#ff0000']); g.fillStyle = '#ffd700'; g.beginPath(); g.arc(W * 0.37, H / 2, 8, 0, HS.TAU); g.fill(); break;
      case 'ottoman':
        g.fillStyle = '#e30a17'; g.fillRect(0, 0, W, H);
        g.fillStyle = '#fff'; g.beginPath(); g.arc(19, 16, 9, 0, HS.TAU); g.fill();
        g.fillStyle = '#e30a17'; g.beginPath(); g.arc(22, 16, 7.5, 0, HS.TAU); g.fill();
        g.fillStyle = '#fff'; g.beginPath(); g.arc(30, 16, 3, 0, HS.TAU); g.fill();
        break;
      case 'omani': g.fillStyle = '#c8102e'; g.fillRect(0, 0, W, H); g.fillStyle = '#fff'; g.fillRect(0, 0, 14, 10); break;
      case 'qing':
        g.fillStyle = '#f2c200'; g.fillRect(0, 0, W, H);
        g.strokeStyle = '#1d4f91'; g.lineWidth = 3; g.beginPath(); g.moveTo(8, 22); g.bezierCurveTo(16, 6, 24, 28, 32, 12); g.lineTo(40, 16); g.stroke();
        g.fillStyle = '#c8102e'; g.beginPath(); g.arc(10, 8, 3, 0, HS.TAU); g.fill();
        break;
      case 'japanese': g.fillStyle = '#fff'; g.fillRect(0, 0, W, H); g.fillStyle = '#bc002d'; g.beginPath(); g.arc(W / 2, H / 2, 9, 0, HS.TAU); g.fill(); break;
      case 'danish': g.fillStyle = '#c8102e'; g.fillRect(0, 0, W, H); g.fillStyle = '#fff'; g.fillRect(0, 13, W, 6); g.fillRect(14, 0, 6, H); break;
      case 'venetian':
        g.fillStyle = '#a3142a'; g.fillRect(0, 0, W, H);
        g.fillStyle = '#e1b84a'; g.beginPath(); g.arc(20, 16, 8, 0, HS.TAU); g.fill(); g.fillRect(28, 12, 14, 3); g.fillRect(28, 18, 14, 3);
        break;
      case 'american':
        for (let i = 0; i < 7; i++) { g.fillStyle = i % 2 ? '#fff' : '#b22234'; g.fillRect(0, (i * H) / 7, W, H / 7 + 1); }
        g.fillStyle = '#3c3b6e'; g.fillRect(0, 0, 20, 16);
        g.fillStyle = '#fff'; for (let i = 0; i < 9; i++) g.fillRect(2 + (i % 3) * 6, 2 + Math.floor(i / 3) * 5, 2, 2);
        break;
      case 'hawaiian':
        stripesH(['#fff', '#c8102e', '#012169', '#fff', '#c8102e', '#012169', '#fff', '#c8102e']);
        g.fillStyle = '#012169'; g.fillRect(0, 0, 20, 14); g.fillStyle = '#c8102e'; g.fillRect(0, 6, 20, 3); g.fillRect(8, 0, 4, 14);
        break;
      case 'pirate':
        g.fillStyle = '#111'; g.fillRect(0, 0, W, H);
        g.fillStyle = '#f2f2f2';
        g.beginPath(); g.arc(24, 12, 6.5, 0, HS.TAU); g.fill(); g.fillRect(20.5, 15, 7, 5);
        g.fillStyle = '#111'; g.beginPath(); g.arc(21.5, 12, 1.8, 0, HS.TAU); g.arc(26.5, 12, 1.8, 0, HS.TAU); g.fill();
        g.strokeStyle = '#f2f2f2'; g.lineWidth = 2.6; g.lineCap = 'round';
        g.beginPath(); g.moveTo(13, 20); g.lineTo(35, 29); g.moveTo(35, 20); g.lineTo(13, 29); g.stroke();
        break;
      case 'white': g.fillStyle = '#f4f4f0'; g.fillRect(0, 0, W, H); break;
      default: g.fillStyle = '#888'; g.fillRect(0, 0, W, H);
    }
    flagCache[nation] = c;
    return c;
  }
  HS.flagCanvas = flagCanvas;
  /** Waving flag; (x, y) is the hoist top. */
  HS.drawFlag = (ctx, nation, x, y, w, h, t, dirAngle) => {
    const c = flagCanvas(nation);
    const slices = 8;
    ctx.save();
    ctx.translate(x, y);
    if (dirAngle !== undefined) ctx.rotate(dirAngle);
    for (let i = 0; i < slices; i++) {
      const u = i / slices;
      const off = Math.sin(t * 7 - u * 5) * h * 0.12 * u;
      ctx.drawImage(c, (u * c.width), 0, c.width / slices + 0.5, c.height, u * w, off, w / slices + 0.4, h);
    }
    ctx.restore();
  };
})();
