import { browser } from '$app/environment';

/** Instant non-speech cues, synthesized with WebAudio (no asset files). */
let ctx = /** @type {AudioContext|null} */ (null);

function ac() {
  if (!browser) return null;
  if (!ctx) ctx = new (window.AudioContext || /** @type {any} */ (window).webkitAudioContext)();
  return ctx;
}

/**
 * @param {AudioContext} c
 * @param {{
 *   freq: number,
 *   start?: number,
 *   dur?: number,
 *   gain?: number,
 *   type?: OscillatorType,
 *   slideTo?: number
 * }} note
 */
function playNote(c, note) {
  const { freq, start = c.currentTime, dur = 0.18, gain = 0.12, type = 'sine', slideTo } = note;
  const osc = c.createOscillator();
  const g = c.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, start);
  if (slideTo) {
    osc.frequency.exponentialRampToValueAtTime(slideTo, start + dur * 0.82);
  }
  g.gain.setValueAtTime(0.0001, start);
  g.gain.exponentialRampToValueAtTime(gain, start + 0.018);
  g.gain.exponentialRampToValueAtTime(0.0001, start + dur);
  osc.connect(g).connect(c.destination);
  osc.start(start);
  osc.stop(start + dur + 0.02);
}

function readyContext() {
  const c = ac();
  if (!c) return null;
  if (c.state === 'suspended') c.resume();
  return c;
}

/** Sparkly rising arpeggio for correct answers. */
export function chimeCorrect() {
  const c = readyContext();
  if (!c) return;
  const t = c.currentTime;
  [523.25, 659.25, 783.99, 1046.5].forEach((freq, i) => {
    playNote(c, {
      freq,
      start: t + i * 0.055,
      dur: 0.2,
      gain: 0.085,
      type: 'triangle'
    });
  });
  playNote(c, { freq: 1318.51, start: t + 0.22, dur: 0.26, gain: 0.045, type: 'sine' });
  playNote(c, { freq: 1567.98, start: t + 0.27, dur: 0.24, gain: 0.035, type: 'sine' });
}

/** Soft cartoon boing + a gentle haptic double-pulse where supported
 *  (Android; iOS has no navigator.vibrate and silently skips it). */
export function buzzWrong() {
  const c = readyContext();
  if (!c) return;
  const t = c.currentTime;
  playNote(c, {
    freq: 196,
    slideTo: 82.41,
    start: t,
    dur: 0.34,
    gain: 0.105,
    type: 'triangle'
  });
  playNote(c, {
    freq: 130.81,
    slideTo: 164.81,
    start: t + 0.12,
    dur: 0.18,
    gain: 0.055,
    type: 'sine'
  });
  if (browser && navigator.vibrate) navigator.vibrate([70, 40, 70]);
}

/** Quick playful blip for tapping the robot. */
export function boopRobot() {
  const c = readyContext();
  if (!c) return;
  const t = c.currentTime;
  playNote(c, { freq: 493.88, slideTo: 739.99, start: t, dur: 0.09, gain: 0.075, type: 'sine' });
  playNote(c, { freq: 987.77, start: t + 0.07, dur: 0.11, gain: 0.04, type: 'triangle' });
}
