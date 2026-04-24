export { cn } from '@packages/ui/utils'
import { dateToDateStrLocal, type DateStr } from "shared"

/**
 * Converts a Date to YYYY-MM-DD format
 */
export function dateToDateStr(date: Date): string {
  return dateToDateStrLocal(date)
}

/**
 * Checks if two dates are the same day (ignoring time)
 */
export function isSameDay(date1: Date | number, date2: Date | number): boolean {
  const d1 = typeof date1 === 'number' ? new Date(date1) : date1
  const d2 = typeof date2 === 'number' ? new Date(date2) : date2
  return (
    d1.getFullYear() === d2.getFullYear() &&
    d1.getMonth() === d2.getMonth() &&
    d1.getDate() === d2.getDate()
  )
}

/**
 * Filters entries to only those for a specific date
 */
export function filterEntriesByDate(entries: Array<{ dateStr?: string | null; timestamp: number }>, date: Date): typeof entries {
  const targetDateStr = dateToDateStr(date) as DateStr
  return entries.filter((entry) => {
    if (entry.dateStr) {
      return entry.dateStr === targetDateStr
    }
    return isSameDay(entry.timestamp, date)
  })
}