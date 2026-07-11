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

/** Happy rising chime (ascending sparkle arpeggio). */
export function chimeCorrect() {
  tones([523.25, 659.25, 783.99, 1046.50], 0.15, 0.2); // C5 E5 G5 C6
}

/** Cartoon "boing" (descending/wobbly pitch drop) + gentle haptic pulse where supported. */
export function buzzWrong() {
  const c = ac();
  if (c) {
    if (c.state === 'suspended') c.resume();
    const osc = c.createOscillator();
    const g = c.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(300, c.currentTime);
    osc.frequency.exponentialRampToValueAtTime(80, c.currentTime + 0.3);
    g.gain.setValueAtTime(0, c.currentTime);
    g.gain.linearRampToValueAtTime(0.2, c.currentTime + 0.05);
    g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.3);
    osc.connect(g).connect(c.destination);
    osc.start(c.currentTime);
    osc.stop(c.currentTime + 0.3);
  }
  if (browser && navigator.vibrate) navigator.vibrate([70, 40, 70]);
}

/** Silly boop sound for tapping the robot. */
export function sfxBoop() {
  const c = ac();
  if (!c) return;
  if (c.state === 'suspended') c.resume();
  const osc = c.createOscillator();
  const g = c.createGain();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(600, c.currentTime);
  osc.frequency.exponentialRampToValueAtTime(900, c.currentTime + 0.1);
  g.gain.setValueAtTime(0, c.currentTime);
  g.gain.linearRampToValueAtTime(0.15, c.currentTime + 0.02);
  g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.1);
  osc.connect(g).connect(c.destination);
  osc.start(c.currentTime);
  osc.stop(c.currentTime + 0.1);
}
