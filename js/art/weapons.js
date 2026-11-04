'use strict';
// Procedural drawings of the castle-mounted weapons. Drawn live each frame so
// they rotate toward their targets and recoil when firing.
(function (SR) {
  const TAU = Math.PI * 2;

  function circle(ctx, x, y, r, fill, stroke, lw = 1) {
    ctx.beginPath(); ctx.arc(x, y, r, 0, TAU);
    if (fill) { ctx.fillStyle = fill; ctx.fill(); }
    if (stroke) { ctx.lineWidth = lw; ctx.strokeStyle = stroke; ctx.stroke(); }
  }
  function rrect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y); ctx.lineTo(x + w - r, y); ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r); ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h); ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r); ctx.quadraticCurveTo(x, y, x + r, y); ctx.closePath();
  }

  const D = {
    ballista(ctx, ang, recoil, t, lvl) {
      circle(ctx, 0, 2, 11, '#3b2818');
      circle(ctx, 0, 0, 10, '#6e4a2c', '#2a1a0e', 1.5);
      circle(ctx, 0, 0, 5, '#8a6038');
      ctx.rotate(ang);
      ctx.translate(-recoil * 5, 0);
      // stock
      ctx.fillStyle = '#8b5b33'; ctx.strokeStyle = '#2a1a0e'; ctx.lineWidth = 1.2;
      rrect(ctx, -12, -3.2, 28, 6.4, 2); ctx.fill(); ctx.stroke();
      // limbs
      const pull = 4 + recoil * -4;
      ctx.lineCap = 'round';
      ctx.strokeStyle = '#4a2e18'; ctx.lineWidth = 4.2;
      ctx.beginPath(); ctx.moveTo(5, -17); ctx.quadraticCurveTo(12, 0, 5, 17); ctx.stroke();
      ctx.strokeStyle = lvl >= 6 ? '#d9b24c' : '#7b5230'; ctx.lineWidth = 2.4;
      ctx.beginPath(); ctx.moveTo(5, -17); ctx.quadraticCurveTo(12, 0, 5, 17); ctx.stroke();
      // string
      ctx.strokeStyle = '#efe4c8'; ctx.lineWidth = 0.9;
      ctx.beginPath(); ctx.moveTo(5, -17); ctx.lineTo(-pull, 0); ctx.lineTo(5, 17); ctx.stroke();
      // bolt
      if (recoil < 0.4) {
        ctx.strokeStyle = '#dcc79a'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(-pull, 0); ctx.lineTo(19, 0); ctx.stroke();
        ctx.fillStyle = '#cfd6df';
        ctx.beginPath(); ctx.moveTo(24, 0); ctx.lineTo(18, -3); ctx.lineTo(18, 3); ctx.closePath(); ctx.fill();
      }
      ctx.fillStyle = '#c7a14a'; ctx.fillRect(-2, -3.5, 3, 7);
    },
    crossbow(ctx, ang, recoil, t, lvl) {
      circle(ctx, 0, 2, 9, '#2c2c34');
      circle(ctx, 0, 0, 8, '#55565f', '#1d1d22', 1.2);
      ctx.rotate(ang);
      ctx.translate(-recoil * 2.5, 0);
      ctx.fillStyle = '#6b4a2e'; ctx.strokeStyle = '#1d140c'; ctx.lineWidth = 1;
      rrect(ctx, -9, -2.6, 22, 5.2, 1.5); ctx.fill(); ctx.stroke();
      ctx.strokeStyle = '#9aa6b8'; ctx.lineWidth = 2.6; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(8, -11); ctx.quadraticCurveTo(13, 0, 8, 11); ctx.stroke();
      ctx.strokeStyle = '#efe4c8'; ctx.lineWidth = 0.7;
      ctx.beginPath(); ctx.moveTo(8, -11); ctx.lineTo(1, 0); ctx.lineTo(8, 11); ctx.stroke();
      // magazine
      ctx.fillStyle = lvl >= 6 ? '#b8923e' : '#43454f'; ctx.strokeStyle = '#15151a';
      rrect(ctx, -5, -6, 9, 12, 1.5); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#c9d6e8'; ctx.fillRect(-3, -4, 5, 1.2); ctx.fillRect(-3, -1, 5, 1.2); ctx.fillRect(-3, 2, 5, 1.2);
      ctx.fillStyle = '#dfe9ff';
      ctx.beginPath(); ctx.moveTo(17, 0); ctx.lineTo(13, -2); ctx.lineTo(13, 2); ctx.closePath(); ctx.fill();
    },
    cannon(ctx, ang, recoil, t, lvl) {
      circle(ctx, 0, 3, 12, '#2b2017');
      ctx.save();
      ctx.rotate(ang);
      // carriage
      ctx.fillStyle = '#6a4527'; ctx.strokeStyle = '#24170c'; ctx.lineWidth = 1.2;
      rrect(ctx, -12, -9, 18, 18, 3); ctx.fill(); ctx.stroke();
      circle(ctx, -4, -10, 3.5, '#3a2a1a', '#120c06');
      circle(ctx, -4, 10, 3.5, '#3a2a1a', '#120c06');
      ctx.translate(-recoil * 7, 0);
      // barrel
      const g = ctx.createLinearGradient(0, -6, 0, 6);
      g.addColorStop(0, '#6c6c78'); g.addColorStop(0.35, '#3a3a44'); g.addColorStop(1, '#16161c');
      ctx.fillStyle = g; ctx.strokeStyle = '#0c0c10'; ctx.lineWidth = 1.2;
      ctx.beginPath(); ctx.moveTo(-12, -6.5); ctx.lineTo(18, -4.5); ctx.lineTo(18, 4.5); ctx.lineTo(-12, 6.5);
      ctx.quadraticCurveTo(-17, 0, -12, -6.5); ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.fillStyle = lvl >= 6 ? '#d4a843' : '#55555f';
      ctx.fillRect(16, -6, 4, 12); ctx.fillRect(2, -6, 2.5, 12); ctx.fillRect(-9, -7, 2.5, 14);
      ctx.fillStyle = '#050507'; ctx.fillRect(19.5, -2.5, 1, 5);
      ctx.restore();
    },
    fire(ctx, ang, recoil, t, lvl) {
      // rune ring
      ctx.save();
      ctx.rotate(t * 0.8);
      ctx.strokeStyle = 'rgba(255,140,50,0.55)'; ctx.lineWidth = 1.2;
      ctx.setLineDash([3, 4]);
      ctx.beginPath(); ctx.arc(0, 0, 15, 0, TAU); ctx.stroke();
      ctx.setLineDash([]);
      ctx.restore();
      // brazier bowl
      ctx.fillStyle = '#2a1d16';
      ctx.beginPath(); ctx.ellipse(0, 3, 11, 6, 0, 0, TAU); ctx.fill();
      const g = ctx.createLinearGradient(0, -2, 0, 9);
      g.addColorStop(0, '#5c3b24'); g.addColorStop(1, '#22150d');
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.moveTo(-11, -1); ctx.lineTo(11, -1); ctx.lineTo(7, 8); ctx.lineTo(-7, 8); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = '#c99b3d'; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.ellipse(0, -1, 11, 4, 0, 0, TAU); ctx.stroke();
      // glow
      const pulse = 1 + recoil * 0.6 + Math.sin(t * 9) * 0.06;
      const gl = ctx.createRadialGradient(0, -6, 1, 0, -6, 26 * pulse);
      gl.addColorStop(0, 'rgba(255,200,90,0.55)'); gl.addColorStop(1, 'rgba(255,80,20,0)');
      ctx.fillStyle = gl; ctx.beginPath(); ctx.arc(0, -6, 26 * pulse, 0, TAU); ctx.fill();
      // flames
      const fl = [['#ff4d1a', 9, 18], ['#ff9a2e', 6.5, 14], ['#ffe08a', 3.5, 9]];
      for (let i = 0; i < fl.length; i++) {
        const [c, w, h] = fl[i];
        const sway = Math.sin(t * 7 + i * 1.7) * 2;
        const hh = h * pulse * (1 + Math.sin(t * 11 + i) * 0.1);
        ctx.fillStyle = c;
        ctx.beginPath(); ctx.moveTo(-w, -1);
        ctx.quadraticCurveTo(-w * 0.6, -hh * 0.6, sway, -hh);
        ctx.quadraticCurveTo(w * 0.6, -hh * 0.6, w, -1);
        ctx.closePath(); ctx.fill();
      }
    },
    lightning(ctx, ang, recoil, t, lvl) {
      // pedestal
      ctx.fillStyle = '#3a3f55';
      ctx.beginPath(); ctx.ellipse(0, 6, 9, 4.5, 0, 0, TAU); ctx.fill();
      ctx.strokeStyle = '#8fd3ff'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.ellipse(0, 6, 9, 4.5, 0, 0, TAU); ctx.stroke();
      const bob = Math.sin(t * 2.5) * 2.5 - 10;
      const gl = ctx.createRadialGradient(0, bob, 1, 0, bob, 24 + recoil * 14);
      gl.addColorStop(0, 'rgba(170,230,255,0.75)'); gl.addColorStop(1, 'rgba(80,140,255,0)');
      ctx.fillStyle = gl; ctx.beginPath(); ctx.arc(0, bob, 24 + recoil * 14, 0, TAU); ctx.fill();
      ctx.save(); ctx.translate(0, bob); ctx.rotate(Math.sin(t * 1.3) * 0.15);
      const g = ctx.createLinearGradient(-6, -14, 6, 12);
      g.addColorStop(0, '#f2fbff'); g.addColorStop(0.45, '#7cc8ff'); g.addColorStop(1, '#2a4fbf');
      ctx.fillStyle = g; ctx.strokeStyle = '#e8f7ff'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(0, -15); ctx.lineTo(7, -2); ctx.lineTo(0, 13); ctx.lineTo(-7, -2); ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.strokeStyle = 'rgba(255,255,255,0.6)';
      ctx.beginPath(); ctx.moveTo(0, -15); ctx.lineTo(0, 13); ctx.moveTo(-7, -2); ctx.lineTo(7, -2); ctx.stroke();
      ctx.restore();
      // tiny arcs
      if (Math.random() < 0.25 + recoil) {
        ctx.strokeStyle = 'rgba(200,240,255,0.9)'; ctx.lineWidth = 1;
        ctx.beginPath();
        let a = Math.random() * TAU, px = 0, py = bob;
        ctx.moveTo(px, py);
        for (let i = 0; i < 4; i++) { px += Math.cos(a) * 5; py += Math.sin(a) * 5; a += (Math.random() - 0.5) * 1.5; ctx.lineTo(px, py); }
        ctx.stroke();
      }
    },
  };

  SR.WeaponArt = {
    // draw weapon centred at (x,y) in the current transform
    draw(ctx, type, x, y, ang, recoil, t, scale = 1, lvl = 1) {
      const f = D[type];
      if (!f) return;
      ctx.save();
      ctx.translate(x, y);
      ctx.scale(scale, scale);
      f(ctx, ang, recoil, t, lvl);
      ctx.restore();
    },
    // Empty, unlocked slot marker
    drawEmpty(ctx, x, y, t) {
      ctx.save();
      ctx.translate(x, y);
      ctx.strokeStyle = 'rgba(240,207,122,' + (0.45 + Math.sin(t * 3) * 0.2) + ')';
      ctx.lineWidth = 1.5; ctx.setLineDash([3, 3]);
      ctx.beginPath(); ctx.ellipse(0, 0, 9, 5, 0, 0, TAU); ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = 'rgba(240,207,122,0.6)';
      ctx.fillRect(-0.75, -4, 1.5, 8); ctx.fillRect(-4, -0.75, 8, 1.5);
      ctx.restore();
    },
  };
})(window.SR);
