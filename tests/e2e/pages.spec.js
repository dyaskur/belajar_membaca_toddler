import { test, expect } from '@playwright/test';
import { collectErrors, realErrors, seedProfile, seedRandom } from './fixtures.js';
import { shot } from './shot.js';

// Per-page smoke test: the page paints real content, throws no runtime
// errors, and every same-origin request succeeds. A full-page screenshot is
// captured even when the checks fail so the PR comment shows the broken state.
const pages = JSON.parse(process.env.TEST_PAGES ?? '["/"]');
const origin = new URL(process.env.BASE_URL ?? 'http://localhost:4173').origin;

/**
 * Which workflow group each route belongs to, and how it's labelled in the PR
 * comment. `unlockAll` opts a route into the progress override: at the baseline
 * profile only pack 1 is reachable, so /belajar/3 would silently redirect back
 * to /belajar and screenshot the wrong page. /belajar itself deliberately stays
 * locked so the prerequisite-graph rendering is under test.
 * @type {Record<string, { group: string, label: string, order: number, unlockAll?: boolean }>}
 */
const PAGE_META = {
  '/': { group: 'beranda', label: 'Beranda', order: 1 },
  '/abjad': { group: 'beranda', label: 'Abjad A–Z', order: 2 },
  '/orang-tua': { group: 'beranda', label: 'Orang Tua', order: 3 },
  '/belajar': { group: 'belajar', label: 'Peta petualangan', order: 1 },
  '/belajar/1': { group: 'belajar', label: 'Level 1 · daftar pelajaran', order: 2 },
  '/belajar/3': { group: 'belajar', label: 'Level 3a · daftar pelajaran', order: 3, unlockAll: true },
  '/cocokkan': { group: 'game', label: 'Cocokkan', order: 1 },
  '/mesin': { group: 'game', label: 'Mesin Kata', order: 2 },
  '/ucapkan': { group: 'game', label: 'Ucapkan', order: 3 },
  '/menulis': { group: 'menulis', label: 'Pilih mode', order: 1 },
  '/menulis/tiru': { group: 'menulis', label: 'Tiru', order: 2 },
  '/menulis/susun': { group: 'menulis', label: 'Susun', order: 3 },
  '/menulis/ketik': { group: 'menulis', label: 'Ketik', order: 4 },
  '/preview': { group: 'dev', label: 'Preview', order: 1 },
  '/coba-suara': { group: 'dev', label: 'Coba Suara', order: 2 }
};

/** @param {string} path */
const slug = (path) => (path === '/' ? 'home' : path.replace(/^\//, '').replaceAll('/', '-'));

for (const path of pages) {
  const meta = PAGE_META[path] ?? { group: 'dev', label: path, order: 99 };

  test(path, async ({ page }, testInfo) => {
    const errors = collectErrors(page, origin);

    await seedRandom(page);
    await seedProfile(page, { unlockAll: meta.unlockAll });

    try {
      await page.goto(path, { waitUntil: 'load' });

      // Doubles as the settle: <body> is visible long before hydration paints, so
      // polling on real text is both the wait and the assertion.
      await expect
        .poll(
          async () => (await page.locator('body').innerText()).trim().length,
          { message: 'page should paint visible text', timeout: 15_000 }
        )
        .toBeGreaterThan(0);

      expect(realErrors(errors), 'page should produce no runtime errors').toEqual([]);
    } finally {
      await shot(page, testInfo, {
        group: meta.group,
        name: slug(path),
        label: meta.label,
        order: meta.order
      });
    }
  });
}
