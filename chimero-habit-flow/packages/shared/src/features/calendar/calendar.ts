export interface CalendarDayEntry {
  id: number
  trackerId: number
  value: number | null
  unit?: string | null
  waist?: number | null
  waistUnit?: string | null
  note: string | null
  timestamp: number
  dateStr: string
  assetId?: number | null
  tagIds?: number[]
}

export interface WeightCalendarDayEntry extends CalendarDayEntry {
  value: number
  unit: 'kg' | 'lb'
  waist?: number | null
  waistUnit?: 'cm' | 'in' | null
}

export interface CalendarMonthData {
  year: number
  month: number
  entriesByDate: Record<string, CalendarDayEntry[]>
  activeDays: number[]
}
