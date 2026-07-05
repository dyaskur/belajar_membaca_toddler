import { browser } from '$app/environment';

/** Instant non-speech cues, synthesized with WebAudio (no asset files). */
let ctx = /** @type {AudioContext|null} */ (null);

function ac() {
  if (!browser) return null;
  if (!ctx) ctx = new (window.AudioContext || /** @type {any} */ (window).webkitAudioContext)();
  return ctx;
}

/** @param {number[]} freqs @param {number} dur @param {number} gain @param {OscillatorType} type */
function tones(freqs, dur, gain = 0.15, type = 'sine') {
  const c = ac();
  if (!c) return;
  if (c.state === 'suspended') c.resume();
  freqs.forEach((f, i) => {
    const osc = c.createOscillator();
    const g = c.createGain();
    osc.type = type;
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

/** Tiny high blip, fired repeatedly while slot reels spin. */
export function spinTick() {
  tones([1200], 0.045, 0.05, 'triangle');
}

/** Low thock when a slot reel lands. */
export function reelThunk() {
  tones([150], 0.1, 0.25);
}

/** Rising jackpot arpeggio (bigger than chimeCorrect). */
export function sfxJackpot() {
  tones([523.25, 659.25, 783.99, 1046.5], 0.22, 0.18); // C5 E5 G5 C6
}
