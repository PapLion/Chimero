import { ipcMain } from 'electron'
import {
  createBook,
  deleteBookReadActivity,
  finishBook,
  getBook,
  getBooks,
  getBookHistory,
  getBookSelectedDaySummary,
  getBookStats,
  readBook,
  startBook,
  updateBook,
  updateBookReadActivity,
} from './service'
import type {
  CreateBookActivityRequest,
  CreateBookRequest,
  UpdateBookActivityRequest,
  UpdateBookRequest,
} from '@contracts/contracts'

function emptyStats() {
  return {
    entryCount: 0,
    structuredEntryCount: 0,
    legacyEntryCount: 0,
    uniqueBookCount: 0,
    startedCount: 0,
    readCount: 0,
    finishedCount: 0,
    chartData: [],
  }
}

function emptySelectedDay() {
  return {
    trackerId: 0,
    title: 'Books',
    currentBookTitle: null,
    currentActivityType: null,
    selectedDayBookTitle: null,
    selectedDayActivityType: null,
    selectedDayEntries: [],
    uniqueBookCount: 0,
    structuredEntryCount: 0,
    legacyEntryCount: 0,
    sparkline: [],
  }
}

export function registerBooksHandlers(): void {
  ipcMain.handle('get-book', async (_, bookId: number) => {
    try {
      return await getBook(bookId)
    } catch (e) {
      console.error('get-book error:', e)
      return null
    }
  })

  ipcMain.handle('get-books', async () => {
    try {
      return await getBooks()
    } catch (e) {
      console.error('get-books error:', e)
      return []
    }
  })

  ipcMain.handle('create-book', async (_, data: CreateBookRequest) => {
    try {
      return await createBook(data)
    } catch (e) {
      console.error('create-book error:', e)
      return null
    }
  })

  ipcMain.handle('start-book', async (_, data: CreateBookActivityRequest) => {
    try {
      return await startBook(data)
    } catch (e) {
      console.error('start-book error:', e)
      return null
    }
  })

  ipcMain.handle('read-book', async (_, data: CreateBookActivityRequest) => {
    try {
      return await readBook(data)
    } catch (e) {
      console.error('read-book error:', e)
      return null
    }
  })

  ipcMain.handle('finish-book', async (_, data: CreateBookActivityRequest) => {
    try {
      return await finishBook(data)
    } catch (e) {
      console.error('finish-book error:', e)
      return null
    }
  })

  ipcMain.handle('update-book', async (_, bookId: number, updates: UpdateBookRequest) => {
    try {
      return await updateBook(bookId, updates)
    } catch (e) {
      console.error('update-book error:', e)
      return null
    }
  })

  ipcMain.handle('update-book-read-activity', async (_, entryId: number, updates: UpdateBookActivityRequest) => {
    try {
      return await updateBookReadActivity(entryId, updates)
    } catch (e) {
      console.error('update-book-read-activity error:', e)
      return null
    }
  })

  ipcMain.handle('delete-book-read-activity', async (_, entryId: number) => {
    try {
      return await deleteBookReadActivity(entryId)
    } catch (e) {
      console.error('delete-book-read-activity error:', e)
      return false
    }
  })

  ipcMain.handle('get-book-history', async (_, trackerId: number, options?: { limit?: number }) => {
    try {
      return await getBookHistory(trackerId, options?.limit ?? 365)
    } catch (e) {
      console.error('get-book-history error:', e)
      return []
    }
  })

  ipcMain.handle('get-book-stats', async (_, trackerId: number, options?: { limit?: number }) => {
    try {
      return await getBookStats(trackerId, options?.limit ?? 365)
    } catch (e) {
      console.error('get-book-stats error:', e)
      return emptyStats()
    }
  })

  ipcMain.handle('get-book-selected-day-summary', async (_, trackerId: number, selectedDate: string, options?: { limit?: number }) => {
    try {
      return await getBookSelectedDaySummary(trackerId, selectedDate, options?.limit ?? 365)
    } catch (e) {
      console.error('get-book-selected-day-summary error:', e)
      return emptySelectedDay()
    }
  })
}
