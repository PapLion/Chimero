/**
 * Reminder scheduler. Every 30 s it looks for enabled reminders whose time has
 * arrived today and that have not fired today, shows a desktop notification and
 * tells the renderer.
 */
import { Notification, type BrowserWindow } from 'electron'
import { getRawDb } from '@packages/db/database'
import { getPreferences } from '../settings/service'

let checkInterval: ReturnType<typeof setInterval> | null = null
let mainWindowRef: BrowserWindow | null = null

/** A reminder fires at most this long after its time (covers sleep/late launch without replaying the whole day). */
const GRACE_MINUTES = 15

export function setMainWindowRef(win: BrowserWindow | null): void {
  mainWindowRef = win
}

export interface ReminderRow {
  id: number
  title: string
  description: string | null
  time: string
  date: string | null
  days: string | null
  last_triggered: number | null
  completed_at?: number | null
}

function localDate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function parseDays(value: string | null): number[] {
  if (!value) return []
  try {
    let parsed = JSON.parse(value)
    if (typeof parsed === 'string') parsed = JSON.parse(parsed)
    return Array.isArray(parsed) ? parsed.filter((d) => Number.isInteger(d)) : []
  } catch {
    return []
  }
}

/** Pure scheduling rule, exported for tests. `last_triggered` is stored in seconds. */
export function isReminderDue(row: ReminderRow, now: Date): boolean {
  const match = /^(\d{1,2}):(\d{2})/.exec(row.time ?? '')
  if (!match) return false
  const today = localDate(now)
  if (row.date) {
    if (row.date !== today) return false
  } else {
    const days = parseDays(row.days)
    if (days.length > 0 && !days.includes(now.getDay())) return false
  }
  // Ticking a one-off reminder retires it; ticking a repeating one only covers that day.
  if (row.completed_at != null) {
    const completed = row.completed_at > 1e11 ? row.completed_at : row.completed_at * 1000
    if (row.date || localDate(new Date(completed)) === today) return false
  }
  const minutesNow = now.getHours() * 60 + now.getMinutes()
  const minutesDue = Number(match[1]) * 60 + Number(match[2])
  if (minutesNow < minutesDue || minutesNow - minutesDue > GRACE_MINUTES) return false
  if (row.last_triggered != null) {
    const last = row.last_triggered > 1e11 ? row.last_triggered : row.last_triggered * 1000
    if (localDate(new Date(last)) === today) return false
  }
  return true
}

export function checkReminders(now = new Date()): number {
  const raw = getRawDb()
  if (!raw) return 0
  const rows = raw.prepare('SELECT id, title, description, time, date, days, last_triggered, completed_at FROM reminders WHERE enabled = 1').all() as ReminderRow[]
  const due = rows.filter((row) => isReminderDue(row, now))
  if (due.length === 0) return 0
  const notify = getPreferences(raw).notifications && Notification.isSupported()
  const mark = raw.prepare('UPDATE reminders SET last_triggered = ? WHERE id = ?')
  for (const row of due) {
    mark.run(Math.floor(now.getTime() / 1000), row.id)
    if (notify) {
      const notification = new Notification({ title: row.title, body: row.description ?? 'Chimero reminder' })
      notification.on('click', () => {
        if (mainWindowRef && !mainWindowRef.isDestroyed()) {
          mainWindowRef.show()
          mainWindowRef.focus()
        }
      })
      notification.show()
    }
    if (mainWindowRef && !mainWindowRef.isDestroyed()) mainWindowRef.webContents.send('on-reminder', { id: row.id, title: row.title })
  }
  return due.length
}

export function startReminderLoop(): void {
  if (checkInterval) return
  checkInterval = setInterval(() => {
    try {
      checkReminders()
    } catch (e) {
      console.error('[Reminders] check failed:', e)
    }
  }, 30_000)
}

export function stopReminderLoop(): void {
  if (checkInterval) clearInterval(checkInterval)
  checkInterval = null
}
