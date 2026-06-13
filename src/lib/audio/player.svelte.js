import { browser } from '$app/environment';
import { base } from '$app/paths';
import { variantStem, audioPathStem } from './slug.js';
import { getVoice } from '$lib/content/voices.js';

/**
 * Audio cache version. Bump this whenever clips are regenerated so the service worker /
 * browser fetch the new audio instead of serving stale clips by filename.
 */
const AUDIO_V = 'v=7';

/**
 * Plays pre-generated clips when available, otherwise falls back to the browser's
 * speech synthesis (so the app works before audio is generated, and as a safety net).
 *
 * A clip is considered "available" if the per-level manifest lists it. Manifests are
 * fetched lazily on level entry (see ensureLevel) and cached by the service worker.
 */
class AudioPlayer {
  /** voiceId -> level -> Set<slug> */
  #manifest = $state(/** @type {Record<string, Record<number, Set<string>>>} */ ({}));
  /** @type {HTMLAudioElement|null} */
  #el = null;
  /** Bumped on every stop()/speak() so stale sequences abandon themselves. */
  #epoch = 0;
  /** Resolver for the in-flight playback, so stop() can settle it immediately. */
  #onStop = /** @type {((ok: boolean) => void) | null} */ (null);
  speaking = $state(false);
  muted = $state(false);

  #audio() {
    if (!this.#el && browser) this.#el = new Audio();
    return this.#el;
  }

  /**
   * Fetch the manifest for (voice, level) and warm the cache. Safe to call repeatedly.
   * @param {string} voiceId @param {number} level
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
        // Warm the HTTP cache so playback is instant + offline thereafter.
        for (const stem of set) {
          fetch(`${base}/audio/${voiceId}/${level}/${stem}.mp3?${AUDIO_V}`).catch(() => {});
        }
        return;
      }
    } catch {
      /* offline or not generated yet — fall through to speech synthesis */
    }
    // Mark as "checked but empty" so we don't refetch every time.
    this.#manifest[voiceId] ??= {};
    this.#manifest[voiceId][level] = new Set();
  }

  /** Background prefetch of the next level's pack. @param {string} voiceId @param {number} level */
  prefetchNext(voiceId, level) {
    this.ensureLevel(voiceId, level + 1).catch(() => {});
  }

  /**
   * How many generated variants exist for a target (0 if none — fallback voice).
   * @param {string} voiceId @param {number} level @param {string} text
   */
  variantCount(voiceId, level, text) {
    const set = this.#manifest[voiceId]?.[level];
    if (!set) return 0;
    let n = 0;
    while (set.has(variantStem(text, n))) n++;
    return n;
  }

  /**
   * @param {string} voiceId
   * @param {number} level
   * @param {string} text
   * @param {number} [variant] which rendering (0 = normal, 1 = slow/clear, ...)
   * @returns {Promise<void>}
   */
  async speak(voiceId, level, text, variant = 0) {
    if (!browser || this.muted) return;
    this.stop(); // interrupt anything playing + invalidate older sequences
    const epoch = this.#epoch;
    // Try the generated file DIRECTLY (don't gate on the manifest — a stale/missing
    // manifest must never cause silence). Fall back: requested variant -> base variant
    // -> browser speech synthesis. Bail out the moment a newer speak()/stop() supersedes us.
    const urls = [this.#url(voiceId, level, variantStem(text, variant))];
    if (variant !== 0) urls.push(this.#url(voiceId, level, variantStem(text, 0)));
    for (const src of urls) {
      if (this.#epoch !== epoch) return;
      const ok = await this.#tryPlayFile(src);
      if (this.#epoch !== epoch) return;
      if (ok) return;
    }
    if (this.#epoch !== epoch) return;
    return this.#speakSynth(text, voiceId);
  }

  /** @param {string} voiceId @param {number} level @param {string} stem */
  #url(voiceId, level, stem) {
    return `${base}${audioPathStem(voiceId, level, stem)}?${AUDIO_V}`;
  }

  /**
   * Play one file. Resolves true if it played to the end, false on 404 / decode / play error.
   * @param {string} src
   * @returns {Promise<boolean>}
   */
  #tryPlayFile(src) {
    const el = this.#audio();
    if (!el) return Promise.resolve(false);
    return new Promise((resolve) => {
      let settled = false;
      const finish = (/** @type {boolean} */ ok) => {
        if (settled) return;
        settled = true;
        if (this.#onStop === finish) this.#onStop = null;
        el.onended = null;
        el.onerror = null;
        this.speaking = false;
        resolve(ok);
      };
      this.#onStop = finish; // stop() resolves this immediately (as not-ok)
      el.onended = () => finish(true);
      el.onerror = () => finish(false);
      el.src = src;
      this.speaking = true;
      el.play().catch(() => finish(false));
    });
  }

  /** @param {string} text @param {string} voiceId */
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
      const u = new SpeechSynthesisUtterance(text);
      u.lang = 'id-ID';
      u.rate = 0.85;
      const v = getVoice(voiceId);
      // Nudge pitch by gender so the fallback voices feel a little distinct.
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
    if (this.#el) {
      this.#el.pause();
      this.#el.onended = null;
      this.#el.onerror = null;
      try {
        this.#el.currentTime = 0;
      } catch {
        /* ignore */
      }
    }
    this.speaking = false;
    if (onStop) onStop(false); // settle the pending playback promise so its sequence bails
  }
}

export const player = new AudioPlayer();
