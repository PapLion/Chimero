import type {
  Entry,
  GamingDetailResponse,
  GamingEntryReadModel,
  GamingHistoryItem,
  GamingHomeWidgetReadModel,
  GamingStatisticsReadModel,
} from '../contracts/app-types'

function roundHours(value: number): number {
  return Math.round(value * 100) / 100
}

function sortGamingHistory(entries: GamingHistoryItem[]): GamingHistoryItem[] {
  return [...entries].sort((a, b) => b.timestamp - a.timestamp || b.entryId - a.entryId)
}

export function normalizeGamingTitle(title: string): string {
  return title.trim().replace(/\s+/g, ' ')
}

export function normalizeGameKey(title: string): string {
  return normalizeGamingTitle(title).toLowerCase()
}

export function validateEstimatedHours(value: unknown): number {
  const parsed = typeof value === 'number' ? value : Number(value)
  if (!Number.isFinite(parsed) || parsed < 0) {
    throw new Error('Estimated hours must be a finite non-negative number')
  }
  return roundHours(parsed)
}

export function entryToGamingReadModel(entry: Entry): GamingHistoryItem {
  if (entry.gaming?.structured) {
    return {
      entryId: entry.id,
      trackerId: entry.trackerId,
      gameTitle: entry.gaming.gameTitle,
      gameKey: entry.gaming.gameKey,
      estimatedHours: roundHours(entry.gaming.estimatedHours),
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

export function buildGamingHistoryReadModel(entries: Entry[]): { entries: GamingHistoryItem[] } {
  return {
    entries: sortGamingHistory(entries.map(entryToGamingReadModel)),
  }
}

export function buildGamingStatisticsReadModel(entries: Entry[]): GamingStatisticsReadModel {
  const history = buildGamingHistoryReadModel(entries).entries
  const structured = history.filter((entry): entry is GamingEntryReadModel => entry.structured)
  const legacyCount = history.length - structured.length
  const totalHours = roundHours(structured.reduce((sum, entry) => sum + entry.estimatedHours, 0))
  const groupedByDate = new Map<string, { totalHours: number; count: number }>()
  const groupedByGame = new Map<string, { gameTitle: string; hours: number; entryCount: number }>()

  for (const entry of structured) {
    const day = groupedByDate.get(entry.dateStr) ?? { totalHours: 0, count: 0 }
    day.totalHours = roundHours(day.totalHours + entry.estimatedHours)
    day.count += 1
    groupedByDate.set(entry.dateStr, day)

    const game = groupedByGame.get(entry.gameKey) ?? { gameTitle: entry.gameTitle, hours: 0, entryCount: 0 }
    game.gameTitle = game.gameTitle || entry.gameTitle
    game.hours = roundHours(game.hours + entry.estimatedHours)
    game.entryCount += 1
    groupedByGame.set(entry.gameKey, game)
  }

  return {
    entryCount: history.length,
    structuredEntryCount: structured.length,
    legacyEntryCount: legacyCount,
    totalHours,
    chartData: Array.from(groupedByDate.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, bucket]) => ({
        date,
        value: bucket.totalHours,
        count: bucket.count,
      })),
    perGameHours: Array.from(groupedByGame.entries())
      .sort(([, a], [, b]) => b.hours - a.hours || a.gameTitle.localeCompare(b.gameTitle))
      .map(([, bucket]) => ({
        gameTitle: bucket.gameTitle,
        gameKey: normalizeGameKey(bucket.gameTitle),
        hours: bucket.hours,
        entryCount: bucket.entryCount,
      })),
  }
}

export function buildGamingDetailReadModel(entries: Entry[]): GamingDetailResponse {
  const history = buildGamingHistoryReadModel(entries).entries
  const structured = history.filter((entry): entry is GamingEntryReadModel => entry.structured)
  const stats = buildGamingStatisticsReadModel(entries)

  return {
    current: structured[0] ?? null,
    history,
    chartData: stats.chartData,
    totalHours: stats.totalHours,
    structuredEntryCount: stats.structuredEntryCount,
    legacyEntryCount: stats.legacyEntryCount,
    perGameHours: stats.perGameHours,
  }
}

export function buildGamingHomeWidgetReadModel(
  entries: Entry[],
  options: { trackerId: number; title: string; selectedDate: string },
): GamingHomeWidgetReadModel {
  const history = buildGamingHistoryReadModel(entries).entries
  const structured = history.filter((entry): entry is GamingEntryReadModel => entry.structured)
  const latest = structured[0] ?? null
  const selectedDay = structured.find((entry) => entry.dateStr === options.selectedDate) ?? null
  const stats = buildGamingStatisticsReadModel(entries)

  return {
    trackerId: options.trackerId,
    title: options.title,
    currentGameTitle: latest?.gameTitle ?? null,
    currentEstimatedHours: latest?.estimatedHours ?? null,
    selectedDayGameTitle: selectedDay?.gameTitle ?? null,
    selectedDayEstimatedHours: selectedDay?.estimatedHours ?? null,
    totalHours: stats.totalHours,
    legacyEntryCount: stats.legacyEntryCount,
    sparkline: stats.chartData.map((point) => ({ date: point.date, value: point.value })),
  }
}
