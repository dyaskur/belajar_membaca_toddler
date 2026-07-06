import {
  getLevel,
  lessonsForLevel,
  ROUND_SIZE,
  LESSON_ROUND_SIZE,
  EXAM_SIZE,
  EXAM_TILE_COUNT,
  TILE_COUNT
} from '$lib/content/levels.js';

/** @param {number} n */
export function randInt(n) {
  return Math.floor(Math.random() * n);
}

/** @template T @param {T[]} arr */
export function shuffle(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = randInt(i + 1);
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** @template T @param {T[]} arr */
export function pick(arr) {
  return arr[randInt(arr.length)];
}

/**
 * @typedef {import('$lib/content/levels.js').Item} Item
 * @typedef {{ target: Item, tiles: Item[] }} Question
 */

/**
 * Make one question: a target plus distractors drawn from `pool`, preferring items that
 * look/sound similar (share a first letter or length). At least one distractor shares
 * the target's first letter when the pool has one (asking "ba" always offers one of
 * be/bi/bu/bo), so the child must read past the first letter.
 * @param {Item} target @param {Item[]} pool @param {number} [tiles] @returns {Question}
 */
export function makeQuestion(target, pool, tiles = TILE_COUNT) {
  const others = pool.filter((i) => i.id !== target.id);
  const sameLetter = others.filter((i) => i.text[0] === target.text[0]);
  /** @type {Item[]} */
  const distractors = [];
  if (sameLetter.length) distractors.push(pick(sameLetter));
  const similar = others.filter(
    (i) => i.text[0] === target.text[0] || i.text.length === target.text.length
  );
  const from = similar.length >= tiles - 1 ? similar : others;
  for (const item of shuffle(from)) {
    if (distractors.length >= tiles - 1) break;
    if (!distractors.includes(item)) distractors.push(item);
  }
  // Top up from the whole pool if the preferred pool ran short (tiny lessons).
  for (const item of shuffle(others)) {
    if (distractors.length >= tiles - 1) break;
    if (!distractors.includes(item)) distractors.push(item);
  }
  return { target, tiles: shuffle([target, ...distractors]) };
}

/**
 * Build a round of questions for a whole level (flat mode). Distractors come from the
 * same level.
 * @param {number} levelId
 * @returns {Question[]}
 */
export function buildRound(levelId) {
  const level = getLevel(levelId);
  if (!level) return [];
  const items = level.items();
  const targets = shuffle(items).slice(0, Math.min(ROUND_SIZE, items.length));
  return targets.map((target) => makeQuestion(target, items));
}

/**
 * Build a lesson's practice round (course mode): ~70% questions from this lesson's new
 * items, ~30% review from earlier lessons in the level. Distractors are drawn from the
 * whole level so wrong options stay plausible.
 * @param {number} levelId
 * @param {number} lessonIndex
 * @param {{ tiles?: number }} [opts]
 * @returns {Question[]}
 */
export function buildLessonRound(levelId, lessonIndex, { tiles = TILE_COUNT } = {}) {
  const level = getLevel(levelId);
  const lessons = lessonsForLevel(levelId);
  const lesson = lessons[lessonIndex];
  if (!level || !lesson) return [];

  const newItems = lesson.items;
  const reviewItems = lessons.slice(0, lessonIndex).flatMap((l) => l.items);
  const allItems = level.items();

  const total = Math.min(LESSON_ROUND_SIZE, Math.max(newItems.length, 4) + reviewItems.length);
  const reviewCount = reviewItems.length ? Math.round(total * 0.3) : 0;
  const newCount = total - reviewCount;

  /** @param {Item[]} src @param {number} n */
  const drawTargets = (src, n) => {
    /** @type {Item[]} */
    const out = [];
    while (out.length < n && src.length) {
      // Reshuffle each pass so we can repeat items when a pool is smaller than n.
      for (const it of shuffle(src)) {
        if (out.length >= n) break;
        out.push(it);
      }
    }
    return out;
  };

  const targets = shuffle([
    ...drawTargets(newItems, newCount),
    ...drawTargets(reviewItems, reviewCount)
  ]);

  return targets.map((target) => makeQuestion(target, allItems, tiles));
}

/**
 * Test round (placement / final exam): one question per item across the whole level
 * (up to EXAM_SIZE), shuffled. The final exam uses more tiles (harder).
 * @param {number} levelId
 * @param {{ tiles?: number, size?: number }} [opts]
 * @returns {Question[]}
 */
export function buildExamRound(levelId, { tiles = TILE_COUNT, size = EXAM_SIZE } = {}) {
  const level = getLevel(levelId);
  if (!level) return [];
  const items = level.items();
  const targets = shuffle(items).slice(0, Math.min(items.length, size));
  return targets.map((target) => makeQuestion(target, items, tiles));
}

/** Tile count for the harder final exam. */
export const FINAL_EXAM_TILES = EXAM_TILE_COUNT;

/**
 * Placement round: include WHOLE lessons (shuffled) up to ~max questions, so each covered
 * lesson is fully tested and can be starred. Capped at EXAM_SIZE (~26) rather than testing
 * every item of a big level. Level 1 (26 items) covers everything.
 * @param {number} levelId
 * @param {number | { max?: number, tiles?: number }} [opts]
 * @returns {Question[]}
 */
export function buildPlacementRound(levelId, opts = {}) {
  const { max = EXAM_SIZE, tiles = TILE_COUNT } = typeof opts === 'number' ? { max: opts } : opts;
  const level = getLevel(levelId);
  if (!level) return [];
  const allItems = level.items();
  const lessons = lessonsForLevel(levelId).filter((l) => !l.exam && !l.placement);
  /** @type {Item[]} */
  const chosen = [];
  for (const l of shuffle(lessons)) {
    if (chosen.length > 0 && chosen.length + l.items.length > max) break;
    chosen.push(...l.items);
    if (chosen.length >= max) break;
  }
  return shuffle(chosen).map((target) => makeQuestion(target, allItems, tiles));
}
