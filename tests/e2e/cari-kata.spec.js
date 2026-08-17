import { test, expect } from '@playwright/test';
import { collectErrors, realErrors, seedProfile, seedRandom } from './fixtures.js';
import { shot } from './shot.js';

const origin = new URL(process.env.BASE_URL ?? 'http://localhost:4173').origin;

/**
 * Cari Kata end-to-end: a seeded board must be solvable, finding a target must
 * flip its card and unlock the album card, and nonsense must never punish.
 */
test.describe('cari-kata', () => {
  test('finds a target and it appears in the Cari Kata album tab', async ({ page }, testInfo) => {
    const errors = collectErrors(page, origin);
    await seedRandom(page, 42);
    await seedProfile(page);

    await page.goto('/cari-kata', { waitUntil: 'load' });
    await expect(page.getByRole('button', { name: /Sulit/ })).toBeVisible();
    await page.getByRole('button', { name: /Sulit/ }).click();

    const grid = page.locator('[role="gridcell"]');
    await expect.poll(() => grid.count(), { timeout: 15_000 }).toBeGreaterThanOrEqual(16);

    const size = Math.round(Math.sqrt(await grid.count()));
    const cells = await grid.evaluateAll((els, n) =>
      els.slice(0, n * n).map((el, i) => ({ i, text: el.textContent ?? '' })),
      size
    );

    // Pick the first target word and find its straight right/down run on the board.
    const targetCard = page.locator('[data-word]').first();
    const word = (await targetCard.getAttribute('data-word')) ?? '';
    expect(word.length).toBeGreaterThan(0);
    const found = findRun(cells, size, word);
    expect(found, `target "${word}" should exist as a straight run`).not.toBeNull();
    if (!found) throw new Error(`target "${word}" not found as a straight run`);

    // Simulate a drag: pointerdown on the first cell, pointermove to the last,
    // then pointerup (bubbles to the window's onpointerup).
    const [s, e] = found;
    await page.locator(`[data-cell="${s}"]`).dispatchEvent('pointerdown', { bubbles: true });
    await page.locator(`[data-cell="${e}"]`).dispatchEvent('pointermove', { bubbles: true });
    await page.locator(`[data-cell="${e}"]`).dispatchEvent('pointerup', { bubbles: true });

    // The target card should flip to found.
    await expect(
      page.locator(`[data-word="${word}"]`),
      'target card should become found'
    ).not.toBeDisabled();

    await shot(page, testInfo, {
      group: 'cari-kata',
      name: 'board-found',
      label: 'Papan + target ditemukan',
      order: 1,
      route: '/cari-kata'
    });

    // Its album card unlocks in the Cari Kata tab of Buku Stiker.
    await page.goto('/stiker?tab=cari-kata', { waitUntil: 'load' });
    await expect(page.locator(`[data-word="${word}"]`).first()).toBeVisible();

    expect(realErrors(errors), 'page should produce no runtime errors').toEqual([]);
  });
});

/**
 * Scan the grid for a word running forward (right or down) from cell `i`.
 * @param {{ i: number, text: string }[]} cells
 * @param {number} size
 * @param {string} word
 * @returns {[number, number] | null} inclusive start/end cell indices
 */
function findRun(cells, size, word) {
  /** @param {number} r @param {number} c */
  const cell = (r, c) => cells.find((x) => x.i === r * size + c);
  /** @param {number} r @param {number} c */
  const textAt = (r, c) => cell(r, c)?.text ?? '';
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      for (const [dr, dc] of [[0, 1], [1, 0]]) {
        let acc = '';
        let last = r * size + c;
        for (let k = 0; r + dr * k < size && c + dc * k < size; k++) {
          acc += textAt(r + dr * k, c + dc * k);
          last = (r + dr * k) * size + (c + dc * k);
          if (acc === word) return [r * size + c, last];
          if (acc.length >= word.length) break;
        }
      }
    }
  }
  return null;
}