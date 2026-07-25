/**
 * Background-removes each curated photo so the album gets die-cut stickers and
 * real locked-slot silhouettes:
 *
 *   assets/stickers-src/{id}.jpg  ->  assets/stickers-cut/{id}.png  (transparent)
 *
 * Drives rembg through its Python API (one-time local install, not a project
 * dependency):
 *   uv pip install --system "rembg[cpu]"
 *
 * The API is used rather than the `rembg` CLI on purpose: the CLI drags in jinja2,
 * which blows up on any environment holding a pre-3.10 jinja2 ("cannot import name
 * Mapping from collections"). The API path touches none of that.
 *
 * Cutouts are committed, so this only runs when new photos are curated. Without
 * them prepare-stickers.js still works, but silhouettes fall back to a frosted blur.
 *
 * Skip-if-exists: an id that already has a cutout is left alone.
 *
 * Usage:
 *   npm run cut:stickers
 *   npm run cut:stickers -- --force
 *   npm run cut:stickers -- --only=gajah,sapi
 */
import { readdir, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { execFile } from 'node:child_process';
import { dirname, join, parse } from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';

const run = promisify(execFile);

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const SRC_DIR = join(ROOT, 'assets/stickers-src');
const CUT_DIR = join(ROOT, 'assets/stickers-cut');

const args = process.argv.slice(2);
const force = args.includes('--force');
const onlyArg = args.find((a) => a.startsWith('--only='));
const only = onlyArg ? new Set(onlyArg.slice(7).split(',')) : null;

const PY = process.env.PYTHON ?? 'python3';

async function hasRembg() {
  try {
    await run(PY, ['-c', 'import rembg']);
    return true;
  } catch {
    return false;
  }
}

/** Background-remove one file via rembg's Python API. */
async function cutOne(src, dest) {
  const code = [
    'import sys',
    'from rembg import remove',
    'with open(sys.argv[1], "rb") as i, open(sys.argv[2], "wb") as o:',
    '    o.write(remove(i.read()))'
  ].join('\n');
  await run(PY, ['-c', code, src, dest], { maxBuffer: 1024 * 1024 * 32 });
}

async function main() {
  if (!(await hasRembg())) {
    console.error(
      'rembg not found. Install it once with:\n' +
        '  uv pip install --system "rembg[cpu]"\n' +
        'Set PYTHON=/path/to/python3 if it lives in another interpreter.'
    );
    process.exit(1);
  }
  await mkdir(CUT_DIR, { recursive: true });

  const photos = existsSync(SRC_DIR)
    ? (await readdir(SRC_DIR)).filter((f) => /\.(jpe?g|png)$/i.test(f))
    : [];
  if (!photos.length) {
    console.log(`No photos in ${SRC_DIR} yet.`);
    return;
  }

  let cut = 0;
  let skipped = 0;
  const problems = [];

  for (const file of photos) {
    const id = parse(file).name;
    if (only && !only.has(id)) continue;

    const dest = join(CUT_DIR, `${id}.png`);
    if (existsSync(dest) && !force) {
      skipped++;
      continue;
    }
    try {
      // First run downloads the u2net model (~180MB) into ~/.u2net.
      await cutOne(join(SRC_DIR, file), dest);
      cut++;
      console.log(`✓ ${id}`);
    } catch (err) {
      problems.push(`${id}: ${err.message.split('\n')[0]}`);
    }
  }

  console.log(`\n${cut} cut out · ${skipped} already done`);
  if (problems.length) {
    console.log(`\n${problems.length} problem(s):`);
    for (const p of problems) console.log(`  ! ${p}`);
  }
  if (cut) console.log('\nNext: npm run prepare:stickers -- --force');
}

main();
