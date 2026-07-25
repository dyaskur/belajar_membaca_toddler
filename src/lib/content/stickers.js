import { PICTURE_WORDS } from './words.js';

/**
 * @typedef {Object} Sticker
 * @property {string} id
 * @property {string} label
 * @property {string} emoji
 * @property {string} img
 * @property {string} sil
 * @property {string} section
 * @property {boolean} talks
 * @property {boolean} rare
 */

const PICTURE_EMOJI = new Map(PICTURE_WORDS.map((word) => [word.w, word.e]));
const WORDS_AUDIO = new Set(PICTURE_WORDS.map((word) => word.w));
const CURRICULUM_AUDIO = new Map([
  ['meja', 3],
  ['kuda', 3],
  ['lemari', 3],
  ['rusa', 3],
  ['sapi', 3],
  ['bakso', 8],
  ['sabun', 8],
  ['robot', 8],
  ['krayon', 8],
  ['bantal', 8],
  ['kertas', 8],
  ['kantor', 8],
  ['pelangi', 9],
  ['jendela', 9],
  ['matahari', 9],
  ['komputer', 9]
]);
const ABJAD_AUDIO = new Set(['vas', 'yoyo']);

// Level 2a introduces these animal names specifically for the sticker album. Their
// clips live in the shared words bucket alongside the existing picture vocabulary.
export const STICKER_AUDIO_WORDS = Object.freeze([
  'bebek',
  'cicak',
  'domba',
  'flamingo',
  'gajah',
  'harimau',
  'jerapah',
  'kucing',
  'lebah',
  'monyet',
  'nuri',
  'pinguin',
  'tikus',
  'zebra'
]);
const STICKER_AUDIO = new Set(STICKER_AUDIO_WORDS);

/** Creature fallbacks must never use face-bearing emoji art. */
const CREATURE_IDS = new Set([
  'bebek',
  'cicak',
  'domba',
  'flamingo',
  'gajah',
  'harimau',
  'jerapah',
  'kucing',
  'lebah',
  'monyet',
  'nuri',
  'pinguin',
  'rusa',
  'sapi',
  'tikus',
  'zebra',
  'kuda',
  'robot'
]);

const EXTRA_EMOJI = /** @type {Record<string, string>} */ ({
  vas: '🏺',
  yoyo: '🪀',
  meja: '🪑',
  lemari: '🚪',
  bakso: '🍲',
  sabun: '🧼',
  krayon: '🖍️',
  bantal: '🛏️',
  kertas: '📄',
  kantor: '🏢',
  pelangi: '🌈',
  jendela: '🪟',
  matahari: '☀️',
  komputer: '💻'
});

const PAGE_DEFS = [
  { id: '1', title: '1 Huruf', ids: ['pisang', 'apel', 'jeruk', 'nanas', 'telur', 'roti', 'susu'] },
  {
    id: '2a',
    title: '2a Suku Terbuka',
    ids: [
      'bebek',
      'cicak',
      'domba',
      'flamingo',
      'gajah',
      'harimau',
      'jerapah',
      'kucing',
      'lebah',
      'monyet',
      'nuri',
      'pinguin',
      'rusa',
      'sapi',
      'tikus',
      'vas',
      'wortel',
      'yoyo',
      'zebra'
    ]
  },
  { id: '2b', title: '2b Suku Tertutup', ids: ['rumah', 'pintu', 'kunci', 'kursi', 'gelas', 'sendok'] },
  {
    id: '2c',
    title: '2c Gabungan',
    ids: ['mobil', 'sepeda', 'kapal', 'pesawat', 'balon', 'bintang', 'bulan']
  },
  { id: '2d', title: '2d Gugus Konsonan', ids: ['buku', 'pensil', 'pena', 'tas', 'jam', 'lampu'] },
  { id: '3a', title: '3a Susun Kata', ids: ['meja', 'kuda', 'lemari'] },
  {
    id: '3b',
    title: '3b Susun Kata Lanjut',
    ids: ['bakso', 'sabun', 'robot', 'krayon', 'bantal', 'kertas', 'kantor']
  },
  { id: '3c', title: '3c Susun Kata Panjang', ids: ['pelangi', 'jendela', 'matahari', 'komputer'] }
];

export const LESSON_STICKER = /** @type {Readonly<Record<string, string>>} */ (Object.freeze({
  '1-0': 'pisang',
  '1-1': 'apel',
  '1-2': 'jeruk',
  '1-3': 'nanas',
  '1-4': 'telur',
  '1-5': 'roti',
  '1-6': 'susu',
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
  '4-0': 'rumah',
  '4-1': 'pintu',
  '4-2': 'kunci',
  '4-3': 'kursi',
  '4-4': 'gelas',
  '4-5': 'sendok',
  '5-0': 'mobil',
  '5-1': 'sepeda',
  '5-2': 'kapal',
  '5-3': 'pesawat',
  '5-4': 'balon',
  '5-5': 'bintang',
  '5-6': 'bulan',
  '7-0': 'buku',
  '7-1': 'pensil',
  '7-2': 'pena',
  '7-3': 'tas',
  '7-4': 'jam',
  '7-5': 'lampu',
  '3-0': 'meja',
  '3-1': 'kuda',
  '3-2': 'lemari',
  '8-0': 'bakso',
  '8-1': 'sabun',
  '8-2': 'robot',
  '8-3': 'krayon',
  '8-4': 'bantal',
  '8-5': 'kertas',
  '8-6': 'kantor',
  '9-0': 'pelangi',
  '9-1': 'jendela',
  '9-2': 'matahari',
  '9-3': 'komputer'
}));

const BONUS_IDS = ['bola', 'topi', 'nasi', 'daun', 'gigi', 'bunga', 'awan', 'payung', 'sepatu', 'baju', 'celana', 'cabai', 'hadiah'];
const TROPHY_IDS = ['trofi-1', 'trofi-2', 'trofi-4', 'trofi-5', 'trofi-7', 'trofi-3', 'trofi-8', 'trofi-9'];

/** @param {string} id @param {string} section @param {boolean} [rare] @returns {Sticker} */
function makeSticker(id, section, rare = false) {
  const talks =
    !rare &&
    (WORDS_AUDIO.has(id) || CURRICULUM_AUDIO.has(id) || ABJAD_AUDIO.has(id) || STICKER_AUDIO.has(id));
  const trophyLevel = id.startsWith('trofi-') ? id.slice(6) : '';
  return {
    id,
    label: trophyLevel ? `Piala Level ${trophyLevel}` : id[0].toUpperCase() + id.slice(1),
    emoji: rare ? '🏆' : CREATURE_IDS.has(id) ? '❓' : (PICTURE_EMOJI.get(id) ?? EXTRA_EMOJI[id] ?? '❓'),
    img: `/stickers/${id}.webp`,
    sil: `/stickers/sil/${id}.webp`,
    section,
    talks,
    rare
  };
}

export const STICKER_PAGES = PAGE_DEFS.map((page) => ({
  id: page.id,
  title: page.title,
  stickers: page.ids.map((id) => makeSticker(id, page.id))
}));

export const BONUS_POOL = BONUS_IDS.map((id) => makeSticker(id, 'bonus'));
export const TROPHIES = TROPHY_IDS.map((id) => makeSticker(id, 'trophy', true));
export const STICKERS = [...STICKER_PAGES.flatMap((page) => page.stickers), ...BONUS_POOL, ...TROPHIES];
export const STICKER_TOTAL = STICKERS.length;

const BY_ID = new Map(STICKERS.map((sticker) => [sticker.id, sticker]));

/** @param {string} id @returns {Sticker|null} */
export function getSticker(id) {
  return BY_ID.get(id) ?? null;
}

/** @param {string} id */
export function isCreatureSticker(id) {
  return CREATURE_IDS.has(id);
}

/**
 * Existing word-level rewards reuse their curriculum pack; picture words use the
 * shared words pack. Abjad-only objects reuse that pack.
 * @param {Sticker} sticker
 * @returns {number|'words'|'abjad'}
 */
export function stickerAudioBucket(sticker) {
  return CURRICULUM_AUDIO.get(sticker.id) ?? (ABJAD_AUDIO.has(sticker.id) ? 'abjad' : 'words');
}
