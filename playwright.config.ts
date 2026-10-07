import { defineConfig, devices } from "@playwright/test";

const production = process.env.PISTL_E2E_PRODUCTION === "1";
const port = process.env.PISTL_E2E_PORT ?? (production && !process.env.CI ? "3001" : "3000");
if (!/^\d{1,5}$/u.test(port) || Number(port) < 1 || Number(port) > 65535) {
  throw new Error("PISTL_E2E_PORT must be a valid TCP port.");
}
const baseURL = `http://127.0.0.1:${port}`;

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [["list"], ["html", { open: "never" }]],
  use: {
    baseURL,
    screenshot: "only-on-failure",
    trace: "on-first-retry",
  },
  projects: [
    {
      name: "mobile-chrome",
      use: {
        ...devices["iPhone 13"],
        browserName: "chromium",
        ...(process.env.CI ? {} : { channel: "chrome" }),
      },
    },
  ],
  webServer: {
    command: production
      ? `npm run start -- --hostname 127.0.0.1 --port ${port}`
      : `npm run dev -- --hostname 127.0.0.1 --port ${port}`,
    url: baseURL,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
