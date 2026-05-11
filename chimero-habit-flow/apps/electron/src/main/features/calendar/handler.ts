import { ipcMain } from 'electron'
import { getCalendarMonth } from './service'

export function registerCalendarHandlers(): void {
  ipcMain.handle('get-calendar-month', async (_, year: number, month: number) => {
    try {
      return await getCalendarMonth(year, month)
    } catch (e) {
      console.error('get-calendar-month error:', e)
      return { year: 0, month: 0, entriesByDate: {}, activeDays: [] }
    }
  })
}
