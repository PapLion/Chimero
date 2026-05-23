import { ipcMain } from 'electron'
import { addGamingEntry, getGamingDetail, updateGamingEntry } from './service'
import type { CreateGamingEntryRequest, UpdateGamingEntryRequest } from '@contracts/contracts'

export function registerGamingHandlers(): void {
  ipcMain.handle('add-gaming-entry', async (_, data: CreateGamingEntryRequest) => {
    try {
      return await addGamingEntry(data)
    } catch (e) {
      console.error('add-gaming-entry error:', e)
      return null
    }
  })

  ipcMain.handle('update-gaming-entry', async (_, entryId: number, updates: UpdateGamingEntryRequest) => {
    try {
      return await updateGamingEntry(entryId, updates)
    } catch (e) {
      console.error('update-gaming-entry error:', e)
      return null
    }
  })

  ipcMain.handle('get-gaming-detail', async (_, trackerId: number, options?: { limit?: number }) => {
    try {
      return await getGamingDetail(trackerId, options)
    } catch (e) {
      console.error('get-gaming-detail error:', e)
      return {
        current: null,
        history: [],
        chartData: [],
        totalHours: 0,
        structuredEntryCount: 0,
        legacyEntryCount: 0,
        perGameHours: [],
      }
    }
  })
}
