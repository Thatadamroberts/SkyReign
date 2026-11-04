'use strict';
// Enemy sprites — drawn procedurally once at startup into small canvases
// (walk-cycle frames + white hit-flash versions), facing right.
(function (SR) {
  const U = SR.U, TAU = Math.PI * 2;
  const SC = 2; // sprite pixel scale

  const RED = '#a8332b', RED_D = '#6e1c17', GOLD = '#e0b552', STEEL = '#b8c0cc', STEEL_D = '#6a7280', SKIN = '#e0b48c';

  function c(ctx, x, y, r, fill, stroke, lw = 0.8) {
    ctx.beginPath(); ctx.arc(x, y, r, 0, TAU);
    if (fill) { ctx.fillStyle = fill; ctx.fill(); }
    if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = lw; ctx.stroke(); }
  }
  function e(ctx, x, y, rx, ry, fill, stroke, lw = 0.8) {
    ctx.beginPath(); ctx.ellipse(x, y, rx, ry, 0, 0, TAU);
    if (fill) { ctx.fillStyle = fill; ctx.fill(); }
    if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = lw; ctx.stroke(); }
  }
  function rr(ctx, x, y, w, h, r, fill, stroke, lw = 0.8) {
    ctx.beginPath();
    ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
    if (fill) { ctx.fillStyle = fill; ctx.fill(); }
    if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = lw; ctx.stroke(); }
  }
  function line(ctx, x0, y0, x1, y1, col, lw) {
    ctx.strokeStyle = col; ctx.lineWidth = lw; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.stroke();
  }
  function legs(ctx, f, y, spread, col) {
    const o = f ? 1.8 : -1.8;
    rr(ctx, -spread - 1 + o, y, 2.6, 5, 1, col);
    rr(ctx, spread - 1.6 - o, y, 2.6, 5, 1, col);
  }
  function horse(ctx, f, body, cloth, trim, scale = 1) {
    ctx.save(); ctx.scale(scale, scale);
    const o = f ? 2.5 : -2.5;
    // legs
    for (const [x, d] of [[-8, o], [-4, -o], [5, -o], [9, o]]) rr(ctx, x + d * 0.4, 3, 2.4, 9, 1, '#3a2614');
    e(ctx, 0, 1, 13, 6.5, body, '#24160b');
    // neck & head
    ctx.fillStyle = body;
    ctx.beginPath(); ctx.moveTo(8, -1); ctx.lineTo(14, -9); ctx.lineTo(19, -7); ctx.lineTo(17, -3); ctx.lineTo(12, 3); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = '#24160b'; ctx.lineWidth = 0.8; ctx.stroke();
    c(ctx, 16, -6, 0.9, '#000');
    line(ctx, 13, -9, 9, -4, '#1a1008', 2);
    // tail
    line(ctx, -13, 0, -17, 5, '#1a1008', 2.4);
    // caparison
    if (cloth) {
      ctx.fillStyle = cloth;
      ctx.beginPath(); ctx.moveTo(-12, -3); ctx.lineTo(9, -3); ctx.lineTo(10, 5); ctx.lineTo(6, 8); ctx.lineTo(1, 6); ctx.lineTo(-4, 8); ctx.lineTo(-9, 6); ctx.lineTo(-13, 7); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = trim; ctx.lineWidth = 1; ctx.stroke();
    }
    ctx.restore();
  }

  const DRAW = {
    infantry: { r: 11, frames: 2, fn(ctx, f) {
      legs(ctx, f, 4, 3, '#3b2a1c');
      line(ctx, -7, 8, 9, -14, '#7a5230', 1.4);
      ctx.fillStyle = STEEL; ctx.beginPath(); ctx.moveTo(9, -14); ctx.lineTo(10.5, -19); ctx.lineTo(11.5, -13); ctx.closePath(); ctx.fill();
      rr(ctx, -5, -6, 10, 11, 3, RED, RED_D);
      ctx.fillStyle = GOLD; ctx.fillRect(-5, 0, 10, 1.5);
      c(ctx, 0, -9, 4, SKIN, '#5a3a20', 0.6);
      ctx.fillStyle = STEEL_D; ctx.beginPath(); ctx.arc(0, -10, 4.6, Math.PI, 0); ctx.fill();
      ctx.fillRect(-6, -10.5, 12, 1.6);
      c(ctx, -5, -1, 4, '#7a5230', '#3b2410'); c(ctx, -5, -1, 1.3, GOLD);
    } },
    archer: { r: 10, frames: 2, fn(ctx, f) {
      legs(ctx, f, 4, 2.6, '#2f2416');
      line(ctx, -5, -4, -7, 4, '#5a3a20', 3); // quiver
      line(ctx, -6, -6, -4, -9, '#e8dcc0', 1);
      rr(ctx, -4.5, -6, 9, 11, 3, '#3f6b33', '#21391b');
      ctx.fillStyle = '#6b4423'; ctx.fillRect(-4.5, 0, 9, 1.4);
      c(ctx, 0, -9, 3.8, SKIN, '#5a3a20', 0.6);
      ctx.fillStyle = '#2f5226'; ctx.beginPath(); ctx.arc(0, -9.5, 4.6, Math.PI * 0.9, Math.PI * 0.1); ctx.lineTo(-1, -15); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = '#6b4423'; ctx.lineWidth = 1.4;
      ctx.beginPath(); ctx.arc(4, -3, 8, -1.2, 1.2); ctx.stroke();
      line(ctx, 4 + Math.cos(-1.2) * 8, -3 + Math.sin(-1.2) * 8, 4 + Math.cos(1.2) * 8, -3 + Math.sin(1.2) * 8, '#e8dcc0', 0.5);
    } },
    crossbowman: { r: 11, frames: 2, fn(ctx, f) {
      legs(ctx, f, 4, 3, '#2a1d12');
      rr(ctx, -5.5, -6, 11, 11, 3, '#7a5a3a', '#3b2a18');
      ctx.strokeStyle = 'rgba(40,25,10,0.5)'; ctx.lineWidth = 0.6;
      for (let y = -4; y < 4; y += 2.5) { ctx.beginPath(); ctx.moveTo(-5, y); ctx.lineTo(5, y); ctx.stroke(); }
      c(ctx, 0, -9, 4, SKIN, '#5a3a20', 0.6);
      ctx.fillStyle = STEEL; ctx.beginPath(); ctx.arc(0, -10, 4.8, Math.PI, 0); ctx.fill();
      ctx.fillStyle = STEEL_D; ctx.fillRect(-0.7, -15, 1.4, 4);
      rr(ctx, 0, -3, 13, 2.6, 1, '#5a3a20');
      line(ctx, 10, -9, 10, 4, '#8a909c', 1.6);
      line(ctx, 10, -9, 3, -2, '#e8dcc0', 0.5); line(ctx, 10, 4, 3, -2, '#e8dcc0', 0.5);
      // pavise on back
      rr(ctx, -10, -8, 5, 14, 1.5, RED, RED_D); ctx.fillStyle = GOLD; ctx.fillRect(-8.5, -4, 2, 6);
    } },
    knight: { r: 16, frames: 2, fn(ctx, f) {
      horse(ctx, f, '#6b4a2e', RED, GOLD);
      // rider
      rr(ctx, -4, -14, 8, 11, 3, STEEL, STEEL_D);
      ctx.fillStyle = RED; ctx.fillRect(-4, -9, 8, 3);
      c(ctx, 0, -17, 4.2, STEEL, STEEL_D);
      ctx.fillStyle = '#1a1a20'; ctx.fillRect(0.5, -18, 3.5, 1.2);
      ctx.fillStyle = '#d03a2c'; ctx.beginPath(); ctx.moveTo(-1, -21); ctx.quadraticCurveTo(-7, -25, -9, -18); ctx.quadraticCurveTo(-5, -21, -1, -19); ctx.fill();
      line(ctx, -2, -8, 24, -16, '#8a6a46', 1.8);
      ctx.fillStyle = STEEL; ctx.beginPath(); ctx.moveTo(24, -16); ctx.lineTo(29, -17.5); ctx.lineTo(24.5, -14); ctx.closePath(); ctx.fill();
      c(ctx, -6, -8, 4.4, RED, GOLD, 1);
    } },
    engineer: { r: 11, frames: 2, fn(ctx, f) {
      legs(ctx, f, 4, 3, '#3a2a1a');
      rr(ctx, -9, -8, 6, 10, 1.5, '#6b4a2e', '#3a2614'); // backpack
      c(ctx, -6, -9, 2.2, null, '#b8c0cc', 1); // gear
      rr(ctx, -5, -6, 10, 11, 3, '#d08a2c', '#7a4a10');
      rr(ctx, -3, -3, 6, 8, 1, '#6b4423');
      c(ctx, 0, -9, 4, SKIN, '#5a3a20', 0.6);
      ctx.fillStyle = '#c99b3d'; ctx.beginPath(); ctx.arc(0, -10, 4.4, Math.PI, 0); ctx.fill();
      c(ctx, 1.5, -9.5, 1.2, '#9fe0ff', '#333', 0.4); c(ctx, -1.3, -9.5, 1.2, '#9fe0ff', '#333', 0.4);
      line(ctx, 4, 2, 9, -9, '#7a5230', 1.6);
      rr(ctx, 6, -12, 7, 4, 1, STEEL, STEEL_D);
    } },
    royalGuard: { r: 16, frames: 2, fn(ctx, f) {
      legs(ctx, f, 6, 3.5, '#9aa3b2');
      line(ctx, 6, 10, 9, -24, '#5a3a20', 1.8);
      ctx.fillStyle = STEEL; ctx.beginPath(); ctx.moveTo(9, -24); ctx.lineTo(14, -20); ctx.lineTo(9, -17); ctx.closePath(); ctx.fill();
      ctx.beginPath(); ctx.moveTo(9, -24); ctx.lineTo(10, -29); ctx.lineTo(8, -24); ctx.fill();
      rr(ctx, -6, -8, 12, 15, 4, '#e8ecf2', '#7a8494');
      ctx.fillStyle = '#5b2a86'; ctx.fillRect(-3, -8, 6, 15);
      ctx.fillStyle = GOLD; ctx.fillRect(-6, -1, 12, 1.6);
      c(ctx, 0, -12, 5, '#eef1f6', '#7a8494');
      ctx.fillStyle = '#1a1a20'; ctx.fillRect(-0.5, -13, 5, 1.3);
      ctx.fillStyle = '#7c3cc0'; ctx.beginPath(); ctx.moveTo(0, -17); ctx.quadraticCurveTo(-8, -22, -10, -12); ctx.quadraticCurveTo(-5, -16, 0, -15); ctx.fill();
      // tower shield
      rr(ctx, 3, -10, 8, 19, 2, '#5b2a86', GOLD, 1.4);
      ctx.fillStyle = GOLD; ctx.fillRect(6.3, -7, 1.4, 13); ctx.fillRect(4, -2, 6, 1.4);
    } },
    general: { r: 30, frames: 2, fn(ctx, f) {
      ctx.save(); ctx.scale(1.6, 1.6);
      horse(ctx, f, '#2a2228', '#4a1f6e', GOLD);
      // cape
      ctx.fillStyle = '#8b1f2a';
      ctx.beginPath(); ctx.moveTo(-3, -13); ctx.quadraticCurveTo(-14, -8, -16, 2); ctx.lineTo(-6, -2); ctx.closePath(); ctx.fill();
      rr(ctx, -4.5, -15, 9, 12, 3, '#3a3f4c', '#15171d');
      ctx.fillStyle = GOLD; ctx.fillRect(-4.5, -10, 9, 1.5);
      c(ctx, 0, -18, 4.6, '#3a3f4c', '#15171d');
      ctx.fillStyle = GOLD;
      ctx.beginPath(); ctx.moveTo(-4, -21); ctx.lineTo(-3, -25); ctx.lineTo(-1, -22); ctx.lineTo(0, -26); ctx.lineTo(1, -22); ctx.lineTo(3, -25); ctx.lineTo(4, -21); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#ff5030'; ctx.fillRect(0.5, -19, 3.5, 1.2);
      // sword raised
      line(ctx, 3, -11, 13, -27, '#e6ebf2', 1.8);
      line(ctx, 1.5, -13, 5, -10, GOLD, 1.6);
      // banner
      line(ctx, -8, 4, -10, -34, '#3b2a18', 1.2);
      ctx.fillStyle = '#4a1f6e'; ctx.beginPath(); ctx.moveTo(-10, -34); ctx.lineTo(-22, -32); ctx.lineTo(-19, -27); ctx.lineTo(-22, -22); ctx.lineTo(-10, -24); ctx.closePath(); ctx.fill();
      c(ctx, -15, -28, 2, GOLD);
      ctx.restore();
    } },
    trebuchet: { r: 24, frames: 1, fn(ctx) {
      // base frame
      rr(ctx, -20, 4, 40, 5, 1.5, '#6b4423', '#2a1a0e');
      c(ctx, -15, 10, 4, '#4a2e18', '#1a1008', 1); c(ctx, 15, 10, 4, '#4a2e18', '#1a1008', 1);
      c(ctx, -15, 10, 1.3, '#8a6a46'); c(ctx, 15, 10, 1.3, '#8a6a46');
      line(ctx, -12, 5, 0, -18, '#7b5230', 3);
      line(ctx, 12, 5, 0, -18, '#7b5230', 3);
      line(ctx, -7, -4, 7, -4, '#5a3a20', 2);
      c(ctx, 0, -18, 2, '#3a2a1a');
      // crew
      rr(ctx, -27, -2, 6, 8, 2, RED, RED_D); c(ctx, -24, -4, 2.8, SKIN);
    } },
    wyvern: { r: 16, frames: 3, fn(ctx, f) {
      const wing = [-1, 0.2, 1][f];
      // tail
      ctx.strokeStyle = '#2d5a4a'; ctx.lineWidth = 3; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(-6, 2); ctx.quadraticCurveTo(-16, 6, -22, 0); ctx.stroke();
      ctx.fillStyle = '#7a1f1f'; ctx.beginPath(); ctx.moveTo(-22, 0); ctx.lineTo(-27, -3); ctx.lineTo(-25, 3); ctx.closePath(); ctx.fill();
      // far wing
      ctx.fillStyle = '#244a3c';
      ctx.beginPath(); ctx.moveTo(-2, -2); ctx.lineTo(4, -4 - 14 * wing); ctx.lineTo(-10, -2 - 12 * wing); ctx.closePath(); ctx.fill();
      // body
      e(ctx, 0, 0, 10, 5.5, '#3d7a62', '#1a3a2e');
      e(ctx, 1, 2, 6, 2.5, '#c9b27a');
      // neck/head
      ctx.fillStyle = '#3d7a62';
      ctx.beginPath(); ctx.moveTo(6, -2); ctx.quadraticCurveTo(12, -8, 16, -6); ctx.lineTo(21, -5); ctx.lineTo(16, -2); ctx.lineTo(9, 2); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = '#1a3a2e'; ctx.lineWidth = 0.8; ctx.stroke();
      c(ctx, 15.5, -6, 0.9, '#ffde4a');
      line(ctx, 13, -7, 10, -11, '#d9cfb0', 1);
      // near wing
      const wg = ctx.createLinearGradient(0, -20, 0, 6);
      wg.addColorStop(0, '#5aa384'); wg.addColorStop(1, '#2d5a4a');
      ctx.fillStyle = wg;
      ctx.beginPath(); ctx.moveTo(-2, 0); ctx.lineTo(6, -2 - 18 * wing); ctx.lineTo(0, -1 - 13 * wing); ctx.lineTo(-6, -2 - 16 * wing); ctx.lineTo(-8, -1 - 9 * wing); ctx.lineTo(-12, 0 - 8 * wing); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = '#1a3a2e'; ctx.lineWidth = 0.7; ctx.stroke();
      // rider
      rr(ctx, -2, -7, 4.5, 5, 1.5, RED, RED_D); c(ctx, 0.3, -8.5, 2, STEEL);
    } },
  };

  const sprites = {};

  function buildType(type) {
    const d = DRAW[type];
    const box = d.r * (type === 'general' ? 2.6 : 3.0);
    const size = box * 2;
    const frames = [], whites = [];
    for (let f = 0; f < d.frames; f++) {
      const cv = U.makeCanvas(size * SC, size * SC);
      const ctx = cv.getContext('2d');
      ctx.scale(SC, SC); ctx.translate(box, box);
      ctx.lineJoin = 'round';
      d.fn(ctx, f);
      frames.push(cv);
      const w = U.makeCanvas(cv.width, cv.height);
      const wc = w.getContext('2d');
      wc.drawImage(cv, 0, 0);
      wc.globalCompositeOperation = 'source-atop';
      wc.fillStyle = '#fff'; wc.fillRect(0, 0, w.width, w.height);
      whites.push(w);
    }
    sprites[type] = { frames, whites, half: box, size };
  }

  SR.EnemyArt = {
    init() { for (const t in DRAW) buildType(t); },
    get(type) { return sprites[type]; },
    drawTrebuchetArm(ctx, x, y, ang, scale) {
      ctx.save();
      ctx.translate(x, y - 18 * scale);
      ctx.scale(scale, scale);
      ctx.rotate(ang);
      line(ctx, -10, 0, 24, 0, '#8a5a32', 2.6);
      rr(ctx, -15, -4, 8, 9, 1, '#4a4a52', '#1a1a20');
      line(ctx, 24, 0, 28, 7, '#c9b994', 0.8);
      ctx.restore();
    },
  };
})(window.SR);
