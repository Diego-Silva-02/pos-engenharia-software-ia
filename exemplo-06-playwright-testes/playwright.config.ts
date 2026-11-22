import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests',

  // Max time for each test (the requirement is at most 5 seconds)
  timeout: 5_000,
  expect: {
    timeout: 5_000,
  },

  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,

  // The HTML report is uploaded as an artifact when the CI run fails
  reporter: [['list'], ['html', { open: 'never' }]],

  use: {
    // The trailing slash matters: it makes page.goto('./') stay inside /vanilla-js-web-app-example/
    baseURL: 'https://erickwendel.github.io/vanilla-js-web-app-example/',
    actionTimeout: 5_000,
    navigationTimeout: 5_000,
    trace: 'retain-on-failure',
  },

  // Chromium only
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});
