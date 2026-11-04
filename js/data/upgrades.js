'use strict';
// Level-up upgrade pool. Each upgrade lists the rarities it can roll at and the
// value at each rarity. apply(game, value) mutates the run. To add an upgrade,
// push another entry to SR.UPGRADES.
(function (SR) {
  const U = SR.U;

  SR.RARITIES = [
    { id: 'common', name: 'Common', weight: 60, color: '#cfc8b4' },
    { id: 'uncommon', name: 'Uncommon', weight: 27, color: '#62d06f' },
    { id: 'rare', name: 'Rare', weight: 10, color: '#4fa8ff' },
    { id: 'epic', name: 'Epic', weight: 3.4, color: '#bd72ff' },
    { id: 'legendary', name: 'Legendary', weight: 0.9, color: '#ffa031' },
  ];
  SR.RARITY = {};
  SR.RARITIES.forEach((r, i) => { r.index = i; SR.RARITY[r.id] = r; });

  const pct = (v) => Math.round(v * 100) + '%';
  const st = (g) => g.castle.stats;

  const UPGRADES = [
    { id: 'dmg', name: 'Tempered Steel', icon: 'sword', rarities: { common: 0.08, uncommon: 0.12, rare: 0.18, epic: 0.26, legendary: 0.4 },
      desc: (v) => `All weapons deal +${pct(v)} damage.`, apply: (g, v) => { st(g).dmgMult += v; } },
    { id: 'rate', name: 'Oiled Windlasses', icon: 'gear', rarities: { common: 0.06, uncommon: 0.09, rare: 0.13, epic: 0.19, legendary: 0.28 },
      desc: (v) => `All weapons attack ${pct(v)} faster.`, apply: (g, v) => { st(g).rateMult += v; } },
    { id: 'range', name: "Eagle's Watch", icon: 'eye', rarities: { common: 0.06, uncommon: 0.09, rare: 0.14 },
      desc: (v) => `All weapons gain +${pct(v)} range.`, apply: (g, v) => { st(g).rangeMult += v; }, max: 6 },
    { id: 'hp', name: 'Masonry Guild', icon: 'wall', rarities: { common: 20, uncommon: 30, rare: 45, epic: 70, legendary: 110 },
      desc: (v) => `+${v} maximum castle health (and heal ${v}).`, apply: (g, v) => { st(g).maxHp += v; g.castle.hp += v; g.castle.markDirty(); } },
    { id: 'armor', name: 'Iron Plating', icon: 'shield', rarities: { common: 0.03, uncommon: 0.045, rare: 0.065, epic: 0.09 },
      desc: (v) => `+${pct(v)} armour (damage reduction, max 75%).`, apply: (g, v) => { st(g).armor = Math.min(0.75, st(g).armor + v); g.castle.markDirty(); },
      cond: (g) => st(g).armor < 0.75 },
    { id: 'speed', name: 'Favourable Winds', icon: 'wind', rarities: { common: 0.06, uncommon: 0.09, rare: 0.13 },
      desc: (v) => `Castle moves ${pct(v)} faster.`, apply: (g, v) => { st(g).speed *= 1 + v; g.castle.speedTier++; g.castle.markDirty(); }, max: 6 },
    { id: 'gold', name: "Tax Collector's Ledger", icon: 'coin', rarities: { common: 0.1, uncommon: 0.15, rare: 0.22, epic: 0.35 },
      desc: (v) => `+${pct(v)} gold from all sources.`, apply: (g, v) => { st(g).goldMult += v; } },
    { id: 'xp', name: "Scholar's Tome", icon: 'book', rarities: { common: 0.08, uncommon: 0.12, rare: 0.18, epic: 0.28 },
      desc: (v) => `+${pct(v)} experience gained.`, apply: (g, v) => { st(g).xpMult += v; } },
    { id: 'magnet', name: 'Lodestone', icon: 'magnet', rarities: { common: 0.15, uncommon: 0.25, rare: 0.4 },
      desc: (v) => `+${pct(v)} pickup radius.`, apply: (g, v) => { st(g).pickup *= 1 + v; g.castle.magnetTier++; g.castle.markDirty(); }, max: 6 },
    { id: 'crit', name: 'Keen Eyes', icon: 'crit', rarities: { uncommon: 0.04, rare: 0.06, epic: 0.09, legendary: 0.13 },
      desc: (v) => `+${pct(v)} critical hit chance.`, apply: (g, v) => { st(g).critChance += v; }, cond: (g) => st(g).critChance < 0.6 },
    { id: 'critdmg', name: "Executioner's Creed", icon: 'skull', rarities: { uncommon: 0.2, rare: 0.3, epic: 0.45, legendary: 0.7 },
      desc: (v) => `Critical hits deal +${pct(v)} damage.`, apply: (g, v) => { st(g).critMult += v; } },
    { id: 'regen', name: "Healer's Chapel", icon: 'heart', rarities: { common: 0.4, uncommon: 0.6, rare: 0.9, epic: 1.4 },
      desc: (v) => `Regenerate +${v.toFixed(1)} health per second.`, apply: (g, v) => { st(g).regen += v; g.castle.markDirty(); } },
    { id: 'repair', name: 'Divine Repairs', icon: 'plus', rarities: { common: 0.25, uncommon: 0.4, rare: 0.6 },
      desc: (v) => `Instantly restore ${pct(v)} of maximum health.`, apply: (g, v) => { g.castle.heal(st(g).maxHp * v); },
      cond: (g) => g.castle.hp < st(g).maxHp * 0.8, weight: 1.4 },
    { id: 'treasury', name: 'Royal Treasury', icon: 'chest', rarities: { uncommon: 60, rare: 120, epic: 250 },
      desc: (v) => `Gain ${v} gold now (scales with time).`, apply: (g, v) => { g.addGold(v * (1 + g.time / 300), true); }, weight: 0.7 },
    { id: 'thorns', name: 'Spiked Ramparts', icon: 'spikes', rarities: { uncommon: 6, rare: 10, epic: 16 },
      desc: (v) => `Melee attackers take ${v} damage (+armour scaling) per hit.`, apply: (g, v) => { st(g).thorns += v; g.castle.markDirty(); } },
    { id: 'multishot', name: 'Volley Doctrine', icon: 'arrows', rarities: { epic: 1, legendary: 1 },
      desc: () => 'All weapons fire +1 projectile.', apply: (g, v) => { st(g).projBonus += v; }, max: 3, weight: 0.8 },
    { id: 'vamp', name: 'Blood Runes', icon: 'drop', rarities: { rare: 0.5, epic: 1, legendary: 2 },
      desc: (v) => `Heal ${v} health for every enemy slain.`, apply: (g, v) => { st(g).lifeOnKill += v; } },
    { id: 'chain', name: 'Chain Reaction', icon: 'bomb', rarities: { epic: 0.15, legendary: 0.3 },
      desc: (v) => `Slain enemies have a ${pct(v)} chance to explode.`, apply: (g, v) => { st(g).deathBlast += v; }, max: 3 },
    { id: 'aegis', name: 'Holy Aegis', icon: 'aegis', rarities: { rare: 12, epic: 9, legendary: 6 },
      desc: (v) => `A divine ward blocks one hit every ${v}s (stacks reduce timer).`,
      apply: (g, v) => { const s = st(g); s.aegisCd = s.aegisCd ? Math.max(3, Math.min(s.aegisCd, v) - 1.5) : v; g.castle.aegisTimer = 0; g.castle.markDirty(); }, max: 4 },
    { id: 'overcharge', name: 'Arcane Overcharge', icon: 'star', rarities: { legendary: 1 },
      desc: () => 'All weapons +30% damage and +15% attack speed.', apply: (g) => { st(g).dmgMult += 0.3; st(g).rateMult += 0.15; } },
    { id: 'phoenix', name: 'Phoenix Heart', icon: 'phoenix', rarities: { legendary: 1 },
      desc: () => 'When destroyed, rise again once at 50% health.', apply: (g) => { st(g).revives += 1; }, max: 1 },
    { id: 'architect', name: "Architect's Plans", icon: 'tower', rarities: { epic: 1, legendary: 1 },
      desc: () => 'Construct +1 weapon slot on your castle.', apply: (g) => { g.castle.bonusSlots++; g.castle.markDirty(); },
      cond: (g) => g.castle.slotCount() < SR.MAX_SLOTS },
    { id: 'luck', name: 'Four-Leaf Banner', icon: 'clover', rarities: { uncommon: 1, rare: 2 },
      desc: (v) => `+${v} luck: rarer upgrades appear more often.`, apply: (g, v) => { st(g).luck += v; }, max: 4 },
  ];

  // Weapon-specific upgrades are generated for each weapon type.
  for (const type of SR.WEAPON_ORDER) {
    const name = () => SR.WEAPONS[type].name;
    const owned = (g) => g.castle.getWeapon(type);
    const apply = (fn) => (g, v) => { const w = owned(g); if (w) { fn(w, v); w.bonusCount++; } };
    UPGRADES.push(
      { id: type + '_dmg', weapon: type, name: '', title: () => `${name()}: Heavier Payload`, icon: SR.WEAPONS[type].icon,
        rarities: { common: 0.15, uncommon: 0.22, rare: 0.32, epic: 0.45, legendary: 0.65 }, weight: 1.3,
        desc: (v) => `${name()} deals +${pct(v)} damage.`, cond: owned, apply: apply((w, v) => { w.bonus.dmg += v; }) },
      { id: type + '_rate', weapon: type, title: () => `${name()}: Swift Loaders`, icon: SR.WEAPONS[type].icon,
        rarities: { common: 0.1, uncommon: 0.15, rare: 0.21, epic: 0.3 }, weight: 1.1,
        desc: (v) => `${name()} attacks ${pct(v)} faster.`, cond: owned, apply: apply((w, v) => { w.bonus.rate += v; }) },
      { id: type + '_range', weapon: type, title: () => `${name()}: Long Sights`, icon: SR.WEAPONS[type].icon,
        rarities: { common: 0.1, uncommon: 0.15 }, weight: 0.6,
        desc: (v) => `${name()} gains +${pct(v)} range.`, cond: owned, apply: apply((w, v) => { w.bonus.range += v; }) },
      { id: type + '_proj', weapon: type, title: () => `${name()}: Twin Mounts`, icon: SR.WEAPONS[type].icon,
        rarities: { rare: 1, epic: 1, legendary: 2 }, weight: 0.9,
        desc: (v) => `${name()} fires +${v} projectile${v > 1 ? 's' : ''}.`,
        cond: (g) => { const w = owned(g); return w && w.bonus.proj < 3; }, apply: apply((w, v) => { w.bonus.proj += v; }) },
      { id: type + '_special', weapon: type, title: () => `${name()}: ${SR.WEAPONS[type].special.name}`, icon: SR.WEAPONS[type].icon,
        rarities: { uncommon: 1, rare: 1, epic: 2 }, weight: 1,
        desc: (v, g) => { const w = g && owned(g); const cur = w ? Math.min(5, w.lv.special + w.bonus.special) : 0; const nx = Math.min(5, cur + v); return `Special Lv ${cur} → ${nx}: ${SR.WEAPONS[type].special.desc(nx)}`; },
        cond: (g) => { const w = owned(g); return w && w.lv.special + w.bonus.special < 5; }, apply: apply((w, v) => { w.bonus.special += v; }) },
      { id: type + '_bp', weapon: type, title: () => `Blueprint: ${name()}`, icon: SR.WEAPONS[type].icon,
        rarities: { rare: 1, epic: 1 }, weight: 0.9,
        desc: () => `Build a free ${name()} on an empty slot. ${SR.WEAPONS[type].desc}`,
        cond: (g) => !owned(g) && g.castle.freeSlots() > 0, apply: (g) => { g.castle.addWeapon(type); } },
    );
  }

  SR.UPGRADES = UPGRADES;
  SR.UPGRADE_BY_ID = {};
  for (const u of UPGRADES) SR.UPGRADE_BY_ID[u.id] = u;

  SR.upgradeTitle = (u) => (u.title ? u.title() : u.name);

  // Roll `count` distinct upgrade choices. minRarity lets chests guarantee quality.
  SR.rollUpgrades = function (game, count = 3, minRarity = 0) {
    const luck = game.castle.stats.luck;
    const eligible = UPGRADES.filter((u) => {
      if (u.cond && !u.cond(game)) return false;
      if (u.max && (game.upgradeCounts[u.id] || 0) >= u.max) return false;
      return true;
    });
    const picks = [];
    const used = new Set();
    let guard = 0;
    while (picks.length < count && guard++ < 200) {
      const rarities = SR.RARITIES.filter((r) => r.index >= minRarity && eligible.some((u) => !used.has(u.id) && u.rarities[r.id] != null));
      if (!rarities.length) break;
      const r = U.weightedPick(rarities, (x) => x.weight * (1 + luck * 0.22 * x.index));
      const pool = eligible.filter((u) => !used.has(u.id) && u.rarities[r.id] != null);
      if (!pool.length) continue;
      const u = U.weightedPick(pool, (x) => x.weight || 1);
      used.add(u.id);
      picks.push({ up: u, rarity: r, value: u.rarities[r.id] });
    }
    return picks;
  };

  SR.applyUpgrade = function (game, pick) {
    pick.up.apply(game, pick.value);
    game.upgradeCounts[pick.up.id] = (game.upgradeCounts[pick.up.id] || 0) + 1;
    game.castle.markDirty();
  };
})(window.SR);
