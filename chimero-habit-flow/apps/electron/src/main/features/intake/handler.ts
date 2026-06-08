import { ipcMain } from 'electron'
import {
  addIntakeEntry,
  deleteIntakeEntry,
  getIntakeDetail,
  getIntakeHomeWidget,
  updateIntakeEntry,
} from './service'
import type { CreateIntakeEntryRequest, UpdateIntakeEntryRequest } from '@contracts/contracts'

export function registerIntakeHandlers(): void {
  ipcMain.handle('add-intake-entry', async (_, data: CreateIntakeEntryRequest) => {
    try {
      return await addIntakeEntry(data)
    } catch (e) {
      console.error('add-intake-entry error:', e)
      return null
    }
  })

  ipcMain.handle('update-intake-entry', async (_, entryId: number, updates: UpdateIntakeEntryRequest) => {
    try {
      return await updateIntakeEntry(entryId, updates)
    } catch (e) {
      console.error('update-intake-entry error:', e)
      return null
    }
  })

  ipcMain.handle('delete-intake-entry', async (_, entryId: number) => {
    try {
      return await deleteIntakeEntry(entryId)
    } catch (e) {
      console.error('delete-intake-entry error:', e)
      return false
    }
  })

  ipcMain.handle('get-intake-detail', async (_, trackerId: number, options?: { limit?: number }) => {
    try {
      return await getIntakeDetail(trackerId, options)
    } catch (e) {
      console.error('get-intake-detail error:', e)
      return {
        current: null,
        history: [],
        intakeCount: 0,
        structuredEntryCount: 0,
        legacyEntryCount: 0,
        daysWithIntakes: 0,
        itemFrequency: [],
        doseSummary: [],
        chartData: [],
      }
    }
  })

  ipcMain.handle('get-intake-home', async (_, trackerId: number, options?: { selectedDate?: string; limit?: number }) => {
    try {
      return await getIntakeHomeWidget(trackerId, options)
    } catch (e) {
      console.error('get-intake-home error:', e)
      return {
        trackerId,
        title: 'Vitamins & Medications',
        currentItemName: null,
        currentItemType: null,
        currentVariant: null,
        currentDosage: null,
        currentUnit: null,
        selectedDayEntries: [],
        intakeCount: 0,
        daysWithIntakes: 0,
        legacyEntryCount: 0,
        sparkline: [],
      }
    }
  })
}
