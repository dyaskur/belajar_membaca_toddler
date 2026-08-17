/**
 * Shared word catalog for the syllable games (Cari Kata today, Susun Suku Kata next).
 *
 * Every entry is stored as its EXPLICIT syllable breakdown (`'ke-la-pa'`), never as a bare
 * word we later re-split: the games read words by chaining syllable clips, the album prints
 * `ke · la · pa`, and a wrong split would be heard by the child, not just seen.
 *
 * v1 SCOPE — OPEN SYLLABLES ONLY. Every syllable must be a consonant + vowel pair that
 * already has a committed clip in the level-2 audio bucket ({@link SYLLABLES}). That rules
 * out, for now:
 *   - closed syllables (`bun`, `tas`, `rumah`)      → level 4 audio, later hard mode
 *   - `ng`/`ny`/`sy`/`kh` and consonant clusters    → level 5/7 audio, later hard mode
 *   - words with a bare-vowel syllable (`i-bu`, `a-pi`, `bu-a-ya`)
 *   - diphthongs (`ca-bai`, `pi-sau`)
 * The constraint is severe — it costs us `kucing`, `ibu`, `bunga` and most closed-syllable
 * vocabulary — but it guarantees every word in here can be spoken offline today, either from
 * a whole-word clip or by chaining syllables. Widen the inventory before widening the list.
 *
 * CURATION RULES for new entries:
 *   - everyday, concrete vocabulary a 3–6 year old can be told about
 *   - standard spelling (KBBI); no slang, regional forms, names, places, or abbreviations
 *   - nothing a parent would not want read aloud — see {@link UNSAFE_WORDS}
 *   - one entry per spelling. Homonyms (`tahu` = tofu / to know) pick the child-friendly
 *     meaning and live in one theme only.
 *
 * Only entries with a picture ({@link EMOJI} or {@link PHOTO_WORDS}) are collectible in the
 * album and usable as board targets; the rest are still read aloud and counted as bonus
 * finds. See #99.
 */

/** Consonants that have an open-syllable clip for every vowel in the level-2 bucket. */
const CONSONANTS = ['b', 'c', 'd', 'f', 'g', 'h', 'j', 'k', 'l', 'm', 'n', 'p', 'r', 's', 't', 'v', 'w', 'y', 'z'];
const VOWELS = ['a', 'e', 'i', 'o', 'u'];

/**
 * The 95 open syllables a board cell may hold. Matches the committed clips in
 * `static/audio/{voice}/2/` exactly — adding one here without generating audio would make
 * a cell unreadable.
 * @type {string[]}
 */
export const SYLLABLES = CONSONANTS.flatMap((c) => VOWELS.map((v) => c + v));

const SYLLABLE_SET = new Set(SYLLABLES);

/** @param {string} syllable */
export function isKnownSyllable(syllable) {
  return SYLLABLE_SET.has(syllable);
}

/**
 * Words that must never be spoken, collected, or formed by a generated board. Rude, adult,
 * or insulting terms that the open-syllable inventory can actually spell — a board is
 * regenerated when any straight run spells one of these.
 *
 * Kept deliberately blunt so it is auditable; it is never shown to a child.
 * @type {string[]}
 */
export const UNSAFE_WORDS = [
  // pre-existing Mesin Kata list
  'babi', 'gila', 'bego', 'mati', 'puki', 'tahi', 'tai',
  // insults
  'bodo',
  // adult / crude
  'coli', 'ewe', 'peju', 'pepe', 'tete', 'zina',
  // vice
  'judi', 'sabu'
];

const UNSAFE_SET = new Set(UNSAFE_WORDS);

/** @param {string} word */
export function isUnsafeWord(word) {
  return UNSAFE_SET.has(word);
}

/**
 * @typedef {'makanan'|'hewan'|'tubuh'|'rumah'|'benda'|'alam'|'jalan'|'orang'|'lainnya'} Theme
 * @typedef {{ w: string, syl: string[], theme: Theme, e?: string, photo: boolean }} CatalogWord
 */

/**
 * Album shelves, in display order. `lainnya` holds picture-less words and never shows up.
 * @type {{ key: Theme, title: string, icon: string }[]}
 */
export const THEMES = [
  { key: 'makanan', title: 'Makanan', icon: '🍚' },
  { key: 'hewan', title: 'Hewan', icon: '🐾' },
  { key: 'tubuh', title: 'Tubuh Kita', icon: '🦷' },
  { key: 'rumah', title: 'Di Rumah', icon: '🏠' },
  { key: 'benda', title: 'Mainan & Baju', icon: '🎈' },
  { key: 'alam', title: 'Alam', icon: '🌿' },
  { key: 'jalan', title: 'Di Jalan', icon: '🚲' },
  { key: 'orang', title: 'Orang', icon: '👋' },
  { key: 'lainnya', title: 'Kata Lain', icon: '✨' }
];

/**
 * The catalog itself: syllable-split words per theme. Keep each list alphabetical-ish by
 * sound so gaps are easy to spot when curating.
 * @type {Record<Theme, string[]>}
 */
const THEME_WORDS = {
  makanan: [
    'na-si', 'ro-ti', 'su-su', 'gu-la', 'sa-gu', 'ta-hu', 'so-to', 'sa-te', 'ko-pi',
    'ke-ju', 'ma-du', 'ka-ri', 'so-da', 'sa-ri', 'te-ri', 'du-ku', 'sa-wo', 'le-ci',
    'ki-wi', 'pa-re', 'la-bu', 'te-bu', 'sa-wi', 'la-da', 'ja-he', 'pa-la', 'cu-ka',
    'je-li', 'ce-ri', 'ta-pe', 'ke-la-pa', 'pe-pa-ya', 'se-ra-bi', 'gu-la-li', 'de-li-ma'
  ],
  hewan: [
    'sa-pi', 'ku-da', 'ke-ra', 'ru-sa', 'na-ga', 'ku-tu', 'nu-ri', 'le-le', 'tu-na',
    'cu-mi', 'ni-la', 'pa-ri', 'gu-ri-ta', 'gu-ra-me', 'ko-mo-do', 'se-ri-ga-la'
  ],
  tubuh: [
    'ma-ta', 'ka-ki', 'da-da', 'gi-gi', 'ha-ti', 'da-gu', 'ba-hu', 'ku-ku', 'ja-ri',
    'mu-ka', 'pi-pi', 'da-hi', 'si-ku', 'pa-ha', 'bu-lu', 'na-di', 'ke-pa-la'
  ],
  rumah: [
    'me-ja', 'so-fa', 'la-ci', 'sa-pu', 'te-ko', 'gu-ci', 'ti-su', 'pa-lu', 'pa-ku',
    'ta-li', 'ka-ca', 'bu-sa', 'ja-la', 'fo-to', 'le-ma-ri', 'ka-me-ra', 'ga-ra-si',
    'pi-gu-ra', 'te-le-vi-si'
  ],
  benda: [
    'bo-la', 'bu-ku', 'pe-na', 'pe-ta', 'da-du', 'yo-yo', 'ka-do', 'pi-ta', 'to-pi',
    'ba-ju', 'da-si', 'ro-da', 'ba-tu', 'ba-ta', 'ka-yu', 'be-si', 'ba-ja', 'ce-la-na',
    'se-pa-tu', 'bo-ne-ka', 're-ba-na', 'ke-ca-pi', 'su-te-ra', 'ka-ca-ma-ta'
  ],
  alam: [
    'bu-mi', 'de-bu', 'du-ri', 'bi-ji', 'la-va', 'ra-wa', 'ba-ra', 'pa-di', 'ca-ha-ya',
    'ce-ma-ra', 'me-la-ti', 'ma-ta-ha-ri'
  ],
  jalan: [
    'ko-ta', 'de-sa', 'to-ko', 'ka-no', 'vi-la', 'se-pe-da', 'ke-re-ta', 'pe-ra-hu',
    'me-na-ra', 'ne-ga-ra'
  ],
  orang: [
    'ma-ma', 'pa-pa', 'bi-bi', 'cu-cu', 'ba-yi', 'ta-mu', 'gu-ru', 'ko-ki', 'ju-ri',
    'no-na', 'ra-ja', 'ra-tu', 'pe-mu-da', 'pe-na-ri', 'pe-ta-ni', 'po-li-si', 'wa-ni-ta'
  ],
  // No pictures by design: these are the bonus-word pool. They still have to be readable,
  // so the open-syllable rule applies here too.
  lainnya: [
    'ba-ca', 'bu-ka', 'ba-wa', 'be-ri', 'be-li', 'ba-gi', 'co-ba', 'ca-ri', 'cu-ci',
    'la-ri', 'ta-ri', 'ja-ga', 'lu-pa', 'su-ka', 'bi-sa', 'ke-na', 'sa-pa', 'ra-ba',
    'ki-ra', 'lu-ka', 'ra-sa', 'la-gu', 'ka-ta', 'na-ma', 'ha-ri', 'pa-gi', 'so-re',
    'lu-sa', 'ki-ni', 'sa-tu', 'ti-ga', 'li-ma', 'bi-ru',
    'ma-lu', 'lu-cu', 'se-ru', 'ka-ya', 'mu-da', 'ba-ru', 'la-ma', 'se-pi', 'ka-ku',
    'sa-ya', 'ka-mu', 'ki-ta', 'ka-mi', 'si-ni', 'si-tu', 'sa-na', 'ma-na', 'ju-ga',
    'sa-ja', 'la-gi', 'ma-ri', 'du-lu', 'ta-di', 'ja-di', 'bi-la', 'ma-ka', 'sa-ma',
    'be-da', 'bo-bo', 'te-ri-ma', 'ce-ri-ta', 'ba-ha-sa', 'be-ra-ni', 'ke-li-ru',
    'ke-na-pa', 'te-ta-pi', 'ke-ma-ri', 'se-ka-li', 'se-ri-bu', 'su-pa-ya', 'ka-re-na'
  ]
};

/**
 * Faceless emoji per word. ANICONISM (see AGENTS.md): emoji must be objects, food, plants,
 * nature or celestial — never a face of a living being. That is why no animal, person, or
 * body-part emoji appears here even though those themes exist; those words wait for a real
 * photo instead, where faces ARE allowed (#99).
 * @type {Record<string, string>}
 */
const EMOJI = {
  // makanan
  nasi: '🍚', roti: '🍞', susu: '🥛', sate: '🍢', kopi: '☕', keju: '🧀', madu: '🍯',
  kari: '🍛', soda: '🥤', kiwi: '🥝', sawi: '🥬', jahe: '🫚', ceri: '🍒', kelapa: '🥥',
  // tubuh
  gigi: '🦷',
  // rumah
  sofa: '🛋️', sapu: '🧹', teko: '🫖', guci: '🏺', tisu: '🧻', palu: '🔨', paku: '📌',
  tali: '🪢', foto: '🖼️', lemari: '🗄️', kamera: '📷', televisi: '📺',
  // benda
  bola: '⚽', buku: '📖', pena: '🖊️', peta: '🗺️', dadu: '🎲', yoyo: '🪀', kado: '🎁',
  pita: '🎀', topi: '👒', baju: '👕', dasi: '👔', roda: '🛞', batu: '🪨', bata: '🧱',
  kayu: '🪵', celana: '👖', sepatu: '👟', rebana: '🪘', kacamata: '👓',
  // alam
  bumi: '🌍', lava: '🌋', padi: '🌾', cemara: '🌲', melati: '🌼', matahari: '☀️',
  // jalan
  kota: '🏙️', desa: '🏡', toko: '🏪', sepeda: '🚲', kereta: '🚃', perahu: '🛶', menara: '🗼'
};

/**
 * Words whose curated photo exists in `static/kata/{w}.webp` (+ `sil/{w}.webp`).
 *
 * Empty until the curation pass lands the art — a word listed here without its file would
 * render a broken tile in the album. Reuse candidates already sitting in `static/stickers/`
 * and waiting to be copied over: baju, bola, buku, celana, gigi, kuda, lemari, matahari,
 * meja, nasi, nuri, pena, roti, rusa, sapi, sepatu, sepeda, susu, topi, yoyo.
 * @type {Set<string>}
 */
export const PHOTO_WORDS = new Set([]);

/** @type {CatalogWord[]} */
export const WORD_CATALOG = THEMES.flatMap(({ key }) =>
  THEME_WORDS[key].map((spec) => {
    const syl = spec.split('-');
    const w = syl.join('');
    return { w, syl, theme: key, e: EMOJI[w], photo: PHOTO_WORDS.has(w) };
  })
);

/** @type {Map<string, CatalogWord>} */
const BY_WORD = new Map(WORD_CATALOG.map((entry) => [entry.w, entry]));

/** The catalog entry for a word, or undefined if it isn't a word we recognize. @param {string} w */
export function catalogEntry(w) {
  return BY_WORD.get(w);
}

/** Is this a real Indonesian word the games should celebrate? @param {string} w */
export function isRealWord(w) {
  return BY_WORD.has(w);
}

/** Does this word have any picture — a curated photo or a faceless emoji? @param {CatalogWord} entry */
export function hasPicture(entry) {
  return entry.photo || Boolean(entry.e);
}

/**
 * Words collectible in Album Kata, and the only words a board may use as a target: a target
 * must always be able to hand back a card the child can see.
 */
export function albumWords() {
  return WORD_CATALOG.filter(hasPicture);
}

/** Album words for one shelf, in catalog order. @param {Theme} theme */
export function albumWordsForTheme(theme) {
  return albumWords().filter((entry) => entry.theme === theme);
}

/** Themes that actually have collectible words, for rendering the album shelves. */
export function albumThemes() {
  return THEMES.filter(({ key }) => albumWordsForTheme(key).length > 0);
}

/** Catalog words of a given syllable length. @param {number} n */
export function wordsBySyllableCount(n) {
  return WORD_CATALOG.filter((entry) => entry.syl.length === n);
}

/** Album (targetable) words of a given syllable length. @param {number} n */
export function albumWordsBySyllableCount(n) {
  return albumWords().filter((entry) => entry.syl.length === n);
}

/** `ku · da` — the breakdown shown on an album card. @param {CatalogWord} entry */
export function syllableLabel(entry) {
  return entry.syl.join(' · ');
}
