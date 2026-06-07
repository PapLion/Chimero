import { ipcMain } from 'electron'
import {
  addHealthSymptomEntry,
  deleteHealthSymptomEntry,
  getHealthDetail,
  getHealthHomeWidget,
  updateHealthSymptomEntry,
} from './service'
import type { CreateHealthSymptomRequest, UpdateHealthSymptomRequest } from '@contracts/contracts'

export function registerHealthHandlers(): void {
  ipcMain.handle('add-health-symptom-entry', async (_, data: CreateHealthSymptomRequest) => {
    try {
      return await addHealthSymptomEntry(data)
    } catch (e) {
      console.error('add-health-symptom-entry error:', e)
      return null
    }
  })

  ipcMain.handle('update-health-symptom-entry', async (_, entryId: number, updates: UpdateHealthSymptomRequest) => {
    try {
      return await updateHealthSymptomEntry(entryId, updates)
    } catch (e) {
      console.error('update-health-symptom-entry error:', e)
      return null
    }
  })

  ipcMain.handle('delete-health-symptom-entry', async (_, entryId: number) => {
    try {
      return await deleteHealthSymptomEntry(entryId)
    } catch (e) {
      console.error('delete-health-symptom-entry error:', e)
      return false
    }
  })

  ipcMain.handle('get-health-detail', async (_, trackerId: number, options?: { limit?: number }) => {
    try {
      return await getHealthDetail(trackerId, options)
    } catch (e) {
      console.error('get-health-detail error:', e)
      return {
        current: null,
        history: [],
        totalOccurrences: 0,
        structuredEntryCount: 0,
        legacyEntryCount: 0,
        daysWithSymptoms: 0,
        symptomFrequency: [],
        severitySummary: {
          averageSeverity: null,
          maxSeverity: null,
          severityCount: 0,
          missingSeverityCount: 0,
        },
        chartData: [],
      }
    }
  })

  ipcMain.handle('get-health-home', async (_, trackerId: number, options?: { selectedDate?: string; limit?: number }) => {
    try {
      return await getHealthHomeWidget(trackerId, options)
    } catch (e) {
      console.error('get-health-home error:', e)
      return {
        trackerId,
        title: 'Health',
        currentSymptomName: null,
        currentSymptomCategory: null,
        currentSeverity: null,
        selectedDayEntries: [],
        totalOccurrences: 0,
        daysWithSymptoms: 0,
        legacyEntryCount: 0,
        sparkline: [],
      }
    }
  })
}
