import { expect, test } from '@playwright/test';
import { collectErrors, realErrors, seedProfile, seedRandom } from './fixtures.js';

/** Only run this flow once — it asserts behaviour, not layout, so five viewports is waste. */
test.describe.configure({ mode: 'default' });

/**
 * Read the board off the DOM as a grid of syllables, plus the target words the child
 * has to find.
 * @param {import('@playwright/test').Page} page
 */
async function readBoard(page) {
  const cells = await page.locator('[data-cell]').evaluateAll((nodes) =>
    nodes.map((node) => ({
      key: node.getAttribute('data-cell') ?? '',
      text: (node.textContent ?? '').trim()
    }))
  );
  /** @type {Map<string, string>} */
  const grid = new Map(cells.map((cell) => [cell.key, cell.text]));
  return grid;
}

/**
 * Find where a word sits on the board, scanning the two allowed directions.
 * @param {Map<string, string>} grid @param {string[]} syllables @param {number} size
 */
function locate(grid, syllables, size) {
  for (const [dr, dc] of [[0, 1], [1, 0]]) {
    for (let row = 0; row < size; row++) {
      for (let col = 0; col < size; col++) {
        const keys = syllables.map((_, i) => `${row + dr * i}:${col + dc * i}`);
        if (keys.every((key, i) => grid.get(key) === syllables[i])) return keys;
      }
    }
  }
  return null;
}

test('finds a target by tapping, collects the card, and reads nonsense without punishing it', async ({
  page
}, testInfo) => {
  test.skip(testInfo.project.name !== 'phone', 'behaviour flow — one viewport is enough');

  const origin = new URL(page.url() || 'http://localhost:4173').origin;
  const errors = collectErrors(page, origin);
  await seedProfile(page);
  await seedRandom(page);

  await page.goto('/cari-kata');
  await expect(page.getByRole('heading', { name: 'Cari Kata' })).toBeVisible();

  // Easiest tier: a 4x4 board of two-syllable words.
  await page.getByRole('button', { name: /Mudah/ }).click();
  await expect(page.locator('[data-cell]')).toHaveCount(16);

  const grid = await readBoard(page);

  // The three target cards spell their word out as "ku · da" until it is found.
  const targetLabels = await page.locator('.grid-cols-3 button').allInnerTexts();
  const targets = targetLabels.map((label) => label.split('\n').at(-1)?.replace(/ · /g, '') ?? '');
  expect(targets.filter(Boolean).length).toBeGreaterThanOrEqual(3);

  const word = targets.find((candidate) => locate(grid, candidate.match(/../g) ?? [], 4));
  expect(word, 'at least one target must be findable on the board').toBeTruthy();
  const keys = locate(grid, /** @type {string} */ (word).match(/../g) ?? [], 4);

  // Tap the first cell, then the last — the tap-tap path a small hand actually uses.
  await page.locator(`[data-cell="${keys?.at(0)}"]`).click();
  await page.locator(`[data-cell="${keys?.at(-1)}"]`).click();

  await expect(page.getByText('Kartu baru di album!')).toBeVisible();
  await expect(page.getByText('✓ ketemu')).toBeVisible();

  // The word is now in the child's album.
  const collected = await page.evaluate(() => {
    const raw = JSON.parse(localStorage.getItem('klm.profiles.v1') ?? '[]');
    return raw[0]?.kataWords ?? [];
  });
  expect(collected).toContain(word);

  // The cari-kata bucket ships an empty pack.json until `npm run generate:audio` fills
  // it, so an ungenerated voice costs a harmless empty manifest — not a 404 on every
  // visit — and the game reads by chaining level-2 syllable clips meanwhile.
  expect(realErrors(errors)).toEqual([]);
});
