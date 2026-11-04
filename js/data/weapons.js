'use strict';
// Weapon definitions. To add a weapon: add an entry here (stats, special, fire()),
// add it to WEAPON_ORDER, and give it a drawing in art/weapons.js.
(function (SR) {
  const U = SR.U;

  SR.WEAPON_ORDER = ['ballista', 'crossbow', 'cannon', 'fire', 'lightning'];

  // Shop limits for each upgradable stat
  SR.WEAPON_STAT_CAPS = { damage: 8, rate: 6, range: 4, proj: 3, special: 5 };
  SR.WEAPON_STAT_NAMES = { damage: 'Damage', rate: 'Attack Speed', range: 'Range', proj: 'Projectiles', special: 'Special' };

  function spreadAngles(n, center, step) {
    const out = [];
    for (let i = 0; i < n; i++) out.push(center + (i - (n - 1) / 2) * step);
    return out;
  }

  SR.WEAPONS = {
    ballista: {
      id: 'ballista', name: 'Ballista', color: '#f0cf7a', icon: 'w_ballista',
      desc: 'Heavy bolts that pierce through the ranks and knock enemies back.',
      price: 0, unlockCost: 0,
      base: { damage: 32, cooldown: 0.95, range: 480, projectiles: 1, speed: 1000 },
      upCost: { damage: 40, rate: 45, range: 30, proj: 130, special: 70 },
      targeting: 'strongest', aimable: true,
      special: {
        name: 'Siege Bolts',
        desc: (l) => `Pierces ${2 + l} enemies, knockback +${l * 25}%` + (l >= 3 ? '. Ignores armour.' : '. Lv3: ignores armour.'),
      },
      fire(w, st, game, m, target, ang) {
        const sp = st.special;
        const step = 0.1;
        for (const a of spreadAngles(st.projectiles, ang, step)) {
          game.addPlayerProjectile({
            kind: 'bolt', x: m.x, y: m.y, vx: Math.cos(a) * st.speed, vy: Math.sin(a) * st.speed,
            dmg: st.damage, pierce: 2 + sp, kb: 160 * (1 + sp * 0.25), life: st.range / st.speed * 1.15,
            r: 7, weapon: w, armorPierce: sp >= 3, color: '#ffe7a3',
          });
        }
        SR.Audio.play('ballista');
      },
    },

    crossbow: {
      id: 'crossbow', name: 'Repeating Crossbow', color: '#c9d6e8', icon: 'w_crossbow',
      desc: 'Rapid-fire bolts that shred lightly armoured troops.',
      price: 90, unlockCost: 40,
      base: { damage: 9, cooldown: 0.32, range: 390, projectiles: 1, speed: 1150 },
      upCost: { damage: 35, rate: 40, range: 30, proj: 110, special: 65 },
      targeting: 'nearest', aimable: true,
      special: {
        name: 'Barbed Bolts',
        desc: (l) => `+${l * 6}% critical chance` + (l >= 3 ? `. Bolts ricochet ${l >= 5 ? 2 : 1}x.` : '. Lv3: bolts ricochet.'),
      },
      fire(w, st, game, m, target, ang) {
        const sp = st.special;
        for (const a of spreadAngles(st.projectiles, ang + U.rand(-0.04, 0.04), 0.07)) {
          game.addPlayerProjectile({
            kind: 'quarrel', x: m.x, y: m.y, vx: Math.cos(a) * st.speed, vy: Math.sin(a) * st.speed,
            dmg: st.damage, pierce: 0, kb: 30, life: st.range / st.speed * 1.15, r: 5, weapon: w,
            critBonus: sp * 0.06, ricochet: sp >= 5 ? 2 : sp >= 3 ? 1 : 0, color: '#dfe9ff',
          });
        }
        SR.Audio.play('crossbow');
      },
    },

    cannon: {
      id: 'cannon', name: 'Cannon', color: '#8d8d99', icon: 'w_cannon',
      desc: 'Lobbed iron shells that explode, devastating packed formations.',
      price: 130, unlockCost: 60,
      base: { damage: 42, cooldown: 2.2, range: 520, projectiles: 1, radius: 72 },
      upCost: { damage: 45, rate: 50, range: 30, proj: 140, special: 80 },
      targeting: 'cluster', aimable: true,
      special: {
        name: 'Black Powder',
        desc: (l) => `Blast radius +${l * 15}%` + (l >= 3 ? '. Shells burst into cluster bomblets.' : '. Lv3: cluster bomblets.'),
      },
      fire(w, st, game, m, target, ang) {
        const sp = st.special;
        const targets = target ? game.findTargets(m.x, m.y, st.range, 'cluster', st.projectiles) : [];
        for (let i = 0; i < st.projectiles; i++) {
          let tx, ty;
          const t = targets[i % Math.max(1, targets.length)];
          if (t && !game.manualAim) { tx = t.x + U.rand(-12, 12) + (i >= targets.length ? U.rand(-50, 50) : 0); ty = t.y + U.rand(-12, 12); }
          else {
            const a = ang + (i - (st.projectiles - 1) / 2) * 0.2;
            const d = game.manualAim ? Math.min(st.range, U.dist(m.x, m.y, game.mouseWorld.x, game.mouseWorld.y)) : st.range * 0.7;
            tx = m.x + Math.cos(a) * d; ty = m.y + Math.sin(a) * d;
          }
          const dist = U.dist(m.x, m.y, tx, ty);
          game.addPlayerProjectile({
            kind: 'shell', x: m.x, y: m.y, x0: m.x, y0: m.y, tx, ty, t: 0, dur: U.clamp(dist / 560, 0.3, 1.1) + i * 0.06,
            dmg: st.damage, radius: st.radius * (1 + sp * 0.15), cluster: sp >= 3, weapon: w, r: 8,
          });
        }
        game.shake(3);
        SR.Audio.play('cannon');
      },
    },

    fire: {
      id: 'fire', name: 'Fire Tower', color: '#ff8a3a', icon: 'w_fire',
      desc: 'Homing fireballs that set enemies ablaze with lingering burns.',
      price: 130, unlockCost: 90,
      base: { damage: 18, cooldown: 1.35, range: 430, projectiles: 1, speed: 430 },
      upCost: { damage: 40, rate: 45, range: 30, proj: 130, special: 75 },
      targeting: 'random', aimable: false,
      special: {
        name: 'Dragonfire',
        desc: (l) => `Burn damage +${l * 30}%` + (l >= 3 ? '. Fireballs leave burning ground.' : '. Lv3: burning ground.'),
      },
      fire(w, st, game, m, target) {
        const sp = st.special;
        const targets = game.findTargets(m.x, m.y, st.range, 'random', st.projectiles);
        for (let i = 0; i < st.projectiles; i++) {
          const t = targets[i % targets.length] || target;
          if (!t) continue;
          const a = U.angleTo(m.x, m.y, t.x, t.y) + U.rand(-0.6, 0.6);
          game.addPlayerProjectile({
            kind: 'fireball', x: m.x, y: m.y, vx: Math.cos(a) * st.speed, vy: Math.sin(a) * st.speed, speed: st.speed,
            target: t, dmg: st.damage, pierce: 0, life: 2.6, r: 9, weapon: w,
            burn: st.damage * 0.45 * (1 + sp * 0.3), splash: 38, pool: sp >= 3,
          });
        }
        SR.Audio.play('fire');
      },
    },

    lightning: {
      id: 'lightning', name: 'Lightning Crystal', color: '#8fd3ff', icon: 'w_lightning',
      desc: 'Arcane bolts that chain between enemies instantly.',
      price: 160, unlockCost: 140,
      base: { damage: 24, cooldown: 1.6, range: 410, projectiles: 1, chains: 3 },
      upCost: { damage: 45, rate: 50, range: 30, proj: 150, special: 80 },
      targeting: 'nearest', aimable: false,
      special: {
        name: 'Storm Conduit',
        desc: (l) => `Chains to ${3 + l} enemies` + (l >= 3 ? '. 25% chance to stun.' : '. Lv3: stun chance.'),
      },
      fire(w, st, game, m) {
        const sp = st.special;
        const starts = game.findTargets(m.x, m.y, st.range, 'nearest', st.projectiles);
        for (const s of starts) {
          game.chainLightning(m.x, m.y, s, { dmg: st.damage, chains: 3 + sp, stun: sp >= 3 ? 0.25 : 0, weapon: w });
        }
        if (starts.length) SR.Audio.play('lightning');
      },
    },
  };

  SR.createWeapon = function (type) {
    return {
      type,
      lv: { damage: 0, rate: 0, range: 0, proj: 0, special: 0 },
      bonus: { dmg: 0, rate: 0, range: 0, proj: 0, special: 0 },
      bonusCount: 0,
      cd: 0.5 + Math.random() * 0.4,
      aim: -Math.PI / 2,
      recoil: 0,
      dmgDealt: 0,
      kills: 0,
    };
  };

  SR.weaponLevel = function (w) {
    const l = w.lv;
    return 1 + l.damage + l.rate + l.range + l.proj + l.special + w.bonusCount;
  };

  // Final stats for a weapon instance, after all castle-wide multipliers.
  SR.weaponStats = function (w, castle) {
    const def = SR.WEAPONS[w.type];
    const b = def.base, l = w.lv, bo = w.bonus, s = castle.stats;
    const dmgMult = (1 + 0.22 * l.damage + bo.dmg) * s.dmgMult;
    const rateMult = (1 + 0.15 * l.rate + bo.rate) * s.rateMult;
    const rangeMult = (1 + 0.12 * l.range + bo.range) * s.rangeMult;
    return {
      damage: b.damage * dmgMult,
      cooldown: b.cooldown / rateMult,
      range: b.range * rangeMult,
      projectiles: b.projectiles + l.proj + bo.proj + s.projBonus,
      special: Math.min(5, l.special + bo.special),
      speed: b.speed || 0,
      radius: b.radius || 0,
      dps: (b.damage * dmgMult) / (b.cooldown / rateMult),
    };
  };
})(window.SR);
