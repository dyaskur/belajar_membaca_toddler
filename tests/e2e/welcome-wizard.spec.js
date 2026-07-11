import { mkdirSync } from 'node:fs';
import { test, expect } from '@playwright/test';

const shotDir = process.env.SHOT_DIR ?? 'shots';

mkdirSync(shotDir, { recursive: true });

/** @param {import('@playwright/test').Page} page @param {import('@playwright/test').TestInfo} testInfo @param {string} name */
async function screenshotStep(page, testInfo, name) {
  await page.waitForTimeout(500);
  await page.screenshot({
    path: `${shotDir}/wizard-${name}-${testInfo.project.name}.png`,
    fullPage: true
  });
}

test('captures first-run wizard steps', async ({ page }, testInfo) => {
  await page.addInitScript(() => {
    localStorage.removeItem('klm.profiles.v1');
    localStorage.removeItem('klm.activeProfile.v1');
  });

  await page.goto('/', { waitUntil: 'load' });
  await expect(page.getByRole('button', { name: 'Mulai' })).toBeVisible();
  await screenshotStep(page, testInfo, 'start');

  await page.getByRole('button', { name: 'Mulai' }).click();
  await expect(page.getByRole('heading', { name: 'Pilih suara' })).toBeVisible();
  await screenshotStep(page, testInfo, 'step-1-speaker');

  await page.getByRole('button', { name: /Lanjut/ }).click();
  await expect(page.getByRole('heading', { name: 'Pilih warna robot' })).toBeVisible();
  await screenshotStep(page, testInfo, 'step-2-robot-color');

  await page.getByRole('button', { name: /Lanjut/ }).click();
  await expect(page.getByRole('heading', { name: 'Berapa umurmu?' })).toBeVisible();
  await expect(page.getByRole('button', { name: /6\+ tahun/ })).toBeVisible();
  await screenshotStep(page, testInfo, 'step-3-age');

  await page.getByRole('button', { name: /Lanjut/ }).click();
  await expect(page.getByRole('heading', { name: 'Tulis nama kamu' })).toBeVisible();
  await screenshotStep(page, testInfo, 'step-4-name');

  await page.getByRole('button', { name: 'Mulai' }).click();
  await expect(page.getByText('Silakan tulis namamu dulu')).toBeVisible();
  await screenshotStep(page, testInfo, 'step-4-name-nudge');
});
