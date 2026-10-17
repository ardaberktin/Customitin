import { defineConfig } from '@playwright/test';
export default defineConfig({
  testDir: './tests/e2e',
  timeout: 60_000,
  expect: { timeout: 15_000 },
  fullyParallel: false,
  use: {
    viewport: { width: 430, height: 900 },
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    launchOptions: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE
      ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE }
      : {},
  },
  webServer: [
    {
      command: 'npm run dev:web',
      url: 'http://127.0.0.1:8084',
      reuseExistingServer: !process.env.CI,
      timeout: 60000,
    },
    {
      command: 'npm run web -w @customitin/recipe-example -- --port 8081',
      url: 'http://localhost:8081',
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
      env: { EXPO_OFFLINE: '1' },
    },
    {
      command: 'npm run web -w @customitin/movie-example -- --port 8082',
      url: 'http://localhost:8082',
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
      env: { EXPO_OFFLINE: '1' },
    },
    {
      command: 'npm run dev:tasks',
      url: 'http://localhost:8083',
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
      env: { EXPO_OFFLINE: '1' },
    },
  ],
});
