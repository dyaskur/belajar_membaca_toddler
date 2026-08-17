/**
 * Shared word catalog for Cari Kata (and later Susun Suku Kata, #98).
 *
 * The catalog is the single authoritative "real word" list for the games: a
 * hand-curated, child-safe set of Indonesian words, each with an EXPLICIT
 * syllable breakdown (`syl`) that is used for board placement, the album's
 * "ku · da" display, and chained audio. Syllables are never auto-derived —
 * the game can only place a word if every syllable exists in the level-2 open
 * syllable inventory (single consonant + vowel), so this module guarantees
 * that by construction (see the unit tests).
 *
 * Curation rules: everyday, concrete vocabulary a 3–6 year old can be told
 * about. Excluded: names, places, slang, regional/nonstandard spellings,
 * abstract or adult vocabulary, and anything a parent would not want read aloud.
 *
 * Album membership = a word has either a faceless emoji (`e`) or a curated
 * photo (`photo: true`). Words with neither are still real (bonus finds) but
 * never get an album card. Real photographs may contain human/animal faces
 * (see AGENTS.md); emoji here stay faceless.
 *
 * @typedef {'makanan'|'hewan'|'rumah'|'alam'|'tubuh'|'benda'|'kendaraan'|'lainnya'} KataTheme
 * @typedef {{ w: string, syl: string[], theme: KataTheme, e?: string, photo?: boolean, notes?: string }} CatalogWord
 */

/** Album section order + heading for the Cari Kata tab in Buku Stiker. */
export const KATA_THEMES = /** @type {{ key: KataTheme, title: string, icon: string }[]} */ ([
  { key: 'makanan', title: 'Makanan', icon: '🍎' },
  { key: 'hewan', title: 'Hewan', icon: '🐾' },
  { key: 'rumah', title: 'Rumah', icon: '🏠' },
  { key: 'alam', title: 'Alam', icon: '🌿' },
  { key: 'tubuh', title: 'Tubuh', icon: '🦴' },
  { key: 'benda', title: 'Benda', icon: '📦' },
  { key: 'kendaraan', title: 'Kendaraan', icon: '🚗' },
  { key: 'lainnya', title: 'Lainnya', icon: '⭐' }
]);

/**
 * Words that must NEVER be spelled by a board run (or a chained reading).
 * Moved out of `mesin.js` so both games share one list; extended for the wider
 * catalog. Every entry is enforced by the board generator's safety pass.
 */
export const UNSAFE_WORDS = [
  'babi', 'gila', 'bego', 'mati', 'puki', 'tahi',
  // Adult / slang additions for the larger board wordspace. Only entries whose
  // syllables are all open (CV) are useful — a closed-syllable word can never be
  // spelled by a run of CV tiles, so it would never match the safety pass anyway.
  // ('tai' is likewise excluded: t-a-i needs a lone-vowel tile that boards lack.)
  'mani', 'judi', 'tato', 'tete', 'gelo', 'neraka', 'bini'
];

/**
 * Raw catalog rows. `emoji` is optional and must be FACELESS (see AGENTS.md).
 * A row without an emoji is an album word only when it carries `photo: true` —
 * animal/photo-only concepts stay out of the album until curated, exactly like
 * today's creature stickers (they render ❓, never a faced drawing).
 *
 * Format: `[w, syl[], theme, emoji?]` — or an object for rows that need
 * `photo: true` / `notes`. `w` must equal `syl.join('')` (test-asserted).
 */
/** @type {([string, string[], KataTheme, string?] | { w: string, syl: string[], theme: KataTheme, e?: string, photo?: boolean, notes?: string })[]} */
const ROWS = [
  // ── Makanan ────────────────────────────────────────────────────────────────
  ['nasi', ['na', 'si'], 'makanan', '🍚'],
  ['susu', ['su', 'su'], 'makanan', '🥛'],
  ['roti', ['ro', 'ti'], 'makanan', '🍞'],
  ['sate', ['sa', 'te'], 'makanan', '🍢'],
  ['soto', ['so', 'to'], 'makanan', '🍲'],
  ['kopi', ['ko', 'pi'], 'makanan', '☕'],
  ['madu', ['ma', 'du'], 'makanan', '🍯'],
  ['keju', ['ke', 'ju'], 'makanan', '🧀'],
  { w: 'tahu', syl: ['ta', 'hu'], theme: 'makanan', photo: true },
  { w: 'gula', syl: ['gu', 'la'], theme: 'makanan', photo: true },
  { w: 'cuka', syl: ['cu', 'ka'], theme: 'makanan', photo: true },
  { w: 'jahe', syl: ['ja', 'he'], theme: 'makanan', photo: true },
  { w: 'lada', syl: ['la', 'da'], theme: 'makanan', photo: true },
  { w: 'pare', syl: ['pa', 're'], theme: 'makanan', photo: true },
  { w: 'sawo', syl: ['sa', 'wo'], theme: 'makanan', photo: true },
  { w: 'sagu', syl: ['sa', 'gu'], theme: 'makanan', photo: true },
  { w: 'jeli', syl: ['je', 'li'], theme: 'makanan', photo: true },
  { w: 'pepaya', syl: ['pe', 'pa', 'ya'], theme: 'makanan', photo: true },
  { w: 'jamu', syl: ['ja', 'mu'], theme: 'makanan', photo: true },
  { w: 'kari', syl: ['ka', 'ri'], theme: 'makanan', photo: true },
  { w: 'labu', syl: ['la', 'bu'], theme: 'makanan', photo: true },
  { w: 'pala', syl: ['pa', 'la'], theme: 'makanan', photo: true },
  { w: 'leci', syl: ['le', 'ci'], theme: 'makanan', photo: true },
  { w: 'terasi', syl: ['te', 'ra', 'si'], theme: 'makanan', photo: true },
  { w: 'merica', syl: ['me', 'ri', 'ca'], theme: 'makanan', photo: true },

  // ── Hewan (photos only — no faced animal emoji) ────────────────────────────
  { w: 'sapi', syl: ['sa', 'pi'], theme: 'hewan', photo: true },
  { w: 'rusa', syl: ['ru', 'sa'], theme: 'hewan', photo: true },
  { w: 'kuda', syl: ['ku', 'da'], theme: 'hewan', photo: true },
  { w: 'kera', syl: ['ke', 'ra'], theme: 'hewan', photo: true },
  { w: 'lele', syl: ['le', 'le'], theme: 'hewan', photo: true },
  { w: 'tuna', syl: ['tu', 'na'], theme: 'hewan', photo: true },
  { w: 'teri', syl: ['te', 'ri'], theme: 'hewan', photo: true },
  { w: 'nila', syl: ['ni', 'la'], theme: 'hewan', photo: true },
  { w: 'cumi', syl: ['cu', 'mi'], theme: 'hewan', photo: true },
  { w: 'nuri', syl: ['nu', 'ri'], theme: 'hewan', photo: true },
  { w: 'kala', syl: ['ka', 'la'], theme: 'hewan', photo: true },
  { w: 'dara', syl: ['da', 'ra'], theme: 'hewan', photo: true },
  { w: 'pari', syl: ['pa', 'ri'], theme: 'hewan', photo: true },
  { w: 'gurita', syl: ['gu', 'ri', 'ta'], theme: 'hewan', photo: true },
  { w: 'gurame', syl: ['gu', 'ra', 'me'], theme: 'hewan', photo: true },
  { w: 'gorila', syl: ['go', 'ri', 'la'], theme: 'hewan', photo: true },
  { w: 'komodo', syl: ['ko', 'mo', 'do'], theme: 'hewan', photo: true },

  // ── Rumah ──────────────────────────────────────────────────────────────────
  ['sofa', ['so', 'fa'], 'rumah', '🛋️'],
  ['teko', ['te', 'ko'], 'rumah', '🫖'],
  ['tisu', ['ti', 'su'], 'rumah', '🧻'],
  ['pita', ['pi', 'ta'], 'rumah', '🎀'],
  ['sapu', ['sa', 'pu'], 'rumah', '🧹'],
  ['palu', ['pa', 'lu'], 'rumah', '🔨'],
  ['paku', ['pa', 'ku'], 'rumah', '📌'],
  ['kado', ['ka', 'do'], 'rumah', '🎁'],
  ['baju', ['ba', 'ju'], 'rumah', '👕'],
  ['foto', ['fo', 'to'], 'rumah', '🖼️'],
  ['guci', ['gu', 'ci'], 'rumah', '🏺'],
  ['dasi', ['da', 'si'], 'rumah', '👔'],
  ['celana', ['ce', 'la', 'na'], 'rumah', '👖'],
  { w: 'saku', syl: ['sa', 'ku'], theme: 'rumah', photo: true },
  { w: 'meja', syl: ['me', 'ja'], theme: 'rumah', photo: true },
  { w: 'kaca', syl: ['ka', 'ca'], theme: 'rumah', photo: true },
  { w: 'peci', syl: ['pe', 'ci'], theme: 'rumah', photo: true },
  { w: 'koko', syl: ['ko', 'ko'], theme: 'rumah', photo: true },
  { w: 'pipa', syl: ['pi', 'pa'], theme: 'rumah', photo: true },
  { w: 'laci', syl: ['la', 'ci'], theme: 'rumah', photo: true },
  { w: 'poci', syl: ['po', 'ci'], theme: 'rumah', photo: true },
  { w: 'baki', syl: ['ba', 'ki'], theme: 'rumah', photo: true },
  { w: 'kemeja', syl: ['ke', 'me', 'ja'], theme: 'rumah', photo: true },
  { w: 'kebaya', syl: ['ke', 'ba', 'ya'], theme: 'rumah', photo: true },
  { w: 'sepatu', syl: ['se', 'pa', 'tu'], theme: 'rumah', e: '👟' },

  // ── Alam ───────────────────────────────────────────────────────────────────
  ['batu', ['ba', 'tu'], 'alam', '🪨'],
  ['bumi', ['bu', 'mi'], 'alam', '🌍'],
  ['kayu', ['ka', 'yu'], 'alam', '🪵'],
  ['tali', ['ta', 'li'], 'alam', '🪢'],
  ['matahari', ['ma', 'ta', 'ha', 'ri'], 'alam', '☀️'],
  { w: 'rawa', syl: ['ra', 'wa'], theme: 'alam', photo: true },
  { w: 'debu', syl: ['de', 'bu'], theme: 'alam', photo: true },
  { w: 'bara', syl: ['ba', 'ra'], theme: 'alam', photo: true },
  { w: 'biji', syl: ['bi', 'ji'], theme: 'alam', photo: true },
  { w: 'sabana', syl: ['sa', 'ba', 'na'], theme: 'alam', photo: true },
  { w: 'samudera', syl: ['sa', 'mu', 'de', 'ra'], theme: 'alam', photo: true },

  // ── Tubuh ──────────────────────────────────────────────────────────────────
  ['gigi', ['gi', 'gi'], 'tubuh', '🦷'],
  ['kaki', ['ka', 'ki'], 'tubuh', '🦶'],
  { w: 'kepala', syl: ['ke', 'pa', 'la'], theme: 'tubuh', photo: true },
  { w: 'mata', syl: ['ma', 'ta'], theme: 'tubuh', photo: true },
  { w: 'pipi', syl: ['pi', 'pi'], theme: 'tubuh', photo: true },
  { w: 'dada', syl: ['da', 'da'], theme: 'tubuh', photo: true },
  { w: 'siku', syl: ['si', 'ku'], theme: 'tubuh', photo: true },
  { w: 'paha', syl: ['pa', 'ha'], theme: 'tubuh', photo: true },
  { w: 'bahu', syl: ['ba', 'hu'], theme: 'tubuh', photo: true },
  { w: 'gusi', syl: ['gu', 'si'], theme: 'tubuh', photo: true },
  { w: 'bulu', syl: ['bu', 'lu'], theme: 'tubuh', photo: true },
  { w: 'dagu', syl: ['da', 'gu'], theme: 'tubuh', photo: true },
  { w: 'paru', syl: ['pa', 'ru'], theme: 'tubuh', photo: true },
  { w: 'hati', syl: ['ha', 'ti'], theme: 'tubuh', photo: true },
  { w: 'kuku', syl: ['ku', 'ku'], theme: 'tubuh', photo: true },
  { w: 'dahi', syl: ['da', 'hi'], theme: 'tubuh', photo: true },

  // ── Benda ──────────────────────────────────────────────────────────────────
  ['bola', ['bo', 'la'], 'benda', '⚽'],
  ['buku', ['bu', 'ku'], 'benda', '📖'],
  ['topi', ['to', 'pi'], 'benda', '👒'],
  ['pena', ['pe', 'na'], 'benda', '🖊️'],
  ['bata', ['ba', 'ta'], 'benda', '🧱'],
  ['roda', ['ro', 'da'], 'benda', '🛞'],
  ['dadu', ['da', 'du'], 'benda', '🎲'],
  ['peta', ['pe', 'ta'], 'benda', '🗺️'],
  ['toko', ['to', 'ko'], 'benda', '🏪'],
  ['medali', ['me', 'da', 'li'], 'benda', '🏅'],
  ['kamera', ['ka', 'me', 'ra'], 'benda', '📷'],
  ['lagu', ['la', 'gu'], 'benda', '🎵'],
  ['nada', ['na', 'da'], 'benda', '🎵'],
  ['kata', ['ka', 'ta'], 'benda', '💬'],
  ['raja', ['ra', 'ja'], 'lainnya', '👑'],
  ['ratu', ['ra', 'tu'], 'lainnya', '👑'],
  { w: 'peti', syl: ['pe', 'ti'], theme: 'benda', photo: true },
  { w: 'tugu', syl: ['tu', 'gu'], theme: 'benda', photo: true },
  { w: 'boneka', syl: ['bo', 'ne', 'ka'], theme: 'benda', photo: true },
  { w: 'tari', syl: ['ta', 'ri'], theme: 'benda', photo: true },
  { w: 'cuci', syl: ['cu', 'ci'], theme: 'benda', photo: true },
  { w: 'lari', syl: ['la', 'ri'], theme: 'benda', photo: true },
  { w: 'nama', syl: ['na', 'ma'], theme: 'benda', photo: true },
  { w: 'pagi', syl: ['pa', 'gi'], theme: 'benda', photo: true },
  { w: 'sore', syl: ['so', 're'], theme: 'benda', photo: true },
  { w: 'hari', syl: ['ha', 'ri'], theme: 'benda', photo: true },
  { w: 'tifa', syl: ['ti', 'fa'], theme: 'benda', photo: true },
  { w: 'garu', syl: ['ga', 'ru'], theme: 'benda', photo: true },
  { w: 'goni', syl: ['go', 'ni'], theme: 'benda', photo: true },
  { w: 'pura', syl: ['pu', 'ra'], theme: 'benda', photo: true },
  { w: 'gereja', syl: ['ge', 're', 'ja'], theme: 'benda', photo: true },
  { w: 'vihara', syl: ['vi', 'ha', 'ra'], theme: 'benda', photo: true },
  { w: 'pelana', syl: ['pe', 'la', 'na'], theme: 'benda', photo: true },
  { w: 'kemudi', syl: ['ke', 'mu', 'di'], theme: 'benda', photo: true },
  { w: 'dinamo', syl: ['di', 'na', 'mo'], theme: 'benda', photo: true },

  // ── Kendaraan ──────────────────────────────────────────────────────────────
  ['sepeda', ['se', 'pe', 'da'], 'kendaraan', '🚲'],
  ['kereta', ['ke', 're', 'ta'], 'kendaraan', '🚆'],
  ['perahu', ['pe', 'ra', 'hu'], 'kendaraan', '⛵'],
  { w: 'bemo', syl: ['be', 'mo'], theme: 'kendaraan', photo: true },
  { w: 'kano', syl: ['ka', 'no'], theme: 'kendaraan', photo: true },
  { w: 'feri', syl: ['fe', 'ri'], theme: 'kendaraan', photo: true },

  // ── Lainnya (people, roles, misc) ──────────────────────────────────────────
  { w: 'bibi', syl: ['bi', 'bi'], theme: 'lainnya', photo: true },
  { w: 'guru', syl: ['gu', 'ru'], theme: 'lainnya', photo: true },
  { w: 'koki', syl: ['ko', 'ki'], theme: 'lainnya', photo: true },
  { w: 'petani', syl: ['pe', 'ta', 'ni'], theme: 'lainnya', photo: true },
  { w: 'polisi', syl: ['po', 'li', 'si'], theme: 'lainnya', photo: true },
  { w: 'bayi', syl: ['ba', 'yi'], theme: 'lainnya', photo: true },
  { w: 'judo', syl: ['ju', 'do'], theme: 'lainnya', photo: true },
  { w: 'karate', syl: ['ka', 'ra', 'te'], theme: 'lainnya', photo: true },
  { w: 'seri', syl: ['se', 'ri'], theme: 'lainnya', photo: true },
  { w: 'lama', syl: ['la', 'ma'], theme: 'lainnya', photo: true },
  { w: 'negara', syl: ['ne', 'ga', 'ra'], theme: 'lainnya', photo: true },

  // ── Bonus words: real, but no picture → praise + Kata Bonus counter ────────
  { w: 'satu', syl: ['sa', 'tu'], theme: 'lainnya', notes: 'bonus' },
  { w: 'tiga', syl: ['ti', 'ga'], theme: 'lainnya', notes: 'bonus' },
  { w: 'lima', syl: ['li', 'ma'], theme: 'lainnya', notes: 'bonus' },
  { w: 'baca', syl: ['ba', 'ca'], theme: 'lainnya', notes: 'bonus' },
  { w: 'buka', syl: ['bu', 'ka'], theme: 'lainnya', notes: 'bonus' },
  { w: 'sama', syl: ['sa', 'ma'], theme: 'lainnya', notes: 'bonus' },
  { w: 'suka', syl: ['su', 'ka'], theme: 'lainnya', notes: 'bonus' },
  { w: 'malu', syl: ['ma', 'lu'], theme: 'lainnya', notes: 'bonus' },
  { w: 'bisa', syl: ['bi', 'sa'], theme: 'lainnya', notes: 'bonus' },
  { w: 'lagi', syl: ['la', 'gi'], theme: 'lainnya', notes: 'bonus' },
  { w: 'jadi', syl: ['ja', 'di'], theme: 'lainnya', notes: 'bonus' },
  { w: 'juga', syl: ['ju', 'ga'], theme: 'lainnya', notes: 'bonus' },
  { w: 'kita', syl: ['ki', 'ta'], theme: 'lainnya', notes: 'bonus' },
  { w: 'kamu', syl: ['ka', 'mu'], theme: 'lainnya', notes: 'bonus' },
  { w: 'saya', syl: ['sa', 'ya'], theme: 'lainnya', notes: 'bonus' },
  { w: 'tadi', syl: ['ta', 'di'], theme: 'lainnya', notes: 'bonus' },
  { w: 'kini', syl: ['ki', 'ni'], theme: 'lainnya', notes: 'bonus' },
  { w: 'sana', syl: ['sa', 'na'], theme: 'lainnya', notes: 'bonus' },
  { w: 'situ', syl: ['si', 'tu'], theme: 'lainnya', notes: 'bonus' },
  { w: 'sini', syl: ['si', 'ni'], theme: 'lainnya', notes: 'bonus' },
  { w: 'cuma', syl: ['cu', 'ma'], theme: 'lainnya', notes: 'bonus' },
  { w: 'dulu', syl: ['du', 'lu'], theme: 'lainnya', notes: 'bonus' },
  { w: 'kaya', syl: ['ka', 'ya'], theme: 'lainnya', notes: 'bonus' },
  { w: 'muda', syl: ['mu', 'da'], theme: 'lainnya', notes: 'bonus' },
  { w: 'kiri', syl: ['ki', 'ri'], theme: 'lainnya', notes: 'bonus' },
  { w: 'kota', syl: ['ko', 'ta'], theme: 'lainnya', notes: 'bonus' },
  { w: 'muka', syl: ['mu', 'ka'], theme: 'lainnya', notes: 'bonus' },
  { w: 'gaji', syl: ['ga', 'ji'], theme: 'lainnya', notes: 'bonus' },
  { w: 'baru', syl: ['ba', 'ru'], theme: 'lainnya', notes: 'bonus' },
  { w: 'maju', syl: ['ma', 'ju'], theme: 'lainnya', notes: 'bonus' },
  { w: 'selasa', syl: ['se', 'la', 'sa'], theme: 'lainnya', notes: 'bonus' },
  { w: 'rabu', syl: ['ra', 'bu'], theme: 'lainnya', notes: 'bonus' },
  { w: 'lusa', syl: ['lu', 'sa'], theme: 'lainnya', notes: 'bonus' },
  { w: 'bila', syl: ['bi', 'la'], theme: 'lainnya', notes: 'bonus' },
  { w: 'tapi', syl: ['ta', 'pi'], theme: 'lainnya', notes: 'bonus' },
  { w: 'maka', syl: ['ma', 'ka'], theme: 'lainnya', notes: 'bonus' },
  { w: 'tepi', syl: ['te', 'pi'], theme: 'lainnya', notes: 'bonus' },
  { w: 'sisi', syl: ['si', 'si'], theme: 'lainnya', notes: 'bonus' },
  { w: 'rasa', syl: ['ra', 'sa'], theme: 'lainnya', notes: 'bonus' },
  { w: 'tamu', syl: ['ta', 'mu'], theme: 'lainnya', notes: 'bonus' },
  { w: 'mama', syl: ['ma', 'ma'], theme: 'lainnya', notes: 'bonus' },
  { w: 'papa', syl: ['pa', 'pa'], theme: 'lainnya', notes: 'bonus' },
  { w: 'laki', syl: ['la', 'ki'], theme: 'lainnya', notes: 'bonus' },
  { w: 'wanita', syl: ['wa', 'ni', 'ta'], theme: 'lainnya', notes: 'bonus' },
  { w: 'karena', syl: ['ka', 're', 'na'], theme: 'lainnya', notes: 'bonus' },
  { w: 'tetapi', syl: ['te', 'ta', 'pi'], theme: 'lainnya', notes: 'bonus' },
  { w: 'ribu', syl: ['ri', 'bu'], theme: 'lainnya', notes: 'bonus' },
  { w: 'juta', syl: ['ju', 'ta'], theme: 'lainnya', notes: 'bonus' },
  { w: 'segitiga', syl: ['se', 'gi', 'ti', 'ga'], theme: 'lainnya', notes: 'bonus' },
  { w: 'segi', syl: ['se', 'gi'], theme: 'lainnya', notes: 'bonus' },
  { w: 'voli', syl: ['vo', 'li'], theme: 'lainnya', notes: 'bonus' },
  { w: 'gaya', syl: ['ga', 'ya'], theme: 'lainnya', notes: 'bonus' },
  { w: 'sewa', syl: ['se', 'wa'], theme: 'lainnya', notes: 'bonus' },
  { w: 'beli', syl: ['be', 'li'], theme: 'lainnya', notes: 'bonus' },
  { w: 'jago', syl: ['ja', 'go'], theme: 'lainnya', notes: 'bonus' },
  { w: 'biru', syl: ['bi', 'ru'], theme: 'lainnya', notes: 'bonus' },
  { w: 'jaya', syl: ['ja', 'ya'], theme: 'lainnya', notes: 'bonus' },
  { w: 'rapi', syl: ['ra', 'pi'], theme: 'lainnya', notes: 'bonus' },
  { w: 'logika', syl: ['lo', 'gi', 'ka'], theme: 'lainnya', notes: 'bonus' },
  { w: 'lupa', syl: ['lu', 'pa'], theme: 'lainnya', notes: 'bonus' },
  { w: 'beri', syl: ['be', 'ri'], theme: 'lainnya', notes: 'bonus' },
  { w: 'terima', syl: ['te', 'ri', 'ma'], theme: 'lainnya', notes: 'bonus' },
  { w: 'bicara', syl: ['bi', 'ca', 'ra'], theme: 'lainnya', notes: 'bonus' },
  { w: 'geli', syl: ['ge', 'li'], theme: 'lainnya', notes: 'bonus' },
  { w: 'jaga', syl: ['ja', 'ga'], theme: 'lainnya', notes: 'bonus' },
  { w: 'coba', syl: ['co', 'ba'], theme: 'lainnya', notes: 'bonus' },
  { w: 'pusaka', syl: ['pu', 'sa', 'ka'], theme: 'lainnya', notes: 'bonus' },
  { w: 'pula', syl: ['pu', 'la'], theme: 'lainnya', notes: 'bonus' },
  { w: 'sekali', syl: ['se', 'ka', 'li'], theme: 'lainnya', notes: 'bonus' },
  { w: 'selalu', syl: ['se', 'la', 'lu'], theme: 'lainnya', notes: 'bonus' },
  { w: 'desa', syl: ['de', 'sa'], theme: 'lainnya', notes: 'bonus' },
  { w: 'bawa', syl: ['ba', 'wa'], theme: 'lainnya', notes: 'bonus' },
  { w: 'cari', syl: ['ca', 'ri'], theme: 'lainnya', notes: 'bonus' },
  { w: 'masa', syl: ['ma', 'sa'], theme: 'lainnya', notes: 'bonus' },
  { w: 'juru', syl: ['ju', 'ru'], theme: 'lainnya', notes: 'bonus' }
];

/** @type {CatalogWord[]} */
export const CATALOG_WORDS = ROWS.map((row) =>
  Array.isArray(row)
    ? { w: row[0], syl: row[1], theme: row[2], e: row[3] }
    : { ...row }
);

/** @type {Map<string, CatalogWord>} */
const BY_WORD = new Map(CATALOG_WORDS.map((entry) => [entry.w, entry]));

/** O(1) lookup for a word. @param {string} w @returns {CatalogWord|undefined} */
export function catalogEntry(w) {
  return BY_WORD.get(w);
}

/** Whether `w` is a real, catalog-approved word. @param {string} w */
export function isRealWord(w) {
  return BY_WORD.has(w);
}

/**
 * Album words: entries with a picture source (emoji or curated photo).
 * Targets are drawn ONLY from these, so finding a target always yields a card.
 * @returns {CatalogWord[]}
 */
export function albumWords() {
  return CATALOG_WORDS.filter((entry) => entry.e || entry.photo);
}

/** @param {number} n @returns {CatalogWord[]} */
export function wordsBySyllableCount(n) {
  return CATALOG_WORDS.filter((entry) => entry.syl.length === n);
}

/**
 * Album shelves by theme, in canonical order, each with its words.
 * @returns {{ key: KataTheme, title: string, icon: string, words: CatalogWord[] }[]}
 */
export function themeSections() {
  return KATA_THEMES.map((theme) => ({
    ...theme,
    words: albumWords().filter((entry) => entry.theme === theme.key)
  }));
}

/** All syllables a catalog word uses — used to bias board fill toward bonus finds. */
export const CATALOG_SYLLABLES = [...new Set(CATALOG_WORDS.flatMap((entry) => entry.syl))];

/** All strings that need whole-word clips in the `cari-kata` audio bucket. */
export function kataTexts() {
  return [
    ...albumWords().map((entry) => entry.w),
    ...KATA_REAL,
    ...KATA_FUNNY,
    ...KATA_LINES
  ];
}

/** Praise pool for real words (target or bonus). */
export const KATA_REAL = [
  'Hebat!', 'Pintar!', 'Bagus sekali!', 'Luar biasa!', 'Keren!'
];

/** Playful, never-punishing reaction to a nonsense selection. */
export const KATA_FUNNY = [
  'Hihihi, lucu ya!', 'Kata apa itu?', 'Aneh sekali!'
];

/** Spoken instructions / result lines for the game's audio bucket. */
export const KATA_LINES = [
  'Cari kata tersembunyi', 'Geser jari ke arah kanan atau ke bawah',
  'Kamu menemukan semua kata!', 'Papan baru', 'Kata bonus ditemukan',
  'Coba cari kata lain', 'Kamu menemukan kata baru!'
];
