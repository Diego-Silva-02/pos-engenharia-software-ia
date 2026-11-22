import { defineConfig } from '@playwright/test';
import baseConfig from './playwright.config';

// Config used by "npm run demo": opens a visible browser and runs the steps slowly,
// so you can watch the scenario. It is not used by "npm test" or by the CI.
process.env.DEMO = '1';

export default defineConfig(baseConfig, {
  testMatch: 'add-card-with-image.spec.ts',

  // The 5 s limit is for the real test run; in the demo there are slow steps and a final pause
  timeout: 60_000,
  workers: 1,
  fullyParallel: false,
  retries: 0,

  use: {
    headless: false,
    launchOptions: { slowMo: 700 },
  },
});
