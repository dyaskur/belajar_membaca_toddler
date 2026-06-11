/**
 * Level definitions and item generation. Content is voice-agnostic: an "item" is just
 * a piece of text the child must recognize. Audio for each item is generated per voice.
 *
 * @typedef {Object} Item
 * @property {string} id     Stable id, also used as the audio filename stem.
 * @property {string} text   The target text spoken & shown.
 * @property {string} display Optional larger display string (defaults to text).
 */

const VOWELS = ['a', 'i', 'u', 'e', 'o'];
// Consonants commonly taught first (excludes digraph letters handled in level 5).
const CONSONANTS = [
  'b', 'c', 'd', 'f', 'g', 'h', 'j', 'k', 'l', 'm',
  'n', 'p', 'r', 's', 't', 'v', 'w', 'y', 'z'
];
const ALPHABET = 'abcdefghijklmnopqrstuvwxyz'.split('');

/** @returns {Item[]} */
function level1Letters() {
  return ALPHABET.map((c) => ({ id: `l1_${c}`, text: c, display: c.toUpperCase() + c }));
}

/** @returns {Item[]} */
function level2Syllables() {
  /** @type {Item[]} */
  const out = [];
  for (const c of CONSONANTS) {
    for (const v of VOWELS) {
      const s = c + v;
      out.push({ id: `l2_${s}`, text: s, display: s });
    }
  }
  return out;
}

const LEVEL3_WORDS = [
  'bola', 'sapi', 'buku', 'meja', 'roti', 'susu', 'topi', 'kaki',
  'mata', 'gigi', 'baju', 'pena', 'kuda', 'rusa', 'lemari', 'sepatu'
];

const LEVEL4_CLOSED = [
  'an', 'in', 'un', 'bak', 'tas', 'pot', 'kan', 'bel',
  'sik', 'kun', 'pal', 'sup', 'top', 'jam', 'gas', 'lap'
];

const LEVEL5_DIGRAPHS = [
  'nga', 'ngi', 'ngu', 'nge', 'ngo',
  'nya', 'nyi', 'nyu', 'nye', 'nyo',
  'kha', 'syu'
];

const LEVEL6_SENTENCES = [
  'Ini bola.', 'Itu sapi.', 'Saya suka roti.', 'Ibu minum susu.',
  'Adik baca buku.', 'Kakak pakai topi.', 'Kuda itu lari.', 'Bapak makan nasi.'
];

/** @param {string} prefix @param {string[]} words @returns {Item[]} */
function wordItems(prefix, words) {
  return words.map((w, i) => ({ id: `${prefix}_${i}_${w.replace(/[^a-z]/gi, '')}`, text: w, display: w }));
}

/**
 * @typedef {Object} Level
 * @property {number} id
 * @property {string} title
 * @property {string} subtitle  Adult-facing, Bahasa Indonesia.
 * @property {() => Item[]} items
 */

/** @type {Level[]} */
export const LEVELS = [
  { id: 1, title: 'Huruf', subtitle: 'Mengenal huruf', items: level1Letters },
  { id: 2, title: 'Suku Kata', subtitle: 'ba, bi, bu, be, bo', items: level2Syllables },
  { id: 3, title: 'Kata', subtitle: 'Kata sederhana', items: () => wordItems('l3', LEVEL3_WORDS) },
  { id: 4, title: 'Suku Tertutup', subtitle: 'an, bak, tas', items: () => wordItems('l4', LEVEL4_CLOSED) },
  { id: 5, title: 'Gabungan Huruf', subtitle: 'ng, ny, kh, sy', items: () => wordItems('l5', LEVEL5_DIGRAPHS) },
  { id: 6, title: 'Kalimat', subtitle: 'Kalimat pendek', items: () => wordItems('l6', LEVEL6_SENTENCES) }
];

/** @param {number} id */
export function getLevel(id) {
  return LEVELS.find((l) => l.id === id);
}

/** Questions per round. */
export const ROUND_SIZE = 10;
/** Mastery threshold (fraction) to unlock the next level. */
export const MASTERY = 0.8;
/** Number of answer tiles (1 correct + N-1 distractors). */
export const TILE_COUNT = 3;
