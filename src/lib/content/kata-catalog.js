/**
 * Shared, hand-curated vocabulary for syllable games.
 *
 * Every breakdown is explicit. Do not derive syllables from spelling here: the
 * same data drives board validation, offline chained audio, and the album label.
 * V1 intentionally uses only the 95 CV syllables already recorded in level 2.
 */

import { KATA_PHOTO_CREDITS } from './kata-photo-credits.js';

const VOWELS = ['a', 'i', 'u', 'e', 'o'];
const CONSONANTS = [
  'b', 'c', 'd', 'f', 'g', 'h', 'j', 'k', 'l', 'm',
  'n', 'p', 'r', 's', 't', 'v', 'w', 'y', 'z'
];

export const KV_SYLLABLES = CONSONANTS.flatMap((c) => VOWELS.map((v) => `${c}${v}`));

/** Words that must never be generated or spoken by free-play word builders. */
export const UNSAFE_WORDS = [
  'babi', 'bego', 'gila', 'judi', 'mati', 'memek', 'miras', 'nazi',
  'puki', 'rokok', 'tahi', 'tai', 'kontol'
];

export const KATA_THEMES = [
  { key: 'makanan', title: 'Makanan', icon: '🍽️' },
  { key: 'hewan', title: 'Hewan', icon: '🌿' },
  { key: 'rumah', title: 'Rumah', icon: '🏠' },
  { key: 'alam', title: 'Alam', icon: '🌤️' },
  { key: 'tubuh', title: 'Tubuh', icon: '🖐️' },
  { key: 'benda', title: 'Benda', icon: '📦' },
  { key: 'kendaraan', title: 'Kendaraan', icon: '🛣️' },
  { key: 'lainnya', title: 'Lainnya', icon: '✨' }
];

/**
 * @typedef {'makanan'|'hewan'|'rumah'|'alam'|'tubuh'|'benda'|'kendaraan'|'lainnya'} Theme
 * @typedef {Object} CatalogWord
 * @property {string} w
 * @property {string[]} syl
 * @property {Theme} theme
 * @property {string} [e]
 * @property {boolean} [photo]
 * @property {string} [img]
 * @property {string} [sil]
 * @property {string} [credit]
 */

/** @param {string} w @param {string[]} syl @param {Theme} theme @returns {CatalogWord} */
const word = (w, syl, theme) => ({ w, syl, theme });

/**
 * Reserve a word for dedicated Word Sticker photography. Until its own approved
 * photo is listed above, the word deliberately remains on its icon fallback.
 * @param {string} w @param {string[]} syl @param {Theme} theme @param {string} [fallback]
 * @returns {CatalogWord}
 */
const photo = (w, syl, theme, fallback = '🖼️') => {
  const credit = KATA_PHOTO_CREDITS[w];
  return {
    w,
    syl,
    theme,
    e: fallback,
    ...(credit
      ? {
          photo: true,
          img: `/kata/${w}.webp`,
          sil: `/kata/sil/${w}.webp`,
          credit
        }
      : {})
  };
};

/** @type {CatalogWord[]} */
export const KATA_CATALOG = [
  // Picture album — two syllables
  photo('madu', ['ma', 'du'], 'makanan', '🍯'),
  photo('kopi', ['ko', 'pi'], 'makanan', '☕'),
  photo('keju', ['ke', 'ju'], 'makanan', '🧀'),
  photo('nasi', ['na', 'si'], 'makanan', '🍚'),
  photo('roti', ['ro', 'ti'], 'makanan', '🍞'),
  photo('susu', ['su', 'su'], 'makanan', '🥛'),
  photo('soto', ['so', 'to'], 'makanan', '🍲'),
  photo('sate', ['sa', 'te'], 'makanan', '🍢'),
  photo('tahu', ['ta', 'hu'], 'makanan', '🧈'),
  photo('bata', ['ba', 'ta'], 'rumah', '🧱'),
  photo('palu', ['pa', 'lu'], 'benda', '🔨'),
  photo('paku', ['pa', 'ku'], 'benda', '📌'),
  photo('sofa', ['so', 'fa'], 'rumah', '🛋️'),
  photo('teko', ['te', 'ko'], 'rumah', '🫖'),
  photo('tisu', ['ti', 'su'], 'benda', '🧻'),
  photo('pita', ['pi', 'ta'], 'benda', '🎀'),
  photo('dadu', ['da', 'du'], 'benda', '🎲'),
  photo('buku', ['bu', 'ku'], 'benda', '📖'),
  photo('meja', ['me', 'ja'], 'rumah', '┬'),
  photo('bola', ['bo', 'la'], 'benda', '⚽'),
  photo('topi', ['to', 'pi'], 'benda', '👒'),
  photo('baju', ['ba', 'ju'], 'benda', '👕'),
  photo('pena', ['pe', 'na'], 'benda', '🖊️'),
  photo('roda', ['ro', 'da'], 'kendaraan', '🛞'),
  photo('beca', ['be', 'ca'], 'kendaraan', '🛺'),
  photo('feri', ['fe', 'ri'], 'kendaraan', '⛴️'),
  photo('peta', ['pe', 'ta'], 'benda', '🗺️'),
  photo('toko', ['to', 'ko'], 'rumah', '🏪'),
  photo('yoyo', ['yo', 'yo'], 'benda', '🪀'),
  photo('kado', ['ka', 'do'], 'benda', '🎁'),
  photo('foto', ['fo', 'to'], 'benda', '📷'),
  photo('sapu', ['sa', 'pu'], 'rumah', '🧹'),
  photo('tali', ['ta', 'li'], 'benda', '🪢'),
  photo('guci', ['gu', 'ci'], 'rumah', '🏺'),
  photo('kuda', ['ku', 'da'], 'hewan', '♞'),
  photo('rusa', ['ru', 'sa'], 'hewan'),
  photo('sapi', ['sa', 'pi'], 'hewan'),

  // Picture album — three and four syllables
  photo('sepeda', ['se', 'pe', 'da'], 'kendaraan', '🚲'),
  photo('lemari', ['le', 'ma', 'ri'], 'rumah'),
  photo('kelapa', ['ke', 'la', 'pa'], 'makanan', '🥥'),
  photo('pepaya', ['pe', 'pa', 'ya'], 'makanan', '🍈'),
  photo('kamera', ['ka', 'me', 'ra'], 'benda', '📷'),
  photo('domino', ['do', 'mi', 'no'], 'benda', '🎲'),
  photo('selada', ['se', 'la', 'da'], 'makanan', '🥬'),
  photo('menara', ['me', 'na', 'ra'], 'benda', '🗼'),
  photo('perahu', ['pe', 'ra', 'hu'], 'kendaraan', '⛵'),
  photo('kereta', ['ke', 're', 'ta'], 'kendaraan', '🚂'),
  photo('cemara', ['ce', 'ma', 'ra'], 'alam', '🌲'),
  photo('rebana', ['re', 'ba', 'na'], 'benda', '🪘'),
  photo('karate', ['ka', 'ra', 'te'], 'lainnya', '🥋'),
  photo('kemeja', ['ke', 'me', 'ja'], 'benda', '👕'),
  photo('celana', ['ce', 'la', 'na'], 'benda', '👖'),
  photo('sepatu', ['se', 'pa', 'tu'], 'benda', '👟'),
  photo('melati', ['me', 'la', 'ti'], 'alam', '🌼'),
  photo('serabi', ['se', 'ra', 'bi'], 'makanan', '🥞'),
  photo('matahari', ['ma', 'ta', 'ha', 'ri'], 'alam', '☀️'),
  photo('kacamata', ['ka', 'ca', 'ma', 'ta'], 'benda', '👓'),

  // Bonus vocabulary — real words without an album slot
  word('baca', ['ba', 'ca'], 'lainnya'), photo('baki', ['ba', 'ki'], 'benda', '🍽️'),
  photo('batu', ['ba', 'tu'], 'alam', '🪨'), word('bawa', ['ba', 'wa'], 'lainnya'),
  word('bayi', ['ba', 'yi'], 'lainnya'), word('beda', ['be', 'da'], 'lainnya'),
  photo('besi', ['be', 'si'], 'benda', '🔩'), word('biru', ['bi', 'ru'], 'lainnya'),
  word('bisa', ['bi', 'sa'], 'lainnya'), word('bobo', ['bo', 'bo'], 'lainnya'),
  word('buka', ['bu', 'ka'], 'lainnya'), photo('bulu', ['bu', 'lu'], 'tubuh', '🪶'),
  photo('cuka', ['cu', 'ka'], 'makanan', '🧴'), word('cucu', ['cu', 'cu'], 'lainnya'),
  word('dada', ['da', 'da'], 'tubuh'), word('daki', ['da', 'ki'], 'tubuh'),
  word('dari', ['da', 'ri'], 'lainnya'), photo('dasi', ['da', 'si'], 'benda', '👔'),
  photo('duku', ['du', 'ku'], 'makanan', '🟡'), word('gaya', ['ga', 'ya'], 'lainnya'),
  photo('gigi', ['gi', 'gi'], 'tubuh', '🦷'), photo('gula', ['gu', 'la'], 'makanan', '🧂'),
  word('guru', ['gu', 'ru'], 'lainnya'), word('hari', ['ha', 'ri'], 'alam'),
  word('hati', ['ha', 'ti'], 'tubuh'), word('hawa', ['ha', 'wa'], 'alam'),
  word('hobi', ['ho', 'bi'], 'lainnya'), word('jaga', ['ja', 'ga'], 'lainnya'),
  photo('jala', ['ja', 'la'], 'benda', '🪢'), photo('jari', ['ja', 'ri'], 'tubuh', '☝️'),
  word('jeli', ['je', 'li'], 'lainnya'), photo('kaca', ['ka', 'ca'], 'benda', '🪟'),
  photo('kaki', ['ka', 'ki'], 'tubuh', '🦶'), word('kaku', ['ka', 'ku'], 'lainnya'),
  word('kali', ['ka', 'li'], 'lainnya'), word('kamu', ['ka', 'mu'], 'lainnya'),
  photo('kayu', ['ka', 'yu'], 'alam', '🪵'), photo('kera', ['ke', 'ra'], 'hewan', '🌿'),
  word('kilo', ['ki', 'lo'], 'lainnya'), word('kiri', ['ki', 'ri'], 'lainnya'),
  word('kita', ['ki', 'ta'], 'lainnya'), photo('kiwi', ['ki', 'wi'], 'makanan', '🥝'),
  word('koma', ['ko', 'ma'], 'benda'), word('kota', ['ko', 'ta'], 'lainnya'),
  photo('kuku', ['ku', 'ku'], 'tubuh', '💅'), photo('labu', ['la', 'bu'], 'makanan', '🟠'),
  photo('laci', ['la', 'ci'], 'rumah', '🗄️'), photo('lada', ['la', 'da'], 'makanan', '🧂'),
  word('laju', ['la', 'ju'], 'lainnya'), word('lari', ['la', 'ri'], 'lainnya'),
  photo('lava', ['la', 'va'], 'alam', '🌋'), photo('lele', ['le', 'le'], 'hewan', '🌊'),
  word('lima', ['li', 'ma'], 'lainnya'), word('luka', ['lu', 'ka'], 'tubuh'),
  word('lupa', ['lu', 'pa'], 'lainnya'), word('lusa', ['lu', 'sa'], 'lainnya'),
  word('maju', ['ma', 'ju'], 'lainnya'), word('mama', ['ma', 'ma'], 'lainnya'),
  word('mana', ['ma', 'na'], 'lainnya'), word('mari', ['ma', 'ri'], 'lainnya'),
  word('masa', ['ma', 'sa'], 'lainnya'), photo('mata', ['ma', 'ta'], 'tubuh', '👁️'),
  word('menu', ['me', 'nu'], 'makanan'), word('mika', ['mi', 'ka'], 'benda'),
  photo('muka', ['mu', 'ka'], 'tubuh', '🖼️'), word('nada', ['na', 'da'], 'lainnya'),
  word('naga', ['na', 'ga'], 'hewan'), word('nama', ['na', 'ma'], 'lainnya'),
  photo('nira', ['ni', 'ra'], 'makanan', '🥤'), word('noda', ['no', 'da'], 'benda'),
  photo('padi', ['pa', 'di'], 'alam', '🌾'), word('paha', ['pa', 'ha'], 'tubuh'),
  word('papa', ['pa', 'pa'], 'lainnya'), photo('pari', ['pa', 'ri'], 'hewan', '🌊'),
  word('paru', ['pa', 'ru'], 'tubuh'), photo('peti', ['pe', 'ti'], 'benda', '📦'),
  photo('pipi', ['pi', 'pi'], 'tubuh', '🔴'), photo('puma', ['pu', 'ma'], 'hewan', '🌿'),
  word('rabu', ['ra', 'bu'], 'lainnya'), word('raga', ['ra', 'ga'], 'tubuh'),
  word('raja', ['ra', 'ja'], 'lainnya'), word('rapi', ['ra', 'pi'], 'lainnya'),
  word('rasa', ['ra', 'sa'], 'lainnya'), word('ratu', ['ra', 'tu'], 'lainnya'),
  photo('rawa', ['ra', 'wa'], 'alam', '🌾'), word('ribu', ['ri', 'bu'], 'lainnya'),
  word('rupa', ['ru', 'pa'], 'lainnya'), photo('saku', ['sa', 'ku'], 'benda', '👖'),
  word('sari', ['sa', 'ri'], 'makanan'), word('satu', ['sa', 'tu'], 'lainnya'),
  photo('sawi', ['sa', 'wi'], 'makanan', '🥬'), photo('siku', ['si', 'ku'], 'tubuh', '💪'),
  word('sisi', ['si', 'si'], 'lainnya'), photo('soda', ['so', 'da'], 'makanan', '🥤'),
  word('suka', ['su', 'ka'], 'lainnya'), word('suku', ['su', 'ku'], 'lainnya'),
  word('tamu', ['ta', 'mu'], 'lainnya'), word('tari', ['ta', 'ri'], 'lainnya'),
  word('tata', ['ta', 'ta'], 'lainnya'), word('tawa', ['ta', 'wa'], 'lainnya'),
  photo('tebu', ['te', 'bu'], 'alam', '🎋'), word('tepi', ['te', 'pi'], 'lainnya'),
  word('tiga', ['ti', 'ga'], 'lainnya'), photo('tuna', ['tu', 'na'], 'hewan', '🌊'),
  word('wudu', ['wu', 'du'], 'lainnya'),

  word('bahasa', ['ba', 'ha', 'sa'], 'lainnya'),
  word('bahaya', ['ba', 'ha', 'ya'], 'lainnya'),
  word('bicara', ['bi', 'ca', 'ra'], 'lainnya'),
  photo('boneka', ['bo', 'ne', 'ka'], 'benda', '🎁'),
  word('budaya', ['bu', 'da', 'ya'], 'lainnya'),
  word('cahaya', ['ca', 'ha', 'ya'], 'alam'),
  word('cerita', ['ce', 'ri', 'ta'], 'lainnya'),
  word('jelaga', ['je', 'la', 'ga'], 'benda'),
  word('kepala', ['ke', 'pa', 'la'], 'tubuh'),
  photo('ketela', ['ke', 'te', 'la'], 'makanan', '🍠'),
  word('merica', ['me', 'ri', 'ca'], 'makanan'),
  word('negara', ['ne', 'ga', 'ra'], 'lainnya'),
  photo('pelita', ['pe', 'li', 'ta'], 'benda', '🪔'),
  word('peraga', ['pe', 'ra', 'ga'], 'benda'),
  word('perisa', ['pe', 'ri', 'sa'], 'makanan'),
  word('pidato', ['pi', 'da', 'to'], 'lainnya'),
  word('remaja', ['re', 'ma', 'ja'], 'lainnya'),
  word('sepupu', ['se', 'pu', 'pu'], 'lainnya'),
  word('tenaga', ['te', 'na', 'ga'], 'tubuh'),
  word('terasi', ['te', 'ra', 'si'], 'makanan'),
  word('wanita', ['wa', 'ni', 'ta'], 'lainnya'),
  word('wisata', ['wi', 'sa', 'ta'], 'lainnya'),

  // More common roots and productive child-facing forms. Possessive -ku and
  // simple di-/me-/pe- forms are kept explicit too: they are real words a child
  // encounters in short sentences, and their CV boundaries remain unambiguous.
  word('baja', ['ba', 'ja'], 'benda'), word('baru', ['ba', 'ru'], 'lainnya'),
  word('bibi', ['bi', 'bi'], 'lainnya'), word('buru', ['bu', 'ru'], 'lainnya'),
  word('cuci', ['cu', 'ci'], 'lainnya'), word('hama', ['ha', 'ma'], 'hewan'),
  word('hulu', ['hu', 'lu'], 'alam'), photo('layu', ['la', 'yu'], 'alam', '🍂'),
  photo('pagi', ['pa', 'gi'], 'alam', '🌅'), photo('teri', ['te', 'ri'], 'makanan', '🥫'),
  word('tiru', ['ti', 'ru'], 'lainnya'), photo('toga', ['to', 'ga'], 'benda', '🎓'),

  word('maduku', ['ma', 'du', 'ku'], 'makanan'), word('kopiku', ['ko', 'pi', 'ku'], 'makanan'),
  word('kejuku', ['ke', 'ju', 'ku'], 'makanan'), word('nasiku', ['na', 'si', 'ku'], 'makanan'),
  word('rotiku', ['ro', 'ti', 'ku'], 'makanan'), word('susuku', ['su', 'su', 'ku'], 'makanan'),
  word('sotoku', ['so', 'to', 'ku'], 'makanan'), word('sateku', ['sa', 'te', 'ku'], 'makanan'),
  word('tahuku', ['ta', 'hu', 'ku'], 'makanan'), word('bataku', ['ba', 'ta', 'ku'], 'rumah'),
  word('paluku', ['pa', 'lu', 'ku'], 'benda'), word('pakuku', ['pa', 'ku', 'ku'], 'benda'),
  word('sofaku', ['so', 'fa', 'ku'], 'rumah'), word('tekoku', ['te', 'ko', 'ku'], 'rumah'),
  word('tisuku', ['ti', 'su', 'ku'], 'benda'), word('pitaku', ['pi', 'ta', 'ku'], 'benda'),
  word('daduku', ['da', 'du', 'ku'], 'benda'), word('bukuku', ['bu', 'ku', 'ku'], 'benda'),
  word('mejaku', ['me', 'ja', 'ku'], 'rumah'), word('bolaku', ['bo', 'la', 'ku'], 'benda'),
  word('topiku', ['to', 'pi', 'ku'], 'benda'), word('bajuku', ['ba', 'ju', 'ku'], 'benda'),
  word('penaku', ['pe', 'na', 'ku'], 'benda'), word('rodaku', ['ro', 'da', 'ku'], 'kendaraan'),
  word('becaku', ['be', 'ca', 'ku'], 'kendaraan'), word('feriku', ['fe', 'ri', 'ku'], 'kendaraan'),
  word('petaku', ['pe', 'ta', 'ku'], 'benda'), word('tokoku', ['to', 'ko', 'ku'], 'rumah'),
  word('yoyoku', ['yo', 'yo', 'ku'], 'benda'), word('kadoku', ['ka', 'do', 'ku'], 'benda'),
  word('fotoku', ['fo', 'to', 'ku'], 'benda'), word('sapuku', ['sa', 'pu', 'ku'], 'rumah'),
  word('taliku', ['ta', 'li', 'ku'], 'benda'), word('guciku', ['gu', 'ci', 'ku'], 'rumah'),
  word('kudaku', ['ku', 'da', 'ku'], 'hewan'), word('rusaku', ['ru', 'sa', 'ku'], 'hewan'),
  word('sapiku', ['sa', 'pi', 'ku'], 'hewan'),

  word('sepedaku', ['se', 'pe', 'da', 'ku'], 'kendaraan'),
  word('lemariku', ['le', 'ma', 'ri', 'ku'], 'rumah'),
  word('kelapaku', ['ke', 'la', 'pa', 'ku'], 'makanan'),
  word('pepayaku', ['pe', 'pa', 'ya', 'ku'], 'makanan'),
  word('kameraku', ['ka', 'me', 'ra', 'ku'], 'benda'),
  word('dominoku', ['do', 'mi', 'no', 'ku'], 'benda'),
  word('seladaku', ['se', 'la', 'da', 'ku'], 'makanan'),
  word('menaraku', ['me', 'na', 'ra', 'ku'], 'benda'),
  word('perahuku', ['pe', 'ra', 'hu', 'ku'], 'kendaraan'),
  word('keretaku', ['ke', 're', 'ta', 'ku'], 'kendaraan'),
  word('cemaraku', ['ce', 'ma', 'ra', 'ku'], 'alam'),
  word('rebanaku', ['re', 'ba', 'na', 'ku'], 'benda'),
  word('karateku', ['ka', 'ra', 'te', 'ku'], 'lainnya'),
  word('kemejaku', ['ke', 'me', 'ja', 'ku'], 'benda'),
  word('celanaku', ['ce', 'la', 'na', 'ku'], 'benda'),
  word('sepatuku', ['se', 'pa', 'tu', 'ku'], 'benda'),
  word('melatiku', ['me', 'la', 'ti', 'ku'], 'alam'),
  word('serabiku', ['se', 'ra', 'bi', 'ku'], 'makanan'),

  word('dibaca', ['di', 'ba', 'ca'], 'lainnya'), word('dibawa', ['di', 'ba', 'wa'], 'lainnya'),
  word('dibeli', ['di', 'be', 'li'], 'lainnya'), word('dibuka', ['di', 'bu', 'ka'], 'lainnya'),
  word('dicuci', ['di', 'cu', 'ci'], 'lainnya'), word('diduga', ['di', 'du', 'ga'], 'lainnya'),
  word('digali', ['di', 'ga', 'li'], 'lainnya'), word('dijaga', ['di', 'ja', 'ga'], 'lainnya'),
  word('dikaji', ['di', 'ka', 'ji'], 'lainnya'), word('dikira', ['di', 'ki', 'ra'], 'lainnya'),
  word('dilaga', ['di', 'la', 'ga'], 'lainnya'), word('diluka', ['di', 'lu', 'ka'], 'lainnya'),
  word('dipaku', ['di', 'pa', 'ku'], 'benda'), word('dipalu', ['di', 'pa', 'lu'], 'benda'),
  word('dipicu', ['di', 'pi', 'cu'], 'lainnya'), word('dipuji', ['di', 'pu', 'ji'], 'lainnya'),
  word('diraba', ['di', 'ra', 'ba'], 'lainnya'), word('dirasa', ['di', 'ra', 'sa'], 'lainnya'),
  word('dirayu', ['di', 'ra', 'yu'], 'lainnya'), word('disapu', ['di', 'sa', 'pu'], 'rumah'),
  word('disela', ['di', 'se', 'la'], 'lainnya'), word('disewa', ['di', 'se', 'wa'], 'lainnya'),
  word('ditata', ['di', 'ta', 'ta'], 'lainnya'), word('ditiru', ['di', 'ti', 'ru'], 'lainnya'),
  word('dituju', ['di', 'tu', 'ju'], 'lainnya'), word('dibagi', ['di', 'ba', 'gi'], 'lainnya'),
  word('diberi', ['di', 'be', 'ri'], 'lainnya'), word('diburu', ['di', 'bu', 'ru'], 'lainnya'),
  word('difoto', ['di', 'fo', 'to'], 'benda'),

  word('melaju', ['me', 'la', 'ju'], 'lainnya'), word('melata', ['me', 'la', 'ta'], 'hewan'),
  word('melucu', ['me', 'lu', 'cu'], 'lainnya'), word('memadu', ['me', 'ma', 'du'], 'lainnya'),
  word('memaku', ['me', 'ma', 'ku'], 'benda'), word('memicu', ['me', 'mi', 'cu'], 'lainnya'),
  word('memuja', ['me', 'mu', 'ja'], 'lainnya'), word('menari', ['me', 'na', 'ri'], 'lainnya'),
  word('menata', ['me', 'na', 'ta'], 'lainnya'), word('menuju', ['me', 'nu', 'ju'], 'lainnya'),
  word('meniru', ['me', 'ni', 'ru'], 'lainnya'), word('meraba', ['me', 'ra', 'ba'], 'lainnya'),
  word('merasa', ['me', 'ra', 'sa'], 'lainnya'), word('merata', ['me', 'ra', 'ta'], 'lainnya'),
  word('merayu', ['me', 'ra', 'yu'], 'lainnya'), word('pelari', ['pe', 'la', 'ri'], 'lainnya'),
  word('pelaku', ['pe', 'la', 'ku'], 'lainnya'), word('pemalu', ['pe', 'ma', 'lu'], 'lainnya'),
  word('pemicu', ['pe', 'mi', 'cu'], 'lainnya'), word('pemuda', ['pe', 'mu', 'da'], 'lainnya'),
  word('penari', ['pe', 'na', 'ri'], 'lainnya'), word('penata', ['pe', 'na', 'ta'], 'lainnya'),
  word('peraba', ['pe', 'ra', 'ba'], 'lainnya'), word('perasa', ['pe', 'ra', 'sa'], 'lainnya'),
  word('perupa', ['pe', 'ru', 'pa'], 'lainnya')
];

const BY_WORD = new Map(KATA_CATALOG.map((entry) => [entry.w, entry]));

/** @param {string} w */
export function catalogEntry(w) {
  return BY_WORD.get(w.toLowerCase()) ?? null;
}

/** @param {string} w */
export function isRealWord(w) {
  return BY_WORD.has(w.toLowerCase());
}

export function albumWords() {
  return KATA_CATALOG.filter((entry) => entry.photo || entry.e);
}

/** @param {number} n */
export function wordsBySyllableCount(n) {
  return KATA_CATALOG.filter((entry) => entry.syl.length === n);
}

export function themeSections() {
  const album = albumWords();
  return KATA_THEMES.map((theme) => ({
    ...theme,
    words: album.filter((entry) => entry.theme === theme.key)
  })).filter((section) => section.words.length > 0);
}

export const CARI_KATA_PRAISE = ['Hebat!', 'Pintar!', 'Bagus sekali!', 'Luar biasa!'];
export const CARI_KATA_FUNNY = ['Hihihi, lucu ya!', 'Kata apa itu?', 'Aneh sekali!'];
export const CARI_KATA_LINES = [
  'Cari tiga kata', 'Geser dari kiri ke kanan atau dari atas ke bawah',
  'Coba cari kata lain', 'Semua kata ditemukan!'
];
export const CARI_KATA_HELP = 'Cara bermain Cari Kata. Pilih tingkat permainan. Cari kata di atas papan. Geser suku kata ke kanan atau ke bawah. Temukan tiga kata, lalu pilih satu kartu stiker.';

/** Strings generated in the dedicated whole-word/game-line audio bucket. */
export function cariKataTexts() {
  return [
    ...albumWords().map((entry) => entry.w),
    ...CARI_KATA_PRAISE,
    ...CARI_KATA_FUNNY,
    ...CARI_KATA_LINES,
    CARI_KATA_HELP
  ];
}
