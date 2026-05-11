import { ipcMain } from 'electron'
import { searchExercises, getAllExercises, getExerciseDbStatus } from './service'

export function registerExerciseHandlers(): void {
  ipcMain.handle('search-exercises', async (_, options: { query: string; limit?: number }) => {
    try {
      const { query, limit } = options
      const effectiveQuery = query?.trim() || ''
      if (!effectiveQuery) {
        return getAllExercises(limit ?? 20)
      }
      return searchExercises(effectiveQuery, limit ?? 20)
    } catch (e) {
      console.error('search-exercises error:', e)
      return []
    }
  })

  ipcMain.handle('get-all-exercises', async (_, options?: { limit?: number }) => {
    try {
      return getAllExercises(options?.limit ?? 50)
    } catch (e) {
      console.error('get-all-exercises error:', e)
      return []
    }
  })

  ipcMain.handle('get-exercise-db-status', async () => {
    try {
      return getExerciseDbStatus()
    } catch (e) {
      console.error('get-exercise-db-status error:', e)
      return { status: 'error', count: 0, error: 'Unknown error' }
    }
  })
}
