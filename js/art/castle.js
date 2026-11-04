'use strict';
// The floating castle. The static architecture is pre-rendered to an offscreen
// canvas whenever the castle's configuration changes (new towers, thicker walls,
// iron plating, chapel, sails, banners...). Weapons are drawn live on the mounts.
(function (SR) {
  const U = SR.U, TAU = Math.PI * 2;
  const S = 2; // pixels per world unit in the cached sprite

  function stoneFace(ctx, x, y, w, h, light, dark, seed, course = 6) {
    const g = ctx.createLinearGradient(x, y, x, y + h);
    g.addColorStop(0, light); g.addColorStop(1, dark);
    ctx.fillStyle = g; ctx.fillRect(x, y, w, h);
    // block shading
    let row = 0;
    for (let yy = y; yy < y + h - 0.5; yy += course, row++) {
      const bw = course * 2;
      for (let xx = x - (row % 2) * course; xx < x + w; xx += bw) {
        const v = U.hash2(Math.floor(xx * 3), Math.floor(yy * 3), seed);
        if (v < 0.35) {
          ctx.fillStyle = v < 0.15 ? 'rgba(0,0,0,0.10)' : 'rgba(255,255,255,0.06)';
          const x0 = Math.max(x, xx), x1 = Math.min(x + w, xx + bw);
          ctx.fillRect(x0, yy, x1 - x0, Math.min(course, y + h - yy));
        }
      }
    }
    ctx.strokeStyle = 'rgba(20,16,12,0.35)'; ctx.lineWidth = 0.5;
    row = 0;
    ctx.beginPath();
    for (let yy = y + course; yy < y + h; yy += course) { ctx.moveTo(x, yy); ctx.lineTo(x + w, yy); }
    for (let yy = y; yy < y + h - 0.5; yy += course, row++) {
      for (let xx = x + (row % 2 ? course : course * 2); xx < x + w; xx += course * 2) {
        ctx.moveTo(xx, yy); ctx.lineTo(xx, Math.min(y + h, yy + course));
      }
    }
    ctx.stroke();
  }

  function merlons(ctx, x0, x1, y, mw, mh, light, dark) {
    const n = Math.max(2, Math.round((x1 - x0) / (mw * 1.8)));
    const step = (x1 - x0 - mw) / (n - 1);
    for (let i = 0; i < n; i++) {
      const x = x0 + i * step;
      ctx.fillStyle = dark; ctx.fillRect(x, y - mh, mw, mh);
      ctx.fillStyle = light; ctx.fillRect(x, y - mh, mw, mh * 0.35);
      ctx.strokeStyle = 'rgba(20,16,12,0.5)'; ctx.lineWidth = 0.5; ctx.strokeRect(x, y - mh, mw, mh);
    }
  }

  function banner(ctx, x, y, h, color, trim) {
    ctx.strokeStyle = '#3b2a18'; ctx.lineWidth = 1.2;
    ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x, y - h); ctx.stroke();
    ctx.fillStyle = '#f0cf7a'; ctx.beginPath(); ctx.arc(x, y - h, 1.4, 0, TAU); ctx.fill();
    const fw = h * 0.42, fh = h * 0.5;
    ctx.fillStyle = color;
    ctx.beginPath(); ctx.moveTo(x, y - h + 2); ctx.quadraticCurveTo(x + fw * 0.6, y - h + 0, x + fw, y - h + 3);
    ctx.lineTo(x + fw * 0.8, y - h + 2 + fh * 0.5); ctx.lineTo(x + fw, y - h + 2 + fh);
    ctx.quadraticCurveTo(x + fw * 0.5, y - h + fh, x, y - h + 2 + fh); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = trim; ctx.lineWidth = 0.6; ctx.stroke();
    ctx.fillStyle = trim; ctx.beginPath(); ctx.arc(x + fw * 0.42, y - h + 2 + fh * 0.5, fh * 0.17, 0, TAU); ctx.fill();
  }

  // Cylindrical tower. Returns the mount point on top.
  function tower(ctx, cx, baseY, r, h, platform, seed, opts = {}) {
    // body
    const g = ctx.createLinearGradient(cx - r, 0, cx + r, 0);
    g.addColorStop(0, '#8d877b'); g.addColorStop(0.3, '#c4beb0'); g.addColorStop(0.65, '#9b9486'); g.addColorStop(1, '#5c574f');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(cx - r, baseY - h); ctx.lineTo(cx - r, baseY);
    ctx.ellipse(cx, baseY, r, r * 0.45, 0, Math.PI, 0, true);
    ctx.lineTo(cx + r, baseY - h); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = 'rgba(25,20,15,0.6)'; ctx.lineWidth = 0.8; ctx.stroke();
    // courses
    ctx.strokeStyle = 'rgba(25,20,15,0.28)'; ctx.lineWidth = 0.5;
    for (let yy = baseY - h + 5; yy < baseY; yy += 5) {
      ctx.beginPath(); ctx.ellipse(cx, yy, r, r * 0.45, 0, 0.15, Math.PI - 0.15); ctx.stroke();
    }
    if (opts.iron) {
      ctx.strokeStyle = '#2d2f36'; ctx.lineWidth = 1.6;
      for (const f of [0.3, 0.75]) { ctx.beginPath(); ctx.ellipse(cx, baseY - h * f, r, r * 0.45, 0, 0.05, Math.PI - 0.05); ctx.stroke(); }
    }
    // arrow slits / windows
    ctx.fillStyle = '#1b1510';
    ctx.fillRect(cx - 1, baseY - h * 0.62, 2, 5);
    if (h > r * 3) { ctx.fillStyle = '#ffcf6a'; ctx.fillRect(cx - 1.2, baseY - h * 0.35, 2.4, 3.5); }
    const top = baseY - h;
    if (platform) {
      ctx.fillStyle = '#7d766a';
      ctx.beginPath(); ctx.ellipse(cx, top, r * 1.14, r * 0.56, 0, 0, TAU); ctx.fill();
      ctx.fillStyle = '#a49c8c';
      ctx.beginPath(); ctx.ellipse(cx, top - 0.5, r * 0.92, r * 0.42, 0, 0, TAU); ctx.fill();
      ctx.strokeStyle = 'rgba(30,25,20,0.5)'; ctx.lineWidth = 0.6;
      ctx.beginPath(); ctx.ellipse(cx, top - 0.5, r * 0.92, r * 0.42, 0, 0, TAU); ctx.stroke();
      // back merlons
      for (let i = 0; i < 7; i++) {
        const a = Math.PI + (i + 0.5) / 7 * Math.PI;
        const mx = cx + Math.cos(a) * r * 1.05, my = top + Math.sin(a) * r * 0.5;
        ctx.fillStyle = '#9a9384'; ctx.fillRect(mx - 1.6, my - 3.4, 3.2, 3.4);
      }
      return { x: cx, y: top - 1, front: () => {
        for (let i = 0; i < 7; i++) {
          const a = (i + 0.5) / 7 * Math.PI;
          const mx = cx + Math.cos(a) * r * 1.07, my = top + Math.sin(a) * r * 0.52;
          ctx.fillStyle = '#b6af9f'; ctx.fillRect(mx - 1.8, my - 3.6, 3.6, 3.6);
          ctx.fillStyle = '#d1cabb'; ctx.fillRect(mx - 1.8, my - 3.6, 3.6, 1.1);
        }
      } };
    }
    // conical roof
    ctx.fillStyle = '#7d766a';
    ctx.beginPath(); ctx.ellipse(cx, top, r * 1.18, r * 0.55, 0, 0, TAU); ctx.fill();
    const rg = ctx.createLinearGradient(cx - r, 0, cx + r, 0);
    rg.addColorStop(0, '#2c4a7a'); rg.addColorStop(0.4, '#4d74b0'); rg.addColorStop(1, '#1d3254');
    ctx.fillStyle = rg;
    ctx.beginPath(); ctx.moveTo(cx - r * 1.2, top); ctx.lineTo(cx, top - r * 2.3); ctx.lineTo(cx + r * 1.2, top);
    ctx.ellipse(cx, top, r * 1.2, r * 0.5, 0, 0, Math.PI); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = 'rgba(10,20,40,0.6)'; ctx.lineWidth = 0.6; ctx.stroke();
    ctx.strokeStyle = 'rgba(255,255,255,0.15)';
    for (let i = 1; i < 4; i++) { ctx.beginPath(); ctx.moveTo(cx, top - r * 2.3); ctx.lineTo(cx - r * 1.2 + i * r * 0.6, top + r * 0.3); ctx.stroke(); }
    ctx.fillStyle = '#f0cf7a'; ctx.beginPath(); ctx.arc(cx, top - r * 2.35, 1.3, 0, TAU); ctx.fill();
    return { x: cx, y: top - r * 2.3, front: () => {} };
  }

  function build(cfg) {
    const R = cfg.R;
    const rx = R * 1.2, ry = R * 0.62, ct = R * 0.17;
    const sailSpan = cfg.speedTier > 0 ? R * (0.55 + 0.18 * Math.min(4, cfg.speedTier)) : 0;
    const halfW = rx + sailSpan + 12;
    const top = R * 1.95 + 20, bottom = R * 1.75 + 10;
    const W = halfW * 2, H = top + bottom;
    const canvas = U.makeCanvas(W * S, H * S);
    const ctx = canvas.getContext('2d');
    ctx.scale(S, S);
    ctx.translate(halfW, top);
    ctx.lineJoin = 'round';

    const wt = cfg.wallTier, at = cfg.armorTier;
    const a = R * 0.78, b = R * 0.36;
    const WH = R * (0.26 + 0.045 * wt);
    const th = R * 0.1;
    const tr = R * (0.18 + 0.008 * wt);
    const TH = R * (0.7 + 0.06 * wt);
    const smallTH = WH * 1.25, smallR = tr * 0.72;

    // ---- sails / wings (behind everything)
    if (cfg.speedTier > 0) {
      for (const side of [-1, 1]) {
        const mx = side * rx * 0.88, my = -R * 0.02;
        const layers = cfg.speedTier >= 3 ? 2 : 1;
        for (let l = layers - 1; l >= 0; l--) {
          const span = sailSpan * (1 - l * 0.25);
          const tipX = mx + side * span, tipY = my - R * (0.62 - l * 0.3);
          ctx.strokeStyle = '#4a2e18'; ctx.lineWidth = 2;
          ctx.beginPath(); ctx.moveTo(mx, my); ctx.lineTo(tipX, tipY); ctx.stroke();
          ctx.beginPath(); ctx.moveTo(mx, my + R * 0.1); ctx.lineTo(tipX - side * span * 0.15, my + R * 0.35); ctx.stroke();
          const sg = ctx.createLinearGradient(mx, 0, tipX, 0);
          sg.addColorStop(0, '#f2e8cf'); sg.addColorStop(1, '#c8b88f');
          ctx.fillStyle = sg;
          ctx.beginPath(); ctx.moveTo(mx + side * 2, my - 1);
          ctx.quadraticCurveTo(mx + side * span * 0.55, tipY - R * 0.05, tipX, tipY + 2);
          ctx.quadraticCurveTo(tipX - side * span * 0.05, my + R * 0.1, tipX - side * span * 0.15, my + R * 0.33);
          ctx.quadraticCurveTo(mx + side * span * 0.4, my + R * 0.2, mx + side * 2, my + R * 0.1);
          ctx.closePath(); ctx.fill();
          ctx.strokeStyle = '#a8862e'; ctx.lineWidth = 1; ctx.stroke();
          ctx.strokeStyle = 'rgba(46,90,168,0.85)'; ctx.lineWidth = 3;
          ctx.beginPath(); ctx.moveTo(mx + side * span * 0.35, my - R * 0.2 + l * 4); ctx.lineTo(mx + side * span * 0.4, my + R * 0.18); ctx.stroke();
        }
      }
    }

    // ---- underside rock
    const edgeY = (x) => ct + ry * Math.sqrt(Math.max(0, 1 - (x / rx) * (x / rx)));
    const N = 22;
    ctx.beginPath();
    ctx.moveTo(-rx, ct);
    const tips = [];
    for (let i = 0; i <= N; i++) {
      const u = i / N, x = -rx + u * 2 * rx;
      const bell = Math.pow(Math.sin(Math.PI * u), 1.2);
      let d = R * (0.12 + 1.0 * bell) + (U.hash2(i, 3, 77) - 0.5) * R * 0.22;
      if (i % 3 === 1) { d += R * 0.18 * bell; tips.push({ x, y: edgeY(x) + d }); }
      ctx.lineTo(x, edgeY(x) + d);
    }
    ctx.lineTo(rx, ct);
    ctx.closePath();
    const rg = ctx.createLinearGradient(0, 0, 0, R * 1.7);
    rg.addColorStop(0, '#7b6a56'); rg.addColorStop(0.45, '#4f4235'); rg.addColorStop(1, '#231c16');
    ctx.fillStyle = rg; ctx.fill();
    ctx.strokeStyle = '#1b1510'; ctx.lineWidth = 1; ctx.stroke();
    // strata
    ctx.save(); ctx.clip();
    ctx.strokeStyle = 'rgba(20,14,10,0.35)'; ctx.lineWidth = 1.2;
    for (let k = 1; k < 5; k++) {
      ctx.beginPath();
      for (let i = 0; i <= 20; i++) {
        const x = -rx + i / 20 * 2 * rx;
        const y = edgeY(x) + k * R * 0.2 + Math.sin(i * 1.3 + k) * 2.5;
        i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
      }
      ctx.stroke();
    }
    ctx.fillStyle = 'rgba(255,240,210,0.07)';
    for (let i = 0; i < 26; i++) {
      const x = (U.hash2(i, 1, 9) - 0.5) * rx * 1.8, y = edgeY(x) + U.hash2(i, 2, 9) * R * 0.9;
      ctx.fillRect(x, y, 3 + U.hash2(i, 5, 9) * 6, 1.2);
    }
    // hanging roots
    ctx.strokeStyle = 'rgba(70,52,30,0.8)'; ctx.lineWidth = 0.8;
    for (let i = 0; i < 10; i++) {
      const x = (U.hash2(i, 7, 3) - 0.5) * rx * 1.8, y = edgeY(x) + 1;
      ctx.beginPath(); ctx.moveTo(x, y); ctx.quadraticCurveTo(x + 3, y + 6, x - 1, y + 8 + U.hash2(i, 8, 3) * 10); ctx.stroke();
    }
    ctx.restore();
    // levitation crystals
    tips.forEach((t, i) => {
      if (i % 2) return;
      const h = R * (0.18 + U.hash2(i, 4, 5) * 0.12);
      ctx.save();
      ctx.shadowColor = '#6fd0ff'; ctx.shadowBlur = 8;
      const cg = ctx.createLinearGradient(t.x - 4, t.y - h, t.x + 4, t.y + h);
      cg.addColorStop(0, '#e6f8ff'); cg.addColorStop(0.5, '#6cc6ff'); cg.addColorStop(1, '#2546b5');
      ctx.fillStyle = cg;
      ctx.beginPath(); ctx.moveTo(t.x, t.y - h * 0.6); ctx.lineTo(t.x + 4, t.y); ctx.lineTo(t.x, t.y + h); ctx.lineTo(t.x - 4, t.y); ctx.closePath(); ctx.fill();
      ctx.restore();
    });

    // ---- cliff band & grassy top
    ctx.fillStyle = '#6a5d4c';
    ctx.beginPath(); ctx.ellipse(0, ct, rx, ry, 0, 0, Math.PI); ctx.lineTo(-rx, 0); ctx.ellipse(0, 0, rx, ry, 0, Math.PI, 0, true); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#5b4f40';
    ctx.beginPath(); ctx.ellipse(0, ct, rx, ry, 0, 0, Math.PI); ctx.lineTo(-rx, ct * 0.5); ctx.ellipse(0, ct * 0.5, rx, ry, 0, Math.PI, 0, true); ctx.closePath(); ctx.fill();
    const gg = ctx.createRadialGradient(-R * 0.2, -R * 0.2, R * 0.1, 0, 0, rx);
    gg.addColorStop(0, '#79a556'); gg.addColorStop(0.7, '#5d8a40'); gg.addColorStop(1, '#3f6a2b');
    ctx.fillStyle = gg;
    ctx.beginPath(); ctx.ellipse(0, 0, rx, ry, 0, 0, TAU); ctx.fill();
    ctx.strokeStyle = '#2f4e20'; ctx.lineWidth = 1; ctx.stroke();
    // grass tufts
    for (let i = 0; i < 40; i++) {
      const ang = U.hash2(i, 11, 2) * TAU, rr = Math.sqrt(U.hash2(i, 12, 2));
      const x = Math.cos(ang) * rx * rr * 0.95, y = Math.sin(ang) * ry * rr * 0.95;
      ctx.fillStyle = U.hash2(i, 13, 2) < 0.5 ? 'rgba(140,190,90,0.5)' : 'rgba(40,70,25,0.4)';
      ctx.beginPath(); ctx.ellipse(x, y, 2.5, 1.2, 0, 0, TAU); ctx.fill();
    }
    // bushes on the front lip
    for (let i = 0; i < 9; i++) {
      const x = -rx * 0.8 + i / 8 * rx * 1.6 + (U.hash2(i, 4, 4) - 0.5) * 6;
      const y = ry * Math.sqrt(Math.max(0, 1 - (x / rx) ** 2)) * 0.82;
      if (y < b + 4) continue;
      ctx.fillStyle = '#2f5a24'; ctx.beginPath(); ctx.arc(x, y, 3.2, 0, TAU); ctx.fill();
      ctx.fillStyle = '#4f8a39'; ctx.beginPath(); ctx.arc(x - 0.8, y - 0.8, 2.2, 0, TAU); ctx.fill();
    }
    // rim spikes (armour/thorns)
    if (cfg.thorns || at >= 3) {
      for (let i = 0; i <= 16; i++) {
        const ang = i / 16 * Math.PI;
        const x = Math.cos(ang) * rx, y = ct + Math.sin(ang) * ry;
        const nx = Math.cos(ang), ny = Math.sin(ang) * 0.6;
        ctx.fillStyle = cfg.thorns ? '#d6dbe2' : '#8b919c';
        ctx.beginPath(); ctx.moveTo(x - ny * 2.5, y + nx * 1.5); ctx.lineTo(x + nx * 8, y + ny * 8 + 2); ctx.lineTo(x + ny * 2.5, y - nx * 1.5); ctx.closePath(); ctx.fill();
        ctx.strokeStyle = '#2b2f38'; ctx.lineWidth = 0.5; ctx.stroke();
      }
    }

    // ---- courtyard
    ctx.fillStyle = '#958c79';
    ctx.fillRect(-a, -b, a * 2, b * 2);
    ctx.fillStyle = 'rgba(60,50,40,0.25)';
    for (let i = 0; i < 70; i++) {
      const x = -a + U.hash2(i, 1, 31) * a * 2, y = -b + U.hash2(i, 2, 31) * b * 2;
      ctx.fillRect(x, y, 2.2, 1.3);
    }

    const mounts = [];
    const fronts = [];
    const slotUnlocked = (i) => i < cfg.slots;
    const iron = at >= 2;

    // ---- back towers (slots 3,4)
    const backSlots = [[3, -a, -b], [4, a, -b]];
    for (const [si, x, y] of backSlots) {
      const big = slotUnlocked(si);
      const m = tower(ctx, x, y, big ? tr : smallR, big ? TH * 0.92 : smallTH, big, si, { iron });
      if (big) { mounts[si] = { x: m.x, y: m.y }; fronts.push(m.front); }
    }
    fronts.forEach((f) => f()); fronts.length = 0;

    // ---- back wall (inner face visible)
    stoneFace(ctx, -a, -b - WH, a * 2, WH, '#8c8577', '#6c665b', 1, 5);
    merlons(ctx, -a, a, -b - WH, 4, 3.5, '#b1aa9a', '#8f887a');

    // ---- side walls (top surface)
    for (const side of [-1, 1]) {
      const x = side * a - th / 2;
      const sg = ctx.createLinearGradient(x, 0, x + th, 0);
      sg.addColorStop(0, side < 0 ? '#b7b0a1' : '#9a9385'); sg.addColorStop(1, side < 0 ? '#9a9385' : '#7a7468');
      ctx.fillStyle = sg; ctx.fillRect(x, -b - WH, th, b * 2);
      ctx.fillStyle = side < 0 ? '#6f695d' : '#5a554c';
      ctx.fillRect(side < 0 ? x : x + th - 1.2, -b - WH, 1.2, b * 2);
      for (let yy = -b - WH + 3; yy < b - WH; yy += 7) {
        ctx.fillStyle = '#c4bdad'; ctx.fillRect(side < 0 ? x : x + th - 3, yy, 3, 3);
      }
    }

    // ---- chapel (regen) and lodestone spire (pickup) behind the keep
    if (cfg.regenTier > 0) {
      const cx = -a * 0.5, cy = -b * 0.35, w = R * 0.32, h = R * 0.26;
      stoneFace(ctx, cx - w / 2, cy - h, w, h, '#d8d1bf', '#a49b86', 4, 4);
      ctx.fillStyle = '#7a2a22';
      ctx.beginPath(); ctx.moveTo(cx - w / 2 - 2, cy - h); ctx.lineTo(cx, cy - h - R * 0.2); ctx.lineTo(cx + w / 2 + 2, cy - h); ctx.closePath(); ctx.fill();
      ctx.save(); ctx.shadowColor = '#ffd76a'; ctx.shadowBlur = 6;
      ctx.fillStyle = '#ffe28a'; ctx.beginPath(); ctx.arc(cx, cy - h * 0.55, w * 0.16, 0, TAU); ctx.fill(); ctx.restore();
      ctx.strokeStyle = '#8a6326'; ctx.lineWidth = 0.6; ctx.beginPath(); ctx.arc(cx, cy - h * 0.55, w * 0.16, 0, TAU); ctx.stroke();
      // spire
      const sh = R * (0.25 + 0.12 * cfg.regenTier);
      ctx.fillStyle = '#5a1f1a'; ctx.beginPath(); ctx.moveTo(cx - 2.5, cy - h - R * 0.16); ctx.lineTo(cx, cy - h - R * 0.16 - sh); ctx.lineTo(cx + 2.5, cy - h - R * 0.16); ctx.fill();
      ctx.fillStyle = '#f0cf7a'; ctx.beginPath(); ctx.arc(cx, cy - h - R * 0.16 - sh, 1.8, 0, TAU); ctx.fill();
    }
    if (cfg.magnetTier > 0) {
      const cx = a * 0.5, cy = -b * 0.35, h = R * (0.5 + 0.12 * Math.min(4, cfg.magnetTier));
      ctx.fillStyle = '#3d3a45';
      ctx.beginPath(); ctx.moveTo(cx - 4, cy); ctx.lineTo(cx - 2, cy - h); ctx.lineTo(cx + 2, cy - h); ctx.lineTo(cx + 4, cy); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#56525f'; ctx.fillRect(cx - 2, cy - h, 1.4, h);
      ctx.save(); ctx.shadowColor = '#c78bff'; ctx.shadowBlur = 10;
      ctx.fillStyle = '#d6a8ff';
      ctx.beginPath(); ctx.moveTo(cx, cy - h - 10); ctx.lineTo(cx + 4, cy - h - 3); ctx.lineTo(cx, cy - h + 2); ctx.lineTo(cx - 4, cy - h - 3); ctx.closePath(); ctx.fill();
      ctx.restore();
    }

    // ---- keep (slot 0)
    const kx = 0, ky = -b * 0.15;
    const kw = R * (0.56 + 0.03 * wt), kd = R * 0.3, KH = R * (0.66 + 0.09 * wt);
    stoneFace(ctx, kx - kw / 2, ky - KH, kw, KH, '#cdc6b6', '#8f8879', 2, 5);
    const ks = ctx.createLinearGradient(kx - kw / 2, 0, kx + kw / 2, 0);
    ks.addColorStop(0, 'rgba(255,255,255,0.08)'); ks.addColorStop(0.6, 'rgba(0,0,0,0)'); ks.addColorStop(1, 'rgba(0,0,0,0.25)');
    ctx.fillStyle = ks; ctx.fillRect(kx - kw / 2, ky - KH, kw, KH);
    ctx.strokeStyle = 'rgba(20,16,12,0.6)'; ctx.lineWidth = 0.8; ctx.strokeRect(kx - kw / 2, ky - KH, kw, KH);
    // windows
    const rows = 1 + Math.min(2, Math.floor(wt / 2));
    for (let r = 0; r < rows; r++) {
      const wy = ky - KH * (0.4 + r * 0.22);
      for (const wx of [-kw * 0.25, 0, kw * 0.25]) {
        ctx.fillStyle = '#20180f';
        ctx.beginPath(); ctx.moveTo(kx + wx - 2, wy + 4); ctx.lineTo(kx + wx - 2, wy); ctx.arc(kx + wx, wy, 2, Math.PI, 0); ctx.lineTo(kx + wx + 2, wy + 4); ctx.fill();
        ctx.fillStyle = 'rgba(255,190,90,0.85)'; ctx.fillRect(kx + wx - 1.1, wy - 0.5, 2.2, 3.8);
      }
    }
    if (iron) {
      ctx.fillStyle = '#34363e';
      ctx.fillRect(kx - kw / 2, ky - KH * 0.18, kw, 2); ctx.fillRect(kx - kw / 2, ky - KH * 0.86, kw, 2);
      ctx.fillStyle = '#9aa2ae';
      for (let x = kx - kw / 2 + 3; x < kx + kw / 2; x += 6) { ctx.fillRect(x, ky - KH * 0.18 + 0.5, 1, 1); ctx.fillRect(x, ky - KH * 0.86 + 0.5, 1, 1); }
    }
    // keep roof
    const kt = ky - KH;
    ctx.fillStyle = '#7d766a'; ctx.fillRect(kx - kw / 2, kt - kd, kw, kd);
    ctx.fillStyle = '#a39b8b'; ctx.fillRect(kx - kw / 2 + 3, kt - kd + 2.5, kw - 6, kd - 4);
    merlons(ctx, kx - kw / 2, kx + kw / 2, kt - kd, 3.5, 3.5, '#b8b1a1', '#958e80');
    mounts[0] = { x: kx, y: kt - kd / 2 - 1 };
    const keepFront = () => merlons(ctx, kx - kw / 2, kx + kw / 2, kt + 0.5, 3.8, 4, '#d6cfbf', '#b0a999');
    keepFront();
    // banners on keep
    if (cfg.level >= 3) banner(ctx, kx - kw / 2 + 1.5, kt - kd - 3, R * 0.5, '#2e5aa8', '#f0cf7a');
    if (cfg.level >= 8) banner(ctx, kx + kw / 2 - 1.5, kt - kd - 3, R * 0.5, '#2e5aa8', '#f0cf7a');

    // ---- front wall with gate
    const fy = b - WH;
    stoneFace(ctx, -a, fy, a * 2, WH, '#cec7b7', '#8d8677', 3, 5);
    ctx.strokeStyle = 'rgba(20,16,12,0.7)'; ctx.lineWidth = 0.8; ctx.strokeRect(-a, fy, a * 2, WH);
    if (at >= 1) {
      ctx.fillStyle = '#33353d';
      ctx.fillRect(-a, fy + WH * 0.25, a * 2, 2); ctx.fillRect(-a, fy + WH * 0.72, a * 2, 2);
      ctx.fillStyle = '#a8b0bd';
      for (let x = -a + 2; x < a; x += 5) { ctx.fillRect(x, fy + WH * 0.25 + 0.5, 1, 1); ctx.fillRect(x, fy + WH * 0.72 + 0.5, 1, 1); }
    }
    if (at >= 4) { ctx.fillStyle = '#d4a843'; ctx.fillRect(-a, fy - 0.5, a * 2, 1.2); }
    // gate
    const gw = R * 0.22, gh = WH * 0.8;
    ctx.fillStyle = '#1a130c';
    ctx.beginPath(); ctx.moveTo(-gw / 2, b); ctx.lineTo(-gw / 2, b - gh + gw / 2); ctx.arc(0, b - gh + gw / 2, gw / 2, Math.PI, 0); ctx.lineTo(gw / 2, b); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = '#5b5f69'; ctx.lineWidth = 0.7;
    ctx.beginPath();
    for (let x = -gw / 2 + 2; x < gw / 2; x += 3) { ctx.moveTo(x, b - gh + 2); ctx.lineTo(x, b); }
    for (let y = b - gh + 4; y < b; y += 3) { ctx.moveTo(-gw / 2, y); ctx.lineTo(gw / 2, y); }
    ctx.stroke();
    ctx.strokeStyle = '#8f8879'; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.arc(0, b - gh + gw / 2, gw / 2 + 1, Math.PI, 0); ctx.stroke();
    merlons(ctx, -a, a, fy + 0.5, 4.2, 4.5, '#e0d9c9', '#b8b1a1');
    // shields hung on the wall at higher armour tiers
    if (at >= 3) {
      for (const x of [-a * 0.55, a * 0.55]) {
        ctx.fillStyle = '#2e5aa8'; ctx.beginPath(); ctx.moveTo(x - 3.5, fy + 3); ctx.lineTo(x + 3.5, fy + 3); ctx.lineTo(x + 3.5, fy + 7); ctx.lineTo(x, fy + 10); ctx.lineTo(x - 3.5, fy + 7); ctx.closePath(); ctx.fill();
        ctx.strokeStyle = '#f0cf7a'; ctx.lineWidth = 0.8; ctx.stroke();
      }
    }

    // ---- front towers (slots 1,2)
    const frontSlots = [[1, -a, b], [2, a, b]];
    for (const [si, x, y] of frontSlots) {
      const big = slotUnlocked(si);
      const m = tower(ctx, x, y, big ? tr : smallR, big ? TH : smallTH, big, si, { iron });
      if (big) { mounts[si] = { x: m.x, y: m.y }; m.front(); }
      if (cfg.level >= 15 && big) banner(ctx, x + (x < 0 ? -tr * 0.8 : tr * 0.8), y - TH, R * 0.4, '#8b1f2a', '#f0cf7a');
    }

    // tinted copy for damage flash
    const flash = U.makeCanvas(canvas.width, canvas.height);
    const fctx = flash.getContext('2d');
    fctx.drawImage(canvas, 0, 0);
    fctx.globalCompositeOperation = 'source-atop';
    fctx.fillStyle = 'rgba(255,70,50,0.75)';
    fctx.fillRect(0, 0, flash.width, flash.height);

    return {
      canvas, flash, S, W, H, ox: halfW, oy: top, mounts, R, rx, ry,
      topY: -Math.max(KH + kd, TH) - R * 0.5,
      bottomY: R * 1.4,
    };
  }

  SR.CastleArt = { build, S };
})(window.SR);
