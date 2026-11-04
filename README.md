# SkyReign

A medieval fantasy roguelike survival game for the browser. You pilot a floating castle fleeing a kingdom's pursuing army. Start with a single ballista, earn gold and experience, and grow the castle into a sky fortress.

Plain HTML, CSS and JavaScript on an HTML5 Canvas. No build step and no dependencies. The one external request is an optional Google Font, and the game falls back to Georgia when offline.

## Running

Open `index.html` in a modern browser. Double-clicking it (a `file://` URL) works, because every script is a classic `<script>` with no modules.

You can also serve the folder over HTTP:

```bash
python3 -m http.server 8000
```

Then visit http://localhost:8000.

## Controls

| Action | Input |
| --- | --- |
| Fly | WASD / Arrow keys (touch: drag anywhere) |
| Manual aim (Ballista, Crossbow, Cannon) | Hold left mouse button |
| Shop (Sky Merchant) | B |
| Pause | Esc / P |
| Choose upgrade / reroll | 1–3 / R |
| Show pickup radius | Hold Shift |
| Mute | M |

## Features

- **Five weapons**: Ballista (piercing), Repeating Crossbow (rapid, ricochet), Cannon (lobbed area damage, cluster bomblets), Fire Tower (homing fireballs, burning, fire pools) and Lightning Crystal (chains, stun). Each one has upgradable Damage, Attack Speed, Range, Projectiles and a 5-level Special.
- **Nine enemy types**:
  - Footmen and Knights fight in melee, and Knights charge.
  - Archers and Crossbowmen attack from range.
  - Siege Engineers heal nearby troops and give them a damage-reduction aura.
  - Trebuchets lob boulders and mark where each one will land.
  - Wyverns fly at the castle and breathe fire.
  - Royal Guards are elite heavy infantry.
  - Generals are bosses who fire volleys, charge, summon troops and become enraged at half health.
- **Director**:
  - Enemy health, damage and spawn rate rise over the run, and new enemy types unlock as time passes.
  - The army charges every minute.
  - Elite enemies (gold crown) appear periodically and drop treasure chests.
  - A General attacks every 5 minutes.
  - The King's Champion arrives at 20:00. Defeating him wins the run, or you can carry on in endless mode.
- **Roguelike level-ups**: about 50 upgrades across Common, Uncommon, Rare, Epic and Legendary rarities, including weapon-specific cards, blueprints for free weapons, a Phoenix revive, chain-reaction explosions and more. Luck raises the odds of rarer cards, and rerolls let you redraw a hand.
- **Shop**: buy weapons, weapon upgrades, repairs, new weapon towers, fortifications (walls, iron plating, chapel, sails, lodestone spire, aegis shrine) and a repeatable damage upgrade for spare gold.
- **A castle that changes as you upgrade it**:
  - Each weapon slot becomes a full tower with that weapon mounted on top.
  - Walls and the keep grow taller with max health.
  - Armour adds iron bands, shields and rim spikes.
  - Regeneration adds a chapel, pickup radius adds a lodestone spire, and movement speed adds sails.
  - Banners appear as you level up.
- **Meta progression**: Crowns earned each run buy permanent upgrades and new starting weapons in the Royal Archive. Progress is saved in `localStorage`.
- **Game feel**: screen shake, projectile trails, hit flashes, explosions, damage numbers, magnetised loot, smoke and fire on a damaged castle, and falling corpses. Sound effects are generated in code with WebAudio, and there are audio hooks for adding real samples later.

## Code layout

```
index.html            page shell + HUD markup
css/style.css         all UI styling
js/core/              utils (math, noise, spatial grid), audio, input
js/data/              weapons, enemies, upgrades, meta-progression (pure data + small hooks)
js/art/               procedural art: castle, weapons, enemies, terrain/clouds, UI icons
js/entities/          castle, enemy AI behaviours, visual effects
js/systems/           director (pacing), combat (projectiles/damage), shop, renderer
js/ui/ui.js           menus, HUD, level-up, shop, summaries
js/game.js            state machine, main loop, gameplay API
js/main.js            entry point
```

### Extending

- **New weapon**: add an entry to `SR.WEAPONS` and `SR.WEAPON_ORDER` in `js/data/weapons.js`, with base stats, upgrade costs, a special and a `fire()` function. Add a drawing function in `js/art/weapons.js`. Weapon-specific level-up cards are generated automatically.
- **New enemy**: add an entry to `SR.ENEMIES` in `js/data/enemies.js`, choosing an existing `behavior` or adding one to `SR.ENEMY_BEHAVIORS` in `js/entities/enemy.js`. Add a sprite to `DRAW` in `js/art/enemies.js`.
- **New upgrade**: push an object with `rarities`, `desc` and `apply` into `UPGRADES` in `js/data/upgrades.js`.
- **Audio**: `SR.Audio.on((name, opts) => { /* play your sample */ return true; })` replaces the generated sound for any event, such as `ballista`, `explosion`, `levelup` or `hurt`.
