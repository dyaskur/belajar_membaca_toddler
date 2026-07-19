import { test, expect } from '@playwright/test';
import { seedProfile, seedRandom } from './fixtures.js';
import { shot } from './shot.js';
// Reuse the app's own syllabification rather than duplicating it — if the rules
// change, the test follows automatically.
import { syllablesForWord } from '../../src/lib/content/blend.js';

// Walks one sub-level of each quiz mechanic through teach → quiz → wrong → finish.
// Both mechanics share the teach and result screens but render completely
// different quiz UIs, so one sub-level would leave SpellWord with no coverage.
//
// The prompt is audio-only and tiles render bare text, so the test reads the
// answer from data-* hooks in the markup; see the note at each hook.
//
// Reaching the *pass* screen after a deliberate mistake is content-dependent:
// `correct++` counts first tries only, and the round length is derived
// (quiz.js: min(8, max(newItems, 4) + reviewItems)). Lesson 1 is used rather
// than lesson 0 because it pulls in review items for a full 8-question round,
// where one mistake is 87.5%. `playThrough` still replays the round cleanly if a
// future content change ever pushes that below the 0.8 gate, so the pass screen
// can't silently stop being captured.

const GROUP = 'belajar-flow';
const passHeading = /** @param {import('@playwright/test').Page} p */ (p) =>
  p.getByRole('heading', { name: /Hebat!/ });

/** @param {import('@playwright/test').Page} page */
async function startPractice(page) {
  await page.getByRole('button', { name: /Mulai Latihan/ }).click();
}

/** Wait for the round to move past `from`, or for the result screen to replace it.
 * @param {import('@playwright/test').Page} page
 * @param {string} selector
 * @param {string | null} from
 */
async function nextQuestion(page, selector, from) {
  await expect
    .poll(
      async () => {
        const el = page.locator(selector).first();
        if (!(await el.count())) return 'done';
        return await el.getAttribute('data-question');
      },
      { timeout: 20_000 }
    )
    .not.toBe(from);
}

/**
 * Answer a whole round correctly, optionally injecting a one-off action before the
 * answer. `once` returns false to decline the current question and be retried on
 * the next — some questions can't produce a wrong answer at all (a word whose
 * syllables are all identical has no wrong ordering).
 * @param {import('@playwright/test').Page} page
 * @param {string} selector
 * @param {(el: import('@playwright/test').Locator) => Promise<void>} answer
 * @param {((el: import('@playwright/test').Locator) => Promise<boolean>) | undefined} [once]
 * @returns {Promise<boolean>} whether `once` ever ran
 */
async function playRound(page, selector, answer, once) {
  let pending = once;
  for (let i = 0; i < 30; i++) {
    const el = page.locator(selector).first();
    if (!(await el.count())) break;
    const q = await el.getAttribute('data-question');
    if (pending && (await pending(el))) pending = undefined;
    await answer(el);
    await nextQuestion(page, selector, q);
  }
  return once ? pending === undefined : true;
}

/**
 * Guarantee we end on the pass screen: if the deliberate mistake cost too much
 * for the round's length, replay it cleanly.
 * @param {import('@playwright/test').Page} page
 * @param {() => Promise<unknown>} replay
 */
async function ensurePassed(page, replay) {
  if (await passHeading(page).count()) return;
  await page.getByRole('button', { name: 'Ulangi' }).click();
  await startPractice(page);
  await replay();
  await expect(passHeading(page)).toBeVisible();
}

test.describe('belajar lesson flow', () => {
  // A full round is up to 8 audio-narrated questions plus the teach intro, and may
  // be replayed — far past the 30s default.
  test.setTimeout(240_000);

  test.beforeEach(async ({ page }) => {
    await seedRandom(page);
    // unlockAll only to reach pack 3a; /belajar's own locked rendering is
    // covered by pages.spec.js, which deliberately leaves this off.
    await seedProfile(page, { unlockAll: true });
  });

  test('recognition — pack 1', async ({ page }, testInfo) => {
    await page.goto('/belajar/1/1', { waitUntil: 'load' });

    await expect(page.getByRole('button', { name: /Mulai Latihan/ })).toBeVisible();
    await shot(page, testInfo, {
      group: GROUP,
      name: 'recognition-teach',
      label: 'Huruf · belajar',
      order: 1
    });

    await startPractice(page);
    await expect(page.locator('[data-target-id]')).toBeVisible();
    await shot(page, testInfo, {
      group: GROUP,
      name: 'recognition-quiz',
      label: 'Huruf · kuis',
      order: 2
    });

    /** @param {import('@playwright/test').Locator} el */
    const answer = async (el) => {
      const id = await el.getAttribute('data-target-id');
      await page.locator(`[data-item-id="${id}"]`).click();
    };

    /** One deliberate wrong tap, captured, before answering correctly.
     * @param {import('@playwright/test').Locator} el */
    const tapWrong = async (el) => {
      const id = await el.getAttribute('data-target-id');
      await page.locator(`[data-item-id]:not([data-item-id="${id}"])`).first().click();
      await expect(page.locator('.tile-wrong')).toBeVisible();
      await shot(page, testInfo, {
        group: GROUP,
        name: 'recognition-wrong',
        label: 'Huruf · jawaban salah',
        order: 3
      });
      return true;
    };

    const captured = await playRound(page, '[data-target-id]', answer, tapWrong);
    expect(captured, 'the wrong-answer state should have been captured').toBe(true);
    await ensurePassed(page, () => playRound(page, '[data-target-id]', answer));

    await expect(passHeading(page)).toBeVisible();
    await shot(page, testInfo, {
      group: GROUP,
      name: 'recognition-finish',
      label: 'Huruf · selesai (lulus)',
      order: 4
    });
  });

  test('susun — pack 3a', async ({ page }, testInfo) => {
    await page.goto('/belajar/3/1', { waitUntil: 'load' });

    await expect(page.getByRole('button', { name: /Mulai Latihan/ })).toBeVisible();
    await shot(page, testInfo, {
      group: GROUP,
      name: 'susun-teach',
      label: 'Susun Kata · belajar',
      order: 5
    });

    await startPractice(page);
    await expect(page.locator('[data-target-text]')).toBeVisible();
    await shot(page, testInfo, {
      group: GROUP,
      name: 'susun-quiz',
      label: 'Susun Kata · kuis',
      order: 6
    });

    /** Tap the bank tiles for `units`, skipping tiles already used.
     * @param {string[]} units */
    const place = async (units) => {
      for (const u of units) {
        await page.locator(`[data-unit="${u}"]:not([disabled])`).first().click();
      }
    };

    /** @param {import('@playwright/test').Locator} el */
    const answer = async (el) => {
      const w = /** @type {string} */ (await el.getAttribute('data-target-text'));
      await place(syllablesForWord(w));
    };

    /** Pack 3a offers no distractor tiles by design (blend.js: "3a intentionally
     * has none"), so the only wrong answer is a wrong order. Blind reversal is
     * unsafe — "susu" reverses to itself — so swap position 0 with the first
     * position that actually differs. A word with no differing position (every
     * syllable identical) cannot be answered wrongly at all: decline it and let
     * the next question carry the capture.
     * @param {import('@playwright/test').Locator} el */
    const placeWrong = async (el) => {
      const word = /** @type {string} */ (await el.getAttribute('data-target-text'));
      const units = syllablesForWord(word);
      const j = units.findIndex((u) => u !== units[0]);
      if (j < 1) return false;

      const wrongOrder = units.slice();
      [wrongOrder[0], wrongOrder[j]] = [wrongOrder[j], wrongOrder[0]];
      await place(wrongOrder);

      await expect(page.getByText(/perbaiki huruf merah/)).toBeVisible();
      await shot(page, testInfo, {
        group: GROUP,
        name: 'susun-wrong',
        label: 'Susun Kata · jawaban salah',
        order: 7
      });
      await page.getByRole('button', { name: /Ulang/ }).click();
      return true;
    };

    const captured = await playRound(page, '[data-target-text]', answer, placeWrong);
    expect(captured, 'the wrong-answer state should have been captured').toBe(true);
    await ensurePassed(page, () => playRound(page, '[data-target-text]', answer));

    await expect(passHeading(page)).toBeVisible();
    await shot(page, testInfo, {
      group: GROUP,
      name: 'susun-finish',
      label: 'Susun Kata · selesai (lulus)',
      order: 8
    });
  });
});
