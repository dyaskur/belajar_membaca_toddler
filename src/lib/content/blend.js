/**
 * Letter/syllable blending for the teach phase.
 *   syllable "da"  -> d + a = da
 *   word "bola"    -> b + o = bo,  l + a = la  -> bola
 *
 * Audio is reused from other packs: letters from Level 1, CV syllables from Level 2,
 * and the whole syllable/word from its own level.
 */

const DIGRAPHS = ['ng', 'ny', 'kh', 'sy'];

/**
 * Packs whose items are blended in the teach phase (single syllables 2/4/7, words 3/8/9).
 * Pack 5 (digraphs) and pack 1 (letters) are spoken whole.
 */
export const BLEND_LEVELS = new Set([2, 3, 4, 7, 8, 9]);

/** Split a syllable into letter units (a digraph like "ng" stays one unit). @param {string} syl */
function splitLetters(syl) {
  /** @type {string[]} */
  const out = [];
  for (let i = 0; i < syl.length; ) {
    const two = syl.slice(i, i + 2);
    if (DIGRAPHS.includes(two)) {
      out.push(two);
      i += 2;
    } else {
      out.push(syl[i]);
      i += 1;
    }
  }
  return out;
}

/**
 * Word -> syllables for the build-the-word (susun) packs: 3a (pack 3, open-CV), 3b (pack 8),
 * 3c (pack 9). Also drives the teach-phase blend breakdown. Edit/extend as word lists grow.
 * @type {Record<string, string[]>}
 */
export const WORD_SYLLABLES = /** @type {Record<string, string[]>} */ ({
  // Pack 3 (3a) — open-CV words
  bola: ['bo', 'la'],
  sapi: ['sa', 'pi'],
  buku: ['bu', 'ku'],
  meja: ['me', 'ja'],
  roti: ['ro', 'ti'],
  susu: ['su', 'su'],
  topi: ['to', 'pi'],
  kaki: ['ka', 'ki'],
  mata: ['ma', 'ta'],
  kuda: ['ku', 'da'],
  rusa: ['ru', 'sa'],
  dada: ['da', 'da'],
  lemari: ['le', 'ma', 'ri'],
  sepatu: ['se', 'pa', 'tu'],
  kelapa: ['ke', 'la', 'pa'],
  celana: ['ce', 'la', 'na'],
  kepala: ['ke', 'pa', 'la'],
  sepeda: ['se', 'pe', 'da'],
  // Pack 8 (3b) — advanced-pattern words ≤6 letters
  gratis: ['gra', 'tis'],
  kripik: ['kri', 'pik'],
  krupuk: ['kru', 'puk'],
  coklat: ['cok', 'lat'],
  bangku: ['bang', 'ku'],
  kunci: ['kun', 'ci'],
  pintu: ['pin', 'tu'],
  lampu: ['lam', 'pu'],
  kertas: ['ker', 'tas'],
  dokter: ['dok', 'ter'],
  mangga: ['mang', 'ga'],
  kapten: ['kap', 'ten'],
  // Pack 9 (3c) — long words 7–12 letters
  keranjang: ['ke', 'ran', 'jang'],
  matahari: ['ma', 'ta', 'ha', 'ri'],
  semangka: ['se', 'mang', 'ka'],
  kelinci: ['ke', 'lin', 'ci'],
  mentega: ['men', 'te', 'ga'],
  komputer: ['kom', 'pu', 'ter'],
  gerobak: ['ge', 'ro', 'bak'],
  jerapah: ['je', 'ra', 'pah'],
  gembira: ['gem', 'bi', 'ra'],
  kacamata: ['ka', 'ca', 'ma', 'ta'],
  selimut: ['se', 'li', 'mut'],
  mangkuk: ['mang', 'kuk']
});

/** Syllable breakdown for a word (falls back to the whole word as one syllable). @param {string} word */
export function syllablesOf(word) {
  const t = word.toLowerCase();
  return WORD_SYLLABLES[t] ?? [t];
}

/**
 * @typedef {{ word: string, multi: boolean, syllables: { text: string, letters: string[] }[] }} Blend
 * @param {number} levelId @param {string} text @returns {Blend}
 */
export function decompose(levelId, text) {
  const t = text.toLowerCase();
  // Any pack with a known breakdown blends into syllables; single-syllable packs stay whole.
  const sylTexts = WORD_SYLLABLES[t] ?? [t];
  return {
    word: text,
    multi: sylTexts.length > 1,
    syllables: sylTexts.map((s) => ({ text: s, letters: splitLetters(s) }))
  };
}
