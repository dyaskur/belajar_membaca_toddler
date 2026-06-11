import { getLevel, ROUND_SIZE, TILE_COUNT } from '$lib/content/levels.js';

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
 * Build a round of questions for a level. Distractors are other items from the same
 * level, preferring ones that look/sound similar (share a first letter or length).
 * @param {number} levelId
 * @returns {Question[]}
 */
export function buildRound(levelId) {
  const level = getLevel(levelId);
  if (!level) return [];
  const items = level.items();
  const targets = shuffle(items).slice(0, Math.min(ROUND_SIZE, items.length));

  return targets.map((target) => {
    const others = items.filter((i) => i.id !== target.id);
    const similar = others.filter(
      (i) => i.text[0] === target.text[0] || i.text.length === target.text.length
    );
    const pool = similar.length >= TILE_COUNT - 1 ? similar : others;
    const distractors = shuffle(pool).slice(0, TILE_COUNT - 1);
    return { target, tiles: shuffle([target, ...distractors]) };
  });
}
