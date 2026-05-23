import type {
  BookEntryReadModel,
  BookHistoryItem,
  BookSelectedDaySummaryReadModel,
  BookStatisticsReadModel,
  Entry,
} from '../contracts/app-types'

function roundCount(value: number): number {
  return Math.round(value)
}

function sortBookHistory(entries: BookHistoryItem[]): BookHistoryItem[] {
  return [...entries].sort((a, b) => b.timestamp - a.timestamp || b.entryId - a.entryId)
}

function validateDateString(value: string, label: string): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw new Error(`${label} must be an ISO date string in YYYY-MM-DD format`)
  }
  return value
}

export function normalizeBookTitle(title: string): string {
  return title.trim().replace(/\s+/g, ' ')
}

export function normalizeBookTitleKey(title: string): string {
  return normalizeBookTitle(title).toLowerCase()
}

export function validateBookRatingTenths(value: unknown): number {
  const parsed = typeof value === 'number' ? value : Number(value)
  if (!Number.isInteger(parsed) || parsed < 10 || parsed > 50) {
    throw new Error('Rating must be an integer tenths value between 10 and 50')
  }
  return parsed
}

export function entryToBookHistoryItem(entry: Entry): BookHistoryItem {
  if (entry.book?.structured) {
    return {
      entryId: entry.id,
      trackerId: entry.trackerId,
      bookId: entry.book.bookId,
      title: entry.book.title,
      titleKey: entry.book.titleKey,
      activityType: entry.book.activityType,
      timestamp: entry.timestamp,
      dateStr: entry.dateStr,
      assetId: entry.assetId ?? null,
      tagIds: entry.tagIds ?? [],
      structured: true,
    }
  }

  return {
    entryId: entry.id,
    trackerId: entry.trackerId,
    legacyText: entry.note ?? null,
    timestamp: entry.timestamp,
    dateStr: entry.dateStr,
    assetId: entry.assetId ?? null,
    tagIds: entry.tagIds ?? [],
    structured: false,
  }
}

export function buildBookHistoryReadModel(entries: Entry[]): { entries: BookHistoryItem[] } {
  return {
    entries: sortBookHistory(entries.map(entryToBookHistoryItem)),
  }
}

export function buildBookStatisticsReadModel(entries: Entry[]): BookStatisticsReadModel {
  const history = buildBookHistoryReadModel(entries).entries
  const structured = history.filter((entry): entry is BookEntryReadModel => entry.structured)
  const legacyEntryCount = history.length - structured.length
  const groupedByDate = new Map<string, number>()
  const uniqueBookIds = new Set<number>()

  for (const entry of structured) {
    uniqueBookIds.add(entry.bookId)
    groupedByDate.set(entry.dateStr, (groupedByDate.get(entry.dateStr) ?? 0) + 1)
  }

  return {
    entryCount: history.length,
    structuredEntryCount: structured.length,
    legacyEntryCount,
    uniqueBookCount: uniqueBookIds.size,
    startedCount: structured.filter((entry) => entry.activityType === 'started').length,
    readCount: structured.filter((entry) => entry.activityType === 'read').length,
    finishedCount: structured.filter((entry) => entry.activityType === 'finished').length,
    chartData: Array.from(groupedByDate.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, count]) => ({
        date,
        value: roundCount(count),
        count: roundCount(count),
      })),
  }
}

export function buildBookSelectedDayReadModel(
  entries: Entry[],
  options: { trackerId: number; title: string; selectedDate: string },
): BookSelectedDaySummaryReadModel {
  const history = buildBookHistoryReadModel(entries).entries
  const structured = history.filter((entry): entry is BookEntryReadModel => entry.structured)
  const selectedDate = validateDateString(options.selectedDate, 'Selected date')
  const latest = structured[0] ?? null
  const selectedDay = structured.find((entry) => entry.dateStr === selectedDate) ?? null
  const stats = buildBookStatisticsReadModel(entries)

  return {
    trackerId: options.trackerId,
    title: options.title,
    currentBookTitle: latest?.title ?? null,
    currentActivityType: latest?.activityType ?? null,
    selectedDayBookTitle: selectedDay?.title ?? null,
    selectedDayActivityType: selectedDay?.activityType ?? null,
    uniqueBookCount: stats.uniqueBookCount,
    structuredEntryCount: stats.structuredEntryCount,
    legacyEntryCount: stats.legacyEntryCount,
    sparkline: stats.chartData.map((point) => ({ date: point.date, value: point.value })),
  }
}

