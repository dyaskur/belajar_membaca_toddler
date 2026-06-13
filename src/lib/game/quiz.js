import {
  getLevel,
  lessonsForLevel,
  ROUND_SIZE,
  LESSON_ROUND_SIZE,
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
 * look/sound similar (share a first letter or length).
 * @param {Item} target @param {Item[]} pool @returns {Question}
 */
function makeQuestion(target, pool) {
  const others = pool.filter((i) => i.id !== target.id);
  const similar = others.filter(
    (i) => i.text[0] === target.text[0] || i.text.length === target.text.length
  );
  const from = similar.length >= TILE_COUNT - 1 ? similar : others;
  const distractors = shuffle(from).slice(0, TILE_COUNT - 1);
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
 * @returns {Question[]}
 */
export function buildLessonRound(levelId, lessonIndex) {
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

  return targets.map((target) => makeQuestion(target, allItems));
}
