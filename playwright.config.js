import { defineConfig } from '@playwright/test';

// Smoke tests run against a live URL (CI: the Cloudflare Pages PR preview;
// locally: `npm run preview`). See .github/workflows/preview.yml.
const baseURL = process.env.BASE_URL ?? 'http://localhost:4173';

// Five viewports so layout breaks show up at the edges, not just the middle.
// `inline` marks the two the PR comment renders full-size; the rest fold into a
// nested <details> so the comment stays readable. Deliberately no `reducedMotion`
// here: the app's identity is its animation, and screenshotting the accessibility
// variant would hide the juice we ship. Captures freeze animations at shot time
// instead (see tests/e2e/shot.js).
export const VIEWPORTS = [
  { name: 'phone-sm', width: 360, height: 640, isMobile: true, inline: false },
  { name: 'phone', width: 390, height: 844, isMobile: true, inline: true },
  { name: 'phone-lg', width: 430, height: 932, isMobile: true, inline: false },
  { name: 'tablet-portrait', width: 768, height: 1024, isMobile: false, inline: false },
  { name: 'tablet-landscape', width: 1024, height: 768, isMobile: false, inline: true }
];

export default defineConfig({
  testDir: 'tests/e2e',
  fullyParallel: true,
  retries: process.env.CI ? 1 : 0,
  reporter: [['list'], ['json', { outputFile: 'playwright-results.json' }]],
  use: {
    baseURL
  },
  projects: VIEWPORTS.map(({ name, width, height, isMobile }) => ({
    name,
    use: {
      viewport: { width, height },
      isMobile,
      hasTouch: true
    }
  }))
});
