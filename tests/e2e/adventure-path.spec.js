import { test, expect } from '@playwright/test';

const PROFILE = {
  id: 'adventure-test',
  name: 'Aisyah',
  avatar: 'teal',
  voiceId: 'ibu-dewi',
  quizTileCount: 3,
  bestScore: {},
  lessonScore: { 1: { 7: 1 }, 2: { 19: 1 }, 4: { 3: 1 } },
  unlockedLevel: 1,
  lastCompletedLevel: 4
};

test('shows the branching path, traveling robot, and locked feedback', async ({ page }) => {
  await page.addInitScript((profile) => {
    localStorage.setItem('klm.profiles.v1', JSON.stringify([profile]));
    localStorage.setItem('klm.activeProfile.v1', profile.id);
    sessionStorage.setItem('klm.justCompletedLevel', '4');
  }, PROFILE);

  await page.goto('/belajar');

  await expect(page.getByRole('heading', { name: 'Petualangan Membaca' })).toBeVisible();
  await expect(page.locator('[data-node]')).toHaveCount(8);
  await expect(page.locator('[data-node="4"]').locator('xpath=..')).toHaveClass(/robot-hop/);
  await expect(page.getByRole('button', { name: /Level 3b.*terkunci/ })).toBeVisible();

  await page.getByRole('button', { name: /Level 3b.*terkunci/ }).click();
  await expect(page).toHaveURL(/\/belajar$/);
  await expect(page.getByRole('status')).toContainText('Selesaikan 3a Susun Kata');
  await expect(page.getByText('Bonus')).toBeVisible();
});
