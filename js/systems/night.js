'use strict';
// Day/night cycle. Night is a "Dark Gothic" lighting pass layered over the normal
// renderer: a moonlit colour grade, glowing windows, crystals and torches, drifting
// fog, embers and lightning (with thunder from SR.Ambience).
(function (SR) {
  const U = SR.U, TAU = Math.PI * 2;

  const CYCLE = 240;      // one full day + night, in seconds of run time
  const DUSK = 150;       // night starts falling
  const NIGHT = 162;      // full night
  const DAWN = 228;       // night starts lifting; full day again at CYCLE
  const GRADE = [93, 106, 163]; // multiply colour at full night

  const glowCache = {};
  function glowSprite(rgb) {
    if (glowCache[rgb]) return glowCache[rgb];
    const cv = U.makeCanvas(64, 64), c = cv.getContext('2d');
    const g = c.createRadialGradient(32, 32, 0, 32, 32, 32);
    g.addColorStop(0, `rgba(${rgb},1)`); g.addColorStop(0.35, `rgba(${rgb},0.45)`); g.addColorStop(1, `rgba(${rgb},0)`);
    c.fillStyle = g; c.fillRect(0, 0, 64, 64);
    glowCache[rgb] = cv;
    return cv;
  }
  let fogSprite = null;
  function fog() {
    if (fogSprite) return fogSprite;
    const cv = U.makeCanvas(256, 128), c = cv.getContext('2d');
    c.translate(128, 64); c.scale(1, 0.5);
    const g = c.createRadialGradient(0, 0, 10, 0, 0, 128);
    g.addColorStop(0, 'rgba(130,145,185,1)'); g.addColorStop(1, 'rgba(130,145,185,0)');
    c.fillStyle = g; c.beginPath(); c.arc(0, 0, 128, 0, TAU); c.fill();
    fogSprite = cv;
    return cv;
  }

  const Night = {
    CYCLE, DUSK, NIGHT, DAWN,
    prevDark: false,
    lightningT: 6,
    flash: null,
    embers: [],

    reset() {
      this.prevDark = false;
      this.lightningT = 6;
      this.flash = null;
      this.embers = [];
      for (let i = 0; i < 60; i++) this.embers.push({ x: Math.random(), y: Math.random(), sp: U.rand(0.02, 0.06), ph: Math.random() * 10, s: U.rand(1, 2.2) });
    },

    // 0 = full day, 1 = full night (smoothly eased through dusk and dawn)
    level(t) {
      const p = ((t % CYCLE) + CYCLE) % CYCLE;
      let k;
      if (p < DUSK) k = 0;
      else if (p < NIGHT) k = (p - DUSK) / (NIGHT - DUSK);
      else if (p < DAWN) k = 1;
      else k = 1 - (p - DAWN) / (CYCLE - DAWN);
      return k * k * (3 - 2 * k);
    },
    // HUD text: current phase and time until it changes
    phaseInfo(t) {
      const p = ((t % CYCLE) + CYCLE) % CYCLE;
      const duskMid = (DUSK + NIGHT) / 2, dawnMid = (DAWN + CYCLE) / 2;
      const night = p >= duskMid && p < dawnMid;
      const left = night ? dawnMid - p : (p < duskMid ? duskMid - p : CYCLE - p + duskMid);
      return { night, label: night ? 'Night' : 'Day', next: night ? 'dawn' : 'dusk', left: Math.max(0, left) };
    },

    update(game, dt) {
      const n = this.level(game.time);
      game.night = n;
      const dark = n > 0.5;
      if (dark !== this.prevDark) {
        this.prevDark = dark;
        if (dark) { game.announce('Night falls over the kingdom', 'night'); SR.Audio.play('horn'); }
        else game.announce('Dawn breaks', 'good');
      }
      if (n > 0.85) {
        this.lightningT -= dt;
        if (this.lightningT <= 0) {
          this.lightningT = U.rand(7, 15);
          const near = Math.random() < 0.4;
          this.flash = { t: 0, dur: 0.35, seed: Math.floor(Math.random() * 1e6), x: game.camera.x + U.rand(-0.4, 0.4) * game.viewW, power: near ? 1 : 0.55 };
          if (SR.Ambience) SR.Ambience.thunder(near ? U.rand(0.1, 0.4) : U.rand(0.8, 1.8), near ? 1 : 0.5);
        }
      }
      if (this.flash) { this.flash.t += dt; if (this.flash.t > this.flash.dur) this.flash = null; }
    },

    glow(ctx, x, y, r, rgb, a) {
      if (a <= 0.01) return;
      ctx.globalAlpha = Math.min(1, a);
      ctx.drawImage(glowSprite(rgb), x - r, y - r, r * 2, r * 2);
    },

    // Called by the renderer with the world transform active, after world FX and
    // before health bars / damage numbers (which stay un-darkened).
    draw(ctx, game, R, inView) {
      const n = game.night || 0;
      if (n <= 0.01 || game.state === 'menu') return;
      const W = ctx.canvas.width, H = ctx.canvas.height, T = game.realTime;
      const c = game.castle;

      // 1. moonlit colour grade
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.globalCompositeOperation = 'multiply';
      const col = GRADE.map((v) => Math.round(255 + (v - 255) * n));
      ctx.fillStyle = `rgb(${col[0]},${col[1]},${col[2]})`;
      ctx.fillRect(0, 0, W, H);
      ctx.globalCompositeOperation = 'source-over';
      const mg = ctx.createRadialGradient(W * 0.86, -H * 0.1, 0, W * 0.86, -H * 0.1, W * 0.8);
      mg.addColorStop(0, `rgba(170,190,255,${0.2 * n})`); mg.addColorStop(1, 'rgba(170,190,255,0)');
      ctx.fillStyle = mg; ctx.fillRect(0, 0, W, H);

      // 2. lights (additive, world space)
      R.setWorld(ctx);
      ctx.globalCompositeOperation = 'lighter';
      const flick = (k) => 0.85 + Math.sin(T * 13 + k * 7) * 0.08 + Math.sin(T * 29 + k) * 0.05;
      if (c.art && !c.dying) {
        const by = c.y + c.bob;
        for (let i = 0; i < c.art.lights.length; i++) {
          const l = c.art.lights[i];
          const pulse = l.pulse ? 0.8 + Math.sin(T * 2 + i) * 0.2 : flick(i);
          this.glow(ctx, c.x + l.x, by + l.y, l.r, l.rgb, l.a * n * pulse);
        }
        this.glow(ctx, c.x, by + c.art.R * 1.1, c.art.R * 1.6, '80,150,255', 0.28 * n);
        for (let i = 0; i < SR.MAX_SLOTS; i++) {
          const w = c.weapons[i], m = c.art.mounts[i];
          if (!w || !m) continue;
          if (w.type === 'fire') this.glow(ctx, c.x + m.x, by + m.y - 10, 46, '255,140,50', (0.55 + w.recoil * 0.4) * n * flick(9));
          else if (w.type === 'lightning') this.glow(ctx, c.x + m.x, by + m.y - 12, 36, '120,190,255', (0.45 + w.recoil * 0.5) * n);
          else if (w.recoil > 0.6) this.glow(ctx, c.x + m.x, by + m.y, 30, '255,210,140', (w.recoil - 0.6) * 1.5 * n);
        }
      }
      // torches carried by the army; elites and bosses glow
      for (const e of game.enemies) {
        if (e.dead || !inView(e, 60)) continue;
        if (e.boss) { this.glow(ctx, e.x, e.y, e.r * 3, '190,90,255', 0.45 * n); continue; }
        if (e.elite) this.glow(ctx, e.x, e.y, e.r * 2.6, '255,200,80', 0.4 * n);
        if (e.flying) { if (e.attackAnim > 0) this.glow(ctx, e.x + e.facing * 16, e.y - 6, 34, '255,130,40', 0.8 * n); continue; }
        if (e.type === 'trebuchet') { this.glow(ctx, e.x - 18 * e.facing, e.y - 6, 26, '255,150,60', 0.5 * n * flick(e.id)); continue; }
        if (e.id % 2 === 0) {
          const tx = e.x + e.facing * 8 * e.scale, ty = e.y - e.r * 1.3;
          this.glow(ctx, tx, ty, 26 * e.scale, '255,150,60', 0.5 * n * flick(e.id));
          this.glow(ctx, tx, ty, 4, '255,235,170', 0.9 * n);
        }
      }
      // projectiles, fire and explosions shine in the dark
      for (const p of game.pproj) {
        if (p.kind === 'fireball') this.glow(ctx, p.x, p.y, 52, '255,140,50', 0.75 * n);
        else if (p.kind === 'shell') this.glow(ctx, p.x, p.y - (p.z || 0), 14, '255,200,90', 0.5 * n);
        else this.glow(ctx, p.x, p.y, p.kind === 'bolt' ? 20 : 12, '255,225,160', 0.45 * n);
      }
      for (const p of game.eproj) {
        if (p.kind === 'warbolt') this.glow(ctx, p.x, p.y, 18, '200,110,255', 0.6 * n);
        else if (p.kind === 'bolt') this.glow(ctx, p.x, p.y, 12, '255,110,80', 0.4 * n);
      }
      for (const z of game.zones) this.glow(ctx, z.x, z.y, z.r * 1.8, '255,130,40', 0.6 * n * (1 - z.t / z.dur) * flick(z.x));
      for (const f of game.fx.flashes) this.glow(ctx, f.x, f.y, f.r * 1.8, f.color, 0.9 * n * (1 - f.t / f.dur));
      for (const b of game.fx.bolts) {
        const k = 1 - b.t / b.dur;
        for (let i = 0; i < b.pts.length; i += 3) this.glow(ctx, b.pts[i].x, b.pts[i].y, 22, '120,190,255', 0.55 * n * k);
      }
      for (const pk of game.pickups) {
        if (!inView(pk, 20)) continue;
        if (pk.kind === 'xp') this.glow(ctx, pk.x, pk.y, 14, '90,170,255', 0.4 * n);
        else if (pk.kind === 'chest') this.glow(ctx, pk.x, pk.y, 40, '255,210,90', 0.6 * n);
      }

      // 3. drifting fog banks
      ctx.globalCompositeOperation = 'source-over';
      const fs = fog(), vw = game.viewW, vh = game.viewH, cam = game.camera;
      for (let i = 0; i < 5; i++) {
        const span = vw + 700;
        const fx = cam.x - span / 2 + ((((i * 337 + T * (12 + i * 5)) - cam.x * 0.15) % span) + span) % span;
        const fy = cam.y - vh / 2 + ((i * 0.23 + 0.1) % 1) * vh;
        ctx.globalAlpha = 0.16 * n;
        ctx.drawImage(fs, fx - 300, fy - 90, 600, 180);
      }

      // 4. lightning
      const fl = this.flash;
      if (fl) {
        const k = fl.t / fl.dur;
        ctx.globalAlpha = 1;
        ctx.strokeStyle = `rgba(230,240,255,${(1 - k) * fl.power})`;
        ctx.lineWidth = 2.5; ctx.lineJoin = 'round';
        ctx.beginPath();
        let lx = fl.x, ly = cam.y - vh / 2 - 20;
        ctx.moveTo(lx, ly);
        for (let i = 0; i < 12; i++) { lx += (U.hash2(i, fl.seed, 8) - 0.5) * 70; ly += vh * 0.045; ctx.lineTo(lx, ly); }
        ctx.stroke();
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.fillStyle = `rgba(200,215,255,${0.32 * (1 - k) * fl.power})`;
        ctx.fillRect(0, 0, W, H);
      }

      // 5. embers rising (screen space)
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.globalCompositeOperation = 'lighter';
      const dpr = R.dpr;
      for (const e of this.embers) {
        const y = ((e.y - T * e.sp) % 1 + 1) % 1, x = e.x + Math.sin(T * 1.3 + e.ph) * 0.01;
        ctx.globalAlpha = (0.45 + Math.sin(T * 5 + e.ph) * 0.3) * n;
        ctx.fillStyle = e.ph > 5 ? '#ffb45a' : '#ff8a3a';
        ctx.fillRect(x * W, y * H, e.s * dpr, e.s * dpr);
      }
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = 'source-over';
      R.setWorld(ctx);
    },

    // extra darkness around the screen edges at night (screen space, CSS pixels)
    vignette(ctx, game, w, h) {
      const n = game.night || 0;
      if (n <= 0.01 || game.state === 'menu') return;
      const vg = ctx.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.28, w / 2, h / 2, Math.max(w, h) * 0.7);
      vg.addColorStop(0, 'rgba(4,6,14,0)'); vg.addColorStop(1, `rgba(4,6,14,${0.5 * n})`);
      ctx.fillStyle = vg; ctx.fillRect(0, 0, w, h);
    },
  };
  Night.reset();
  SR.Night = Night;
})(window.SR);
