'use strict';
// The Director controls pacing: enemy scaling, spawn rates, army surges,
// elite encounters and boss fights.
(function (SR) {
  const U = SR.U, TAU = Math.PI * 2;

  SR.BOSS_INTERVAL = 300;      // a General every 5 minutes
  SR.FINAL_BOSS_TIME = 1200;   // the King's Champion at 20:00 — defeating it wins the run

  class Director {
    constructor(game) {
      this.game = game;
      this.spawnAcc = 0;
      this.nextElite = 95;
      this.nextSurge = 58;
      this.bossIndex = 0;
      this.nextBoss = SR.BOSS_INTERVAL;
      this.bossWarned = false;
      this.boss = null;
    }
    minutes() { return this.game.time / 60; }
    hpMult() { const m = this.minutes(); return 1 + 0.15 * m + 0.04 * m * m; }
    dmgMult() { const m = this.minutes(); return 1 + 0.09 * m + 0.004 * m * m; }
    spawnRate() { const m = this.minutes(); return 0.8 + 0.3 * m + 0.03 * m * m; }
    maxAlive() { return Math.min(420, 160 + this.minutes() * 18); }

    spawnRadius() {
      const g = this.game;
      return Math.hypot(g.viewW, g.viewH) / 2 + 60;
    }
    spawnPoint(angle, extra = 0) {
      const c = this.game.castle;
      const r = this.spawnRadius() + extra;
      return { x: c.x + Math.cos(angle) * r, y: c.y + Math.sin(angle) * r };
    }
    // Enemies prefer to come from behind the fleeing castle.
    spawnAngle() {
      const c = this.game.castle;
      const sp = Math.hypot(c.vx, c.vy);
      if (sp > 40 && Math.random() < 0.55) return Math.atan2(-c.vy, -c.vx) + U.rand(-0.9, 0.9);
      return Math.random() * TAU;
    }

    availableTypes() {
      const t = this.game.time;
      const out = [];
      for (const k in SR.ENEMIES) {
        const d = SR.ENEMIES[k];
        if (d.boss || t < d.unlock) continue;
        if (d.maxAlive && this.game.countType(k) >= d.maxAlive) continue;
        out.push(k);
      }
      return out;
    }

    spawnGroup(type, n, angle, opts = {}) {
      const g = this.game;
      const def = SR.ENEMIES[type];
      const p = this.spawnPoint(angle, def.behavior === 'siege' ? 120 : 0);
      for (let i = 0; i < n; i++) {
        const e = SR.createEnemy(g, type, p.x + U.rand(-45, 45), p.y + U.rand(-45, 45), opts);
        g.addEnemy(e);
      }
    }

    update(dt) {
      const g = this.game;
      const t = g.time;

      // ---- regular spawns
      if (g.enemies.length < this.maxAlive()) {
        this.spawnAcc += dt * this.spawnRate() * (this.boss ? 0.45 : 1);
        let guard = 0;
        while (this.spawnAcc >= 1 && guard++ < 10) {
          const types = this.availableTypes();
          const type = U.weightedPick(types, (k) => SR.ENEMIES[k].weight(t));
          if (!type) break;
          const [a, b] = SR.ENEMIES[type].group;
          const n = U.randInt(a, b);
          this.spawnGroup(type, n, this.spawnAngle());
          this.spawnAcc -= n;
        }
      }

      // ---- army surge
      if (t >= this.nextSurge) {
        this.nextSurge += 60;
        const m = this.minutes();
        const ang = Math.random() * TAU;
        const n = Math.floor(10 + m * 2.2);
        const types = this.availableTypes().filter((k) => SR.ENEMIES[k].behavior === 'melee' || SR.ENEMIES[k].behavior === 'ranged');
        for (let i = 0; i < n; i++) {
          const type = i % 4 === 3 && types.includes('knight') ? 'knight' : U.choice(types.length ? types : ['infantry']);
          const p = this.spawnPoint(ang + (i / n - 0.5) * 1.2, U.rand(0, 80));
          g.addEnemy(SR.createEnemy(g, type, p.x, p.y));
        }
        g.announce('The army charges!', 'warn');
        SR.Audio.play('warning');
      }

      // ---- elites
      if (t >= this.nextElite) {
        this.nextElite += Math.max(35, U.rand(70, 95) - this.minutes() * 2.5);
        const pool = this.availableTypes().filter((k) => k !== 'trebuchet');
        const prefer = pool.filter((k) => ['knight', 'royalGuard', 'wyvern', 'crossbowman'].includes(k));
        const type = U.choice(prefer.length ? prefer : pool);
        this.spawnGroup(type, 1, this.spawnAngle(), { elite: true });
        g.announce(`An elite ${SR.ENEMIES[type].name} approaches!`, 'elite');
        SR.Audio.play('warning');
      }

      // ---- bosses
      if (!this.boss && !this.bossWarned && t >= this.nextBoss - 8) {
        this.bossWarned = true;
        const name = this.bossName();
        g.announce(this.isFinal() ? `${name} rides out to end you!` : `${name} approaches...`, 'boss');
        SR.Audio.play('horn');
      }
      if (!this.boss && t >= this.nextBoss) {
        const final = this.isFinal();
        const p = this.spawnPoint(this.spawnAngle(), 40);
        const bossScale = 1 + this.bossIndex * 0.3 + (final ? 0.5 : 0);
        const e = SR.createEnemy(g, 'general', p.x, p.y, { hpMult: bossScale, name: this.bossName(), final, scale: final ? 1.2 : 1 });
        e.dmg *= 1 + this.bossIndex * 0.15;
        g.addEnemy(e);
        this.boss = e;
        this.bossWarned = false;
        // escort
        this.spawnGroup(t > 500 ? 'royalGuard' : 'knight', 2 + this.bossIndex, Math.atan2(e.y - g.castle.y, e.x - g.castle.x));
        g.shake(8);
      }
      if (this.boss && this.boss.dead) {
        this.boss = null;
        this.bossIndex++;
        this.nextBoss = t + SR.BOSS_INTERVAL;
      }
    }
    isFinal() { return !this.game.endless && this.nextBoss >= SR.FINAL_BOSS_TIME; }
    bossName() {
      if (this.isFinal()) return SR.BOSS_NAMES[3];
      if (this.bossIndex < 3) return SR.BOSS_NAMES[this.bossIndex];
      return `Warlord of the ${['North', 'East', 'South', 'West', 'Crown'][this.bossIndex % 5]}`;
    }
  }
  SR.Director = Director;
})(window.SR);
