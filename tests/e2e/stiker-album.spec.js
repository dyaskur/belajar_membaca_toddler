import { test, expect } from '@playwright/test';
import { seedProfile, seedRandom } from './fixtures.js';
import { shot } from './shot.js';

// pages.spec.js's generic sweep only ever seeds a profile with zero stickers, so
// it only ever exercises Buku Stiker's all-silhouette empty state. This spec
// covers the other side: some stickers already collected, some of those still
// flagged "BARU" (not yet individually opened), and the rest still locked.

const GROUP = 'stiker-album';

test('partly collected album — owned, seen, and still-new tiles', async ({ page }, testInfo) => {
  await seedRandom(page);
  await seedProfile(page, {
    // Owned + already opened: no badge.
    // Owned, not yet opened: "BARU" badge.
    // Everything else (most of the album): still a locked silhouette.
    stickers: ['pisang', 'apel', 'bebek', 'trofi-1'],
    stickersSeen: ['pisang', 'bebek']
  });

  await page.goto('/stiker', { waitUntil: 'load' });

  await expect(page.getByText('Buku Stiker')).toBeVisible({ timeout: 30_000 });
  // Two owned-not-yet-opened tiles ('apel', 'trofi-1') should each carry their own badge.
  await expect(page.getByText('BARU')).toHaveCount(2);

  await shot(page, testInfo, {
    group: GROUP,
    name: 'stiker-partly-collected',
    label: 'Sebagian terkumpul + lencana BARU',
    order: 1,
    route: '/stiker'
  });
});
