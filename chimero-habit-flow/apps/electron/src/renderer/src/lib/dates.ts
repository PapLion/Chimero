/** Calendar-day helpers. Days are "YYYY-MM-DD" strings in the user's local time. */

const pad = (n: number) => String(n).padStart(2, '0')

export function toDateStr(date: Date): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

export function todayStr(): string {
  return toDateStr(new Date())
}

export function parseDateStr(dateStr: string): Date {
  const [y, m, d] = dateStr.split('-').map(Number)
  return new Date(y, m - 1, d)
}

export function addDays(dateStr: string, days: number): string {
  const d = parseDateStr(dateStr)
  d.setDate(d.getDate() + days)
  return toDateStr(d)
}

export function diffDays(from: string, to: string): number {
  return Math.round((parseDateStr(to).getTime() - parseDateStr(from).getTime()) / 86_400_000)
}

export function rangeOfDays(endDateStr: string, count: number): string[] {
  return Array.from({ length: count }, (_, i) => addDays(endDateStr, i - count + 1))
}

/** Timestamp for a record made "on" a given day: now if that day is today, otherwise noon that day. */
export function timestampFor(dateStr: string, time?: string): number {
  const d = parseDateStr(dateStr)
  if (time && /^\d{1,2}:\d{2}$/.test(time)) {
    const [h, m] = time.split(':').map(Number)
    d.setHours(h, m, 0, 0)
    return d.getTime()
  }
  if (dateStr === todayStr()) return Date.now()
  d.setHours(12, 0, 0, 0)
  return d.getTime()
}

export function timeOf(timestamp: number): string {
  const d = new Date(timestamp)
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`
}

const WEEKDAY = new Intl.DateTimeFormat('en', { weekday: 'long' })
const WEEKDAY_SHORT = new Intl.DateTimeFormat('en', { weekday: 'short' })
const DAY_MONTH = new Intl.DateTimeFormat('en', { day: 'numeric', month: 'long' })
const DAY_MONTH_SHORT = new Intl.DateTimeFormat('en', { day: 'numeric', month: 'short' })
const FULL = new Intl.DateTimeFormat('en', { day: 'numeric', month: 'short', year: 'numeric' })
const MONTH_YEAR = new Intl.DateTimeFormat('en', { month: 'long', year: 'numeric' })

export const fmt = {
  weekday: (dateStr: string) => WEEKDAY.format(parseDateStr(dateStr)),
  weekdayShort: (dateStr: string) => WEEKDAY_SHORT.format(parseDateStr(dateStr)),
  dayMonth: (dateStr: string) => DAY_MONTH.format(parseDateStr(dateStr)),
  dayMonthShort: (dateStr: string) => DAY_MONTH_SHORT.format(parseDateStr(dateStr)),
  full: (dateStr: string) => FULL.format(parseDateStr(dateStr)),
  monthYear: (year: number, month: number) => MONTH_YEAR.format(new Date(year, month - 1, 1)),
  time: (timestamp: number, format: '12h' | '24h' = '12h') =>
    new Intl.DateTimeFormat('en', { hour: 'numeric', minute: '2-digit', hour12: format === '12h' }).format(new Date(timestamp)),
  /** "Today", "Yesterday", "Tomorrow" or a short date. */
  relativeDay: (dateStr: string) => {
    const delta = diffDays(todayStr(), dateStr)
    if (delta === 0) return 'Today'
    if (delta === -1) return 'Yesterday'
    if (delta === 1) return 'Tomorrow'
    return parseDateStr(dateStr).getFullYear() === new Date().getFullYear() ? DAY_MONTH_SHORT.format(parseDateStr(dateStr)) : FULL.format(parseDateStr(dateStr))
  },
  ago: (dateStr: string) => {
    const delta = diffDays(dateStr, todayStr())
    if (delta <= 0) return 'today'
    if (delta === 1) return 'yesterday'
    if (delta < 14) return `${delta} days ago`
    if (delta < 60) return `${Math.round(delta / 7)} weeks ago`
    if (delta < 730) return `${Math.round(delta / 30)} months ago`
    return `${Math.round(delta / 365)} years ago`
  },
}

export interface RangePreset {
  id: string
  label: string
  days: number | 'ytd' | 'all'
}

export const RANGE_PRESETS: RangePreset[] = [
  { id: '30d', label: '30 days', days: 30 },
  { id: '90d', label: '90 days', days: 90 },
  { id: '6m', label: '6 months', days: 182 },
  { id: '1y', label: '1 year', days: 365 },
  { id: 'ytd', label: 'This year', days: 'ytd' },
  { id: 'all', label: 'All time', days: 'all' },
]

export function resolveRange(presetId: string, firstEntryDate: string | null, end = todayStr()): { from: string; to: string } {
  const preset = RANGE_PRESETS.find((p) => p.id === presetId) ?? RANGE_PRESETS[1]
  if (preset.days === 'ytd') return { from: `${end.slice(0, 4)}-01-01`, to: end }
  if (preset.days === 'all') return { from: firstEntryDate && firstEntryDate < end ? firstEntryDate : addDays(end, -29), to: end }
  return { from: addDays(end, -(preset.days - 1)), to: end }
}
