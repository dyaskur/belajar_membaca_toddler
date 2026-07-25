/**
 * Turns curated sticker photos into the two assets the album needs:
 *   static/stickers/{id}.webp       512x512 sticker art — the real photo, uncut
 *   static/stickers/sil/{id}.webp   512x512 locked-slot silhouette
 *
 * The collected sticker is always the plain photo: a square centre-crop of the
 * original, background and all. The cutout is only ever an intermediate used to
 * derive the silhouette shape — it is never shown to the child.
 *
 *   assets/stickers-src/{id}.jpg   the photo        -> sticker art (always)
 *   assets/stickers-cut/{id}.png   transparent cut  -> silhouette (when present)
 *
 * Without a cutout the silhouette falls back to a frosted blur, which reads as
 * indistinct mud — treat cutouts as required.
 *
 * Cutouts are produced once by scripts/cut-stickers.js and committed; this script
 * never calls the network.
 *
 * Skip-if-exists: existing outputs are left alone unless --force.
 *
 * Usage:
 *   npm run prepare:stickers
 *   npm run prepare:stickers -- --force
 *   npm run prepare:stickers -- --only=gajah,sapi
 */
import { readdir, mkdir, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { dirname, join, parse } from 'node:path';
import { fileURLToPath } from 'node:url';

import sharp from 'sharp';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const SRC_DIR = join(ROOT, 'assets/stickers-src');
const CUT_DIR = join(ROOT, 'assets/stickers-cut');
const OUT_DIR = join(ROOT, 'static/stickers');
const SIL_DIR = join(OUT_DIR, 'sil');

const SIZE = 512;
const QUALITY = 80;

const args = process.argv.slice(2);
const force = args.includes('--force');
const onlyArg = args.find((a) => a.startsWith('--only='));
const only = onlyArg ? new Set(onlyArg.slice(7).split(',')) : null;

/** Transparent padding kept around the subject, per side. */
const PAD = 16;
const INNER = SIZE - PAD * 2;
const CLEAR = { r: 0, g: 0, b: 0, alpha: 0 };


/**
 * True silhouette: keep the cutout's alpha channel, paint every opaque pixel one
 * flat colour. Slight blur softens the matte's jagged edge.
 */
async function silhouetteFromCutout(file) {
  // Single-channel matte, framed identically to the sticker so the two line up.
  // Dimensions are read back from `info` rather than assumed: joinChannel reads the
  // raw buffer at whatever stride it is told, and a mismatch yields diagonal stripes.
  const { data: alpha, info } = await sharp(file)
    .trim()
    .resize(INNER, INNER, { fit: 'contain', background: CLEAR })
    .extend({ top: PAD, bottom: PAD, left: PAD, right: PAD, background: CLEAR })
    .extractChannel('alpha')
    // Harden the matte before blurring. rembg returns a soft, partially transparent
    // alpha wherever it is unsure (a tiger in grass, a panda against pale rock), which
    // renders as a washed-out ghost rather than a silhouette. Threshold first so the
    // subject is solid, then blur only to soften the cut edge.
    .threshold(96)
    .blur(1.2)
    .raw()
    .toBuffer({ resolveWithObject: true });

  // A flat slate fill wearing that matte as its alpha channel. `composite` with
  // 'dest-in' does not work here: a greyscale mask carries no alpha of its own,
  // so the blend keeps every pixel and yields a solid square.
  return sharp({
    create: { width: info.width, height: info.height, channels: 3, background: { r: 51, g: 65, b: 85 } }
  })
    .joinChannel(alpha, { raw: { width: info.width, height: info.height, channels: 1 } })
    .webp({ quality: QUALITY, alphaQuality: 100 })
    .toBuffer();
}

/** The sticker the child sees: a square crop of the photo, uncut. */
async function fromPhoto(file) {
  return sharp(file)
    .resize(SIZE, SIZE, { fit: 'cover', position: 'attention' })
    .webp({ quality: QUALITY })
    .toBuffer();
}

/** Stand-in for a silhouette when we only have a rectangular photo: blur it into a shape-less tease. */
async function frostedFromPhoto(file) {
  return sharp(file)
    .resize(SIZE, SIZE, { fit: 'cover', position: 'attention' })
    .blur(28)
    .modulate({ brightness: 0.55, saturation: 0.4 })
    .webp({ quality: 60 })
    .toBuffer();
}

async function main() {
  await mkdir(OUT_DIR, { recursive: true });
  await mkdir(SIL_DIR, { recursive: true });

  const cutouts = existsSync(CUT_DIR)
    ? new Set((await readdir(CUT_DIR)).filter((f) => f.endsWith('.png')).map((f) => parse(f).name))
    : new Set();
  const photos = existsSync(SRC_DIR)
    ? (await readdir(SRC_DIR)).filter((f) => /\.(jpe?g|png)$/i.test(f))
    : [];

  const ids = [...new Set([...cutouts, ...photos.map((f) => parse(f).name)])].sort();
  if (!ids.length) {
    console.log(`No sticker sources found. Put photos in ${SRC_DIR} first.`);
    return;
  }

  let done = 0;
  let skipped = 0;
  let frosted = 0;
  const problems = [];

  for (const id of ids) {
    if (only && !only.has(id)) continue;

    const out = join(OUT_DIR, `${id}.webp`);
    const sil = join(SIL_DIR, `${id}.webp`);
    if (existsSync(out) && existsSync(sil) && !force) {
      skipped++;
      continue;
    }

    const raw = photos.find((f) => parse(f).name === id);
    if (!raw) {
      problems.push(`${id}: has a cutout but no source photo in ${SRC_DIR}`);
      continue;
    }
    const file = join(SRC_DIR, raw);
    const hasCut = cutouts.has(id);

    try {
      // Sticker art is always the plain photo; the cutout only shapes the silhouette.
      await writeFile(out, await fromPhoto(file));
      if (hasCut) {
        await writeFile(sil, await silhouetteFromCutout(join(CUT_DIR, `${id}.png`)));
      } else {
        await writeFile(sil, await frostedFromPhoto(file));
        frosted++;
      }
      done++;
      console.log(`✓ ${id}${hasCut ? '' : '  (no cutout — frosted stand-in silhouette)'}`);
    } catch (err) {
      problems.push(`${id}: ${err.message}`);
    }
  }

  console.log(`\n${done} written · ${skipped} up to date`);
  if (frosted) {
    console.log(
      `${frosted} sticker(s) have no cutout yet. Add assets/stickers-cut/{id}.png for a real silhouette:\n` +
        `  rembg i assets/stickers-src/{id}.jpg assets/stickers-cut/{id}.png`
    );
  }
  if (problems.length) {
    console.log(`\n${problems.length} problem(s):`);
    for (const p of problems) console.log(`  ! ${p}`);
  }
}

main();
