import { DEFAULT_VOICE_ID } from '$lib/content/voices.js';
import { normalizeAgeBand, quizTileCountForAge, unlockedLevelForAge } from '$lib/content/profile-options.js';
import {
  getLesson,
  getNode,
  lessonsForLevel,
  normalizeTileCount,
  regularLessons,
  NODES,
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
 * @property {'<=4'|'5'|'6'} [ageBand] Age band picked during profile creation.
 * @property {Record<number, number>} bestScore  levelId -> best fraction (0..1).
 * @property {Record<number, Record<number, number>>} [lessonScore]  levelId -> lessonIndex -> best fraction.
 * @property {string[]} [mesinWords] Found words from Mesin Kata.
 * @property {number} unlockedLevel  Immutable starting baseline (age head-start): every pack
 *   whose id ≤ this is open from the start. Set once at creation; further unlocking is derived
 *   from the completion graph (see NODES / isLevelUnlocked), never by auto-incrementing this.
 * @property {number} [quizTileCount] Parent-selected answer choice count (3..6).
 * @property {boolean} [lockAfterAnswer] Parent toggle: lock the tiles during answer
 *   feedback so the child hears the correction/praise before tapping again. Default on.
 * @property {number} [pathCelebrated] How many completed path nodes have already had their
 *   arrival celebrated (robot hop + confetti), so a finished node only celebrates once.
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
    for (const p of data) p.mesinWords ??= [];
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

  /**
   * A node/pack is unlocked when it's testing-open, within the age baseline, or every one of its
   * prerequisite packs is complete (their Ujian Akhir passed). The graph is branching, so this
   * replaces the old linear `pack ≤ unlockedLevel` rule. @param {number} pack
   */
  isLevelUnlocked(pack) {
    if (this.unlockAll) return true;
    const node = getNode(pack);
    if (!node) return false;
    if (pack <= (this.active?.unlockedLevel ?? 1)) return true;
    return node.prereqs.every((pre) => this.isLevelComplete(pre));
  }

  /** Alias — the menu speaks in "nodes"; the store keys everything by pack id. @param {number} pack */
  isNodeUnlocked(pack) {
    return this.isLevelUnlocked(pack);
  }

  /**
   * For a locked node, the title of the first prerequisite still not complete — named in the
   * on-screen toast ("Selesaikan {label} dulu"). @param {number} pack
   */
  lockedPrereqLabel(pack) {
    const node = getNode(pack);
    if (!node) return null;
    const pending = node.prereqs.find((pre) => !this.isLevelComplete(pre));
    return pending != null ? getNode(pending)?.title ?? null : null;
  }

  /** Completed nodes (Ujian Akhir passed) for the active profile. */
  get completedNodeCount() {
    return NODES.filter((n) => this.isLevelComplete(n.pack)).length;
  }

  /** Completed nodes already celebrated on the path (robot hop + confetti fires once each). */
  get pathCelebrated() {
    return this.active?.pathCelebrated ?? 0;
  }

  /** Record how many completed nodes have been celebrated. @param {number} n */
  setPathCelebrated(n) {
    if (this.active && n !== this.active.pathCelebrated) {
      this.active.pathCelebrated = n;
      this.#persist();
    }
  }

  /** A specific profile's pack completion (home screen renders every profile, not just active).
   * @param {Profile} p @param {number} pack */
  #isPackCompleteFor(p, pack) {
    const exam = lessonsForLevel(pack).find((l) => l.exam);
    if (!exam) return false;
    return (p.lessonScore?.[pack]?.[exam.index] ?? 0) >= MASTERY;
  }

  /** Completed-node count for any profile by id — drives the home-screen progress label.
   * @param {string} id */
  completedNodeCountFor(id) {
    const p = this.profiles.find((x) => x.id === id);
    if (!p) return 0;
    return NODES.filter((n) => this.#isPackCompleteFor(p, n.pack)).length;
  }

  /** @param {number} levelId @param {number} score fraction 0..1 */
  recordResult(levelId, score) {
    const p = this.active;
    if (!p) return;
    p.bestScore[levelId] = Math.max(p.bestScore[levelId] ?? 0, score);
    // Unlocking is derived from the completion graph — the baseline is never auto-advanced.
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
    // Downstream nodes unlock via the completion graph (isLevelComplete → Ujian Akhir passed);
    // the baseline is never auto-advanced here.
    this.#persist();
  }
}

export const profiles = new ProfileStore();
