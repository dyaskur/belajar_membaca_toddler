import { PICTURE_WORDS } from './words.js';

/**
 * @typedef {{ id: number, a: string[], b: string[] }} ReelSet
 * @typedef {{ w: string, e: string, kind: import('./words.js').PictureKind, faceSafe: boolean, notes?: string }} MesinPicture
 */

/** @type {ReelSet[]} */
export const REEL_SETS = [
  { id: 1, a: ['bo', 'bu', 'to', 'ro', 'su', 'sa', 'ba', 'da'], b: ['la', 'ku', 'pi', 'ti', 'su', 'si', 'ju', 'du'] },
  { id: 2, a: ['na', 'gi', 'pe', 'ro', 'ma', 'ba', 'me', 'ku'], b: ['si', 'gi', 'na', 'da', 'du', 'tu', 'ja', 'ta'] },
  { id: 3, a: ['sa', 'ta', 'pi', 'la', 'gu', 'pa', 'su', 'ba'], b: ['pu', 'li', 'ta', 'gu', 'ru', 'ku', 'ka', 'ca'] }
];

/** Picture words already in the global words bucket. Keep local-only entries out of PICTURE_WORDS. */
export const MESIN_APP_PICTURE_WORDS = ['bola', 'buku', 'topi', 'nasi', 'gigi', 'susu', 'roti', 'pena', 'baju'];

/** @type {MesinPicture[]} */
export const MESIN_PICTURE = [
  { w: 'dadu', e: '🎲', kind: 'object', faceSafe: true },
  { w: 'dasi', e: '👔', kind: 'object', faceSafe: true },
  { w: 'roda', e: '🛞', kind: 'object', faceSafe: true },
  { w: 'madu', e: '🍯', kind: 'food', faceSafe: true },
  { w: 'batu', e: '🪨', kind: 'nature', faceSafe: true },
  { w: 'bata', e: '🧱', kind: 'object', faceSafe: true },
  { w: 'peta', e: '🗺️', kind: 'object', faceSafe: true },
  { w: 'sapu', e: '🧹', kind: 'object', faceSafe: true },
  { w: 'tali', e: '🪢', kind: 'object', faceSafe: true },
  { w: 'pita', e: '🎀', kind: 'object', faceSafe: true },
  { w: 'lagu', e: '🎵', kind: 'object', faceSafe: true }
];

/** Word-tier jackpots: real words, no emoji. */
export const MESIN_WORDS = [
  'sapi',
  'mata',
  'meja',
  'kuda',
  'saku',
  'suku',
  'nada',
  'kutu',
  'baja',
  'guru',
  'suka',
  'baca',
  'baru',
  'laku',
  'sagu',
  'tata',
  'paku',
  'basi',
  'baku',
  'busi',
  'mana',
  'bagi'
];

export const MESIN_REAL = ['Kata beneran!', 'Wah, jadi kata!', 'Kamu menemukan kata!'];
export const MESIN_FUNNY = ['Kata lucu!', 'Bunyinya lucu!', 'Ayo putar lagi!'];
export const UNSAFE_WORDS = ['gila', 'babi', 'mati', 'napi', 'buta', 'kuli', 'bego', 'bodo', 'tolol', 'mampus'];

const APP_PICTURE_BY_WORD = new Map(PICTURE_WORDS.map((word) => [word.w, word]));

/** @type {MesinPicture[]} */
export const MESIN_PICTURES = [
  ...MESIN_APP_PICTURE_WORDS.map((word) => {
    const picture = APP_PICTURE_BY_WORD.get(word);
    if (!picture) throw new Error(`Mesin Kata picture word missing from PICTURE_WORDS: ${word}`);
    return picture;
  }),
  ...MESIN_PICTURE
];

export const MESIN_REAL_WORDS = [...MESIN_PICTURES.map((word) => word.w), ...MESIN_WORDS];
export const MESIN_WORD_TOTAL = MESIN_REAL_WORDS.length;

const REAL_WORD_SET = new Set(MESIN_REAL_WORDS);
const PICTURE_WORD_SET = new Set(MESIN_PICTURES.map((word) => word.w));
const APP_PICTURE_WORD_SET = new Set(MESIN_APP_PICTURE_WORDS);
const PICTURE_BY_WORD = new Map(MESIN_PICTURES.map((word) => [word.w, word]));

/** @param {string} sylA @param {string} sylB */
export function mesinWordFor(sylA, sylB) {
  const word = `${sylA}${sylB}`;
  return REAL_WORD_SET.has(word) ? word : null;
}

/** @param {string} word */
export function isPictureWord(word) {
  return PICTURE_WORD_SET.has(word);
}

/** @param {string} word */
export function isAppPictureWord(word) {
  return APP_PICTURE_WORD_SET.has(word);
}

/** @param {string} word */
export function mesinPictureFor(word) {
  return PICTURE_BY_WORD.get(word) ?? null;
}

/** @param {string} word */
export function mesinAudioBucket(word) {
  return isAppPictureWord(word) ? 'words' : 'mesin';
}

/** Texts rendered into the new `mesin` audio bucket. Existing picture words use `words`. */
export function mesinTexts() {
  return [...MESIN_REAL_WORDS.filter((word) => !APP_PICTURE_WORD_SET.has(word)), ...MESIN_REAL, ...MESIN_FUNNY];
}

/** @param {ReelSet} set */
function wordsForReelSet(set) {
  /** @type {string[]} */
  const words = [];
  for (const sylA of set.a) {
    for (const sylB of set.b) {
      const word = mesinWordFor(sylA, sylB);
      if (word && !words.includes(word)) words.push(word);
    }
  }
  return words;
}

const seenBankWords = new Set();
export const MESIN_BANK_GROUPS = REEL_SETS.map((set) => {
  const words = wordsForReelSet(set).filter((word) => {
    if (seenBankWords.has(word)) return false;
    seenBankWords.add(word);
    return true;
  });
  return { id: set.id, words };
});

function assertSafeReels() {
  const unsafe = new Set(UNSAFE_WORDS);
  const appPictures = new Set(PICTURE_WORDS.map((word) => word.w));
  for (const set of REEL_SETS) {
    for (const sylA of set.a) {
      for (const sylB of set.b) {
        const word = `${sylA}${sylB}`;
        if (unsafe.has(word)) {
          throw new Error(`Unsafe Mesin Kata combo in set ${set.id}: ${sylA}+${sylB}=${word}`);
        }
        if (appPictures.has(word) && !REAL_WORD_SET.has(word)) {
          console.warn(`Mesin Kata combo is a known picture word but not in the machine dictionary: ${word}`);
        }
      }
    }
  }
  if (MESIN_WORD_TOTAL !== 42) {
    throw new Error(`Mesin Kata dictionary must have 42 words, found ${MESIN_WORD_TOTAL}`);
  }
}

assertSafeReels();
