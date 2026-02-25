const fs = require('fs');
const path = require('path');

const SR = 22050;

function clamp(v) {
  if (v > 1) return 1;
  if (v < -1) return -1;
  return v;
}

function createBuffer(seconds) {
  return new Float32Array(Math.max(1, Math.floor(seconds * SR)));
}

function env(t, dur, a = 0.005, d = 0.06, s = 0.75, r = 0.06) {
  if (t < 0 || t > dur) return 0;
  if (a > 0 && t < a) return t / a;
  if (d > 0 && t < a + d) {
    const k = (t - a) / d;
    return 1 + (s - 1) * k;
  }
  if (r > 0 && t > dur - r) {
    const k = (dur - t) / r;
    return Math.max(0, s * k);
  }
  return s;
}

function osc(type, ph) {
  const x = ph % (Math.PI * 2);
  if (type === 'sine') return Math.sin(x);
  if (type === 'triangle') return 2 * Math.abs((x / Math.PI) - 1) - 1;
  if (type === 'square') return Math.sin(x) >= 0 ? 1 : -1;
  // saw
  return 2 * (x / (Math.PI * 2)) - 1;
}

function tone(buf, start, dur, opts = {}) {
  const {
    freq = 440,
    freq2 = null,
    type = 'sine',
    vol = 0.5,
    attack = 0.004,
    decay = 0.05,
    sustain = 0.72,
    release = 0.08,
    vibrato = 0,
    vibRate = 5,
    noiseMix = 0,
    fm = 0,
    fmRate = 0
  } = opts;
  const i0 = Math.max(0, Math.floor(start * SR));
  const i1 = Math.min(buf.length, Math.floor((start + dur) * SR));
  let ph = 0;
  let ph2 = 0;
  for (let i = i0; i < i1; i++) {
    const t = (i - i0) / SR;
    const k = t / Math.max(0.0001, dur);
    const fBase = freq + ((freq2 !== null ? freq2 : freq) - freq) * k;
    const vib = vibrato * Math.sin(2 * Math.PI * vibRate * t);
    const f = Math.max(10, fBase + vib);
    ph += 2 * Math.PI * f / SR;
    let s = osc(type, ph);
    if (fm > 0 && fmRate > 0) {
      s *= (1 + fm * Math.sin(2 * Math.PI * fmRate * t));
    }
    if (noiseMix > 0) {
      s = s * (1 - noiseMix) + ((Math.random() * 2 - 1) * noiseMix);
    }
    const e = env(t, dur, attack, decay, sustain, release);
    buf[i] += s * e * vol;
  }
}

function noiseBurst(buf, start, dur, opts = {}) {
  const {
    vol = 0.35,
    attack = 0.001,
    decay = 0.02,
    sustain = 0.4,
    release = 0.05,
    color = 0
  } = opts;
  const i0 = Math.max(0, Math.floor(start * SR));
  const i1 = Math.min(buf.length, Math.floor((start + dur) * SR));
  let last = 0;
  for (let i = i0; i < i1; i++) {
    const t = (i - i0) / SR;
    const e = env(t, dur, attack, decay, sustain, release);
    const w = Math.random() * 2 - 1;
    // simple pink-ish coloring
    last = last * (0.85 + color * 0.1) + w * (0.15 - color * 0.05);
    buf[i] += last * e * vol;
  }
}

function applyFade(buf, fadeMs = 16) {
  const n = Math.floor((fadeMs / 1000) * SR);
  if (n <= 0 || n * 2 >= buf.length) return;
  for (let i = 0; i < n; i++) {
    const k = i / n;
    buf[i] *= k;
    buf[buf.length - 1 - i] *= k;
  }
}

function normalize(buf, peak = 0.92) {
  let m = 0.00001;
  for (let i = 0; i < buf.length; i++) {
    const a = Math.abs(buf[i]);
    if (a > m) m = a;
  }
  const g = peak / m;
  for (let i = 0; i < buf.length; i++) buf[i] = clamp(buf[i] * g);
}

function writeWav(file, buf) {
  const numSamples = buf.length;
  const blockAlign = 2;
  const byteRate = SR * blockAlign;
  const dataSize = numSamples * 2;
  const out = Buffer.alloc(44 + dataSize);

  out.write('RIFF', 0);
  out.writeUInt32LE(36 + dataSize, 4);
  out.write('WAVE', 8);
  out.write('fmt ', 12);
  out.writeUInt32LE(16, 16); // PCM fmt chunk size
  out.writeUInt16LE(1, 20); // PCM
  out.writeUInt16LE(1, 22); // mono
  out.writeUInt32LE(SR, 24);
  out.writeUInt32LE(byteRate, 28);
  out.writeUInt16LE(blockAlign, 32);
  out.writeUInt16LE(16, 34);
  out.write('data', 36);
  out.writeUInt32LE(dataSize, 40);

  for (let i = 0; i < numSamples; i++) {
    const s = Math.max(-1, Math.min(1, buf[i]));
    out.writeInt16LE(Math.floor(s * 32767), 44 + i * 2);
  }

  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, out);
}

function saveSfx(name, seconds, fillFn) {
  const b = createBuffer(seconds);
  fillFn(b);
  applyFade(b, 6);
  normalize(b, 0.9);
  writeWav(path.join('audio', 'sfx', `${name}.wav`), b);
}

function saveMusic(name, seconds, fillFn) {
  const b = createBuffer(seconds);
  fillFn(b);
  applyFade(b, 12);
  normalize(b, 0.84);
  writeWav(path.join('audio', 'music', `${name}.wav`), b);
}

function noteFreq(midi) {
  return 440 * Math.pow(2, (midi - 69) / 12);
}

function addKick(buf, t, base = 72, len = 0.14, vol = 0.55) {
  tone(buf, t, len, { freq: 170, freq2: base, type: 'sine', vol, attack: 0.001, decay: 0.04, sustain: 0.45, release: 0.08, fm: 0.2, fmRate: 36 });
}

function addSnare(buf, t, len = 0.12, vol = 0.34) {
  noiseBurst(buf, t, len, { vol, attack: 0.001, decay: 0.02, sustain: 0.35, release: 0.05, color: 0.5 });
  tone(buf, t, len * 0.7, { freq: 210, freq2: 165, type: 'triangle', vol: vol * 0.45, attack: 0.001, decay: 0.015, sustain: 0.2, release: 0.03 });
}

function addHat(buf, t, len = 0.045, vol = 0.16) {
  noiseBurst(buf, t, len, { vol, attack: 0.001, decay: 0.006, sustain: 0.2, release: 0.02, color: 0.1 });
}

function addChordPad(buf, start, len, notes, opts = {}) {
  const type = opts.type || 'sine';
  const vol = opts.vol || 0.06;
  for (let i = 0; i < notes.length; i++) {
    tone(buf, start, len, {
      freq: noteFreq(notes[i]),
      type,
      vol,
      attack: opts.attack ?? 0.06,
      decay: opts.decay ?? 0.18,
      sustain: opts.sustain ?? 0.66,
      release: opts.release ?? 0.16,
      vibrato: opts.vibrato ?? 0.5,
      vibRate: opts.vibRate ?? 4.0
    });
  }
}

function getChord(root, degree, mode = 'minor') {
  const b = root + degree;
  if (mode === 'major') return [b + 12, b + 16, b + 19];
  return [b + 12, b + 15, b + 19];
}

function addSeq(buf, start, step, baseMidi, seq, opts = {}) {
  const gate = opts.gate ?? 0.84;
  const swing = opts.swing ?? 0;
  const baseVol = opts.vol ?? 0.1;
  for (let i = 0; i < seq.length; i++) {
    const ev = seq[i];
    if (ev === null || ev === undefined || ev === false) continue;
    let n = 0;
    let l = gate;
    let v = 1;
    let t = opts.type || 'triangle';
    if (typeof ev === 'number') {
      n = ev;
    } else {
      n = ev.n ?? 0;
      if (typeof ev.l === 'number') l = ev.l;
      if (typeof ev.v === 'number') v = ev.v;
      if (ev.t) t = ev.t;
    }
    const st = start + i * step + ((i % 2 === 1) ? step * swing : 0);
    tone(buf, st, step * l, {
      freq: noteFreq(baseMidi + n),
      type: t,
      vol: baseVol * v,
      attack: opts.attack ?? 0.002,
      decay: opts.decay ?? 0.02,
      sustain: opts.sustain ?? 0.45,
      release: opts.release ?? 0.04,
      vibrato: opts.vibrato ?? 0,
      vibRate: opts.vibRate ?? 5,
      noiseMix: opts.noiseMix ?? 0,
      fm: opts.fm ?? 0,
      fmRate: opts.fmRate ?? 0
    });
  }
}

function buildTheme(name, cfg = {}) {
  const bpm = cfg.bpm || 110;
  const root = cfg.root || 48;
  const mode = cfg.mode || 'minor';
  const energy = cfg.energy ?? 0.6;
  const style = cfg.style || 'normal';
  const beat = 60 / bpm;
  const beatsPerBar = cfg.beatsPerBar || (style === 'library' ? 3 : 4);
  const bars = cfg.bars || 8;
  const seconds = cfg.seconds || (bars * beat * beatsPerBar);
  const prog = cfg.progression || (
    mode === 'major'
      ? [0, 5, 7, 4]
      : [0, 3, 7, 5]
  );

  saveMusic(name, seconds, (buf) => {
    for (let bar = 0; bar < bars; bar++) {
      const barT = bar * beat * beatsPerBar;
      const deg = prog[bar % prog.length];
      const chord = getChord(root, deg, mode);
      const bass = root + deg;
      const phrase = (bar < bars / 2) ? 0 : 1;
      const fillBar = (bar % 4) === 3;

      if (style === 'menu') {
        addKick(buf, barT + beat * 0, 66, 0.12, 0.18);
        addKick(buf, barT + beat * (phrase ? 2.5 : 2), 62, 0.10, 0.14);
        addSnare(buf, barT + beat * 1.75, 0.08, 0.10);
        addSnare(buf, barT + beat * 3.5, 0.08, 0.08);
        for (let i = 0; i < 8; i++) addHat(buf, barT + i * beat * 0.5, 0.03, (i % 2 ? 0.045 : 0.028));
        addChordPad(buf, barT, beat * beatsPerBar, [chord[0], chord[1], chord[2], chord[2] + 7], {
          type: 'sine',
          vol: 0.036,
          attack: 0.12,
          sustain: 0.74,
          release: 0.22,
          vibrato: 0.3
        });
        addSeq(buf, barT, beat, bass, [0, 0, 7, 5], {
          type: 'triangle',
          vol: 0.078,
          gate: 0.9,
          attack: 0.01,
          decay: 0.04,
          sustain: 0.7,
          release: 0.08
        });
        const menuLeadA = [12, 14, 16, 19, 16, 14, null, 12];
        const menuLeadB = [12, 16, 19, 21, 19, 16, 14, 12];
        addSeq(buf, barT, beat * 0.5, root, phrase ? menuLeadB : menuLeadA, {
          type: 'sine',
          vol: 0.05,
          gate: 0.78,
          attack: 0.002,
          decay: 0.02,
          sustain: 0.4,
          release: 0.03
        });
        if (fillBar) {
          addSeq(buf, barT + beat * 3, beat * 0.25, root, [16, 17, 19, 21], {
            type: 'triangle',
            vol: 0.042,
            gate: 0.85
          });
        }
        continue;
      }

      if (style === 'normal') {
        addKick(buf, barT + beat * 0, 66, 0.14, 0.28);
        addKick(buf, barT + beat * 2, 60, 0.12, 0.22);
        addSnare(buf, barT + beat * 1, 0.10, 0.20);
        addSnare(buf, barT + beat * 3, 0.10, 0.22);
        for (let i = 0; i < 8; i++) addHat(buf, barT + i * beat * 0.5, 0.03, i % 2 ? 0.09 : 0.07);
        addChordPad(buf, barT, beat * beatsPerBar, chord, { type: 'triangle', vol: 0.048, attack: 0.07, release: 0.14 });
        addSeq(buf, barT, beat * 0.5, bass, [0, 0, 7, 7, 5, 5, 7, 10], {
          type: 'saw',
          vol: 0.118 + energy * 0.03,
          gate: 0.78,
          noiseMix: 0.03
        });
        const leadA = [12, 16, 19, 16, 14, 12, 14, 16];
        const leadB = [12, 14, 16, 19, 21, 19, 16, 14];
        addSeq(buf, barT, beat * 0.5, root, phrase ? leadB : leadA, {
          type: 'square',
          vol: 0.088,
          gate: 0.74
        });
        if (fillBar) {
          addSeq(buf, barT + beat * 2.5, beat * 0.25, root, [19, 21, 22, 24, 22, 21], {
            type: 'square',
            vol: 0.065,
            gate: 0.7
          });
        }
        continue;
      }

      if (style === 'survival') {
        addKick(buf, barT + beat * 0, 56, 0.14, 0.34);
        addKick(buf, barT + beat * 1.5, 52, 0.12, 0.24);
        addKick(buf, barT + beat * 2.75, 50, 0.11, 0.22);
        addSnare(buf, barT + beat * 1, 0.11, 0.24);
        addSnare(buf, barT + beat * 3, 0.11, 0.26);
        for (let i = 0; i < 16; i++) addHat(buf, barT + i * beat * 0.25, 0.022, i % 4 === 0 ? 0.12 : 0.08);
        addSeq(buf, barT, beat * 0.25, bass, [0, 0, 0, 7, 0, 0, 7, 10, 0, 0, 7, 10, 0, 10, 12, 10], {
          type: 'saw',
          vol: 0.11 + energy * 0.06,
          gate: 0.7,
          noiseMix: 0.08,
          attack: 0.001,
          decay: 0.016,
          sustain: 0.28,
          release: 0.02
        });
        addChordPad(buf, barT, beat * beatsPerBar, [chord[0], chord[1], chord[2], chord[0] - 5], {
          type: 'sine',
          vol: 0.03,
          attack: 0.08,
          release: 0.16
        });
        if (fillBar) {
          addSeq(buf, barT + beat * 3.25, beat * 0.125, root, [19, 21, 22, 24, 22, 21], {
            type: 'square',
            vol: 0.07,
            gate: 0.62
          });
        }
        continue;
      }

      if (style === 'm67') {
        addKick(buf, barT + beat * 0, 52, 0.16, 0.28);
        addKick(buf, barT + beat * 2.5, 48, 0.14, 0.20);
        addSnare(buf, barT + beat * 1.75, 0.11, 0.18);
        addSnare(buf, barT + beat * 3.5, 0.10, 0.14);
        for (let i = 0; i < 8; i++) {
          if (i % 2 === 1) addHat(buf, barT + i * beat * 0.5, 0.024, 0.06);
        }
        tone(buf, barT, beat * beatsPerBar, {
          freq: noteFreq(bass - 12),
          type: 'sine',
          vol: 0.085,
          attack: 0.02,
          decay: 0.08,
          sustain: 0.78,
          release: 0.12
        });
        addChordPad(buf, barT, beat * beatsPerBar, [chord[0], chord[1] - 1, chord[2], chord[0] - 11], {
          type: 'triangle',
          vol: 0.03,
          attack: 0.12,
          release: 0.2,
          vibrato: 0.8,
          vibRate: 3.4
        });
        const darkLeadA = [12, 13, 18, 15, 12, 10, 15, 13];
        const darkLeadB = [12, 10, 13, 18, 17, 15, 13, 10];
        addSeq(buf, barT, beat * 0.5, bass, phrase ? darkLeadB : darkLeadA, {
          type: 'triangle',
          vol: 0.1,
          gate: 0.68,
          vibrato: 1.3,
          vibRate: 6.5
        });
        if (fillBar) {
          noiseBurst(buf, barT + beat * 3.25, beat * 0.75, { vol: 0.09, attack: 0.01, decay: 0.04, sustain: 0.35, release: 0.08, color: 0.6 });
        }
        continue;
      }

      if (style === 'o4ko') {
        addKick(buf, barT + beat * 0, 60, 0.16, 0.32);
        addKick(buf, barT + beat * 2, 56, 0.15, 0.28);
        addSnare(buf, barT + beat * 1, 0.10, 0.18);
        addSnare(buf, barT + beat * 3, 0.10, 0.19);
        for (let i = 0; i < 8; i++) addHat(buf, barT + i * beat * 0.5, 0.03, 0.08);
        addSeq(buf, barT, beat * 0.5, bass, [0, 0, 5, 5, 7, 7, 10, 7], {
          type: 'saw',
          vol: 0.145,
          gate: 0.84,
          attack: 0.004,
          decay: 0.03,
          sustain: 0.58,
          release: 0.05,
          noiseMix: 0.05
        });
        const o4koA = [12, 15, 19, 22, 19, 15, 12, 10];
        const o4koB = [12, 10, 12, 15, 19, 22, 24, 22];
        addSeq(buf, barT, beat * 0.5, root, phrase ? o4koB : o4koA, {
          type: 'square',
          vol: 0.094,
          gate: 0.72
        });
        addChordPad(buf, barT, beat * beatsPerBar, [chord[0], chord[1], chord[2], chord[2] + 2], {
          type: 'triangle',
          vol: 0.034,
          attack: 0.09,
          release: 0.16
        });
        if (fillBar) {
          addSeq(buf, barT + beat * 2.75, beat * 0.25, root, [19, 21, 22, 24, 26], {
            type: 'square',
            vol: 0.068,
            gate: 0.7
          });
        }
        continue;
      }

      if (style === 'nosok') {
        addKick(buf, barT + beat * 0, 68, 0.13, 0.28);
        addKick(buf, barT + beat * 2.5, 66, 0.11, 0.21);
        addSnare(buf, barT + beat * 1, 0.10, 0.18);
        addSnare(buf, barT + beat * 3, 0.10, 0.21);
        for (let i = 0; i < 8; i++) addHat(buf, barT + i * beat * 0.5, 0.03, i % 2 ? 0.11 : 0.08);
        addChordPad(buf, barT, beat * beatsPerBar, [chord[0], chord[1], chord[2], chord[0] + 7], {
          type: 'triangle',
          vol: 0.05,
          attack: 0.06,
          release: 0.12
        });
        addSeq(buf, barT, beat, root + 12, phrase ? [0, 4, 7, 12] : [0, 7, 4, 12], {
          type: 'square',
          vol: 0.11,
          gate: 0.5
        });
        addSeq(buf, barT, beat * 0.5, bass, [0, 0, 7, 7, 5, 5, 7, 10], {
          type: 'sine',
          vol: 0.12,
          gate: 0.9,
          attack: 0.005,
          decay: 0.04,
          sustain: 0.7,
          release: 0.07
        });
        if (fillBar) {
          addSnare(buf, barT + beat * 3.75, 0.08, 0.12);
        }
        continue;
      }

      if (style === 'platforms') {
        addKick(buf, barT + beat * 0, 70, 0.12, 0.22);
        addKick(buf, barT + beat * 2, 66, 0.11, 0.18);
        addSnare(buf, barT + beat * 1.5, 0.09, 0.14);
        addSnare(buf, barT + beat * 3.5, 0.09, 0.14);
        for (let i = 0; i < 8; i++) addHat(buf, barT + i * beat * 0.5, 0.028, i % 2 ? 0.08 : 0.06);
        addChordPad(buf, barT, beat * beatsPerBar, chord, { type: 'sine', vol: 0.045, attack: 0.08, release: 0.13 });
        addSeq(buf, barT, beat * 0.5, bass, [0, 7, 5, 7, 0, 7, 10, 12], {
          type: 'triangle',
          vol: 0.112,
          gate: 0.74
        });
        const plA = [12, 14, 16, 19, 16, 14, 12, 14];
        const plB = [12, 16, 19, 21, 19, 16, 14, 12];
        addSeq(buf, barT, beat * 0.5, root, phrase ? plB : plA, {
          type: 'triangle',
          vol: 0.074,
          gate: 0.7
        });
        continue;
      }

      if (style === 'lovlyu') {
        addKick(buf, barT + beat * 0, 70, 0.11, 0.24);
        addKick(buf, barT + beat * 2, 66, 0.11, 0.21);
        addSnare(buf, barT + beat * 1, 0.09, 0.15);
        addSnare(buf, barT + beat * 3, 0.09, 0.16);
        for (let i = 0; i < 16; i++) addHat(buf, barT + i * beat * 0.25, 0.022, i % 2 ? 0.09 : 0.05);
        addSeq(buf, barT, beat * 0.25, bass, [0, 7, 12, 7, 5, 7, 10, 7, 0, 7, 12, 7, 5, 7, 10, 12], {
          type: 'triangle',
          vol: 0.1,
          gate: 0.68
        });
        const lvA = [24, 22, 21, 19, 17, 19, 21, 19, 17, 16, 17, 19, 21, 19, 17, 16];
        const lvB = [24, 26, 24, 22, 21, 22, 24, 22, 21, 19, 21, 22, 24, 22, 21, 19];
        addSeq(buf, barT, beat * 0.25, root, phrase ? lvB : lvA, {
          type: 'sine',
          vol: 0.062,
          gate: 0.64
        });
        continue;
      }

      if (style === 'library') {
        addKick(buf, barT + beat * 0, 58, 0.14, 0.22);
        addHat(buf, barT + beat * 1, 0.04, 0.05);
        addHat(buf, barT + beat * 2, 0.04, 0.05);
        tone(buf, barT, beat * 0.9, {
          freq: noteFreq(bass),
          type: 'triangle',
          vol: 0.14,
          attack: 0.005,
          decay: 0.04,
          sustain: 0.65,
          release: 0.06
        });
        addChordPad(buf, barT + beat * 1, beat * 2, [chord[0], chord[1], chord[2], chord[1] - 2], {
          type: 'sine',
          vol: 0.04,
          attack: 0.06,
          release: 0.16
        });
        const libA = [12, 14, 15, 17, 15, 14];
        const libB = [12, 10, 12, 14, 15, 14];
        addSeq(buf, barT, beat * 0.5, root, phrase ? libB : libA, {
          type: 'triangle',
          vol: 0.072,
          gate: 0.72
        });
        if (fillBar) {
          noiseBurst(buf, barT + beat * 2.2, beat * 0.7, { vol: 0.05, attack: 0.02, decay: 0.08, sustain: 0.28, release: 0.12, color: 0.6 });
        }
        continue;
      }

      if (style === 'runner') {
        addKick(buf, barT + beat * 0, 62, 0.11, 0.34);
        addKick(buf, barT + beat * 1.5, 58, 0.10, 0.24);
        addKick(buf, barT + beat * 2.75, 55, 0.10, 0.22);
        addSnare(buf, barT + beat * 1, 0.10, 0.24);
        addSnare(buf, barT + beat * 3, 0.10, 0.25);
        for (let i = 0; i < 16; i++) addHat(buf, barT + i * beat * 0.25, 0.02, i % 2 ? 0.1 : 0.06);
        addSeq(buf, barT, beat * 0.25, bass, [0, 0, 7, 10, 0, 0, 7, 12, 0, 0, 7, 10, 0, 10, 12, 14], {
          type: 'saw',
          vol: 0.132,
          gate: 0.68,
          noiseMix: 0.05,
          attack: 0.001,
          decay: 0.016,
          sustain: 0.3,
          release: 0.02
        });
        const runA = [19, 17, 19, 21, 22, 21, 19, 17, 16, 17, 19, 21, 22, 21, 19, 17];
        const runB = [19, 21, 22, 24, 22, 21, 19, 17, 19, 21, 22, 24, 26, 24, 22, 21];
        addSeq(buf, barT, beat * 0.25, root, phrase ? runB : runA, {
          type: 'square',
          vol: 0.06,
          gate: 0.62
        });
        continue;
      }

      // Базовый fallback: спокойный arcade.
      for (let q = 0; q < beatsPerBar; q++) {
        addKick(buf, barT + q * beat, 66, 0.12, 0.2 + energy * 0.06);
        if (q === 1 || q === 3) addSnare(buf, barT + q * beat, 0.1, 0.14 + energy * 0.06);
        addHat(buf, barT + q * beat + beat * 0.5, 0.03, 0.07);
      }
      tone(buf, barT, beat * 2, { freq: noteFreq(bass), type: 'triangle', vol: 0.14, attack: 0.004, decay: 0.03, sustain: 0.68, release: 0.05 });
      tone(buf, barT + beat * 2, beat * 2, { freq: noteFreq(bass + 7), type: 'triangle', vol: 0.14, attack: 0.004, decay: 0.03, sustain: 0.68, release: 0.05 });
      addChordPad(buf, barT, beat * beatsPerBar, chord, { type: 'sine', vol: 0.05 });
      addSeq(buf, barT, beat * 0.5, root, [12, 16, 19, 24, 19, 16, 24, 19], {
        type: 'square',
        vol: 0.09 + energy * 0.03,
        gate: 0.72
      });
    }
  });
}

// ---------- SFX ----------
saveSfx('ui_click', 0.08, b => {
  tone(b, 0.0, 0.08, { freq: 820, freq2: 1120, type: 'triangle', vol: 0.45, attack: 0.001, decay: 0.015, sustain: 0.2, release: 0.03 });
});

saveSfx('ui_error', 0.18, b => {
  tone(b, 0.00, 0.09, { freq: 320, freq2: 220, type: 'square', vol: 0.42, attack: 0.001, decay: 0.01, sustain: 0.3, release: 0.02 });
  tone(b, 0.09, 0.09, { freq: 260, freq2: 180, type: 'square', vol: 0.38, attack: 0.001, decay: 0.01, sustain: 0.3, release: 0.02 });
});

saveSfx('ui_confirm', 0.22, b => {
  tone(b, 0.00, 0.10, { freq: 520, freq2: 760, type: 'triangle', vol: 0.35, attack: 0.001, decay: 0.02, sustain: 0.5, release: 0.03 });
  tone(b, 0.10, 0.12, { freq: 760, freq2: 980, type: 'triangle', vol: 0.32, attack: 0.001, decay: 0.02, sustain: 0.45, release: 0.03 });
});

saveSfx('ui_pause', 0.14, b => {
  tone(b, 0.00, 0.07, { freq: 540, type: 'square', vol: 0.35, attack: 0.001, decay: 0.01, sustain: 0.45, release: 0.02 });
  tone(b, 0.07, 0.07, { freq: 420, type: 'square', vol: 0.35, attack: 0.001, decay: 0.01, sustain: 0.45, release: 0.02 });
});

saveSfx('ui_resume', 0.16, b => {
  tone(b, 0.00, 0.08, { freq: 420, type: 'triangle', vol: 0.30, attack: 0.001, decay: 0.01, sustain: 0.5, release: 0.02 });
  tone(b, 0.08, 0.08, { freq: 580, type: 'triangle', vol: 0.30, attack: 0.001, decay: 0.01, sustain: 0.5, release: 0.02 });
});

saveSfx('intro_whoosh', 0.40, b => {
  noiseBurst(b, 0.00, 0.40, { vol: 0.22, attack: 0.001, decay: 0.12, sustain: 0.5, release: 0.18, color: 0.2 });
  tone(b, 0.00, 0.30, { freq: 220, freq2: 520, type: 'saw', vol: 0.16, attack: 0.001, decay: 0.06, sustain: 0.5, release: 0.08 });
});

saveSfx('player_jump', 0.18, b => {
  tone(b, 0.00, 0.18, { freq: 260, freq2: 620, type: 'triangle', vol: 0.35, attack: 0.001, decay: 0.02, sustain: 0.4, release: 0.04 });
});

saveSfx('player_land', 0.12, b => {
  noiseBurst(b, 0, 0.10, { vol: 0.20, attack: 0.001, decay: 0.02, sustain: 0.2, release: 0.03, color: 0.7 });
  tone(b, 0, 0.10, { freq: 140, freq2: 90, type: 'sine', vol: 0.22, attack: 0.001, decay: 0.03, sustain: 0.2, release: 0.03 });
});

saveSfx('player_shoot_kuzy', 0.14, b => {
  tone(b, 0, 0.14, { freq: 560, freq2: 280, type: 'saw', vol: 0.34, attack: 0.001, decay: 0.02, sustain: 0.28, release: 0.04 });
});

saveSfx('player_shoot_dron', 0.16, b => {
  tone(b, 0, 0.16, { freq: 340, freq2: 920, type: 'sine', vol: 0.30, attack: 0.001, decay: 0.02, sustain: 0.35, release: 0.04, vibrato: 12, vibRate: 15 });
});

saveSfx('player_shoot_max', 0.14, b => {
  noiseBurst(b, 0, 0.12, { vol: 0.18, attack: 0.001, decay: 0.015, sustain: 0.35, release: 0.03, color: 0.6 });
  tone(b, 0, 0.12, { freq: 240, freq2: 130, type: 'square', vol: 0.25, attack: 0.001, decay: 0.02, sustain: 0.3, release: 0.03 });
});

saveSfx('player_shoot_bonus', 0.24, b => {
  tone(b, 0.00, 0.10, { freq: 520, freq2: 820, type: 'square', vol: 0.25, attack: 0.001, decay: 0.02, sustain: 0.4, release: 0.03 });
  tone(b, 0.08, 0.16, { freq: 780, freq2: 1220, type: 'triangle', vol: 0.25, attack: 0.001, decay: 0.02, sustain: 0.35, release: 0.04 });
});

saveSfx('enemy_shoot_lilac', 0.12, b => {
  tone(b, 0, 0.12, { freq: 220, freq2: 420, type: 'triangle', vol: 0.26, attack: 0.001, decay: 0.02, sustain: 0.3, release: 0.03 });
});

saveSfx('enemy_shoot_67', 0.16, b => {
  tone(b, 0, 0.16, { freq: 160, freq2: 120, type: 'square', vol: 0.28, attack: 0.001, decay: 0.02, sustain: 0.35, release: 0.04, noiseMix: 0.08 });
});

saveSfx('enemy_shoot_o4ko', 0.18, b => {
  tone(b, 0, 0.18, { freq: 180, freq2: 320, type: 'saw', vol: 0.26, attack: 0.001, decay: 0.03, sustain: 0.45, release: 0.04, noiseMix: 0.14 });
});

saveSfx('enemy_shoot_nosok', 0.16, b => {
  noiseBurst(b, 0, 0.16, { vol: 0.22, attack: 0.001, decay: 0.02, sustain: 0.35, release: 0.04, color: 0.55 });
  tone(b, 0, 0.12, { freq: 180, freq2: 130, type: 'triangle', vol: 0.18, attack: 0.001, decay: 0.02, sustain: 0.3, release: 0.03 });
});

saveSfx('enemy_shoot_tele', 0.14, b => {
  tone(b, 0, 0.14, { freq: 420, freq2: 300, type: 'square', vol: 0.24, attack: 0.001, decay: 0.02, sustain: 0.4, release: 0.03 });
});

saveSfx('hit_enemy', 0.12, b => {
  noiseBurst(b, 0, 0.10, { vol: 0.22, attack: 0.001, decay: 0.015, sustain: 0.3, release: 0.02, color: 0.4 });
  tone(b, 0, 0.10, { freq: 460, freq2: 240, type: 'triangle', vol: 0.18, attack: 0.001, decay: 0.02, sustain: 0.2, release: 0.02 });
});

saveSfx('hit_boss', 0.16, b => {
  noiseBurst(b, 0, 0.14, { vol: 0.26, attack: 0.001, decay: 0.02, sustain: 0.4, release: 0.03, color: 0.5 });
  tone(b, 0, 0.14, { freq: 240, freq2: 150, type: 'square', vol: 0.22, attack: 0.001, decay: 0.02, sustain: 0.28, release: 0.03 });
});

saveSfx('explosion_small', 0.24, b => {
  noiseBurst(b, 0, 0.24, { vol: 0.34, attack: 0.001, decay: 0.04, sustain: 0.45, release: 0.08, color: 0.55 });
  tone(b, 0, 0.18, { freq: 120, freq2: 55, type: 'sine', vol: 0.22, attack: 0.001, decay: 0.03, sustain: 0.3, release: 0.06 });
});

saveSfx('explosion_big', 0.46, b => {
  noiseBurst(b, 0, 0.46, { vol: 0.42, attack: 0.001, decay: 0.08, sustain: 0.52, release: 0.16, color: 0.65 });
  tone(b, 0, 0.40, { freq: 100, freq2: 35, type: 'sine', vol: 0.34, attack: 0.001, decay: 0.05, sustain: 0.4, release: 0.12 });
});

saveSfx('player_hurt', 0.26, b => {
  tone(b, 0.00, 0.13, { freq: 420, freq2: 280, type: 'square', vol: 0.24, attack: 0.001, decay: 0.02, sustain: 0.34, release: 0.03 });
  tone(b, 0.13, 0.13, { freq: 280, freq2: 180, type: 'square', vol: 0.24, attack: 0.001, decay: 0.02, sustain: 0.34, release: 0.03 });
});

saveSfx('pickup_beer', 0.22, b => {
  tone(b, 0, 0.10, { freq: 640, freq2: 900, type: 'triangle', vol: 0.28, attack: 0.001, decay: 0.015, sustain: 0.35, release: 0.03 });
  tone(b, 0.10, 0.12, { freq: 880, freq2: 1180, type: 'triangle', vol: 0.25, attack: 0.001, decay: 0.015, sustain: 0.32, release: 0.03 });
});

saveSfx('pickup_heart', 0.24, b => {
  tone(b, 0, 0.12, { freq: 520, freq2: 780, type: 'sine', vol: 0.26, attack: 0.001, decay: 0.02, sustain: 0.44, release: 0.03 });
  tone(b, 0.12, 0.12, { freq: 780, freq2: 1040, type: 'sine', vol: 0.22, attack: 0.001, decay: 0.02, sustain: 0.44, release: 0.03 });
});

saveSfx('pickup_banana', 0.28, b => {
  tone(b, 0.00, 0.10, { freq: 620, freq2: 820, type: 'triangle', vol: 0.24, attack: 0.001, decay: 0.02, sustain: 0.45, release: 0.03 });
  tone(b, 0.10, 0.10, { freq: 820, freq2: 1040, type: 'triangle', vol: 0.24, attack: 0.001, decay: 0.02, sustain: 0.45, release: 0.03 });
  tone(b, 0.20, 0.08, { freq: 1040, freq2: 1320, type: 'triangle', vol: 0.22, attack: 0.001, decay: 0.02, sustain: 0.42, release: 0.03 });
});

saveSfx('pickup_ice', 0.20, b => {
  tone(b, 0, 0.20, { freq: 900, freq2: 600, type: 'sine', vol: 0.27, attack: 0.001, decay: 0.03, sustain: 0.35, release: 0.05, vibrato: 8, vibRate: 12 });
});

saveSfx('pickup_dynamite', 0.36, b => {
  tone(b, 0.00, 0.16, { freq: 240, freq2: 140, type: 'square', vol: 0.21, attack: 0.001, decay: 0.03, sustain: 0.4, release: 0.03 });
  noiseBurst(b, 0.16, 0.20, { vol: 0.35, attack: 0.001, decay: 0.03, sustain: 0.4, release: 0.06, color: 0.65 });
});

saveSfx('goal_horn', 0.46, b => {
  tone(b, 0.00, 0.46, { freq: 220, type: 'square', vol: 0.22, attack: 0.01, decay: 0.04, sustain: 0.72, release: 0.08 });
  tone(b, 0.00, 0.46, { freq: 440, type: 'square', vol: 0.16, attack: 0.01, decay: 0.04, sustain: 0.72, release: 0.08 });
});

saveSfx('goal_applause', 1.8, b => {
  for (let t = 0; t < 1.8; t += 0.08 + Math.random() * 0.06) {
    noiseBurst(b, t, 0.06 + Math.random() * 0.04, { vol: 0.14 + Math.random() * 0.07, attack: 0.001, decay: 0.008, sustain: 0.2, release: 0.03, color: 0.15 });
  }
});

saveSfx('library_plop', 0.34, b => {
  tone(b, 0.00, 0.24, { freq: 190, freq2: 70, type: 'sine', vol: 0.30, attack: 0.001, decay: 0.03, sustain: 0.4, release: 0.07 });
  noiseBurst(b, 0.10, 0.24, { vol: 0.16, attack: 0.001, decay: 0.02, sustain: 0.4, release: 0.06, color: 0.35 });
});

saveSfx('library_splash', 0.42, b => {
  for (let i = 0; i < 4; i++) {
    noiseBurst(b, i * 0.06, 0.16, { vol: 0.12 + i * 0.04, attack: 0.001, decay: 0.02, sustain: 0.35, release: 0.05, color: 0.4 });
  }
  tone(b, 0.02, 0.28, { freq: 380, freq2: 190, type: 'sine', vol: 0.11, attack: 0.001, decay: 0.02, sustain: 0.25, release: 0.05 });
});

saveSfx('toilet_charge', 1.0, b => {
  tone(b, 0.00, 1.00, { freq: 90, freq2: 260, type: 'saw', vol: 0.16, attack: 0.01, decay: 0.06, sustain: 0.8, release: 0.12, vibrato: 4, vibRate: 8 });
  noiseBurst(b, 0.20, 0.70, { vol: 0.08, attack: 0.01, decay: 0.1, sustain: 0.6, release: 0.12, color: 0.5 });
});

saveSfx('toilet_fire', 0.42, b => {
  noiseBurst(b, 0.0, 0.42, { vol: 0.34, attack: 0.001, decay: 0.05, sustain: 0.45, release: 0.1, color: 0.6 });
  tone(b, 0.0, 0.32, { freq: 200, freq2: 60, type: 'sine', vol: 0.28, attack: 0.001, decay: 0.03, sustain: 0.35, release: 0.08 });
});

saveSfx('book_hit', 0.14, b => {
  noiseBurst(b, 0, 0.12, { vol: 0.16, attack: 0.001, decay: 0.014, sustain: 0.28, release: 0.03, color: 0.7 });
  tone(b, 0, 0.10, { freq: 300, freq2: 210, type: 'triangle', vol: 0.14, attack: 0.001, decay: 0.01, sustain: 0.25, release: 0.02 });
});

saveSfx('victory_stinger', 1.2, b => {
  const seq = [72, 76, 79, 84];
  for (let i = 0; i < seq.length; i++) {
    tone(b, i * 0.22, 0.32, { freq: noteFreq(seq[i]), type: 'triangle', vol: 0.23, attack: 0.001, decay: 0.03, sustain: 0.55, release: 0.06 });
  }
});

saveSfx('gameover_stinger', 1.1, b => {
  const seq = [67, 62, 58, 54];
  for (let i = 0; i < seq.length; i++) {
    tone(b, i * 0.22, 0.30, { freq: noteFreq(seq[i]), type: 'square', vol: 0.22, attack: 0.001, decay: 0.03, sustain: 0.5, release: 0.06 });
  }
});

saveSfx('phase_up', 0.42, b => {
  tone(b, 0.00, 0.14, { freq: 420, freq2: 620, type: 'triangle', vol: 0.2, attack: 0.001, decay: 0.02, sustain: 0.4, release: 0.03 });
  tone(b, 0.12, 0.14, { freq: 620, freq2: 820, type: 'triangle', vol: 0.2, attack: 0.001, decay: 0.02, sustain: 0.4, release: 0.03 });
  tone(b, 0.24, 0.18, { freq: 820, freq2: 1080, type: 'triangle', vol: 0.2, attack: 0.001, decay: 0.02, sustain: 0.4, release: 0.04 });
});

saveSfx('dash_whoosh', 0.24, b => {
  noiseBurst(b, 0, 0.24, { vol: 0.22, attack: 0.001, decay: 0.03, sustain: 0.4, release: 0.05, color: 0.2 });
  tone(b, 0, 0.24, { freq: 320, freq2: 780, type: 'saw', vol: 0.14, attack: 0.001, decay: 0.02, sustain: 0.3, release: 0.04 });
});

saveSfx('slam_impact', 0.32, b => {
  noiseBurst(b, 0, 0.32, { vol: 0.32, attack: 0.001, decay: 0.04, sustain: 0.45, release: 0.08, color: 0.62 });
  tone(b, 0, 0.30, { freq: 130, freq2: 52, type: 'sine', vol: 0.28, attack: 0.001, decay: 0.03, sustain: 0.38, release: 0.08 });
});

saveSfx('runner_puff', 0.10, b => {
  noiseBurst(b, 0, 0.10, { vol: 0.15, attack: 0.001, decay: 0.01, sustain: 0.24, release: 0.03, color: 0.2 });
});

saveSfx('runner_turbo', 0.20, b => {
  tone(b, 0, 0.20, { freq: 360, freq2: 820, type: 'saw', vol: 0.18, attack: 0.001, decay: 0.02, sustain: 0.35, release: 0.03, noiseMix: 0.1 });
});

saveSfx('lovlyu_catch', 0.20, b => {
  tone(b, 0, 0.10, { freq: 700, freq2: 920, type: 'triangle', vol: 0.2, attack: 0.001, decay: 0.015, sustain: 0.35, release: 0.03 });
  tone(b, 0.08, 0.12, { freq: 900, freq2: 1200, type: 'triangle', vol: 0.18, attack: 0.001, decay: 0.015, sustain: 0.32, release: 0.03 });
});

saveSfx('lovlyu_miss', 0.22, b => {
  tone(b, 0, 0.22, { freq: 640, freq2: 280, type: 'sine', vol: 0.18, attack: 0.001, decay: 0.02, sustain: 0.28, release: 0.06 });
});

saveSfx('platform_ruby', 0.26, b => {
  tone(b, 0.0, 0.26, { freq: 780, freq2: 1180, type: 'sine', vol: 0.24, attack: 0.001, decay: 0.03, sustain: 0.45, release: 0.06, vibrato: 4, vibRate: 9 });
});

saveSfx('platform_cup', 0.34, b => {
  tone(b, 0.00, 0.14, { freq: 520, freq2: 760, type: 'triangle', vol: 0.20, attack: 0.001, decay: 0.02, sustain: 0.35, release: 0.03 });
  tone(b, 0.12, 0.22, { freq: 760, freq2: 1080, type: 'triangle', vol: 0.20, attack: 0.001, decay: 0.03, sustain: 0.4, release: 0.05 });
});

// ---------- Music loops ----------
buildTheme('menu_theme',      { style: 'menu',      bpm: 96,  root: 50, mode: 'major', energy: 0.34, bars: 8 });
buildTheme('normal_theme',    { style: 'normal',    bpm: 112, root: 48, mode: 'major', energy: 0.58, bars: 8, progression: [0, 5, 7, 4] });
buildTheme('survival_theme',  { style: 'survival',  bpm: 132, root: 44, mode: 'minor', energy: 0.90, bars: 8, progression: [0, 3, 7, 10] });
buildTheme('m67_theme',       { style: 'm67',       bpm: 116, root: 40, mode: 'minor', energy: 0.76, bars: 8, progression: [0, 1, 3, -2] });
buildTheme('o4ko_theme',      { style: 'o4ko',      bpm: 124, root: 39, mode: 'minor', energy: 0.82, bars: 8, progression: [0, 3, 7, 5] });
buildTheme('nosok_theme',     { style: 'nosok',     bpm: 126, root: 52, mode: 'major', energy: 0.72, bars: 8, progression: [0, 5, 7, 9] });
buildTheme('platforms_theme', { style: 'platforms', bpm: 108, root: 50, mode: 'major', energy: 0.50, bars: 8, progression: [0, 7, 5, 9] });
buildTheme('lovlyu_theme',    { style: 'lovlyu',    bpm: 138, root: 55, mode: 'major', energy: 0.76, bars: 8, progression: [0, 4, 7, 5] });
buildTheme('runner_theme',    { style: 'runner',    bpm: 150, root: 46, mode: 'minor', energy: 0.92, bars: 8, progression: [0, 3, 7, 10] });
buildTheme('library_theme',   { style: 'library',   bpm: 102, root: 43, mode: 'minor', energy: 0.58, bars: 10, beatsPerBar: 3, progression: [0, 3, 5, 2, 0] });

console.log('Audio assets generated.');
