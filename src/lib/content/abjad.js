/**
 * A–Z reference content for the "Abjad" explore page. One picturable Indonesian word
 * per letter, each paired with a FACELESS emoji (per the app's aniconism rule — no
 * faced animals like ikan/zebra). Letters reuse the Level-1 letter-name audio; the
 * object words get their own `abjad` audio bucket (see scripts/generate-audio.js).
 *
 * Hard letters resolved deliberately: Q→quran, V→vas, X→xenia (a common Indonesian MPV).
 *
 * @typedef {{ letter: string, word: string, emoji: string }} AbjadEntry
 */

/** @type {AbjadEntry[]} */
export const ABJAD = [
  { letter: 'a', word: 'apel', emoji: '🍎' },
  { letter: 'b', word: 'bola', emoji: '⚽' },
  { letter: 'c', word: 'cabai', emoji: '🌶️' },
  { letter: 'd', word: 'daun', emoji: '🍃' },
  { letter: 'e', word: 'es krim', emoji: '🍦' },
  { letter: 'f', word: 'foto', emoji: '📷' },
  { letter: 'g', word: 'gunting', emoji: '✂️' },
  { letter: 'h', word: 'hujan', emoji: '🌧️' },
  { letter: 'i', word: 'intan', emoji: '💎' },
  { letter: 'j', word: 'jeruk', emoji: '🍊' },
  { letter: 'k', word: 'kunci', emoji: '🔑' },
  { letter: 'l', word: 'lampu', emoji: '💡' },
  { letter: 'm', word: 'mobil', emoji: '🚗' },
  { letter: 'n', word: 'nanas', emoji: '🍍' },
  { letter: 'o', word: 'obat', emoji: '💊' },
  { letter: 'p', word: 'pisang', emoji: '🍌' },
  { letter: 'q', word: 'quran', emoji: '📖' },
  { letter: 'r', word: 'roti', emoji: '🍞' },
  { letter: 's', word: 'sepatu', emoji: '👟' },
  { letter: 't', word: 'topi', emoji: '👒' },
  { letter: 'u', word: 'uang', emoji: '💵' },
  { letter: 'v', word: 'vas', emoji: '🏺' },
  { letter: 'w', word: 'wortel', emoji: '🥕' },
  { letter: 'x', word: 'xenia', emoji: '🚙' },
  { letter: 'y', word: 'yoyo', emoji: '🪀' },
  { letter: 'z', word: 'zaitun', emoji: '🫒' }
];

/** Audio bucket name (not a numeric level) for the object-word clips. */
export const ABJAD_BUCKET = 'abjad';
