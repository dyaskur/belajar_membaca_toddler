/**
 * Teach-phase narration. The intro sentence is ONE clip (so it sounds natural, no gaps):
 *   "Kita akan belajar empat huruf, yaitu" → then each item, lit up as it's spoken.
 */
import { lessonsForLevel } from './levels.js';

/** Indonesian number words for lesson sizes. */
export const NUM_WORD = /** @type {Record<number, string>} */ ({
  2: 'dua',
  3: 'tiga',
  4: 'empat',
  5: 'lima',
  6: 'enam'
});

/** What the items in a level are called, for the intro sentence. */
export const TYPE_WORD = /** @type {Record<number, string>} */ ({
  1: 'huruf',
  2: 'suku kata',
  3: 'kata',
  4: 'suku kata',
  5: 'bunyi',
  6: 'kalimat'
});

/** @param {number} level @returns {string} */
export function typeWord(level) {
  return TYPE_WORD[level] ?? 'huruf';
}

/**
 * The full intro sentence for a lesson of `count` items — synthesized as a single clip.
 * @param {number} level @param {number} count
 */
export function introText(level, count) {
  const num = NUM_WORD[count];
  return num
    ? `Kita akan belajar ${num} ${typeWord(level)}, yaitu`
    : `Kita akan belajar ${typeWord(level)}, yaitu`;
}

/** All intro sentences a level needs (one per distinct lesson size) — for the generator. */
export function teachTextsForLevel(level) {
  const counts = new Set(lessonsForLevel(level).filter((l) => !l.exam).map((l) => l.items.length));
  return [...counts].map((c) => introText(level, c));
}
