/**
 * Build a review queue for Cari Kata photos. With PEXELS_API_KEY, the first
 * candidate is written into assets/kata-src/sources.tsv; without a key, the
 * same file gets a blank review row and the terminal still prints search links.
 * Nothing is downloaded or accepted automatically.
 */
import { access, appendFile, mkdir, readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { albumWords } from '../src/lib/content/kata-catalog.js';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const SOURCE_DIR = join(ROOT, 'assets/kata-src');
const TSV = join(SOURCE_DIR, 'sources.tsv');
const OUT_DIR = join(ROOT, 'static/kata');

const ENGLISH = {
  baju: 'shirt', bata: 'brick', beca: 'pedicab', buku: 'book', celana: 'pants',
  cemara: 'pine tree', dadu: 'dice', feri: 'ferry', foto: 'camera photo', guci: 'vase',
  kacamata: 'eyeglasses', kado: 'gift box', kamera: 'camera', karate: 'karate belt',
  keju: 'cheese', kelapa: 'coconut', kemeja: 'shirt', kereta: 'train', kopi: 'coffee',
  kuda: 'horse', lemari: 'wardrobe', madu: 'honey', matahari: 'sun', meja: 'table',
  melati: 'jasmine flower', menara: 'tower', nasi: 'rice bowl', paku: 'nail', palu: 'hammer',
  pena: 'pen', pepaya: 'papaya', perahu: 'small boat', peta: 'map', pita: 'ribbon', rebana: 'tambourine',
  roda: 'wheel', roti: 'bread', rusa: 'deer', sapi: 'cow', sapu: 'broom', sate: 'satay',
  selada: 'lettuce', sepatu: 'shoes', sepeda: 'bicycle', serabi: 'Indonesian pancake',
  sofa: 'sofa', soto: 'Indonesian soup', susu: 'milk glass', tahu: 'tofu', tali: 'rope',
  teko: 'teapot', tisu: 'tissue roll', toko: 'small shop', topi: 'hat', yoyo: 'yo-yo'
};

async function exists(path) {
  try { await access(path); return true; } catch { return false; }
}

/** @param {string} query @param {string} key */
async function pexelsCandidate(query, key) {
  const url = `https://api.pexels.com/v1/search?query=${encodeURIComponent(query)}&orientation=square&per_page=1`;
  const response = await fetch(url, { headers: { Authorization: key } });
  if (!response.ok) throw new Error(`Pexels HTTP ${response.status}`);
  const photo = (await response.json()).photos?.[0];
  if (!photo) return null;
  return {
    page: photo.url,
    image: photo.src?.large2x ?? photo.src?.large ?? photo.src?.original,
    photographer: photo.photographer
  };
}

async function main() {
  await mkdir(SOURCE_DIR, { recursive: true });
  const current = (await exists(TSV)) ? await readFile(TSV, 'utf8') : '';
  const queued = new Set(current.split('\n').filter((line) => line && !line.startsWith('#')).map((line) => line.split('\t')[0]));
  const missing = [];
  for (const entry of albumWords()) {
    const currentImage = entry.img
      ? join(ROOT, 'static', entry.img.replace(/^\//, ''))
      : join(OUT_DIR, `${entry.w}.webp`);
    if (!(await exists(currentImage))) missing.push(entry);
  }

  const key = process.env.PEXELS_API_KEY;
  const rows = [];
  for (const entry of missing) {
    const query = ENGLISH[entry.w] ?? entry.w;
    const pexels = `https://www.pexels.com/search/${encodeURIComponent(query)}/`;
    const pixabay = `https://pixabay.com/images/search/${encodeURIComponent(query)}/`;
    const wikimedia = `https://commons.wikimedia.org/w/index.php?search=${encodeURIComponent(query)}&title=Special:MediaSearch&type=image`;
    console.log(`\n${entry.w}:\n  ${pexels}\n  ${pixabay}\n  ${wikimedia}`);
    if (queued.has(entry.w)) continue;
    let candidate = null;
    if (key) {
      try { candidate = await pexelsCandidate(query, key); }
      catch (error) { console.warn(`  ! ${error.message}`); }
    }
    rows.push([
      entry.w,
      entry.theme,
      pexels,
      candidate?.page ?? '',
      candidate?.image ?? '',
      candidate ? `Pexels · candidate by ${candidate.photographer} — REVIEW REQUIRED` : ''
    ].join('\t').replace(/\t+$/, ''));
  }
  if (rows.length) await appendFile(TSV, `${current && !current.endsWith('\n') ? '\n' : ''}${rows.join('\n')}\n`);
  console.log(`\nmissing: ${missing.length} · new review rows: ${rows.length}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
