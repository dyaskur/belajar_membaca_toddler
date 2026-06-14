/**
 * Letter/syllable blending for the teach phase.
 *   syllable "da"  -> d + a = da
 *   word "bola"    -> b + o = bo,  l + a = la  -> bola
 *
 * Audio is reused from other packs: letters from Level 1, CV syllables from Level 2,
 * and the whole syllable/word from its own level.
 */

const DIGRAPHS = ['ng', 'ny', 'kh', 'sy'];

/** Levels whose items are blended (single syllables L2/L4, words L3). */
export const BLEND_LEVELS = new Set([2, 3, 4]);

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

/** Word -> syllables (Level 3 words). Edit/extend as the word list grows. */
const WORD_SYLLABLES = /** @type {Record<string, string[]>} */ ({
  bola: ['bo', 'la'],
  sapi: ['sa', 'pi'],
  buku: ['bu', 'ku'],
  meja: ['me', 'ja'],
  roti: ['ro', 'ti'],
  susu: ['su', 'su'],
  topi: ['to', 'pi'],
  kaki: ['ka', 'ki'],
  mata: ['ma', 'ta'],
  gigi: ['gi', 'gi'],
  baju: ['ba', 'ju'],
  pena: ['pe', 'na'],
  kuda: ['ku', 'da'],
  rusa: ['ru', 'sa'],
  lemari: ['le', 'ma', 'ri'],
  sepatu: ['se', 'pa', 'tu']
});

/**
 * @typedef {{ word: string, multi: boolean, syllables: { text: string, letters: string[] }[] }} Blend
 * @param {number} levelId @param {string} text @returns {Blend}
 */
export function decompose(levelId, text) {
  const t = text.toLowerCase();
  const sylTexts = levelId === 3 && WORD_SYLLABLES[t] ? WORD_SYLLABLES[t] : [t];
  return {
    word: text,
    multi: sylTexts.length > 1,
    syllables: sylTexts.map((s) => ({ text: s, letters: splitLetters(s) }))
  };
}
