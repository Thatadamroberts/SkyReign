'use strict';
// The player's floating castle: stats, movement, weapon slots, damage handling.
(function (SR) {
  const U = SR.U;

  SR.MAX_SLOTS = 5;
  SR.SLOT_LEVELS = [6, 14, 22]; // castle levels that construct a new weapon tower
  SR.BASE_STATS = {
    maxHp: 200, armor: 0, regen: 0, speed: 210, pickup: 115,
    goldMult: 1, xpMult: 1, dmgMult: 1, rateMult: 1, rangeMult: 1, projBonus: 0,
    critChance: 0.05, critMult: 1.75, luck: 0, thorns: 0, lifeOnKill: 0, deathBlast: 0,
    aegisCd: 0, revives: 0,
  };

  class Castle {
    constructor() {
      this.x = 0; this.y = 0; this.vx = 0; this.vy = 0;
      this.stats = Object.assign({}, SR.BASE_STATS);
      this.baseMaxHp = this.stats.maxHp;
      this.hp = this.stats.maxHp;
      this.weapons = new Array(SR.MAX_SLOTS).fill(null);
      this.baseSlots = 2;
      this.slotsBought = 0;
      this.bonusSlots = 0;
      this.level = 1;
      this.xp = 0;
      this.xpNext = Castle.xpFor(1);
      this.gold = 0;
      this.speedTier = 0;
      this.magnetTier = 0;
      this.flash = 0;
      this.invuln = 0;
      this.aegisTimer = 0;
      this.aegisReady = false;
      this.tilt = 0;
      this.bob = 0;
      this.art = null;
      this.sig = '';
      this.dirty = true;
      this.smokeT = 0;
    }

    static xpFor(level) { return Math.floor(7 + (level - 1) * 5 + Math.pow(level, 1.55)); }

    get hitR() { return this.art ? this.art.R * 1.02 : 48; }

    slotCount() {
      const fromLevel = SR.SLOT_LEVELS.filter((l) => this.level >= l).length;
      return Math.min(SR.MAX_SLOTS, this.baseSlots + this.slotsBought + this.bonusSlots + fromLevel);
    }
    freeSlots() {
      let n = 0;
      for (let i = 0; i < this.slotCount(); i++) if (!this.weapons[i]) n++;
      return n;
    }
    getWeapon(type) { return this.weapons.find((w) => w && w.type === type) || null; }
    ownedWeapons() { return this.weapons.filter(Boolean); }
    addWeapon(type) {
      if (this.getWeapon(type)) return null;
      for (let i = 0; i < this.slotCount(); i++) {
        if (!this.weapons[i]) {
          const w = SR.createWeapon(type);
          w.slot = i;
          this.weapons[i] = w;
          this.markDirty();
          return w;
        }
      }
      return null;
    }
    markDirty() { this.dirty = true; }
    heal(n) {
      const before = this.hp;
      this.hp = Math.min(this.stats.maxHp, this.hp + n);
      return this.hp - before;
    }

    visualConfig() {
      const s = this.stats;
      const wallTier = U.clamp(Math.floor((s.maxHp / this.baseMaxHp - 1) / 0.25), 0, 6);
      const slots = this.slotCount();
      return {
        R: 52 + wallTier * 3.5 + (slots - 2) * 2.5,
        wallTier,
        armorTier: U.clamp(Math.floor(s.armor / 0.1 + 0.001), 0, 5),
        regenTier: s.regen > 0 ? Math.min(3, 1 + Math.floor(s.regen / 1.5)) : 0,
        magnetTier: Math.min(4, this.magnetTier),
        speedTier: Math.min(4, this.speedTier),
        slots,
        level: this.level >= 15 ? 15 : this.level >= 8 ? 8 : this.level >= 3 ? 3 : 1,
        thorns: s.thorns > 0,
      };
    }
    ensureArt() {
      if (!this.dirty && this.art) return;
      this.dirty = false;
      const cfg = this.visualConfig();
      const sig = JSON.stringify(cfg);
      if (sig === this.sig && this.art) return;
      const firstBuild = !this.art;
      this.sig = sig;
      this.art = SR.CastleArt.build(cfg);
      if (!firstBuild && SR.Game && SR.Game.fx) {
        // construction dust when the castle evolves
        const fx = SR.Game.fx;
        for (let i = 0; i < 18; i++) fx.smoke(this.x + U.rand(-cfg.R, cfg.R), this.y + U.rand(-cfg.R * 0.6, cfg.R * 0.4), 1, 8, 'rgba(220,210,190,0.55)', 0.9);
        fx.burst(this.x, this.y - cfg.R * 0.3, 20, '#f0cf7a', 140, 2.5, 0.7);
      }
    }
    mountPos(i) {
      const m = this.art && this.art.mounts[i];
      if (!m) return { x: this.x, y: this.y };
      return { x: this.x + m.x, y: this.y + m.y + this.bob };
    }

    update(dt, game) {
      const ax = SR.Input.axis();
      const sp = this.stats.speed;
      const k = Math.min(1, dt * 7);
      this.vx += (ax.x * sp - this.vx) * k;
      this.vy += (ax.y * sp - this.vy) * k;
      this.x += this.vx * dt;
      this.y += this.vy * dt;
      this.tilt += (this.vx / sp * 0.05 - this.tilt) * Math.min(1, dt * 5);
      this.bob = Math.sin(game.time * 1.6) * 3;

      if (this.stats.regen > 0 && this.hp > 0) this.hp = Math.min(this.stats.maxHp, this.hp + this.stats.regen * dt);
      if (this.stats.aegisCd > 0 && !this.aegisReady) {
        this.aegisTimer += dt;
        if (this.aegisTimer >= this.stats.aegisCd) { this.aegisReady = true; this.aegisTimer = 0; }
      }
      this.flash = Math.max(0, this.flash - dt * 4);
      this.invuln = Math.max(0, this.invuln - dt);

      // damage smoke & fire
      const frac = this.hp / this.stats.maxHp;
      if (frac < 0.6 && this.art) {
        this.smokeT -= dt;
        if (this.smokeT <= 0) {
          this.smokeT = frac < 0.3 ? 0.06 : 0.18;
          const R = this.art.R;
          const px = this.x + U.rand(-R * 0.8, R * 0.8), py = this.y + U.rand(-R * 0.9, R * 0.2) + this.bob;
          game.fx.smoke(px, py, 1, 7, frac < 0.3 ? 'rgba(40,35,32,0.6)' : 'rgba(90,85,80,0.45)', 1.3);
          if (frac < 0.3) game.fx.particle({ x: px, y: py, vx: U.rand(-10, 10), vy: U.rand(-60, -30), color: U.choice(['#ff8a3a', '#ffcf6a', '#ff4d1a']), size: 3, life: 0.5, kind: 'ember', drag: 1 });
        }
      }

      // weapons
      for (let i = 0; i < this.weapons.length; i++) {
        const w = this.weapons[i];
        if (w) this.updateWeapon(w, i, dt, game);
      }
    }

    updateWeapon(w, slot, dt, game) {
      const def = SR.WEAPONS[w.type];
      const st = SR.weaponStats(w, this);
      w.cd -= dt;
      w.recoil = Math.max(0, w.recoil - dt * 3.5);
      const m = this.mountPos(slot);
      const manual = def.aimable && game.manualAim;
      let target = null, ang = null;
      if (manual) {
        ang = U.angleTo(m.x, m.y, game.mouseWorld.x, game.mouseWorld.y);
      } else {
        target = game.findTarget(m.x, m.y, st.range, def.targeting);
        if (target) ang = U.angleTo(m.x, m.y, target.x, target.y);
      }
      if (ang != null) {
        const d = U.angleDiff(w.aim, ang);
        w.aim += d * Math.min(1, dt * 14);
      }
      if (w.cd <= 0 && ang != null) {
        def.fire(w, st, game, m, target, ang);
        w.cd = st.cooldown;
        w.recoil = 1;
      }
    }
  }
  SR.Castle = Castle;
})(window.SR);
