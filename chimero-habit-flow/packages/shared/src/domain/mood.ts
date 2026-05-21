import type {
  Entry,
  MoodBentoReadModel,
  MoodCalendarDayReadModel,
  MoodDailyAggregate,
  MoodEntriesReadModel,
  MoodEntryReadModel,
  MoodStatisticsReadModel,
  MoodVisualState,
} from '../contracts'

function roundMetric(value: number): number {
  return Math.round(value * 10) / 10
}

export function normalizeMoodScore(value: unknown): number {
  if (value == null || value === '') return 1
  const parsed = typeof value === 'number' ? value : Number(value)
  if (!Number.isFinite(parsed)) return 1
  return Math.round(parsed)
}

export function clampMoodScore(value: unknown): number {
  return Math.min(Math.max(normalizeMoodScore(value), 1), 10)
}

export function moodScoreToVisualState(value: unknown): MoodVisualState {
  const score = clampMoodScore(value)
  if (score <= 4) return 'low'
  if (score <= 6) return 'neutral'
  return 'high'
}

export function moodScoreToColor(value: unknown): string {
  const state = moodScoreToVisualState(value)
  if (state === 'low') return '#ef4444'
  if (state === 'neutral') return '#f59e0b'
  return '#22c55e'
}

export function moodScoreToLabel(value: unknown): string {
  const state = moodScoreToVisualState(value)
  if (state === 'low') return 'Low'
  if (state === 'neutral') return 'Neutral'
  return 'High'
}

function sortMoodEntries(entries: MoodEntryReadModel[]): MoodEntryReadModel[] {
  return [...entries].sort((a, b) => b.timestamp - a.timestamp || b.entryId - a.entryId)
}

export function entryToMoodReadModel(entry: Entry): MoodEntryReadModel {
  const moodScore = clampMoodScore(entry.value)
  return {
    entryId: entry.id,
    trackerId: entry.trackerId,
    moodScore,
    visualState: moodScoreToVisualState(moodScore),
    color: moodScoreToColor(moodScore),
    label: moodScoreToLabel(moodScore),
    note: entry.note,
    timestamp: entry.timestamp,
    dateStr: entry.dateStr,
    assetId: entry.assetId ?? null,
    tagIds: entry.tagIds ?? [],
  }
}

export function computeMoodDailyAggregate(entries: MoodEntryReadModel[]): MoodDailyAggregate | null {
  if (entries.length === 0) return null

  const chronological = [...entries].sort((a, b) => a.timestamp - b.timestamp || a.entryId - b.entryId)
  const scores = chronological.map((entry) => entry.moodScore)
  const averageScore = roundMetric(scores.reduce((sum, score) => sum + score, 0) / scores.length)
  const latestScore = chronological[chronological.length - 1]?.moodScore ?? averageScore

  return {
    date: chronological[0]?.dateStr ?? '',
    averageScore,
    highScore: Math.max(...scores),
    lowScore: Math.min(...scores),
    latestScore,
    count: chronological.length,
    visualState: moodScoreToVisualState(averageScore),
    color: moodScoreToColor(averageScore),
    label: moodScoreToLabel(averageScore),
    entries: chronological,
  }
}

export function computeMoodStats(entries: MoodEntryReadModel[]): MoodStatisticsReadModel {
  if (entries.length === 0) {
    return {
      count: 0,
      averageScore: null,
      highScore: null,
      lowScore: null,
      latestScore: null,
      chartData: [],
    }
  }

  const sorted = sortMoodEntries(entries)
  const scores = sorted.map((entry) => entry.moodScore)
  const grouped = new Map<string, MoodEntryReadModel[]>()

  for (const entry of entries) {
    const group = grouped.get(entry.dateStr) ?? []
    group.push(entry)
    grouped.set(entry.dateStr, group)
  }

  return {
    count: entries.length,
    averageScore: roundMetric(scores.reduce((sum, score) => sum + score, 0) / scores.length),
    highScore: Math.max(...scores),
    lowScore: Math.min(...scores),
    latestScore: sorted[0]?.moodScore ?? null,
    chartData: Array.from(grouped.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, dayEntries]) => {
        const aggregate = computeMoodDailyAggregate(dayEntries)
        return {
          date,
          value: aggregate?.averageScore ?? 0,
          count: aggregate?.count ?? 0,
        }
      }),
  }
}

export function buildMoodEntriesReadModel(entries: Entry[]): MoodEntriesReadModel {
  return {
    entries: sortMoodEntries(entries.map(entryToMoodReadModel)),
  }
}

export function buildMoodStatisticsReadModel(entries: Entry[]): MoodStatisticsReadModel {
  return computeMoodStats(entries.map(entryToMoodReadModel))
}

export function buildMoodCalendarDayReadModel(entries: Entry[]): MoodCalendarDayReadModel {
  const moodEntries = entries
    .map(entryToMoodReadModel)
    .sort((a, b) => a.timestamp - b.timestamp || a.entryId - b.entryId)

  return {
    entries: moodEntries,
    aggregate: computeMoodDailyAggregate(moodEntries),
  }
}

export function buildMoodBentoReadModel(
  entries: Entry[],
  options: { trackerId: number; title: string; selectedDate: string },
): MoodBentoReadModel {
  const moodEntries = entries.map(entryToMoodReadModel)
  const sorted = sortMoodEntries(moodEntries)
  const selectedDayEntries = moodEntries.filter((entry) => entry.dateStr === options.selectedDate)
  const selectedDayAggregate = computeMoodDailyAggregate(selectedDayEntries)
  const latestScore = sorted[0]?.moodScore ?? null
  const selectedDateScore = selectedDayAggregate?.latestScore ?? null
  const stats = computeMoodStats(moodEntries)
  const displayScore = selectedDateScore ?? latestScore

  return {
    trackerId: options.trackerId,
    title: options.title,
    selectedDateScore,
    latestScore,
    selectedDayAggregate,
    sparkline: stats.chartData.map((point) => ({ date: point.date, value: point.value })),
    visualState: displayScore == null ? null : moodScoreToVisualState(displayScore),
    color: displayScore == null ? null : moodScoreToColor(displayScore),
    label: displayScore == null ? null : moodScoreToLabel(displayScore),
  }
}
