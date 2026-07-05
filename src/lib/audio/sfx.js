import { browser } from '$app/environment';

/** Instant non-speech cues, synthesized with WebAudio (no asset files). */
let ctx = /** @type {AudioContext|null} */ (null);

function ac() {
  if (!browser) return null;
  if (!ctx) ctx = new (window.AudioContext || /** @type {any} */ (window).webkitAudioContext)();
  return ctx;
}

/** @param {number[]} freqs @param {number} dur @param {number} gain */
function tones(freqs, dur, gain = 0.15) {
  const c = ac();
  if (!c) return;
  if (c.state === 'suspended') c.resume();
  freqs.forEach((f, i) => {
    const osc = c.createOscillator();
    const g = c.createGain();
    osc.type = 'sine';
    osc.frequency.value = f;
    const start = c.currentTime + i * dur * 0.6;
    g.gain.setValueAtTime(0, start);
    g.gain.linearRampToValueAtTime(gain, start + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, start + dur);
    osc.connect(g).connect(c.destination);
    osc.start(start);
    osc.stop(start + dur);
  });
}

/** Happy rising chime. */
export function chimeCorrect() {
  tones([523.25, 659.25, 783.99], 0.18); // C5 E5 G5
}

/** Soft, non-punishing low buzz. */
export function buzzWrong() {
  tones([220, 196], 0.2, 0.1); // A3 G3
}

/** 1200Hz triangle blip every ~90ms while spinning */
export function spinTick() {
  const c = ac();
  if (!c) return;
  if (c.state === 'suspended') c.resume();
  const osc = c.createOscillator();
  const g = c.createGain();
  osc.type = 'triangle';
  osc.frequency.value = 1200;
  g.gain.setValueAtTime(0, c.currentTime);
  g.gain.linearRampToValueAtTime(0.05, c.currentTime + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + 0.05);
  osc.connect(g).connect(c.destination);
  osc.start(c.currentTime);
  osc.stop(c.currentTime + 0.05);
}

/** 150Hz thock per reel stop */
export function reelThunk() {
  const c = ac();
  if (!c) return;
  if (c.state === 'suspended') c.resume();
  const osc = c.createOscillator();
  const g = c.createGain();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(150, c.currentTime);
  osc.frequency.exponentialRampToValueAtTime(50, c.currentTime + 0.1);
  g.gain.setValueAtTime(0, c.currentTime);
  g.gain.linearRampToValueAtTime(0.3, c.currentTime + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + 0.1);
  osc.connect(g).connect(c.destination);
  osc.start(c.currentTime);
  osc.stop(c.currentTime + 0.1);
}

/** Rising arpeggio C5-E5-G5-C6 */
export function sfxJackpot() {
  tones([523.25, 659.25, 783.99, 1046.50], 0.15, 0.2); // C5 E5 G5 C6
}
