'use strict';
// Projectile simulation and damage resolution for both sides.
(function (SR) {
  const U = SR.U, TAU = Math.PI * 2;
  const tmp = [];

  const Combat = {
    updatePlayerProjectiles(game, dt) {
      const list = game.pproj;
      for (let i = 0; i < list.length; i++) {
        const p = list[i];
        if (p.dead) continue;
        switch (p.kind) {
          case 'bolt': case 'quarrel': this.straight(game, p, dt); break;
          case 'fireball': this.fireball(game, p, dt); break;
          case 'shell': this.shell(game, p, dt); break;
        }
      }
      U.compact(list, (p) => !p.dead);
    },

    trail(p, max) {
      if (!p.trail) p.trail = [];
      p.trail.push(p.x, p.y);
      if (p.trail.length > max * 2) p.trail.splice(0, 2);
    },

    hitTest(game, p, cb) {
      const near = game.grid.query(p.x, p.y, p.r + 40, tmp);
      for (let i = 0; i < near.length; i++) {
        const e = near[i];
        if (e.dead) continue;
        if (p.hit && p.hit.has(e.id)) continue;
        const rr = e.r + p.r;
        if (U.dist2(p.x, p.y, e.x, e.y) < rr * rr) { if (cb(e) === false) return; }
      }
    },

    straight(game, p, dt) {
      this.trail(p, p.kind === 'bolt' ? 6 : 4);
      p.x += p.vx * dt; p.y += p.vy * dt;
      p.life -= dt;
      if (p.life <= 0) { p.dead = true; return; }
      if (!p.hit) p.hit = new Set();
      this.hitTest(game, p, (e) => {
        p.hit.add(e.id);
        const sp = Math.hypot(p.vx, p.vy) || 1;
        game.damageEnemy(e, p.dmg, { weapon: p.weapon, kb: p.kb, kx: p.vx / sp, ky: p.vy / sp, armorPierce: p.armorPierce, critBonus: p.critBonus });
        game.fx.burst(p.x, p.y, 3, p.color || '#fff', 90, 2, 0.25);
        if (p.ricochet > 0) {
          p.ricochet--;
          const next = game.findNearestExcept(p.x, p.y, 260, p.hit);
          if (next) {
            const a = U.angleTo(p.x, p.y, next.x, next.y);
            p.vx = Math.cos(a) * sp; p.vy = Math.sin(a) * sp; p.life = 0.5; p.trail = null;
            return false;
          }
        }
        if (p.pierce > 0) { p.pierce--; return true; }
        p.dead = true;
        return false;
      });
    },

    fireball(game, p, dt) {
      this.trail(p, 8);
      if (!p.target || p.target.dead) p.target = game.findNearestExcept(p.x, p.y, 380, null);
      if (p.target) {
        const want = U.angleTo(p.x, p.y, p.target.x, p.target.y);
        const cur = Math.atan2(p.vy, p.vx);
        const na = cur + U.clamp(U.angleDiff(cur, want), -5 * dt, 5 * dt);
        p.vx = Math.cos(na) * p.speed; p.vy = Math.sin(na) * p.speed;
      }
      p.x += p.vx * dt; p.y += p.vy * dt;
      p.life -= dt;
      if (Math.random() < 0.6) game.fx.particle({ x: p.x, y: p.y, vx: U.rand(-20, 20), vy: U.rand(-20, 20), color: U.choice(['#ff8a3a', '#ffcf6a', '#ff4d1a']), size: 3.5, life: 0.35, kind: 'ember' });
      if (p.life <= 0) { p.dead = true; return; }
      this.hitTest(game, p, (e) => {
        p.dead = true;
        this.fireImpact(game, p, e);
        return false;
      });
    },
    fireImpact(game, p, e) {
      game.damageEnemy(e, p.dmg, { weapon: p.weapon, burn: p.burn });
      for (const o of game.queryEnemies(p.x, p.y, p.splash + 20)) {
        if (o === e || o.dead) continue;
        if (U.dist2(o.x, o.y, p.x, p.y) < (p.splash + o.r) ** 2) game.damageEnemy(o, p.dmg * 0.4, { weapon: p.weapon, burn: p.burn * 0.6 });
      }
      game.fx.burst(p.x, p.y, 12, '#ff9a2e', 140, 3, 0.4);
      game.fx.flashes.push({ x: p.x, y: p.y, r: 50, t: 0, dur: 0.15, color: '255,140,50' });
      if (p.pool) game.zones.push({ x: p.x, y: p.y, r: 42, t: 0, dur: 2.6, dps: p.burn * 0.7, tick: 0, weapon: p.weapon });
    },

    shell(game, p, dt) {
      p.t += dt;
      const k = Math.min(1, p.t / p.dur);
      p.x = U.lerp(p.x0, p.tx, k); p.y = U.lerp(p.y0, p.ty, k);
      p.z = Math.sin(k * Math.PI) * (40 + p.dur * 80);
      if (Math.random() < 0.5) game.fx.particle({ x: p.x, y: p.y - p.z, vx: U.rand(-8, 8), vy: U.rand(-8, 8), color: 'rgba(120,115,110,0.4)', size: 4, life: 0.5, kind: 'smoke', drag: 1 });
      if (k >= 1) {
        p.dead = true;
        this.explode(game, p.tx, p.ty, p.radius, p.dmg, { weapon: p.weapon, kb: 140 });
        if (p.cluster) {
          for (let i = 0; i < 3; i++) {
            const a = Math.random() * TAU, d = U.rand(40, 85);
            game.addPlayerProjectile({ kind: 'shell', x: p.tx, y: p.ty, x0: p.tx, y0: p.ty, tx: p.tx + Math.cos(a) * d, ty: p.ty + Math.sin(a) * d, t: 0, dur: 0.35 + i * 0.05, dmg: p.dmg * 0.4, radius: p.radius * 0.55, cluster: false, weapon: p.weapon, r: 5, small: true });
          }
        }
      }
    },

    explode(game, x, y, radius, dmg, opts = {}) {
      for (const e of game.queryEnemies(x, y, radius + 40)) {
        if (e.dead) continue;
        const d = U.dist(x, y, e.x, e.y);
        if (d > radius + e.r) continue;
        const fall = 1 - 0.4 * U.clamp(d / radius, 0, 1);
        const dx = (e.x - x) / (d || 1), dy = (e.y - y) / (d || 1);
        game.damageEnemy(e, dmg * fall, { weapon: opts.weapon, kb: opts.kb || 0, kx: dx, ky: dy, canCrit: opts.canCrit });
      }
      game.fx.explosion(x, y, radius, opts);
      game.shake(Math.min(9, radius / 14));
      SR.Audio.play('explosion', { big: radius > 100 });
    },

    chainLightning(game, x, y, first, o) {
      const pts = [{ x, y }];
      const hit = new Set();
      let cur = first, dmg = o.dmg;
      for (let i = 0; i <= o.chains && cur; i++) {
        hit.add(cur.id);
        pts.push({ x: cur.x, y: cur.y - cur.r * 0.4 });
        game.damageEnemy(cur, dmg, { weapon: o.weapon, stun: o.stun && Math.random() < o.stun ? 0.6 : 0 });
        game.fx.burst(cur.x, cur.y, 5, '#bfe8ff', 110, 2, 0.3);
        dmg *= 0.88;
        cur = game.findNearestExcept(cur.x, cur.y, 190, hit);
      }
      game.fx.lightning(pts);
    },

    updateEnemyProjectiles(game, dt) {
      const c = game.castle;
      for (const p of game.eproj) {
        if (p.dead) continue;
        p.t += dt;
        if (p.kind === 'boulder') {
          const k = Math.min(1, p.t / p.dur);
          p.x = U.lerp(p.x0, p.tx, k); p.y = U.lerp(p.y0, p.ty, k);
          p.z = Math.sin(k * Math.PI) * 220;
          if (k >= 1) {
            p.dead = true;
            game.fx.explosion(p.tx, p.ty, 50, { c1: '#c9b994', c2: '#7a6a56', color: '200,170,120' });
            if (U.dist(p.tx, p.ty, c.x, c.y) < p.radius + c.hitR * 0.5) game.damageCastle(p.dmg, p);
            game.shake(4);
          }
          continue;
        }
        p.x += p.vx * dt; p.y += p.vy * dt;
        p.life -= dt;
        if (p.life <= 0) { p.dead = true; continue; }
        if (U.dist2(p.x, p.y, c.x, c.y + c.bob) < (c.hitR * 0.72) ** 2) {
          p.dead = true;
          game.damageCastle(p.dmg, p);
          game.fx.burst(p.x, p.y, 5, '#c9b994', 80, 2, 0.3);
        }
      }
      U.compact(game.eproj, (p) => !p.dead);
    },

    updateZones(game, dt) {
      for (const z of game.zones) {
        z.t += dt; z.tick += dt;
        if (z.tick >= 0.35) {
          z.tick = 0;
          for (const e of game.queryEnemies(z.x, z.y, z.r + 20)) {
            if (!e.dead && !e.flying && U.dist2(e.x, e.y, z.x, z.y) < (z.r + e.r) ** 2) game.damageEnemy(e, z.dps * 0.35, { weapon: z.weapon, canCrit: false, small: true, color: '#ff9a3a', noArmor: true });
          }
        }
        if (Math.random() < 0.5) game.fx.particle({ x: z.x + U.rand(-z.r, z.r) * 0.8, y: z.y + U.rand(-z.r, z.r) * 0.45, vy: U.rand(-50, -20), color: U.choice(['#ff8a3a', '#ffcf6a', '#ff4d1a']), size: 3, life: 0.5, kind: 'ember', drag: 0.3 });
      }
      U.compact(game.zones, (z) => z.t < z.dur);
    },
  };
  SR.Combat = Combat;
})(window.SR);
