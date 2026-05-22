import type {
  Entry,
  TaskDayReadModel,
  TaskDayState,
  TaskEntryReadModel,
  TaskPostponement,
  TaskStateMetadata,
  Tracker,
} from '../contracts/app-types'

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/

type TaskEntryInput = Pick<Entry, 'id' | 'trackerId' | 'value' | 'note' | 'metadata' | 'timestamp' | 'dateStr' | 'assetId' | 'tagIds'>

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value)
}

function isDateStr(value: unknown): value is string {
  if (typeof value !== 'string' || !DATE_RE.test(value)) return false
  const [year, month, day] = value.split('-').map(Number)
  const date = new Date(Date.UTC(year, month - 1, day))
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day
}

export function addCalendarDays(dateStr: string, days: number): string {
  if (!isDateStr(dateStr)) throw new Error(`Invalid date: ${dateStr}`)
  const [year, month, day] = dateStr.split('-').map(Number)
  const date = new Date(Date.UTC(year, month - 1, day + days))
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}-${String(date.getUTCDate()).padStart(2, '0')}`
}

function parsePostponement(value: unknown): TaskPostponement | null {
  if (!isRecord(value)) return null
  const { fromDate, toDate, timestamp } = value
  if (!isDateStr(fromDate) || !isDateStr(toDate)) return null
  if (addCalendarDays(fromDate, 1) !== toDate) return null
  const parsedTimestamp = Number(timestamp)
  if (!Number.isFinite(parsedTimestamp)) return null
  return { fromDate, toDate, timestamp: parsedTimestamp }
}

export function parseTaskStateMetadata(metadata: unknown): TaskStateMetadata | null {
  if (!isRecord(metadata)) return null
  if (!isDateStr(metadata.activeDate)) return null
  if (!Array.isArray(metadata.postponements)) return null
  const postponements = metadata.postponements.map(parsePostponement)
  if (postponements.some((postponement) => postponement == null)) return null
  return {
    activeDate: metadata.activeDate,
    postponements: postponements as TaskPostponement[],
  }
}

export function getTaskActiveDate(entry: Pick<Entry, 'metadata' | 'dateStr'>): string {
  return parseTaskStateMetadata(entry.metadata)?.activeDate ?? entry.dateStr
}

export function getTaskStateForDate(entry: Pick<Entry, 'metadata' | 'dateStr'>, dateStr: string): TaskDayState {
  const metadata = parseTaskStateMetadata(entry.metadata)
  const activeDate = metadata?.activeDate ?? entry.dateStr
  if (dateStr === activeDate) return 'actionable'
  if (metadata?.postponements.some((postponement) => postponement.fromDate === dateStr)) return 'postponed'
  return 'hidden'
}

export function isTaskActionableOnDate(entry: Pick<Entry, 'metadata' | 'dateStr'>, dateStr: string): boolean {
  return getTaskStateForDate(entry, dateStr) === 'actionable'
}

export function isTaskPostponedOnDate(entry: Pick<Entry, 'metadata' | 'dateStr'>, dateStr: string): boolean {
  return getTaskStateForDate(entry, dateStr) === 'postponed'
}

export function postponeTaskToNextDay(entry: Pick<Entry, 'metadata' | 'dateStr'>, fromDate: string, timestamp = Date.now()): TaskStateMetadata {
  if (!isDateStr(fromDate)) throw new Error('fromDate must be a valid YYYY-MM-DD date')
  if (!Number.isFinite(timestamp)) throw new Error('timestamp must be finite')
  const currentMetadata = parseTaskStateMetadata(entry.metadata)
  const activeDate = currentMetadata?.activeDate ?? entry.dateStr
  if (fromDate !== activeDate) {
    throw new Error('fromDate must equal the current active date')
  }

  const toDate = addCalendarDays(fromDate, 1)
  const postponements = currentMetadata?.postponements ?? []
  if (postponements.some((postponement) => postponement.fromDate === fromDate && postponement.toDate === toDate)) {
    throw new Error('Duplicate task postponement transition')
  }

  return {
    activeDate: toDate,
    postponements: [...postponements, { fromDate, toDate, timestamp }],
  }
}

export function unpostponeTask(entry: Pick<Entry, 'metadata' | 'dateStr'>): TaskStateMetadata {
  const currentMetadata = parseTaskStateMetadata(entry.metadata)
  if (!currentMetadata || currentMetadata.postponements.length === 0) {
    throw new Error('Task is not postponed')
  }

  return {
    activeDate: entry.dateStr,
    postponements: [],
  }
}

export function buildTaskEntryReadModel(entry: TaskEntryInput, selectedDate: string): TaskEntryReadModel | null {
  const state = getTaskStateForDate(entry, selectedDate)
  if (state === 'hidden') return null
  const metadata = parseTaskStateMetadata(entry.metadata)
  return {
    entryId: entry.id,
    trackerId: entry.trackerId,
    text: entry.note ?? 'Task',
    completed: (entry.value ?? 0) >= 1,
    state,
    selectedDate,
    dateStr: entry.dateStr,
    activeDate: metadata?.activeDate ?? entry.dateStr,
    postponements: metadata?.postponements ?? [],
    timestamp: entry.timestamp,
    assetId: entry.assetId ?? null,
    tagIds: entry.tagIds ?? [],
  }
}

export function buildTaskDayReadModel(entries: TaskEntryInput[], dateStr: string): TaskDayReadModel {
  const readModels = entries
    .map((entry) => buildTaskEntryReadModel(entry, dateStr))
    .filter((entry): entry is TaskEntryReadModel => entry != null)
  return {
    dateStr,
    entries: readModels,
    actionable: readModels.filter((entry) => entry.state === 'actionable'),
    postponed: readModels.filter((entry) => entry.state === 'postponed'),
  }
}

export function isTaskTrackerLike(tracker: Pick<Tracker, 'name' | 'type' | 'icon'>): boolean {
  const nameLower = tracker.name.toLowerCase()
  return nameLower.includes('task') ||
    nameLower.includes('todo') ||
    nameLower.includes('checklist') ||
    tracker.icon === 'check-square'
}
