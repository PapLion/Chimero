import { test, expect, _electron as electron } from '@playwright/test'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { resolve, join } from 'node:path'

test('real SQLite tracker CRUD, layout persistence and restart', async () => {
  test.setTimeout(90_000)
  const profile = mkdtempSync(join(tmpdir(), 'chimero-e2e-'))
  const launch = async () => {
    const app = await electron.launch({ args: [resolve('apps/electron'), '--disable-gpu'], env: { ...process.env, CHIMERO_USER_DATA_DIR: profile } })
    await expect.poll(() => app.windows().some(w => w.url().includes('renderer/index.html'))).toBe(true)
    const page = app.windows().find(w => w.url().includes('renderer/index.html'))!
    await page.waitForFunction(() => Boolean(window.api))
    return { app, page }
  }
  let running: Awaited<ReturnType<typeof launch>> | undefined
  try {
    running = await launch()
    const ids = await running.page.evaluate(async () => {
      const api = window.api
      const tracker = await api.createTracker({ name:'Persistence check',type:'number',config:{unit:'min'} })
      if(!tracker) throw new Error('Tracker not created')
      const entry = await api.addEntry({trackerId:tracker.id,value:15,timestamp:Date.now(),note:'Disposable test'})
      if(!entry) throw new Error('Entry not created')
      await api.updateEntry(entry.id,{value:25,note:'Edited test'})
      await api.saveDashboardLayout([{id:`tracker-${tracker.id}`,trackerId:tracker.id,position:0,size:'medium'}])
      return {trackerId:tracker.id,entryId:entry.id}
    })
    await running.app.close(); running = undefined
    running = await launch()
    const restored = await running.page.evaluate(async ids => ({
      entries:await window.api.getEntries({trackerId:ids.trackerId}),
      layout:await window.api.getDashboardLayout(),
    }),ids)
    expect(restored.entries.find(e=>e.id===ids.entryId)?.value).toBe(25)
    expect(restored.layout?.some(w=>w.trackerId===ids.trackerId)).toBe(true)
    await running.page.getByRole('button',{name:'Calendar',exact:true}).click()
    await expect(running.page.getByRole('button',{name:'Home',exact:true})).toBeVisible()
    const removed = await running.page.evaluate(async ids => {
      await window.api.deleteEntry(ids.entryId)
      const entries=await window.api.getEntries({trackerId:ids.trackerId})
      await window.api.deleteTracker(ids.trackerId)
      return {entries,trackers:await window.api.getTrackers()}
    },ids)
    expect(removed.entries).toHaveLength(0)
    expect(removed.trackers.some(t=>t.id===ids.trackerId)).toBe(false)
  } finally {
    await running?.app.close()
    rmSync(profile,{recursive:true,force:true})
  }
})
