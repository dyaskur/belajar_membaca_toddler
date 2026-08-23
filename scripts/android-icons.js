#!/usr/bin/env node
/**
 * Regenerate the Android launcher icons + splash image, and the web favicon, from the
 * PWA icon.
 *
 * Source of truth is `static/icon-512.png`, the same icon the installed PWA uses, so the
 * Android app and the web app always look like the same product. Drop a new icon there
 * (ideally 1024x1024) and re-run `npm run android:icons`.
 *
 * Replaces the Capacitor logo the `cap add android` template ships with.
 */
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SRC = path.join(root, 'static/icon-512.png');
/**
 * Optional transparent artwork for the adaptive-icon foreground and the splash mark. The
 * square icon carries its own background, so scaling *that* into the foreground layer
 * paints a second, slightly different square over the adaptive background — visible as a
 * hard edge inside the launcher's circle mask, and as a floating tile on the splash. When
 * this file exists it is used instead, already framed for the 108dp canvas.
 */
const FG = path.join(root, 'assets/icon-foreground.png');
/**
 * The browser-tab icon `app.html` points at. Derived here rather than maintained by hand
 * so it can't be left behind on the next icon change — which is exactly what happened the
 * first time the real artwork landed.
 */
const FAVICON = path.join(root, 'static/favicon.png');
const FAVICON_SIZE = 64;
/** Transparent margin each side, as a fraction of the canvas. */
const FAVICON_PAD = 0.01;
const MARK = existsSync(FG) ? FG : SRC;
const MARK_IS_DEDICATED = MARK === FG;
const RES = path.join(root, 'android/app/src/main/res');

/** Launcher icon sizes per density bucket (px), for the legacy square/round icons. */
const LEGACY = { mdpi: 48, hdpi: 72, xhdpi: 96, xxhdpi: 144, xxxhdpi: 192 };
/**
 * Adaptive-icon foregrounds are 108dp with only the middle 72dp guaranteed visible,
 * so the artwork is scaled to ~66% and centred inside a transparent canvas.
 */
const ADAPTIVE = { mdpi: 108, hdpi: 162, xhdpi: 216, xxhdpi: 324, xxxhdpi: 432 };
const SAFE_RATIO = 0.66;

/**
 * Splash canvases the Capacitor template ships, per orientation + density. The mark is
 * centred on the app's cream background rather than stretched to fill.
 */
const SPLASH = {
  drawable: [480, 480],
  'drawable-port-mdpi': [320, 480],
  'drawable-port-hdpi': [480, 800],
  'drawable-port-xhdpi': [720, 1280],
  'drawable-port-xxhdpi': [960, 1600],
  'drawable-port-xxxhdpi': [1280, 1920],
  'drawable-land-mdpi': [480, 320],
  'drawable-land-hdpi': [800, 480],
  'drawable-land-xhdpi': [1280, 720],
  'drawable-land-xxhdpi': [1600, 960],
  'drawable-land-xxxhdpi': [1920, 1280]
};
/** App background (matches `backgroundColor` in capacitor.config.json). */
const SPLASH_BG = { r: 255, g: 251, b: 235, alpha: 1 };
/** Mark size as a fraction of the canvas's shorter side. */
const SPLASH_MARK = 0.4;

/** @param {number} size @returns {Promise<Buffer>} a circular-masked icon */
async function round(size) {
  const r = size / 2;
  const mask = Buffer.from(
    `<svg width="${size}" height="${size}"><circle cx="${r}" cy="${r}" r="${r}" fill="#fff"/></svg>`
  );
  return sharp(SRC)
    .resize(size, size, { fit: 'cover' })
    .composite([{ input: mask, blend: 'dest-in' }])
    .png()
    .toBuffer();
}

/** @param {number} size */
async function adaptiveForeground(size) {
  // Dedicated foreground art is already framed for the safe zone, so it fills the canvas;
  // the square fallback has to be inset to survive the launcher's mask.
  const inner = MARK_IS_DEDICATED ? size : Math.round(size * SAFE_RATIO);
  const art = await sharp(MARK)
    .resize(inner, inner, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toBuffer();
  return sharp({
    create: {
      width: size,
      height: size,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 }
    }
  })
    .composite([{ input: art, gravity: 'centre' }])
    .png()
    .toBuffer();
}

/** Dominant colour of the source icon, used as the adaptive-icon background. */
async function themeColor() {
  const { dominant } = await sharp(SRC).stats();
  const hex = (/** @type {number} */ n) => n.toString(16).padStart(2, '0').toUpperCase();
  return `#${hex(dominant.r)}${hex(dominant.g)}${hex(dominant.b)}`;
}

const color = await themeColor();

for (const [density, size] of Object.entries(LEGACY)) {
  const dir = path.join(RES, `mipmap-${density}`);
  mkdirSync(dir, { recursive: true });
  await sharp(SRC).resize(size, size, { fit: 'cover' }).png().toFile(path.join(dir, 'ic_launcher.png'));
  writeFileSync(path.join(dir, 'ic_launcher_round.png'), await round(size));
  writeFileSync(
    path.join(dir, 'ic_launcher_foreground.png'),
    await adaptiveForeground(ADAPTIVE[/** @type {keyof typeof ADAPTIVE} */ (density)])
  );
}

writeFileSync(
  path.join(RES, 'values/ic_launcher_background.xml'),
  `<?xml version="1.0" encoding="utf-8"?>\n<resources>\n    <color name="ic_launcher_background">${color}</color>\n</resources>\n`
);

// Splash: the same mark centred on the app's cream background.
for (const [dir, [width, height]] of Object.entries(SPLASH)) {
  const out = path.join(RES, dir);
  mkdirSync(out, { recursive: true });
  const mark = Math.round(Math.min(width, height) * SPLASH_MARK);
  const art = await sharp(MARK)
    .resize(mark, mark, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toBuffer();
  await sharp({ create: { width, height, channels: 4, background: SPLASH_BG } })
    .composite([{ input: art, gravity: 'centre' }])
    .png()
    .toFile(path.join(out, 'splash.png'));
}

// Cut from the transparent mark, not the square icon: a browser tab draws the favicon
// straight onto its own chrome, so a baked-in background reads as a coloured box that
// fights whatever theme the browser is using.
//
// The mark is framed for the adaptive icon's 108dp safe zone, which leaves a wide
// transparent margin. That margin is dead space in a 16px tab, so it is trimmed off and
// the art re-padded to FAVICON_PAD.
{
  const trimmed = await sharp(MARK)
    .trim({ background: { r: 0, g: 0, b: 0, alpha: 0 }, threshold: 0 })
    .png()
    .toBuffer();
  const inner = Math.round(FAVICON_SIZE * (1 - 2 * FAVICON_PAD));
  const art = await sharp(trimmed)
    .resize(inner, inner, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toBuffer();
  await sharp({
    create: {
      width: FAVICON_SIZE,
      height: FAVICON_SIZE,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 }
    }
  })
    .composite([{ input: art, gravity: 'centre' }])
    .png()
    .toFile(FAVICON);
}

console.log(
  `✅ Launcher icons, splash and favicon regenerated from static/icon-512.png (background ${color})`
);
