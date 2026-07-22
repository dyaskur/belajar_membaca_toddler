import { test, expect } from '@playwright/test';
import { shot } from './shot.js';

test('captures first-run wizard steps', async ({ page }, testInfo) => {
  await page.addInitScript(() => {
    localStorage.removeItem('klm.profiles.v1');
    localStorage.removeItem('klm.activeProfile.v1');
  });

  /** @param {string} name @param {string} label @param {number} order */
  const step = (name, label, order) =>
    shot(page, testInfo, { group: 'wizard', name: `wizard-${name}`, label, order });

  await page.goto('/', { waitUntil: 'load' });
  // 'load' fires before SvelteKit hydrates, so this first assertion is really
  // waiting on hydration — which on a cold server can exceed expect's 5s default.
  await expect(page.getByRole('button', { name: 'Mulai' })).toBeVisible({ timeout: 30_000 });
  await step('start', 'Mulai', 1);

  await page.getByRole('button', { name: 'Mulai' }).click();
  await expect(page.getByRole('heading', { name: 'Pilih suara' })).toBeVisible();
  await step('step-1-speaker', '1. Pilih suara', 2);

  await page.getByRole('button', { name: /Lanjut/ }).click();
  await expect(page.getByRole('heading', { name: 'Pilih warna robot' })).toBeVisible();
  await step('step-2-robot-color', '2. Warna robot', 3);

  await page.getByRole('button', { name: /Lanjut/ }).click();
  await expect(page.getByRole('heading', { name: 'Berapa umurmu?' })).toBeVisible();
  await expect(page.getByRole('button', { name: /6\+ tahun/ })).toBeVisible();
  await step('step-3-age', '3. Umur', 4);

  await page.getByRole('button', { name: /Lanjut/ }).click();
  await expect(page.getByRole('heading', { name: 'Tulis nama kamu' })).toBeVisible();
  await step('step-4-name', '4. Nama', 5);

  await page.getByRole('button', { name: 'Mulai' }).click();
  await expect(page.getByText('Silakan tulis namamu dulu')).toBeVisible();
  await step('step-4-name-nudge', '4. Nama · pengingat', 6);
});
