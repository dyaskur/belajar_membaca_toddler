// Compares the screenshots just captured against a baseline set served over HTTP,
// writing diff overlays and a verdict JSON the PR comment and gallery render from.
//
// Baselines live on the kids-learn-shots Pages project (main branch by default),
// so nothing is committed to the repo. Comparison is only meaningful because the
// suite is deterministic: tests/e2e/fixtures.js seeds Math.random and every
// capture passes animations: 'disabled'.
//
// Usage: node scripts/compare-shots.js <shotDir> <baselineUrl>

import { mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { PNG } from 'pngjs';
import pixelmatch from 'pixelmatch';

const shotDir = process.argv[2] ?? process.env.SHOT_DIR ?? 'shots';
const baselineUrl = (process.argv[3] ?? process.env.BASELINE_URL ?? '').replace(/\/$/, '');
const diffDir = join(shotDir, 'diff');
const metaDir = join(shotDir, 'meta');

/** Fraction of differing pixels below which a shot counts as unchanged. Guards
 *  against stray sub-pixel/antialiasing noise without hiding real movement. */
const NOISE_FLOOR = 0.0005; // 0.05%
/** Per-pixel colour tolerance handed to pixelmatch (0 = exact). */
const THRESHOLD = 0.1;

const out = { baselineUrl, comparedAt: new Date().toISOString(), shots: {} };
const write = () => writeFileSync(join(shotDir, 'compare.json'), JSON.stringify(out, null, 2));

if (!baselineUrl) {
  console.log('No BASELINE_URL — skipping comparison.');
  out.skipped = 'no baseline url';
  mkdirSync(shotDir, { recursive: true });
  write();
  process.exit(0);
}

mkdirSync(diffDir, { recursive: true });

const PNG_MAGIC = Buffer.from([0x89, 0x50, 0x4e, 0x47]);

/**
 * Fetch one baseline image, or null when it doesn't exist yet.
 *
 * A missing file does NOT reliably 404: Cloudflare Pages serves index.html as an
 * SPA fallback whenever a top-level index.html exists and 404.html doesn't, so a
 * missing baseline comes back as 200 text/html. The gallery builder writes a
 * 404.html to suppress that, but sniff the PNG signature anyway rather than
 * trusting hosting config to stay correct.
 * @param {string} file
 */
async function fetchBaseline(file) {
  const res = await fetch(`${baselineUrl}/${file}`);
  if (res.status === 404) return null; // new screenshot, no baseline yet
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const buf = Buffer.from(await res.arrayBuffer());
  if (!buf.subarray(0, 4).equals(PNG_MAGIC)) return null; // fallback page, not an image
  return PNG.sync.read(buf);
}

let files = [];
try {
  files = readdirSync(shotDir).filter((f) => f.endsWith('.png'));
} catch {
  console.log(`No screenshots in ${shotDir}.`);
}

// Which baseline files existed but produced no shot this run (removed screens).
let baselineIndex = null;
try {
  const res = await fetch(`${baselineUrl}/compare-index.json`);
  if (res.ok) baselineIndex = await res.json();
} catch {
  /* optional; absence just means we can't detect removals */
}

let changed = 0;
let added = 0;
let failed = 0;

for (const file of files) {
  const actual = PNG.sync.read(readFileSync(join(shotDir, file)));
  const entry = { width: actual.width, height: actual.height };

  let base;
  try {
    base = await fetchBaseline(file);
  } catch (e) {
    entry.status = 'error';
    entry.error = String(e.message ?? e);
    out.shots[file] = entry;
    failed++;
    continue;
  }

  if (!base) {
    entry.status = 'added';
    out.shots[file] = entry;
    added++;
    continue;
  }

  entry.baseWidth = base.width;
  entry.baseHeight = base.height;

  // Full-page captures change height whenever content reflows, and pixelmatch
  // requires identical dimensions. Report the resize rather than crashing —
  // a size change is itself the most visible kind of change.
  if (base.width !== actual.width || base.height !== actual.height) {
    entry.status = 'resized';
    out.shots[file] = entry;
    changed++;
    continue;
  }

  const diff = new PNG({ width: actual.width, height: actual.height });
  const pixels = pixelmatch(base.data, actual.data, diff.data, actual.width, actual.height, {
    threshold: THRESHOLD
  });
  const ratio = pixels / (actual.width * actual.height);

  entry.pixels = pixels;
  entry.ratio = Number(ratio.toFixed(6));

  if (ratio > NOISE_FLOOR) {
    entry.status = 'changed';
    entry.diffFile = `diff/${file}`;
    writeFileSync(join(diffDir, file), PNG.sync.write(diff));
    changed++;
  } else {
    entry.status = 'same';
  }
  out.shots[file] = entry;
}

if (baselineIndex?.shots) {
  for (const file of Object.keys(baselineIndex.shots)) {
    if (!files.includes(file) && !out.shots[file]) {
      out.shots[file] = { status: 'removed' };
    }
  }
}

out.summary = {
  total: files.length,
  changed,
  added,
  failed,
  same: files.length - changed - added - failed
};

// Serves as next run's index for detecting removals.
writeFileSync(join(shotDir, 'compare-index.json'), JSON.stringify({ shots: out.shots }));
write();

console.log(
  `Compared ${files.length} vs ${baselineUrl}: ${changed} changed, ${added} added, ${failed} error(s)`
);
