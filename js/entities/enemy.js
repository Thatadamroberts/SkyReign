'use strict';
// Enemy creation and AI. Each behaviour is a small routine; add new ones to BEHAVIORS.
(function (SR) {
  const U = SR.U, TAU = Math.PI * 2;
  let nextId = 1;

  SR.createEnemy = function (game, type, x, y, opts = {}) {
    const def = SR.ENEMIES[type];
    const dir = game.director;
    const elite = !!opts.elite;
    const hpMult = dir.hpMult() * (elite ? 7 : 1) * (opts.hpMult || 1);
    const dmgMult = dir.dmgMult() * (elite ? 1.5 : 1);
    const scale = (elite ? 1.3 : 1) * (opts.scale || 1);
    const hp = def.hp * hpMult;
    return {
      id: nextId++, type, def, x, y, kx: 0, ky: 0,
      hp, maxHp: hp, dmg: def.damage * dmgMult,
      speed: def.speed * (opts.speedMult || 1) * U.rand(0.92, 1.08) * (1 + Math.min(0.35, game.time / 2400)),
      r: def.radius * scale, scale, armor: def.armor,
      xp: def.xp * (elite ? 10 : 1), elite, boss: !!def.boss, flying: !!def.flying,
      cd: def.attackCd * U.rand(0.4, 1), flash: 0, t: Math.random() * 10, facing: 1,
      burn: 0, burnT: 0, burnTick: 0, stun: 0, aura: 0, buff: 0,
      chargeT: 0, chargeCd: U.rand(2, 5), armAng: -2.3, armAnim: 0, healCd: 2,
      summonCd: 8, volleyCd: 3, enraged: false, wob: Math.random() * TAU, attackAnim: 0,
      name: opts.name || def.name, dead: false, final: !!opts.final,
    };
  };

  function moveToward(e, tx, ty, speed, dt) {
    const dx = tx - e.x, dy = ty - e.y, d = Math.hypot(dx, dy) || 1;
    e.x += dx / d * speed * dt; e.y += dy / d * speed * dt;
    if (Math.abs(dx) > 2) e.facing = dx > 0 ? 1 : -1;
  }

  function enemyShoot(game, e, kind, speed, dmg, spreadAng = 0) {
    const c = game.castle;
    const sx = e.x + e.facing * e.r * 0.6, sy = e.y - e.r * 0.6;
    const a = U.angleTo(sx, sy, c.x, c.y) + spreadAng + U.rand(-0.03, 0.03);
    const d = U.dist(sx, sy, c.x, c.y);
    game.eproj.push({ kind, x: sx, y: sy, vx: Math.cos(a) * speed, vy: Math.sin(a) * speed, dmg, life: (d + 300) / speed, t: 0, total: d / speed });
  }

  const BEHAVIORS = {
    melee(e, dt, game, d, c) {
      const reach = c.hitR + e.r * 0.6;
      if (d > reach) {
        let sp = e.speed * (e.buff > 0 ? 1.3 : 1);
        if (e.def.charge) {
          e.chargeCd -= dt;
          if (e.chargeT > 0) { e.chargeT -= dt; sp *= 2.6; if (Math.random() < 0.4) game.fx.particle({ x: e.x, y: e.y + e.r * 0.6, vx: U.rand(-20, 20), vy: U.rand(-20, 0), color: 'rgba(160,140,110,0.5)', size: 5, life: 0.5, kind: 'smoke' }); }
          else if (e.chargeCd <= 0 && d < 340 && d > reach + 50) { e.chargeT = 0.9; e.chargeCd = U.rand(4, 6); }
        }
        moveToward(e, c.x, c.y, sp, dt);
      } else {
        e.chargeT = 0;
        e.cd -= dt;
        if (e.cd <= 0) {
          e.cd = e.def.attackCd;
          e.attackAnim = 0.2;
          game.damageCastle(e.dmg, e);
          if (c.stats.thorns > 0) game.damageEnemy(e, c.stats.thorns * (1 + c.stats.armor * 3) * (1 + game.time / 600), { canCrit: false, color: '#c9d2de' });
        }
      }
    },
    ranged(e, dt, game, d, c) {
      const range = e.def.range;
      if (d > range * 0.9) moveToward(e, c.x, c.y, e.speed * (e.buff > 0 ? 1.3 : 1), dt);
      else if (d < range * 0.45) moveToward(e, e.x * 2 - c.x, e.y * 2 - c.y, e.speed * 0.6, dt);
      else {
        // strafe slowly
        const a = U.angleTo(c.x, c.y, e.x, e.y) + (e.id % 2 ? 1 : -1) * 0.25 * dt;
        e.x = c.x + Math.cos(a) * d; e.y = c.y + Math.sin(a) * d;
        e.facing = c.x > e.x ? 1 : -1;
      }
      if (d <= range) {
        e.cd -= dt;
        if (e.cd <= 0) {
          e.cd = e.def.attackCd * U.rand(0.85, 1.15);
          e.attackAnim = 0.25;
          enemyShoot(game, e, e.def.proj, e.def.projSpeed, e.dmg);
        }
      }
    },
    support(e, dt, game, d, c) {
      const range = e.def.range;
      if (d > range) moveToward(e, c.x, c.y, e.speed, dt);
      else if (d < range * 0.6) moveToward(e, e.x * 2 - c.x, e.y * 2 - c.y, e.speed * 0.7, dt);
      else e.facing = c.x > e.x ? 1 : -1;
      // fortification aura: nearby allies take reduced damage
      const near = game.queryEnemies(e.x, e.y, e.def.aura);
      for (const o of near) if (o !== e && U.dist2(o.x, o.y, e.x, e.y) < e.def.aura * e.def.aura) o.aura = 0.4;
      e.healCd -= dt;
      if (e.healCd <= 0) {
        e.healCd = e.def.attackCd;
        let healed = false;
        for (const o of near) {
          if (o === e || o.dead || o.boss || o.hp >= o.maxHp) continue;
          if (U.dist2(o.x, o.y, e.x, e.y) > e.def.aura * e.def.aura) continue;
          o.hp = Math.min(o.maxHp, o.hp + o.maxHp * 0.12);
          game.fx.particle({ x: o.x, y: o.y - o.r, vy: -40, color: '#7dff8a', size: 3, life: 0.6, kind: 'ember', drag: 0 });
          healed = true;
        }
        if (healed) game.fx.ring(e.x, e.y, 10, e.def.aura, 0.6, 'rgba(120,255,140,', 1);
      }
    },
    siege(e, dt, game, d, c) {
      const range = e.def.range;
      if (d > range * 0.85) moveToward(e, c.x, c.y, e.speed, dt);
      else e.facing = c.x > e.x ? 1 : -1;
      e.armAnim = Math.max(0, e.armAnim - dt);
      e.armAng = e.armAnim > 0 ? U.lerp(-2.3, 0.6, 1 - e.armAnim / 0.5) : U.lerp(e.armAng, -2.3, dt * 1.5);
      if (d <= range) {
        e.cd -= dt;
        if (e.cd <= 0) {
          e.cd = e.def.attackCd * U.rand(0.9, 1.2);
          e.armAnim = 0.5;
          // lob a boulder where the castle will roughly be
          const tx = c.x + c.vx * 0.8 + U.rand(-25, 25), ty = c.y + c.vy * 0.8 + U.rand(-25, 25);
          const dur = U.clamp(d / 380, 1.3, 2.2);
          game.eproj.push({ kind: 'boulder', x: e.x, y: e.y - 30, x0: e.x, y0: e.y - 30, tx, ty, t: 0, dur, dmg: e.dmg, radius: 70 });
          SR.Audio.play('boulder');
        }
      }
    },
    flyer(e, dt, game, d, c) {
      e.wob += dt * 3;
      const reach = c.hitR * 0.8 + e.r;
      if (d > reach) {
        const a = U.angleTo(e.x, e.y, c.x, c.y) + Math.sin(e.wob) * 0.6;
        e.x += Math.cos(a) * e.speed * dt; e.y += Math.sin(a) * e.speed * dt;
        e.facing = Math.cos(a) > 0 ? 1 : -1;
      } else {
        // circle the castle while breathing fire
        const a = U.angleTo(c.x, c.y, e.x, e.y) + dt * 1.2;
        e.x = c.x + Math.cos(a) * reach; e.y = c.y + Math.sin(a) * reach;
        e.facing = c.x > e.x ? 1 : -1;
        e.cd -= dt;
        if (e.cd <= 0) {
          e.cd = e.def.attackCd;
          e.attackAnim = 0.3;
          game.damageCastle(e.dmg, e);
          const ang = U.angleTo(e.x, e.y, c.x, c.y);
          for (let i = 0; i < 8; i++) {
            const s = U.rand(80, 200), aa = ang + U.rand(-0.35, 0.35);
            game.fx.particle({ x: e.x + e.facing * 14, y: e.y - 6, vx: Math.cos(aa) * s, vy: Math.sin(aa) * s, color: U.choice(['#ff8a3a', '#ffcf6a', '#ff4d1a']), size: 4, life: 0.4, kind: 'ember' });
          }
        }
      }
    },
    boss(e, dt, game, d, c) {
      if (!e.enraged && e.hp < e.maxHp * 0.5) {
        e.enraged = true;
        game.announce(`${e.name} is enraged!`, 'boss');
        SR.Audio.play('horn');
        game.fx.ring(e.x, e.y, 20, 260, 0.8, 'rgba(255,80,60,', 5);
      }
      const rage = e.enraged ? 1.45 : 1;
      if (e.chargeT > 0) {
        e.chargeT -= dt;
        moveToward(e, e.cx, e.cy, e.speed * 5, dt);
        if (Math.random() < 0.6) game.fx.smoke(e.x, e.y + 20, 1, 12, 'rgba(150,130,100,0.5)', 0.8);
        if (d < c.hitR + e.r) { e.chargeT = 0; game.damageCastle(e.dmg * 1.3, e); game.shake(12); }
      } else if (d > 260) moveToward(e, c.x, c.y, e.speed * rage, dt);
      else {
        const a = U.angleTo(c.x, c.y, e.x, e.y) + dt * 0.4;
        e.x = c.x + Math.cos(a) * d; e.y = c.y + Math.sin(a) * d;
        e.facing = c.x > e.x ? 1 : -1;
      }
      e.volleyCd -= dt * rage;
      if (e.volleyCd <= 0 && d < 520) {
        e.volleyCd = e.def.attackCd;
        const n = e.enraged ? 11 : 7;
        for (let i = 0; i < n; i++) enemyShoot(game, e, 'warbolt', 400, e.dmg * 0.25, (i - (n - 1) / 2) * 0.13);
        e.attackAnim = 0.3;
      }
      e.summonCd -= dt * rage;
      if (e.summonCd <= 0 && game.enemies.length < game.director.maxAlive()) {
        e.summonCd = 10;
        const type = game.time > 500 ? 'royalGuard' : 'knight';
        const n = game.time > 500 ? 3 : 4;
        for (let i = 0; i < n; i++) {
          const a = i / n * TAU;
          game.addEnemy(SR.createEnemy(game, i % 2 ? 'infantry' : type, e.x + Math.cos(a) * 60, e.y + Math.sin(a) * 60));
        }
        game.fx.ring(e.x, e.y, 20, 200, 0.7, 'rgba(240,207,122,', 4);
        // war horn: nearby allies hasten
        for (const o of game.queryEnemies(e.x, e.y, 320)) o.buff = 5;
        SR.Audio.play('horn');
      }
      e.chargeCd -= dt * rage;
      if (e.chargeCd <= 0 && d > 150 && d < 500) {
        e.chargeCd = e.enraged ? 6 : 9;
        e.chargeT = 0.8; e.cx = c.x + (c.x - e.x) * 0.3; e.cy = c.y + (c.y - e.y) * 0.3;
        game.fx.ring(e.x, e.y, 10, 90, 0.4, 'rgba(255,90,60,', 3);
      }
    },
  };

  SR.updateEnemy = function (e, dt, game) {
    const c = game.castle;
    e.t += dt;
    e.flash = Math.max(0, e.flash - dt);
    e.aura = Math.max(0, e.aura - dt);
    e.buff = Math.max(0, e.buff - dt);
    e.attackAnim = Math.max(0, e.attackAnim - dt);
    // burning
    if (e.burnT > 0) {
      e.burnT -= dt; e.burnTick += dt;
      if (e.burnTick >= 0.4) {
        e.burnTick = 0;
        game.damageEnemy(e, e.burn * 0.4, { canCrit: false, color: '#ff9a3a', small: true, noArmor: true });
        if (Math.random() < 0.7) game.fx.particle({ x: e.x + U.rand(-e.r, e.r) * 0.5, y: e.y - e.r * 0.5, vy: -50, vx: U.rand(-10, 10), color: U.choice(['#ff8a3a', '#ffcf6a']), size: 3, life: 0.45, kind: 'ember', drag: 0.5 });
      }
      if (e.dead) return;
    }
    // knockback velocity
    if (e.kx || e.ky) {
      e.x += e.kx * dt; e.y += e.ky * dt;
      const k = Math.max(0, 1 - dt * 8);
      e.kx *= k; e.ky *= k;
      if (Math.abs(e.kx) < 2 && Math.abs(e.ky) < 2) { e.kx = 0; e.ky = 0; }
    }
    if (e.stun > 0) { e.stun -= dt; return; }
    const d = U.dist(e.x, e.y, c.x, c.y);
    BEHAVIORS[e.def.behavior](e, dt, game, d, c);
  };
  SR.ENEMY_BEHAVIORS = BEHAVIORS;
})(window.SR);
