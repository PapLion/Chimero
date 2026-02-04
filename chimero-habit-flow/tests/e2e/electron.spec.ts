import { _electron as electron } from 'playwright'
import { test, expect } from '@playwright/test'
import { join, resolve } from 'path'

const appRoot = resolve(__dirname, '../..')
const mainPath = resolve(appRoot, 'apps/electron/out/main/index.js')

test.describe('Electron app', () => {
  test('app launches and shows Chimero dashboard', async () => {
    const app = await electron.launch({
      args: [mainPath],
      cwd: join(appRoot, 'apps/electron'),
      env: { ...process.env, NODE_ENV: 'test' },
    })

    try {
      const window = await app.firstWindow()
      await window.waitForLoadState('domcontentloaded')

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
