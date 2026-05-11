import { ipcMain } from 'electron'
import {
  addWeightEntry,
  deleteWeightEntry,
  getWeightDetail,
  getWeightGoal,
  setWeightGoal,
  updateWeightEntry,
} from './service'
import type { CreateWeightEntryRequest, SetTrackerGoalRequest, UpdateWeightEntryRequest } from '@contracts/contracts'

export function registerWeightHandlers(): void {
  ipcMain.handle('add-weight-entry', async (_, data: CreateWeightEntryRequest) => {
    try {
      return await addWeightEntry(data)
    } catch (e) {
      console.error('add-weight-entry error:', e)
      return null
    }
  })

  ipcMain.handle('update-weight-entry', async (_, entryId: number, updates: UpdateWeightEntryRequest) => {
    try {
      return await updateWeightEntry(entryId, updates)
    } catch (e) {
      console.error('update-weight-entry error:', e)
      return null
    }
  })

  ipcMain.handle('delete-weight-entry', async (_, entryId: number) => {
    try {
      return await deleteWeightEntry(entryId)
    } catch (e) {
      console.error('delete-weight-entry error:', e)
      return false
    }
  })

  ipcMain.handle('get-weight-detail', async (_, trackerId: number, options?: { limit?: number }) => {
    try {
      return await getWeightDetail(trackerId, options)
    } catch (e) {
      console.error('get-weight-detail error:', e)
      return {
        current: null,
        history: [],
        chartData: [],
        deltaPrevious: null,
        deltaWeek: null,
        weeklyAvg: null,
        activeGoal: null,
        distanceToGoal: null,
        goalAchieved: null,
        streakDays: 0,
      }
    }
  })

  ipcMain.handle('get-weight-goal', async (_, trackerId: number) => {
    try {
      return { goal: await getWeightGoal(trackerId) }
    } catch (e) {
      console.error('get-weight-goal error:', e)
      return { goal: null }
    }
  })

  ipcMain.handle('set-weight-goal', async (_, data: SetTrackerGoalRequest) => {
    try {
      return { goal: await setWeightGoal(data) }
    } catch (e) {
      console.error('set-weight-goal error:', e)
      return { goal: null }
    }
  })
}
