/**
 * Letter/syllable blending for the teach phase.
 *   syllable "da"  -> d + a = da
 *   word "bola"    -> b + o = bo,  l + a = la  -> bola
 *
 * Letters reuse pack 1. Recognition syllables reuse pack 2; Level 3 word syllables
 * are generated alongside their word in the same pack.
 */

const DIGRAPHS = ['ng', 'ny', 'kh', 'sy'];

/** Packs whose items are blended during teaching. */
export const BLEND_LEVELS = new Set([2, 3, 4, 5, 7, 8, 9]);

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
export const WORD_SYLLABLES = /** @type {Record<string, string[]>} */ ({
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
  sepatu: ['se', 'pa', 'tu'],
  parah: ['pa', 'rah'],
  bakso: ['bak', 'so'],
  sabun: ['sa', 'bun'],
  robot: ['ro', 'bot'],
  pintu: ['pin', 'tu'],
  gratis: ['gra', 'tis'],
  nyamuk: ['nya', 'muk'],
  syukur: ['syu', 'kur'],
  krayon: ['kra', 'yon'],
  klinik: ['kli', 'nik'],
  global: ['glo', 'bal'],
  kantor: ['kan', 'tor'],
  bantal: ['ban', 'tal'],
  kertas: ['ker', 'tas'],
  gambar: ['gam', 'bar'],
  sampah: ['sam', 'pah'],
  pelangi: ['pe', 'la', 'ngi'],
  sekolah: ['se', 'ko', 'lah'],
  jendela: ['jen', 'de', 'la'],
  bermain: ['ber', 'ma', 'in'],
  membaca: ['mem', 'ba', 'ca'],
  bersama: ['ber', 'sa', 'ma'],
  keluarga: ['ke', 'lu', 'ar', 'ga'],
  matahari: ['ma', 'ta', 'ha', 'ri'],
  olahraga: ['o', 'lah', 'ra', 'ga'],
  komputer: ['kom', 'pu', 'ter'],
  sederhana: ['se', 'der', 'ha', 'na'],
  perpustakaan: ['per', 'pus', 'ta', 'ka', 'an']
});

/** @param {string} text */
export function syllablesForWord(text) {
  const t = text.toLowerCase();
  return WORD_SYLLABLES[t] ?? [t];
}

/** Plausible extra tiles for advanced susun packs (3a intentionally has none). @param {number} levelId @param {string} text */
export function distractorsForWord(levelId, text) {
  const count = levelId === 8 ? 1 : levelId === 9 ? 2 : 0;
  if (!count) return [];
  const target = new Set(syllablesForWord(text));
  const pool = [...new Set(Object.values(WORD_SYLLABLES).flat())]
    .filter((syllable) => !target.has(syllable))
    .sort((a, b) => Math.abs(a.length - 3) - Math.abs(b.length - 3));
  const offset = [...text].reduce((sum, ch) => sum + ch.charCodeAt(0), 0) % pool.length;
  return Array.from({ length: count }, (_, i) => pool[(offset + i) % pool.length]);
}

/**
 * @typedef {{ word: string, multi: boolean, syllables: { text: string, letters: string[] }[] }} Blend
 * @param {number} levelId @param {string} text @returns {Blend}
 */
export function decompose(levelId, text) {
  const t = text.toLowerCase();
  const sylTexts = [3, 8, 9].includes(levelId) ? syllablesForWord(t) : [t];
  return {
    word: text,
    multi: sylTexts.length > 1,
    syllables: sylTexts.map((s) => ({ text: s, letters: splitLetters(s) }))
  };
}
