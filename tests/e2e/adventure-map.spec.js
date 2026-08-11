import { test, expect } from '@playwright/test';
import { seedProfile, seedRandom } from './fixtures.js';
import { shot } from './shot.js';
import { LEVELS } from '../../src/lib/content/levels.js';

test.describe('adventure map', () => {
  test('keeps an age-unlocked checkpoint available after returning from another level', async ({ page }) => {
    await seedRandom(page);
    // The oldest age band starts with Level 2 available, independently of
    // progress through Level 1. This catches a map whose colour and navigation
    // state ever drift apart after a route change.
    await seedProfile(page, { unlockedLevel: 2 });
    await page.goto('/belajar', { waitUntil: 'load' });

    await page.getByRole('link', { name: /1, Huruf, ketuk untuk mulai/i }).click();
    await expect(page).toHaveURL(/\/belajar\/1$/);
    // Hardware/gesture back is intentionally blocked app-wide (toddlers mash it
    // mid-activity); the in-app "Kembali" button is the way back.
    await page.getByRole('button', { name: 'Kembali' }).click();
    await expect(page).toHaveURL(/\/belajar$/);

    await page.getByRole('link', { name: /2a, Suku Kata Terbuka, ketuk untuk mulai/i }).click();
    await expect(page).toHaveURL(/\/belajar\/2$/);
    await expect(page.getByText('Level 2a · Suku Kata Terbuka')).toBeVisible();
  });

  test('keeps the locked checkpoint sheet keyboard accessible', async ({ page }) => {
    await seedRandom(page);
    await seedProfile(page);
    await page.goto('/belajar', { waitUntil: 'load' });

    const lockedCheckpoint = page.getByRole('button', { name: /2a, Suku Kata Terbuka, terkunci/i });
    await lockedCheckpoint.focus();
    await page.keyboard.press('Enter');

    const sheet = page.getByRole('dialog');
    await expect(sheet).toBeVisible();
    await expect(sheet).toBeFocused();
    await page.keyboard.press('Escape');
    await expect(sheet).toBeHidden();
    await expect(lockedCheckpoint).toBeFocused();
  });

  test('smoke tests a mostly unlocked adventure map', async ({ page }, testInfo) => {
    await seedRandom(page);
    // These completed final exams open every checkpoint through Level 8. Level
    // 9 deliberately remains locked because Level 8 is still in progress.
    await seedProfile(page, { bestScore: { 1: 0.8, 2: 0.8, 3: 0.8, 4: 0.8, 5: 0.8, 7: 0.8 } });
    await page.goto('/belajar', { waitUntil: 'load' });

    for (const level of LEVELS.filter((level) => level.id !== 9)) {
      const checkpoint = page.getByRole('link', { name: new RegExp(`${level.label}, ${level.title}`, 'i') });
      await expect(checkpoint).toBeVisible();
      await expect(checkpoint).not.toHaveAttribute('aria-disabled', 'true');
    }
    const lastCheckpoint = page.getByRole('button', { name: /3c, Susun Kata Panjang, terkunci/i });
    await expect(lastCheckpoint).toBeVisible();
    await expect(lastCheckpoint).toHaveAttribute('aria-disabled', 'true');

    await shot(page, testInfo, {
      group: 'belajar',
      name: 'peta-petualangan-terbuka',
      label: 'Peta petualangan — hampir semua level terbuka',
      order: 1.5,
      route: '/belajar'
    });
  });
});
