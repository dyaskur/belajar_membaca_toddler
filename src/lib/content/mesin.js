import { PICTURE_WORDS } from './words.js';

export const REEL_SETS = [
  {
    a: ['ba', 'pa', 'ma', 'bu', 'sa', 'su', 'lu', 'la'],
    b: ['ju', 'lu', 'ku', 'du', 'ru', 'ka', 'ca', 'ta']
  },
  {
    a: ['bo', 'to', 'ro', 'ko', 'so', 'te', 'pe', 'ta'],
    b: ['la', 'pi', 'ti', 'fa', 'ko', 'da', 'ta', 'ri']
  },
  {
    a: ['ti', 'pi', 'da', 'gi', 'su', 'na', 'bi', 'ki'],
    b: ['su', 'ta', 'du', 'gi', 'si', 'bi', 'ri', 'ya']
  }
];

/** @typedef {{ w: string, e: string, faceSafe: boolean }} MesinPicture */

/** @type {MesinPicture[]} */
export const MESIN_PICTURE = [
  { w: 'bata', e: '🧱', faceSafe: true },
  { w: 'palu', e: '🔨', faceSafe: true },
  { w: 'paku', e: '📌', faceSafe: true },
  { w: 'madu', e: '🍯', faceSafe: true },
  { w: 'kopi', e: '☕', faceSafe: true },
  { w: 'sofa', e: '🛋️', faceSafe: true },
  { w: 'keju', e: '🧀', faceSafe: true },
  { w: 'roda', e: '🛞', faceSafe: true },
  { w: 'teko', e: '🫖', faceSafe: true },
  { w: 'tisu', e: '🧻', faceSafe: true },
  { w: 'pita', e: '🎀', faceSafe: true },
  { w: 'dadu', e: '🎲', faceSafe: true },
  { w: 'peta', e: '🗺️', faceSafe: true },
  { w: 'toko', e: '🏪', faceSafe: true }
];

export const MESIN_WORDS = [
  'maju', 'buka', 'saku', 'satu', 'suka', 'luka', 'laju', 'lalu', 'laku',
  'kota', 'tapi', 'tari', 'peti', 'sori', 'suku',
  'dari', 'tiri', 'kiri', 'kita', 'nabi', 'bibi', 'daya',
  'tepi', 'soda', 'peri', 'tata', 'data', 'dasi', 'sisi',
  'teri', 'baru', 'baca', 'malu', 'mata', 'bulu', 'buru', 'pari'
];

export const UNSAFE_WORDS = [
  'babi', 'gila', 'bego', 'mati', 'puki', 'tahi', 'tai'
];

const ALL_WORDS = new Set([
  ...MESIN_PICTURE.map(x => x.w),
  ...MESIN_WORDS,
  ...PICTURE_WORDS.map(x => x.w)
]);

/** 
 * Returns the word if it's in our safe list, otherwise null (nonsense).
 * @param {string} sylA
 * @param {string} sylB
 */
export function mesinWordFor(sylA, sylB) {
  const w = sylA + sylB;
  return ALL_WORDS.has(w) ? w : null;
}

/** @param {string} w */
export function isPictureWord(w) {
  return MESIN_PICTURE.find(x => x.w === w) || PICTURE_WORDS.find(x => x.w === w);
}

export const MESIN_REAL = [
  'Wow!', 'Hebat!', 'Pintar!', 'Luar biasa!', 'Bagus sekali!'
];

export const MESIN_FUNNY = [
  'Hihihi, lucu ya!', 'Kata apa itu?', 'Aneh sekali!'
];

/** All strings that need to be generated for the `mesin` audio bucket. */
export function mesinTexts() {
  const words = [...MESIN_PICTURE.map(x => x.w), ...MESIN_WORDS];
  return [...words, ...MESIN_REAL, ...MESIN_FUNNY];
}

// Development assertion to ensure we don't accidentally form bad words
const generatedWords = new Set();
for (const set of REEL_SETS) {
  for (const a of set.a) {
    for (const b of set.b) {
      const w = a + b;
      if (UNSAFE_WORDS.includes(w)) {
        throw new Error(`UNSAFE WORD FORMED: ${w}`);
      }
      if (ALL_WORDS.has(w)) {
        generatedWords.add(w);
      }
    }
  }
}
const missing = [...ALL_WORDS].filter(w => !generatedWords.has(w) && w.length <= 4);
if (missing.length > 0 && typeof window === 'undefined') {
  // Only warn in node during audio gen or server start
  // console.warn(`Some ALL_WORDS cannot be formed by the reels:`, missing);
}
