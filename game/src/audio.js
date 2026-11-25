// audio.js — tiny synthesized sound effects (WebAudio, no files).
// All sounds are generated in code: short oscillator blips with an envelope.

let ctx = null;
let muted = false;

function ensureCtx() {
  if (!ctx) {
    try { ctx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { ctx = null; }
  }
  if (ctx && ctx.state === 'suspended') ctx.resume();
  return ctx;
}

export function unlockAudio() { ensureCtx(); }

export function setMuted(m) { muted = m; }
export function isMuted() { return muted; }

function blip(freq, dur, type, vol, when = 0) {
  if (muted) return;
  const c = ensureCtx();
  if (!c) return;
  const t = c.currentTime + when;
  const o = c.createOscillator();
  const g = c.createGain();
  o.type = type || 'sine';
  o.frequency.setValueAtTime(freq, t);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(vol || 0.12, t + 0.012);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g).connect(c.destination);
  o.start(t);
  o.stop(t + dur + 0.05);
}

export function sfxClick() { blip(660, 0.07, 'triangle', 0.08); }
export function sfxPickup() { blip(520, 0.08, 'sine', 0.10); blip(780, 0.09, 'sine', 0.08, 0.05); }
export function sfxCook() { blip(300, 0.12, 'sawtooth', 0.05); }
export function sfxDone() { blip(880, 0.10, 'sine', 0.12); blip(1174, 0.14, 'sine', 0.10, 0.08); }
export function sfxServe() {
  blip(523, 0.10, 'triangle', 0.12); blip(659, 0.10, 'triangle', 0.12, 0.09);
  blip(784, 0.16, 'triangle', 0.12, 0.18);
}
export function sfxBad() { blip(220, 0.18, 'square', 0.06); blip(160, 0.22, 'square', 0.06, 0.10); }
export function sfxOrder() { blip(980, 0.08, 'sine', 0.09); blip(1318, 0.10, 'sine', 0.07, 0.07); }
export function sfxHeart() { blip(392, 0.14, 'triangle', 0.10); blip(311, 0.20, 'triangle', 0.10, 0.12); }
