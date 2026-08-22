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
    const card = page.locator(`[data-target-word="${target.word}"]`);
    await expect(card.locator('[data-target-emoji]')).toBeVisible();
    await expect(card.locator('img')).toHaveCount(0);
  }

  for (const target of targets) {
    await page.locator(`[data-cell="${target.path[0]}"]`).click();
    await page.locator(`[data-cell="${target.path.at(-1)}"]`).click();
    const card = page.locator(`[data-target-word="${target.word}"]`);
    await expect(card).toHaveAttribute('aria-label', /ditemukan/, { timeout: 15_000 });
    await expect(card.locator('[data-target-sticker]')).toBeVisible();
  }

  await page.getByRole('button', { name: 'Acak Stiker!' }).click();
  await expect(page.getByRole('heading', { name: 'Pilih satu stiker!' })).toBeVisible();
  const chosenCard = page.locator('[data-prize-card="0"]');
  const closedCard = await chosenCard.locator('.prize-flip-inner').boundingBox();
  if (!closedCard) throw new Error('Closed prize card has no visible bounds');
  await chosenCard.evaluate((card) => { Reflect.set(window, '__chosenPrizeCard', card); });
  await chosenCard.click();
  const reward = page.locator('[data-prize-word]');
  expect(await reward.evaluate((card) => card === Reflect.get(window, '__chosenPrizeCard'))).toBe(true);
  await expect(reward).toHaveClass(/prize-picked/);
  await expect(reward).toHaveAttribute('data-reward-state', 'opening');
  await expect(reward.locator('[data-reward-silhouette]')).toBeVisible();
  const rewardedWord = await reward.getAttribute('data-prize-word');
  if (!rewardedWord || !targets.some((target) => target.word === rewardedWord)) throw new Error('Reward is not one of the board targets');
  await expect(reward).toHaveAttribute('data-reward-state', 'revealed');
  await expect(reward.locator('[data-reward-color]')).toBeVisible();
  const openedCard = await reward.locator('.prize-flip-inner').boundingBox();
  if (!openedCard) throw new Error('Opened prize card has no visible bounds');
  expect(openedCard.width).toBeGreaterThan(closedCard.width * 1.7);
  await expect(page.getByText(/Hebat! Kamu mendapat/)).toBeVisible();

  await page.getByRole('link', { name: 'Lihat Album' }).click();
  await expect(page.getByRole('tab', { name: /Cari Kata/ })).toHaveAttribute('aria-selected', 'true');
  for (const target of targets) {
    const card = page.locator(`[data-kata-word="${target.word}"]`);
    if (target.word === rewardedWord) await expect(card).toBeEnabled();
    else await expect(card).toBeDisabled();
  }
});
