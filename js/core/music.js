'use strict';
// Chaos Mode battle music: a small procedural sequencer on its own audio bus
// (Settings → Music volume). D minor, Dm → B♭ → Gm → A. A ticking clock runs
// on every beat, and the tempo climbs with game time so it feels like time is
// running out. Layers join as intensity rises; a heartbeat joins at low health.
//
// Timing uses the usual look-ahead scheduler: a 25 ms timer queues notes for the
// next 120 ms on the AudioContext clock, so the beat stays steady.
(function (SR) {
  const midi = (m) => 440 * Math.pow(2, (m - 69) / 12);

  // One chord per bar. bass = root note for the bass line; chord = pad voicing.
  const PROG = [
    { bass: 38, chord: [50, 53, 57] }, // Dm
    { bass: 34, chord: [46, 50, 53] }, // B♭
    { bass: 31, chord: [43, 46, 50] }, // Gm
    { bass: 33, chord: [45, 49, 52] }, // A (major: the tense turnaround)
  ];
  const BASS_8THS = [0, 0, 12, 0, 0, 12, 7, 12];
  const ARP_16THS = [0, 1, 2, 3, 2, 1, 0, 1, 2, 3, 2, 1, 0, 2, 3, 2];

  const Music = {
    playing: false,
    out: null,
    timer: null,
    nextTime: 0,
    step: 0,
    params: { intensity: 0, tempo: 132, lowHp: false, boss: false, mode: 'play' },

    start() {
      const A = SR.Audio;
      if (this.playing || !A.ctx || !A.musicBus) return;
      const c = A.ctx;
      this.playing = true;
      this.out = c.createGain();
      this.out.gain.value = 0.0001;
      this.out.connect(A.musicBus);
      this.out.gain.setTargetAtTime(1, c.currentTime, 0.4);
      this.step = 0;
      this.nextTime = c.currentTime + 0.1;
      this.timer = setInterval(() => this.schedule(), 25);
    },

    stop(fade = 1.2) {
      if (!this.playing) return;
      this.playing = false;
      clearInterval(this.timer);
      this.timer = null;
      const out = this.out, c = SR.Audio.ctx;
      this.out = null;
      if (out && c) {
        out.gain.cancelScheduledValues(c.currentTime);
        out.gain.setTargetAtTime(0.0001, c.currentTime, fade / 3);
        setTimeout(() => { try { out.disconnect(); } catch (e) { /* already gone */ } }, fade * 1000 + 600);
      }
    },

    update(dt, p) {
      Object.assign(this.params, p);
      if (!this.playing || !this.out) return;
      const c = SR.Audio.ctx;
      this.out.gain.setTargetAtTime(p.mode === 'dim' ? 0.35 : 1, c.currentTime, 0.25);
    },

    schedule() {
      const c = SR.Audio.ctx;
      if (!c || !this.playing) return;
      // the timer is throttled in background tabs; skip ahead rather than burst
      if (this.nextTime < c.currentTime - 0.2) this.nextTime = c.currentTime + 0.05;
      while (this.nextTime < c.currentTime + 0.12) {
        this.playStep(this.step, this.nextTime);
        this.nextTime += 60 / this.params.tempo / 4;
        this.step++;
      }
    },

    // ---- instruments (all scheduled at absolute time t)
    voice(t, { type = 'sawtooth', freq, dur, vol, cutoff = 1200, cutoffEnd = null, q = 1, attack = 0.005, detune = 0 }) {
      const c = SR.Audio.ctx;
      const o = c.createOscillator(), f = c.createBiquadFilter(), g = c.createGain();
      o.type = type; o.frequency.setValueAtTime(freq, t); o.detune.value = detune;
      f.type = 'lowpass'; f.Q.value = q; f.frequency.setValueAtTime(cutoff, t);
      if (cutoffEnd) f.frequency.exponentialRampToValueAtTime(cutoffEnd, t + dur);
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(vol, t + attack);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      o.connect(f); f.connect(g); g.connect(this.out);
      o.start(t); o.stop(t + dur + 0.05);
    },
    hit(t, kind, vol = 1) {
      const A = SR.Audio, out = this.out, delay = Math.max(0, t - A.ctx.currentTime);
      if (kind === 'tom') {
        A.tone(95, 0.38, { type: 'sine', vol: 0.55 * vol, slide: 42, delay, out });
        A.noise(0.22, { vol: 0.28 * vol, freq: 220, delay, out });
      } else if (kind === 'snare') {
        A.noise(0.16, { vol: 0.22 * vol, freq: 1900, type: 'bandpass', q: 0.8, delay, out });
        A.tone(190, 0.08, { type: 'triangle', vol: 0.1 * vol, slide: 120, delay, out });
      } else if (kind === 'tick') {
        A.tone(vol > 1 ? 2000 : 1800, 0.035, { type: 'square', vol: 0.05 * vol, delay, out });
        A.noise(0.02, { vol: 0.05 * vol, freq: 5000, type: 'highpass', delay, out });
      } else if (kind === 'tock') {
        A.tone(1350, 0.035, { type: 'square', vol: 0.045 * vol, delay, out });
      } else if (kind === 'heart') {
        A.tone(58, 0.16, { type: 'sine', vol: 0.6, slide: 40, delay, out });
        A.tone(52, 0.18, { type: 'sine', vol: 0.45, slide: 38, delay: delay + 0.2, out });
      }
    },

    playStep(step, t) {
      const p = this.params, I = p.intensity;
      const s16 = step % 16, bar = Math.floor(step / 16), beat = Math.floor(s16 / 4);
      const ch = PROG[bar % PROG.length];
      const spb = 60 / p.tempo, barLen = spb * 4;

      // clock: tick-tock every beat, and on off-beats once intensity is high
      const tickVol = p.lowHp ? 2 : 1;
      if (s16 % 4 === 0) this.hit(t, beat % 2 ? 'tock' : 'tick', tickVol);
      else if (s16 % 2 === 0 && (I > 0.6 || p.lowHp)) this.hit(t, 'tock', 0.6 * tickVol);

      // war drums
      if (s16 === 0 || s16 === 8) this.hit(t, 'tom');
      if (s16 === 4 || s16 === 12) this.hit(t, 'snare');
      if (I > 0.35 && (s16 === 6 || s16 === 14)) this.hit(t, 'tom', 0.5);
      if (bar % 4 === 3 && s16 >= 12) this.hit(t, 'tom', 0.5 + (s16 - 12) * 0.15); // fill

      // driving bass ostinato (eighth notes)
      if (s16 % 2 === 0) {
        const n = ch.bass + BASS_8THS[s16 / 2];
        this.voice(t, { freq: midi(n), dur: spb * 0.45, vol: 0.13, cutoff: 900, cutoffEnd: 260, q: 4 });
      }

      // string pad, held for the whole bar
      if (s16 === 0 && I >= 0.1) {
        for (const n of ch.chord) {
          for (const d of [-9, 9]) this.voice(t, { freq: midi(n + 12), dur: barLen * 1.02, vol: 0.022, cutoff: 1400, attack: 0.35, detune: d });
        }
      }

      // brass stabs every two bars (and a push on beat 4 of the A bar)
      if (I >= 0.3 && ((bar % 2 === 0 && s16 === 0) || (bar % 4 === 3 && s16 === 12))) {
        for (const n of ch.chord) this.voice(t, { freq: midi(n + 12), dur: spb * 0.7, vol: 0.05, cutoff: 500, cutoffEnd: 2600, q: 2, attack: 0.02 });
        this.voice(t, { freq: midi(ch.bass + 24), dur: spb * 0.7, vol: 0.05, cutoff: 400, cutoffEnd: 1800, q: 2, attack: 0.02 });
      }

      // racing arpeggio when a boss is alive or late in the run
      if (p.boss || I >= 0.8) {
        const tones = [...ch.chord, ch.chord[0] + 12];
        const n = tones[ARP_16THS[s16]] + 24;
        this.voice(t, { type: 'square', freq: midi(n), dur: spb * 0.22, vol: 0.025, cutoff: 2600 });
      }

      // heartbeat at low health
      if (p.lowHp && s16 === 0) this.hit(t, 'heart');
    },

    // a single stab so the Music volume slider can be heard
    preview() {
      const A = SR.Audio;
      if (!A.ctx || !A.musicBus) return;
      const tmp = this.out;
      const g = A.ctx.createGain(); g.gain.value = 1; g.connect(A.musicBus);
      this.out = g;
      const t = A.ctx.currentTime + 0.02;
      for (const n of PROG[0].chord) this.voice(t, { freq: midi(n + 12), dur: 0.5, vol: 0.06, cutoff: 500, cutoffEnd: 2600, q: 2, attack: 0.02 });
      this.hit(t, 'tom');
      this.out = tmp;
      setTimeout(() => { try { g.disconnect(); } catch (e) { /* gone */ } }, 1500);
    },
  };

  SR.Music = Music;
})(window.SR);
