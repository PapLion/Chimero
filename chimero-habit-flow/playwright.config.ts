import { defineConfig } from '@playwright/test'

/**
 * Playwright config for Chimero. E2E tests run against the built Electron app,
 * not a web server. See tests/e2e/electron.spec.ts.
 */
export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: 'list',
  use: {
    trace: 'on-first-retry',
  },
  projects: [{ name: 'electron', testMatch: /electron\.spec\.ts/ }],
})
