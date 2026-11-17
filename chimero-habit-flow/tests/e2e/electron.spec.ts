/**
 * End to end, through the interface, on the built app with a real SQLite file
 * in a throwaway profile: build a tracker, log, edit and delete records with the
 * Quick Entry dialog, arrange the Today grid by dragging, then restart and check
 * that everything came back. Run `pnpm build` first.
 */
import { test, expect, _electron as electron, type ElectronApplication, type Page } from '@playwright/test'
import { execFileSync } from 'node:child_process'
import { existsSync, mkdtempSync, readFileSync, readdirSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'

const STEP_Y = 76 + 14 // ROW_HEIGHT + GAP in GridCanvas

async function launch(profile: string): Promise<{ app: ElectronApplication; page: Page; errors: string[] }> {
  const executable = process.env.CHIMERO_TEST_EXECUTABLE
  const app = await electron.launch({
    executablePath: executable,
    args: executable ? ['--disable-gpu'] : [resolve('apps/electron'), '--disable-gpu'],
    env: { ...process.env, CHIMERO_USER_DATA_DIR: profile, CHIMERO_NO_RELAUNCH: '1' },
  })
  const page = await app.firstWindow()
  const errors: string[] = []
  page.on('pageerror', (error) => errors.push(error.message))
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text())
  })
  await page.waitForFunction(() => Boolean(window.api))
  await expect(page.getByRole('navigation', { name: 'Main' })).toBeVisible()
  return { app, page, errors }
}

async function grid(page: Page, selector: string): Promise<[number, number, number, number]> {
  const value = await page.locator(selector).getAttribute('data-grid')
  return (value ?? '').split(',').map(Number) as [number, number, number, number]
}

async function dragBy(page: Page, handle: ReturnType<Page['locator']>, dx: number, dy: number): Promise<void> {
  await handle.scrollIntoViewIfNeeded()
  const box = await handle.boundingBox()
  if (!box) throw new Error('Handle is not visible')
  const x = box.x + box.width / 2
  const y = box.y + box.height / 2
  await page.mouse.move(x, y)
  await page.mouse.down()
  await page.mouse.move(x + dx, y + dy, { steps: 12 })
  await page.mouse.up()
}

async function quickEntry(page: Page, tracker: string): Promise<void> {
  await page.keyboard.press('Alt+q')
  await page.getByLabel('Find a tracker').fill(tracker)
  await page.keyboard.press('Enter')
  await expect(page.getByTestId('entry-save')).toBeVisible()
}

test('build a tracker, log through Quick Entry, arrange Today, and restart', async () => {
  test.setTimeout(150_000)
  const profile = mkdtempSync(join(tmpdir(), 'chimero-e2e-'))
  let running: Awaited<ReturnType<typeof launch>> | undefined
  try {
    running = await launch(profile)
    const { page } = running

    // A custom tracker, made in the builder.
    await page.getByRole('button', { name: 'Manage trackers' }).click()
    await page.getByTestId('new-tracker').click()
    const builder = page.getByRole('dialog')
    await builder.getByLabel('Name').fill('Reading')
    await builder.getByLabel('Unit').fill('pages')
    await builder.getByRole('button', { name: 'Create tracker' }).click()
    await expect(builder).toBeHidden()
    // A new tracker opens on its own page, and joins the sidebar.
    await expect(page.getByRole('heading', { name: 'Reading', level: 1 })).toBeVisible()
    await expect(page.getByRole('navigation', { name: 'Main' }).getByRole('button', { name: 'Reading' })).toBeVisible()
    const trackerId = await page.evaluate(async () => (await window.api.getTrackers()).find((t) => t.name === 'Reading')?.id ?? null)
    expect(trackerId).not.toBeNull()

    // Quick Entry from anywhere: Alt+Q, type, Enter, fill, save.
    await page.getByRole('navigation', { name: 'Main' }).getByRole('button', { name: 'Journal' }).click()
    await quickEntry(page, 'Reading')
    await page.getByLabel('Amount (pages)').fill('25')
    await page.getByTestId('entry-save').click()
    await expect(page.getByRole('dialog')).toBeHidden()

    await quickEntry(page, 'Mood')
    await page.getByRole('radio', { name: /^8,/ }).click()
    await page.getByTestId('entry-save').click()
    await expect(page.getByRole('dialog')).toBeHidden()

    // Edit the reading record from its tracker page.
    await page.getByRole('navigation', { name: 'Main' }).getByRole('button', { name: 'Reading' }).click()
    await page.getByRole('button', { name: /25 pages/ }).click()
    await page.getByLabel('Amount (pages)').fill('30')
    await page.getByTestId('entry-save').click()
    await expect(page.getByRole('button', { name: /30 pages/ })).toBeVisible()

    // A second record, then delete it through the dialog.
    await page.getByTestId('tracker-log').click()
    await page.getByLabel('Amount (pages)').fill('5')
    await page.getByTestId('entry-save').click()
    await page.getByRole('button', { name: /^5 pages/ }).click()
    await page.getByRole('dialog').getByRole('button', { name: 'Delete' }).click()
    await page.getByRole('dialog', { name: 'Delete this record?' }).getByRole('button', { name: 'Delete' }).click()
    await expect(page.getByRole('button', { name: /^5 pages/ })).toBeHidden()

    // Arrange Today: add the tracker as a widget, drag it, resize it.
    await page.getByRole('navigation', { name: 'Main' }).getByRole('button', { name: 'Today' }).click()
    await page.getByRole('button', { name: 'Edit layout' }).click()
    await page.getByRole('button', { name: 'Add widget' }).click()
    await page.getByRole('dialog').getByRole('button', { name: 'Reading' }).click()
    const widget = `[data-widget-id^="tracker-${trackerId}"]`
    await expect(page.locator(widget)).toHaveCount(1)
    const width = (await page.getByTestId('dashboard-grid').boundingBox())?.width ?? 0
    const stepX = width / 12

    const [x0, y0] = await grid(page, widget)
    const dx = x0 + 3 + 3 <= 12 ? 2 : -2
    await dragBy(page, page.locator(`${widget} [data-drag-handle]`), dx * stepX, -STEP_Y)
    const [x1, y1, w1, h1] = await grid(page, widget)
    expect(x1).toBe(x0 + dx)
    expect(y1).toBeLessThanOrEqual(y0)

    await dragBy(page, page.locator(`${widget} [data-resize-handle]`), stepX, STEP_Y)
    const moved = await grid(page, widget)
    expect(moved).toEqual([x1, y1, w1 + 1, h1 + 1])
    await page.getByRole('button', { name: 'Done' }).click()
    await expect(page.getByTestId('dashboard-grid')).toHaveAttribute('data-editing', 'false')

    expect(running.errors).toEqual([])
    await running.app.close()
    running = undefined

    // Everything comes back after a restart.
    running = await launch(profile)
    const restored = await running.page.evaluate(async (id) => {
      const trackers = await window.api.getTrackers()
      const mood = trackers.find((t) => t.name === 'Mood')!
      return {
        reading: (await window.api.getEntries({ trackerId: id })).map((e) => e.value),
        mood: (await window.api.getEntries({ trackerId: mood.id })).map((e) => e.value),
      }
    }, trackerId as number)
    expect(restored.reading).toEqual([30])
    expect(restored.mood).toEqual([8])
    await expect(running.page.locator(widget)).toHaveAttribute('data-grid', moved.join(','))

    // The shell holds up at common window sizes and Quick Entry opens everywhere.
    for (const size of [
      { width: 1024, height: 700 },
      { width: 1440, height: 900 },
      { width: 1920, height: 1080 },
    ]) {
      await running.page.setViewportSize(size)
      expect(await running.page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
      await running.page.keyboard.press('Alt+q')
      await expect(running.page.getByLabel('Find a tracker')).toBeVisible()
      await running.page.keyboard.press('Escape')
      await expect(running.page.getByRole('dialog')).toBeHidden()
    }
    expect(running.errors).toEqual([])
  } finally {
    await running?.app.close()
    rmSync(profile, { recursive: true, force: true })
  }
})

test('upgrades a database left by the last release without losing anything', async () => {
  test.setTimeout(120_000)
  const profile = mkdtempSync(join(tmpdir(), 'chimero-upgrade-'))
  // The last release shipped migrations 0000-0010; build its database with its records.
  const electronBinary: string = require('electron')
  const output = execFileSync(electronBinary, [resolve('tests/e2e/fixtures/legacy-profile.cjs'), join(profile, 'chimero.db'), resolve('packages/db/drizzle'), '0010_contact_crm_round_trip'], {
    env: { ...process.env, ELECTRON_RUN_AS_NODE: '1' },
  })
  const ids = JSON.parse(output.toString().trim().split('\n').pop() as string) as { weight: number; mood: number; meditation: number }
  const copies = () => readdirSync(join(profile, 'backups')).filter((name) => name.startsWith('before-upgrade-'))
  let running: Awaited<ReturnType<typeof launch>> | undefined
  try {
    running = await launch(profile)
    const state = await running.page.evaluate(async (ids) => {
      const api = window.api
      const tags = await api.getTags()
      return {
        trackers: (await api.getTrackers()).map((t) => t.name),
        weights: (await api.getWeightDetail(ids.weight)).history.map((h) => h.weight),
        mood: (await api.getEntries({ trackerId: ids.mood })).map((e) => [e.value, e.note]),
        meditation: (await api.getEntries({ trackerId: ids.meditation })).map((e) => [e.value, e.tagIds?.map((id) => tags.find((t) => t.id === id)?.name)]),
        contacts: (await api.getContacts()).map((c) => [c.name, c.notes]),
        layout: await api.getDashboardLayout(),
        preferences: await api.getPreferences(),
      }
    }, ids)

    expect(state.weights.map((w) => Math.round(w * 10) / 10).sort()).toEqual([79.2, 79.6, 80])
    expect(state.mood).toEqual([[7, 'legacy note kept'], [6, null], [5, null]])
    expect(state.meditation).toEqual([[20, ['calm']], [15, ['calm']], [10, ['calm']]])
    expect(state.contacts).toEqual([['Sam Example', 'kept across the upgrade']])
    expect(state.trackers).toEqual(expect.arrayContaining(['Weight', 'Mood', 'Meditation']))
    // The old array layout becomes a grid layout that keeps the same widgets, in order.
    expect(state.layout.version).toBe(2)
    expect(state.layout.widgets.filter((w) => w.type === 'tracker').map((w) => w.trackerId).slice(0, 2)).toEqual([ids.meditation, ids.mood])
    expect(state.preferences.weightUnit).toBeTruthy()
    await expect(running.page.locator(`[data-widget-id="tracker-${ids.meditation}"]`)).toBeVisible()

    // A consistent copy was taken before the schema changed, and only then.
    expect(copies()).toHaveLength(1)
    expect(running.errors).toEqual([])
    await running.app.close()
    running = await launch(profile)
    expect(copies()).toHaveLength(1)
    expect(running.errors).toEqual([])
  } finally {
    await running?.app.close()
    rmSync(profile, { recursive: true, force: true })
  }
})

test('backs up, exports, and restores a profile', async () => {
  test.setTimeout(120_000)
  const profile = mkdtempSync(join(tmpdir(), 'chimero-restore-'))
  const out = mkdtempSync(join(tmpdir(), 'chimero-files-'))
  let running: Awaited<ReturnType<typeof launch>> | undefined
  const moodValues = (page: Page) =>
    page.evaluate(async () => {
      const mood = (await window.api.getTrackers()).find((t) => t.name === 'Mood')!
      return (await window.api.getEntries({ trackerId: mood.id })).map((e) => e.value)
    })
  try {
    running = await launch(profile)
    const files = { backup: join(out, 'backup.db'), json: join(out, 'export.json'), csv: join(out, 'entries.csv') }
    const results = await running.page.evaluate(async (files) => {
      const api = window.api
      const mood = (await api.getTrackers()).find((t) => t.name === 'Mood')!
      await api.addEntry({ trackerId: mood.id, value: 6, note: 'before the backup', timestamp: Date.now() - 60_000 })
      const backup = await api.backupDatabase(files.backup)
      const json = await api.exportJson(files.json)
      const csv = await api.exportCsv(files.csv)
      await api.addEntry({ trackerId: mood.id, value: 9, note: 'after the backup', timestamp: Date.now() })
      return { backup, json, csv }
    }, files)
    expect(results.backup.ok).toBe(true)
    expect(results.csv).toMatchObject({ ok: true, count: 1 })
    expect(readFileSync(files.csv, 'utf8')).toContain('before the backup')
    // JSON carries every table; its count is every row written.
    const exported = JSON.parse(readFileSync(files.json, 'utf8')) as { tables: Record<string, Array<Record<string, unknown>>> }
    expect(exported.tables.entries.map((e) => e.note)).toEqual(['before the backup'])
    expect(exported.tables.trackers.length).toBeGreaterThan(0)
    expect(results.json).toMatchObject({ ok: true })
    expect((results.json as { count: number }).count).toBe(Object.values(exported.tables).reduce((n, rows) => n + rows.length, 0))
    expect(await moodValues(running.page)).toEqual([9, 6])

    // Restoring stages the file and quits; the swap happens before the next start opens the database.
    const closed = new Promise((done) => running?.app.once('close', done))
    const restore = await running.page.evaluate((path) => window.api.restoreDatabase(path), files.backup)
    expect(restore).toMatchObject({ ok: true, count: 1 })
    await closed
    running = undefined

    running = await launch(profile)
    expect(await moodValues(running.page)).toEqual([6])
    // The database it replaced is kept beside it, never deleted.
    expect(readdirSync(profile).some((name) => name.startsWith('chimero.before-restore-') && name.endsWith('.db'))).toBe(true)
    expect(existsSync(join(profile, 'chimero.restore-pending.db'))).toBe(false)
    expect(running.errors).toEqual([])
  } finally {
    await running?.app.close()
    rmSync(profile, { recursive: true, force: true })
    rmSync(out, { recursive: true, force: true })
  }
})
