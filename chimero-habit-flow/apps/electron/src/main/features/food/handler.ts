import { ipcMain } from 'electron'
import { addFoodEntry, deleteFoodEntry, getFoodDetail, updateFoodEntry } from './service'
import type { CreateFoodEntryRequest, UpdateFoodEntryRequest } from '@contracts/contracts'

export function registerFoodHandlers(): void {
  ipcMain.handle('add-food-entry', async (_, data: CreateFoodEntryRequest) => {
    try {
      return await addFoodEntry(data)
    } catch (e) {
      console.error('add-food-entry error:', e)
      return null
    }
  })

  ipcMain.handle('update-food-entry', async (_, entryId: number, updates: UpdateFoodEntryRequest) => {
    try {
      return await updateFoodEntry(entryId, updates)
    } catch (e) {
      console.error('update-food-entry error:', e)
      return null
    }
  })

  ipcMain.handle('delete-food-entry', async (_, entryId: number) => {
    try {
      return await deleteFoodEntry(entryId)
    } catch (e) {
      console.error('delete-food-entry error:', e)
      return false
    }
  })

  ipcMain.handle('get-food-detail', async (_, trackerId: number, options?: { limit?: number }) => {
    try {
      return await getFoodDetail(trackerId, options)
    } catch (e) {
      console.error('get-food-detail error:', e)
      return {
        current: null,
        history: [],
        chartData: [],
        totalCalories: 0,
        structuredEntryCount: 0,
        legacyEntryCount: 0,
        foodFrequency: [],
        tagFrequency: [],
      }
    }
  })
}
