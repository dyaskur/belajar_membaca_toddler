import { browser } from '$app/environment';

/** Instant non-speech cues, synthesized with WebAudio (no asset files). */
let ctx = /** @type {AudioContext|null} */ (null);

function ac() {
  if (!browser) return null;
  if (!ctx) ctx = new (window.AudioContext || /** @type {any} */ (window).webkitAudioContext)();
  if (ctx.state === 'suspended') ctx.resume();
  return ctx;
}

/**
 * Play a little sequence of notes.
 * @param {{ f: number, t?: number, dur?: number, gain?: number, type?: OscillatorType }[]} notes
 */
function seq(notes) {
  const c = ac();
  if (!c) return;
  const base = c.currentTime;
  for (const n of notes) {
    const osc = c.createOscillator();
    const g = c.createGain();
    osc.type = n.type ?? 'sine';
    osc.frequency.value = n.f;
    const start = base + (n.t ?? 0);
    const dur = n.dur ?? 0.16;
    g.gain.setValueAtTime(0, start);
    g.gain.linearRampToValueAtTime(n.gain ?? 0.14, start + 0.015);
    g.gain.exponentialRampToValueAtTime(0.0001, start + dur);
    osc.connect(g).connect(c.destination);
    osc.start(start);
    osc.stop(start + dur + 0.02);
  }
}

/**
 * A single oscillator that glides through a list of frequencies — the guts of
 * cartoon "boing"/"boop" effects.
 * @param {OscillatorType} type
 * @param {[number, number][]} points [freq, timeOffset] pairs
 * @param {number} gain
 */
function glide(type, points, gain = 0.12) {
  const c = ac();
  if (!c) return;
  const osc = c.createOscillator();
  const g = c.createGain();
  osc.type = type;
  const t = c.currentTime;
  const end = points[points.length - 1][1];
  osc.frequency.setValueAtTime(points[0][0], t);
  for (let i = 1; i < points.length; i++) {
    osc.frequency.exponentialRampToValueAtTime(points[i][0], t + points[i][1]);
  }
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(gain, t + 0.02);
  g.gain.exponentialRampToValueAtTime(0.0001, t + end);
  osc.connect(g).connect(c.destination);
  osc.start(t);
  osc.stop(t + end + 0.02);
}

/** Bouncy ascending sparkle arpeggio for a correct answer. */
export function chimeCorrect() {
  seq([
    { f: 523.25, t: 0.0, type: 'triangle' }, // C5
    { f: 659.25, t: 0.08, type: 'triangle' }, // E5
    { f: 783.99, t: 0.16, type: 'triangle' }, // G5
    { f: 1046.5, t: 0.24, type: 'triangle', dur: 0.26, gain: 0.13 }, // C6 pop
    { f: 1318.51, t: 0.3, type: 'sine', dur: 0.34, gain: 0.06 } // E6 shimmer
  ]);
}

/** Cartoon "boing" for a wrong answer — playful, non-punishing. Gentle haptic
 *  double-pulse where supported (Android; iOS silently skips navigator.vibrate). */
export function buzzWrong() {
  glide(
    'triangle',
    [
      [400, 0],
      [150, 0.12],
      [240, 0.22],
      [180, 0.34]
    ],
    0.12
  );
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
  seq([
    { f: 523.25, t: 0.0, type: 'triangle' },
    { f: 659.25, t: 0.15, type: 'triangle' },
    { f: 783.99, t: 0.3, type: 'triangle' },
    { f: 1046.50, t: 0.45, type: 'triangle', dur: 0.4, gain: 0.2 }
  ]);
}

/** Silly "boop" for poking the robot mascot — pure delight, slightly random so
 *  repeated taps never sound identical. */
export function boop() {
  const f = 300 + Math.random() * 260;
  glide(
    'square',
    [
      [f, 0],
      [f * 1.7, 0.08],
      [f * 1.15, 0.18]
    ],
    0.1
  );
}
