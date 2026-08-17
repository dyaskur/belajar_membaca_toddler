/**
 * Prepares `assets/kata-src/sources.tsv` for the Album Kata curation pass (#99, #100).
 *
 * For every collectible word that still has no photo it appends a row, and — when
 * `PEXELS_API_KEY` is set — fills the `url` column with the API's top hit so the pass
 * becomes reviewing instead of hunting. Rows that already carry a url are never touched,
 * so re-running is safe and cheap.
 *
 * THE SUGGESTIONS ARE A STARTING POINT, NOT A DECISION. Automatic picks miss badly on
 * anything not concrete ("sari", "bara", "laci"), and every image still has to be judged
 * by a person: is it recognizable to a 3-year-old at 512px, one clear subject, no text,
 * no watermark, licence recorded. Replace the url, or blank it to skip the word entirely —
 * a word with no photo is not a failure, it simply stays a bonus word in the game.
 *
 * Faces: real photographs may show human or animal faces (decided in #99). The
 * no-faces rule still applies to emoji and drawn art — see AGENTS.md.
 *
 * Usage:
 *   npm run suggest:photos                    report + append missing rows
 *   PEXELS_API_KEY=... npm run suggest:photos  also pre-fill candidate urls
 *   npm run suggest:photos -- --theme=hewan   one shelf at a time
 *   npm run suggest:photos -- --report        report only, write nothing
 */
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { albumWords, THEMES } from '../src/lib/content/kata-catalog.js';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const SRC_DIR = join(ROOT, 'assets/kata-src');
const TSV = join(SRC_DIR, 'sources.tsv');

const args = process.argv.slice(2);
const reportOnly = args.includes('--report');
const themeArg = args.find((a) => a.startsWith('--theme='));
const theme = themeArg ? themeArg.slice(8) : null;

/**
 * Indonesian → English search terms. Pexels indexes English, and a raw Indonesian word
 * either returns nothing ("teko") or the wrong thing entirely ("pare" → proper nouns).
 * Only words needing a translation are listed; the rest search as themselves.
 * @type {Record<string, string>}
 */
const QUERY = {
  nasi: 'steamed white rice bowl', roti: 'bread loaf', susu: 'glass of milk',
  gula: 'sugar', sagu: 'sago starch', tahu: 'tofu', soto: 'indonesian soup',
  sate: 'satay skewers', kopi: 'cup of coffee', keju: 'cheese', madu: 'honey jar',
  kari: 'curry', soda: 'soda drink', sari: 'fruit juice', teri: 'anchovy fish',
  duku: 'duku fruit', sawo: 'sapodilla fruit', leci: 'lychee', kiwi: 'kiwi fruit',
  pare: 'bitter gourd', labu: 'pumpkin', tebu: 'sugar cane', sawi: 'bok choy',
  lada: 'peppercorns', jahe: 'ginger root', pala: 'nutmeg', cuka: 'vinegar bottle',
  jeli: 'jelly dessert', ceri: 'cherries', tape: 'fermented cassava',
  kelapa: 'coconut', pepaya: 'papaya', serabi: 'indonesian pancake',
  gulali: 'cotton candy', delima: 'pomegranate',
  sapi: 'cow', kuda: 'horse', kera: 'monkey', rusa: 'deer', naga: 'dragon statue',
  kutu: 'flea insect', nuri: 'parrot', lele: 'catfish', tuna: 'tuna fish',
  cumi: 'squid', nila: 'tilapia fish', pari: 'stingray', gurita: 'octopus',
  gurame: 'gourami fish', komodo: 'komodo dragon', serigala: 'wolf',
  mata: 'eye', kaki: 'foot', dada: 'chest', gigi: 'tooth', hati: 'liver',
  dagu: 'chin', bahu: 'shoulder', kuku: 'fingernail', jari: 'finger',
  muka: 'face', pipi: 'cheek', dahi: 'forehead', siku: 'elbow', paha: 'thigh',
  bulu: 'feather', kepala: 'head',
  meja: 'table', sofa: 'sofa', laci: 'drawer', sapu: 'broom', teko: 'teapot',
  guci: 'ceramic jar', tisu: 'tissue roll', palu: 'hammer', paku: 'nails',
  tali: 'rope', kaca: 'glass pane', busa: 'foam sponge', jala: 'fishing net',
  foto: 'photograph', lemari: 'wardrobe cupboard', kamera: 'camera',
  garasi: 'garage', pigura: 'picture frame', televisi: 'television',
  bola: 'ball', buku: 'book', pena: 'pen', peta: 'map', dadu: 'dice',
  yoyo: 'yoyo toy', kado: 'gift box', pita: 'ribbon', topi: 'hat', baju: 'shirt',
  dasi: 'necktie', roda: 'wheel', batu: 'stone', bata: 'brick', kayu: 'wood log',
  besi: 'iron metal', baja: 'steel', celana: 'trousers', sepatu: 'shoes',
  boneka: 'doll toy', rebana: 'hand drum', kecapi: 'zither instrument',
  sutera: 'silk fabric', kacamata: 'eyeglasses',
  bumi: 'planet earth', debu: 'dust', duri: 'thorn', biji: 'seeds',
  lava: 'lava', rawa: 'swamp', bara: 'glowing embers', padi: 'rice plant',
  cahaya: 'light ray', cemara: 'pine tree', melati: 'jasmine flower',
  matahari: 'sun',
  kota: 'city skyline', desa: 'village', toko: 'small shop', kano: 'canoe',
  vila: 'villa house', sepeda: 'bicycle', kereta: 'train', perahu: 'boat',
  menara: 'tower', negara: 'world map',
  mama: 'mother', papa: 'father', bibi: 'aunt', cucu: 'grandchild',
  bayi: 'baby', tamu: 'guest', guru: 'teacher', koki: 'chef', juri: 'judge',
  nona: 'young woman', raja: 'king', ratu: 'queen', pemuda: 'young man',
  penari: 'dancer', petani: 'farmer', polisi: 'police officer', wanita: 'woman'
};

/** @param {string} word */
const queryFor = (word) => QUERY[word] ?? word;

const HEADER = `# Album Kata photo sources — one row per collectible word.
#
# Columns (tab separated):
#   id <TAB> theme <TAB> searchUrl <TAB> photoUrl [<TAB> imageUrl [<TAB> licence]]
#
# HOW TO USE
#   1. Open the search link, pick a photo a 3-year-old would recognize instantly.
#   2. Paste the photo's PAGE url into the photoUrl column.
#   3. Leave photoUrl blank to skip the word — it stays a bonus word in the game,
#      which is a perfectly good outcome for anything hard to picture.
#   4. Then run:
#        npm run fetch:stickers -- --set=kata && npm run prepare:stickers -- --set=kata
#      and add the word to PHOTO_WORDS in src/lib/content/kata-catalog.js.
#
# Real photographs MAY contain human or animal faces (see AGENTS.md); emoji and drawn
# art may not. Reject anything with text overlays, watermarks, or a busy background.
#
# Pexels is preferred (free, commercial, no attribution required). If it has nothing
# good, try Pixabay or Wikimedia Commons — Wikimedia licences vary, record them.
`;

/** @param {string} text */
function parseIds(text) {
  return new Set(
    text
      .split('\n')
      .filter((line) => line.trim() && !line.startsWith('#'))
      .map((line) => line.split('\t')[0])
  );
}

/** Ask Pexels for one candidate. Returns the photo page url, or null. */
async function candidate(word, key) {
  const url = `https://api.pexels.com/v1/search?per_page=1&orientation=square&query=${encodeURIComponent(queryFor(word))}`;
  try {
    const res = await fetch(url, { headers: { Authorization: key } });
    if (!res.ok) return null;
    const data = await res.json();
    return data?.photos?.[0]?.url ?? null;
  } catch {
    return null;
  }
}

async function main() {
  const key = process.env.PEXELS_API_KEY;
  const words = albumWords().filter((entry) => (theme ? entry.theme === theme : true));
  if (!words.length) {
    console.error(`No album words${theme ? ` in theme "${theme}"` : ''}. Themes: ${THEMES.map((t) => t.key).join(', ')}`);
    process.exit(1);
  }

  const existing = existsSync(TSV) ? parseIds(await readFile(TSV, 'utf8')) : new Set();
  const missing = words.filter((entry) => !existing.has(entry.w));

  console.log(`Album words${theme ? ` in ${theme}` : ''}: ${words.length}`);
  console.log(`  already listed in sources.tsv: ${words.length - missing.length}`);
  console.log(`  still to curate:               ${missing.length}`);
  if (!key) console.log('  (set PEXELS_API_KEY to pre-fill candidate urls)');

  if (reportOnly || !missing.length) return;

  /** @type {string[]} */
  const rows = [];
  for (const entry of missing) {
    const search = `https://www.pexels.com/search/${encodeURIComponent(queryFor(entry.w))}/`;
    const suggestion = key ? await candidate(entry.w, key) : null;
    rows.push([entry.w, entry.theme, search, suggestion ?? ''].join('\t'));
    if (key) console.log(`${suggestion ? '+' : '·'} ${entry.w.padEnd(12)} ${suggestion ?? '(no hit — search by hand)'}`);
  }

  await mkdir(SRC_DIR, { recursive: true });
  const head = existsSync(TSV) ? await readFile(TSV, 'utf8') : HEADER;
  await writeFile(TSV, `${head.trimEnd()}\n${rows.join('\n')}\n`);
  console.log(`\nWrote ${rows.length} rows to ${TSV}. Review every url before fetching.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
