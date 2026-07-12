import { mkdirSync } from 'node:fs';
import { test, expect } from '@playwright/test';

// Per-page smoke test: the page paints real content, throws no runtime
// errors, and every same-origin request succeeds. A full-page screenshot is
// captured even when the checks fail so the PR comment shows the broken state.
const pages = JSON.parse(process.env.TEST_PAGES ?? '["/"]');
const shotDir = process.env.SHOT_DIR ?? 'shots';
const origin = new URL(process.env.BASE_URL ?? 'http://localhost:4173').origin;

// Known-harmless noise (browser quirks, missing favicon variants).
const IGNORED_ERRORS = [/favicon/i];

const slug = (path) => (path === '/' ? 'home' : path.replace(/^\//, '').replaceAll('/', '-'));

// Without a profile every page bounces to the "Tambah" profile picker, so all
// screenshots look identical. Seed one (matching profiles.svelte.js storage).
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
mkdirSync(shotDir, { recursive: true });

for (const path of pages) {
  test(path, async ({ page }, testInfo) => {
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

    await page.addInitScript((profile) => {
      localStorage.setItem('klm.profiles.v1', JSON.stringify([profile]));
      localStorage.setItem('klm.activeProfile.v1', profile.id);
    }, CI_PROFILE);
    try {
      await page.goto(path, { waitUntil: 'load' });
      // Let fonts, images, and entry animations settle before judging/shooting.
      await page.waitForTimeout(1500);

      const bodyText = (await page.locator('body').innerText()).trim();
      expect(bodyText.length, 'page should paint visible text').toBeGreaterThan(0);

      const real = errors.filter((e) => !IGNORED_ERRORS.some((rx) => rx.test(e)));
      expect(real, 'page should produce no runtime errors').toEqual([]);
    } finally {
      await page
        .screenshot({
          path: `${shotDir}/${slug(path)}-${testInfo.project.name}.png`,
          fullPage: true
        })
        .catch(() => {});
    }
  });
}
