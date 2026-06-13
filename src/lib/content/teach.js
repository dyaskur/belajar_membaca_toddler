/**
 * Teach-phase narration. The intro is composed from clips:
 *   "Kita akan belajar" + <number> + <type word> + "yaitu" + each item (highlighted)
 *   e.g. "Kita akan belajar empat huruf, yaitu" → A → B → C → D
 */

export const SAY_LEARN = 'Kita akan belajar';
export const SAY_YAITU = 'yaitu';

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

/** All teach-phase phrases a level needs — used by the audio generator. */
export function teachTextsForLevel(level) {
  return [SAY_LEARN, SAY_YAITU, typeWord(level), ...Object.values(NUM_WORD)];
}
