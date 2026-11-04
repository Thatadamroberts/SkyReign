'use strict';
// The world far below: procedurally generated, chunk-cached countryside
// (meadows, forests, farmland, rivers, roads, villages) plus parallax clouds.
(function (SR) {
  const U = SR.U, TAU = Math.PI * 2;
  const CH = 512;        // chunk size in world units
  const RES = 4;         // world units per terrain pixel (softened by scaling)
  const MAX_CACHE = 48;
  const SEED = 1337;

  function sampleColor(wx, wy) {
    const h = U.fbm(wx / 900, wy / 900, SEED, 3);
    const m = U.fbm(wx / 650 + 50, wy / 650 - 20, SEED + 5, 3);
    const riv = Math.abs(U.fbm(wx / 1400, wy / 1400, SEED + 9, 3) - 0.5);
    const road = Math.abs(U.fbm(wx / 1100 - 30, wy / 1100 + 70, SEED + 13, 2) - 0.5);
    const detail = U.noise2(wx / 40, wy / 40, SEED + 3);
    let r, g, b;
    if (riv < 0.018) {
      const t = riv / 0.018;
      r = 52 + t * 30; g = 92 + t * 30; b = 128 + t * 10;
    } else if (riv < 0.026) {
      r = 140; g = 132; b = 96; // river bank
    } else if (h > 0.6) {
      const f = (h - 0.6) * 3;
      r = 40 - f * 12 + detail * 10; g = 78 - f * 18 + detail * 14; b = 38 - f * 8;
    } else if (m > 0.56 && h < 0.5) {
      const fx = Math.floor(wx / 150), fy = Math.floor(wy / 110);
      const fv = U.hash2(fx, fy, SEED);
      const ang = U.hash2(fx, fy, SEED + 1) < 0.5 ? 0 : 1;
      const stripe = Math.sin((ang ? wx : wy) / 5) > 0 ? 1 : 0.9;
      const pal = [[176, 154, 82], [132, 150, 70], [160, 120, 70], [110, 140, 60], [190, 170, 100]];
      const p = pal[Math.floor(fv * pal.length)];
      r = p[0] * stripe; g = p[1] * stripe; b = p[2] * stripe;
      const ex = Math.abs((wx / 150) - fx - 0.5) > 0.47 || Math.abs((wy / 110) - fy - 0.5) > 0.46;
      if (ex) { r = 84; g = 104; b = 52; }
    } else {
      r = 86 + detail * 20 + m * 20; g = 124 + detail * 24 - h * 20; b = 60 + detail * 8;
    }
    if (road < 0.006 && riv > 0.03) { r = 158; g = 136; b = 98; }
    return [r, g, b];
  }

  function gen(cx, cy) {
    const px = CH / RES;
    const small = U.makeCanvas(px, px);
    const sctx = small.getContext('2d');
    const img = sctx.createImageData(px, px);
    const d = img.data;
    const x0 = cx * CH, y0 = cy * CH;
    for (let j = 0; j < px; j++) {
      for (let i = 0; i < px; i++) {
        const [r, g, b] = sampleColor(x0 + i * RES + RES / 2, y0 + j * RES + RES / 2);
        const k = (j * px + i) * 4;
        d[k] = r; d[k + 1] = g; d[k + 2] = b; d[k + 3] = 255;
      }
    }
    sctx.putImageData(img, 0, 0);
    const cv = U.makeCanvas(CH, CH);
    const ctx = cv.getContext('2d');
    ctx.imageSmoothingEnabled = true;
    ctx.drawImage(small, 0, 0, CH, CH);

    // Trees
    const step = 18;
    for (let ty = 0; ty < CH; ty += step) {
      for (let tx = 0; tx < CH; tx += step) {
        const wx = x0 + tx, wy = y0 + ty;
        const gx = Math.floor(wx / step), gy = Math.floor(wy / step);
        const hv = U.hash2(gx, gy, SEED + 21);
        const h = U.fbm(wx / 900, wy / 900, SEED, 3);
        const riv = Math.abs(U.fbm(wx / 1400, wy / 1400, SEED + 9, 3) - 0.5);
        if (riv < 0.03) continue;
        const dens = h > 0.6 ? 0.75 : h > 0.53 ? 0.18 : 0.025;
        if (hv > dens) continue;
        const ox = tx + U.hash2(gx, gy, SEED + 22) * step, oy = ty + U.hash2(gx, gy, SEED + 23) * step;
        const s = 5 + U.hash2(gx, gy, SEED + 24) * 5;
        ctx.fillStyle = 'rgba(10,25,10,0.35)';
        ctx.beginPath(); ctx.ellipse(ox + 3, oy + 3, s, s * 0.8, 0, 0, TAU); ctx.fill();
        ctx.fillStyle = h > 0.6 ? '#21461f' : '#2f5c26';
        ctx.beginPath(); ctx.arc(ox, oy, s, 0, TAU); ctx.fill();
        ctx.fillStyle = h > 0.6 ? '#2f5f2a' : '#467c35';
        ctx.beginPath(); ctx.arc(ox - s * 0.25, oy - s * 0.25, s * 0.6, 0, TAU); ctx.fill();
      }
    }

    // Villages
    const vstep = 256;
    for (let vy = Math.floor(y0 / vstep); vy <= Math.floor((y0 + CH) / vstep); vy++) {
      for (let vx = Math.floor(x0 / vstep); vx <= Math.floor((x0 + CH) / vstep); vx++) {
        if (U.hash2(vx, vy, SEED + 40) > 0.16) continue;
        const cxw = vx * vstep + 128, cyw = vy * vstep + 128;
        const riv = Math.abs(U.fbm(cxw / 1400, cyw / 1400, SEED + 9, 3) - 0.5);
        if (riv < 0.04 || U.fbm(cxw / 900, cyw / 900, SEED, 3) > 0.6) continue;
        const n = 4 + Math.floor(U.hash2(vx, vy, SEED + 41) * 7);
        for (let k = 0; k < n; k++) {
          const hx = cxw + (U.hash2(vx * 31 + k, vy, SEED + 42) - 0.5) * 120 - x0;
          const hy = cyw + (U.hash2(vx, vy * 31 + k, SEED + 43) - 0.5) * 120 - y0;
          if (hx < -20 || hy < -20 || hx > CH + 20 || hy > CH + 20) continue;
          const w = 12 + U.hash2(k, vx, SEED + 44) * 10, hh = 9 + U.hash2(k, vy, SEED + 45) * 6;
          const rot = U.hash2(k, vx + vy, SEED + 46) < 0.5;
          const W = rot ? hh : w, H = rot ? w : hh;
          ctx.fillStyle = 'rgba(20,20,10,0.35)'; ctx.fillRect(hx - W / 2 + 3, hy - H / 2 + 3, W, H);
          ctx.fillStyle = '#d8ccb0'; ctx.fillRect(hx - W / 2, hy - H / 2, W, H);
          const roof = ['#9b3b2a', '#7a4a2a', '#8a5a3a', '#5a5f6a'][Math.floor(U.hash2(k, vx * vy, SEED + 47) * 4)];
          ctx.fillStyle = roof; ctx.fillRect(hx - W / 2 + 1, hy - H / 2 + 1, W - 2, H - 2);
          ctx.strokeStyle = 'rgba(0,0,0,0.35)'; ctx.lineWidth = 1;
          ctx.beginPath();
          if (rot) { ctx.moveTo(hx, hy - H / 2 + 1); ctx.lineTo(hx, hy + H / 2 - 1); } else { ctx.moveTo(hx - W / 2 + 1, hy); ctx.lineTo(hx + W / 2 - 1, hy); }
          ctx.stroke();
          ctx.fillStyle = 'rgba(255,255,255,0.12)';
          if (rot) ctx.fillRect(hx - W / 2 + 1, hy - H / 2 + 1, W / 2 - 1, H - 2); else ctx.fillRect(hx - W / 2 + 1, hy - H / 2 + 1, W - 2, H / 2 - 1);
        }
      }
    }

    // Rocks
    for (let k = 0; k < 10; k++) {
      const rx = U.hash2(cx * 7 + k, cy, SEED + 60) * CH, ry = U.hash2(cx, cy * 7 + k, SEED + 61) * CH;
      const s = 2 + U.hash2(k, cx + cy, SEED + 62) * 3;
      ctx.fillStyle = 'rgba(30,30,25,0.3)'; ctx.beginPath(); ctx.ellipse(rx + 1.5, ry + 1.5, s, s * 0.7, 0, 0, TAU); ctx.fill();
      ctx.fillStyle = '#9a968a'; ctx.beginPath(); ctx.ellipse(rx, ry, s, s * 0.7, 0, 0, TAU); ctx.fill();
    }

    // Altitude haze
    ctx.fillStyle = 'rgba(130,160,200,0.2)';
    ctx.fillRect(0, 0, CH, CH);
    return cv;
  }

  const Terrain = {
    cache: new Map(),
    queue: [],
    key: (cx, cy) => cx + ',' + cy,
    get(cx, cy, allowGen) {
      const k = this.key(cx, cy);
      let e = this.cache.get(k);
      if (e) { e.used = performance.now(); return e.cv; }
      if (!allowGen) return null;
      const cv = gen(cx, cy);
      this.cache.set(k, { cv, used: performance.now() });
      if (this.cache.size > MAX_CACHE) {
        let oldK = null, oldT = Infinity;
        for (const [kk, v] of this.cache) if (v.used < oldT) { oldT = v.used; oldK = kk; }
        this.cache.delete(oldK);
      }
      return cv;
    },
    // Draw all visible chunks. Generates at most `budget` new chunks per frame.
    draw(ctx, x0, y0, x1, y1, budget = 2) {
      const cx0 = Math.floor(x0 / CH), cx1 = Math.floor(x1 / CH);
      const cy0 = Math.floor(y0 / CH), cy1 = Math.floor(y1 / CH);
      for (let cy = cy0; cy <= cy1; cy++) {
        for (let cx = cx0; cx <= cx1; cx++) {
          let cv = this.get(cx, cy, false);
          if (!cv && budget > 0) { cv = this.get(cx, cy, true); budget--; }
          if (cv) ctx.drawImage(cv, cx * CH, cy * CH, CH + 0.6, CH + 0.6);
          else { ctx.fillStyle = '#5f8050'; ctx.fillRect(cx * CH, cy * CH, CH, CH); }
        }
      }
    },
    pregen(x, y, r) {
      for (let cy = Math.floor((y - r) / CH); cy <= Math.floor((y + r) / CH); cy++)
        for (let cx = Math.floor((x - r) / CH); cx <= Math.floor((x + r) / CH); cx++) this.get(cx, cy, true);
    },
  };

  // ---- Clouds
  const cloudSprites = [];
  function makeCloud(seed) {
    const w = 320, h = 180;
    const cv = U.makeCanvas(w, h);
    const ctx = cv.getContext('2d');
    const n = 9;
    for (let i = 0; i < n; i++) {
      const x = 60 + U.hash2(i, seed, 3) * (w - 120);
      const y = 70 + (U.hash2(seed, i, 4) - 0.5) * 50;
      const r = 30 + U.hash2(i, i + seed, 5) * 45;
      const g = ctx.createRadialGradient(x, y - r * 0.2, r * 0.1, x, y, r);
      g.addColorStop(0, 'rgba(255,255,255,0.95)');
      g.addColorStop(0.6, 'rgba(236,242,250,0.7)');
      g.addColorStop(1, 'rgba(200,215,235,0)');
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill();
    }
    return cv;
  }
  const Clouds = {
    layers: [],
    init() {
      for (let i = 0; i < 6; i++) cloudSprites.push(makeCloud(i + 1));
      const mk = (count, par, alpha, scale) => {
        const arr = [];
        for (let i = 0; i < count; i++) arr.push({ x: Math.random() * 3000, y: Math.random() * 3000, s: scale * (0.7 + Math.random() * 0.8), sp: cloudSprites[i % cloudSprites.length] });
        return { arr, par, alpha, wrap: 3000 };
      };
      this.layers = [mk(8, 1.25, 0.26, 1.6), mk(6, 1.7, 0.14, 2.6)];
    },
    // Screen-space draw. camX/camY are world camera centre; zoom is world->screen.
    draw(ctx, layer, camX, camY, w, h, zoom, time, alphaMul = 1) {
      const L = this.layers[layer];
      if (!L) return;
      ctx.globalAlpha = L.alpha * alphaMul;
      const wrap = L.wrap;
      for (const c of L.arr) {
        const cw = c.sp.width * c.s * zoom, chh = c.sp.height * c.s * zoom;
        let sx = ((c.x - camX * L.par * zoom - time * 12) % wrap + wrap) % wrap - (wrap - w) / 2 - cw / 2;
        let sy = ((c.y - camY * L.par * zoom - time * 4) % wrap + wrap) % wrap - (wrap - h) / 2 - chh / 2;
        if (sx > w || sy > h || sx + cw < 0 || sy + chh < 0) continue;
        ctx.drawImage(c.sp, sx, sy, cw, chh);
      }
      ctx.globalAlpha = 1;
    },
  };

  SR.Terrain = Terrain;
  SR.Clouds = Clouds;
})(window.SR);
