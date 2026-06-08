import type {
  Entry,
  IntakeDetailResponse,
  IntakeDoseSummary,
  IntakeEntryReadModel,
  IntakeHistoryItem,
  IntakeHomeWidgetReadModel,
  IntakeItemFrequency,
  IntakeItemType,
  IntakeStatisticsReadModel,
  Tag,
} from '../contracts/app-types'

type StructuredIntakeEntry = IntakeEntryReadModel

const ITEM_TYPES: IntakeItemType[] = ['vitamin', 'medication', 'supplement', 'other']

function roundValue(value: number): number {
  return Math.round(value * 100) / 100
}

function sortIntakeHistory(entries: IntakeHistoryItem[]): IntakeHistoryItem[] {
  return [...entries].sort((a, b) => b.timestamp - a.timestamp || b.entryId - a.entryId)
}

export function normalizeIntakeItemName(value: string): string {
  return value.trim().replace(/\s+/g, ' ')
}

export function normalizeIntakeItemVariant(value: unknown): string | null {
  if (value === undefined || value === null) return null
  const normalized = String(value).trim().replace(/\s+/g, ' ')
  return normalized || null
}

export function normalizeIntakeItemKey(itemName: string, itemType: IntakeItemType, variant?: string | null): string {
  const parts = [normalizeIntakeItemName(itemName), itemType, normalizeIntakeItemVariant(variant)]
    .filter((part): part is string => Boolean(part))
  return parts.join(' | ').toLowerCase()
}

export function validateIntakeItemType(value: unknown): IntakeItemType {
  if (value === undefined || value === null || value === '') return 'other'
  const normalized = String(value).trim().toLowerCase()
  if (ITEM_TYPES.includes(normalized as IntakeItemType)) return normalized as IntakeItemType
  throw new Error('Item type must be vitamin, medication, supplement, or other')
}

export function validateDosageOptional(value: unknown): number | null {
  if (value === undefined || value === null || value === '') return null
  const parsed = typeof value === 'number' ? value : Number(value)
  if (!Number.isFinite(parsed) || parsed <= 0) {
    throw new Error('Dosage must be a finite positive number')
  }
  return roundValue(parsed)
}

export function validateUnitOptional(value: unknown): string | null {
  if (value === undefined || value === null) return null
  const normalized = String(value).trim().replace(/\s+/g, ' ')
  return normalized || null
}

export function formatIntakeDosageDisplay(dosage: number | null, unit: string | null): string {
  if (dosage == null) return '--'
  return unit ? `${dosage} ${unit}` : `${dosage}`
}

export function entryToIntakeHistoryItem(entry: Entry): IntakeHistoryItem {
  if (entry.intake?.structured) {
    return {
      entryId: entry.id,
      trackerId: entry.trackerId,
      itemId: entry.intake.itemId,
      itemName: entry.intake.itemName,
      itemKey: entry.intake.itemKey,
      itemType: entry.intake.itemType,
      variant: entry.intake.variant,
      dosage: entry.intake.dosage,
      unit: entry.intake.unit,
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

export function buildIntakeHistoryReadModel(entries: Entry[]): IntakeHistoryItem[] {
  return sortIntakeHistory(entries.map(entryToIntakeHistoryItem))
}

export function computeIntakeCount(entries: IntakeHistoryItem[]): number {
  return entries.filter((entry): entry is StructuredIntakeEntry => entry.structured).length
}

export function computeDaysWithIntakes(entries: IntakeHistoryItem[]): number {
  return new Set(entries.filter((entry) => entry.structured).map((entry) => entry.dateStr)).size
}

export function computeIntakeItemFrequency(entries: IntakeHistoryItem[]): IntakeItemFrequency[] {
  const groups = new Map<string, IntakeItemFrequency & { latestTimestamp: number; days: Set<string> }>()

  for (const entry of entries) {
    if (!entry.structured) continue
    const current = groups.get(entry.itemKey) ?? {
      itemName: entry.itemName,
      itemKey: entry.itemKey,
      itemType: entry.itemType,
      variant: entry.variant,
      entryCount: 0,
      daysWithIntakes: 0,
      latestTimestamp: entry.timestamp,
      days: new Set<string>(),
    }
    if (entry.timestamp >= current.latestTimestamp) {
      current.itemName = entry.itemName
      current.itemType = entry.itemType
      current.variant = entry.variant
      current.latestTimestamp = entry.timestamp
    }
    current.entryCount += 1
    current.days.add(entry.dateStr)
    current.daysWithIntakes = current.days.size
    groups.set(entry.itemKey, current)
  }

  return Array.from(groups.values())
    .map(({ latestTimestamp: _latestTimestamp, days: _days, ...group }) => group)
    .sort(
      (a, b) =>
        b.entryCount - a.entryCount ||
        b.daysWithIntakes - a.daysWithIntakes ||
        a.itemName.localeCompare(b.itemName),
    )
}

export function computeDoseSummary(entries: IntakeHistoryItem[]): IntakeDoseSummary[] {
  const groups = new Map<string, IntakeDoseSummary & { latestTimestamp: number }>()

  for (const entry of entries) {
    if (!entry.structured) continue
    const groupKey = `${entry.itemKey}::${entry.unit ?? ''}`
    const current = groups.get(groupKey) ?? {
      itemName: entry.itemName,
      itemKey: entry.itemKey,
      itemType: entry.itemType,
      variant: entry.variant,
      unit: entry.unit,
      totalDosage: null,
      dosageCount: 0,
      missingDosageCount: 0,
      entryCount: 0,
      latestTimestamp: entry.timestamp,
    }
    if (entry.timestamp >= current.latestTimestamp) {
      current.itemName = entry.itemName
      current.itemType = entry.itemType
      current.variant = entry.variant
      current.unit = entry.unit
      current.latestTimestamp = entry.timestamp
    }
    current.entryCount += 1
    if (entry.dosage != null) {
      current.dosageCount += 1
      current.totalDosage = roundValue((current.totalDosage ?? 0) + entry.dosage)
    } else {
      current.missingDosageCount += 1
    }
    groups.set(groupKey, current)
  }

  return Array.from(groups.values())
    .map(({ latestTimestamp: _latestTimestamp, ...group }) => ({
      ...group,
      totalDosage: group.dosageCount > 0 ? group.totalDosage : null,
    }))
    .sort(
      (a, b) =>
        b.entryCount - a.entryCount ||
        b.dosageCount - a.dosageCount ||
        a.itemName.localeCompare(b.itemName),
    )
}

function buildChartData(entries: IntakeHistoryItem[]): Array<{ date: string; value: number; count: number }> {
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

export function buildIntakeStatisticsReadModel(entries: Entry[], _tags: Tag[] = []): IntakeStatisticsReadModel {
  const history = buildIntakeHistoryReadModel(entries)
  const structured = history.filter((entry): entry is StructuredIntakeEntry => entry.structured)
  return {
    intakeCount: structured.length,
    structuredEntryCount: structured.length,
    legacyEntryCount: history.length - structured.length,
    daysWithIntakes: computeDaysWithIntakes(history),
    itemFrequency: computeIntakeItemFrequency(history),
    doseSummary: computeDoseSummary(history),
    chartData: buildChartData(history),
  }
}

export function buildIntakeDetailReadModel(entries: Entry[], tags: Tag[] = []): IntakeDetailResponse {
  const history = buildIntakeHistoryReadModel(entries)
  const stats = buildIntakeStatisticsReadModel(entries, tags)
  const structured = history.filter((entry): entry is StructuredIntakeEntry => entry.structured)

  return {
    current: structured[0] ?? null,
    history,
    ...stats,
  }
}

export function buildIntakeHomeWidgetReadModel(
  entries: Entry[],
  options: { trackerId: number; title: string; selectedDate: string },
  tags: Tag[] = [],
): IntakeHomeWidgetReadModel {
  const history = buildIntakeHistoryReadModel(entries)
  const stats = buildIntakeStatisticsReadModel(entries, tags)
  const structured = history.filter((entry): entry is StructuredIntakeEntry => entry.structured)
  const selectedDayEntries = history.filter((entry) => entry.dateStr === options.selectedDate)
  const latestStructured = structured[0] ?? null

  return {
    trackerId: options.trackerId,
    title: options.title,
    currentItemName: latestStructured?.itemName ?? null,
    currentItemType: latestStructured?.itemType ?? null,
    currentVariant: latestStructured?.variant ?? null,
    currentDosage: latestStructured?.dosage ?? null,
    currentUnit: latestStructured?.unit ?? null,
    selectedDayEntries,
    intakeCount: stats.intakeCount,
    daysWithIntakes: stats.daysWithIntakes,
    legacyEntryCount: stats.legacyEntryCount,
    sparkline: stats.chartData.map((point) => ({ date: point.date, value: point.value })),
  }
}
