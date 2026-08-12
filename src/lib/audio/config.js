/**
 * Shared audio configuration for the runtime player and the native download manager.
 */

/**
 * Audio cache version. Bump whenever clips are regenerated so the service worker /
 * browser fetch the new audio instead of serving stale clips by filename.
 *
 * On Android this also invalidates already-downloaded packs: a pack whose stored
 * version no longer matches is wiped and re-downloaded on next use.
 */
export const AUDIO_V = 'v=22';

/**
 * Origin the Android build streams audio from, e.g. `https://belajar-membaca.gj.lc`.
 * Set at build time via `VITE_AUDIO_CDN` (see `scripts/build-android.js`).
 *
 * Empty on the web build, where audio is served from the app's own origin under
 * `${base}/audio/` and no remote host is involved.
 * @type {string}
 */
export const AUDIO_CDN = (import.meta.env.VITE_AUDIO_CDN ?? '').replace(/\/+$/, '');

/**
 * Packs fetched on first launch so a fresh install can teach letters immediately.
 * Everything else downloads the first time its level/mini-game is opened.
 *
 * `1` covers Level 1 clips plus the praise/encouragement lines the whole app reuses;
 * `abjad` covers the A-Z alphabet page.
 * @type {(number|string)[]}
 */
export const CORE_PACKS = [1, 'abjad'];
