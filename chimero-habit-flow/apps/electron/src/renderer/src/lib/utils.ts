import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Converts a Date to YYYY-MM-DD format
 */
export function dateToDateStr(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`
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
  const targetDateStr = dateToDateStr(date)
  return entries.filter((entry) => {
    if (entry.dateStr) {
      return entry.dateStr === targetDateStr
    }
    return isSameDay(entry.timestamp, date)
  })
}