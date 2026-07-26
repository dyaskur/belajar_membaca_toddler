/**
 * Downloads curated sticker photos listed in assets/stickers-src/sources.tsv.
 *
 * The TSV holds one row per sticker:
 *   `id <TAB> group <TAB> searchUrl <TAB> photoUrl [<TAB> imageUrl]`
 * Only rows with a photoUrl are fetched; blanks are skipped so the album can be
 * curated incrementally.
 *
 * Resolving a photo id to its actual image is done in this order:
 *   1. an explicit imageUrl in column 5
 *   2. the Pexels API, when PEXELS_API_KEY is set (also records the photographer)
 *   3. the guessable https://images.pexels.com/photos/{id}/pexels-photo-{id}.jpeg
 *
 * Step 3 is a guess and 404s for a good fraction of photos — older uploads live under
 * a nested slug path instead. Pexels answers 403 to server-side page requests, so the
 * real URL cannot be scraped; an unresolvable row is reported rather than skipped.
 *
 * Skip-if-exists: an already-downloaded id is left alone, so re-running is cheap.
 * Provenance is recorded in assets/stickers-src/credits.json.
 *
 * Usage:
 *   npm run fetch:stickers
 *   npm run fetch:stickers -- --force        (re-download even if present)
 *   npm run fetch:stickers -- --only=gajah,sapi
 */
import { readFile, writeFile, mkdir, rename } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const SRC_DIR = join(ROOT, 'assets/stickers-src');
const TSV = join(SRC_DIR, 'sources.tsv');
const CREDITS = join(SRC_DIR, 'credits.json');

/** Widest edge we keep on disk. Output is 512px, so 1600 leaves room to crop. */
const FETCH_WIDTH = 1600;

/** Wikimedia rejects requests that do not identify themselves. */
const USER_AGENT = 'kids-learn-sticker-fetcher/1.0 (+https://github.com/dyaskur/belajar_membaca_toddler)';

const args = process.argv.slice(2);
const force = args.includes('--force');
const onlyArg = args.find((a) => a.startsWith('--only='));
const only = onlyArg ? new Set(onlyArg.slice(7).split(',')) : null;

/**
 * Pexels page URLs end in `-{photoId}` (optionally with a trailing slash).
 * The host check matters: Pixabay and Unsplash slugs can also end in `-{digits}`,
 * and without it a Pixabay id would be fed to the Pexels URL guess and could quietly
 * download whichever unrelated Pexels photo happens to carry that number.
 */
function photoIdFrom(url) {
  if (!/^https?:\/\/(www\.)?pexels\.com\//i.test(url)) return null;
  return url.match(/-(\d+)\/?(?:[?#].*)?$/)?.[1] ?? null;
}

/** @returns {{id: string, group: string, search: string, url: string, image: string}[]} */
function parseRows(text) {
  return text
    .split('\n')
    .map((line) => line.trimEnd())
    .filter((line) => line && !line.startsWith('#'))
    .map((line) => {
      const [id, group, search, url, image, license] = line.split('\t');
      return {
        id,
        group,
        search,
        url: (url ?? '').trim(),
        image: (image ?? '').trim(),
        license: (license ?? '').trim()
      };
    })
    .filter((r) => r.id);
}

/** Ask the Pexels API for a photo's real source URL + photographer. */
async function viaApi(photoId, key) {
  const res = await fetch(`https://api.pexels.com/v1/photos/${photoId}`, {
    headers: { Authorization: key }
  });
  if (!res.ok) throw new Error(`API HTTP ${res.status}`);
  const json = await res.json();
  return { url: json.src?.large2x ?? json.src?.large ?? json.src?.original, by: json.photographer };
}

/**
 * Work out where a photo actually lives. Returns null when only the guessable
 * pattern was available and it turned out not to exist.
 */
async function resolveImage(row, photoId, key) {
  if (row.image) return { url: row.image, by: undefined };

  if (key) {
    try {
      return await viaApi(photoId, key);
    } catch {
      // fall through to the guess
    }
  }

  const guess = `https://images.pexels.com/photos/${photoId}/pexels-photo-${photoId}.jpeg`;
  const head = await fetch(`${guess}?w=64`, { method: 'HEAD' });
  return head.ok ? { url: guess, by: undefined } : null;
}

async function main() {
  if (!existsSync(TSV)) {
    console.error(`Missing ${TSV}`);
    process.exit(1);
  }
  await mkdir(SRC_DIR, { recursive: true });

  const apiKey = process.env.PEXELS_API_KEY;
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

    // A column-5 image URL stands on its own, so non-Pexels sources (e.g. Wikimedia
    // Commons) work without a parseable Pexels photo id.
    const photoId = photoIdFrom(row.url);
    if (!photoId && !row.image) {
      problems.push(`${row.id}: cannot parse a photo id out of "${row.url}"`);
      continue;
    }

    const dest = join(SRC_DIR, `${row.id}.jpg`);
    if (existsSync(dest) && !force) {
      skipped++;
      continue;
    }

    try {
      const resolved = await resolveImage(row, photoId, apiKey);
      if (!resolved) {
        problems.push(
          `${row.id}: photo ${photoId} is not at the guessable URL. Paste its direct ` +
            `images.pexels.com link into column 5, or set PEXELS_API_KEY.`
        );
        continue;
      }
      // The resize params are Pexels-specific; other hosts get the plain URL.
      const isPexels = resolved.url.includes('images.pexels.com');
      const sep = resolved.url.includes('?') ? '&' : '?';
      const src = isPexels
        ? `${resolved.url}${sep}auto=compress&cs=tinysrgb&w=${FETCH_WIDTH}`
        : resolved.url;
      const res = await fetch(src, { headers: { 'User-Agent': USER_AGENT } });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      // Write beside the destination, then rename — an interrupted or disk-full write
      // never leaves a truncated file at `dest` for the next run's existsSync to
      // mistake for "already downloaded".
      const tmp = `${dest}.tmp`;
      await writeFile(tmp, Buffer.from(await res.arrayBuffer()));
      await rename(tmp, dest);
      credits[row.id] = {
        ...(photoId ? { photoId } : {}),
        page: row.url,
        group: row.group,
        source: isPexels ? 'pexels' : new URL(resolved.url).hostname,
        ...(resolved.by ? { photographer: resolved.by } : {}),
        ...(row.license ? { license: row.license } : {})
      };
      fetched++;
      console.log(`✓ ${row.id}  ${photoId ? `(photo ${photoId})` : `(${credits[row.id].source})`}`);
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
