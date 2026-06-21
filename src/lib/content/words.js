/**
 * Picture-words for the "Ucapkan!" (read aloud) and "Belajar Menulis" (writing)
 * activities: simple, picturable Indonesian words. The first letter ties to phonics
 * (say "bola" → B).
 *
 * FACELESS RULE (aniconism): every emoji here must be an OBJECT or a faceless picture —
 * no faces of living beings. That rules out animal emoji (🐱🐄🐘🐟🐔🐍🦆🐴 …) and face
 * parts (👁️). Keep new entries to objects/food/plants, and check the same when the
 * optional `img` illustration field is added later.
 *
 * @typedef {{ w: string, e: string }} PictureWord
 */

/** @type {PictureWord[]} */
export const PICTURE_WORDS = [
  { w: 'bola', e: '⚽' },
  { w: 'buku', e: '📖' },
  { w: 'topi', e: '👒' },
  { w: 'pisang', e: '🍌' },
  { w: 'apel', e: '🍎' },
  { w: 'nasi', e: '🍚' },
  { w: 'jeruk', e: '🍊' },
  { w: 'daun', e: '🍃' },
  { w: 'gigi', e: '🦷' },
  { w: 'susu', e: '🥛' },
  { w: 'roti', e: '🍞' },
  { w: 'bunga', e: '🌸' },
  { w: 'mobil', e: '🚗' },
  { w: 'rumah', e: '🏠' },
  { w: 'bintang', e: '⭐' }
];
