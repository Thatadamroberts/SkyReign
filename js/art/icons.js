'use strict';
// UI icons, drawn procedurally once and cached as data URLs.
(function (SR) {
  const TAU = Math.PI * 2;
  const GOLD = '#f0cf7a', GOLD_D = '#a87b2c', STEEL = '#c9d2de', STEEL_D = '#6d7686';

  function poly(ctx, pts, fill, stroke, lw = 2) {
    ctx.beginPath(); ctx.moveTo(pts[0], pts[1]);
    for (let i = 2; i < pts.length; i += 2) ctx.lineTo(pts[i], pts[i + 1]);
    ctx.closePath();
    if (fill) { ctx.fillStyle = fill; ctx.fill(); }
    if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = lw; ctx.stroke(); }
  }
  function circ(ctx, x, y, r, fill, stroke, lw = 2) {
    ctx.beginPath(); ctx.arc(x, y, r, 0, TAU);
    if (fill) { ctx.fillStyle = fill; ctx.fill(); }
    if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = lw; ctx.stroke(); }
  }
  function grad(ctx, a, b) { const g = ctx.createLinearGradient(0, 8, 0, 56); g.addColorStop(0, a); g.addColorStop(1, b); return g; }

  const I = {
    sword(c) {
      c.translate(32, 32); c.rotate(-Math.PI / 4);
      poly(c, [0, -26, 5, -18, 5, 10, -5, 10, -5, -18], grad(c, '#f4f7fb', '#8c97a8'), '#2b2f38');
      c.fillStyle = GOLD; c.fillRect(-12, 10, 24, 5); c.strokeStyle = '#3a2a10'; c.strokeRect(-12, 10, 24, 5);
      c.fillStyle = '#6b3d1e'; c.fillRect(-3, 15, 6, 10); circ(c, 0, 27, 4, GOLD, '#3a2a10');
    },
    gear(c) {
      c.translate(32, 32);
      c.fillStyle = grad(c, '#e2c27a', '#8a6326');
      c.beginPath();
      for (let i = 0; i < 16; i++) { const a = i / 16 * TAU, r = i % 2 ? 18 : 25; c.lineTo(Math.cos(a) * r, Math.sin(a) * r); }
      c.closePath(); c.fill(); c.strokeStyle = '#3a2a10'; c.lineWidth = 2; c.stroke();
      circ(c, 0, 0, 8, '#2a1d10', '#3a2a10');
    },
    eye(c) {
      c.translate(32, 32);
      c.beginPath(); c.moveTo(-26, 0); c.quadraticCurveTo(0, -24, 26, 0); c.quadraticCurveTo(0, 24, -26, 0); c.closePath();
      c.fillStyle = '#f1ead6'; c.fill(); c.strokeStyle = '#3a2a10'; c.lineWidth = 2.5; c.stroke();
      circ(c, 0, 0, 10, '#3e8acc', '#14324d'); circ(c, 0, 0, 4.5, '#0b0b10'); circ(c, -3, -3, 2, '#fff');
    },
    wall(c) {
      c.fillStyle = grad(c, '#b8b2a5', '#6b665c'); c.fillRect(10, 20, 44, 34);
      for (let i = 0; i < 5; i++) c.fillRect(10 + i * 9.5, 12, 6, 9);
      c.strokeStyle = '#2f2c27'; c.lineWidth = 1.5;
      for (let y = 28; y < 54; y += 8) { c.beginPath(); c.moveTo(10, y); c.lineTo(54, y); c.stroke(); }
      for (let y = 20, r = 0; y < 54; y += 8, r++) for (let x = 14 + (r % 2) * 6; x < 54; x += 12) { c.beginPath(); c.moveTo(x, y); c.lineTo(x, y + 8); c.stroke(); }
      c.strokeRect(10, 20, 44, 34);
    },
    shield(c) {
      c.translate(32, 32);
      c.beginPath(); c.moveTo(0, -26); c.lineTo(22, -18); c.quadraticCurveTo(22, 12, 0, 27); c.quadraticCurveTo(-22, 12, -22, -18); c.closePath();
      c.fillStyle = grad(c, '#7d8796', '#3a414d'); c.fill(); c.strokeStyle = GOLD; c.lineWidth = 3; c.stroke();
      c.fillStyle = GOLD; c.fillRect(-2.5, -18, 5, 36); c.fillRect(-14, -6, 28, 5);
    },
    wind(c) {
      c.strokeStyle = '#d7ecff'; c.lineWidth = 4; c.lineCap = 'round';
      c.beginPath(); c.moveTo(8, 22); c.lineTo(40, 22); c.arc(40, 16, 6, Math.PI / 2, -Math.PI * 0.8, true); c.stroke();
      c.beginPath(); c.moveTo(8, 34); c.lineTo(48, 34); c.arc(48, 27, 7, Math.PI / 2, -Math.PI * 0.8, true); c.stroke();
      c.beginPath(); c.moveTo(14, 46); c.lineTo(38, 46); c.arc(38, 52, 6, -Math.PI / 2, Math.PI * 0.8); c.stroke();
    },
    coin(c) {
      circ(c, 34, 36, 18, '#8a6326'); circ(c, 30, 30, 18, grad(c, '#ffe9a6', '#c8932e'), '#6b4a14', 2.5);
      circ(c, 30, 30, 12, null, '#a87b2c', 2);
      c.fillStyle = '#8a6326'; c.font = 'bold 16px Georgia'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('S', 30, 31);
    },
    book(c) {
      c.fillStyle = '#6b1f1f'; c.fillRect(12, 12, 38, 42); c.fillStyle = '#efe4c8'; c.fillRect(16, 14, 36, 38);
      c.fillStyle = '#8b2a2a'; c.fillRect(12, 12, 34, 40); c.strokeStyle = GOLD; c.lineWidth = 2; c.strokeRect(16, 16, 26, 32);
      circ(c, 29, 32, 6, GOLD);
    },
    magnet(c) {
      c.translate(32, 34); c.lineWidth = 11; c.lineCap = 'butt';
      c.strokeStyle = '#c0392b'; c.beginPath(); c.arc(0, 0, 15, Math.PI, 0); c.stroke();
      c.beginPath(); c.moveTo(-15, 0); c.lineTo(-15, 14); c.moveTo(15, 0); c.lineTo(15, 14); c.stroke();
      c.strokeStyle = STEEL; c.beginPath(); c.moveTo(-15, 12); c.lineTo(-15, 20); c.moveTo(15, 12); c.lineTo(15, 20); c.stroke();
    },
    crit(c) {
      c.translate(32, 32);
      circ(c, 0, 0, 22, null, '#ff5a3c', 3); circ(c, 0, 0, 12, null, '#ff5a3c', 3); circ(c, 0, 0, 4, '#ff5a3c');
      c.strokeStyle = '#ffd7a0'; c.lineWidth = 3;
      c.beginPath(); c.moveTo(0, -28); c.lineTo(0, -16); c.moveTo(0, 28); c.lineTo(0, 16); c.moveTo(-28, 0); c.lineTo(-16, 0); c.moveTo(28, 0); c.lineTo(16, 0); c.stroke();
    },
    skull(c) {
      c.translate(32, 30);
      c.beginPath(); c.arc(0, -2, 19, Math.PI * 0.85, Math.PI * 0.15); c.lineTo(10, 18); c.lineTo(-10, 18); c.closePath();
      c.fillStyle = grad(c, '#f4eedb', '#b8ad8e'); c.fill(); c.strokeStyle = '#3a2a10'; c.lineWidth = 2; c.stroke();
      circ(c, -7, 2, 5, '#1d1410'); circ(c, 7, 2, 5, '#1d1410');
      poly(c, [0, 8, -3, 13, 3, 13], '#1d1410');
    },
    heart(c) {
      c.translate(32, 34);
      c.beginPath(); c.moveTo(0, 20); c.bezierCurveTo(-30, 0, -20, -26, 0, -10); c.bezierCurveTo(20, -26, 30, 0, 0, 20); c.closePath();
      c.fillStyle = grad(c, '#ff6b6b', '#9b1c1c'); c.fill(); c.strokeStyle = '#4a0c0c'; c.lineWidth = 2; c.stroke();
      circ(c, -9, -7, 3.5, 'rgba(255,255,255,0.6)');
    },
    plus(c) {
      c.translate(32, 32);
      circ(c, 0, 0, 24, grad(c, '#6fdc8c', '#1f7a3a'), '#0f3a1c');
      c.fillStyle = '#f5fff6'; c.fillRect(-4.5, -14, 9, 28); c.fillRect(-14, -4.5, 28, 9);
    },
    chest(c) {
      c.fillStyle = '#6b4423'; c.fillRect(10, 28, 44, 26);
      c.beginPath(); c.moveTo(10, 28); c.quadraticCurveTo(32, 6, 54, 28); c.closePath(); c.fillStyle = '#80522c'; c.fill();
      c.strokeStyle = '#2a1a0e'; c.lineWidth = 2; c.strokeRect(10, 28, 44, 26);
      c.fillStyle = GOLD; c.fillRect(10, 26, 44, 4); c.fillRect(28, 26, 8, 12); c.fillRect(16, 28, 3, 26); c.fillRect(45, 28, 3, 26);
      circ(c, 32, 22, 3, '#ffe9a6');
    },
    spikes(c) {
      c.fillStyle = grad(c, '#9b958a', '#5b564e'); c.fillRect(8, 40, 48, 14);
      for (let i = 0; i < 5; i++) poly(c, [10 + i * 9.5, 40, 14.5 + i * 9.5, 12, 19 + i * 9.5, 40], grad(c, '#eef2f6', '#7d8796'), '#2b2f38', 1.5);
    },
    arrows(c) {
      c.lineCap = 'round';
      for (const [dx, a] of [[-12, -0.3], [0, 0], [12, 0.3]]) {
        c.save(); c.translate(32 + dx, 34); c.rotate(a);
        c.strokeStyle = '#d9c39a'; c.lineWidth = 3; c.beginPath(); c.moveTo(0, 20); c.lineTo(0, -16); c.stroke();
        poly(c, [0, -26, -6, -14, 6, -14], STEEL, '#2b2f38', 1.5);
        poly(c, [0, 14, -5, 22, 0, 19, 5, 22], '#c0392b');
        c.restore();
      }
    },
    drop(c) {
      c.translate(32, 32);
      c.beginPath(); c.moveTo(0, -26); c.bezierCurveTo(10, -10, 20, 2, 18, 10); c.arc(0, 8, 18, 0.1, Math.PI - 0.1); c.bezierCurveTo(-20, 2, -10, -10, 0, -26);
      c.fillStyle = grad(c, '#ff4d6a', '#7a0c1e'); c.fill(); c.strokeStyle = '#3d0610'; c.lineWidth = 2; c.stroke();
      c.strokeStyle = GOLD; c.lineWidth = 2; c.beginPath(); c.moveTo(-6, 4); c.lineTo(0, -6); c.lineTo(6, 4); c.lineTo(0, 14); c.closePath(); c.stroke();
    },
    bomb(c) {
      circ(c, 30, 36, 18, grad(c, '#55555f', '#121216'), '#000');
      circ(c, 24, 30, 5, 'rgba(255,255,255,0.35)');
      c.strokeStyle = '#8a6326'; c.lineWidth = 3; c.beginPath(); c.moveTo(42, 22); c.quadraticCurveTo(48, 12, 54, 12); c.stroke();
      circ(c, 55, 11, 5, '#ffcf4a'); circ(c, 55, 11, 2.5, '#fff6c9');
    },
    star(c) {
      c.translate(32, 32);
      c.beginPath();
      for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i / 10 * TAU, r = i % 2 ? 11 : 26; c.lineTo(Math.cos(a) * r, Math.sin(a) * r); }
      c.closePath(); c.fillStyle = grad(c, '#e9c2ff', '#7b2fd0'); c.fill(); c.strokeStyle = '#f8ecff'; c.lineWidth = 2; c.stroke();
    },
    phoenix(c) {
      c.translate(32, 34);
      c.fillStyle = grad(c, '#ffe08a', '#e2431c');
      c.beginPath(); c.moveTo(0, -24); c.quadraticCurveTo(8, -8, 28, -16); c.quadraticCurveTo(18, 4, 6, 6); c.lineTo(10, 24); c.lineTo(0, 14);
      c.lineTo(-10, 24); c.lineTo(-6, 6); c.quadraticCurveTo(-18, 4, -28, -16); c.quadraticCurveTo(-8, -8, 0, -24); c.closePath(); c.fill();
      c.strokeStyle = '#6b1a06'; c.lineWidth = 1.5; c.stroke();
    },
    tower(c) {
      c.fillStyle = grad(c, '#c5bfb2', '#6b665c'); c.fillRect(18, 18, 28, 38);
      for (let i = 0; i < 4; i++) c.fillRect(16 + i * 9, 10, 6, 9);
      c.fillRect(14, 16, 36, 5);
      c.fillStyle = '#1d1712'; c.beginPath(); c.moveTo(27, 56); c.lineTo(27, 44); c.arc(32, 44, 5, Math.PI, 0); c.lineTo(37, 56); c.fill();
      c.fillStyle = '#ffcf6a'; c.fillRect(30, 26, 4, 7);
      c.strokeStyle = '#2f2c27'; c.lineWidth = 1.5; c.strokeRect(18, 18, 28, 38);
    },
    clover(c) {
      c.translate(32, 30);
      for (let i = 0; i < 4; i++) { c.save(); c.rotate(i * Math.PI / 2 + Math.PI / 4); circ(c, 0, -11, 10, grad(c, '#7fe08a', '#237a32'), '#0f3a1c'); c.restore(); }
      c.strokeStyle = '#237a32'; c.lineWidth = 3; c.beginPath(); c.moveTo(0, 4); c.quadraticCurveTo(4, 18, 10, 26); c.stroke();
    },
    crown(c) {
      c.translate(32, 34);
      poly(c, [-24, 14, -24, -12, -12, 2, 0, -18, 12, 2, 24, -12, 24, 14], grad(c, '#ffe9a6', '#b8862e'), '#5a3d10');
      c.fillStyle = '#c0392b'; circ(c, 0, 4, 4, '#c0392b'); circ(c, -14, 7, 3, '#2e86de'); circ(c, 14, 7, 3, '#2e86de');
      c.fillStyle = GOLD_D; c.fillRect(-24, 12, 48, 5);
    },
    hammer(c) {
      c.translate(32, 32); c.rotate(-Math.PI / 4);
      c.fillStyle = '#7a5230'; c.fillRect(-3, -6, 6, 34);
      c.fillStyle = grad(c, '#d7dde6', '#6d7686'); c.fillRect(-15, -18, 30, 13); c.strokeStyle = '#2b2f38'; c.lineWidth = 2; c.strokeRect(-15, -18, 30, 13);
    },
    lock(c) {
      c.translate(32, 34);
      c.strokeStyle = STEEL_D; c.lineWidth = 6; c.beginPath(); c.arc(0, -6, 11, Math.PI, 0); c.stroke();
      c.fillStyle = grad(c, '#d7b56a', '#7a5520'); c.fillRect(-16, -6, 32, 24); c.strokeStyle = '#3a2a10'; c.lineWidth = 2; c.strokeRect(-16, -6, 32, 24);
      circ(c, 0, 4, 3.5, '#2a1d10'); c.fillStyle = '#2a1d10'; c.fillRect(-1.5, 5, 3, 7);
    },
    sail(c) {
      c.strokeStyle = '#6b4423'; c.lineWidth = 3; c.beginPath(); c.moveTo(20, 8); c.lineTo(20, 56); c.stroke();
      c.beginPath(); c.moveTo(22, 10); c.quadraticCurveTo(54, 22, 50, 48); c.lineTo(22, 48); c.closePath();
      c.fillStyle = grad(c, '#f3ead2', '#c9b994'); c.fill(); c.strokeStyle = '#6b5a3a'; c.lineWidth = 1.5; c.stroke();
      c.fillStyle = '#2e5aa8'; c.fillRect(28, 26, 12, 8);
    },
  };
  // Aegis: radiant shield
  I.aegis = function (c) {
    c.save(); c.translate(32, 32);
    const g = c.createRadialGradient(0, 0, 4, 0, 0, 30); g.addColorStop(0, 'rgba(255,250,210,0.9)'); g.addColorStop(1, 'rgba(255,210,90,0)');
    circ(c, 0, 0, 30, g);
    c.restore();
    c.save(); c.translate(32, 32); c.scale(0.8, 0.8); c.translate(-32, -32); I.shield(c); c.restore();
  };

  const cache = {};
  SR.Icons = {
    get(key) {
      if (cache[key]) return cache[key];
      const cv = SR.U.makeCanvas(64, 64);
      const c = cv.getContext('2d');
      if (key.startsWith('w_')) {
        const type = key.slice(2);
        const g = c.createRadialGradient(32, 32, 4, 32, 32, 30);
        g.addColorStop(0, 'rgba(255,255,255,0.12)'); g.addColorStop(1, 'rgba(0,0,0,0)');
        c.fillStyle = g; c.fillRect(0, 0, 64, 64);
        const ang = type === 'fire' || type === 'lightning' ? 0 : -Math.PI / 4;
        SR.WeaponArt.draw(c, type, 32, type === 'fire' ? 40 : type === 'lightning' ? 38 : 32, ang, 0, 0.6, 1.25, 1);
      } else if (I[key]) {
        c.save(); I[key](c); c.restore();
      } else {
        c.fillStyle = GOLD; c.font = 'bold 34px Georgia'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('?', 32, 34);
      }
      cache[key] = cv.toDataURL();
      return cache[key];
    },
    img(key, cls = '') { return `<img class="icon ${cls}" src="${this.get(key)}" alt="">`; },
  };
})(window.SR);
