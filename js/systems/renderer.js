'use strict';
// Draws the world each frame: terrain, shadows, enemies, castle, projectiles, FX.
(function (SR) {
  const U = SR.U, TAU = Math.PI * 2;

  const gemSprites = {};
  function gemSprite(color, glow) {
    const k = color;
    if (gemSprites[k]) return gemSprites[k];
    const cv = U.makeCanvas(40, 40);
    const c = cv.getContext('2d');
    const g = c.createRadialGradient(20, 20, 1, 20, 20, 18);
    g.addColorStop(0, glow); g.addColorStop(1, 'rgba(0,0,0,0)');
    c.fillStyle = g; c.fillRect(0, 0, 40, 40);
    c.fillStyle = color; c.strokeStyle = 'rgba(255,255,255,0.85)'; c.lineWidth = 1.2;
    c.beginPath(); c.moveTo(20, 9); c.lineTo(27, 20); c.lineTo(20, 31); c.lineTo(13, 20); c.closePath(); c.fill(); c.stroke();
    c.fillStyle = 'rgba(255,255,255,0.55)';
    c.beginPath(); c.moveTo(20, 11); c.lineTo(24, 19); c.lineTo(20, 20); c.closePath(); c.fill();
    gemSprites[k] = cv;
    return cv;
  }
  const icons = {};
  function iconImg(key) {
    if (!icons[key]) { const im = new Image(); im.src = SR.Icons.get(key); icons[key] = im; }
    return icons[key];
  }

  const Renderer = {
    canvas: null, ctx: null, dpr: 1, w: 0, h: 0, zoom: 1,

    init(canvas) {
      this.canvas = canvas;
      this.ctx = canvas.getContext('2d');
      this.resize();
      window.addEventListener('resize', () => this.resize());
      ['chest', 'heart', 'magnet'].forEach(iconImg);
    },
    resize() {
      this.dpr = Math.min(2, window.devicePixelRatio || 1);
      this.w = window.innerWidth; this.h = window.innerHeight;
      this.canvas.width = Math.floor(this.w * this.dpr);
      this.canvas.height = Math.floor(this.h * this.dpr);
      this.canvas.style.width = this.w + 'px';
      this.canvas.style.height = this.h + 'px';
      this.zoom = this.h > this.w * 1.1
        ? U.clamp(Math.min(this.w / 720, this.h / 1300), 0.42, 1.8) // portrait phones
        : U.clamp(Math.min(this.w / 1250, this.h / 740), 0.42, 1.8);
    },
    setWorld(ctx) { const t = this.wt; ctx.setTransform(t.a, 0, 0, t.a, t.e, t.f); },
    screenToWorld(sx, sy, cam) {
      return { x: (sx - this.w / 2) / this.zoom + cam.x, y: (sy - this.h / 2) / this.zoom + cam.y };
    },

    draw(game) {
      const ctx = this.ctx, z = this.zoom, dpr = this.dpr;
      const cam = game.camera;
      const sx = (Math.random() - 0.5) * 2 * game.shakeAmt, sy = (Math.random() - 0.5) * 2 * game.shakeAmt;
      const vw = this.w / z, vh = this.h / z;
      game.viewW = vw; game.viewH = vh;
      const x0 = cam.x - vw / 2 - 40, y0 = cam.y - vh / 2 - 40, x1 = cam.x + vw / 2 + 40, y1 = cam.y + vh / 2 + 40;
      const T = game.time;
      const rt = game.realTime;

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.fillStyle = '#4f6e5a';
      ctx.fillRect(0, 0, this.w, this.h);
      this.wt = { a: dpr * z, e: dpr * (this.w / 2 - cam.x * z + sx), f: dpr * (this.h / 2 - cam.y * z + sy) };
      this.setWorld(ctx);
      ctx.imageSmoothingEnabled = true;

      // ---- ground
      SR.Terrain.draw(ctx, x0, y0, x1, y1, game.state === 'menu' ? 1 : 2);
      const inView = (o, m = 60) => o.x > x0 - m && o.x < x1 + m && o.y > y0 - m && o.y < y1 + m;

      // fire zones
      for (const zn of game.zones) {
        const k = zn.t / zn.dur, a = (1 - k) * 0.55;
        const g = ctx.createRadialGradient(zn.x, zn.y, 2, zn.x, zn.y, zn.r);
        g.addColorStop(0, `rgba(255,170,60,${a})`); g.addColorStop(0.7, `rgba(255,80,20,${a * 0.6})`); g.addColorStop(1, 'rgba(255,60,20,0)');
        ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(zn.x, zn.y, zn.r, zn.r * 0.6, 0, 0, TAU); ctx.fill();
      }
      // boulder target warnings
      for (const p of game.eproj) {
        if (p.kind !== 'boulder') continue;
        const k = p.t / p.dur;
        ctx.strokeStyle = `rgba(255,60,40,${0.4 + k * 0.5})`; ctx.lineWidth = 2;
        ctx.setLineDash([6, 5]);
        ctx.beginPath(); ctx.ellipse(p.tx, p.ty, p.radius, p.radius * 0.6, 0, 0, TAU); ctx.stroke();
        ctx.setLineDash([]);
        ctx.fillStyle = `rgba(255,60,40,${0.12 + k * 0.18})`;
        ctx.beginPath(); ctx.ellipse(p.tx, p.ty, p.radius * k, p.radius * 0.6 * k, 0, 0, TAU); ctx.fill();
      }

      // castle shadow
      const c = game.castle;
      if (c.art && game.state !== 'menu-empty') {
        const R = c.art.R;
        ctx.fillStyle = 'rgba(15,25,20,0.28)';
        ctx.beginPath(); ctx.ellipse(c.x + 40, c.y + 150, R * 1.35, R * 0.7, 0, 0, TAU); ctx.fill();
      }

      // pickups
      for (const p of game.pickups) {
        if (!inView(p)) continue;
        const bob = Math.sin(p.t * 4 + p.x) * 2;
        if (p.kind === 'xp') {
          const v = p.v;
          const sp = v >= 30 ? gemSprite('#ffcf4a', 'rgba(255,210,80,0.6)') : v >= 10 ? gemSprite('#d45cff', 'rgba(200,90,255,0.5)') : v >= 3 ? gemSprite('#52e07a', 'rgba(80,230,120,0.45)') : gemSprite('#4fb4ff', 'rgba(80,170,255,0.45)');
          const s = v >= 30 ? 30 : v >= 10 ? 24 : v >= 3 ? 20 : 16;
          ctx.drawImage(sp, p.x - s / 2, p.y - s / 2 + bob, s, s);
        } else if (p.kind === 'gold') {
          const sxx = Math.abs(Math.cos(p.t * 5 + p.x));
          const r = p.v >= 20 ? 7 : p.v >= 5 ? 5.5 : 4.5;
          ctx.fillStyle = '#8a6326';
          ctx.beginPath(); ctx.ellipse(p.x, p.y + bob + 1, r * Math.max(0.2, sxx), r, 0, 0, TAU); ctx.fill();
          ctx.fillStyle = '#ffd75a';
          ctx.beginPath(); ctx.ellipse(p.x, p.y + bob, r * Math.max(0.2, sxx), r, 0, 0, TAU); ctx.fill();
          ctx.fillStyle = '#fff3c0';
          ctx.fillRect(p.x - 1, p.y + bob - r * 0.6, 2 * sxx, 2);
        } else {
          const im = iconImg(p.kind);
          const s = p.kind === 'chest' ? 34 : 24;
          const g = ctx.createRadialGradient(p.x, p.y + bob, 1, p.x, p.y + bob, s);
          g.addColorStop(0, p.kind === 'chest' ? 'rgba(255,215,90,0.6)' : 'rgba(255,255,255,0.4)'); g.addColorStop(1, 'rgba(255,215,90,0)');
          ctx.fillStyle = g; ctx.beginPath(); ctx.arc(p.x, p.y + bob, s, 0, TAU); ctx.fill();
          if (im.complete) ctx.drawImage(im, p.x - s / 2, p.y - s / 2 + bob, s, s);
        }
      }

      // corpses
      game.fx.drawCorpses(ctx);

      // enemies: sort by y for painterly overlap
      const ground = [], air = [];
      for (const e of game.enemies) { if (e.dead || !inView(e, 80)) continue; (e.flying ? air : ground).push(e); }
      ground.sort((a, b) => a.y - b.y);
      for (const e of ground) this.drawEnemyShadow(ctx, e);
      for (const e of air) { ctx.fillStyle = 'rgba(10,20,10,0.22)'; ctx.beginPath(); ctx.ellipse(e.x + 20, e.y + 60, e.r * 0.9, e.r * 0.4, 0, 0, TAU); ctx.fill(); }
      for (const e of ground) this.drawEnemy(ctx, e, T);

      // shell shadows
      for (const p of game.pproj) if (p.kind === 'shell') { ctx.fillStyle = 'rgba(0,0,0,0.25)'; ctx.beginPath(); ctx.ellipse(p.x, p.y, 6, 3, 0, 0, TAU); ctx.fill(); }

      // ---- low cloud layer (screen space)
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      SR.Clouds.draw(ctx, 0, cam.x, cam.y, this.w, this.h, z, rt);
      this.setWorld(ctx);

      // ---- castle
      if (c.art) {
        this.drawCastle(ctx, c, game, T);
        // troops hidden beneath the castle are shown as faint silhouettes
        const R = c.art.R;
        ctx.globalAlpha = 0.22;
        for (const e of ground) {
          const dx = e.x - c.x, dy = e.y - c.y;
          if (Math.abs(dx) < R * 1.25 && dy > -R * 1.9 && dy < R * 1.7) this.drawEnemy(ctx, e, T);
        }
        ctx.globalAlpha = 1;
      }

      // ---- player projectiles
      this.drawPlayerProjectiles(ctx, game);

      // ---- flying enemies
      for (const e of air) this.drawEnemy(ctx, e, T);

      // ---- enemy projectiles
      this.drawEnemyProjectiles(ctx, game);

      // ---- fx
      game.fx.drawWorld(ctx);

      // ---- night lighting pass (no-op by day)
      SR.Night.draw(ctx, game, this, inView);

      // health bars
      for (const e of ground.concat(air)) {
        if (e.boss || e.hp >= e.maxHp) continue;
        const w = Math.max(16, e.r * 1.8), y = e.y - e.r * 1.5 - (e.flying ? 6 : 0);
        ctx.fillStyle = 'rgba(0,0,0,0.6)'; ctx.fillRect(e.x - w / 2 - 1, y - 1, w + 2, 4);
        ctx.fillStyle = e.elite ? '#ffcf4a' : '#e0453a'; ctx.fillRect(e.x - w / 2, y, w * Math.max(0, e.hp / e.maxHp), 2);
      }
      game.fx.drawNumbers(ctx);

      // ---- screen space overlays
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      SR.Clouds.draw(ctx, 1, cam.x, cam.y, this.w, this.h, z, rt, 1 - 0.7 * (game.state === 'menu' ? 0 : game.night || 0));
      // vignette
      const vg = ctx.createRadialGradient(this.w / 2, this.h / 2, Math.min(this.w, this.h) * 0.35, this.w / 2, this.h / 2, Math.max(this.w, this.h) * 0.75);
      vg.addColorStop(0, 'rgba(10,15,30,0)'); vg.addColorStop(1, 'rgba(10,15,30,0.55)');
      ctx.fillStyle = vg; ctx.fillRect(0, 0, this.w, this.h);
      SR.Night.vignette(ctx, game, this.w, this.h);
      if (game.state !== 'menu') {
        const frac = c.hp / c.stats.maxHp;
        const hurt = Math.max(c.flash * 0.9, frac < 0.3 ? (0.25 + Math.sin(rt * 5) * 0.12) * (1 - frac / 0.3) : 0);
        if (hurt > 0.01) {
          const rg = ctx.createRadialGradient(this.w / 2, this.h / 2, Math.min(this.w, this.h) * 0.3, this.w / 2, this.h / 2, Math.max(this.w, this.h) * 0.7);
          rg.addColorStop(0, 'rgba(180,20,10,0)'); rg.addColorStop(1, `rgba(180,20,10,${Math.min(0.6, hurt)})`);
          ctx.fillStyle = rg; ctx.fillRect(0, 0, this.w, this.h);
        }
        this.drawIndicators(ctx, game);
        if (game.manualAim) this.drawCrosshair(ctx, SR.Input.mouse.x, SR.Input.mouse.y, rt);
      }
    },

    drawEnemyShadow(ctx, e) {
      ctx.fillStyle = 'rgba(10,20,10,0.3)';
      ctx.beginPath(); ctx.ellipse(e.x, e.y + e.r * 0.75, e.r * 0.85, e.r * 0.32, 0, 0, TAU); ctx.fill();
    },

    drawEnemy(ctx, e, T) {
      const sp = SR.EnemyArt.get(e.type);
      if (!sp) return;
      const nf = sp.frames.length;
      let f = 0;
      if (nf === 3) f = [0, 1, 2, 1][Math.floor(e.t * 9) % 4];
      else if (nf === 2) f = Math.floor(e.t * (e.chargeT > 0 ? 12 : 6)) % 2;
      const img = sp.frames[f];
      const s = e.scale * 1.15;
      const fy = e.flying ? Math.sin(e.t * 3) * 4 - 6 : (f ? -0.8 : 0);
      if (e.elite || e.boss) {
        const pulse = 1 + Math.sin(T * 5) * 0.12;
        const g = ctx.createRadialGradient(e.x, e.y, 2, e.x, e.y, e.r * 2.2 * pulse);
        g.addColorStop(0, e.boss ? 'rgba(200,60,255,0.45)' : 'rgba(255,210,80,0.5)'); g.addColorStop(1, 'rgba(255,200,60,0)');
        ctx.fillStyle = g; ctx.beginPath(); ctx.arc(e.x, e.y, e.r * 2.2 * pulse, 0, TAU); ctx.fill();
      }
      if (e.aura > 0) {
        ctx.strokeStyle = 'rgba(120,200,255,0.55)'; ctx.lineWidth = 1.2;
        ctx.beginPath(); ctx.ellipse(e.x, e.y + e.r * 0.6, e.r, e.r * 0.4, 0, 0, TAU); ctx.stroke();
      }
      const t = this.wt, fl = e.facing < 0 ? -1 : 1;
      const lunge = e.attackAnim > 0 && !e.flying ? e.attackAnim * 10 * fl : 0;
      ctx.setTransform(t.a * fl, 0, 0, t.a, t.e + t.a * (e.x + lunge), t.f + t.a * (e.y + fy));
      const o = -sp.half * s, sz = sp.size * s;
      ctx.drawImage(img, o, o, sz, sz);
      if (e.flash > 0) {
        // brief white hit flash (subtler on bosses, which are hit constantly)
        const ga = ctx.globalAlpha;
        ctx.globalAlpha = ga * (e.boss || e.elite ? 0.35 : 0.8);
        ctx.drawImage(sp.whites[f], o, o, sz, sz);
        ctx.globalAlpha = ga;
      }
      ctx.setTransform(t.a, 0, 0, t.a, t.e, t.f);
      if (e.type === 'trebuchet') SR.EnemyArt.drawTrebuchetArm(ctx, e.x, e.y, e.facing > 0 ? e.armAng : Math.PI - e.armAng, s);
      if (e.burnT > 0) {
        ctx.fillStyle = `rgba(255,120,30,${0.25 + Math.sin(T * 20) * 0.1})`;
        ctx.beginPath(); ctx.arc(e.x, e.y, e.r * 0.9, 0, TAU); ctx.fill();
      }
      if (e.stun > 0) {
        for (let i = 0; i < 3; i++) {
          const a = T * 6 + i * TAU / 3;
          ctx.fillStyle = '#fff36a';
          ctx.beginPath(); ctx.arc(e.x + Math.cos(a) * e.r * 0.7, e.y - e.r * 1.4 + Math.sin(a) * 3, 2, 0, TAU); ctx.fill();
        }
      }
      if (e.elite) {
        ctx.fillStyle = '#ffcf4a'; ctx.strokeStyle = '#5a3d10'; ctx.lineWidth = 1;
        const y = e.y - e.r * 1.9;
        ctx.beginPath(); ctx.moveTo(e.x - 6, y + 4); ctx.lineTo(e.x - 6, y - 2); ctx.lineTo(e.x - 3, y + 1); ctx.lineTo(e.x, y - 4); ctx.lineTo(e.x + 3, y + 1); ctx.lineTo(e.x + 6, y - 2); ctx.lineTo(e.x + 6, y + 4); ctx.closePath(); ctx.fill(); ctx.stroke();
      }
    },

    drawCastle(ctx, c, game, T) {
      const a = c.art;
      const bob = c.bob;
      // magical levitation glow beneath
      const gl = ctx.createRadialGradient(c.x, c.y + a.R * 1.1 + bob, 4, c.x, c.y + a.R * 1.1 + bob, a.R * 1.4);
      gl.addColorStop(0, `rgba(110,200,255,${0.35 + Math.sin(T * 2) * 0.08})`); gl.addColorStop(1, 'rgba(110,200,255,0)');
      ctx.fillStyle = gl; ctx.beginPath(); ctx.arc(c.x, c.y + a.R * 1.1 + bob, a.R * 1.4, 0, TAU); ctx.fill();

      ctx.save();
      ctx.translate(c.x, c.y + bob);
      ctx.rotate(c.tilt);
      const baseA = c.dying ? Math.max(0, 1 - c.dying * 0.35) : 1;
      if (c.dying) { ctx.rotate(c.dying * 0.25); ctx.globalAlpha = baseA; }
      const flashShake = c.flash > 0 ? (Math.random() - 0.5) * c.flash * 6 : 0;
      ctx.drawImage(a.canvas, -a.ox + flashShake, -a.oy, a.W, a.H);
      if (c.flash > 0) { ctx.globalAlpha = baseA * Math.min(0.5, c.flash * 1.2); ctx.drawImage(a.flash, -a.ox + flashShake, -a.oy, a.W, a.H); ctx.globalAlpha = baseA; }
      // weapons
      for (let i = 0; i < SR.MAX_SLOTS; i++) {
        const m = a.mounts[i];
        if (!m) continue;
        const w = c.weapons[i];
        if (w) {
          const lvl = SR.weaponLevel(w);
          SR.WeaponArt.draw(ctx, w.type, m.x, m.y - 2, w.aim - c.tilt, w.recoil, T, (i === 0 ? 1.05 : 0.92) * (1 + Math.min(0.25, lvl * 0.012)), lvl);
        } else if (i < c.slotCount()) SR.WeaponArt.drawEmpty(ctx, m.x, m.y, T);
      }
      ctx.restore();
      // aegis bubble
      if (c.aegisReady) {
        const r = a.R * 1.45;
        ctx.strokeStyle = `rgba(255,230,140,${0.45 + Math.sin(T * 4) * 0.15})`; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.ellipse(c.x, c.y - a.R * 0.2 + bob, r, r * 0.9, 0, 0, TAU); ctx.stroke();
        const g = ctx.createRadialGradient(c.x, c.y + bob, r * 0.6, c.x, c.y + bob, r);
        g.addColorStop(0, 'rgba(255,230,140,0)'); g.addColorStop(1, 'rgba(255,230,140,0.12)');
        ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(c.x, c.y - a.R * 0.2 + bob, r, r * 0.9, 0, 0, TAU); ctx.fill();
      }
      // pickup radius hint
      if (game.state === 'playing' && SR.Input.keys.ShiftLeft) {
        ctx.strokeStyle = 'rgba(160,220,255,0.35)'; ctx.setLineDash([4, 6]);
        ctx.beginPath(); ctx.arc(c.x, c.y, c.stats.pickup, 0, TAU); ctx.stroke(); ctx.setLineDash([]);
      }
    },

    drawPlayerProjectiles(ctx, game) {
      ctx.lineCap = 'round';
      for (const p of game.pproj) {
        if (p.kind === 'bolt' || p.kind === 'quarrel') {
          if (p.trail && p.trail.length > 2) {
            ctx.strokeStyle = p.kind === 'bolt' ? 'rgba(255,230,160,0.35)' : 'rgba(210,225,255,0.3)';
            ctx.lineWidth = p.kind === 'bolt' ? 3 : 2;
            ctx.beginPath(); ctx.moveTo(p.trail[0], p.trail[1]);
            for (let i = 2; i < p.trail.length; i += 2) ctx.lineTo(p.trail[i], p.trail[i + 1]);
            ctx.lineTo(p.x, p.y); ctx.stroke();
          }
          const a = Math.atan2(p.vy, p.vx);
          const L = p.kind === 'bolt' ? 16 : 9;
          ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(a);
          ctx.strokeStyle = p.kind === 'bolt' ? '#c9a46a' : '#a8b4c8'; ctx.lineWidth = p.kind === 'bolt' ? 2.6 : 1.6;
          ctx.beginPath(); ctx.moveTo(-L, 0); ctx.lineTo(L * 0.6, 0); ctx.stroke();
          ctx.fillStyle = '#eef3f8';
          ctx.beginPath(); ctx.moveTo(L, 0); ctx.lineTo(L * 0.5, -3); ctx.lineTo(L * 0.5, 3); ctx.closePath(); ctx.fill();
          ctx.fillStyle = p.kind === 'bolt' ? '#c0392b' : '#3b6fb0';
          ctx.fillRect(-L, -2.5, 4, 5);
          ctx.restore();
        } else if (p.kind === 'fireball') {
          if (p.trail) {
            for (let i = 0; i < p.trail.length; i += 2) {
              const k = i / p.trail.length;
              ctx.fillStyle = `rgba(255,${120 + k * 80},40,${k * 0.5})`;
              ctx.beginPath(); ctx.arc(p.trail[i], p.trail[i + 1], 3 + k * 5, 0, TAU); ctx.fill();
            }
          }
          const g = ctx.createRadialGradient(p.x, p.y, 1, p.x, p.y, 16);
          g.addColorStop(0, '#fff6c9'); g.addColorStop(0.35, '#ffb43a'); g.addColorStop(0.7, 'rgba(255,80,20,0.6)'); g.addColorStop(1, 'rgba(255,60,20,0)');
          ctx.fillStyle = g; ctx.beginPath(); ctx.arc(p.x, p.y, 16, 0, TAU); ctx.fill();
        } else if (p.kind === 'shell') {
          const y = p.y - (p.z || 0);
          const r = p.small ? 3.5 : 5.5;
          ctx.fillStyle = '#1c1c22'; ctx.beginPath(); ctx.arc(p.x, y, r, 0, TAU); ctx.fill();
          ctx.fillStyle = 'rgba(255,255,255,0.35)'; ctx.beginPath(); ctx.arc(p.x - r * 0.3, y - r * 0.3, r * 0.35, 0, TAU); ctx.fill();
          ctx.fillStyle = '#ffcf4a'; ctx.beginPath(); ctx.arc(p.x + r * 0.7, y - r * 0.7, 1.4, 0, TAU); ctx.fill();
        }
      }
    },

    drawEnemyProjectiles(ctx, game) {
      for (const p of game.eproj) {
        if (p.kind === 'boulder') {
          const y = p.y - (p.z || 0);
          ctx.fillStyle = 'rgba(0,0,0,0.25)'; ctx.beginPath(); ctx.ellipse(p.x, p.y, 9, 4, 0, 0, TAU); ctx.fill();
          ctx.fillStyle = '#7d7466'; ctx.beginPath(); ctx.arc(p.x, y, 10, 0, TAU); ctx.fill();
          ctx.fillStyle = '#9c9282'; ctx.beginPath(); ctx.arc(p.x - 3, y - 3, 5, 0, TAU); ctx.fill();
          ctx.strokeStyle = '#3d362e'; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(p.x, y, 10, 0, TAU); ctx.stroke();
          continue;
        }
        const a = Math.atan2(p.vy, p.vx);
        // arrows arc slightly (visual height)
        const k = p.total ? Math.min(1, p.t / p.total) : 0;
        const lift = p.kind === 'arrow' ? Math.sin(k * Math.PI) * 18 : 0;
        ctx.save(); ctx.translate(p.x, p.y - lift); ctx.rotate(a);
        if (p.kind === 'bolt' || p.kind === 'warbolt') {
          ctx.strokeStyle = p.kind === 'warbolt' ? 'rgba(210,110,255,0.5)' : 'rgba(255,90,60,0.35)'; ctx.lineWidth = 3;
          ctx.beginPath(); ctx.moveTo(-14, 0); ctx.lineTo(0, 0); ctx.stroke();
          ctx.strokeStyle = '#3a2a1a'; ctx.lineWidth = 2;
          ctx.beginPath(); ctx.moveTo(-8, 0); ctx.lineTo(6, 0); ctx.stroke();
          ctx.fillStyle = '#ff6a4a'; ctx.beginPath(); ctx.moveTo(9, 0); ctx.lineTo(4, -3); ctx.lineTo(4, 3); ctx.closePath(); ctx.fill();
        } else {
          ctx.strokeStyle = '#5a3a20'; ctx.lineWidth = 1.4;
          ctx.beginPath(); ctx.moveTo(-9, 0); ctx.lineTo(6, 0); ctx.stroke();
          ctx.fillStyle = '#ff7a5a'; ctx.beginPath(); ctx.moveTo(8, 0); ctx.lineTo(4, -2.5); ctx.lineTo(4, 2.5); ctx.closePath(); ctx.fill();
          ctx.fillStyle = '#efe4c8'; ctx.fillRect(-9, -2, 3, 4);
        }
        ctx.restore();
      }
    },

    // Edge-of-screen arrows pointing at off-screen bosses and elites
    drawIndicators(ctx, game) {
      const cam = game.camera, z = this.zoom;
      for (const e of game.enemies) {
        if (e.dead || !(e.boss || e.elite)) continue;
        const sx = (e.x - cam.x) * z + this.w / 2, sy = (e.y - cam.y) * z + this.h / 2;
        if (sx > 0 && sx < this.w && sy > 0 && sy < this.h) continue;
        const a = Math.atan2(sy - this.h / 2, sx - this.w / 2);
        const m = 34;
        const ex = U.clamp(sx, m, this.w - m), ey = U.clamp(sy, m + 40, this.h - m - 70);
        ctx.save(); ctx.translate(ex, ey); ctx.rotate(a);
        ctx.fillStyle = e.boss ? '#d26bff' : '#ffcf4a'; ctx.strokeStyle = 'rgba(0,0,0,0.7)'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(14, 0); ctx.lineTo(-8, -10); ctx.lineTo(-4, 0); ctx.lineTo(-8, 10); ctx.closePath(); ctx.fill(); ctx.stroke();
        ctx.restore();
      }
    },
    drawCrosshair(ctx, x, y, t) {
      ctx.strokeStyle = 'rgba(255,230,160,0.9)'; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.arc(x, y, 10 + Math.sin(t * 8), 0, TAU); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(x - 16, y); ctx.lineTo(x - 6, y); ctx.moveTo(x + 6, y); ctx.lineTo(x + 16, y);
      ctx.moveTo(x, y - 16); ctx.lineTo(x, y - 6); ctx.moveTo(x, y + 6); ctx.lineTo(x, y + 16); ctx.stroke();
    },
  };
  SR.Renderer = Renderer;
})(window.SR);
