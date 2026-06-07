import type {
  Entry,
  HealthDetailResponse,
  HealthHomeWidgetReadModel,
  HealthHistoryItem,
  HealthSeveritySummary,
  HealthStatisticsReadModel,
  HealthSymptomEntryReadModel,
  HealthSymptomResponse,
  SymptomCategory,
  Tag,
} from '../contracts/app-types'

const SYMPTOM_CATEGORIES: SymptomCategory[] = ['physical', 'mental', 'general', 'other']

function roundValue(value: number): number {
  return Math.round(value * 10) / 10
}

function sortHealthHistory(entries: HealthHistoryItem[]): HealthHistoryItem[] {
  return [...entries].sort((a, b) => b.timestamp - a.timestamp || b.entryId - a.entryId)
}

export function normalizeSymptomName(value: string): string {
  return value.trim().replace(/\s+/g, ' ')
}

export function normalizeSymptomKey(value: string): string {
  return normalizeSymptomName(value).toLowerCase()
}

export function validateSymptomCategory(value: unknown): SymptomCategory {
  if (value === undefined || value === null || value === '') return 'general'
  const normalized = String(value).trim().toLowerCase()
  if (SYMPTOM_CATEGORIES.includes(normalized as SymptomCategory)) return normalized as SymptomCategory
  throw new Error('Symptom category must be physical, mental, general, or other')
}

export function validateSeverityOptional(value: unknown): number | null {
  if (value === undefined || value === null || value === '') return null
  const parsed = typeof value === 'number' ? value : Number(value)
  if (!Number.isFinite(parsed) || !Number.isInteger(parsed) || parsed < 1 || parsed > 10) {
    throw new Error('Severity must be a whole number between 1 and 10')
  }
  return parsed
}

export function formatSeverityDisplay(value: number | null): string {
  return value == null ? '--' : `${value}/10`
}

export function entryToHealthHistoryItem(entry: Entry): HealthHistoryItem {
  if (entry.health?.structured) {
    return {
      entryId: entry.id,
      trackerId: entry.trackerId,
      symptomId: entry.health.symptomId,
      symptomName: entry.health.symptomName,
      symptomKey: entry.health.symptomKey,
      category: entry.health.category,
      severity: entry.health.severity,
      note: entry.note ?? null,
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
    legacyValue: entry.value ?? null,
    timestamp: entry.timestamp,
    dateStr: entry.dateStr,
    assetId: entry.assetId ?? null,
    tagIds: entry.tagIds ?? [],
    structured: false,
  }
}

export function buildHealthHistoryReadModel(entries: Entry[]): HealthHistoryItem[] {
  return sortHealthHistory(entries.map(entryToHealthHistoryItem))
}

export function computeSymptomFrequency(entries: HealthHistoryItem[]): Array<{ symptomName: string; symptomKey: string; category: SymptomCategory; entryCount: number }> {
  const groups = new Map<string, { symptomName: string; symptomKey: string; category: SymptomCategory; entryCount: number; timestamp: number }>()

  for (const entry of entries) {
    if (!entry.structured) continue
    const current = groups.get(entry.symptomKey) ?? {
      symptomName: entry.symptomName,
      symptomKey: entry.symptomKey,
      category: entry.category,
      entryCount: 0,
      timestamp: entry.timestamp,
    }
    if (entry.timestamp >= current.timestamp) {
      current.symptomName = entry.symptomName
      current.category = entry.category
      current.timestamp = entry.timestamp
    }
    current.entryCount += 1
    groups.set(entry.symptomKey, current)
  }

  return Array.from(groups.values())
    .map(({ timestamp: _timestamp, ...group }) => group)
    .sort((a, b) => b.entryCount - a.entryCount || a.symptomName.localeCompare(b.symptomName))
}

export function computeSeveritySummary(entries: HealthHistoryItem[]): HealthSeveritySummary {
  const structured = entries.filter((entry): entry is HealthSymptomEntryReadModel => entry.structured)
  const nonNullSeverity = structured.filter((entry) => entry.severity != null).map((entry) => entry.severity as number)

  if (nonNullSeverity.length === 0) {
    return {
      averageSeverity: null,
      maxSeverity: null,
      severityCount: 0,
      missingSeverityCount: structured.length,
    }
  }

  return {
    averageSeverity: roundValue(nonNullSeverity.reduce((sum, severity) => sum + severity, 0) / nonNullSeverity.length),
    maxSeverity: Math.max(...nonNullSeverity),
    severityCount: nonNullSeverity.length,
    missingSeverityCount: structured.length - nonNullSeverity.length,
  }
}

export function computeDaysWithSymptoms(entries: HealthHistoryItem[]): number {
  return new Set(entries.filter((entry) => entry.structured).map((entry) => entry.dateStr)).size
}

function buildChartData(entries: HealthHistoryItem[]): Array<{ date: string; value: number; count: number }> {
  const buckets = new Map<string, { value: number; count: number }>()

  for (const entry of entries) {
    if (!entry.structured) continue
    const bucket = buckets.get(entry.dateStr) ?? { value: 0, count: 0 }
    bucket.value += 1
    bucket.count += 1
    buckets.set(entry.dateStr, bucket)
  }

  return Array.from(buckets.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, bucket]) => ({
      date,
      value: bucket.value,
      count: bucket.count,
    }))
}

export function buildHealthStatisticsReadModel(entries: Entry[], _tags: Tag[] = []): HealthStatisticsReadModel {
  const history = buildHealthHistoryReadModel(entries)
  const structured = history.filter((entry): entry is HealthSymptomEntryReadModel => entry.structured)
  return {
    totalOccurrences: structured.length,
    structuredEntryCount: structured.length,
    legacyEntryCount: history.length - structured.length,
    daysWithSymptoms: computeDaysWithSymptoms(history),
    symptomFrequency: computeSymptomFrequency(history),
    severitySummary: computeSeveritySummary(history),
    chartData: buildChartData(history),
  }
}

export function buildHealthDetailReadModel(entries: Entry[], tags: Tag[] = []): HealthDetailResponse {
  const history = buildHealthHistoryReadModel(entries)
  const stats = buildHealthStatisticsReadModel(entries, tags)
  const structured = history.filter((entry): entry is HealthSymptomEntryReadModel => entry.structured)

  return {
    current: structured[0] ?? null,
    history,
    ...stats,
  }
}

export function buildHealthHomeWidgetReadModel(
  entries: Entry[],
  options: { trackerId: number; title: string; selectedDate: string },
  tags: Tag[] = [],
): HealthHomeWidgetReadModel {
  const history = buildHealthHistoryReadModel(entries)
  const stats = buildHealthStatisticsReadModel(entries, tags)
  const structured = history.filter((entry): entry is HealthSymptomEntryReadModel => entry.structured)
  const selectedDayEntries = history.filter((entry) => entry.dateStr === options.selectedDate)
  const latestStructured = structured[0] ?? null

  return {
    trackerId: options.trackerId,
    title: options.title,
    currentSymptomName: latestStructured?.symptomName ?? null,
    currentSymptomCategory: latestStructured?.category ?? null,
    currentSeverity: latestStructured?.severity ?? null,
    selectedDayEntries,
    totalOccurrences: stats.totalOccurrences,
    daysWithSymptoms: stats.daysWithSymptoms,
    legacyEntryCount: stats.legacyEntryCount,
    sparkline: stats.chartData.map((point) => ({ date: point.date, value: point.value })),
  }
}

export function buildHealthSymptomResponse(entry: HealthSymptomEntryReadModel, tags: Tag[]): HealthSymptomResponse {
  return {
    entry,
    tags,
  }
}
