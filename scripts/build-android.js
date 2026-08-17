#!/usr/bin/env node
/**
 * Build the web app for the Android (Capacitor) shell and sync it into `android/`.
 *
 * The APK deliberately ships **without** audio: `static/audio` is ~71 MB across four
 * voices, which would dwarf the rest of the app. Instead the build is pointed at a CDN
 * (`VITE_AUDIO_CDN`) and the clips are downloaded per voice + level at runtime — see
 * `src/lib/audio/downloader.svelte.js`.
 *
 * Usage: AUDIO_CDN=https://… npm run build:android
 */
import { execFileSync } from 'node:child_process';
import { existsSync, rmSync, statSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const buildDir = path.join(root, 'build');

/**
 * Origin the installed app streams/downloads its audio from. An empty or malformed value
 * would build a perfectly valid APK with no way to ever fetch a clip, so fail here.
 */
const DEFAULT_AUDIO_CDN = 'https://belajar-membaca.gj.lc';
const AUDIO_CDN = process.env.AUDIO_CDN?.trim() || DEFAULT_AUDIO_CDN;
try {
  const url = new URL(AUDIO_CDN);
  if (url.protocol !== 'https:') throw new Error('must use https');
} catch (err) {
  console.error(`✖ AUDIO_CDN must be an absolute https URL — got ${JSON.stringify(AUDIO_CDN)}`);
  process.exit(1);
}

/** @param {string} dir @returns {number} total bytes */
function dirSize(dir) {
  let total = 0;
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    total += entry.isDirectory() ? dirSize(full) : statSync(full).size;
  }
  return total;
}

/** @param {number} bytes */
const mb = (bytes) => `${(bytes / 1024 / 1024).toFixed(1)} MB`;

/** @param {string} cmd @param {string[]} args */
function run(cmd, args, env = {}) {
  execFileSync(cmd, args, { cwd: root, stdio: 'inherit', env: { ...process.env, ...env } });
}

console.log(`\n▶ Building web app for Android (audio CDN: ${AUDIO_CDN})`);
run('npx', ['vite', 'build'], {
  // Served from the WebView root, so no GitHub Pages subpath.
  BASE_PATH: '',
  // Tells svelte.config.js to leave the service worker (and its precache manifest) out.
  NATIVE: '1',
  VITE_AUDIO_CDN: AUDIO_CDN
});

const audioDir = path.join(buildDir, 'audio');
if (existsSync(audioDir)) {
  const saved = dirSize(audioDir);
  rmSync(audioDir, { recursive: true, force: true });
  console.log(`▶ Stripped bundled audio from the APK payload (-${mb(saved)})`);
}

console.log(`▶ Web payload: ${mb(dirSize(buildDir))}`);

console.log('▶ Syncing into android/');
run('npx', ['cap', 'sync', 'android']);

console.log('\n✅ Ready. Build the APK with:');
console.log('   cd android && ./gradlew assembleDebug\n');
