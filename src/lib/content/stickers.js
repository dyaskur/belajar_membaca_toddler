/**
 * Buku Stiker content: which picture is awarded for which lesson/exam/bonus event,
 * and the metadata the album + reveal need to render and (sometimes) speak it.
 *
 * Art lives outside this file: `static/stickers/{id}.webp` (the photo) and
 * `static/stickers/sil/{id}.webp` (the locked-slot silhouette), produced by
 * `scripts/prepare-stickers.js` from `assets/stickers-src/`.
 *
 * Lesson stickers are keyed by `{levelId}-{lessonIndex}` rather than a global running
 * number — the curriculum grows over time, and a global sequence would re-shuffle
 * every child's already-earned stickers whenever a lesson is inserted.
 */
import { PICTURE_WORDS } from './words.js';
import { LEVELS, levelLabel } from './levels.js';

/** Lesson (levelId-lessonIndex) -> sticker id. One per regular lesson, fixed forever.
 * @type {Record<string, string>} */
export const LESSON_STICKER = {
  // 1 · Huruf — Makanan
  '1-0': 'pisang', '1-1': 'apel', '1-2': 'jeruk', '1-3': 'nanas',
  '1-4': 'telur', '1-5': 'roti', '1-6': 'susu',
  // 2 · Suku Kata Terbuka — one animal per consonant row (letter-initial)
  '2-0': 'bebek', '2-1': 'cicak', '2-2': 'domba', '2-3': 'flamingo', '2-4': 'gajah',
  '2-5': 'harimau', '2-6': 'jerapah', '2-7': 'kucing', '2-8': 'lebah', '2-9': 'monyet',
  '2-10': 'nuri', '2-11': 'pinguin', '2-12': 'rusa', '2-13': 'sapi', '2-14': 'tikus',
  '2-15': 'vas', '2-16': 'wortel', '2-17': 'yoyo', '2-18': 'zebra',
  // 4 · Suku Kata Tertutup — Rumah
  '4-0': 'rumah', '4-1': 'pintu', '4-2': 'kunci', '4-3': 'kursi', '4-4': 'gelas', '4-5': 'sendok',
  // 5 · Gabungan Huruf — Jalan & Langit
  '5-0': 'mobil', '5-1': 'sepeda', '5-2': 'kapal', '5-3': 'pesawat',
  '5-4': 'balon', '5-5': 'bintang', '5-6': 'bulan',
  // 7 · Gugus Konsonan — Sekolah
  '7-0': 'buku', '7-1': 'pensil', '7-2': 'pena', '7-3': 'tas', '7-4': 'jam', '7-5': 'lampu',
  // 3 · Susun Kata — a word from that lesson's own list
  '3-0': 'meja', '3-1': 'lemari', '3-2': 'kuda',
  // 8 · Susun Kata Lanjut
  '8-0': 'bakso', '8-1': 'sabun', '8-2': 'krayon', '8-3': 'bantal',
  '8-4': 'kertas', '8-5': 'kantor', '8-6': 'robot',
  // 9 · Susun Kata Panjang
  '9-0': 'pelangi', '9-1': 'jendela', '9-2': 'matahari', '9-3': 'komputer'
};

/** levelId -> trophy sticker id, awarded when that level's Ujian Akhir is passed.
 * @type {Record<number, string>} */
export const TROPHIES = {
  1: 'trofi-1', 2: 'trofi-2', 4: 'trofi-4', 5: 'trofi-5',
  7: 'trofi-7', 3: 'trofi-3', 8: 'trofi-8', 9: 'trofi-9'
};

/** Random-draw pool for bonus games / placement tests (no fixed slot). */
export const BONUS_POOL = [
  'bola', 'topi', 'nasi', 'daun', 'gigi', 'bunga', 'awan',
  'payung', 'sepatu', 'baju', 'celana', 'cabai', 'hadiah'
];

/**
 * Audio bucket to pass to `player.speak(voiceId, bucket, id)` for stickers whose word
 * is already recorded somewhere. `'words'` is the shared PICTURE_WORDS bucket used by
 * Cocokkan/Menulis/Ucapkan; a number is a level's own lesson-audio bucket. Absent =
 * no recording exists yet (silent *Koleksi* sticker) — this is every 2a animal except
 * rusa/sapi/wortel, which double as real curriculum words.
 * @type {Record<string, string|number>}
 */
const TALK_BUCKET = {
  pisang: 'words', apel: 'words', jeruk: 'words', nanas: 'words', telur: 'words', roti: 'words', susu: 'words',
  rusa: 3, sapi: 3, wortel: 'words',
  rumah: 'words', pintu: 'words', kunci: 'words', kursi: 'words', gelas: 'words', sendok: 'words',
  mobil: 'words', sepeda: 'words', kapal: 'words', pesawat: 'words', balon: 'words', bintang: 'words', bulan: 'words',
  buku: 'words', pensil: 'words', pena: 'words', tas: 'words', jam: 'words', lampu: 'words',
  meja: 3, lemari: 3, kuda: 3,
  bakso: 8, sabun: 8, krayon: 8, bantal: 8, kertas: 8, kantor: 8, robot: 8,
  pelangi: 9, jendela: 9, matahari: 9, komputer: 9,
  bola: 'words', topi: 'words', nasi: 'words', daun: 'words', gigi: 'words', bunga: 'words', awan: 'words',
  payung: 'words', sepatu: 'words', baju: 'words', celana: 'words', cabai: 'words', hadiah: 'words'
};

/** Live-animal photos. The aniconism rule forbids a drawn/faced emoji fallback for
 * these, so they always fall back to the silhouette (or ❓), never an emoji. */
const CREATURES = new Set([
  'bebek', 'cicak', 'domba', 'flamingo', 'gajah', 'harimau', 'jerapah', 'kucing',
  'lebah', 'monyet', 'nuri', 'pinguin', 'rusa', 'sapi', 'tikus', 'zebra', 'kuda'
]);

/** @param {string} id @param {boolean} creature */
function emojiFor(id, creature) {
  if (creature) return '❓';
  const w = PICTURE_WORDS.find((p) => p.w === id);
  return w?.e ?? '🖼️';
}

/**
 * @typedef {Object} Sticker
 * @property {string} id
 * @property {string} label     Word/name shown under the sticker.
 * @property {string} emoji     Fallback for a 404'd/uncurated image. Never a faced
 *   animal drawing — creatures fall back to '❓', never their emoji.
 * @property {boolean} creature
 * @property {string} img       `/stickers/{id}.webp`
 * @property {string} sil       `/stickers/sil/{id}.webp`
 * @property {string} section   Album section key: a level id (as string), 'bonus', or 'trophy'.
 * @property {boolean} talks    Whether tapping the sticker speaks its word.
 * @property {string|number} [bucket] Audio bucket for `player.speak`, present iff `talks`.
 * @property {boolean} [rare]   Trophies render in the golden chest.
 */

/** @param {string} id @param {string} label @param {string} section @param {boolean} [rare] @returns {Sticker} */
function build(id, label, section, rare = false) {
  const creature = CREATURES.has(id);
  const bucket = TALK_BUCKET[id];
  return {
    id,
    label,
    emoji: emojiFor(id, creature),
    creature,
    img: `/stickers/${id}.webp`,
    sil: `/stickers/sil/${id}.webp`,
    section,
    talks: bucket !== undefined,
    ...(bucket !== undefined ? { bucket } : {}),
    ...(rare ? { rare: true } : {})
  };
}

/** @type {Sticker[]} */
export const STICKERS = [
  ...Object.entries(LESSON_STICKER).map(([key, id]) => build(id, id, key.split('-')[0])),
  ...Object.entries(TROPHIES).map(([levelId, id]) => build(id, `Piala ${levelLabel(Number(levelId))}`, 'trophy', true)),
  ...BONUS_POOL.map((id) => build(id, id, 'bonus'))
];

/** id -> Sticker, for O(1) lookup by the reveal/album. */
const BY_ID = new Map(STICKERS.map((s) => [s.id, s]));

/** @param {string} id */
export function getSticker(id) {
  return BY_ID.get(id);
}

export const STICKER_TOTAL = STICKERS.length;

/** Album section order + heading. `key` matches `Sticker.section`. */
export const ALBUM_SECTIONS = [
  ...LEVELS.map((lvl) => ({ key: String(lvl.id), title: lvl.title, icon: NODE_ICON(lvl.id) })),
  { key: 'bonus', title: 'Bonus', icon: '🎁' },
  { key: 'trophy', title: 'Piala', icon: '🏆' }
];

/** @param {number} levelId */
function NODE_ICON(levelId) {
  return /** @type {Record<number, string>} */ ({
    1: '🍎', 2: '🪶', 4: '🏠', 5: '🚀', 7: '📖', 3: '🧩', 8: '🧩', 9: '🏁'
  })[levelId] ?? '📦';
}

/** Stickers for one album section, in a stable order. @param {string} key */
export function stickersForSection(key) {
  return STICKERS.filter((s) => s.section === key);
}

/** @param {number} levelId @param {number} lessonIndex */
export function lessonStickerId(levelId, lessonIndex) {
  return LESSON_STICKER[`${levelId}-${lessonIndex}`];
}

/** @param {number} levelId */
export function trophyStickerId(levelId) {
  return TROPHIES[levelId];
}
