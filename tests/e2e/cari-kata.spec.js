import { test, expect } from '@playwright/test';
import { seedProfile, seedRandom } from './fixtures.js';

test('completing a board reveals exactly one sticker from the three targets', async ({ page }) => {
  await seedRandom(page, 99);
  await seedProfile(page);
  await page.goto('/cari-kata?seed=icon-109');

  await page.getByRole('button', { name: 'Cara bermain' }).click();
  const helpDialog = page.getByRole('dialog', { name: 'Cara Bermain' });
  await expect(helpDialog).toBeVisible();
  await expect(page.getByText('Geser suku kata ke kanan atau ke bawah.')).toBeVisible();
  await expect(page.getByText('Temukan 3 kata, lalu pilih 1 kartu stiker!')).toBeVisible();
  await expect(helpDialog).toHaveAttribute('data-help-narration-count', '1');
  await page.getByRole('button', { name: 'Dengarkan Lagi' }).click();
  await expect(helpDialog).toHaveAttribute('data-help-narration-count', '2');
  await page.getByRole('button', { name: 'Mengerti!' }).click();
  await expect(page.getByRole('heading', { name: 'Cara Bermain' })).not.toBeVisible();

  await page.getByRole('button', { name: /^Mudah/ }).click();
  const rawTargets = await page.locator('[data-target-word]').evaluateAll((cards) => cards.map((card) => ({
    word: card.getAttribute('data-target-word'),
    path: card.getAttribute('data-path')?.split(',').map(Number)
  })));
  const targets = rawTargets.map((target) => {
    expect(target.word, 'seeded target word').toBeTruthy();
    expect(target.path?.length, 'seeded target path length').toBeGreaterThan(1);
    return { word: target.word ?? '', path: target.path ?? [] };
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
  const closedCardWidth = await chosenCard.locator('.prize-flip-inner').evaluate((card) =>
    card instanceof HTMLElement ? card.offsetWidth : 0
  );
  expect(closedCardWidth).toBeGreaterThan(0);
  await chosenCard.evaluate((card) => { Reflect.set(window, '__chosenPrizeCard', card); });
  await chosenCard.click();
  const reward = page.locator('[data-prize-word]');
  expect(await reward.evaluate((card) => card === Reflect.get(window, '__chosenPrizeCard'))).toBe(true);
  await expect(reward).toHaveClass(/prize-picked/);
  const rewardedWord = await reward.getAttribute('data-prize-word');
  expect(targets.map((target) => target.word)).toContain(rewardedWord);
  await expect(reward).toHaveAttribute('data-reward-state', 'revealed');
  await expect(reward.locator('[data-reward-color]')).toBeVisible();
  const openedCard = await reward.locator('.prize-flip-inner').boundingBox();
  expect(openedCard, 'opened prize card bounds').not.toBeNull();
  expect(openedCard?.width ?? 0).toBeGreaterThan(closedCardWidth * 1.7);
  expect(await reward.locator('.prize-card-front').evaluate((front) => {
    const syllables = front.querySelector('[data-reward-syllables]');
    if (!(syllables instanceof HTMLElement)) return false;
    const cardBounds = front.getBoundingClientRect();
    const syllableBounds = syllables.getBoundingClientRect();
    return syllableBounds.top >= cardBounds.top - 1 && syllableBounds.bottom <= cardBounds.bottom + 1;
  })).toBe(true);
  await expect(page.getByText(/Hebat! Kamu mendapat/)).toBeVisible();

  await page.getByRole('link', { name: 'Lihat Album' }).click();
  await expect(page.getByRole('tab', { name: /Cari Kata/ })).toHaveAttribute('aria-selected', 'true');
  for (const target of targets) {
    const card = page.locator(`[data-kata-word="${target.word}"]`);
    if (target.word === rewardedWord) await expect(card).toBeEnabled();
    else await expect(card).toBeDisabled();
  }
});
