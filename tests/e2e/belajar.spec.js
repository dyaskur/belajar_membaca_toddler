import { test, expect } from '@playwright/test';

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

test.describe('Belajar Quiz UI Smoke Test', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript((profile) => {
      localStorage.setItem('klm.profiles.v1', JSON.stringify([profile]));
      localStorage.setItem('klm.activeProfile.v1', profile.id);
    }, CI_PROFILE);
  });

  test('Robot tap and answer tile interaction', async ({ page }) => {
    await page.goto('/belajar/1/0');
    
    // Check we are in the teach phase
    await expect(page.locator('text=Ayo belajar')).toBeVisible();
    
    // Wait a bit for intro voice to start, then click Mulai Latihan
    const startBtn = page.getByRole('button', { name: /Mulai Latihan/i });
    await expect(startBtn).toBeVisible();
    await startBtn.click();

    // Verify robot tap animation
    const robotBtn = page.locator('button.robot');
    await expect(robotBtn).toBeVisible();
    await robotBtn.click({ force: true });
    
    // After clicking, it should have a tap animation class
    await expect(robotBtn).toHaveClass(/tap-/);
    
    // Verify tiles are rendered with entrance animation
    const tiles = page.locator('.grid button');
    await expect(tiles).toHaveCount(3);
    
    // One of the tiles should have tile class initially
    await expect(tiles.first()).toHaveClass(/tile/);
    
    // Wait for the question audio to finish and the tile to become interactive
    await expect(tiles.first()).toBeEnabled({ timeout: 15000 });
    
    // Pick the first tile, it could be right or wrong
    await tiles.first().click();
    
    // If it's right, it gets tile-won, if wrong it gets tile-wrong.
    // We verify that it reacted and got one of the feedback classes.
    await expect(tiles.first()).toHaveClass(/(tile-won|tile-wrong)/);
  });
});
