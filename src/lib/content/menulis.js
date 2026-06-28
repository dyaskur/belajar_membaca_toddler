/**
 * "Belajar Menulis" writing activity — config shared by the hub (`/menulis`) and the
 * game shell (`/menulis/[mode]`). Stateless bonus, fully offline; content comes from
 * PICTURE_WORDS (see words.js). Three modes the child picks between.
 *
 * @typedef {'tiru'|'susun'|'ketik'} WriteModeId
 * @typedef {{ id: WriteModeId, icon: string, title: string, subtitle: string, color: string }} WriteMode
 */

/** Cards on the hub, in difficulty order: trace → build → type. */
export const WRITE_MODES = /** @type {WriteMode[]} */ ([
  { id: 'tiru', icon: '✍️', title: 'Tiru', subtitle: 'Tebalkan hurufnya', color: 'bg-amber-500' },
  { id: 'susun', icon: '🧩', title: 'Susun', subtitle: 'Susun jadi kata', color: 'bg-rose-500' },
  { id: 'ketik', icon: '⌨️', title: 'Ketik', subtitle: 'Ketik katanya', color: 'bg-sky-500' }
]);

/** Words per session (same deck size as the Ucapkan activity). */
export const WRITE_DECK = 8;

/** Trace is finger-work for the youngest hands → keep words short. */
export const TRACE_MAX_LEN = 5;

/** @param {string} id */
export function writeMode(id) {
  return WRITE_MODES.find((m) => m.id === id) ?? null;
}

/** Syllable breakdown per picture-word, for the Susun spoken instruction. */
export const WORD_SYLLABLES = /** @type {Record<string, string>} */ ({
  bola: 'bo-la',
  buku: 'bu-ku',
  topi: 'to-pi',
  pisang: 'pi-sang',
  apel: 'a-pel',
  nasi: 'na-si',
  jeruk: 'je-ruk',
  daun: 'da-un',
  gigi: 'gi-gi',
  susu: 'su-su',
  roti: 'ro-ti',
  bunga: 'bu-nga',
  mobil: 'mo-bil',
  rumah: 'ru-mah',
  bintang: 'bin-tang'
});

/**
 * Susun spoken instruction, split in two so the syllables can be slower with a gap:
 *   lead-in    — "Ayo susun kata mobil" (normal speed, variant 0)
 *   syllables  — "mo, bil"              (slow, variant 1; the comma makes the gap)
 * Both are generated into the words bucket (see generate-audio.js) and played in
 * sequence on a Susun card.
 * @param {string} w
 */
export function susunLeadIn(w) {
  return `Ayo susun kata ${w}`;
}

/** Syllables as a list, e.g. "bin-tang" -> ["bin", "tang"]. @param {string} w */
export function susunSyllableList(w) {
  return (WORD_SYLLABLES[w] ?? w).split('-');
}

/** @param {string} w */
export function susunSyllables(w) {
  return susunSyllableList(w).join(', '); // "mo-bil" -> "mo, bil" (comma = small gap)
}
