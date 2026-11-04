'use strict';
// Enemy definitions. `behavior` selects the AI routine in entities/enemy.js.
// unlock: seconds into the run before the type can appear. weight(t): spawn weight.
(function (SR) {
  SR.ENEMIES = {
    infantry: {
      name: 'Footman', hp: 20, speed: 64, damage: 5, range: 0, attackCd: 1.0, armor: 0,
      radius: 11, xp: 1, gold: 0.45, goldAmt: 2, behavior: 'melee', unlock: 0,
      group: [3, 6], weight: (t) => Math.max(2, 10 - t / 60), mass: 1,
    },
    archer: {
      name: 'Archer', hp: 15, speed: 56, damage: 4, range: 300, attackCd: 2.8, armor: 0,
      radius: 10, xp: 2, gold: 0.5, goldAmt: 2, behavior: 'ranged', proj: 'arrow', projSpeed: 330, unlock: 30,
      group: [2, 3], weight: () => 3, mass: 1,
    },
    knight: {
      name: 'Knight', hp: 85, speed: 52, damage: 12, range: 0, attackCd: 1.2, armor: 0.3,
      radius: 16, xp: 5, gold: 0.6, goldAmt: 4, behavior: 'melee', charge: true, unlock: 65,
      group: [1, 3], weight: (t) => 2 + t / 120, mass: 2.5,
    },
    crossbowman: {
      name: 'Crossbowman', hp: 28, speed: 46, damage: 10, range: 380, attackCd: 3.8, armor: 0.1,
      radius: 11, xp: 3, gold: 0.5, goldAmt: 2, behavior: 'ranged', proj: 'bolt', projSpeed: 520, unlock: 110,
      group: [2, 3], weight: () => 2.4, mass: 1.2,
    },
    engineer: {
      name: 'Siege Engineer', hp: 40, speed: 58, damage: 0, range: 290, attackCd: 2.5, armor: 0.1,
      radius: 11, xp: 4, gold: 0.8, goldAmt: 4, behavior: 'support', aura: 150, unlock: 145,
      group: [1, 2], weight: () => 1.6, mass: 1,
    },
    wyvern: {
      name: 'Wyvern', hp: 55, speed: 120, damage: 9, range: 0, attackCd: 1.1, armor: 0,
      radius: 16, xp: 5, gold: 0.5, goldAmt: 4, behavior: 'flyer', flying: true, unlock: 180,
      group: [1, 3], weight: (t) => 1.5 + t / 300, mass: 1.5,
    },
    trebuchet: {
      name: 'Trebuchet', hp: 170, speed: 24, damage: 28, range: 640, attackCd: 5.5, armor: 0.2,
      radius: 24, xp: 10, gold: 1, goldAmt: 12, behavior: 'siege', unlock: 215,
      group: [1, 1], weight: () => 0.9, mass: 99, maxAlive: 6,
    },
    royalGuard: {
      name: 'Royal Guard', hp: 260, speed: 70, damage: 20, range: 0, attackCd: 1.0, armor: 0.45,
      radius: 16, xp: 12, gold: 1, goldAmt: 10, behavior: 'melee', charge: true, unlock: 330,
      group: [1, 2], weight: (t) => 0.8 + t / 400, mass: 4,
    },
    general: {
      name: 'General', hp: 2600, speed: 46, damage: 22, range: 330, attackCd: 4, armor: 0.3,
      radius: 32, xp: 120, gold: 1, goldAmt: 240, behavior: 'boss', boss: true, unlock: 99999,
      group: [1, 1], weight: () => 0, mass: 999,
    },
  };

  SR.BOSS_NAMES = [
    'General Aldric the Iron',
    'General Morwenna Blackhelm',
    'General Corvane the Pitiless',
    "Sir Halbrecht, the King's Champion",
  ];
})(window.SR);
