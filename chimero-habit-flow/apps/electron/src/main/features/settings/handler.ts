import { app, ipcMain } from 'electron'
import { statSync } from 'fs'
import { join } from 'path'
import { getRawDb } from '@packages/db/database'
import type { AppInfo } from '@contracts/contracts'
import { defaultLayout, getDashboardLayout, getPreferences, saveDashboardLayout, updatePreferences } from './service'

function raw() {
  const db = getRawDb()
  if (!db) throw new Error('Database is not open')
  return db
}

export function registerSettingsHandlers(): void {
  ipcMain.handle('get-preferences', () => getPreferences(raw()))
  ipcMain.handle('update-preferences', (_, patch: unknown) => updatePreferences(raw(), patch))
  ipcMain.handle('get-dashboard-layout', () => getDashboardLayout(raw()))
  ipcMain.handle('save-dashboard-layout', (_, layout: unknown) => saveDashboardLayout(raw(), layout))
  ipcMain.handle('get-default-dashboard-layout', () => defaultLayout(raw()))
  ipcMain.handle('get-app-info', (): AppInfo => {
    const db = raw()
    const dataPath = app.getPath('userData')
    let databaseBytes = 0
    try {
      databaseBytes = statSync(join(dataPath, 'chimero.db')).size
    } catch {
      databaseBytes = 0
    }
    const counts = db.prepare('SELECT (SELECT COUNT(*) FROM entries) AS entries, (SELECT COUNT(*) FROM trackers WHERE archived = 0 OR archived IS NULL) AS trackers, (SELECT MIN(date_str) FROM entries) AS first').get() as {
      entries: number
      trackers: number
      first: string | null
    }
    return {
      version: app.getVersion(),
      platform: process.platform,
      dataPath,
      databaseBytes,
      entryCount: counts.entries,
      trackerCount: counts.trackers,
      firstEntryDate: counts.first,
    }
  })
}
