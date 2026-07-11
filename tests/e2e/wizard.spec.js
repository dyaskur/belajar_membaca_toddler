import { mkdirSync } from 'node:fs';
import { test, expect } from '@playwright/test';

// Walk the first-run welcome wizard end to end, screenshotting every step.
// Unlike pages.spec.js this seeds NO profile: empty storage is exactly what
// makes the home page show the wizard instead of the profile grid.
const shotDir = process.env.SHOT_DIR ?? 'shots';

mkdirSync(shotDir, { recursive: true });

test('wizard', async ({ page }, testInfo) => {
  /** @param {string} step */
  const shot = (step) =>
    page.screenshot({ path: `${shotDir}/wizard-${step}-${testInfo.project.name}.png`, fullPage: true });

  await page.goto('/', { waitUntil: 'load' });
  const mulai = page.getByRole('button', { name: 'Mulai' });
  await expect(mulai).toBeVisible();
  await page.waitForTimeout(1500); // let fonts and entry animations settle
  await shot('0-selamat-datang');

  await mulai.click();
  await expect(page.getByRole('heading', { name: 'Pilih suara' })).toBeVisible();
  await expect(page.getByRole('button', { name: /Ibu Khotijah/ })).toContainText('✅');
  await shot('1-suara');

  await page.getByRole('button', { name: /Lanjut/ }).click();
  await expect(page.getByRole('heading', { name: 'Pilih warna robot' })).toBeVisible();
  await shot('2-warna');

  await page.getByRole('button', { name: /Lanjut/ }).click();
  await expect(page.getByRole('heading', { name: 'Umur kamu berapa?' })).toBeVisible();
  await expect(page.getByRole('button', { name: '≤4 tahun' })).toHaveAttribute('aria-pressed', 'true');
  await shot('3-umur');

  await page.getByRole('button', { name: /Lanjut/ }).click();
  await expect(page.getByRole('heading', { name: 'Siapa nama kamu?' })).toBeVisible();
  await shot('4-nama');

  // Saving with an empty name must nudge (ring + hint + focus), not proceed.
  await mulai.click();
  await expect(page.getByText('Silakan tulis namamu dulu')).toBeVisible();
  await expect(page.getByPlaceholder('Nama anak')).toBeFocused();
  await page.waitForTimeout(500); // let the shake finish so the shot is stable
  await shot('5-nama-kosong');

  await page.getByPlaceholder('Nama anak').fill('Tes');
  await mulai.click();
  await page.waitForURL('**/belajar');
});
