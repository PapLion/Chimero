/**
 * Tracking service: streak calculation, dashboard stats, and correlation engine.
 */
import { getDb } from '@packages/db/database'
import {
  entries,
  entriesToTags,
  trackers,
} from '@packages/db'
import { sql, eq, and, gte, lte, desc, inArray } from 'drizzle-orm'
import { computeCurrentStreak, computeBestStreak } from '@contracts/domain'
import type {
  CorrelationCalculationOptions,
  CorrelationMetadata,
  EnhancedCorrelationResult,
} from '@contracts/features/tracking'
import type {
  CorrelationQueryRequest,
  CorrelationResultResponse,
  StatsQueryRequest,
  StatsQueryResponse,
} from '@contracts/contracts'
import type { DashboardStats } from '@contracts/features/dashboard'

export { computeCurrentStreak, computeBestStreak } from '@contracts/domain'
export type { CorrelationResult, CorrelationMetadata, EnhancedCorrelationResult, CorrelationCalculationOptions } from '@contracts/features/tracking'

const MIN_SAMPLES_FOR_CONFIDENCE = 30
const BALANCE_BONUS_FACTOR = 20
const MAX_IMPACT_PERCENTAGE = 100
const MIN_SAMPLE_SIZE_DEFAULT = 5
const CONFIDENCE_THRESHOLD_DEFAULT = 30
const IMPACT_THRESHOLD_POSITIVE = 10

async function getDistinctDatesDesc(limit = 365): Promise<string[]> {
  const db = getDb()
  const rows = await db
    .select({ dateStr: entries.dateStr })
    .from(entries)
    .groupBy(entries.dateStr)
    .orderBy(desc(entries.dateStr))
    .limit(limit)
  return (rows as { dateStr: string }[]).map((r) => r.dateStr)
}

export async function getDashboardStats(): Promise<DashboardStats> {
  const db = getDb()

  const actRows = await db.select({ count: sql<number>`count(*)` }).from(trackers).where(eq(trackers.archived, false))
  const totalActivities = Number((actRows as unknown as { count: number }[])[0]?.count ?? 0)

  const now = new Date()
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10)
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().slice(0, 10)
  const monthRows = await db
    .select({ count: sql<number>`count(*)` })
    .from(entries)
    .where(and(gte(entries.dateStr, monthStart), lte(entries.dateStr, monthEnd)))
  const totalEntriesMonth = Number((monthRows as unknown as { count: number }[])[0]?.count ?? 0)

  const dates = await getDistinctDatesDesc(365)
  const currentStreak = computeCurrentStreak(dates)
  const bestStreak = computeBestStreak(dates)

  return {
    currentStreak,
    bestStreak,
    totalActivities,
    totalEntriesMonth,
  }
}

function getStatsBucket(dateStr: string, groupBy: StatsQueryRequest['groupBy']): string {
  if (groupBy === 'month') return dateStr.slice(0, 7)
  if (groupBy === 'week') {
    const date = new Date(dateStr)
    const day = date.getDay()
    const diffToMonday = date.getDate() - day + (day === 0 ? -6 : 1)
    date.setDate(diffToMonday)
    return date.toISOString().slice(0, 10)
  }
  return dateStr
}

export async function getStats(request: StatsQueryRequest = {}): Promise<StatsQueryResponse> {
  const db = getDb()
  const rows = await db.select().from(entries).orderBy(entries.dateStr)
  let allowedEntryIds: Set<number> | null = null

  if (request.tagIds && request.tagIds.length > 0) {
    const tagRows = await db
      .select()
      .from(entriesToTags)
      .where(inArray(entriesToTags.tagId, request.tagIds))
    allowedEntryIds = new Set((tagRows as Array<{ entryId: number }>).map((row) => row.entryId))
  }

  const trackerFilter = request.trackerIds && request.trackerIds.length > 0
    ? new Set(request.trackerIds)
    : null

  const filtered = (rows as Array<{ id: number; trackerId: number; value: number | null; dateStr: string }>)
    .filter((entry) => !trackerFilter || trackerFilter.has(entry.trackerId))
    .filter((entry) => !allowedEntryIds || allowedEntryIds.has(entry.id))
    .filter((entry) => !request.startDate || entry.dateStr >= request.startDate)
    .filter((entry) => !request.endDate || entry.dateStr <= request.endDate)

  const buckets = new Map<string, { total: number; count: number }>()
  const trackerIds = new Set<number>()
  const activeDays = new Set<string>()

  for (const entry of filtered) {
    trackerIds.add(entry.trackerId)
    activeDays.add(entry.dateStr)
    const bucket = getStatsBucket(entry.dateStr, request.groupBy ?? 'day')
    const current = buckets.get(bucket) ?? { total: 0, count: 0 }
    current.total += entry.value ?? 1
    current.count += 1
    buckets.set(bucket, current)
  }

  return {
    totals: {
      entryCount: filtered.length,
      trackerCount: trackerIds.size,
      activeDays: activeDays.size,
    },
    series: Array.from(buckets.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, bucket]) => ({
        date,
        value: Math.round(bucket.total * 100) / 100,
        count: bucket.count,
      })),
    caveat: 'Deterministic local summary only; descriptive stats do not imply causation.',
  }
}

export async function getCorrelationResult(request: CorrelationQueryRequest): Promise<CorrelationResultResponse> {
  const result = await calculateImpact(
    request.sourceTrackerId,
    request.targetTrackerId,
    request.offsetDays ?? 0,
    { minSampleSize: request.minSampleSize }
  )

  return {
    sourceTrackerId: result.sourceTrackerId,
    targetTrackerId: result.targetTrackerId,
    offsetDays: result.offsetDays,
    impact: result.impact,
    confidence: result.confidence,
    baselineAvg: result.baselineAvg,
    impactedAvg: result.impactedAvg,
    triggeredDays: result.triggeredDays,
    baselineDays: result.baselineDays,
    caveat: 'Correlation is descriptive and local-only; it is not evidence of causation.',
  }
}

/**
 * THE BUTTERFLY EFFECT ENGINE
 */
export async function calculateImpact(
  sourceTrackerId: number,
  targetTrackerId: number,
  offsetDays: number = 0,
  options: Partial<CorrelationCalculationOptions> = {}
): Promise<EnhancedCorrelationResult> {
  if (sourceTrackerId === targetTrackerId) {
    throw new Error('Source and target trackers must be different')
  }

  if (!Number.isInteger(sourceTrackerId) || sourceTrackerId <= 0) {
    throw new Error('Source tracker ID must be a positive integer')
  }

  if (!Number.isInteger(targetTrackerId) || targetTrackerId <= 0) {
    throw new Error('Target tracker ID must be a positive integer')
  }

  if (!Number.isInteger(offsetDays) || offsetDays < -30 || offsetDays > 30) {
    throw new Error('Offset days must be an integer between -30 and 30')
  }

  const minSampleSize = options.minSampleSize ?? MIN_SAMPLE_SIZE_DEFAULT
  const confidenceThreshold = options.confidenceThreshold ?? CONFIDENCE_THRESHOLD_DEFAULT

  const db = getDb()

  const cutoffDate = new Date()
  cutoffDate.setDate(cutoffDate.getDate() - 365)
  const cutoffDateStr = cutoffDate.toISOString().slice(0, 10)

  const sourceQuery = db
    .select({
      dateStr: entries.dateStr,
      value: entries.value,
      hasEntry: sql<boolean>`CASE WHEN ${entries.value} > 0 OR ${entries.note} IS NOT NULL THEN true ELSE false END`,
    })
    .from(entries)
    .where(and(eq(entries.trackerId, sourceTrackerId), gte(entries.dateStr, cutoffDateStr)))
    .orderBy(desc(entries.dateStr))

  const targetQuery = db
    .select({
      dateStr: entries.dateStr,
      value: entries.value,
    })
    .from(entries)
    .where(and(eq(entries.trackerId, targetTrackerId), gte(entries.dateStr, cutoffDateStr)))
    .orderBy(desc(entries.dateStr))

  const sourceEntries = await sourceQuery
  const targetEntries = await targetQuery

  const sourceMap = new Map<string, { value: number | null; hasEntry: boolean }>()
  sourceEntries.forEach((entry) => {
    sourceMap.set(entry.dateStr, { value: entry.value, hasEntry: entry.hasEntry })
  })

  const targetMap = new Map<string, number | null>()
  targetEntries.forEach((entry) => {
    targetMap.set(entry.dateStr, entry.value)
  })

  const cohortA: number[] = []
  const cohortB: number[] = []

  const formatDateLocal = (date: Date): string => {
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
  }

  for (const [sourceDate, sourceData] of sourceMap) {
    const targetDate = new Date(sourceDate)
    targetDate.setDate(targetDate.getDate() + offsetDays)
    const targetDateStr = formatDateLocal(targetDate)

    const targetValue = targetMap.get(targetDateStr)

    if (targetValue !== undefined && targetValue !== null) {
      if (sourceData.hasEntry) {
        cohortA.push(targetValue)
      } else {
        cohortB.push(targetValue)
      }
    }
  }

  const calculateAverage = (values: number[]): number => {
    if (values.length === 0) return 0
    return values.reduce((sum, val) => sum + val, 0) / values.length
  }

  const baselineAvg = calculateAverage(cohortB)
  const impactedAvg = calculateAverage(cohortA)

  let impact = 0

  if (baselineAvg <= 0) {
    impact = impactedAvg > 0 ? MAX_IMPACT_PERCENTAGE : 0
  } else {
    const rawImpact = ((impactedAvg - baselineAvg) / baselineAvg) * 100
    if (!Number.isFinite(rawImpact)) {
      impact = 0
    } else {
      impact = Math.max(-MAX_IMPACT_PERCENTAGE, Math.min(MAX_IMPACT_PERCENTAGE, rawImpact))
    }
  }

  const totalSamples = cohortA.length + cohortB.length
  const baseConfidence = Math.min(100, (totalSamples / MIN_SAMPLES_FOR_CONFIDENCE) * 100)
  const cohortBalance = cohortA.length > 0 && cohortB.length > 0
    ? Math.min(cohortA.length, cohortB.length) / Math.max(cohortA.length, cohortB.length)
    : 0

  const balanceBonus = cohortBalance * BALANCE_BONUS_FACTOR
  const confidence = Math.min(100, baseConfidence + balanceBonus)

  const insightType: EnhancedCorrelationResult['insightType'] =
    Math.abs(impact) > IMPACT_THRESHOLD_POSITIVE && confidence > confidenceThreshold
      ? impact > 0 ? 'positive_synergy' : 'destructive_interference'
      : 'neutral_correlation'

  const dataQuality: CorrelationMetadata['dataQuality'] = assessDataQuality(totalSamples, cohortBalance)
  const hasSufficientData = totalSamples >= minSampleSize && dataQuality !== 'low'
  const userFriendlyConfidence = generateConfidenceDescription(confidence, totalSamples)
  const recommendedActions = generateRecommendations(insightType, dataQuality, hasSufficientData)

  const metadata: CorrelationMetadata = {
    totalDays: totalSamples,
    dataQuality,
    hasSufficientData,
    recommendedActions,
  }

  const finalImpact = Number.isFinite(impact) ? Math.round(impact * 10) / 10 : 0
  const finalConfidence = Number.isFinite(confidence) ? Math.round(confidence) : 0
  const finalBaselineAvg = Number.isFinite(baselineAvg) ? Math.round(baselineAvg * 100) / 100 : 0
  const finalImpactedAvg = Number.isFinite(impactedAvg) ? Math.round(impactedAvg * 100) / 100 : 0

  return {
    sourceTrackerId,
    targetTrackerId,
    offsetDays,
    impact: finalImpact,
    confidence: finalConfidence,
    baselineAvg: finalBaselineAvg,
    impactedAvg: finalImpactedAvg,
    triggeredDays: cohortA.length,
    baselineDays: cohortB.length,
    metadata,
    insightType,
    userFriendlyConfidence,
  }
}

function assessDataQuality(totalSamples: number, cohortBalance: number): 'high' | 'medium' | 'low' {
  if (totalSamples >= 30 && cohortBalance >= 0.3) return 'high'
  if (totalSamples >= 15 && cohortBalance >= 0.2) return 'medium'
  return 'low'
}

function generateConfidenceDescription(confidence: number, totalSamples: number): string {
  if (confidence >= 80) return `Very High (${totalSamples} days)`
  if (confidence >= 60) return `High (${totalSamples} days)`
  if (confidence >= 40) return `Medium (${totalSamples} days)`
  if (confidence >= 20) return `Low (${totalSamples} days)`
  return `Very Low (${totalSamples} days)`
}

function generateRecommendations(
  insightType: EnhancedCorrelationResult['insightType'],
  dataQuality: CorrelationMetadata['dataQuality'],
  hasSufficientData: boolean
): string[] {
  const recommendations: string[] = []

  if (!hasSufficientData) {
    recommendations.push('Continue tracking for more reliable insights')
    return recommendations
  }

  switch (insightType) {
    case 'positive_synergy':
      recommendations.push('Consider doing these habits together')
      if (dataQuality === 'medium') {
        recommendations.push('Track more consistently to strengthen this insight')
      }
      break
    case 'destructive_interference':
      recommendations.push('Consider separating these habits')
      if (dataQuality === 'medium') {
        recommendations.push('Monitor this relationship closely')
      }
      break
    case 'neutral_correlation':
      recommendations.push('These habits appear independent')
      if (dataQuality === 'high') {
        recommendations.push('Focus on other habit combinations')
      }
      break
  }

  if (dataQuality === 'low') {
    recommendations.push('More data needed for reliable conclusions')
  }

  return recommendations
}
