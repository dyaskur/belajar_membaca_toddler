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

/** @param {number} from @param {number} to @param {number} dur @param {number} gain @param {OscillatorType} type */
function sweep(from, to, dur, gain = 0.14, type = 'triangle') {
  const c = ac();
  if (!c) return;
  if (c.state === 'suspended') c.resume();
  const osc = c.createOscillator();
  const g = c.createGain();
  osc.type = type;
  const start = c.currentTime;
  osc.frequency.setValueAtTime(from, start);
  osc.frequency.exponentialRampToValueAtTime(to, start + dur);
  g.gain.setValueAtTime(gain, start);
  g.gain.exponentialRampToValueAtTime(0.0001, start + dur + 0.02);
  osc.connect(g).connect(c.destination);
  osc.start(start);
  osc.stop(start + dur + 0.03);
}

/** Ascending sparkle arpeggio. */
export function chimeCorrect() {
  tones([523.25, 659.25, 783.99, 1046.5], 0.13, 0.16, 'triangle'); // C5 E5 G5 C6
}

/** Cartoon "boing": a soft, non-punishing descending pitch-bend wobble + a gentle
 *  haptic double-pulse where supported (Android; iOS has no navigator.vibrate
 *  and silently skips it). */
export function buzzWrong() {
  sweep(320, 140, 0.28, 0.12);
  if (browser && navigator.vibrate) navigator.vibrate([70, 40, 70]);
}

/** Silly boop when the robot mascot is tapped — pure delight, zero stakes. */
export function boop() {
  sweep(300, 560, 0.1, 0.14, 'sine');
}
