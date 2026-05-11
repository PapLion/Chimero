import type {
  TrackerGoal,
  WeightDetailResponse,
  WeightEntriesTabReadModel,
  WeightEntry,
  WeightHomeWidgetReadModel,
  WeightStatisticsReadModel,
  WeightUnit,
} from '../contracts'
import { computeCurrentStreak } from './streak'

const MS_PER_DAY = 24 * 60 * 60 * 1000

function roundMetric(value: number): number {
  return Math.round(value * 100) / 100
}

function sortWeightHistory(entries: WeightEntry[]): WeightEntry[] {
  return [...entries].sort((a, b) => b.timestamp - a.timestamp || b.entryId - a.entryId)
}

function calculateDeltaWeek(current: WeightEntry, ascending: WeightEntry[]): number | null {
  const targetTimestamp = current.timestamp - 7 * MS_PER_DAY
  const baseline = [...ascending]
    .reverse()
    .find((entry) => entry.timestamp <= targetTimestamp)

  if (!baseline) return null
  return roundMetric(current.weight - baseline.weight)
}

function calculateGoalDistance(current: WeightEntry, goal: TrackerGoal | null): number | null {
  if (!goal) return null
  return roundMetric(current.weight - goal.targetValue)
}

function calculateGoalAchieved(current: WeightEntry, goal: TrackerGoal | null): boolean | null {
  if (!goal) return null
  if (goal.direction === 'increase') return current.weight >= goal.targetValue
  if (goal.direction === 'maintain') return Math.abs(current.weight - goal.targetValue) <= 0.5
  return current.weight <= goal.targetValue
}

export function calculateWeightDetail(
  entries: WeightEntry[],
  activeGoal: TrackerGoal | null,
  todayOverride?: string
): WeightDetailResponse {
  const history = sortWeightHistory(entries)
  const current = history[0] ?? null

  if (!current) {
    return {
      current: null,
      history: [],
      chartData: [],
      deltaPrevious: null,
      deltaWeek: null,
      weeklyAvg: null,
      activeGoal,
      distanceToGoal: null,
      goalAchieved: null,
      streakDays: 0,
    }
  }

  const previous = history[1] ?? null
  const deltaPrevious = previous ? roundMetric(current.weight - previous.weight) : null
  const ascending = [...history].reverse()
  const deltaWeek = calculateDeltaWeek(current, ascending)
  const weekStart = current.timestamp - 7 * MS_PER_DAY
  const weekEntries = history.filter((entry) => entry.timestamp >= weekStart && entry.timestamp <= current.timestamp)
  const weeklyAvg = weekEntries.length > 0
    ? roundMetric(weekEntries.reduce((sum, entry) => sum + entry.weight, 0) / weekEntries.length)
    : null
  const distanceToGoal = calculateGoalDistance(current, activeGoal)
  const goalAchieved = calculateGoalAchieved(current, activeGoal)
  const streakDays = computeCurrentStreak(history.map((entry) => entry.dateStr), todayOverride ?? current.dateStr)

  return {
    current,
    history,
    chartData: ascending.map((entry) => ({
      date: entry.dateStr,
      weight: entry.weight,
      waist: entry.waist,
    })),
    deltaPrevious,
    deltaWeek,
    weeklyAvg,
    activeGoal,
    distanceToGoal,
    goalAchieved,
    streakDays,
  }
}

function toTrend(delta: number | null | undefined): 'up' | 'down' | 'neutral' {
  if (delta == null || delta === 0) return 'neutral'
  return delta > 0 ? 'up' : 'down'
}

export function buildWeightEntriesTabReadModel(detail: WeightDetailResponse): WeightEntriesTabReadModel {
  return {
    entries: detail.history.map((entry) => ({
      entryId: entry.entryId,
      trackerId: entry.trackerId,
      weight: entry.weight,
      weightUnit: entry.weightUnit,
      waist: entry.waist,
      waistUnit: entry.waistUnit,
      note: entry.note,
      timestamp: entry.timestamp,
      dateStr: entry.dateStr,
      assetId: entry.assetId ?? null,
      tagIds: entry.tagIds ?? [],
    })),
  }
}

export function buildWeightStatisticsReadModel(detail: WeightDetailResponse): WeightStatisticsReadModel {
  const waistEntries = detail.history.filter(
    (entry) => entry.waist != null && entry.waistUnit != null,
  )
  const latestWaist = waistEntries[0]
  const previousWaist = waistEntries[1]
  const waistDelta = latestWaist?.waist != null && previousWaist?.waist != null
    ? roundMetric(latestWaist.waist - previousWaist.waist)
    : null

  return {
    totalEntries: detail.history.length,
    streakDays: detail.streakDays,
    weeklyAvg: detail.weeklyAvg,
    deltaPrevious: detail.deltaPrevious,
    deltaWeek: detail.deltaWeek,
    distanceToGoal: detail.distanceToGoal,
    goalAchieved: detail.goalAchieved,
    chartData: detail.chartData,
    waistStats: latestWaist?.waist != null && latestWaist.waistUnit != null
      ? {
          latest: latestWaist.waist,
          unit: latestWaist.waistUnit,
          deltaPrevious: waistDelta,
          trend: toTrend(waistDelta),
        }
      : undefined,
  }
}

export function buildWeightHomeWidgetReadModel(
  detail: WeightDetailResponse,
  options: { trackerId: number; title: string; fallbackUnit: WeightUnit },
): WeightHomeWidgetReadModel {
  const current = detail.current

  return {
    trackerId: options.trackerId,
    title: options.title,
    currentWeight: current?.weight ?? null,
    weightUnit: current?.weightUnit ?? options.fallbackUnit,
    deltaPrevious: detail.deltaPrevious,
    sparkline: detail.chartData.map((point) => ({ date: point.date, value: point.weight })),
    trend: toTrend(detail.deltaPrevious),
    secondaryWaist: current?.waist != null && current.waistUnit != null
      ? {
          value: current.waist,
          unit: current.waistUnit,
        }
      : null,
  }
}
