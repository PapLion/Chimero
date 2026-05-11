import { ipcMain, app, dialog } from 'electron'
import { copyFileSync, existsSync } from 'fs'
import { eq, desc } from 'drizzle-orm'
import { assets } from '@packages/db'
import { getDb as db } from '@packages/db/database'
import { mapAsset } from '../../shared/mappers'
import { deleteFile, getAssetAbsolutePath, saveFile } from './service'

export function registerAssetHandlers(): void {
  ipcMain.handle('open-file-dialog', async (_, options?: { filters?: { name: string; extensions: string[] }[] }) => {
    const result = await dialog.showOpenDialog({
      properties: ['openFile'],
      filters: options?.filters ?? [{ name: 'Images & Video', extensions: ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'mp4', 'webm', 'mov'] }],
    })
    if (result.canceled || result.filePaths.length === 0) return { path: null as string | null }
    return { path: result.filePaths[0] }
  })

  ipcMain.handle('upload-asset', async (_, sourcePath: string) => {
    try {
      if (!sourcePath || typeof sourcePath !== 'string') {
        throw new Error('Invalid source path')
      }

      if (!existsSync(sourcePath)) {
        throw new Error('Source file does not exist')
      }

      const userDataPath = app.getPath('userData')
      const saved = await saveFile(sourcePath, userDataPath)
      const [inserted] = await db()
        .insert(assets)
        .values({
          filename: saved.filename,
          originalName: saved.originalName,
          path: saved.path,
          type: saved.type,
          size: saved.size,
          thumbnailPath: saved.thumbnailPath,
        })
        .returning()
      if (!inserted) return null
      return mapAsset(inserted as Record<string, unknown>)
    } catch (e) {
      console.error('upload-asset error:', e)
      return null
    }
  })

  ipcMain.handle('get-assets', async (_, options?: { limit?: number; offset?: number }) => {
    try {
      const limit = options?.limit ?? 50
      const offset = options?.offset ?? 0
      const rows = await db()
        .select()
        .from(assets)
        .orderBy(desc(assets.createdAt))
        .limit(limit)
        .offset(offset)
      return rows.map((r) => mapAsset(r as Record<string, unknown>))
    } catch (e) {
      console.error('get-assets error:', e)
      return []
    }
  })

  ipcMain.handle('update-asset', async (_, id: number, updates: { originalName?: string | null }) => {
    try {
      if (updates.originalName !== undefined) {
        await db().update(assets).set({ originalName: updates.originalName || null }).where(eq(assets.id, id))
      }
      const [updated] = await db().select().from(assets).where(eq(assets.id, id))
      return updated ? mapAsset(updated as Record<string, unknown>) : null
    } catch (e) {
      console.error('update-asset error:', e)
      return null
    }
  })

  ipcMain.handle('delete-asset', async (_, id: number) => {
    try {
      const rows = await db().select().from(assets).where(eq(assets.id, id))
      const row = rows[0]
      if (!row) return false
      const userDataPath = app.getPath('userData')
      const mainPath = row.path as string
      const thumbnailPath = row.thumbnailPath as string | null | undefined
      deleteFile(userDataPath, mainPath)
      if (thumbnailPath && thumbnailPath !== mainPath) {
        deleteFile(userDataPath, thumbnailPath)
      }
      await db().delete(assets).where(eq(assets.id, id))
      return true
    } catch (e) {
      console.error('delete-asset error:', e)
      return false
    }
  })

  ipcMain.handle('download-asset', async (_, id: number, suggestedName: string) => {
    try {
      const rows = await db().select().from(assets).where(eq(assets.id, id))
      const row = rows[0]
      if (!row) return { ok: false, error: 'not_found' }
      const userDataPath = app.getPath('userData')
      const sourcePath = getAssetAbsolutePath(userDataPath, row.path as string)
      if (!existsSync(sourcePath)) return { ok: false, error: 'file_not_found' }
      const result = await dialog.showSaveDialog({
        defaultPath: suggestedName,
        title: 'Save asset',
      })
      if (result.canceled || !result.filePath) return { ok: false, canceled: true }
      copyFileSync(sourcePath, result.filePath)
      return { ok: true, path: result.filePath }
    } catch (e) {
      console.error('download-asset error:', e)
      return { ok: false, error: String(e) }
    }
  })
}
