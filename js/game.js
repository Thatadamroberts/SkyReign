'use strict';
// Game controller: state machine, main loop, run lifecycle and the gameplay API
// used by weapons, enemies and the UI (damage, drops, targeting, level-ups...).
(function (SR) {
  const U = SR.U, TAU = Math.PI * 2;

  const Game = {
    state: 'boot',
    time: 0,
    realTime: 0,
    last: 0,
    camera: { x: 0, y: 0 },
    shakeAmt: 0,
    viewW: 1500, viewH: 920,
    manualAim: false,
    mouseWorld: { x: 0, y: 0 },
    enemies: [], pproj: [], eproj: [], pickups: [], zones: [], pendingBlasts: [],
    grid: new U.Grid(64),

    init() {
      SR.Save.load();
      this.applySettings();
      const canvas = document.getElementById('game');
      SR.Input.init(canvas);
      SR.Renderer.init(canvas);
      SR.EnemyArt.init();
      SR.Clouds.init();
      SR.UI.init();
      this.fx = new SR.FX();
      this.toMenu();
      requestAnimationFrame((t) => { this.last = t; this.frame(t); });
      window.addEventListener('blur', () => { if (this.state === 'playing') this.pause(); });
      document.addEventListener('visibilitychange', () => { if (document.hidden && this.state === 'playing') this.pause(); });
    },

    applySettings() {
      const s = SR.Save.data.settings;
      SR.Audio.setEnabled(s.sound);
      SR.Audio.setVolume(s.volume);
    },

    // ------------------------------------------------------------ lifecycle
    resetWorld() {
      this.enemies = []; this.pproj = []; this.eproj = []; this.pickups = []; this.zones = []; this.pendingBlasts = [];
      this.fx.reset();
      this.shakeAmt = 0;
    },

    toMenu(silent) {
      this.state = 'menu';
      this.resetWorld();
      this.director = null;
      this.time = 0;
      // A fully fortified showcase castle drifts behind the menu.
      const c = new SR.Castle();
      c.stats.maxHp = c.baseMaxHp * 2.3; c.hp = c.stats.maxHp;
      c.stats.armor = 0.42; c.stats.regen = 2; c.stats.thorns = 5;
      c.magnetTier = 2; c.speedTier = 2; c.level = 15; c.slotsBought = 3;
      for (const t of SR.WEAPON_ORDER) { const w = c.addWeapon(t); if (w) w.lv.damage = 4; }
      c.x = 0; c.y = 0;
      this.castle = c;
      this.stats = this.newStats();
      SR.UI.showHUD(false);
      SR.UI.resetHUD();
      if (!silent) SR.UI.mainMenu();
    },

    newStats() { return { kills: 0, gold: 0, goldSpent: 0, bosses: 0, elites: 0, damage: 0, taken: 0, upgrades: 0, takenBy: {} }; },

    newRun(startWeapon) {
      if (this.starting) return;
      this.starting = true;
      SR.UI.fade(true);
      setTimeout(() => {
        this.starting = false;
        this.resetWorld();
        const c = new SR.Castle();
        const M = (id) => SR.Save.level(id);
        const s = c.stats;
        s.maxHp *= 1 + 0.1 * M('m_hp');
        c.baseMaxHp = s.maxHp; c.hp = s.maxHp;
        s.dmgMult += 0.06 * M('m_dmg');
        s.rateMult += 0.04 * M('m_rate');
        s.armor += 0.03 * M('m_armor');
        s.goldMult += 0.08 * M('m_greed');
        s.xpMult += 0.06 * M('m_xp');
        s.regen += 0.3 * M('m_regen');
        s.luck += M('m_luck');
        c.baseSlots += M('m_slot');
        c.gold = 40 * M('m_gold');
        const w = c.addWeapon(SR.Save.data.unlocked[startWeapon] ? startWeapon : 'ballista');
        w.lv.damage += M('m_veteran'); w.lv.rate += M('m_veteran');
        this.castle = c;
        this.rerolls = M('m_reroll');
        this.time = 0;
        this.stats = this.newStats();
        this.upgradeCounts = {};
        this.shopTiers = {};
        this.pendingLevels = 0;
        this.chestMode = false;
        this.endless = false;
        this.victoryTimer = 0;
        this.shopHinted = false;
        this.director = new SR.Director(this);
        this.camera.x = c.x; this.camera.y = c.y;
        SR.Terrain.pregen(c.x, c.y, 1100);
        c.ensureArt();
        this.state = 'playing';
        SR.UI.hide();
        SR.UI.resetHUD();
        SR.UI.showHUD(true);
        SR.UI.fade(false);
        SR.UI.announce('Take to the skies!', 'good');
        SR.UI.hint(('ontouchstart' in window) ? 'Drag anywhere to fly · weapons fire automatically' : 'WASD / Arrows to fly · weapons fire automatically · hold mouse to aim', 7000);
        SR.Audio.play('horn');
        SR.Save.data.runs++;
        SR.Save.save();
      }, 380);
    },

    pause() {
      if (this.state !== 'playing') return;
      this.state = 'paused';
      SR.UI.pause();
    },
    resume() {
      this.state = 'playing';
      SR.Input.mouse.down = false;
      SR.UI.hide();
    },
    openShop(fromPause) {
      if (this.state !== 'playing' && this.state !== 'paused') return;
      this.state = 'shop';
      SR.UI.shop(fromPause);
    },
    closeShop() {
      if (this.state !== 'shop') return;
      this.resume();
    },

    // ------------------------------------------------------------ main loop
    frame(ts) {
      const dt = Math.min(0.05, Math.max(0, (ts - this.last) / 1000));
      this.last = ts;
      this.realTime += dt;
      try {
        this.handleKeys();
        if (this.state === 'playing') this.update(dt);
        else if (this.state === 'dying') this.updateDying(dt);
        else if (this.state === 'menu') this.updateMenu(dt);
        else if (this.state === 'gameover') this.fx.update(dt);
        this.shakeAmt = Math.max(0, this.shakeAmt - dt * 30);
        SR.Renderer.draw(this);
        if (this.state !== 'menu' && this.state !== 'gameover') SR.UI.updateHUD(this);
      } catch (err) {
        console.error(err);
      }
      SR.Input.endFrame();
      requestAnimationFrame((t) => this.frame(t));
    },

    handleKeys() {
      const I = SR.Input, st = this.state, cur = SR.UI.current;
      if (I.wasPressed('KeyM')) { const s = SR.Save.data.settings; s.sound = !s.sound; SR.Save.save(); this.applySettings(); }
      if (I.wasPressed('Escape') || I.wasPressed('KeyP')) {
        if (st === 'playing') this.pause();
        else if (st === 'paused') { if (cur === 'pause') this.resume(); else SR.UI.pause(); }
        else if (st === 'shop') this.closeShop();
      }
      if (I.wasPressed('KeyB')) {
        if (st === 'playing') this.openShop();
        else if (st === 'shop') this.closeShop();
      }
      if (st === 'levelup') {
        for (let i = 0; i < 3; i++) if (I.wasPressed('Digit' + (i + 1)) || I.wasPressed('Numpad' + (i + 1))) { this.chooseUpgrade(i); return; }
        if (I.wasPressed('KeyR')) this.reroll();
      }
    },

    updateMenu(dt) {
      const c = this.castle;
      this.time += dt;
      const t = this.time;
      c.vx = Math.cos(t * 0.15) * 60; c.vy = Math.sin(t * 0.11) * 40 - 20;
      c.x += c.vx * dt; c.y += c.vy * dt;
      c.bob = Math.sin(t * 1.6) * 3;
      c.tilt = Math.sin(t * 0.3) * 0.02;
      c.ensureArt();
      c.weapons.forEach((w, i) => { if (w) { w.aim = Math.sin(t * 0.5 + i * 1.7) * 1.6 + (i % 2 ? Math.PI : 0); w.recoil = Math.max(0, w.recoil - dt * 3); } });
      const R = SR.Renderer;
      const wide = R.w > 900;
      const tx = c.x - (wide ? this.viewW * 0.27 : 0), ty = c.y + (wide ? 0 : -this.viewH * 0.3);
      this.camera.x += (tx - this.camera.x) * Math.min(1, dt * 3);
      this.camera.y += (ty - this.camera.y) * Math.min(1, dt * 3);
      this.fx.update(dt);
    },

    update(dt) {
      this.time += dt;
      const I = SR.Input, c = this.castle;
      this.manualAim = I.mouse.down && I.mouse.inside;
      this.mouseWorld = SR.Renderer.screenToWorld(I.mouse.x, I.mouse.y, this.camera);

      c.ensureArt();
      // spatial grid of live enemies (used by projectiles & AI queries)
      this.grid.clear();
      for (const e of this.enemies) if (!e.dead) this.grid.insert(e);

      c.update(dt, this);
      this.director.update(dt);

      for (let i = 0; i < this.enemies.length; i++) {
        const e = this.enemies[i];
        if (!e.dead) SR.updateEnemy(e, dt, this);
      }
      this.separate();

      SR.Combat.updatePlayerProjectiles(this, dt);
      SR.Combat.updateEnemyProjectiles(this, dt);
      SR.Combat.updateZones(this, dt);

      // chain-reaction explosions are resolved one frame later to avoid recursion
      if (this.pendingBlasts.length) {
        const list = this.pendingBlasts.splice(0, 6);
        for (const b of list) SR.Combat.explode(this, b.x, b.y, 70, b.dmg, { canCrit: false, kb: 60, c1: '#ff9a9a', c2: '#c0392b', color: '255,120,100' });
      }

      this.updatePickups(dt);
      this.recycleEnemies();
      U.compact(this.enemies, (e) => !e.dead);
      this.fx.update(dt);

      // camera with a little look-ahead
      const lx = c.x + c.vx * 0.35, ly = c.y + c.vy * 0.35;
      this.camera.x += (lx - this.camera.x) * Math.min(1, dt * 4);
      this.camera.y += (ly - this.camera.y) * Math.min(1, dt * 4);

      if (!this.shopHinted && c.gold >= 90 && c.freeSlots() > 0) {
        this.shopHinted = true;
        SR.UI.hint('You can afford a new weapon — press B to visit the Sky Merchant', 6000);
      }

      if (this.victoryTimer > 0) {
        this.victoryTimer -= dt;
        if (this.victoryTimer <= 0) { this.state = 'victory'; SR.Audio.play('victory'); SR.UI.victoryChoice(); return; }
      }
      if (this.state === 'playing' && this.pendingLevels > 0) this.openLevelUp();
    },

    // soft separation so troops form crowds instead of stacking
    separate() {
      const tmp = this._sepTmp || (this._sepTmp = []);
      for (const e of this.enemies) {
        if (e.dead || e.flying) continue;
        const near = this.grid.query(e.x, e.y, e.r + 20, tmp);
        let n = 0;
        for (const o of near) {
          if (o === e || o.dead || o.flying || o.id < e.id) continue;
          const dx = o.x - e.x, dy = o.y - e.y;
          const min = (e.r + o.r) * 0.8;
          const d2 = dx * dx + dy * dy;
          if (d2 >= min * min || d2 < 0.0001) continue;
          const d = Math.sqrt(d2), push = (min - d) * 0.5;
          const me = e.def.mass, mo = o.def.mass, tot = me + mo;
          const nx = dx / d, ny = dy / d;
          e.x -= nx * push * (mo / tot); e.y -= ny * push * (mo / tot);
          o.x += nx * push * (me / tot); o.y += ny * push * (me / tot);
          if (++n > 6) break;
        }
      }
    },

    // Troops left far behind are moved back into the fight (the army pursues).
    recycleEnemies() {
      if (!this.director) return;
      const c = this.castle;
      const far = this.director.spawnRadius() * 1.9;
      for (const e of this.enemies) {
        if (e.dead || e.boss) continue;
        if (U.dist2(e.x, e.y, c.x, c.y) > far * far) {
          const p = this.director.spawnPoint(this.director.spawnAngle());
          e.x = p.x; e.y = p.y;
        }
      }
    },

    updateDying(dt) {
      const c = this.castle;
      this.dyingT += dt;
      c.dying = this.dyingT;
      c.y += 30 * dt * this.dyingT;
      this.boomT -= dt;
      if (this.boomT <= 0 && this.dyingT < 2.4) {
        this.boomT = 0.16;
        const R = c.art ? c.art.R : 50;
        this.fx.explosion(c.x + U.rand(-R, R), c.y + U.rand(-R, R * 0.5), U.rand(30, 60));
        this.shake(6);
        SR.Audio.play('explosion');
      }
      this.fx.update(dt);
      c.flash = Math.max(0, c.flash - dt * 2);
      if (this.dyingT > 2.9) this.endRun(false);
    },

    // ------------------------------------------------------------ combat API
    shake(n) {
      if (!SR.Save.data.settings.shake) return;
      this.shakeAmt = Math.min(16, Math.max(this.shakeAmt, n));
    },
    addEnemy(e) { this.enemies.push(e); },
    addPlayerProjectile(p) { if (this.pproj.length < 700) this.pproj.push(p); },
    countType(type) { let n = 0; for (const e of this.enemies) if (!e.dead && e.type === type) n++; return n; },
    queryEnemies(x, y, r) { return this.grid.query(x, y, r, []); },
    chainLightning(x, y, first, o) { SR.Combat.chainLightning(this, x, y, first, o); },

    findTarget(x, y, range, mode) {
      const r2 = range * range;
      let best = null, bestV = -Infinity, count = 0;
      for (const e of this.enemies) {
        if (e.dead) continue;
        const d2 = U.dist2(x, y, e.x, e.y);
        if (d2 > r2) continue;
        if (mode === 'random' || mode === 'cluster') {
          count++;
          if (Math.random() * count < 1) best = e;
          continue;
        }
        const v = mode === 'strongest' ? (e.boss ? 1e9 : e.elite ? 1e7 : 0) + e.hp - d2 * 0.002 : -d2;
        if (v > bestV) { bestV = v; best = e; }
      }
      return best;
    },
    findTargets(x, y, range, mode, n) {
      const r2 = range * range;
      const list = [];
      for (const e of this.enemies) if (!e.dead && U.dist2(x, y, e.x, e.y) <= r2) list.push(e);
      if (!list.length) return list;
      if (mode === 'nearest') list.sort((a, b) => U.dist2(x, y, a.x, a.y) - U.dist2(x, y, b.x, b.y));
      else if (mode === 'cluster') {
        U.shuffle(list);
        const cand = list.slice(0, 24);
        const tmp = [];
        for (const e of cand) e._dens = this.grid.query(e.x, e.y, 70, tmp).length + (e.elite || e.boss ? 3 : 0);
        cand.sort((a, b) => b._dens - a._dens);
        return cand.slice(0, n);
      } else U.shuffle(list);
      return list.slice(0, n);
    },
    findNearestExcept(x, y, range, exclude) {
      let best = null, bd = range * range;
      for (const e of this.enemies) {
        if (e.dead || (exclude && exclude.has(e.id))) continue;
        const d2 = U.dist2(x, y, e.x, e.y);
        if (d2 < bd) { bd = d2; best = e; }
      }
      return best;
    },

    damageEnemy(e, amount, o = {}) {
      if (e.dead || !(amount > 0)) return;
      const s = this.castle.stats;
      let crit = false;
      if (o.canCrit !== false && Math.random() < s.critChance + (o.critBonus || 0)) { amount *= s.critMult; crit = true; }
      if (!o.noArmor && !o.armorPierce) amount *= 1 - e.armor;
      if (e.aura > 0) amount *= 0.75;
      e.hp -= amount;
      e.flash = 0.08;
      this.stats.damage += amount;
      if (o.weapon) o.weapon.dmgDealt += amount;
      if (o.burn) { e.burn = Math.max(e.burn, o.burn); e.burnT = 3; }
      if (o.stun) e.stun = Math.max(e.stun, o.stun);
      if (o.kb && !e.boss && e.def.mass < 50) {
        const k = o.kb / e.def.mass / (e.elite ? 3 : 1);
        e.kx += (o.kx || 0) * k; e.ky += (o.ky || 0) * k;
      }
      this.fx.number(e.x, e.y - e.r - 4, amount, { crit, color: o.color || (crit ? '#ffcf4a' : '#ffffff'), size: o.small ? 10 : undefined });
      SR.Audio.play(crit ? 'crit' : 'hit');
      if (e.hp <= 0) this.killEnemy(e, o);
    },

    killEnemy(e, o = {}) {
      e.dead = true;
      const c = this.castle, s = c.stats;
      this.stats.kills++;
      if (o.weapon) o.weapon.kills++;
      if (e.elite) this.stats.elites++;
      const m = this.time / 60;
      this.dropXp(e.x, e.y, e.xp);
      if (e.elite || e.boss || Math.random() < e.def.gold) {
        const amt = e.def.goldAmt * (e.elite ? 12 : 1) * (1 + m * 0.05);
        this.dropGold(e.x, e.y, amt, e.boss ? 14 : e.elite ? 6 : 1);
      }
      if (e.elite || e.boss) this.addPickup('chest', e.x, e.y, 1);
      if (e.boss) this.addPickup('heart', e.x + 20, e.y, 1);
      else if (Math.random() < 0.005) this.addPickup('heart', e.x, e.y, 1);
      else if (Math.random() < 0.002 && !this.pickups.some((p) => p.kind === 'magnet')) this.addPickup('magnet', e.x, e.y, 1);

      this.fx.corpse(e);
      this.fx.burst(e.x, e.y, e.boss ? 40 : 7, '#c9b994', e.boss ? 260 : 90, 2.5, 0.5);
      this.fx.burst(e.x, e.y, e.boss ? 20 : 3, '#a8332b', 70, 2, 0.4);
      SR.Audio.play('enemyDie');
      if (s.lifeOnKill > 0) c.heal(s.lifeOnKill);
      if (s.deathBlast > 0 && Math.random() < s.deathBlast) this.pendingBlasts.push({ x: e.x, y: e.y, dmg: 18 * (1 + m * 0.35) * s.dmgMult });
      if (e.boss) this.onBossDefeated(e);
      else if (e.elite) this.shake(5);
    },

    onBossDefeated(e) {
      this.stats.bosses++;
      this.announce(`${e.name} has fallen!`, 'boss');
      this.fx.explosion(e.x, e.y, 160, { c1: '#e7a6ff', c2: '#ffcf4a', color: '220,150,255' });
      this.shake(14);
      SR.Audio.play('victory');
      // the army falters: nearby troops scatter
      for (const o of this.enemies) if (!o.dead && U.dist2(o.x, o.y, e.x, e.y) < 300 * 300) o.stun = Math.max(o.stun, 1.5);
      if (e.final && !this.endless) this.victoryTimer = 2.5;
    },

    damageCastle(amount, src) {
      if (this.state !== 'playing') return;
      const c = this.castle;
      if (c.invuln > 0) return;
      if (c.aegisReady) {
        c.aegisReady = false; c.aegisTimer = 0;
        this.fx.ring(c.x, c.y, c.hitR, c.hitR * 2, 0.4, 'rgba(255,230,140,', 4);
        SR.Audio.play('shield');
        return;
      }
      const a = amount * (1 - c.stats.armor);
      c.hp -= a;
      this.stats.taken += a;
      const key = src ? (src.type || src.kind || 'other') : 'other';
      this.stats.takenBy[key] = (this.stats.takenBy[key] || 0) + a;
      c.flash = Math.min(0.5, c.flash + 0.15 + a / 80);
      this.fx.number(c.x + U.rand(-30, 30), c.y - c.hitR * 0.6, a, { color: '#ff6a5a', size: 13 });
      this.fx.burst(c.x + U.rand(-20, 20), c.y + U.rand(-20, 10), 4, '#8e887c', 100, 3, 0.5);
      this.shake(Math.min(9, 1.5 + a * 0.2));
      SR.Audio.play('hurt');
      if (c.hp <= 0) this.castleDestroyed();
    },

    castleDestroyed() {
      const c = this.castle;
      if (c.stats.revives > 0) {
        c.stats.revives--;
        c.hp = c.stats.maxHp * 0.5;
        c.invuln = 2.5;
        this.announce('The Phoenix Heart burns — the castle rises again!', 'boss');
        this.fx.explosion(c.x, c.y, 220, { c1: '#ffe08a', c2: '#ff6a2a', color: '255,180,80' });
        for (const e of this.enemies) if (!e.dead && U.dist2(e.x, e.y, c.x, c.y) < 300 * 300) this.damageEnemy(e, 400 * (1 + this.time / 300), { canCrit: false });
        SR.Audio.play('levelup');
        return;
      }
      c.hp = 0;
      this.state = 'dying';
      this.dyingT = 0; this.boomT = 0;
      SR.Audio.play('defeat');
      this.announce('The castle is falling!', 'warn');
    },

    // ------------------------------------------------------------ loot & progression
    addPickup(kind, x, y, v) {
      const a = Math.random() * TAU, s = U.rand(30, 120);
      this.pickups.push({ kind, x, y, v, vx: Math.cos(a) * s, vy: Math.sin(a) * s, t: 0, mag: false, sp: 0 });
    },
    dropXp(x, y, v) {
      let xpCount = 0;
      for (const p of this.pickups) if (p.kind === 'xp') xpCount++;
      if (xpCount > 320) {
        // merge into an existing gem to keep things fast
        const p = this.pickups.find((q) => q.kind === 'xp' && !q.mag && U.dist2(q.x, q.y, x, y) < 400 * 400) || this.pickups.find((q) => q.kind === 'xp');
        if (p) { p.v += v; return; }
      }
      this.addPickup('xp', x, y, v);
    },
    dropGold(x, y, amt, pieces) {
      const per = amt / pieces;
      for (let i = 0; i < pieces; i++) this.addPickup('gold', x, y, per);
    },
    updatePickups(dt) {
      const c = this.castle, pr = c.stats.pickup;
      const collectR = c.hitR * 0.6 + 8;
      U.compact(this.pickups, (p) => {
        p.t += dt;
        if (p.vx || p.vy) {
          p.x += p.vx * dt; p.y += p.vy * dt;
          const k = Math.max(0, 1 - dt * 5); p.vx *= k; p.vy *= k;
          if (Math.abs(p.vx) + Math.abs(p.vy) < 3) { p.vx = 0; p.vy = 0; }
        }
        const dx = c.x - p.x, dy = c.y - p.y;
        const d = Math.hypot(dx, dy);
        if (!p.mag && d < pr && p.t > 0.25) p.mag = true;
        if (p.mag) {
          p.sp = Math.max(p.sp, 200) + 1600 * dt;
          const step = Math.min(d, p.sp * dt);
          p.x += dx / (d || 1) * step; p.y += dy / (d || 1) * step;
        }
        if (d < collectR && (p.mag || p.t > 0.25)) { this.collect(p); return false; }
        if (d > 4000) return false;
        return true;
      });
    },
    collect(p) {
      const c = this.castle;
      switch (p.kind) {
        case 'xp': this.addXp(p.v); SR.Audio.play('xp'); break;
        case 'gold': this.addGold(p.v); SR.Audio.play('gold'); break;
        case 'heart': {
          const h = c.heal(c.stats.maxHp * 0.25);
          this.fx.number(c.x, c.y - c.hitR, '+' + Math.round(h), { color: '#7dff8a', force: true, size: 16 });
          SR.Audio.play('levelup');
          break;
        }
        case 'magnet':
          for (const q of this.pickups) if (q.kind === 'xp' || q.kind === 'gold') q.mag = true;
          this.announce('Lodestone! All loot pulled in', 'good');
          SR.Audio.play('chest');
          break;
        case 'chest': this.openChest(); break;
      }
    },
    addGold(v, raw) {
      const amt = raw ? v : v * this.castle.stats.goldMult;
      this.castle.gold += amt;
      this.stats.gold += amt;
    },
    addXp(v) {
      const c = this.castle;
      c.xp += v * c.stats.xpMult;
      while (c.xp >= c.xpNext) {
        c.xp -= c.xpNext;
        const prevSlots = c.slotCount();
        c.level++;
        c.xpNext = SR.Castle.xpFor(c.level);
        this.pendingLevels++;
        c.markDirty();
        if (c.slotCount() > prevSlots) this.announce('Your castle grows — a new weapon tower is built!', 'good');
      }
    },

    openLevelUp() {
      this.state = 'levelup';
      this.chestMode = false;
      this.currentPicks = SR.rollUpgrades(this, 3);
      const c = this.castle;
      c.heal(c.stats.maxHp * 0.04);
      SR.Audio.play('levelup');
      this.fx.ring(c.x, c.y, 20, 200, 0.6, 'rgba(160,220,255,', 4);
      SR.UI.levelUp(this.currentPicks, { pending: this.pendingLevels });
    },
    openChest() {
      const gold = Math.round(50 + this.time * 0.3);
      this.addGold(gold);
      this.state = 'levelup';
      this.chestMode = true;
      this.currentPicks = SR.rollUpgrades(this, 3, 2);
      if (!this.currentPicks.length) this.currentPicks = SR.rollUpgrades(this, 3, 0);
      SR.Audio.play('chest');
      SR.UI.levelUp(this.currentPicks, { chest: true, gold: Math.round(gold * this.castle.stats.goldMult) });
    },
    chooseUpgrade(i) {
      if (this.state !== 'levelup') return;
      const pick = this.currentPicks && this.currentPicks[i];
      if (i >= 0 && !pick) return;
      if (pick) {
        SR.applyUpgrade(this, pick);
        this.stats.upgrades++;
        SR.Audio.play('buy');
      }
      if (this.chestMode) this.chestMode = false;
      else this.pendingLevels = Math.max(0, this.pendingLevels - 1);
      if (this.pendingLevels > 0) this.openLevelUp();
      else this.resume();
    },
    reroll() {
      if (this.state !== 'levelup' || this.chestMode || this.rerolls <= 0) return;
      this.rerolls--;
      this.currentPicks = SR.rollUpgrades(this, 3);
      SR.Audio.play('click');
      SR.UI.levelUp(this.currentPicks, { pending: this.pendingLevels });
    },

    announce(text, cls) { SR.UI.announce(text, cls); },

    // ------------------------------------------------------------ end of run
    endRun(victory) {
      const c = this.castle, d = SR.Save.data;
      const sum = {
        time: this.time, kills: this.stats.kills, level: c.level, gold: this.stats.gold,
        bosses: this.stats.bosses, elites: this.stats.elites, damage: this.stats.damage,
        taken: this.stats.taken, upgrades: this.stats.upgrades, victory: victory || this.endless,
        weapons: c.ownedWeapons().map((w) => ({ type: w.type, level: SR.weaponLevel(w), dmg: w.dmgDealt })),
      };
      sum.crowns = SR.computeCrowns(sum);
      sum.newBest = sum.time > d.best.time;
      d.crowns += sum.crowns; d.totalCrowns += sum.crowns;
      d.best.time = Math.max(d.best.time, sum.time);
      d.best.kills = Math.max(d.best.kills, sum.kills);
      d.best.level = Math.max(d.best.level, sum.level);
      d.best.bosses = Math.max(d.best.bosses, sum.bosses);
      if (sum.victory) d.victories++;
      SR.Save.save();
      this.state = 'gameover';
      SR.UI.showHUD(false);
      SR.UI.summary(sum, sum.victory);
    },
  };

  SR.Game = Game;
})(window.SR);
