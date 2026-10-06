import { defineConfig, devices } from '@playwright/test';

const port = Number(process.env.PLAYWRIGHT_PORT || 3001);
if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('Invalid PLAYWRIGHT_PORT');
const baseURL = `http://127.0.0.1:${port}`;

export default defineConfig({
  testDir: './tests',
  testMatch: 'landing.spec.mjs',
  outputDir: './test-results',
  fullyParallel: true,
  workers: 2,
  /* In CI also as GitHub annotations, so a failing test shows its name
     and error on the check without opening the raw log. */
  reporter: process.env.CI ? [['list'], ['github']] : 'list',
  use: {
    baseURL,
    trace: 'retain-on-failure',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'], ...(process.env.PLAYWRIGHT_CHROMIUM_PATH ? { launchOptions: { executablePath: process.env.PLAYWRIGHT_CHROMIUM_PATH } } : {}) } }],
  /* CI tests the production build (built in the step before); the dev
     server recompiles routes on demand and can abort navigations in a
     parallel test. */
  webServer: {
    command: `${process.env.CI ? 'npm run start' : 'npm run dev'} -- -p ${port}`,
    url: baseURL,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
