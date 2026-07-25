import { DEFAULT_VOICE_ID } from '$lib/content/voices.js';
import { normalizeAgeBand, quizTileCountForAge, unlockedLevelForAge } from '$lib/content/profile-options.js';
import {
  getLesson,
  isPackUnlocked,
  lessonsForLevel,
  normalizeTileCount,
  prerequisitesForLevel,
  regularLessons,
  MASTERY,
  TILE_COUNT
} from '$lib/content/levels.js';
import { browser } from '$app/environment';
import { profileLevelComplete } from '$lib/content/progress.js';
import {
  BONUS_POOL,
  LESSON_STICKER,
  getSticker
} from '$lib/content/stickers.js';

/**
 * @typedef {Object} Profile
 * @property {string} id
 * @property {string} name
 * @property {string} avatar      Emoji used as the kid-facing icon.
 * @property {string} voiceId     Chosen speaker.
 * @property {'<=4'|'5'|'6'} [ageBand] Age band picked during profile creation.
 * @property {Record<number, number>} bestScore  levelId -> best fraction (0..1).
 * @property {Record<number, Record<number, number>>} [lessonScore]  levelId -> lessonIndex -> best fraction.
 * @property {string[]} [mesinWords] Found words from Mesin Kata.
 * @property {string[]} [stickers] Sticker ids in earn order, without duplicates.
 * @property {number} [stickersSeen] Sticker count at the most recent album visit.
 * @property {number} unlockedLevel  Immutable starting pack baseline (legacy field name).
 * @property {number} [quizTileCount] Parent-selected answer choice count (3..6).
 * @property {boolean} [lockAfterAnswer] Parent toggle: lock the tiles during answer
 *   feedback so the child hears the correction/praise before tapping again. Default on.
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
    const data = JSON.parse(localStorage.getItem(KEY) ?? '[]');
    // Normalize legacy profiles
    for (const p of data) {
      p.mesinWords ??= [];
      p.unlockedLevel ??= 1;
    }
    return data;
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

  /** Whether tiles lock during answer feedback (default on for existing profiles too). */
  get lockTiles() {
    return this.active?.lockAfterAnswer ?? true;
  }

  get mesinWords() {
    if (!this.active) return [];
    return this.active.mesinWords ?? [];
  }

  get stickers() {
    return this.active?.stickers ?? [];
  }

  get newStickerCount() {
    return Math.max(0, this.stickers.length - (this.active?.stickersSeen ?? 0));
  }

  /** @param {string} id */
  hasSticker(id) {
    return this.stickers.includes(id);
  }

  /** @param {string} w */
  addMesinWord(w) {
    if (!this.active) return false;
    this.active.mesinWords ??= [];
    if (this.active.mesinWords.includes(w)) return false;
    this.active.mesinWords.push(w);
    this.#persist();
    return true;
  }

  #persist() {
    if (!browser) return;
    localStorage.setItem(KEY, JSON.stringify(this.profiles));
    if (this.activeId) localStorage.setItem(ACTIVE_KEY, this.activeId);
    else localStorage.removeItem(ACTIVE_KEY);
  }

  /**
   * @param {string} name
   * @param {string} avatar
   * @param {string} [voiceId]
   * @param {{ ageBand?: '<=4'|'5'|'6', quizTileCount?: number, unlockedLevel?: number }} [opts]
   */
  add(name, avatar, voiceId = DEFAULT_VOICE_ID, opts = {}) {
    const ageBand = opts.ageBand ? normalizeAgeBand(opts.ageBand) : null;
    const requestedUnlockedLevel = Number(opts.unlockedLevel);
    const unlockedLevel = Number.isFinite(requestedUnlockedLevel)
      ? Math.max(1, Math.floor(requestedUnlockedLevel))
      : ageBand
        ? unlockedLevelForAge(ageBand)
        : 1;
    /** @type {Profile} */
    const p = {
      id: uuid(),
      name,
      avatar,
      voiceId,
      quizTileCount: normalizeTileCount(opts.quizTileCount, ageBand ? quizTileCountForAge(ageBand) : TILE_COUNT),
      bestScore: {},
      lessonScore: {},
      mesinWords: [],
      stickers: [],
      stickersSeen: 0,
      unlockedLevel,
      lockAfterAnswer: true
    };
    if (ageBand) p.ageBand = ageBand;
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

  /** @param {boolean} v */
  setLockTiles(v) {
    if (this.active) {
      this.active.lockAfterAnswer = v;
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
    const p = this.active;
    if (!p) return false;
    return isPackUnlocked(
      levelId,
      p.unlockedLevel ?? 1,
      (id) => this.isLevelComplete(id),
      this.unlockAll
    );
  }

  /** Incomplete graph prerequisites for a locked pack. @param {number} levelId */
  missingPrerequisites(levelId) {
    if (this.isLevelUnlocked(levelId)) return [];
    return prerequisitesForLevel(levelId).filter((id) => !this.isLevelComplete(id));
  }

  /** @param {number} levelId @param {number} score fraction 0..1 @param {boolean} passed */
  recordResult(levelId, score, passed) {
    const p = this.active;
    if (!p) return;
    p.bestScore[levelId] = Math.max(p.bestScore[levelId] ?? 0, score);
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
    if (!this.isLevelUnlocked(levelId)) return false;
    const lesson = getLesson(levelId, index);
    if (lesson?.exam) return this.allLessonsPassed(levelId);
    return true; // regular lessons + placement test
  }

  /** Level is "complete" once its final exam is passed. @param {number} levelId */
  isLevelComplete(levelId) {
    return this.isLevelCompleteFor(this.active, levelId);
  }

  /** @param {Profile|null|undefined} profile @param {number} levelId */
  isLevelCompleteFor(profile, levelId) {
    return profileLevelComplete(profile, levelId);
  }

  /** Number of completed course nodes; sentence-pack progress is intentionally ignored. @param {Profile|null} [profile] */
  completedLevelCount(profile = this.active) {
    if (!profile) return 0;
    return [1, 2, 4, 5, 7, 3, 8, 9].filter((id) => this.isLevelCompleteFor(profile, id)).length;
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
    this.#persist();
  }

  /** @param {number} levelId @param {number} lessonIndex */
  awardLessonSticker(levelId, lessonIndex) {
    const key = `${levelId}-${lessonIndex}`;
    const id = LESSON_STICKER[key];
    if (!id) {
      if (import.meta.env.DEV) console.warn(`[stiker] Belum ada stiker untuk pelajaran ${key}`);
      return null;
    }
    return this.#awardSticker(id);
  }

  /** @param {number} levelId */
  awardTrophy(levelId) {
    return this.#awardSticker(`trofi-${levelId}`);
  }

  awardBonusSticker() {
    const available = BONUS_POOL.filter((sticker) => !this.hasSticker(sticker.id));
    if (!available.length) return null;
    return this.#awardSticker(available[Math.floor(Math.random() * available.length)].id);
  }

  markStickersSeen() {
    if (!this.active) return;
    this.active.stickersSeen = this.stickers.length;
    this.#persist();
  }

  /** @param {string} id */
  #awardSticker(id) {
    const p = this.active;
    const sticker = getSticker(id);
    if (!p || !sticker) return null;
    p.stickers ??= [];
    if (p.stickers.includes(id)) return null;
    p.stickers.push(id);
    this.#persist();
    return sticker;
  }
}

export const profiles = new ProfileStore();
