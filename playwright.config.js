import { defineConfig } from '@playwright/test';

// Smoke tests run against a live URL (CI: the Cloudflare Pages PR preview;
// locally: `npm run preview`). See .github/workflows/preview.yml.
const baseURL = process.env.BASE_URL ?? 'http://localhost:4173';

export default defineConfig({
  testDir: 'tests/e2e',
  fullyParallel: true,
  retries: process.env.CI ? 1 : 0,
  reporter: [['list'], ['json', { outputFile: 'playwright-results.json' }]],
  use: {
    baseURL
  },
  projects: [
    {
      name: 'phone',
      use: {
        viewport: { width: 390, height: 844 },
        isMobile: true,
        hasTouch: true
      }
    },
    {
      name: 'tablet',
      use: {
        viewport: { width: 1024, height: 768 },
        hasTouch: true
      }
    }
  ]
});
