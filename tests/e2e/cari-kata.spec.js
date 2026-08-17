import { test, expect } from '@playwright/test';
import { seedProfile, seedRandom } from './fixtures.js';

test('tap-tap finds a target and unlocks its album card', async ({ page }) => {
  await seedRandom(page, 99);
  await seedProfile(page);
  await page.goto('/cari-kata?seed=e2e');

  await page.getByRole('button', { name: /^Mudah/ }).click();
  const target = page.locator('[data-target-word]').first();
  const word = await target.getAttribute('data-target-word');
  const rawPath = await target.getAttribute('data-path');
  if (!word || !rawPath) throw new Error('Seeded board target metadata is missing');
  const path = rawPath.split(',').map(Number);

  await page.locator(`[data-cell="${path[0]}"]`).click();
  await page.locator(`[data-cell="${path.at(-1)}"]`).click();
  await expect(page.getByText(new RegExp(`${word} ditemukan`))).toBeVisible({ timeout: 15_000 });

  await page.getByRole('link', { name: /Album/ }).click();
  await expect(page.getByRole('tab', { name: /Cari Kata/ })).toHaveAttribute('aria-selected', 'true');
  await expect(page.locator(`[data-kata-word="${word}"]`)).toBeEnabled();
});
