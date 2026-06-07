import type {
  Entry,
  FoodDetailResponse,
  FoodEntryReadModel,
  FoodHistoryItem,
  FoodHomeWidgetReadModel,
  FoodStatisticsReadModel,
  MealType,
  Tag,
} from '../contracts/app-types'

type StructuredFoodEntry = FoodEntryReadModel

const MEAL_TYPES: MealType[] = ['breakfast', 'lunch', 'dinner', 'snack', 'other']

function roundValue(value: number): number {
  return Math.round(value * 100) / 100
}

function sortFoodHistory(entries: FoodHistoryItem[]): FoodHistoryItem[] {
  return [...entries].sort((a, b) => b.timestamp - a.timestamp || b.entryId - a.entryId)
}

export function normalizeFoodName(value: string): string {
  return value.trim().replace(/\s+/g, ' ')
}

export function normalizeFoodKey(value: string): string {
  return normalizeFoodName(value).toLowerCase()
}

export function validateCaloriesOptional(value: unknown): number | null {
  if (value === undefined || value === null || value === '') return null
  const parsed = typeof value === 'number' ? value : Number(value)
  if (!Number.isFinite(parsed) || parsed <= 0) {
    throw new Error('Calories must be a finite positive number')
  }
  return roundValue(parsed)
}

export function validateMealType(value: unknown): MealType | null {
  if (value === undefined || value === null || value === '') return null
  const normalized = String(value).trim().toLowerCase()
  if (MEAL_TYPES.includes(normalized as MealType)) return normalized as MealType
  throw new Error('Meal type must be breakfast, lunch, dinner, snack, or other')
}

export function entryToFoodHistoryItem(entry: Entry): FoodHistoryItem {
  if (entry.food?.structured) {
    return {
      entryId: entry.id,
      trackerId: entry.trackerId,
      foodName: entry.food.foodName,
      foodKey: entry.food.foodKey,
      calories: entry.food.calories,
      mealType: entry.food.mealType,
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

export function buildFoodHistoryReadModel(entries: Entry[]): FoodHistoryItem[] {
  return sortFoodHistory(entries.map(entryToFoodHistoryItem))
}

export function computeStructuredCaloriesTotal(entries: FoodHistoryItem[]): number {
  return roundValue(
    entries.reduce((sum, entry) => sum + (entry.structured && entry.calories != null ? entry.calories : 0), 0),
  )
}

export function computeFoodFrequency(entries: FoodHistoryItem[]): Array<{ foodName: string; foodKey: string; entryCount: number; totalCalories: number }> {
  const groups = new Map<string, { foodName: string; foodKey: string; entryCount: number; totalCalories: number }>()

  for (const entry of entries) {
    if (!entry.structured) continue
    const current = groups.get(entry.foodKey) ?? {
      foodName: entry.foodName,
      foodKey: entry.foodKey,
      entryCount: 0,
      totalCalories: 0,
    }
    current.foodName = current.foodName || entry.foodName
    current.entryCount += 1
    current.totalCalories = roundValue(current.totalCalories + (entry.calories ?? 0))
    groups.set(entry.foodKey, current)
  }

  return Array.from(groups.values()).sort(
    (a, b) => b.entryCount - a.entryCount || b.totalCalories - a.totalCalories || a.foodName.localeCompare(b.foodName),
  )
}

export function computeTagOrIngredientFrequency(
  entries: FoodHistoryItem[],
  tags: Tag[],
): Array<{ tagId: number; tagName: string; entryCount: number }> {
  const counts = new Map<number, number>()
  for (const entry of entries) {
    if (!entry.structured) continue
    for (const tagId of entry.tagIds ?? []) {
      counts.set(tagId, (counts.get(tagId) ?? 0) + 1)
    }
  }

  const tagById = new Map(tags.map((tag) => [tag.id, tag]))
  return Array.from(counts.entries())
    .map(([tagId, entryCount]) => ({
      tagId,
      tagName: tagById.get(tagId)?.name ?? `Tag ${tagId}`,
      entryCount,
    }))
    .sort((a, b) => b.entryCount - a.entryCount || a.tagName.localeCompare(b.tagName))
}

function buildChartData(entries: FoodHistoryItem[]): Array<{ date: string; value: number; count: number }> {
  const buckets = new Map<string, { value: number; count: number }>()

  for (const entry of entries) {
    if (!entry.structured || entry.calories == null) continue
    const bucket = buckets.get(entry.dateStr) ?? { value: 0, count: 0 }
    bucket.value = roundValue(bucket.value + entry.calories)
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

export function buildFoodStatisticsReadModel(entries: Entry[], tags: Tag[] = []): FoodStatisticsReadModel {
  const history = buildFoodHistoryReadModel(entries)
  const structured = history.filter((entry): entry is StructuredFoodEntry => entry.structured)
  return {
    entryCount: history.length,
    structuredEntryCount: structured.length,
    legacyEntryCount: history.length - structured.length,
    totalCalories: computeStructuredCaloriesTotal(history),
    chartData: buildChartData(history),
    foodFrequency: computeFoodFrequency(history),
    tagFrequency: computeTagOrIngredientFrequency(history, tags),
  }
}

export function buildFoodDetailReadModel(entries: Entry[], tags: Tag[] = []): FoodDetailResponse {
  const history = buildFoodHistoryReadModel(entries)
  const stats = buildFoodStatisticsReadModel(entries, tags)
  const structured = history.filter((entry): entry is StructuredFoodEntry => entry.structured)

  return {
    current: structured[0] ?? null,
    history,
    chartData: stats.chartData,
    totalCalories: stats.totalCalories,
    structuredEntryCount: stats.structuredEntryCount,
    legacyEntryCount: stats.legacyEntryCount,
    foodFrequency: stats.foodFrequency,
    tagFrequency: stats.tagFrequency,
  }
}

export function buildFoodHomeWidgetReadModel(
  entries: Entry[],
  options: { trackerId: number; title: string; selectedDate: string },
  tags: Tag[] = [],
): FoodHomeWidgetReadModel {
  const history = buildFoodHistoryReadModel(entries)
  const stats = buildFoodStatisticsReadModel(entries, tags)
  const structured = history.filter((entry): entry is StructuredFoodEntry => entry.structured)
  const selectedDayEntries = history.filter((entry) => entry.dateStr === options.selectedDate)
  const latestStructured = structured[0] ?? null

  return {
    trackerId: options.trackerId,
    title: options.title,
    currentFoodName: latestStructured?.foodName ?? null,
    currentCalories: latestStructured?.calories ?? null,
    selectedDayEntries,
    totalCalories: stats.totalCalories,
    legacyEntryCount: stats.legacyEntryCount,
    sparkline: stats.chartData.map((point) => ({ date: point.date, value: point.value })),
  }
}
