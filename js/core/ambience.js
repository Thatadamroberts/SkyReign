'use strict';
// Procedural ambience on its own audio bus (volume: Settings → Ambience).
// Always: wind high above the countryside.
// Day: birdsong and the distant war drums of the pursuing army.
// Night: crickets, owls, a low brooding drone and thunder with the lightning.
(function (SR) {
  const U = SR.U;

  const Ambience = {
    started: false,
    presence: 0,
    night: 0,
    timers: { bird: 2, drum: 5, cricket: 1, owl: 10 },

    start() {
      const A = SR.Audio;
      if (this.started || !A.ctx || !A.ambBus) return;
      this.started = true;
      const c = A.ctx, bus = A.ambBus;

      // Wind: looping noise through a slowly sweeping band-pass, plus slow gusts.
      const src = c.createBufferSource();
      src.buffer = A.noiseBuf; src.loop = true;
      const bp = c.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 420; bp.Q.value = 0.7;
      const sweep = c.createOscillator(); sweep.frequency.value = 0.06;
      const sweepAmt = c.createGain(); sweepAmt.gain.value = 260;
      sweep.connect(sweepAmt); sweepAmt.connect(bp.frequency);
      const gust = c.createGain(); gust.gain.value = 0.7;
      const gustLfo = c.createOscillator(); gustLfo.frequency.value = 0.13;
      const gustAmt = c.createGain(); gustAmt.gain.value = 0.3;
      gustLfo.connect(gustAmt); gustAmt.connect(gust.gain);
      this.wind = c.createGain(); this.wind.gain.value = 0;
      src.connect(bp); bp.connect(gust); gust.connect(this.wind); this.wind.connect(bus);
      src.start(); sweep.start(); gustLfo.start();

      // Night drone: detuned low saws through a dark low-pass with a slow swell.
      const lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 240; lp.Q.value = 2;
      const lpLfo = c.createOscillator(); lpLfo.frequency.value = 0.05;
      const lpAmt = c.createGain(); lpAmt.gain.value = 90;
      lpLfo.connect(lpAmt); lpAmt.connect(lp.frequency); lpLfo.start();
      for (const [f, v] of [[55, 0.3], [55.35, 0.3], [82.4, 0.18], [110.7, 0.08]]) {
        const o = c.createOscillator(); o.type = 'sawtooth'; o.frequency.value = f;
        const og = c.createGain(); og.gain.value = v;
        o.connect(og); og.connect(lp); o.start();
      }
      this.drone = c.createGain(); this.drone.gain.value = 0;
      lp.connect(this.drone); this.drone.connect(bus);
    },

    // mode: 'play' (in a run), 'menu', 'dim' (paused/shop/level-up/game over), 'off'
    update(dt, night, mode) {
      if (!this.started) return;
      const A = SR.Audio, c = A.ctx;
      if (c.state !== 'running') return;
      const now = c.currentTime;
      const presence = mode === 'play' ? 1 : mode === 'menu' ? 0.7 : mode === 'dim' ? 0.45 : 0;
      this.presence = presence;
      this.night = night;
      this.wind.gain.setTargetAtTime(presence * (0.22 + 0.14 * night), now, 0.6);
      this.drone.gain.setTargetAtTime(presence * 0.07 * night, now, 1.2);
      if (presence <= 0 || !A.enabled || A.ambience <= 0) return;

      const t = this.timers;
      for (const k in t) t[k] -= dt;
      const day = 1 - night;
      if (t.bird <= 0) { t.bird = U.rand(2.5, 7); if (day > 0.5 && Math.random() < day) this.bird(); }
      if (t.drum <= 0) { t.drum = U.rand(9, 16); if (mode === 'play' && day > 0.5) this.drums(); }
      if (t.cricket <= 0) { t.cricket = U.rand(0.6, 1.8); if (night > 0.4) this.crickets(night); }
      if (t.owl <= 0) { t.owl = U.rand(12, 24); if (night > 0.6) this.owl(); }
    },

    bird() {
      const A = SR.Audio, out = A.ambBus;
      const base = U.rand(2400, 3400), n = U.randInt(2, 5);
      for (let i = 0; i < n; i++) {
        A.tone(base * U.rand(0.95, 1.1), 0.07, { type: 'sine', vol: 0.05, slide: base * 1.45, delay: i * U.rand(0.08, 0.13), out });
      }
    },
    drums() {
      const A = SR.Audio, out = A.ambBus;
      const pattern = [0, 0.42, 0.84, 1.06, 1.68, 2.1, 2.52, 2.74];
      for (const d of pattern) {
        A.noise(0.3, { vol: 0.16, freq: 140, delay: d, out });
        A.tone(62, 0.3, { type: 'sine', vol: 0.12, slide: 48, delay: d, out });
      }
    },
    crickets(night) {
      const A = SR.Audio, out = A.ambBus;
      const f = U.rand(4200, 4800), bursts = U.randInt(1, 3);
      for (let b = 0; b < bursts; b++) {
        for (let i = 0; i < 5; i++) A.tone(f, 0.022, { type: 'sine', vol: 0.025 * night, delay: b * 0.32 + i * 0.045, out });
      }
    },
    owl() {
      const A = SR.Audio, out = A.ambBus;
      const f = U.rand(360, 400);
      A.tone(f, 0.4, { type: 'sine', vol: 0.06, slide: f * 0.9, attack: 0.08, out });
      A.tone(f * 1.02, 0.18, { type: 'sine', vol: 0.045, slide: f * 0.92, attack: 0.04, delay: 0.62, out });
      A.tone(f, 0.5, { type: 'sine', vol: 0.055, slide: f * 0.88, attack: 0.08, delay: 0.88, out });
    },
    // Thunder after a lightning flash. power ~1 for a close strike, ~0.5 far away.
    thunder(delay, power) {
      const A = SR.Audio;
      if (!this.started || !A.enabled || A.ambience <= 0 || this.presence <= 0) return;
      const out = A.ambBus;
      if (power > 0.8) A.noise(0.25, { vol: 0.35 * power, freq: 2500, type: 'highpass', delay, out });
      A.noise(3.2, { vol: 0.55 * power, freq: 420, slide: 55, attack: 0.08, delay: delay + 0.05, out });
      A.noise(2.4, { vol: 0.35 * power, freq: 180, slide: 40, attack: 0.3, delay: delay + 0.6, out });
    },
  };
  SR.Ambience = Ambience;
})(window.SR);
