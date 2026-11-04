'use strict';
// SKYREIGN — shared helpers. Everything lives under the global SR namespace so the
// game runs from file:// with plain <script> tags (no module/CORS issues).
window.SR = window.SR || {};

(function (SR) {
  const U = {};
  U.TAU = Math.PI * 2;
  U.clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
  U.lerp = (a, b, t) => a + (b - a) * t;
  U.rand = (a = 0, b = 1) => a + Math.random() * (b - a);
  U.randInt = (a, b) => Math.floor(a + Math.random() * (b - a + 1));
  U.choice = (arr) => arr[Math.floor(Math.random() * arr.length)];
  U.chance = (p) => Math.random() < p;
  U.dist2 = (ax, ay, bx, by) => { const dx = bx - ax, dy = by - ay; return dx * dx + dy * dy; };
  U.dist = (ax, ay, bx, by) => Math.sqrt(U.dist2(ax, ay, bx, by));
  U.angleTo = (ax, ay, bx, by) => Math.atan2(by - ay, bx - ax);
  U.angleDiff = (a, b) => {
    let d = (b - a) % U.TAU;
    if (d > Math.PI) d -= U.TAU;
    if (d < -Math.PI) d += U.TAU;
    return d;
  };
  U.easeOutCubic = (t) => 1 - Math.pow(1 - t, 3);
  U.easeOutBack = (t) => { const c1 = 1.70158, c3 = c1 + 1; return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2); };

  // Deterministic integer hash -> [0,1)
  U.hash2 = (x, y, s = 0) => {
    let h = Math.imul(x | 0, 374761393) ^ Math.imul(y | 0, 668265263) ^ Math.imul((s | 0) + 1, 1442695041);
    h = Math.imul(h ^ (h >>> 13), 1274126177);
    h ^= h >>> 16;
    return (h >>> 0) / 4294967296;
  };
  // Smooth value noise
  U.noise2 = (x, y, s = 0) => {
    const xi = Math.floor(x), yi = Math.floor(y);
    const xf = x - xi, yf = y - yi;
    const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
    const a = U.hash2(xi, yi, s), b = U.hash2(xi + 1, yi, s);
    const c = U.hash2(xi, yi + 1, s), d = U.hash2(xi + 1, yi + 1, s);
    return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
  };
  U.fbm = (x, y, s = 0, oct = 3) => {
    let t = 0, a = 0.5, f = 1, n = 0;
    for (let i = 0; i < oct; i++) { t += U.noise2(x * f, y * f, s + i * 17) * a; n += a; a *= 0.5; f *= 2.03; }
    return t / n;
  };

  U.weightedPick = (items, wfn) => {
    let tot = 0;
    for (const it of items) tot += Math.max(0, wfn(it));
    if (tot <= 0) return null;
    let r = Math.random() * tot;
    for (const it of items) { r -= Math.max(0, wfn(it)); if (r <= 0) return it; }
    return items[items.length - 1];
  };
  U.shuffle = (arr) => {
    for (let i = arr.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [arr[i], arr[j]] = [arr[j], arr[i]]; }
    return arr;
  };
  U.formatTime = (s) => {
    s = Math.max(0, Math.floor(s));
    const m = Math.floor(s / 60), ss = s % 60;
    return m + ':' + (ss < 10 ? '0' : '') + ss;
  };
  U.formatNum = (n) => {
    n = Math.floor(n);
    if (n >= 1e6) return (n / 1e6).toFixed(1) + 'M';
    if (n >= 1e4) return (n / 1e3).toFixed(1) + 'k';
    return String(n);
  };
  U.makeCanvas = (w, h) => {
    const c = document.createElement('canvas');
    c.width = Math.max(1, Math.ceil(w));
    c.height = Math.max(1, Math.ceil(h));
    return c;
  };
  // In-place filter (avoids allocating new arrays every frame)
  U.compact = (arr, keep) => {
    let j = 0;
    for (let i = 0; i < arr.length; i++) { const o = arr[i]; if (keep(o)) arr[j++] = o; }
    arr.length = j;
    return arr;
  };
  U.pct = (v) => Math.round(v * 100) + '%';
  U.escape = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

  // Uniform spatial hash for broad-phase collision queries
  class Grid {
    constructor(cell) { this.cell = cell; this.map = new Map(); }
    clear() { this.map.clear(); }
    key(cx, cy) { return (cx + 50000) * 100000 + (cy + 50000); }
    insert(o) {
      const k = this.key(Math.floor(o.x / this.cell), Math.floor(o.y / this.cell));
      let a = this.map.get(k);
      if (!a) { a = []; this.map.set(k, a); }
      a.push(o);
    }
    query(x, y, r, out) {
      out.length = 0;
      const c = this.cell;
      const x0 = Math.floor((x - r) / c), x1 = Math.floor((x + r) / c);
      const y0 = Math.floor((y - r) / c), y1 = Math.floor((y + r) / c);
      for (let cx = x0; cx <= x1; cx++) {
        for (let cy = y0; cy <= y1; cy++) {
          const a = this.map.get(this.key(cx, cy));
          if (a) for (let i = 0; i < a.length; i++) out.push(a[i]);
        }
      }
      return out;
    }
  }
  U.Grid = Grid;

  SR.U = U;
})(window.SR);
