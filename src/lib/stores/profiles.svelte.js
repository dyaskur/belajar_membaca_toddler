import { DEFAULT_VOICE_ID } from '$lib/content/voices.js';
import { browser } from '$app/environment';

/**
 * @typedef {Object} Profile
 * @property {string} id
 * @property {string} name
 * @property {string} avatar      Emoji used as the kid-facing icon.
 * @property {string} voiceId     Chosen speaker.
 * @property {Record<number, number>} bestScore  levelId -> best fraction (0..1).
 * @property {number} unlockedLevel  Highest level the child may enter.
 */

const KEY = 'klm.profiles.v1';
const ACTIVE_KEY = 'klm.activeProfile.v1';

function uuid() {
  // crypto.randomUUID() only exists in secure contexts (HTTPS / localhost),
  // so it is undefined when the app is served over plain HTTP on a LAN IP.
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
  });
}

function load() {
  if (!browser) return [];
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? '[]');
  } catch {
    return [];
  }
}

class ProfileStore {
  /** @type {Profile[]} */
  profiles = $state(load());
  /** @type {string|null} */
  activeId = $state(browser ? localStorage.getItem(ACTIVE_KEY) : null);

  get active() {
    return this.profiles.find((p) => p.id === this.activeId) ?? null;
  }

  #persist() {
    if (!browser) return;
    localStorage.setItem(KEY, JSON.stringify(this.profiles));
    if (this.activeId) localStorage.setItem(ACTIVE_KEY, this.activeId);
  }

  /** @param {string} name @param {string} avatar */
  add(name, avatar) {
    /** @type {Profile} */
    const p = {
      id: uuid(),
      name,
      avatar,
      voiceId: DEFAULT_VOICE_ID,
      bestScore: {},
      unlockedLevel: 1
    };
    this.profiles.push(p);
    this.activeId = p.id;
    this.#persist();
    return p;
  }

  /** @param {string} id */
  select(id) {
    this.activeId = id;
    this.#persist();
  }

  /** @param {string} id */
  remove(id) {
    this.profiles = this.profiles.filter((p) => p.id !== id);
    if (this.activeId === id) this.activeId = this.profiles[0]?.id ?? null;
    this.#persist();
  }

  /** @param {string} voiceId */
  setVoice(voiceId) {
    if (this.active) {
      this.active.voiceId = voiceId;
      this.#persist();
    }
  }

  /** @param {number} levelId @param {number} score fraction 0..1 @param {boolean} passed */
  recordResult(levelId, score, passed) {
    const p = this.active;
    if (!p) return;
    p.bestScore[levelId] = Math.max(p.bestScore[levelId] ?? 0, score);
    if (passed && levelId + 1 > p.unlockedLevel) p.unlockedLevel = levelId + 1;
    this.#persist();
  }
}

export const profiles = new ProfileStore();
