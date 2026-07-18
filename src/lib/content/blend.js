/**
 * Letter/syllable blending for the teach phase.
 *   syllable "da"  -> d + a = da
 *   word "bola"    -> b + o = bo,  l + a = la  -> bola
 *
 * Audio is reused from other packs: letters from Level 1, CV syllables from Level 2,
 * and the whole syllable/word from its own level.
 */

const DIGRAPHS = ['ng', 'ny', 'kh', 'sy'];

/** Levels whose items are blended (single syllables L2/L4/L7, words L3/L8/L9). */
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

/** Word -> syllables (Level 3, 8, 9 words). Edit/extend as the word list grows. */
const WORD_SYLLABLES = /** @type {Record<string, string[]>} */ ({
  // Level 3 (Pack 3a)
  bola: ['bo', 'la'], sapi: ['sa', 'pi'], buku: ['bu', 'ku'], meja: ['me', 'ja'],
  roti: ['ro', 'ti'], susu: ['su', 'su'], topi: ['to', 'pi'], kaki: ['ka', 'ki'],
  mata: ['ma', 'ta'], gigi: ['gi', 'gi'], baju: ['ba', 'ju'], pena: ['pe', 'na'],
  kuda: ['ku', 'da'], rusa: ['ru', 'sa'], lemari: ['le', 'ma', 'ri'], sepatu: ['se', 'pa', 'tu'],
  // Level 8 (Pack 3b)
  sepeda: ['se', 'pe', 'da'], pintu: ['pin', 'tu'], lampu: ['lam', 'pu'], balon: ['ba', 'lon'],
  nanas: ['na', 'nas'], parah: ['pa', 'rah'], kucing: ['ku', 'cing'], anjing: ['an', 'jing'],
  pisang: ['pi', 'sang'], kertas: ['ker', 'tas'], sendok: ['sen', 'dok'], pensil: ['pen', 'sil'],
  wortel: ['wor', 'tel'], gratis: ['gra', 'tis'], payung: ['pa', 'yung'], bunga: ['bu', 'nga'],
  // Level 9 (Pack 3c)
  pesawat: ['pe', 'sa', 'wat'], kamera: ['ka', 'me', 'ra'], bendera: ['ben', 'de', 'ra'],
  beruang: ['be', 'ru', 'ang'], harimau: ['ha', 'ri', 'mau'], sekolah: ['se', 'ko', 'lah'],
  jendela: ['jen', 'de', 'la'], semangka: ['se', 'mang', 'ka'], kacamata: ['ka', 'ca', 'ma', 'ta'],
  matahari: ['ma', 'ta', 'ha', 'ri'], keluarga: ['ke', 'lu', 'ar', 'ga'], komputer: ['kom', 'pu', 'ter'],
  televisi: ['te', 'le', 'vi', 'si'], stroberi: ['stro', 'be', 'ri'], helikopter: ['he', 'li', 'kop', 'ter']
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
