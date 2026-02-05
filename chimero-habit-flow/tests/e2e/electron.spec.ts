import { _electron as electron } from 'playwright'
import { test, expect } from '@playwright/test'
import { join, resolve } from 'path'

const appRoot = resolve(__dirname, '../..')
const mainPath = resolve(appRoot, 'apps/electron/out/main/index.js')

test.describe('Electron app', () => {
  // TODO(E2E): Unskip when fixed. With NODE_ENV=test the app exits before firstWindow(); without it
  // the splash closes and Playwright reports "Target closed". Fix: ensure main window is the first
  // window in test (e.g. skip splash when launched by Playwright) or use waitForEvent('window') and
  // handle splash/main ordering. See doc/next-steps.md.
  test.skip('app launches and shows Chimero dashboard', async () => {
    const app = await electron.launch({
      args: [mainPath],
      cwd: join(appRoot, 'apps/electron'),
    })

    try {
      const window = await app.firstWindow({ timeout: 30000 })
      await window.waitForLoadState('domcontentloaded')
      await expect(window.getByText(/Activities|Entries this month/)).toBeVisible({ timeout: 15000 })

      const title = await window.title()
      const hasChimero = title.toLowerCase().includes('chimero')
      const body = await window.locator('body').textContent()
      const hasDashboardText =
        body?.includes('Activities') ||
        body?.includes('Entries') ||
        body?.includes('Today') ||
        body?.includes('Chimero') ||
        false

      expect(hasChimero || hasDashboardText).toBeTruthy()
    } finally {
      await app.close()
    }
  })
})
