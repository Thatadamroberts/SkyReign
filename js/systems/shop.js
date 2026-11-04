'use strict';
// In-run shop: weapons, weapon upgrades, castle repairs, slots and fortifications.
(function (SR) {
  const U = SR.U;

  // Castle improvements. tier counters live in game.shopTiers.
  SR.FORTIFICATIONS = [
    { id: 'walls', name: 'Thicker Walls', icon: 'wall', max: 6, cost: (t) => Math.round(60 * Math.pow(1.5, t)),
      desc: 'Raise taller, thicker walls: +20% max health.', apply: (g) => { const s = g.castle.stats; const add = g.castle.baseMaxHp * 0.2; s.maxHp += add; g.castle.hp += add; } },
    { id: 'plating', name: 'Iron Plating', icon: 'shield', max: 5, cost: (t) => Math.round(70 * Math.pow(1.6, t)),
      desc: 'Rivet iron bands to the stone: +6% armour.', apply: (g) => { const s = g.castle.stats; s.armor = Math.min(0.75, s.armor + 0.06); } },
    { id: 'chapel', name: "Healer's Chapel", icon: 'heart', max: 3, cost: (t) => Math.round(80 * Math.pow(1.7, t)),
      desc: 'Consecrate a chapel: +0.8 health regeneration per second.', apply: (g) => { g.castle.stats.regen += 0.8; } },
    { id: 'sails', name: 'Sky Sails', icon: 'sail', max: 3, cost: (t) => Math.round(50 * Math.pow(1.6, t)),
      desc: 'Rig enchanted sails: +10% movement speed.', apply: (g) => { g.castle.stats.speed *= 1.1; g.castle.speedTier++; } },
    { id: 'spire', name: 'Lodestone Spire', icon: 'magnet', max: 3, cost: (t) => Math.round(40 * Math.pow(1.6, t)),
      desc: 'A spire that draws loot: +40% pickup radius.', apply: (g) => { g.castle.stats.pickup *= 1.4; g.castle.magnetTier++; } },
    { id: 'aegis', name: 'Aegis Shrine', icon: 'aegis', max: 3, cost: (t) => Math.round(120 * Math.pow(1.8, t)),
      desc: 'A ward that blocks one hit every 12s (−2.5s per tier).', apply: (g) => { const s = g.castle.stats; s.aegisCd = s.aegisCd ? Math.max(3, s.aegisCd - 2.5) : 12; } },
    { id: 'arsenal', name: 'Gilded Arsenal', icon: 'crown', max: 40, cost: (t) => Math.round(300 * Math.pow(1.22, t)),
      desc: 'Commission master-forged ammunition: +6% damage for all weapons.', apply: (g) => { g.castle.stats.dmgMult += 0.06; } },
  ];
  SR.SLOT_COSTS = [150, 340, 650];

  const Shop = {
    weaponPrice(game, type) {
      const owned = game.castle.ownedWeapons().length;
      return Math.round(SR.WEAPONS[type].price * (1 + 0.4 * Math.max(0, owned - 1)));
    },
    statPrice(w, stat) {
      return Math.round(SR.WEAPONS[w.type].upCost[stat] * Math.pow(1.5, w.lv[stat]));
    },
    repairPrice(game) { return Math.round(30 + 12 * game.time / 60); },
    slotPrice(game) { return SR.SLOT_COSTS[game.castle.slotsBought] || null; },

    canAfford(game, cost) { return cost != null && game.castle.gold >= cost; },
    spend(game, cost) {
      if (!this.canAfford(game, cost)) { SR.Audio.play('deny'); return false; }
      game.castle.gold -= cost;
      game.stats.goldSpent += cost;
      SR.Audio.play('buy');
      return true;
    },

    buyWeapon(game, type) {
      const c = game.castle;
      if (c.getWeapon(type) || c.freeSlots() <= 0) { SR.Audio.play('deny'); return false; }
      if (!this.spend(game, this.weaponPrice(game, type))) return false;
      c.addWeapon(type);
      game.announce(`${SR.WEAPONS[type].name} constructed!`, 'good');
      return true;
    },
    buyStat(game, type, stat) {
      const w = game.castle.getWeapon(type);
      if (!w || w.lv[stat] >= SR.WEAPON_STAT_CAPS[stat]) { SR.Audio.play('deny'); return false; }
      if (!this.spend(game, this.statPrice(w, stat))) return false;
      w.lv[stat]++;
      game.castle.markDirty();
      return true;
    },
    buyRepair(game) {
      const c = game.castle;
      if (c.hp >= c.stats.maxHp - 0.5) { SR.Audio.play('deny'); return false; }
      if (!this.spend(game, this.repairPrice(game))) return false;
      c.heal(c.stats.maxHp * 0.35);
      return true;
    },
    buySlot(game) {
      const c = game.castle;
      const price = this.slotPrice(game);
      if (price == null || c.slotCount() >= SR.MAX_SLOTS) { SR.Audio.play('deny'); return false; }
      if (!this.spend(game, price)) return false;
      c.slotsBought++;
      c.markDirty();
      game.announce('A new tower rises!', 'good');
      return true;
    },
    buyFort(game, id) {
      const f = SR.FORTIFICATIONS.find((x) => x.id === id);
      const t = game.shopTiers[id] || 0;
      if (!f || t >= f.max) { SR.Audio.play('deny'); return false; }
      if (!this.spend(game, f.cost(t))) return false;
      f.apply(game);
      game.shopTiers[id] = t + 1;
      game.castle.markDirty();
      return true;
    },
  };
  SR.Shop = Shop;
})(window.SR);
