'use strict';
// Audio: lightweight procedural sound effects via WebAudio, plus hooks so real
// sample-based audio can be dropped in later. Every gameplay sound goes through
// SR.Audio.play(name, opts). Register listeners with SR.Audio.on(fn) to swap in
// your own samples (fn receives name & opts; return true to suppress the synth).
(function (SR) {
  const Audio = {
    ctx: null,
    master: null,
    enabled: true,
    volume: 0.6,
    ambience: 0.5,
    ambBus: null,
    last: {},
    listeners: [],
    noiseBuf: null,

    init() {
      if (this.ctx) { if (this.ctx.state === 'suspended') this.ctx.resume(); return; }
      try {
        const AC = window.AudioContext || window.webkitAudioContext;
        if (!AC) return;
        this.ctx = new AC();
        this.master = this.ctx.createGain();
        this.master.gain.value = this.volume * 0.45;
        const comp = this.ctx.createDynamicsCompressor();
        this.master.connect(comp);
        comp.connect(this.ctx.destination);
        // ambience has its own bus (and slider), bypassing the effects compressor
        this.ambBus = this.ctx.createGain();
        this.ambBus.gain.value = this.enabled ? this.ambience * 0.6 : 0;
        this.ambBus.connect(this.ctx.destination);
        const len = this.ctx.sampleRate * 1.0;
        this.noiseBuf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
        const d = this.noiseBuf.getChannelData(0);
        for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
      } catch (e) { this.ctx = null; return; }
      if (SR.Ambience) SR.Ambience.start();
    },
    on(fn) { this.listeners.push(fn); },
    setVolume(v) { this.volume = v; if (this.master) this.master.gain.value = v * 0.45; },
    setAmbience(v) { this.ambience = v; this.applyAmbience(); },
    setEnabled(b) { this.enabled = b; this.applyAmbience(); },
    applyAmbience() {
      if (!this.ambBus) return;
      this.ambBus.gain.setTargetAtTime(this.enabled ? this.ambience * 0.6 : 0, this.ctx.currentTime, 0.1);
    },

    play(name, opts = {}) {
      for (const fn of this.listeners) { try { if (fn(name, opts) === true) return; } catch (e) { /* ignore hook errors */ } }
      if (!this.enabled || !this.ctx || this.volume <= 0) return;
      const def = SFX[name];
      if (!def) return;
      const now = this.ctx.currentTime;
      const gap = def.gap != null ? def.gap : 0.05;
      if (this.last[name] && now - this.last[name] < gap) return;
      this.last[name] = now;
      try { def.fn(this, opts); } catch (e) { /* never let audio break the game */ }
    },

    tone(freq, dur, { type = 'sine', vol = 0.3, slide = null, delay = 0, attack = 0.005, out = null } = {}) {
      const c = this.ctx, t = c.currentTime + delay;
      const o = c.createOscillator(), g = c.createGain();
      o.type = type;
      o.frequency.setValueAtTime(freq, t);
      if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(20, slide), t + dur);
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(vol, t + attack);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      o.connect(g); g.connect(out || this.master);
      o.start(t); o.stop(t + dur + 0.02);
    },
    noise(dur, { vol = 0.3, freq = 1000, q = 1, type = 'lowpass', delay = 0, slide = null, out = null, attack = 0 } = {}) {
      const c = this.ctx, t = c.currentTime + delay;
      const s = c.createBufferSource();
      s.buffer = this.noiseBuf;
      const f = c.createBiquadFilter();
      f.type = type; f.frequency.setValueAtTime(freq, t); f.Q.value = q;
      if (slide) f.frequency.exponentialRampToValueAtTime(Math.max(30, slide), t + dur);
      const g = c.createGain();
      if (attack > 0) { g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + attack); }
      else g.gain.setValueAtTime(vol, t);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      s.connect(f); f.connect(g); g.connect(out || this.master);
      s.loop = true;
      s.start(t, Math.random() * 0.5); s.stop(t + dur + 0.02);
    },
  };

  const SFX = {
    ballista: { gap: 0.06, fn: (a) => { a.tone(180, 0.12, { type: 'triangle', vol: 0.25, slide: 70 }); a.noise(0.08, { vol: 0.15, freq: 2400, type: 'bandpass' }); } },
    crossbow: { gap: 0.05, fn: (a) => { a.tone(620, 0.05, { type: 'square', vol: 0.06, slide: 300 }); a.noise(0.04, { vol: 0.08, freq: 3500, type: 'highpass' }); } },
    cannon: { gap: 0.08, fn: (a) => { a.noise(0.35, { vol: 0.45, freq: 500, slide: 80 }); a.tone(90, 0.25, { type: 'sine', vol: 0.35, slide: 40 }); } },
    explosion: { gap: 0.06, fn: (a, o) => { a.noise(0.5 * (o.big ? 1.6 : 1), { vol: o.big ? 0.6 : 0.35, freq: 900, slide: 60 }); a.tone(60, 0.3, { vol: 0.3, slide: 30 }); } },
    fire: { gap: 0.08, fn: (a) => { a.noise(0.3, { vol: 0.18, freq: 300, slide: 1600, type: 'bandpass', q: 0.7 }); } },
    lightning: { gap: 0.07, fn: (a) => { a.noise(0.18, { vol: 0.25, freq: 4000, type: 'highpass' }); a.tone(1400 + Math.random() * 600, 0.12, { type: 'sawtooth', vol: 0.07, slide: 200 }); } },
    hit: { gap: 0.03, fn: (a) => { a.noise(0.05, { vol: 0.1, freq: 1800, type: 'bandpass', q: 2 }); } },
    crit: { gap: 0.05, fn: (a) => { a.tone(900, 0.08, { type: 'square', vol: 0.06, slide: 1500 }); } },
    enemyDie: { gap: 0.04, fn: (a) => { a.noise(0.12, { vol: 0.12, freq: 700, slide: 200 }); } },
    xp: { gap: 0.035, fn: (a) => { a.tone(880 + Math.random() * 300, 0.07, { type: 'sine', vol: 0.06, slide: 1500 }); } },
    gold: { gap: 0.04, fn: (a) => { a.tone(1320, 0.06, { type: 'triangle', vol: 0.08 }); a.tone(1760, 0.1, { type: 'triangle', vol: 0.07, delay: 0.04 }); } },
    levelup: { gap: 0.3, fn: (a) => { [523, 659, 784, 1046].forEach((f, i) => a.tone(f, 0.25, { type: 'triangle', vol: 0.14, delay: i * 0.07 })); } },
    hurt: { gap: 0.12, fn: (a) => { a.noise(0.2, { vol: 0.3, freq: 400, slide: 100 }); a.tone(140, 0.18, { type: 'square', vol: 0.08, slide: 60 }); } },
    shield: { gap: 0.2, fn: (a) => { a.tone(700, 0.3, { type: 'sine', vol: 0.15, slide: 1200 }); } },
    boulder: { gap: 0.2, fn: (a) => { a.noise(0.4, { vol: 0.4, freq: 300, slide: 50 }); } },
    horn: { gap: 1, fn: (a) => { a.tone(147, 1.2, { type: 'sawtooth', vol: 0.14, attack: 0.15 }); a.tone(220, 1.2, { type: 'sawtooth', vol: 0.08, attack: 0.2, delay: 0.1 }); } },
    warning: { gap: 0.5, fn: (a) => { a.tone(440, 0.18, { type: 'square', vol: 0.08 }); a.tone(440, 0.18, { type: 'square', vol: 0.08, delay: 0.25 }); } },
    buy: { gap: 0.1, fn: (a) => { a.tone(660, 0.08, { type: 'triangle', vol: 0.12 }); a.tone(990, 0.15, { type: 'triangle', vol: 0.12, delay: 0.06 }); a.noise(0.1, { vol: 0.06, freq: 6000, type: 'highpass', delay: 0.02 }); } },
    deny: { gap: 0.15, fn: (a) => { a.tone(160, 0.15, { type: 'square', vol: 0.08, slide: 110 }); } },
    click: { gap: 0.04, fn: (a) => { a.tone(500, 0.04, { type: 'triangle', vol: 0.08 }); } },
    chest: { gap: 0.3, fn: (a) => { [392, 523, 659, 784, 1046, 1318].forEach((f, i) => a.tone(f, 0.3, { type: 'triangle', vol: 0.1, delay: i * 0.05 })); } },
    victory: { gap: 1, fn: (a) => { [392, 523, 659, 784, 659, 784, 1046].forEach((f, i) => a.tone(f, 0.4, { type: 'triangle', vol: 0.14, delay: i * 0.14 })); } },
    defeat: { gap: 1, fn: (a) => { [392, 349, 311, 262].forEach((f, i) => a.tone(f, 0.6, { type: 'sawtooth', vol: 0.08, delay: i * 0.25 })); a.noise(1.2, { vol: 0.4, freq: 400, slide: 40 }); } },
  };

  SR.Audio = Audio;
  SR.SFX = SFX;
})(window.SR);
