import { DEFAULT_VOICE_ID } from '$lib/content/voices.js';
import {
  getLesson,
  lessonsForLevel,
  normalizeTileCount,
  regularLessons,
  MASTERY,
  TILE_COUNT
} from '$lib/content/levels.js';
import { browser } from '$app/environment';

/**
 * @typedef {Object} Profile
 * @property {string} id
 * @property {string} name
 * @property {string} avatar      Emoji used as the kid-facing icon.
 * @property {string} voiceId     Chosen speaker.
 * @property {Record<number, number>} bestScore  levelId -> best fraction (0..1).
 * @property {Record<number, Record<number, number>>} [lessonScore]  levelId -> lessonIndex -> best fraction.
 * @property {string[]} [mesinWords]  Permanently discovered Mesin Kata words.
 * @property {number} unlockedLevel  Highest level the child may enter.
 * @property {number} [quizTileCount] Parent-selected answer choice count (3..6).
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
    return this.profiles.find((profile) => profile.id === this.activeId) ?? null;
  }

  get quizTileCount() {
    return normalizeTileCount(this.active?.quizTileCount);
  }

  get mesinWords() {
    return this.active?.mesinWords ?? [];
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
      quizTileCount: TILE_COUNT,
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

  /** @param {string} avatar */
  setAvatar(avatar) {
    if (this.active) {
      this.active.avatar = avatar;
      this.#persist();
    }
  }

  /** @param {number} count */
  setQuizTileCount(count) {
    if (this.active) {
      this.active.quizTileCount = normalizeTileCount(count);
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

  /** All regular (teachable) lessons in the level passed. @param {number} levelId */
  allLessonsPassed(levelId) {
    const regs = regularLessons(levelId);
    return regs.length > 0 && regs.every((l) => this.isLessonPassed(levelId, l.index));
  }

  /**
   * Unlock rules:
   *  - regular lessons & the placement test: open by default (level must be unlocked)
   *  - final exam: open once every regular lesson is passed
   * @param {number} levelId @param {number} index
   */
  isLessonUnlocked(levelId, index) {
    const p = this.active;
    if (!p) return false;
    if (this.unlockAll) return true;
    if (levelId > p.unlockedLevel) return false;
    const lesson = getLesson(levelId, index);
    if (lesson?.exam) return this.allLessonsPassed(levelId);
    return true; // regular lessons + placement test
  }

  /** Level is "complete" once its final exam is passed. @param {number} levelId */
  isLevelComplete(levelId) {
    const ls = lessonsForLevel(levelId);
    return ls.some((l) => l.exam && this.isLessonPassed(levelId, l.index));
  }

  /**
   * Level progress (0..1): 70% from lessons completed + 30% from the best final-exam score.
   * @param {number} levelId
   */
  levelProgress(levelId) {
    const regs = regularLessons(levelId);
    const lessonFrac = regs.length
      ? regs.filter((l) => this.isLessonPassed(levelId, l.index)).length / regs.length
      : 0;
    const exam = lessonsForLevel(levelId).find((l) => l.exam);
    const examScore = exam ? this.lessonBest(levelId, exam.index) : 0;
    return 0.7 * lessonFrac + 0.3 * examScore;
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
    p.bestScore[levelId] = Math.max(p.bestScore[levelId] ?? 0, score);
    // Only passing the FINAL EXAM unlocks the next level. (The placement test stars the
    // individual lessons it covers; lessons themselves don't unlock the next level.)
    const lesson = getLesson(levelId, index);
    if (passed && lesson?.exam && levelId + 1 > p.unlockedLevel) {
      p.unlockedLevel = levelId + 1;
    }
    this.#persist();
  }

  /** @param {string} word */
  addMesinWord(word) {
    const p = this.active;
    if (!p) return false;
    p.mesinWords ??= [];
    if (p.mesinWords.includes(word)) return false;
    p.mesinWords.push(word);
    this.#persist();
    return true;
  }
}

export const profiles = new ProfileStore();
