import { mkdirSync } from 'node:fs';
import { test, expect } from '@playwright/test';

const QUIZ_PATH = '/belajar/1/0';
const shotDir = process.env.SHOT_DIR ?? 'shots';
const CI_PROFILE = {
  id: 'ci-belajar-quiz',
  name: 'Tes',
  avatar: 'teal',
  voiceId: 'ibu-dewi',
  quizTileCount: 3,
  bestScore: {},
  lessonScore: {},
  unlockedLevel: 1
};

mkdirSync(shotDir, { recursive: true });

/**
 * @param {import('@playwright/test').Page} page
 * @param {import('@playwright/test').TestInfo} testInfo
 * @param {string} name
 */
async function screenshotStep(page, testInfo, name) {
  await page.screenshot({
    path: `${shotDir}/belajar-quiz-${name}-${testInfo.project.name}.png`,
    fullPage: true
  });
}

/** @param {import('@playwright/test').Page} page */
async function seedProfile(page) {
  await page.addInitScript((profile) => {
    class FakeAudioNode {
      connect() {
        return this;
      }
    }
    class FakeGain extends FakeAudioNode {
      gain = {
        setValueAtTime() {},
        linearRampToValueAtTime() {},
        exponentialRampToValueAtTime() {}
      };
    }
    class FakeOscillator extends FakeAudioNode {
      type = 'sine';
      frequency = {
        value: 0,
        setValueAtTime() {},
        exponentialRampToValueAtTime() {}
      };
      start() {}
      stop() {}
    }
    class FakeBufferSource extends FakeAudioNode {
      buffer = null;
      onended = null;
      start() {
        setTimeout(() => this.onended?.(), 0);
      }
      stop() {
        this.onended?.();
      }
    }
    class FakeAudioContext {
      state = 'running';
      currentTime = 0;
      destination = {};
      resume() {
        return Promise.resolve();
      }
      createOscillator() {
        return new FakeOscillator();
      }
      createGain() {
        return new FakeGain();
      }
      createBufferSource() {
        return new FakeBufferSource();
      }
      decodeAudioData() {
        return Promise.resolve({
          duration: 0.03,
          sampleRate: 44100,
          getChannelData: () => new Float32Array(256).fill(0.02)
        });
      }
    }

    Object.defineProperty(window, 'AudioContext', { configurable: true, value: FakeAudioContext });
    Object.defineProperty(window, 'webkitAudioContext', {
      configurable: true,
      value: FakeAudioContext
    });
    localStorage.setItem('klm.profiles.v1', JSON.stringify([profile]));
    localStorage.setItem('klm.activeProfile.v1', profile.id);
  }, CI_PROFILE);
}

/** @param {import('@playwright/test').Page} page */
async function openPractice(page) {
  await seedProfile(page);
  await page.goto(QUIZ_PATH, { waitUntil: 'load' });
  await page.getByRole('button', { name: /Mulai Latihan/ }).click();
  await expect(page.locator('.answer-tile')).toHaveCount(CI_PROFILE.quizTileCount);
  await expect(page.locator('.answer-tile:not([disabled])').first()).toBeVisible({
    timeout: 10000
  });
}

/** @param {import('@playwright/test').Page} page */
async function chooseUntilCorrect(page) {
  for (let attempt = 0; attempt < CI_PROFILE.quizTileCount; attempt += 1) {
    await page.locator('.answer-tile:not([disabled])').first().click();
    await page.waitForTimeout(120);
    if ((await page.locator('.answer-tile-won').count()) > 0) return;
  }
  throw new Error('Expected one answer tile to enter the winning state');
}

test('belajar quiz uses playful answer tile feedback', async ({ page }, testInfo) => {
  await openPractice(page);

  const tileStyles = await page.locator('.answer-tile').evaluateAll((tiles) =>
    tiles.map((tile) => {
      const style = getComputedStyle(tile);
      return {
        text: tile.textContent?.trim(),
        background: style.backgroundColor,
        border: style.borderColor,
        color: style.color
      };
    })
  );

  expect(tileStyles.every((tile) => tile.text && tile.text.length > 0)).toBe(true);
  expect(new Set(tileStyles.map((tile) => tile.background)).size).toBe(CI_PROFILE.quizTileCount);
  expect(new Set(tileStyles.map((tile) => tile.border)).size).toBe(CI_PROFILE.quizTileCount);
  expect(tileStyles.map((tile) => tile.color)).toEqual(
    Array(CI_PROFILE.quizTileCount).fill('rgb(30, 41, 59)')
  );
  await screenshotStep(page, testInfo, 'practice');

  await chooseUntilCorrect(page);

  await expect(page.locator('.answer-tile-won')).toHaveCount(1);
  await expect(page.locator('.burst-piece').first()).toBeVisible();
  await screenshotStep(page, testInfo, 'win');
});

test('belajar quiz robot reacts when tapped', async ({ page }) => {
  await seedProfile(page);
  await page.goto(QUIZ_PATH, { waitUntil: 'load' });

  const reacted = await page.locator('.robot').first().evaluate(
    (robot) =>
      new Promise((resolve) => {
        robot.click();
        requestAnimationFrame(() => {
          resolve([...robot.classList].some((name) => /^react-(spin|wiggle|boing|wave)$/.test(name)));
        });
      })
  );

  expect(reacted).toBe(true);
});

test.describe('reduced motion', () => {
  test.use({ reducedMotion: 'reduce' });

  test('belajar quiz disables added motion', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await openPractice(page);

    const motion = await page.locator('.answer-tile').first().evaluate((tile) => {
      const tileStyle = getComputedStyle(tile);
      const robotStyle = getComputedStyle(document.querySelector('.robot'));
      return {
        tileAnimation: tileStyle.animationName,
        tileTransition: tileStyle.transitionDuration,
        robotAnimation: robotStyle.animationName
      };
    });

    expect(motion.tileAnimation).toBe('none');
    expect(motion.tileTransition).toBe('0s');
    expect(motion.robotAnimation).toBe('none');
  });
});
