import { test, expect } from '@playwright/test';
import { collectErrors, realErrors, seedProfile, seedRandom } from './fixtures.js';
import { shot } from './shot.js';
import { ALL, PAGE_META } from './routes.js';

// Per-page smoke test: the page paints real content, throws no runtime
// errors, and every same-origin request succeeds. A full-page screenshot is
// captured even when the checks fail so the PR comment shows the broken state.
const pages = JSON.parse(process.env.TEST_PAGES ?? JSON.stringify(ALL));
const origin = new URL(process.env.BASE_URL ?? 'http://localhost:4173').origin;

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
        order: meta.order,
        route: path
      });
    }
  });
}
