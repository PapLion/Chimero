import { getDb } from '@packages/db/database'
import { entries, entryWeight } from '@packages/db'
import { and, eq, gte, lte } from 'drizzle-orm'
import { buildCalendarDayEntry } from '@contracts/domain'
import type { CalendarDayEntry, CalendarMonthData } from '@contracts/features/calendar'
import { getEntryTagIds } from '../tags/service'

export async function getCalendarMonth(year: number, month: number): Promise<CalendarMonthData> {
  const db = getDb()
  const monthStart = new Date(year, month, 1).toISOString().slice(0, 10)
  const monthEnd = new Date(year, month + 1, 0).toISOString().slice(0, 10)

  const rows = await db
    .select({
      id: entries.id,
      trackerId: entries.trackerId,
      value: entries.value,
      note: entries.note,
      timestamp: entries.timestamp,
      dateStr: entries.dateStr,
      assetId: entries.assetId,
      weightValue: entryWeight.weightValue,
      weightUnit: entryWeight.weightUnit,
      waistValue: entryWeight.waistValue,
      waistUnit: entryWeight.waistUnit,
    })
    .from(entries)
    .leftJoin(entryWeight, eq(entryWeight.entryId, entries.id))
    .where(and(gte(entries.dateStr, monthStart), lte(entries.dateStr, monthEnd)))
    .orderBy(entries.timestamp)

  const entriesByDate: Record<string, CalendarDayEntry[]> = {}
  const activeDaysSet = new Set<number>()
  const tagIdsByEntry = await getEntryTagIds(rows.map((row) => Number(row.id)))

  for (const r of rows) {
    const dateStr = r.dateStr
    const day = parseInt(dateStr.slice(8, 10), 10)
    if (Number.isNaN(day) || day < 1 || day > 31) continue
    activeDaysSet.add(day)
    if (!entriesByDate[dateStr]) entriesByDate[dateStr] = []
    entriesByDate[dateStr].push(buildCalendarDayEntry({
      id: r.id,
      trackerId: r.trackerId,
      value: r.value,
      note: r.note,
      timestamp: r.timestamp,
      dateStr,
      assetId: r.assetId,
      tagIds: tagIdsByEntry.get(r.id) ?? [],
      weight: r.weightValue != null
        ? {
            weight: r.weightValue,
            weightUnit: r.weightUnit === 'lb' ? 'lb' : 'kg',
            waist: r.waistValue ?? null,
            waistUnit: r.waistUnit === 'in' ? 'in' : r.waistUnit === 'cm' ? 'cm' : null,
          }
        : null,
    }))
  }

  return {
    year,
    month,
    entriesByDate,
    activeDays: Array.from(activeDaysSet).sort((a, b) => a - b),
  }
}
