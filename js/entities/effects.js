'use strict';
// Visual effects: particles, damage numbers, shockwave rings, lightning arcs,
// falling corpses and fire zones. All purely cosmetic except zones (see game).
(function (SR) {
  const U = SR.U, TAU = Math.PI * 2;
  const MAX_PARTICLES = 1400, MAX_NUMBERS = 140;

  class FX {
    constructor() { this.reset(); }
    reset() {
      this.particles = [];
      this.numbers = [];
      this.rings = [];
      this.bolts = [];
      this.corpses = [];
      this.flashes = [];
    }

    particle(o) {
      if (this.particles.length >= MAX_PARTICLES) this.particles.shift();
      o.t = 0; o.life = o.life || 0.6;
      o.vx = o.vx || 0; o.vy = o.vy || 0; o.drag = o.drag != null ? o.drag : 2; o.g = o.g || 0;
      o.size = o.size || 2; o.kind = o.kind || 'spark';
      this.particles.push(o);
    }
    burst(x, y, n, color, speed = 120, size = 2.5, life = 0.5, kind = 'spark', g = 0) {
      for (let i = 0; i < n; i++) {
        const a = Math.random() * TAU, s = speed * (0.3 + Math.random() * 0.9);
        this.particle({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, color, size: size * (0.6 + Math.random() * 0.8), life: life * (0.6 + Math.random() * 0.8), kind, g });
      }
    }
    smoke(x, y, n = 1, size = 10, color = 'rgba(70,65,60,0.5)', life = 1.2) {
      for (let i = 0; i < n; i++) {
        this.particle({ x: x + U.rand(-4, 4), y: y + U.rand(-4, 4), vx: U.rand(-15, 15), vy: U.rand(-35, -10), size: size * U.rand(0.7, 1.3), color, life: life * U.rand(0.7, 1.3), kind: 'smoke', drag: 0.8 });
      }
    }
    explosion(x, y, radius, opts = {}) {
      const big = radius > 90;
      this.flashes.push({ x, y, r: radius * 1.4, t: 0, dur: 0.18, color: opts.color || '255,200,120' });
      this.ring(x, y, radius * 0.3, radius * 1.05, 0.35, opts.ringColor || 'rgba(255,220,150,', 3);
      this.burst(x, y, big ? 26 : 16, opts.c1 || '#ffcf6a', radius * 2.4, 3.2, 0.45, 'spark');
      this.burst(x, y, big ? 14 : 8, opts.c2 || '#ff6a2a', radius * 1.6, 4, 0.5, 'spark');
      this.smoke(x, y, big ? 10 : 6, radius * 0.3, 'rgba(60,50,45,0.55)', 1.1);
      for (let i = 0; i < (big ? 8 : 4); i++) {
        const a = Math.random() * TAU, s = U.rand(60, 160);
        this.particle({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s - 60, g: 260, color: '#3a2a1a', size: U.rand(1.5, 3), life: 0.7, kind: 'debris', drag: 0.5 });
      }
    }
    ring(x, y, r0, r1, dur, colorPrefix, width = 2) {
      this.rings.push({ x, y, r0, r1, t: 0, dur, c: colorPrefix, w: width });
    }
    number(x, y, val, opts = {}) {
      if (!SR.Save.data.settings.damageNumbers && !opts.force) return;
      if (this.numbers.length >= MAX_NUMBERS) this.numbers.shift();
      const text = typeof val === 'number' ? (val < 1 ? val.toFixed(1) : String(Math.round(val))) : val;
      this.numbers.push({ x: x + U.rand(-6, 6), y, vy: -55 - (opts.crit ? 25 : 0), t: 0, life: opts.life || 0.75, text, color: opts.color || '#fff', size: opts.size || (opts.crit ? 17 : 12), crit: !!opts.crit });
    }
    lightning(points, color = '#bfe8ff') {
      // jagged polyline between points
      const pts = [];
      for (let i = 0; i < points.length - 1; i++) {
        const a = points[i], b = points[i + 1];
        const segs = Math.max(3, Math.floor(U.dist(a.x, a.y, b.x, b.y) / 18));
        for (let s = 0; s < segs; s++) {
          const t = s / segs;
          const j = s === 0 ? 0 : 9;
          pts.push({ x: U.lerp(a.x, b.x, t) + U.rand(-j, j), y: U.lerp(a.y, b.y, t) + U.rand(-j, j) });
        }
      }
      const last = points[points.length - 1];
      pts.push({ x: last.x, y: last.y });
      this.bolts.push({ pts, t: 0, dur: 0.22, color });
    }
    corpse(e) {
      const sp = SR.EnemyArt.get(e.type);
      if (!sp) return;
      if (this.corpses.length > 80) this.corpses.shift();
      this.corpses.push({ sp, x: e.x, y: e.y, flip: e.facing < 0, t: 0, dur: e.flying ? 0.9 : 0.7, scale: e.scale * 1.15, flying: e.flying, frame: 0, rot: (e.facing < 0 ? -1 : 1) * Math.PI / 2 });
    }

    update(dt) {
      U.compact(this.particles, (p) => {
        p.t += dt;
        if (p.t >= p.life) return false;
        const d = Math.max(0, 1 - p.drag * dt);
        p.vx *= d; p.vy = p.vy * d + p.g * dt;
        p.x += p.vx * dt; p.y += p.vy * dt;
        return true;
      });
      U.compact(this.numbers, (n) => { n.t += dt; n.y += n.vy * dt; n.vy *= 1 - 3 * dt; return n.t < n.life; });
      U.compact(this.rings, (r) => (r.t += dt) < r.dur);
      U.compact(this.bolts, (b) => (b.t += dt) < b.dur);
      U.compact(this.flashes, (f) => (f.t += dt) < f.dur);
      U.compact(this.corpses, (c) => { c.t += dt; if (c.flying) c.y += 120 * dt * (c.t / c.dur) * 3; return c.t < c.dur; });
    }

    drawCorpses(ctx) {
      for (const c of this.corpses) {
        const k = c.t / c.dur;
        const img = c.sp.frames[0];
        const s = c.scale;
        ctx.save();
        ctx.globalAlpha = 1 - k * k;
        ctx.translate(c.x, c.y);
        ctx.rotate(c.rot * Math.min(1, k * 3));
        if (c.flip) ctx.scale(-1, 1);
        ctx.drawImage(img, -c.sp.half * s, -c.sp.half * s, c.sp.size * s, c.sp.size * s);
        ctx.restore();
      }
      ctx.globalAlpha = 1;
    }

    drawWorld(ctx) {
      // flashes (light)
      ctx.globalCompositeOperation = 'lighter';
      for (const f of this.flashes) {
        const k = 1 - f.t / f.dur;
        const g = ctx.createRadialGradient(f.x, f.y, 0, f.x, f.y, f.r);
        g.addColorStop(0, `rgba(${f.color},${0.8 * k})`); g.addColorStop(1, `rgba(${f.color},0)`);
        ctx.fillStyle = g; ctx.beginPath(); ctx.arc(f.x, f.y, f.r, 0, TAU); ctx.fill();
      }
      ctx.globalCompositeOperation = 'source-over';
      // rings
      for (const r of this.rings) {
        const k = r.t / r.dur;
        const rad = U.lerp(r.r0, r.r1, U.easeOutCubic(k));
        ctx.strokeStyle = r.c + (1 - k) + ')';
        ctx.lineWidth = r.w * (1 - k * 0.6);
        ctx.beginPath(); ctx.arc(r.x, r.y, rad, 0, TAU); ctx.stroke();
      }
      // particles
      for (const p of this.particles) {
        const k = p.t / p.life;
        if (p.kind === 'smoke') {
          ctx.globalAlpha = (1 - k) * 0.9;
          ctx.fillStyle = p.color;
          ctx.beginPath(); ctx.arc(p.x, p.y, p.size * (0.6 + k * 1.2), 0, TAU); ctx.fill();
        } else if (p.kind === 'ember') {
          ctx.globalAlpha = 1 - k;
          ctx.fillStyle = p.color;
          ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
        } else {
          ctx.globalAlpha = 1 - k * k;
          ctx.fillStyle = p.color;
          const s = p.size * (1 - k * 0.5);
          ctx.fillRect(p.x - s / 2, p.y - s / 2, s, s);
        }
      }
      ctx.globalAlpha = 1;
      // lightning
      ctx.lineCap = 'round'; ctx.lineJoin = 'round';
      for (const b of this.bolts) {
        const k = 1 - b.t / b.dur;
        ctx.globalCompositeOperation = 'lighter';
        ctx.strokeStyle = `rgba(120,190,255,${0.5 * k})`; ctx.lineWidth = 7 * k + 1;
        this._poly(ctx, b.pts);
        ctx.strokeStyle = `rgba(230,248,255,${k})`; ctx.lineWidth = 2;
        this._poly(ctx, b.pts);
        ctx.globalCompositeOperation = 'source-over';
      }
    }
    _poly(ctx, pts) {
      ctx.beginPath(); ctx.moveTo(pts[0].x, pts[0].y);
      for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
      ctx.stroke();
    }
    drawNumbers(ctx) {
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      for (const n of this.numbers) {
        const k = n.t / n.life;
        const pop = n.crit ? 1 + Math.max(0, 0.5 - k * 3) : 1;
        ctx.globalAlpha = k > 0.6 ? 1 - (k - 0.6) / 0.4 : 1;
        ctx.font = `bold ${Math.round(n.size * pop)}px Cinzel, Georgia, serif`;
        ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(20,10,5,0.85)';
        ctx.strokeText(n.text, n.x, n.y);
        ctx.fillStyle = n.color; ctx.fillText(n.text, n.x, n.y);
      }
      ctx.globalAlpha = 1;
    }
  }
  SR.FX = FX;
})(window.SR);
