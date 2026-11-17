import { app, BrowserWindow, dialog, ipcMain, shell } from 'electron'
import { join } from 'path'
import { getRawDb } from '@packages/db/database'
import type { DataFileResult } from '@contracts/contracts'
import { backupDatabase, exportCsv, exportJson, inspectBackup, stageRestore } from './service'

export const PENDING_RESTORE_FILE = 'chimero.restore-pending.db'

function raw() {
  const db = getRawDb()
  if (!db) throw new Error('Database is not open')
  return db
}

function stamp(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

async function pickSavePath(name: string, filter: { name: string; extensions: string[] }): Promise<string | null> {
  const window = BrowserWindow.getFocusedWindow()
  const options = { defaultPath: join(app.getPath('documents'), name), filters: [filter] }
  const result = window ? await dialog.showSaveDialog(window, options) : await dialog.showSaveDialog(options)
  return result.canceled || !result.filePath ? null : result.filePath
}

async function run(action: () => Promise<DataFileResult> | DataFileResult): Promise<DataFileResult> {
  try {
    return await action()
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'The operation failed' }
  }
}

export function registerDataHandlers(): void {
  ipcMain.handle('export-json', (_, targetPath?: string) =>
    run(async () => {
      const path = targetPath ?? (await pickSavePath(`chimero-export-${stamp()}.json`, { name: 'JSON', extensions: ['json'] }))
      if (!path) return { ok: false, canceled: true }
      return { ok: true, path, count: exportJson(raw(), path, app.getVersion()) }
    }),
  )

  ipcMain.handle('export-csv', (_, targetPath?: string) =>
    run(async () => {
      const path = targetPath ?? (await pickSavePath(`chimero-entries-${stamp()}.csv`, { name: 'CSV', extensions: ['csv'] }))
      if (!path) return { ok: false, canceled: true }
      return { ok: true, path, count: exportCsv(raw(), path) }
    }),
  )

  ipcMain.handle('backup-database', (_, targetPath?: string) =>
    run(async () => {
      const path = targetPath ?? (await pickSavePath(`chimero-backup-${stamp()}.db`, { name: 'Chimero backup', extensions: ['db'] }))
      if (!path) return { ok: false, canceled: true }
      await backupDatabase(raw(), path)
      return { ok: true, path }
    }),
  )

  ipcMain.handle('restore-database', (_, sourcePath?: string) =>
    run(async () => {
      let path = sourcePath
      if (!path) {
        const result = await dialog.showOpenDialog({ properties: ['openFile'], filters: [{ name: 'Chimero backup', extensions: ['db'] }] })
        if (result.canceled || result.filePaths.length === 0) return { ok: false, canceled: true }
        path = result.filePaths[0]
      }
      const inspected = inspectBackup(path)
      if (!inspected.ok) return { ok: false, error: inspected.error }
      stageRestore(path, join(app.getPath('userData'), PENDING_RESTORE_FILE))
      // The swap happens before the database opens on the next launch.
      setTimeout(() => {
        // Automated tests start the next launch themselves.
        if (!process.env.CHIMERO_NO_RELAUNCH) app.relaunch()
        app.exit(0)
      }, 600)
      return { ok: true, path, count: inspected.entries }
    }),
  )

  ipcMain.handle('open-data-folder', async () => {
    await shell.openPath(app.getPath('userData'))
    return true
  })
}
