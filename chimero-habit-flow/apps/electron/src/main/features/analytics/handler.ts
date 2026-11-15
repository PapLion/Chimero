import { ipcMain } from 'electron'
import { getRawDb } from '@packages/db/database'
import type { AnalyticsRange, PairRequest, ScanRequest, SeriesRequest } from '@contracts/contracts'
import { getPreferences } from '../settings/service'
import { analyze, getSeries, listMetrics, overview, scan } from './service'

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/

function raw() {
  const db = getRawDb()
  if (!db) throw new Error('Database is not open')
  return db
}

function assertRange(range: AnalyticsRange): void {
  if (!range || !DATE_RE.test(range.from) || !DATE_RE.test(range.to) || range.from > range.to) {
    throw new Error('Invalid date range')
  }
}

export function registerAnalyticsHandlers(): void {
  ipcMain.handle('analytics-metrics', () => listMetrics(raw(), getPreferences(raw())))
  ipcMain.handle('analytics-series', (_, request: SeriesRequest) => {
    assertRange(request)
    return getSeries(raw(), getPreferences(raw()), request, Array.isArray(request.metricIds) ? request.metricIds.slice(0, 80) : [])
  })
  ipcMain.handle('analytics-pair', (_, request: PairRequest) => {
    assertRange(request)
    return analyze(raw(), getPreferences(raw()), request)
  })
  ipcMain.handle('analytics-scan', (_, request: ScanRequest) => {
    assertRange(request)
    return scan(raw(), getPreferences(raw()), request)
  })
  ipcMain.handle('analytics-overview', (_, range: AnalyticsRange) => {
    assertRange(range)
    return overview(raw(), range)
  })
}
