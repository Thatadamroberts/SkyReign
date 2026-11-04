'use strict';
// Permanent (between-run) progression and persistent save data.
(function (SR) {
  const KEY = 'skyreign.save.v1';

  SR.META_UPGRADES = [
    { id: 'm_hp', name: 'Fortified Foundations', icon: 'wall', max: 5, cost: (l) => 25 + l * 25, desc: (l) => `+${l * 10}% starting health` },
    { id: 'm_dmg', name: 'Master Smiths', icon: 'sword', max: 5, cost: (l) => 30 + l * 30, desc: (l) => `+${l * 6}% weapon damage` },
    { id: 'm_rate', name: "Engineers' Guild", icon: 'gear', max: 5, cost: (l) => 30 + l * 30, desc: (l) => `+${l * 4}% attack speed` },
    { id: 'm_armor', name: 'Stoneskin Wards', icon: 'shield', max: 5, cost: (l) => 30 + l * 25, desc: (l) => `+${l * 3}% starting armour` },
    { id: 'm_gold', name: 'War Chest', icon: 'coin', max: 5, cost: (l) => 20 + l * 20, desc: (l) => `Start each run with ${l * 40} gold` },
    { id: 'm_greed', name: 'Merchant Charter', icon: 'chest', max: 5, cost: (l) => 30 + l * 30, desc: (l) => `+${l * 8}% gold collected` },
    { id: 'm_xp', name: 'Royal Library', icon: 'book', max: 5, cost: (l) => 30 + l * 30, desc: (l) => `+${l * 6}% experience gained` },
    { id: 'm_veteran', name: 'Veteran Crew', icon: 'crown', max: 3, cost: (l) => 60 + l * 60, desc: (l) => `Starting weapon begins with +${l} Damage and +${l} Speed upgrades` },
    { id: 'm_regen', name: 'Blessed Stones', icon: 'heart', max: 3, cost: (l) => 40 + l * 40, desc: (l) => `Regenerate ${(l * 0.3).toFixed(1)} health per second` },
    { id: 'm_luck', name: 'Fortune of the Skies', icon: 'clover', max: 3, cost: (l) => 50 + l * 50, desc: (l) => `+${l} luck (rarer upgrades)` },
    { id: 'm_reroll', name: 'Seer’s Charter', icon: 'eye', max: 3, cost: (l) => 40 + l * 40, desc: (l) => `${l} upgrade reroll${l === 1 ? '' : 's'} per run` },
    { id: 'm_slot', name: 'Grand Architecture', icon: 'tower', max: 1, cost: () => 220, desc: (l) => (l ? 'Start with an extra weapon slot' : 'Start with an extra weapon slot') },
  ];

  const defaults = () => ({
    crowns: 0,
    totalCrowns: 0,
    meta: {},
    unlocked: { ballista: true },
    startWeapon: 'ballista',
    best: { time: 0, kills: 0, level: 0, bosses: 0 },
    runs: 0,
    victories: 0,
    settings: { sound: true, volume: 0.6, shake: true, damageNumbers: true },
  });

  SR.Save = {
    data: defaults(),
    load() {
      try {
        const raw = localStorage.getItem(KEY);
        if (raw) {
          const d = JSON.parse(raw);
          const base = defaults();
          this.data = Object.assign(base, d);
          this.data.settings = Object.assign(defaults().settings, d.settings || {});
          this.data.best = Object.assign(defaults().best, d.best || {});
          this.data.meta = d.meta || {};
          this.data.unlocked = Object.assign({ ballista: true }, d.unlocked || {});
        }
      } catch (e) { this.data = defaults(); }
      return this.data;
    },
    save() { try { localStorage.setItem(KEY, JSON.stringify(this.data)); } catch (e) { /* storage unavailable */ } },
    level(id) { return this.data.meta[id] || 0; },
    reset() { this.data = defaults(); this.save(); },
  };

  // Crowns awarded at the end of a run.
  SR.computeCrowns = function (s) {
    return Math.floor(s.time / 12 + s.kills / 30 + s.bosses * 30 + s.level * 1.5 + s.elites * 3 + (s.victory ? 100 : 0));
  };
})(window.SR);
