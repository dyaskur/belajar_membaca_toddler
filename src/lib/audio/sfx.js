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

/** Soft, non-punishing low buzz + a gentle haptic double-pulse where supported
 *  (Android; iOS has no navigator.vibrate and silently skips it). */
export function buzzWrong() {
  tones([220, 196], 0.2, 0.1); // A3 G3
  if (browser && navigator.vibrate) navigator.vibrate([70, 40, 70]);
}

/** 
 * @param {'sine'|'triangle'} type 
 * @param {number} freq 
 * @param {number} peakGain 
 * @param {number} dur 
 * @param {number} [endFreq] 
 */
function playTone(type, freq, peakGain, dur, endFreq) {
  const c = ac();
  if (!c) return;
  if (c.state === 'suspended') c.resume();
  const osc = c.createOscillator();
  const g = c.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, c.currentTime);
  if (endFreq !== undefined) {
    osc.frequency.exponentialRampToValueAtTime(endFreq, c.currentTime + dur);
  }
  g.gain.setValueAtTime(0, c.currentTime);
  g.gain.linearRampToValueAtTime(peakGain, c.currentTime + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + dur);
  osc.connect(g).connect(c.destination);
  osc.start(c.currentTime);
  osc.stop(c.currentTime + dur);
}

/** 1200Hz triangle blip every ~90ms while spinning */
export function spinTick() {
  playTone('triangle', 1200, 0.3, 0.05);
}

/** 150Hz thock per reel stop */
export function reelThunk() {
  playTone('sine', 150, 0.9, 0.15, 50);
}

/** Rising arpeggio C5-E5-G5-C6 */
export function sfxJackpot() {
  tones([523.25, 659.25, 783.99, 1046.50], 0.15, 0.2); // C5 E5 G5 C6
}
