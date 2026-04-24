export type DateStr = string
export type TimestampMs = number

/** Local-time YYYY-MM-DD from a Date object. */
export function dateToDateStrLocal(date: Date): DateStr {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`
}

/** Local-time YYYY-MM-DD from a unix timestamp in ms. */
export function timestampToDateStrLocal(ts: TimestampMs): DateStr {
  return dateToDateStrLocal(new Date(ts))
}

export function parseDateStr(dateStr: DateStr): { y: number; m: number; d: number } {
  // Expect YYYY-MM-DD
  const y = Number(dateStr.slice(0, 4))
  const m = Number(dateStr.slice(5, 7))
  const d = Number(dateStr.slice(8, 10))
  return { y, m, d }
}

/** Safe local Date construction from DateStr (avoids `new Date('YYYY-MM-DD')` UTC parsing). */
export function dateStrToLocalDate(dateStr: DateStr): Date {
  const { y, m, d } = parseDateStr(dateStr)
  return new Date(y, m - 1, d)
}

export function addDaysToDateStrLocal(dateStr: DateStr, offsetDays: number): DateStr {
  const base = dateStrToLocalDate(dateStr)
  base.setDate(base.getDate() + offsetDays)
  return dateToDateStrLocal(base)
}

/** Returns [start,end] in local-time DateStr for a month (month is 0-based like JS Date). */
export function getMonthRangeDateStrLocal(year: number, monthZeroBased: number): { start: DateStr; end: DateStr } {
  const start = dateToDateStrLocal(new Date(year, monthZeroBased, 1))
  const end = dateToDateStrLocal(new Date(year, monthZeroBased + 1, 0))
  return { start, end }
}

