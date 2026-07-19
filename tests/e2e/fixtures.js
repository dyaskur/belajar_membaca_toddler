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
 * @param {import('@playwright/test').Page} page
 * @param {{ unlockAll?: boolean }} [opts]
 */
export async function seedProfile(page, { unlockAll = false } = {}) {
  await page.addInitScript(
    ({ profile, all }) => {
      localStorage.setItem('klm.profiles.v1', JSON.stringify([profile]));
      localStorage.setItem('klm.activeProfile.v1', profile.id);
      if (all) localStorage.setItem('klm.unlockAll.v1', '1');
      else localStorage.removeItem('klm.unlockAll.v1');
    },
    { profile: CI_PROFILE, all: unlockAll }
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

/** Known-harmless noise (browser quirks, missing favicon variants). */
export const IGNORED_ERRORS = [/favicon/i];

/** @param {string[]} errors */
export const realErrors = (errors) => errors.filter((e) => !IGNORED_ERRORS.some((rx) => rx.test(e)));
