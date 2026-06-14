import { ipcMain } from 'electron'
import {
  createWorkoutRoutine,
  createWorkoutSession,
  deleteWorkoutRoutine,
  deleteWorkoutSession,
  getExerciseProgress,
  getWorkoutCalendar,
  getWorkoutGraph,
  getWorkoutHistory,
  getWorkoutHome,
  getWorkoutStatistics,
  getWorkoutRoutine,
  getWorkoutRoutines,
  getWorkoutSession,
  instantiateWorkoutFromRoutine,
  saveWorkoutAsRoutine,
  updateWorkoutRoutine,
  updateWorkoutSession,
} from './service'
import type {
  CreateWorkoutRoutineRequest,
  CreateWorkoutSessionRequest,
  InstantiateWorkoutFromRoutineRequest,
  SaveWorkoutAsRoutineRequest,
  UpdateWorkoutRoutineRequest,
  UpdateWorkoutSessionRequest,
} from '@contracts/contracts'

const emptyHistory = {
  trackerId: 0,
  structuredSessions: [],
  legacySessions: [],
  totalSessions: 0,
  totalStructuredSessions: 0,
  totalLegacySessions: 0,
}

export function registerWorkoutHandlers(): void {
  ipcMain.handle('get-workout-session', async (_, entryId: number) => {
    try {
      return await getWorkoutSession(entryId)
    } catch (error) {
      console.error('get-workout-session error:', error)
      return null
    }
  })

  ipcMain.handle('get-workout-history', async (_, trackerId: number, options?: { limit?: number }) => {
    try {
      return await getWorkoutHistory(trackerId, options)
    } catch (error) {
      console.error('get-workout-history error:', error)
      return emptyHistory
    }
  })

  ipcMain.handle('create-workout-session', async (_, data: CreateWorkoutSessionRequest) => {
    try {
      return await createWorkoutSession(data)
    } catch (error) {
      console.error('create-workout-session error:', error)
      return null
    }
  })

  ipcMain.handle('update-workout-session', async (_, entryId: number, updates: UpdateWorkoutSessionRequest) => {
    try {
      return await updateWorkoutSession(entryId, updates)
    } catch (error) {
      console.error('update-workout-session error:', error)
      return null
    }
  })

  ipcMain.handle('delete-workout-session', async (_, entryId: number) => {
    try {
      return await deleteWorkoutSession(entryId)
    } catch (error) {
      console.error('delete-workout-session error:', error)
      return false
    }
  })

  ipcMain.handle('get-workout-routines', async (_, trackerId: number) => {
    try {
      return await getWorkoutRoutines(trackerId)
    } catch (error) {
      console.error('get-workout-routines error:', error)
      return { routines: [] }
    }
  })

  ipcMain.handle('get-workout-routine', async (_, routineId: number) => {
    try {
      return await getWorkoutRoutine(routineId)
    } catch (error) {
      console.error('get-workout-routine error:', error)
      return null
    }
  })

  ipcMain.handle('create-workout-routine', async (_, data: CreateWorkoutRoutineRequest) => {
    try {
      return await createWorkoutRoutine(data)
    } catch (error) {
      console.error('create-workout-routine error:', error)
      return null
    }
  })

  ipcMain.handle('update-workout-routine', async (_, routineId: number, updates: UpdateWorkoutRoutineRequest) => {
    try {
      return await updateWorkoutRoutine(routineId, updates)
    } catch (error) {
      console.error('update-workout-routine error:', error)
      return null
    }
  })

  ipcMain.handle('delete-workout-routine', async (_, routineId: number) => {
    try {
      return await deleteWorkoutRoutine(routineId)
    } catch (error) {
      console.error('delete-workout-routine error:', error)
      return { success: false }
    }
  })

  ipcMain.handle('instantiate-workout-from-routine', async (_, data: InstantiateWorkoutFromRoutineRequest) => {
    try {
      return await instantiateWorkoutFromRoutine(data)
    } catch (error) {
      console.error('instantiate-workout-from-routine error:', error)
      return null
    }
  })

  ipcMain.handle('save-workout-as-routine', async (_, data: SaveWorkoutAsRoutineRequest) => {
    try {
      return await saveWorkoutAsRoutine(data)
    } catch (error) {
      console.error('save-workout-as-routine error:', error)
      return null
    }
  })

  ipcMain.handle('get-workout-home', async (_, trackerId: number) => {
    try {
      return await getWorkoutHome(trackerId)
    } catch (error) {
      console.error('get-workout-home error:', error)
      return null
    }
  })

  ipcMain.handle('get-workout-statistics', async (_, trackerId: number) => {
    try {
      return await getWorkoutStatistics(trackerId)
    } catch (error) {
      console.error('get-workout-statistics error:', error)
      return null
    }
  })

  ipcMain.handle('get-workout-graph', async (_, trackerId: number) => {
    try {
      return await getWorkoutGraph(trackerId)
    } catch (error) {
      console.error('get-workout-graph error:', error)
      return null
    }
  })

  ipcMain.handle('get-workout-calendar', async (_, trackerId: number, year: number, month: number) => {
    try {
      return await getWorkoutCalendar(trackerId, year, month)
    } catch (error) {
      console.error('get-workout-calendar error:', error)
      return { year: 0, month: 0, entriesByDate: {}, activeDays: [] }
    }
  })

  ipcMain.handle('get-exercise-progress', async (_, trackerId: number, exerciseId: string) => {
    try {
      return await getExerciseProgress(trackerId, exerciseId)
    } catch (error) {
      console.error('get-exercise-progress error:', error)
      return null
    }
  })
}
