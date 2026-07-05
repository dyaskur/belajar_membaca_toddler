/**
 * Content for the "Mesin Kata" syllable slot machine (/mesin).
 *
 * Two reels of 8 CV syllables each; the machine reads whatever combo lands
 * (each syllable slowly, then the blend). A real Indonesian word is a jackpot;
 * nonsense is a giggle moment — never a failure.
 *
 * CLOSED-WORLD DICTIONARY: every formable 64-combo grid per reel set was
 * enumerated against this dictionary; the reels were curated until every
 * formable real word is IN the dictionary and no unsafe word is formable.
 * So no real word can ever be called nonsense. If you touch REEL_SETS, the
 * module-load checks below re-verify safety and completeness.
 *
 * Accepted tradeoff: a few archaic/marginal formable strings (daku, bala,
 * gitu, paru, pagu, saru, …) are classified as funny nonsense — fine for
 * pre-readers.
 *
 * The picture-tier entries here are deliberately LOCAL to this game and NOT
 * added to PICTURE_WORDS — that would silently change the Cocokkan/Ucapkan/
 * Menulis decks.
 */

import { PICTURE_WORDS } from './words.js';

/** @typedef {{ a: string[], b: string[] }} ReelSet */

/**
 * 3 curated rotating reel sets (round 1 → set 1, cycling). All 16 syllables
 * per set are plain CV, so the level-2 audio clips cover the read-out.
 * @type {ReelSet[]}
 */
export const REEL_SETS = [
  { a: ['bo', 'bu', 'to', 'ro', 'su', 'sa', 'ba', 'da'], b: ['la', 'ku', 'pi', 'ti', 'su', 'si', 'ju', 'du'] },
  { a: ['na', 'gi', 'pe', 'ro', 'ma', 'ba', 'me', 'ku'], b: ['si', 'gi', 'na', 'da', 'du', 'tu', 'ja', 'ta'] },
  { a: ['sa', 'ta', 'pi', 'la', 'gu', 'pa', 'su', 'ba'], b: ['pu', 'li', 'ta', 'gu', 'ru', 'ku', 'ka', 'ca'] }
];

/** Spins per round. */
export const SPINS_PER_ROUND = 10;

/** After this many consecutive nonsense spins, the next spin is forced real. */
export const PITY_STREAK = 3;

/**
 * Picture-tier words whose emoji + audio already exist in PICTURE_WORDS
 * (their clips play from the `words` bucket).
 */
const PICTURE_REUSE = ['bola', 'buku', 'topi', 'nasi', 'gigi', 'susu', 'roti', 'pena', 'baju'];

/**
 * Picture-tier entries local to this game (faceless-safe emoji; audio in the
 * `mesin` bucket).
 * @type {{ w: string, e: string }[]}
 */
export const MESIN_PICTURE = [
  { w: 'dadu', e: '🎲' },
  { w: 'dasi', e: '👔' },
  { w: 'roda', e: '🛞' },
  { w: 'madu', e: '🍯' },
  { w: 'batu', e: '🪨' },
  { w: 'bata', e: '🧱' },
  { w: 'peta', e: '🗺️' },
  { w: 'sapu', e: '🧹' },
  { w: 'tali', e: '🪢' },
  { w: 'pita', e: '🎀' },
  { w: 'lagu', e: '🎵' }
];

/**
 * Word tier — real words celebrated without a picture (either their emoji
 * would break the faceless rule — sapi, mata, meja, kuda — or there is no
 * clear picturable emoji).
 * @type {string[]}
 */
export const MESIN_WORDS = [
  'sapi', 'mata', 'meja', 'kuda',
  'saku', 'suku', 'nada', 'kutu', 'baja', 'guru', 'suka', 'baca',
  'baru', 'laku', 'sagu', 'tata', 'paku', 'basi', 'baku', 'busi',
  'mana', 'bagi'
];

/** word -> emoji (null for word tier). The closed-world dictionary. */
const DICT = new Map();
{
  const reuse = new Set(PICTURE_REUSE);
  for (const pw of PICTURE_WORDS) if (reuse.has(pw.w)) DICT.set(pw.w, pw.e);
  for (const { w, e } of MESIN_PICTURE) DICT.set(w, e);
  for (const w of MESIN_WORDS) DICT.set(w, null);
}

const WORDS_BUCKET_SET = new Set(PICTURE_REUSE);

/**
 * The real word formed by two syllables, or null if the combo is nonsense.
 * @param {string} sylA @param {string} sylB
 */
export function mesinWordFor(sylA, sylB) {
  const w = sylA + sylB;
  return DICT.has(w) ? w : null;
}

/** Emoji for a dictionary word (null for word-tier entries). @param {string} w */
export function mesinEmoji(w) {
  return DICT.get(w) ?? null;
}

/** @param {string} w */
export function isPictureWord(w) {
  return Boolean(DICT.get(w));
}

/**
 * Audio bucket holding a dictionary word's clip: PICTURE_WORDS members live in
 * the existing `words` bucket, everything else in the `mesin` bucket.
 * @param {string} w
 */
export function mesinAudioBucket(w) {
  return WORDS_BUCKET_SET.has(w) ? 'words' : 'mesin';
}

/** Spoken praise when a real word lands (clips in the `mesin` bucket). */
export const MESIN_REAL = ['Kata beneran!', 'Wah, ini kata sungguhan!', 'Kamu menemukan kata!'];

/** Spoken giggle lines for nonsense (clips in the `mesin` bucket). */
export const MESIN_FUNNY = ['Kata lucu!', 'Hihi, kata apa itu, ya?', 'Wah, lucu sekali bunyinya!'];

/**
 * Words that must NEVER be formable by any reel combo (verified below on
 * every module load, so a reel edit cannot slip one in).
 */
export const UNSAFE_WORDS = ['gila', 'babi', 'mati', 'napi', 'buta', 'kuli', 'bego', 'bodo', 'tolol', 'mampus'];

/**
 * The 42 collectible bank slots, grouped by the FIRST reel set that can form
 * each word (each word appears exactly once, alphabetical within its set).
 * @type {string[][]}
 */
export const BANK_GROUPS = REEL_SETS.map(() => /** @type {string[]} */ ([]));
{
  const seen = new Set();
  REEL_SETS.forEach((set, i) => {
    for (const a of set.a) {
      for (const b of set.b) {
        const w = a + b;
        if (DICT.has(w) && !seen.has(w)) {
          seen.add(w);
          BANK_GROUPS[i].push(w);
        }
      }
    }
  });
  for (const group of BANK_GROUPS) group.sort();
}

/** Total collectible words across all reel sets. */
export const BANK_TOTAL = BANK_GROUPS.reduce((n, g) => n + g.length, 0);

/**
 * Texts for scripts/generate-audio.js. `words` = dictionary entries that need
 * clips in the `mesin` bucket (both variants); `phrases` = praise lines
 * (variant 0 only).
 */
export function mesinTexts() {
  return {
    words: [...MESIN_PICTURE.map((p) => p.w), ...MESIN_WORDS],
    phrases: [...MESIN_REAL, ...MESIN_FUNNY]
  };
}

// --- Module-load curation checks (run in dev/build/generator via the import
// graph — no test infra needed) ---------------------------------------------
{
  const unsafe = new Set(UNSAFE_WORDS);
  for (const set of REEL_SETS) {
    for (const a of set.a) {
      for (const b of set.b) {
        if (unsafe.has(a + b)) {
          throw new Error(`mesin.js: reel combo forms unsafe word "${a + b}" — re-curate REEL_SETS`);
        }
      }
    }
  }
  // Curation aid: a dictionary word no reel set can form is dead weight (or a
  // typo in a reel) — warn, don't crash.
  const formable = new Set(BANK_GROUPS.flat());
  for (const w of DICT.keys()) {
    if (!formable.has(w)) console.warn(`mesin.js: dictionary word "${w}" is not formable by any reel set`);
  }
}
