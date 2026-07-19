import { browser } from '$app/environment';
import { base } from '$app/paths';
import { variantStem, audioPathStem } from './slug.js';
import { getVoice } from '$lib/content/voices.js';
import { spokenFor } from '$lib/content/pronunciation.js';

/**
 * Audio cache version. Bump whenever clips are regenerated so the service worker /
 * browser fetch the new audio instead of serving stale clips by filename.
 */
const AUDIO_V = 'v=22';

/**
 * Find the non-silent region of a decoded clip so we can play just that part and avoid
 * the leading/trailing silence TTS bakes in (which is the main gap between clips).
 * @param {AudioBuffer} buffer
 * @returns {{ startSec: number, durSec: number }}
 */
function trimBounds(buffer) {
  const data = buffer.getChannelData(0);
  const n = data.length;
  const thr = 0.008; // ~ -42 dB
  let s = 0;
  while (s < n && Math.abs(data[s]) < thr) s++;
  let e = n;
  while (e > s && Math.abs(data[e - 1]) < thr) e--;
  if (e <= s) return { startSec: 0, durSec: buffer.duration }; // all quiet — play whole
  const pad = Math.floor(buffer.sampleRate * 0.012); // keep 12ms either side
  s = Math.max(0, s - pad);
  e = Math.min(n, e + pad);
  return { startSec: s / buffer.sampleRate, durSec: Math.max(0.02, (e - s) / buffer.sampleRate) };
}

/**
 * Plays pre-generated clips via the Web Audio API (low-latency, silence-trimmed for
 * gapless sequences). Falls back to browser speech synthesis when a clip is missing.
 */
class AudioPlayer {
  /** voiceId -> level (number, or a string bucket like 'words'/'abjad') -> Set<slug> */
  #manifest = $state(/** @type {Record<string, Record<string|number, Set<string>>>} */ ({}));
  /** @type {AudioContext|null} */
  #ctx = null;
  /** url -> decoded clip + trimmed bounds */
  #cache = new Map();
  /** @type {AudioBufferSourceNode|null} */
  #node = null;
  /** Bumped on every stop()/speak() so stale sequences abandon themselves. */
  #epoch = 0;
  /** Resolver for the in-flight playback, so stop() can settle it immediately. */
  #onStop = /** @type {((ok: boolean) => void) | null} */ (null);
  speaking = $state(false);
  muted = $state(false);

  constructor() {
    if (browser) {
      // Unlock/resume the audio context on the first user gesture (iOS Safari needs this).
      const unlock = () => this.#context();
      window.addEventListener('pointerdown', unlock, { once: true });
      window.addEventListener('touchstart', unlock, { once: true });
    }
  }

  #context() {
    if (!browser) return null;
    if (!this.#ctx) {
      const C = window.AudioContext || /** @type {any} */ (window).webkitAudioContext;
      if (!C) return null;
      this.#ctx = new C();
    }
    if (this.#ctx.state === 'suspended') this.#ctx.resume().catch(() => {});
    return this.#ctx;
  }

  /**
   * Fetch the manifest for (voice, level) and warm the cache. Safe to call repeatedly.
   * @param {string} voiceId @param {number|string} level
   */
  async ensureLevel(voiceId, level) {
    if (!browser) return;
    if (this.#manifest[voiceId]?.[level]) return;
    try {
      const res = await fetch(`${base}/audio/${voiceId}/${level}/pack.json?${AUDIO_V}`);
      if (res.ok) {
        /** @type {{ files: string[] }} */
        const data = await res.json();
        const set = new Set(data.files ?? []);
        this.#manifest[voiceId] ??= {};
        this.#manifest[voiceId][level] = set;
        for (const stem of set) {
          fetch(`${base}/audio/${voiceId}/${level}/${stem}.mp3?${AUDIO_V}`).catch(() => {});
        }
        return;
      }
      if (res.status === 404) {
        this.#manifest[voiceId] ??= {};
        this.#manifest[voiceId][level] = new Set();
      }
      return;
    } catch {
      /* transient fetch failure — leave unset so a later ensureLevel can retry */
    }
  }

  /** Background prefetch of the next level's pack. @param {string} voiceId @param {number} level */
  prefetchNext(voiceId, level) {
    this.ensureLevel(voiceId, level + 1).catch(() => {});
  }

  /**
   * How many generated variants exist for a target (0 if none — fallback voice).
   * @param {string} voiceId @param {number|string} level @param {string} text
   */
  variantCount(voiceId, level, text) {
    const set = this.#manifest[voiceId]?.[level];
    if (!set) return 0;
    let n = 0;
    while (set.has(variantStem(text, n))) n++;
    return n;
  }

  /**
   * @param {string} voiceId @param {number|string} level @param {string} text
   * @param {number} [variant] 0 = normal, 1 = slow/clear, ...
   * @returns {Promise<void>}
   */
  async speak(voiceId, level, text, variant = 0) {
    if (!browser || this.muted) return;
    this.stop();
    const epoch = this.#epoch;
    const stems = [variantStem(text, variant)];
    if (variant !== 0) stems.push(variantStem(text, 0));
    const knownFiles = this.#manifest[voiceId]?.[level];
    const urls = stems
      .filter((stem) => !knownFiles || knownFiles.has(stem))
      .map((stem) => this.#url(voiceId, level, stem));
    for (const src of urls) {
      if (this.#epoch !== epoch) return;
      const ok = await this.#tryPlay(src, epoch);
      if (this.#epoch !== epoch) return;
      if (ok) return;
    }
    if (this.#epoch !== epoch) return;
    return this.#speakSynth(text, voiceId);
  }

  /** @param {string} voiceId @param {number|string} level @param {string} stem */
  #url(voiceId, level, stem) {
    return `${base}${audioPathStem(voiceId, level, stem)}?${AUDIO_V}`;
  }

  /** Fetch + decode a clip (cached). @param {string} src */
  async #load(src) {
    const hit = this.#cache.get(src);
    if (hit) return hit;
    const ctx = this.#context();
    if (!ctx) return null;
    const res = await fetch(src);
    if (!res.ok) return null;
    const arr = await res.arrayBuffer();
    const buffer = await ctx.decodeAudioData(arr);
    const entry = { buffer, ...trimBounds(buffer) };
    this.#cache.set(src, entry);
    return entry;
  }

  /**
   * Play one clip's non-silent region. Resolves true if it played, false on miss/error.
   * @param {string} src @param {number} epoch
   * @returns {Promise<boolean>}
   */
  async #tryPlay(src, epoch) {
    let entry;
    try {
      entry = await this.#load(src);
    } catch {
      return false;
    }
    if (!entry || this.#epoch !== epoch) return false;
    const ctx = this.#context();
    if (!ctx) return false;
    return new Promise((resolve) => {
      let settled = false;
      const finish = (/** @type {boolean} */ ok) => {
        if (settled) return;
        settled = true;
        if (this.#onStop === finish) this.#onStop = null;
        if (this.#node === node) this.#node = null;
        this.speaking = false;
        resolve(ok);
      };
      const node = ctx.createBufferSource();
      node.buffer = entry.buffer;
      node.connect(ctx.destination);
      node.onended = () => finish(true);
      this.#node = node;
      this.#onStop = () => {
        try {
          node.onended = null;
          node.stop();
        } catch {
          /* already stopped */
        }
        finish(false);
      };
      this.speaking = true;
      try {
        node.start(0, entry.startSec, entry.durSec);
      } catch {
        finish(false);
      }
    });
  }

  /** @param {string} text @param {string} voiceId @returns {Promise<void>} */
  #speakSynth(text, voiceId) {
    if (!('speechSynthesis' in window)) return Promise.resolve();
    return new Promise((resolve) => {
      let settled = false;
      const finish = () => {
        if (settled) return;
        settled = true;
        if (this.#onStop === finish) this.#onStop = null;
        this.speaking = false;
        resolve();
      };
      this.#onStop = () => finish();
      // Apply the same spoken-form overrides the generator uses, so the live fallback
      // voice says e.g. "kur-an"/"yo-yo" instead of spelling the raw word out.
      const u = new SpeechSynthesisUtterance(spokenFor(text));
      u.lang = 'id-ID';
      u.rate = 0.85;
      const v = getVoice(voiceId);
      u.pitch = v.gender === 'male' ? 0.8 : 1.1;
      const idVoice = speechSynthesis.getVoices().find((sv) => sv.lang?.startsWith('id'));
      if (idVoice) u.voice = idVoice;
      this.speaking = true;
      u.onend = finish;
      u.onerror = finish;
      speechSynthesis.speak(u);
    });
  }

  /** Stop all playback now and invalidate any in-flight / queued speak sequence. */
  stop() {
    this.#epoch++;
    const onStop = this.#onStop;
    this.#onStop = null;
    if (browser && 'speechSynthesis' in window) speechSynthesis.cancel();
    if (this.#node) {
      try {
        this.#node.onended = null;
        this.#node.stop();
      } catch {
        /* already stopped */
      }
      this.#node = null;
    }
    this.speaking = false;
    if (onStop) onStop(false);
  }
}

export const player = new AudioPlayer();
