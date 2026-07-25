/**
 * Downloads curated sticker photos listed in assets/stickers-src/sources.tsv.
 *
 * The TSV holds one row per sticker: `id <TAB> group <TAB> searchUrl <TAB> photoUrl`.
 * Only rows with a photoUrl are fetched; blanks are skipped so the album can be
 * curated incrementally. The Pexels photo id is parsed out of the page URL and the
 * original is pulled straight from images.pexels.com.
 *
 * Skip-if-exists: an already-downloaded id is left alone, so re-running is cheap.
 * Provenance is recorded in assets/stickers-src/credits.json.
 *
 * Usage:
 *   npm run fetch:stickers
 *   npm run fetch:stickers -- --force        (re-download even if present)
 *   npm run fetch:stickers -- --only=gajah,sapi
 */
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const SRC_DIR = join(ROOT, 'assets/stickers-src');
const TSV = join(SRC_DIR, 'sources.tsv');
const CREDITS = join(SRC_DIR, 'credits.json');

/** Widest edge we keep on disk. Output is 512px, so 1600 leaves room to crop. */
const FETCH_WIDTH = 1600;

const args = process.argv.slice(2);
const force = args.includes('--force');
const onlyArg = args.find((a) => a.startsWith('--only='));
const only = onlyArg ? new Set(onlyArg.slice(7).split(',')) : null;

/** Pexels page URLs end in `-{photoId}` (optionally with a trailing slash). */
function photoIdFrom(url) {
  return url.match(/-(\d+)\/?(?:[?#].*)?$/)?.[1] ?? null;
}

/** @returns {{id: string, group: string, search: string, url: string}[]} */
function parseRows(text) {
  return text
    .split('\n')
    .map((line) => line.trimEnd())
    .filter((line) => line && !line.startsWith('#'))
    .map((line) => {
      const [id, group, search, url] = line.split('\t');
      return { id, group, search, url: (url ?? '').trim() };
    })
    .filter((r) => r.id);
}

async function main() {
  if (!existsSync(TSV)) {
    console.error(`Missing ${TSV}`);
    process.exit(1);
  }
  await mkdir(SRC_DIR, { recursive: true });

  const rows = parseRows(await readFile(TSV, 'utf8'));
  const credits = existsSync(CREDITS) ? JSON.parse(await readFile(CREDITS, 'utf8')) : {};

  let fetched = 0;
  let skipped = 0;
  let blank = 0;
  const problems = [];

  for (const row of rows) {
    if (only && !only.has(row.id)) continue;
    if (!row.url) {
      blank++;
      continue;
    }

    const photoId = photoIdFrom(row.url);
    if (!photoId) {
      problems.push(`${row.id}: cannot parse a photo id out of "${row.url}"`);
      continue;
    }

    const dest = join(SRC_DIR, `${row.id}.jpg`);
    if (existsSync(dest) && !force) {
      skipped++;
      continue;
    }

    const src = `https://images.pexels.com/photos/${photoId}/pexels-photo-${photoId}.jpeg?auto=compress&cs=tinysrgb&w=${FETCH_WIDTH}`;
    try {
      const res = await fetch(src);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      await writeFile(dest, Buffer.from(await res.arrayBuffer()));
      credits[row.id] = { photoId, page: row.url, group: row.group, source: 'pexels' };
      fetched++;
      console.log(`✓ ${row.id}  (photo ${photoId})`);
    } catch (err) {
      problems.push(`${row.id}: download failed — ${err.message}`);
    }
  }

  await writeFile(CREDITS, JSON.stringify(credits, null, 2) + '\n');

  console.log(`\n${fetched} fetched · ${skipped} already present · ${blank} not yet chosen`);
  if (problems.length) {
    console.log(`\n${problems.length} problem(s):`);
    for (const p of problems) console.log(`  ! ${p}`);
  }
}

main();
