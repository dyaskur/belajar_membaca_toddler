import { test, expect } from '@playwright/test';
import { seedProfile, seedRandom } from './fixtures.js';

test('completing a board reveals exactly one sticker from the three targets', async ({ page }) => {
  await seedRandom(page, 99);
  await seedProfile(page);
  await page.goto('/cari-kata?seed=e2e');

  await page.getByRole('button', { name: /^Mudah/ }).click();
  const rawTargets = await page.locator('[data-target-word]').evaluateAll((cards) => cards.map((card) => ({
    word: card.getAttribute('data-target-word'),
    path: card.getAttribute('data-path')?.split(',').map(Number)
  })));
  const targets = rawTargets.map((target) => {
    if (!target.word || !target.path?.length) throw new Error('Seeded board target metadata is missing');
    return { word: target.word, path: target.path };
  });
  await expect(page.locator('[aria-label="Kata yang dicari"]')).not.toContainText('❔');

  for (const target of targets) {
    await page.locator(`[data-cell="${target.path[0]}"]`).click();
    await page.locator(`[data-cell="${target.path.at(-1)}"]`).click();
    await expect(page.locator(`[data-target-word="${target.word}"]`)).toHaveAttribute('aria-label', /ditemukan/, { timeout: 15_000 });
  }

  await page.getByRole('button', { name: 'Acak Stiker!' }).click();
  await expect(page.getByRole('heading', { name: 'Pilih satu stiker!' })).toBeVisible();
  await page.locator('[data-prize-card="0"]').click();
  const reward = page.locator('[data-prize-word]');
  const rewardedWord = await reward.getAttribute('data-prize-word');
  if (!rewardedWord || !targets.some((target) => target.word === rewardedWord)) throw new Error('Reward is not one of the board targets');

  await page.getByRole('link', { name: 'Lihat Album' }).click();
  await expect(page.getByRole('tab', { name: /Cari Kata/ })).toHaveAttribute('aria-selected', 'true');
  for (const target of targets) {
    const card = page.locator(`[data-kata-word="${target.word}"]`);
    if (target.word === rewardedWord) await expect(card).toBeEnabled();
    else await expect(card).toBeDisabled();
  }
});
