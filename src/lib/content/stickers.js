import { LEVELS } from './levels.js';
import { PICTURE_WORDS } from './words.js';

/**
 * @typedef {Object} Sticker
 * @property {string} id - The unique identifier of the sticker
 * @property {string} label - The display name/label of the sticker
 * @property {string} img - The path to the collected sticker photo
 * @property {string} sil - The path to the locked silhouette
 * @property {string} section - The album section it belongs to (e.g. '1 Huruf', 'Bonus')
 * @property {boolean} rare - Whether the sticker is a rare gold-bordered variant
 * @property {boolean} talks - Whether the sticker label should be spoken when tapped
 */

// Derived list of all words taught in the curriculum to check for audio
const taughtWords = new Set();
for (const level of LEVELS) {
  if (level.stage === 2 || level.stage === 3) {
    for (const item of level.items()) {
      taughtWords.add(item.text);
    }
  }
}
PICTURE_WORDS.forEach((pw) => taughtWords.add(pw.w));

/**
 * Helper to create a sticker definition.
 * @param {string} id
 * @param {string} label
 * @param {string} section
 * @param {boolean} rare
 * @param {boolean} talks
 * @returns {Sticker}
 */
function createSticker(id, label, section, rare = false, talks = false) {
  return {
    id,
    label,
    img: `/stickers/${id}.webp`,
    sil: `/stickers/${id}.webp`,
    section,
    talks,
    rare,
  };
}

/** @type {Record<string, string>} */
export const LESSON_STICKER = {
  // 1 Huruf (L1) - Makanan
  '1-0': 'pisang',
  '1-1': 'apel',
  '1-2': 'jeruk',
  '1-3': 'nanas',
  '1-4': 'telur',
  '1-5': 'roti',
  '1-6': 'susu',

  // 2a Suku Terbuka (Level 2) - Hewan
  '2-0': 'bebek',
  '2-1': 'cicak',
  '2-2': 'domba',
  '2-3': 'flamingo',
  '2-4': 'gajah',
  '2-5': 'harimau',
  '2-6': 'jerapah',
  '2-7': 'kucing',
  '2-8': 'lebah',
  '2-9': 'monyet',
  '2-10': 'nuri',
  '2-11': 'pinguin',
  '2-12': 'rusa',
  '2-13': 'sapi',
  '2-14': 'tikus',
  '2-15': 'vas',
  '2-16': 'wortel',
  '2-17': 'yoyo',
  '2-18': 'zebra',

  // 2b Suku Tertutup (Level 4) - Rumah
  '4-0': 'rumah',
  '4-1': 'pintu',
  '4-2': 'kunci',
  '4-3': 'kursi',
  '4-4': 'gelas',
  '4-5': 'sendok',

  // 2c Gabungan Huruf (Level 5) - Jalan & Langit
  '5-0': 'mobil',
  '5-1': 'sepeda',
  '5-2': 'kapal',
  '5-3': 'pesawat',
  '5-4': 'balon',
  '5-5': 'bintang',
  '5-6': 'bulan',

  // 2d Gugus Konsonan (Level 7) - Sekolah
  '7-0': 'buku',
  '7-1': 'pensil',
  '7-2': 'pena',
  '7-3': 'tas',
  '7-4': 'jam',
  '7-5': 'lampu',

  // 3a Susun Kata (Level 3)
  '3-0': 'meja',
  '3-1': 'kuda',
  '3-2': 'lemari',

  // 3b Susun Kata Lanjut (Level 8)
  '8-0': 'bakso',
  '8-1': 'sabun',
  '8-2': 'robot',
  '8-3': 'krayon',
  '8-4': 'bantal',
  '8-5': 'kertas',
  '8-6': 'kantor',

  // 3c Susun Kata Panjang (Level 9)
  '9-0': 'pelangi',
  '9-1': 'jendela',
  '9-2': 'matahari',
  '9-3': 'komputer',
};

export const BONUS_POOL = [
  'bola', 'topi', 'nasi', 'daun', 'gigi', 'bunga', 'awan', 'payung',
  'sepatu', 'baju', 'celana', 'cabai', 'hadiah'
];

export const TROPHIES = [
  'trofi-1', 'trofi-2', 'trofi-4', 'trofi-5', 'trofi-7', 'trofi-3', 'trofi-8', 'trofi-9'
];

/**
 * Returns the section a given sticker ID belongs to.
 * @param {string} id
 * @returns {string}
 */
function getSectionForId(id) {
  if (TROPHIES.includes(id)) return 'Piala';
  if (BONUS_POOL.includes(id)) return 'Bonus';
  
  for (const [key, val] of Object.entries(LESSON_STICKER)) {
    if (val === id) {
      const levelId = parseInt(key.split('-')[0], 10);
      const level = LEVELS.find((l) => l.id === levelId);
      if (level) return `${level.label} ${level.title}`;
    }
  }
  return 'Lainnya';
}

const allStickerIds = [
  ...Object.values(LESSON_STICKER),
  ...BONUS_POOL,
  ...TROPHIES
];

export const STICKERS = allStickerIds.map(id => createSticker(id, id.replace('trofi-', 'Trofi ').replace(/-/g, ' '), getSectionForId(id)));

export const STICKER_TOTAL = STICKERS.length;

/**
 * @param {string} id
 * @returns {Sticker | null}
 */
export function getSticker(id) {
  return STICKERS.find((s) => s.id === id) ?? null;
}
