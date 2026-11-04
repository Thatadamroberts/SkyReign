'use strict';
// DOM-based UI: HUD, menus, level-up cards, shop, archive (meta shop), summaries.
(function (SR) {
  const U = SR.U;
  const $ = (id) => document.getElementById(id);
  const esc = U.escape;
  const coin = '<i class="coin"></i>';

  function pips(n, max) {
    let s = '<span class="pips">';
    for (let i = 0; i < max; i++) s += `<i class="${i < n ? 'on' : ''}"></i>`;
    return s + '</span>';
  }

  const UI = {
    current: null,
    actions: {},
    hudCache: {},
    shopTab: 'armoury',
    focusIndex: -1,

    init() {
      const root = document.documentElement.style;
      for (const k of ['shield', 'heart', 'eye', 'skull']) root.setProperty('--ico-' + k, `url(${SR.Icons.get(k)})`);
      $('btn-shop').addEventListener('click', () => { SR.Audio.play('click'); SR.Game.openShop(); });
      $('btn-pause').addEventListener('click', () => { SR.Audio.play('click'); SR.Game.pause(); });
      $('screen').addEventListener('click', (ev) => {
        const el = ev.target.closest('[data-act]');
        if (!el || el.disabled || el.classList.contains('disabled')) return;
        const fn = this.actions[el.dataset.act];
        if (fn) { SR.Audio.init(); fn(el.dataset, el); }
      });
    },

    show(name, html, actions, cls = '') {
      const s = $('screen');
      s.className = cls;
      s.innerHTML = html;
      s.scrollTop = 0;
      this.current = name;
      this.actions = actions || {};
      document.getElementById('root').classList.add('overlay-open');
      this.focusIndex = -1;
    },
    hide() { $('screen').className = 'hidden'; $('screen').innerHTML = ''; this.current = null; this.actions = {}; $('root').classList.remove('overlay-open'); },
    showHUD(b) { $('hud').classList.toggle('hidden', !b); },
    fade(on) { $('fade').classList.toggle('on', on); },

    // ---------- main menu ----------
    mainMenu() {
      const d = SR.Save.data;
      this.show('menu', `
        <div class="screen-inner">
          <h1 class="logo">SKYREIGN</h1>
          <div class="tagline">The kingdom has turned against you. Your castle has taken to the skies.</div>
          <div class="menu-buttons">
            <button class="btn gold-btn wide" data-act="play">Begin the Ascent</button>
            <button class="btn wide" data-act="archive">Royal Archive</button>
            <button class="btn wide" data-act="howto">How to Play</button>
            <button class="btn wide" data-act="settings">Settings</button>
          </div>
          <div class="menu-meta">
            <span class="crowns"><img src="${SR.Icons.get('crown')}" alt="">${d.crowns} Crowns</span>
            <span>Best flight: <b>${U.formatTime(d.best.time)}</b></span>
            <span>Most kills: <b>${d.best.kills}</b></span>
            <span>Flights: <b>${d.runs}</b></span>
            ${d.victories ? `<span>Victories: <b>${d.victories}</b></span>` : ''}
          </div>
          <div class="footer-note">WASD / Arrows to fly &nbsp;·&nbsp; Hold mouse to aim &nbsp;·&nbsp; B for shop &nbsp;·&nbsp; Esc to pause &nbsp;·&nbsp; M to mute</div>
        </div>`, {
        play: () => { SR.Audio.play('click'); this.startSelect(); },
        archive: () => { SR.Audio.play('click'); this.archive(); },
        howto: () => { SR.Audio.play('click'); this.howTo(() => this.mainMenu()); },
        settings: () => { SR.Audio.play('click'); this.settings(() => this.mainMenu()); },
      }, 'menu-bg');
    },

    // ---------- starting weapon choice ----------
    startSelect() {
      const d = SR.Save.data;
      if (!d.unlocked[d.startWeapon]) d.startWeapon = 'ballista';
      const cards = SR.WEAPON_ORDER.map((t) => {
        const w = SR.WEAPONS[t];
        const un = !!d.unlocked[t];
        const sel = d.startWeapon === t;
        return `<div class="card ${un ? '' : 'locked'} ${sel ? 'selected' : ''}" style="--rc:${un ? '#f0cf7a' : '#666'};width:190px;min-height:250px" data-act="pick" data-t="${t}">
          <div class="medal"><img src="${SR.Icons.get(w.icon)}" alt=""></div>
          <div class="name">${esc(w.name)}</div>
          <div class="desc" style="font-size:16px">${esc(w.desc)}</div>
          <div class="tag">${un ? (sel ? '✦ Selected ✦' : 'Click to select') : `Unlock in Archive · ${w.unlockCost} Crowns`}</div>
        </div>`;
      }).join('');
      this.show('start', `
        <div class="screen-inner">
          <h2 class="title">Choose Your First Weapon</h2>
          <h3 class="sub">Mounted atop the keep when the castle takes flight</h3>
          <div class="cards">${cards}</div>
          <div class="row-buttons">
            <button class="btn" data-act="back">Back</button>
            <button class="btn gold-btn wide" data-act="go">Take Flight</button>
          </div>
        </div>`, {
        pick: (ds) => {
          if (!d.unlocked[ds.t]) { SR.Audio.play('deny'); return; }
          d.startWeapon = ds.t; SR.Save.save(); SR.Audio.play('click'); this.startSelect();
        },
        back: () => { SR.Audio.play('click'); this.mainMenu(); },
        go: () => { SR.Audio.play('buy'); SR.Game.newRun(d.startWeapon); },
      }, 'menu-bg');
    },

    // ---------- meta shop ----------
    archive() {
      const d = SR.Save.data;
      const ups = SR.META_UPGRADES.map((m) => {
        const l = SR.Save.level(m.id);
        const maxed = l >= m.max;
        const cost = maxed ? 0 : m.cost(l);
        return `<div class="item ${maxed ? 'maxed' : ''}">
          <img class="icon" src="${SR.Icons.get(m.icon)}" alt="">
          <div class="body"><div class="nm">${esc(m.name)} ${pips(l, m.max)}</div>
          <div class="ds">${esc(maxed ? m.desc(l) : l ? `${m.desc(l)} → next: ${m.desc(l + 1)}` : m.desc(l + 1))}</div></div>
          <button class="btn small buy ${maxed ? '' : 'gold-btn'}" data-act="buy" data-id="${m.id}" ${maxed || d.crowns < cost ? 'disabled' : ''}>${maxed ? 'Max' : cost + ' ♛'}</button>
        </div>`;
      }).join('');
      const weps = SR.WEAPON_ORDER.filter((t) => t !== 'ballista').map((t) => {
        const w = SR.WEAPONS[t];
        const un = !!d.unlocked[t];
        return `<div class="item ${un ? 'maxed' : ''}">
          <img class="icon" src="${SR.Icons.get(w.icon)}" alt="">
          <div class="body"><div class="nm">${esc(w.name)}</div><div class="ds">${un ? 'Unlocked as a starting weapon.' : 'Unlock as a starting weapon.'}</div></div>
          <button class="btn small buy ${un ? '' : 'gold-btn'}" data-act="unlock" data-t="${t}" ${un || d.crowns < w.unlockCost ? 'disabled' : ''}>${un ? 'Owned' : w.unlockCost + ' ♛'}</button>
        </div>`;
      }).join('');
      this.show('archive', `
        <div class="screen-inner">
          <div class="window">
            <div class="window-head"><h2>The Royal Archive</h2>
              <span class="crowns"><img src="${SR.Icons.get('crown')}" alt="">${d.crowns} Crowns</span></div>
            <div class="dim" style="margin-bottom:10px">Permanent improvements, paid for with Crowns earned from every flight.</div>
            <div class="scroll">
              <div class="section-title">Castle Lineage</div>
              <div class="grid">${ups}</div>
              <div class="section-title">Starting Armaments</div>
              <div class="grid">${weps}</div>
            </div>
            <div class="row-buttons"><button class="btn" data-act="back">Back</button>
            <button class="btn red-btn small" data-act="reset" title="Erase all progress">Reset Progress</button></div>
          </div>
        </div>`, {
        buy: (ds) => {
          const m = SR.META_UPGRADES.find((x) => x.id === ds.id);
          const l = SR.Save.level(m.id);
          if (l >= m.max || d.crowns < m.cost(l)) { SR.Audio.play('deny'); return; }
          d.crowns -= m.cost(l); d.meta[m.id] = l + 1; SR.Save.save(); SR.Audio.play('buy'); this.archive();
        },
        unlock: (ds) => {
          const w = SR.WEAPONS[ds.t];
          if (d.unlocked[ds.t] || d.crowns < w.unlockCost) { SR.Audio.play('deny'); return; }
          d.crowns -= w.unlockCost; d.unlocked[ds.t] = true; SR.Save.save(); SR.Audio.play('buy'); this.archive();
        },
        reset: (ds, el) => {
          if (el.dataset.confirm) { SR.Save.reset(); SR.Audio.play('deny'); this.archive(); return; }
          el.dataset.confirm = '1'; el.textContent = 'Click again to confirm';
        },
        back: () => { SR.Audio.play('click'); this.mainMenu(); },
      }, 'menu-bg');
    },

    howTo(back) {
      this.show('howto', `
        <div class="screen-inner">
          <div class="window">
            <div class="window-head"><h2>How to Play</h2></div>
            <div class="howto">
              <h4>Fly</h4><p>Steer your floating castle with <b>WASD</b> or the <b>arrow keys</b> (drag on touch screens). Keep moving — the kingdom's army closes in from every side, mostly from behind.</p>
              <h4>Fight</h4><p>Your weapons fire automatically at enemies in range. <b>Hold the left mouse button</b> to aim the Ballista, Crossbow and Cannon manually at the cursor.</p>
              <h4>Grow</h4><p>Fallen foes drop <b>experience gems</b> and <b>gold</b>. Fly near them to collect. Each level lets you choose one of three upgrades — rarer ones are far stronger.</p>
              <h4>Build</h4><p>Press <b>B</b> to visit the Sky Merchant. Buy new weapons, upgrade each weapon's damage, speed, range, projectiles and special ability, repair the castle and raise new towers.</p>
              <h4>Evolve</h4><p>Your castle physically grows: new towers for each weapon slot, taller walls, iron plating, chapels, sails and spires. Slots also unlock at levels ${SR.SLOT_LEVELS.join(', ')}.</p>
              <h4>Nightfall</h4><p>Every four minutes night falls over the kingdom for about a minute and a half. The army marches by torchlight, fog rolls in and storms break overhead. The timer panel shows when dusk and dawn arrive. Ambience has its own volume slider in Settings.</p>
              <h4>Survive</h4><p>Army surges come every minute, elites (gold crowns) drop treasure chests, and a General attacks every 5 minutes. Defeat the King's Champion at 20:00 to win — or keep flying in endless mode.</p>
              <h4>Ascend</h4><p>When the castle falls you earn <b>Crowns</b>. Spend them in the Royal Archive on permanent upgrades and new starting weapons.</p>
              <h4>Tips</h4><p>Hold <b>Shift</b> to see your pickup radius. Trebuchets telegraph where boulders land — move! Engineers heal and shield nearby troops; kill them first.</p>
            </div>
            <div class="row-buttons"><button class="btn" data-act="back">Back</button></div>
          </div>
        </div>`, { back: () => { SR.Audio.play('click'); back(); } }, this.current === 'menu' ? 'menu-bg' : '');
    },

    settings(back) {
      const s = SR.Save.data.settings;
      const t = (k) => `<div class="toggle ${s[k] ? 'on' : ''}" data-act="toggle" data-k="${k}"></div>`;
      this.show('settings', `
        <div class="screen-inner" style="width:auto">
          <div class="window">
            <div class="window-head"><h2>Settings</h2></div>
            <div class="settings-list">
              <div class="setting">Sound effects ${t('sound')}</div>
              <div class="setting"><label for="vol">Effects volume</label> <input type="range" id="vol" min="0" max="1" step="0.05" value="${s.volume}"></div>
              <div class="setting"><label for="amb">Ambience volume</label> <input type="range" id="amb" min="0" max="1" step="0.05" value="${s.ambience}"></div>
              <div class="setting">Screen shake ${t('shake')}</div>
              <div class="setting">Damage numbers ${t('damageNumbers')}</div>
            </div>
            <div class="row-buttons"><button class="btn" data-act="back">Back</button></div>
          </div>
        </div>`, {
        toggle: (ds) => {
          s[ds.k] = !s[ds.k]; SR.Save.save(); SR.Game.applySettings(); SR.Audio.play('click'); this.settings(back);
        },
        back: () => { SR.Audio.play('click'); back(); },
      }, this.current === 'menu' ? 'menu-bg' : '');
      $('vol').addEventListener('input', (e) => { s.volume = parseFloat(e.target.value); SR.Game.applySettings(); });
      $('vol').addEventListener('change', () => { SR.Save.save(); SR.Audio.play('xp'); });
      $('amb').addEventListener('input', (e) => { s.ambience = parseFloat(e.target.value); SR.Game.applySettings(); });
      $('amb').addEventListener('change', () => { SR.Save.save(); SR.Ambience.bird(); });
    },

    // ---------- pause ----------
    pause() {
      const g = SR.Game, c = g.castle, s = c.stats;
      const box = (k, v, cls = '') => `<div class="stat-box"><div class="k">${k}</div><div class="v ${cls}">${v}</div></div>`;
      this.show('pause', `
        <div class="screen-inner">
          <h2 class="title">Paused</h2>
          <h3 class="sub">${U.formatTime(g.time)} aloft · Level ${c.level}</h3>
          <div class="menu-buttons">
            <button class="btn gold-btn wide" data-act="resume">Resume</button>
            <button class="btn wide" data-act="shop">Sky Merchant</button>
            <button class="btn wide" data-act="settings">Settings</button>
            <button class="btn wide" data-act="howto">How to Play</button>
            <button class="btn red-btn wide" data-act="quit">Abandon Flight</button>
          </div>
          <div class="stats-table" style="max-width:820px;margin:22px auto 0">
            ${box('Max Health', Math.round(s.maxHp))}${box('Armour', U.pct(s.armor))}${box('Regen', s.regen.toFixed(1) + '/s')}
            ${box('Damage', '×' + s.dmgMult.toFixed(2))}${box('Attack Speed', '×' + s.rateMult.toFixed(2))}${box('Range', '×' + s.rangeMult.toFixed(2))}
            ${box('Crit', U.pct(s.critChance) + ' / ×' + s.critMult.toFixed(2))}${box('Extra Projectiles', '+' + s.projBonus)}${box('Speed', Math.round(s.speed))}
            ${box('Gold Bonus', '×' + s.goldMult.toFixed(2), 'gold')}${box('XP Bonus', '×' + s.xpMult.toFixed(2))}${box('Luck', s.luck)}
          </div>
        </div>`, {
        resume: () => { SR.Audio.play('click'); g.resume(); },
        shop: () => { SR.Audio.play('click'); g.openShop(true); },
        settings: () => { SR.Audio.play('click'); this.settings(() => this.pause()); },
        howto: () => { SR.Audio.play('click'); this.howTo(() => this.pause()); },
        quit: (ds, el) => {
          if (el.dataset.confirm) { g.endRun(false); return; }
          el.dataset.confirm = '1'; el.textContent = 'Click again to abandon';
        },
      });
    },

    // ---------- level up ----------
    levelUp(picks, opts) {
      const g = SR.Game;
      const cards = picks.map((p, i) => {
        const u = p.up;
        return `<div class="card ${p.rarity.id}" style="--rc:${p.rarity.color}" data-act="choose" data-i="${i}">
          <div class="keyhint">${i + 1}</div>
          <div class="rarity">${p.rarity.name}</div>
          <div class="medal"><img src="${SR.Icons.get(u.icon)}" alt=""></div>
          <div class="name">${esc(SR.upgradeTitle(u))}</div>
          <div class="desc">${esc(u.desc(p.value, g))}</div>
          ${u.weapon && g.castle.getWeapon(u.weapon) ? `<div class="tag">${esc(SR.WEAPONS[u.weapon].name)} · Lv ${SR.weaponLevel(g.castle.getWeapon(u.weapon))}</div>` : ''}
        </div>`;
      }).join('');
      const title = opts.chest ? 'Treasure Chest!' : 'Level Up!';
      const sub = opts.chest ? `The elite's war chest yields ${opts.gold} gold and a rare boon` : `Level ${g.castle.level} reached${opts.pending > 1 ? ` · ${opts.pending - 1} more to choose` : ''}`;
      this.show('levelup', `
        <div class="screen-inner">
          <h2 class="title levelup-head">${title}</h2>
          <h3 class="sub">${esc(sub)}</h3>
          <div class="cards">${cards || '<div class="dim">No upgrades remain — take some gold instead.</div>'}</div>
          <div class="reroll-row">
            ${g.rerolls > 0 && !opts.chest ? `<button class="btn small" data-act="reroll"><span class="key">R</span> Reroll (${g.rerolls})</button>` : ''}
            ${!picks.length ? '<button class="btn gold-btn" data-act="skip">Take 50 gold</button>' : ''}
            <span class="dim">Press 1–3 to choose</span>
          </div>
        </div>`, {
        choose: (ds) => g.chooseUpgrade(parseInt(ds.i, 10)),
        reroll: () => g.reroll(),
        skip: () => { g.addGold(50, true); g.chooseUpgrade(-1); },
      });
    },

    // ---------- shop ----------
    shop(fromPause) {
      const g = SR.Game, c = g.castle, Shop = SR.Shop;
      const tab = this.shopTab;
      let body = '';
      if (tab === 'armoury') {
        const owned = c.ownedWeapons();
        body += owned.map((w) => {
          const def = SR.WEAPONS[w.type];
          const st = SR.weaponStats(w, c);
          const ups = ['damage', 'rate', 'range', 'proj', 'special'].map((k) => {
            const lv = w.lv[k], cap = SR.WEAPON_STAT_CAPS[k];
            const maxed = lv >= cap;
            const price = maxed ? 0 : Shop.statPrice(w, k);
            const label = k === 'special' ? def.special.name : SR.WEAPON_STAT_NAMES[k];
            const sub = k === 'special' ? def.special.desc(Math.min(5, st.special + (maxed ? 0 : 1))) :
              k === 'damage' ? '+22% damage' : k === 'rate' ? '+15% attack speed' : k === 'range' ? '+12% range' : '+1 projectile';
            return `<button class="up-btn" data-act="stat" data-t="${w.type}" data-k="${k}" ${maxed || c.gold < price ? 'disabled' : ''}>
              <span class="t">${esc(label)} ${pips(lv, cap)}</span>
              <span class="s">${esc(sub)}</span>
              <span class="c">${maxed ? 'MAXED' : `<span class="cost">${coin}${price}</span>`}</span>
            </button>`;
          }).join('');
          return `<div class="weapon-panel">
            <div class="wp-head"><img src="${SR.Icons.get(def.icon)}" alt="">
              <div><div class="wp-name">${esc(def.name)} <span class="gold-text" style="font-size:14px">Lv ${SR.weaponLevel(w)}</span></div>
              <div class="wp-stats">Damage <b>${Math.round(st.damage)}</b> · Rate <b>${(1 / st.cooldown).toFixed(2)}/s</b> · Range <b>${Math.round(st.range)}</b> · Projectiles <b>${st.projectiles}</b> · Special <b>${st.special}</b> · Kills <b>${w.kills}</b></div></div></div>
            <div class="ups">${ups}</div>
          </div>`;
        }).join('');
        const notOwned = SR.WEAPON_ORDER.filter((t) => !c.getWeapon(t));
        if (notOwned.length) {
          const free = c.freeSlots();
          body += `<div class="section-title">New Armaments ${free ? `<span class="dim">(${free} free slot${free > 1 ? 's' : ''})</span>` : '<span class="dim">— no free slots: build a tower in Fortifications</span>'}</div><div class="grid">`;
          body += notOwned.map((t) => {
            const def = SR.WEAPONS[t];
            const price = Shop.weaponPrice(g, t);
            return `<div class="item"><img class="icon" src="${SR.Icons.get(def.icon)}" alt="">
              <div class="body"><div class="nm">${esc(def.name)}</div><div class="ds">${esc(def.desc)}</div></div>
              <button class="btn small gold-btn buy" data-act="weapon" data-t="${t}" ${!free || c.gold < price ? 'disabled' : ''}><span class="cost">${coin}${price}</span></button></div>`;
          }).join('');
          body += '</div>';
        }
      } else {
        const rp = Shop.repairPrice(g);
        const full = c.hp >= c.stats.maxHp - 0.5;
        const sp = Shop.slotPrice(g);
        const slotMax = c.slotCount() >= SR.MAX_SLOTS || sp == null;
        body += '<div class="grid">';
        body += `<div class="item"><img class="icon" src="${SR.Icons.get('hammer')}" alt="">
          <div class="body"><div class="nm">Masons' Repairs</div><div class="ds">Restore 35% of max health. (${Math.round(c.hp)} / ${Math.round(c.stats.maxHp)})</div></div>
          <button class="btn small gold-btn buy" data-act="repair" ${full || c.gold < rp ? 'disabled' : ''}>${full ? 'Full' : `<span class="cost">${coin}${rp}</span>`}</button></div>`;
        body += `<div class="item ${slotMax ? 'maxed' : ''}"><img class="icon" src="${SR.Icons.get('tower')}" alt="">
          <div class="body"><div class="nm">Raise a Weapon Tower ${pips(c.slotCount(), SR.MAX_SLOTS)}</div><div class="ds">+1 weapon slot. A new tower is built on the castle.</div></div>
          <button class="btn small gold-btn buy" data-act="slot" ${slotMax || c.gold < sp ? 'disabled' : ''}>${slotMax ? 'Max' : `<span class="cost">${coin}${sp}</span>`}</button></div>`;
        for (const f of SR.FORTIFICATIONS) {
          const t = g.shopTiers[f.id] || 0, maxed = t >= f.max, price = maxed ? 0 : f.cost(t);
          body += `<div class="item ${maxed ? 'maxed' : ''}"><img class="icon" src="${SR.Icons.get(f.icon)}" alt="">
            <div class="body"><div class="nm">${esc(f.name)} ${pips(t, f.max)}</div><div class="ds">${esc(f.desc)}</div></div>
            <button class="btn small gold-btn buy" data-act="fort" data-id="${f.id}" ${maxed || c.gold < price ? 'disabled' : ''}>${maxed ? 'Max' : `<span class="cost">${coin}${price}</span>`}</button></div>`;
        }
        body += '</div>';
      }
      const keepScroll = this.current === 'shop' ? (document.querySelector('#screen .scroll') || {}).scrollTop : 0;
      this.show('shop', `
        <div class="screen-inner">
          <div class="window">
            <div class="window-head"><h2>The Sky Merchant</h2><span class="purse">${coin}${U.formatNum(c.gold)} gold</span></div>
            <div class="tabs">
              <div class="tab ${tab === 'armoury' ? 'active' : ''}" data-act="tab" data-t="armoury">Armoury</div>
              <div class="tab ${tab === 'forts' ? 'active' : ''}" data-act="tab" data-t="forts">Fortifications</div>
            </div>
            <div class="scroll">${body}</div>
            <div class="row-buttons"><button class="btn gold-btn" data-act="close"><span class="key">B</span> Return to the Skies</button></div>
          </div>
        </div>`, {
        tab: (ds) => { this.shopTab = ds.t; SR.Audio.play('click'); this.shop(fromPause); },
        stat: (ds) => { Shop.buyStat(g, ds.t, ds.k); this.shop(fromPause); },
        weapon: (ds) => { Shop.buyWeapon(g, ds.t); this.shop(fromPause); },
        repair: () => { Shop.buyRepair(g); this.shop(fromPause); },
        slot: () => { Shop.buySlot(g); this.shop(fromPause); },
        fort: (ds) => { Shop.buyFort(g, ds.id); this.shop(fromPause); },
        close: () => { SR.Audio.play('click'); g.closeShop(); },
      });
      const sc = document.querySelector('#screen .scroll');
      if (sc && keepScroll) sc.scrollTop = keepScroll;
    },

    // ---------- end of run ----------
    summary(sum, victory) {
      const box = (k, v, cls = '') => `<div class="stat-box"><div class="k">${k}</div><div class="v ${cls}">${v}</div></div>`;
      const chips = sum.weapons.map((w) => `<span class="chip"><img src="${SR.Icons.get(SR.WEAPONS[w.type].icon)}" alt="">${esc(SR.WEAPONS[w.type].name)} · Lv ${w.level} · ${U.formatNum(w.dmg)} dmg</span>`).join('');
      this.show('gameover', `
        <div class="screen-inner">
          <h2 class="title" style="${victory ? '' : 'color:#ff8a6a'}">${victory ? 'Victory!' : 'The Castle Has Fallen'}</h2>
          <h3 class="sub">${victory ? "The King's Champion is slain — the skies are yours" : sum.newBest ? 'A new record flight!' : 'The kingdom claims its prize… for now'}</h3>
          <div class="stats-table" style="max-width:900px;margin:0 auto">
            ${box('Survival Time', U.formatTime(sum.time))}${box('Enemies Defeated', U.formatNum(sum.kills))}${box('Highest Level', sum.level)}
            ${box('Gold Collected', U.formatNum(sum.gold), 'gold')}${box('Bosses Defeated', sum.bosses)}${box('Elites Slain', sum.elites)}
            ${box('Damage Dealt', U.formatNum(sum.damage))}${box('Damage Taken', U.formatNum(sum.taken))}${box('Upgrades Chosen', sum.upgrades)}
          </div>
          <div class="section-title" style="text-align:center">Weapons Unlocked</div>
          <div class="weapon-chips">${chips || '<span class="dim">None</span>'}</div>
          <div class="reward"><img src="${SR.Icons.get('crown')}" alt="">+${sum.crowns} Crowns earned</div>
          <div class="row-buttons">
            <button class="btn gold-btn wide" data-act="again">Rise Again</button>
            <button class="btn" data-act="archive">Royal Archive</button>
            <button class="btn" data-act="menu">Main Menu</button>
          </div>
        </div>`, {
        again: () => { SR.Audio.play('click'); SR.Game.toMenu(true); this.startSelect(); },
        archive: () => { SR.Audio.play('click'); SR.Game.toMenu(true); this.archive(); },
        menu: () => { SR.Audio.play('click'); SR.Game.toMenu(); },
      });
    },

    victoryChoice() {
      const g = SR.Game;
      this.show('victory', `
        <div class="screen-inner">
          <h1 class="logo" style="font-size:clamp(40px,8vw,90px)">VICTORY</h1>
          <div class="tagline">${esc(SR.BOSS_NAMES[3])} has fallen. The kingdom's army wavers.</div>
          <div class="menu-buttons">
            <button class="btn gold-btn wide" data-act="claim">Claim Victory</button>
            <button class="btn wide" data-act="endless">Fly On — Endless Mode</button>
          </div>
          <div class="footer-note">Endless mode keeps your castle and rewards, with ever-stronger armies.</div>
        </div>`, {
        claim: () => { SR.Audio.play('click'); g.endRun(true); },
        endless: () => { SR.Audio.play('click'); g.endless = true; g.resume(); g.announce('Endless flight begins', 'boss'); },
      });
    },

    // ---------- HUD ----------
    announce(text, cls = '') {
      const box = $('announce');
      const el = document.createElement('div');
      el.className = 'announce-msg ' + cls;
      el.textContent = text;
      box.appendChild(el);
      while (box.children.length > 3) box.removeChild(box.firstChild);
      setTimeout(() => el.remove(), 3000);
    },
    hint(text, dur = 6000) {
      const h = $('hint');
      h.textContent = text; h.classList.remove('hidden'); h.style.opacity = 1;
      clearTimeout(this._hintT);
      this._hintT = setTimeout(() => { h.style.opacity = 0; setTimeout(() => h.classList.add('hidden'), 1000); }, dur);
    },

    set(id, val) {
      if (this.hudCache[id] === val) return false;
      this.hudCache[id] = val;
      $(id).textContent = val;
      return true;
    },
    resetHUD() { this.hudCache = {}; $('weapon-bar').innerHTML = ''; $('announce').innerHTML = ''; },

    updateHUD(g) {
      const c = g.castle, s = c.stats;
      const hpFrac = U.clamp(c.hp / s.maxHp, 0, 1);
      const hpW = (hpFrac * 100).toFixed(1) + '%';
      if (this.hudCache.hpW !== hpW) {
        this.hudCache.hpW = hpW;
        $('hp-fill').style.width = hpW; $('hp-lag').style.width = hpW;
        $('hp-fill').classList.toggle('low', hpFrac < 0.3);
      }
      this.set('hp-text', `${Math.ceil(Math.max(0, c.hp))} / ${Math.round(s.maxHp)}`);
      const xpW = (U.clamp(c.xp / c.xpNext, 0, 1) * 100).toFixed(1) + '%';
      if (this.hudCache.xpW !== xpW) { this.hudCache.xpW = xpW; $('xp-fill').style.width = xpW; }
      if (this.set('level-num', String(c.level)) && c.level > 1) {
        const b = $('level-badge'); b.classList.remove('pulse'); void b.offsetWidth; b.classList.add('pulse');
      }
      this.set('timer', U.formatTime(g.time));
      const ph = SR.Night.phaseInfo(g.time);
      if (this.set('phase', `${ph.label} · ${ph.next} in ${U.formatTime(ph.left)}`)) $('phase').className = ph.night ? 'night' : 'day';
      if (this.set('gold', U.formatNum(c.gold))) { const el = $('gold'); el.classList.remove('bump'); void el.offsetWidth; el.classList.add('bump'); }
      this.set('kills', U.formatNum(g.stats.kills));
      this.set('hud-armor', U.pct(s.armor));
      this.set('hud-regen', s.regen.toFixed(1));
      this.set('hud-rerolls', String(g.rerolls));
      const aeg = c.aegisReady ? '1' : '0';
      if (this.hudCache.aegis !== aeg) { this.hudCache.aegis = aeg; $('aegis-pip').classList.toggle('hidden', !c.aegisReady); }

      // boss bar
      const boss = g.director && g.director.boss;
      const bk = boss ? boss.id : 0;
      if (this.hudCache.boss !== bk) { this.hudCache.boss = bk; $('boss-bar').classList.toggle('hidden', !boss); if (boss) $('boss-name').textContent = boss.name; }
      if (boss) { const w = (U.clamp(boss.hp / boss.maxHp, 0, 1) * 100).toFixed(1) + '%'; if (this.hudCache.bossW !== w) { this.hudCache.bossW = w; $('boss-fill').style.width = w; } }

      // weapon slots
      const sig = c.slotCount() + '|' + c.weapons.map((w) => (w ? w.type + SR.weaponLevel(w) : '-')).join(',');
      const bar = $('weapon-bar');
      if (this.hudCache.wsig !== sig) {
        this.hudCache.wsig = sig;
        let html = '';
        for (let i = 0; i < SR.MAX_SLOTS; i++) {
          const w = c.weapons[i];
          if (w) html += `<div class="wslot" title="${esc(SR.WEAPONS[w.type].name)}"><img src="${SR.Icons.get(SR.WEAPONS[w.type].icon)}" alt=""><div class="cd"></div><span class="lvl">${SR.weaponLevel(w)}</span></div>`;
          else if (i < c.slotCount()) html += '<div class="wslot empty" title="Empty slot — buy a weapon in the shop (B)">+</div>';
          else html += `<div class="wslot locked" title="Locked slot"><img src="${SR.Icons.get('lock')}" alt=""></div>`;
        }
        bar.innerHTML = html;
        bar.className = 'panel';
      }
      const cds = bar.querySelectorAll('.wslot .cd');
      let k = 0;
      for (let i = 0; i < SR.MAX_SLOTS; i++) {
        const w = c.weapons[i];
        if (!w) continue;
        const st = SR.weaponStats(w, c);
        const v = U.clamp(w.cd / st.cooldown, 0, 1);
        if (cds[k]) cds[k].style.setProperty('--cd', v.toFixed(2));
        k++;
      }
    },
  };

  SR.UI = UI;
})(window.SR);
