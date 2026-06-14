import { DEFAULT_VOICE_ID } from '$lib/content/voices.js';
import { lessonCount, MASTERY } from '$lib/content/levels.js';
import { browser } from '$app/environment';

/**
 * @typedef {Object} Profile
 * @property {string} id
 * @property {string} name
 * @property {string} avatar      Emoji used as the kid-facing icon.
 * @property {string} voiceId     Chosen speaker.
 * @property {Record<number, number>} bestScore  levelId -> best fraction (0..1).
 * @property {Record<number, Record<number, number>>} [lessonScore]  levelId -> lessonIndex -> best fraction.
 * @property {number} unlockedLevel  Highest level the child may enter.
 */

const KEY = 'klm.profiles.v1';
const ACTIVE_KEY = 'klm.activeProfile.v1';
const UNLOCK_KEY = 'klm.unlockAll.v1';

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
  /** Testing toggle: open every level & lesson regardless of progress. */
  unlockAll = $state(browser ? localStorage.getItem(UNLOCK_KEY) === '1' : false);

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
      lessonScore: {},
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

  /** Testing: open every level/lesson. @param {boolean} v */
  setUnlockAll(v) {
    this.unlockAll = v;
    if (browser) localStorage.setItem(UNLOCK_KEY, v ? '1' : '0');
  }

  /** @param {number} levelId */
  isLevelUnlocked(levelId) {
    if (this.unlockAll) return true;
    return levelId <= (this.active?.unlockedLevel ?? 1);
  }

  /** @param {number} levelId @param {number} score fraction 0..1 @param {boolean} passed */
  recordResult(levelId, score, passed) {
    const p = this.active;
    if (!p) return;
    p.bestScore[levelId] = Math.max(p.bestScore[levelId] ?? 0, score);
    if (passed && levelId + 1 > p.unlockedLevel) p.unlockedLevel = levelId + 1;
    this.#persist();
  }

  // --- Course mode: per-lesson progress ------------------------------------

  /** Best fraction for a lesson (0 if never passed). @param {number} levelId @param {number} index */
  lessonBest(levelId, index) {
    return this.active?.lessonScore?.[levelId]?.[index] ?? 0;
  }

  /** @param {number} levelId @param {number} index */
  isLessonPassed(levelId, index) {
    return this.lessonBest(levelId, index) >= MASTERY;
  }

  /** A lesson is playable if its level is unlocked and it's the first or follows a pass. */
  /** @param {number} levelId @param {number} index */
  isLessonUnlocked(levelId, index) {
    const p = this.active;
    if (!p) return false;
    if (this.unlockAll) return true;
    if (levelId > p.unlockedLevel) return false;
    return index === 0 || this.isLessonPassed(levelId, index - 1);
  }

  /** Every lesson in the level passed. @param {number} levelId */
  isLevelComplete(levelId) {
    const n = lessonCount(levelId);
    if (!n) return false;
    for (let i = 0; i < n; i++) if (!this.isLessonPassed(levelId, i)) return false;
    return true;
  }

  /**
   * @param {number} levelId @param {number} index @param {number} score @param {boolean} passed
   */
  recordLessonResult(levelId, index, score, passed) {
    const p = this.active;
    if (!p) return;
    p.lessonScore ??= {};
    p.lessonScore[levelId] ??= {};
    p.lessonScore[levelId][index] = Math.max(p.lessonScore[levelId][index] ?? 0, score);
    // Reflect course progress on the level map (% = lessons passed).
    const n = lessonCount(levelId) || 1;
    let done = 0;
    for (let i = 0; i < n; i++) if (this.isLessonPassed(levelId, i)) done++;
    p.bestScore[levelId] = Math.max(p.bestScore[levelId] ?? 0, done / n);
    // Completing every lesson unlocks the next level.
    if (this.isLevelComplete(levelId) && levelId + 1 > p.unlockedLevel) {
      p.unlockedLevel = levelId + 1;
    }
    this.#persist();
  }
}

export const profiles = new ProfileStore();
