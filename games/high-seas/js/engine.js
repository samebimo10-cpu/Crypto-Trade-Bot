/* High Seas — math, projection, RNG and input. */
(function () {
  const HS = (window.HS = window.HS || {});

  HS.S = 80;              // world pixels per degree
  HS.LAT_MAX = 72;        // top edge of the navigable world (pack ice beyond)
  HS.LAT_MIN = -62;       // bottom edge
  HS.W = 360 * HS.S;
  HS.H = (HS.LAT_MAX - HS.LAT_MIN) * HS.S;
  HS.KN = 2.4;            // world px per second per knot at 1x time
  HS.NM_PER_PX = 60 / HS.S;
  HS.TAU = Math.PI * 2;

  HS.toWorld = (lon, lat) => ({ x: (lon + 180) * HS.S, y: (HS.LAT_MAX - lat) * HS.S });
  HS.wrapX = (x) => ((x % HS.W) + HS.W) % HS.W;
  HS.toLonLat = (x, y) => ({ lon: HS.wrapX(x) / HS.S - 180, lat: HS.LAT_MAX - y / HS.S });
  /** shortest signed horizontal delta (b - a) on the wrapped world */
  HS.dxw = (a, b) => {
    let d = b - a;
    if (d > HS.W / 2) d -= HS.W;
    else if (d < -HS.W / 2) d += HS.W;
    return d;
  };
  HS.distW = (ax, ay, bx, by) => Math.hypot(HS.dxw(ax, bx), by - ay);
  HS.clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
  HS.lerp = (a, b, t) => a + (b - a) * t;
  HS.angNorm = (a) => {
    a = (a + Math.PI) % HS.TAU;
    if (a < 0) a += HS.TAU;
    return a - Math.PI;
  };
  HS.headingDeg = (angle) => (((angle * 180) / Math.PI + 90) % 360 + 360) % 360;
  const POINTS = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];
  HS.compassPoint = (deg) => POINTS[Math.round(deg / 22.5) % 16];
  HS.fmtLat = (lat) => {
    const a = Math.abs(lat), d = Math.floor(a), m = Math.floor((a - d) * 60);
    return `${d}°${String(m).padStart(2, '0')}′${lat >= 0 ? 'N' : 'S'}`;
  };
  HS.fmtLon = (lon) => {
    const a = Math.abs(lon), d = Math.floor(a), m = Math.floor((a - d) * 60);
    return `${d}°${String(m).padStart(2, '0')}′${lon >= 0 ? 'E' : 'W'}`;
  };
  HS.fmtGold = (g) => Math.round(g).toLocaleString('en-GB');

  HS.BEAUFORT = [
    [1, 'Calm'], [4, 'Light air'], [7, 'Light breeze'], [11, 'Gentle breeze'], [17, 'Moderate breeze'],
    [22, 'Fresh breeze'], [28, 'Strong breeze'], [34, 'Near gale'], [41, 'Gale'], [48, 'Strong gale'],
    [56, 'Storm'], [64, 'Violent storm'], [999, 'Hurricane'],
  ];
  HS.beaufort = (kn) => {
    for (let i = 0; i < HS.BEAUFORT.length; i++) if (kn < HS.BEAUFORT[i][0]) return { force: i, name: HS.BEAUFORT[i][1] };
    return { force: 12, name: 'Hurricane' };
  };

  // Seeded RNG (mulberry32)
  HS.rng = (seed) => {
    let a = seed >>> 0;
    return () => {
      a |= 0; a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  };
  HS.hash = (x, y) => {
    let h = (x * 374761393 + y * 668265263) | 0;
    h = Math.imul(h ^ (h >>> 13), 1274126177);
    return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
  };
  HS.strHash = (s) => {
    let h = 2166136261;
    for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
    return h >>> 0;
  };
  HS.rand = (a, b) => a + Math.random() * (b - a);
  HS.randi = (a, b) => Math.floor(HS.rand(a, b + 1));
  HS.pick = (arr, r) => arr[Math.floor((r ? r() : Math.random()) * arr.length)];
  HS.chance = (p) => Math.random() < p;

  // ---------------------------------------------------------------- input
  const Input = (HS.Input = {
    keys: {}, pressed: {}, mouse: { x: 0, y: 0, down: false, clicked: false, rclicked: false }, wheel: 0,
    touch: {},
    init(canvas) {
      const isField = (e) => e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA');
      window.addEventListener('keydown', (e) => {
        if (isField(e)) return;
        if (!this.keys[e.code]) this.pressed[e.code] = true;
        this.keys[e.code] = true;
        if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Tab'].includes(e.code)) e.preventDefault();
      });
      window.addEventListener('keyup', (e) => { this.keys[e.code] = false; });
      window.addEventListener('blur', () => { this.keys = {}; });
      canvas.addEventListener('mousemove', (e) => { this.mouse.x = e.clientX; this.mouse.y = e.clientY; });
      canvas.addEventListener('mousedown', (e) => {
        if (e.button === 0) { this.mouse.down = true; this.mouse.clicked = true; }
        if (e.button === 2) this.mouse.rclicked = true;
      });
      window.addEventListener('mouseup', () => { this.mouse.down = false; });
      canvas.addEventListener('contextmenu', (e) => e.preventDefault());
      canvas.addEventListener('wheel', (e) => { this.wheel += Math.sign(e.deltaY); e.preventDefault(); }, { passive: false });
    },
    down(...codes) { return codes.some((c) => this.keys[c] || this.touch[c]); },
    hit(...codes) { return codes.some((c) => this.pressed[c]); },
    press(code) { this.pressed[code] = true; },
    endFrame() { this.pressed = {}; this.mouse.clicked = false; this.mouse.rclicked = false; this.wheel = 0; },
  });
})();
