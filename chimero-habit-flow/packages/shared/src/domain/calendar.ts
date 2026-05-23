import type { CalendarDayEntry } from '../features/calendar'
import type { TaskDayState, TaskPostponement } from '../contracts/app-types'

type CalendarDayEntryInput = {
  id: number
  trackerId: number
  value: number | null
  note: string | null
  timestamp: number
  dateStr: string
  assetId?: number | null
  tagIds?: number[]
  gaming?: {
    structured: boolean
    gameTitle?: string
    gameKey?: string
    estimatedHours?: number
  }
  task?: {
    state: Exclude<TaskDayState, 'hidden'>
    baseDate: string
    activeDate: string
    completed: boolean
    postponements: TaskPostponement[]
  } | null
  weight?: {
    weight: number
    weightUnit: 'kg' | 'lb'
    waist?: number | null
    waistUnit?: 'cm' | 'in' | null
  } | null
}

export function buildCalendarDayEntry(input: CalendarDayEntryInput): CalendarDayEntry {
  return {
    id: input.id,
    trackerId: input.trackerId,
    value: input.weight?.weight ?? input.value,
    unit: input.weight?.weightUnit ?? null,
    waist: input.weight?.waist ?? null,
    waistUnit: input.weight?.waistUnit ?? null,
    note: input.note,
    timestamp: input.timestamp,
    dateStr: input.dateStr,
    assetId: input.assetId ?? null,
    tagIds: input.tagIds ?? [],
    gaming: input.gaming,
    taskState: input.task?.state,
    taskBaseDate: input.task?.baseDate,
    taskActiveDate: input.task?.activeDate,
    taskCompleted: input.task?.completed,
    taskPostponements: input.task?.postponements,
  }
}
