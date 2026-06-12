import { browser } from '$app/environment';
import { variantStem, audioPathStem } from './slug.js';
import { getVoice } from '$lib/content/voices.js';

/**
 * Audio cache version. Bump this whenever clips are regenerated so the service worker /
 * browser fetch the new audio instead of serving stale clips by filename.
 */
const AUDIO_V = 'v=4';

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
      const res = await fetch(`/audio/${voiceId}/${level}/pack.json?${AUDIO_V}`);
      if (res.ok) {
        /** @type {{ files: string[] }} */
        const data = await res.json();
        const set = new Set(data.files ?? []);
        this.#manifest[voiceId] ??= {};
        this.#manifest[voiceId][level] = set;
        // Warm the HTTP cache so playback is instant + offline thereafter.
        for (const stem of set) {
          fetch(`/audio/${voiceId}/${level}/${stem}.mp3?${AUDIO_V}`).catch(() => {});
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
    this.stop();
    const set = this.#manifest[voiceId]?.[level];
    let stem = variantStem(text, variant);
    if (set && !set.has(stem)) stem = variantStem(text, 0); // fall back to base variant
    if (set?.has(stem)) {
      return this.#playFile(`${audioPathStem(voiceId, level, stem)}?${AUDIO_V}`);
    }
    return this.#speakSynth(text, voiceId);
  }

  /** @param {string} src */
  #playFile(src) {
    const el = this.#audio();
    if (!el) return Promise.resolve();
    return new Promise((resolve) => {
      el.src = src;
      this.speaking = true;
      el.onended = () => {
        this.speaking = false;
        resolve();
      };
      el.onerror = () => {
        this.speaking = false;
        resolve();
      };
      el.play().catch(() => {
        this.speaking = false;
        resolve();
      });
    });
  }

  /** @param {string} text @param {string} voiceId */
  #speakSynth(text, voiceId) {
    if (!('speechSynthesis' in window)) return Promise.resolve();
    return new Promise((resolve) => {
      const u = new SpeechSynthesisUtterance(text);
      u.lang = 'id-ID';
      u.rate = 0.85;
      const v = getVoice(voiceId);
      // Nudge pitch by gender so the fallback voices feel a little distinct.
      u.pitch = v.gender === 'male' ? 0.8 : 1.1;
      const idVoice = speechSynthesis.getVoices().find((sv) => sv.lang?.startsWith('id'));
      if (idVoice) u.voice = idVoice;
      this.speaking = true;
      u.onend = () => {
        this.speaking = false;
        resolve();
      };
      u.onerror = () => {
        this.speaking = false;
        resolve();
      };
      speechSynthesis.speak(u);
    });
  }

  stop() {
    if (browser && 'speechSynthesis' in window) speechSynthesis.cancel();
    if (this.#el) {
      this.#el.pause();
      this.#el.currentTime = 0;
    }
    this.speaking = false;
  }
}

export const player = new AudioPlayer();
