// Shared page setup for the screenshot specs: without a profile every page
// bounces to the "Tambah" profile picker, so all screenshots look identical.

/** Matches the storage shape in src/lib/stores/profiles.svelte.js. */
const CI_PROFILE = {
  id: 'ci-smoke-test',
  name: 'Tes',
  avatar: 'teal',
  voiceId: 'ibu-dewi',
  quizTileCount: 3,
  bestScore: {},
  lessonScore: {},
  unlockedLevel: 1
};

/**
 * Seed a profile before any app code runs.
 *
 * `unlockAll` is off by default so /belajar screenshots the realistic partly-locked
 * adventure path — a regression in the prerequisite-graph rendering should be
 * visible. The flow spec turns it on purely as the means to reach pack 3a.
 *
 * `stickers`/`stickersSeen` default to unset, which leaves Buku Stiker in its
 * realistic empty (all-silhouette) state — the stiker-album spec overrides them
 * to reach the partly-collected state instead.
 *
 * @param {import('@playwright/test').Page} page
 * @param {{ unlockAll?: boolean, unlockedLevel?: number, bestScore?: Record<number, number>, stickers?: string[], stickersSeen?: string[] }} [opts]
 */
export async function seedProfile(page, { unlockAll = false, unlockedLevel, bestScore, stickers, stickersSeen } = {}) {
  const profile = {
    ...CI_PROFILE,
    ...(unlockedLevel === undefined ? {} : { unlockedLevel }),
    ...(bestScore ? { bestScore } : {}),
    ...(stickers ? { stickers } : {}),
    ...(stickersSeen ? { stickersSeen } : {})
  };
  await page.addInitScript(
    ({ profile, all }) => {
      localStorage.setItem('klm.profiles.v1', JSON.stringify([profile]));
      localStorage.setItem('klm.activeProfile.v1', profile.id);
      if (all) localStorage.setItem('klm.unlockAll.v1', '1');
      else localStorage.removeItem('klm.unlockAll.v1');
    },
    { profile, all: unlockAll }
  );
}

/**
 * Replace Math.random with a fixed-seed PRNG (Lehmer / MINSTD) so quiz rounds are
 * identical run-to-run. Without this every run screenshots different letters and
 * the images can never be compared across PRs.
 *
 * @param {import('@playwright/test').Page} page
 * @param {number} [seed]
 */
export async function seedRandom(page, seed = 42) {
  await page.addInitScript((s) => {
    let state = s;
    Math.random = () => (state = (state * 16807) % 2147483647) / 2147483647;
  }, seed);
}

/**
 * Attach error collection. Returns the live array; same rules as before —
 * pageerror, console.error, 4xx/5xx and failed requests, same-origin only.
 *
 * @param {import('@playwright/test').Page} page
 * @param {string} origin
 */
export function collectErrors(page, origin) {
  /** @type {string[]} */
  const errors = [];
  page.on('pageerror', (err) => errors.push(`pageerror: ${err.message}`));
  page.on('console', (msg) => {
    if (msg.type() === 'error') errors.push(`console.error: ${msg.text()}`);
  });
  page.on('response', (res) => {
    if (res.status() >= 400 && res.url().startsWith(origin)) {
      errors.push(`HTTP ${res.status()}: ${res.url()}`);
    }
  });
  page.on('requestfailed', (req) => {
    if (req.url().startsWith(origin)) {
      errors.push(`request failed: ${req.url()} (${req.failure()?.errorText})`);
    }
  });
  return errors;
}

/** Known-harmless noise: missing favicon variants, the browser's URL-less echo of
 *  a failed resource fetch (the URL-bearing `HTTP 404:` record stays strict so a
 *  genuinely missing asset still fails), and the cari-kata audio bucket — it is
 *  committed at generation time (`scripts/generate-audio.js`), so until it is
 *  regenerated, preview/CI requests for its pack.json 404 and the game falls back
 *  to speech synthesis. */
export const IGNORED_ERRORS = [
  /favicon/i,
  /console\.error: Failed to load resource: the server responded with a status of 404 \(Not Found\)/,
  /\/audio\/([\w-]+)\/cari-kata\/pack\.json/
];

/** @param {string[]} errors */
export const realErrors = (errors) => errors.filter((e) => !IGNORED_ERRORS.some((rx) => rx.test(e)));
