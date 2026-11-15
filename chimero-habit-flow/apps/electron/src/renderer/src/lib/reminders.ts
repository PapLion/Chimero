import type { Reminder } from '@contracts/contracts'
import { parseDateStr, toDateStr } from './dates'

export const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

export function isRepeating(reminder: Pick<Reminder, 'date'>): boolean {
  return !reminder.date
}

/** Whether a reminder is scheduled for a given day. */
export function occursOn(reminder: Reminder, date: string): boolean {
  if (reminder.date) return reminder.date === date
  return !reminder.days || reminder.days.length === 0 || reminder.days.includes(parseDateStr(date).getDay())
}

/** A one-off reminder stays done; a repeating one is done only for the day it was ticked. */
export function isDoneOn(reminder: Reminder, date: string): boolean {
  if (!reminder.completedAt) return false
  return reminder.date ? true : toDateStr(new Date(reminder.completedAt)) === date
}

export function scheduleText(reminder: Reminder, formatDate: (date: string) => string): string {
  if (reminder.date) return formatDate(reminder.date)
  const days = reminder.days ?? []
  if (days.length === 0 || days.length === 7) return 'Every day'
  const sorted = [...days].sort((a, b) => ((a + 6) % 7) - ((b + 6) % 7))
  if (sorted.join() === '1,2,3,4,5') return 'Weekdays'
  if (sorted.join() === '6,0') return 'Weekends'
  return sorted.map((day) => WEEKDAYS[day]).join(', ')
}

export function clock(time: string, format: '12h' | '24h'): string {
  const match = /^(\d{1,2}):(\d{2})/.exec(time)
  if (!match) return time
  const hours = Number(match[1])
  if (format === '24h') return `${String(hours).padStart(2, '0')}:${match[2]}`
  return `${hours % 12 || 12}:${match[2]} ${hours < 12 ? 'am' : 'pm'}`
}
