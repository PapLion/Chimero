import { getDb } from '@packages/db/database'
import { entries, entryFood, entryGaming, entryWeight, trackers } from '@packages/db'
import { eq } from 'drizzle-orm'
import {
  buildCalendarDayEntry,
  getTaskActiveDate,
  getTaskStateForDate,
  isTaskTrackerLike,
  parseTaskStateMetadata,
} from '@contracts/domain'
import type { CalendarDayEntry, CalendarMonthData } from '@contracts/features/calendar'
import type { Entry, MealType, Tracker } from '@contracts/contracts'
import { getEntryTagIds } from '../tags/service'

function parseJsonObject(value: unknown): Record<string, unknown> {
  if (!value) return {}
  if (typeof value === 'object' && !Array.isArray(value)) return value as Record<string, unknown>
  if (typeof value !== 'string') return {}
  try {
    const parsed = JSON.parse(value)
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed as Record<string, unknown> : {}
  } catch {
    return {}
  }
}

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
      metadata: entries.metadata,
      timestamp: entries.timestamp,
      dateStr: entries.dateStr,
      assetId: entries.assetId,
      gamingStructured: entryGaming.entryId,
      gameTitle: entryGaming.gameTitle,
      gameKey: entryGaming.gameKey,
      estimatedHours: entryGaming.estimatedHours,
      foodStructured: entryFood.entryId,
      foodName: entryFood.foodName,
      foodKey: entryFood.foodKey,
      calories: entryFood.calories,
      mealType: entryFood.mealType,
      trackerName: trackers.name,
      trackerType: trackers.type,
      trackerIcon: trackers.icon,
      weightValue: entryWeight.weightValue,
      weightUnit: entryWeight.weightUnit,
      waistValue: entryWeight.waistValue,
      waistUnit: entryWeight.waistUnit,
    })
    .from(entries)
    .leftJoin(entryWeight, eq(entryWeight.entryId, entries.id))
    .leftJoin(entryFood, eq(entryFood.entryId, entries.id))
    .leftJoin(trackers, eq(trackers.id, entries.trackerId))
    .orderBy(entries.timestamp)

  const entriesByDate: Record<string, CalendarDayEntry[]> = {}
  const activeDaysSet = new Set<number>()
  const tagIdsByEntry = await getEntryTagIds(rows.map((row) => Number(row.id)))

  for (const r of rows) {
    const entry: Entry = {
      id: r.id,
      trackerId: r.trackerId,
      value: r.value,
      note: r.note,
      metadata: parseJsonObject(r.metadata),
      timestamp: r.timestamp,
      dateStr: r.dateStr,
      assetId: r.assetId,
      tagIds: tagIdsByEntry.get(r.id) ?? [],
      gaming: r.gamingStructured
        ? {
            structured: true,
            gameTitle: String(r.gameTitle ?? ''),
            gameKey: String(r.gameKey ?? ''),
            estimatedHours: Number(r.estimatedHours ?? 0),
          }
        : undefined,
      food: r.foodStructured
        ? {
            structured: true,
            foodName: String(r.foodName ?? ''),
            foodKey: String(r.foodKey ?? ''),
            calories: r.calories == null ? null : Number(r.calories),
            mealType: (r.mealType ?? null) as MealType | null,
          }
        : undefined,
    }
    const tracker: Pick<Tracker, 'name' | 'type' | 'icon'> = {
      name: r.trackerName ?? '',
      type: r.trackerType === 'binary' ? 'binary' : r.trackerType === 'text' || r.trackerType === 'composite' ? 'list' : r.trackerType ?? 'numeric',
      icon: r.trackerIcon,
    }
    const displayDates = new Set<string>()
    if (r.dateStr >= monthStart && r.dateStr <= monthEnd) displayDates.add(r.dateStr)
    if (isTaskTrackerLike(tracker)) {
      const metadata = parseTaskStateMetadata(entry.metadata)
      if (metadata) {
        displayDates.add(getTaskActiveDate(entry))
        for (const postponement of metadata.postponements) displayDates.add(postponement.fromDate)
      }
    }

    for (const dateStr of displayDates) {
      if (dateStr < monthStart || dateStr > monthEnd) continue
    const day = parseInt(dateStr.slice(8, 10), 10)
    if (Number.isNaN(day) || day < 1 || day > 31) continue
    activeDaysSet.add(day)
    if (!entriesByDate[dateStr]) entriesByDate[dateStr] = []
      const taskState = isTaskTrackerLike(tracker) ? getTaskStateForDate(entry, dateStr) : 'hidden'
      const taskMetadata = parseTaskStateMetadata(entry.metadata)
    entriesByDate[dateStr].push(buildCalendarDayEntry({
      id: r.id,
      trackerId: r.trackerId,
      value: r.value,
      note: r.note,
      timestamp: r.timestamp,
      dateStr,
      assetId: r.assetId,
      tagIds: tagIdsByEntry.get(r.id) ?? [],
        food: entry.food,
        task: taskState === 'hidden' || !taskMetadata
            ? null
            : {
              state: taskState,
              baseDate: r.dateStr,
              activeDate: taskMetadata.activeDate,
              completed: (r.value ?? 0) >= 1,
              postponements: taskMetadata.postponements,
            },
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
  }

  return {
    year,
    month,
    entriesByDate,
    activeDays: Array.from(activeDaysSet).sort((a, b) => a - b),
  }
}
