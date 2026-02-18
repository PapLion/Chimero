/**
 * Stats service: streak calculation and dashboard/calendar aggregates.
 * Runs in Main process; avoids heavy work in Renderer.
 * 
 * THE CORRELATION ENGINE PHILOSOPHY:
 * All data points are interconnected nodes. We use deterministic SQL math
 * to analyze cohort relationships, avoiding AI hallucinations.
 */
import { getDb } from '@packages/db/database';
import { entries, trackers, type CorrelationMetadata, type EnhancedCorrelationResult, type CorrelationCalculationOptions } from '@packages/db';
import { sql, eq, and, gte, lte, desc } from 'drizzle-orm';
import { computeCurrentStreak, computeBestStreak } from './streak-utils';

export { computeCurrentStreak, computeBestStreak } from './streak-utils';

// Re-export correlation types from shared location
export type { CorrelationResult, CorrelationMetadata, EnhancedCorrelationResult, CorrelationCalculationOptions } from '@packages/db';

// Constants for correlation calculations
const MIN_SAMPLES_FOR_CONFIDENCE = 30;
const BALANCE_BONUS_FACTOR = 20;
const MAX_IMPACT_PERCENTAGE = 100;
const MIN_SAMPLE_SIZE_DEFAULT = 5;
const CONFIDENCE_THRESHOLD_DEFAULT = 30;
const IMPACT_THRESHOLD_POSITIVE = 10; // Minimum impact for positive/negative classification

export interface DashboardStats {
  currentStreak: number;
  bestStreak: number;
  totalActivities: number;
  totalEntriesMonth: number;
}

/** Active day = any day with at least one entry (by dateStr). */
async function getDistinctDatesDesc(limit = 365): Promise<string[]> {
  const db = getDb();
  const rows = await db
    .select({ dateStr: entries.dateStr })
    .from(entries)
    .groupBy(entries.dateStr)
    .orderBy(desc(entries.dateStr))
    .limit(limit);
  return (rows as { dateStr: string }[]).map((r) => r.dateStr);
}

export async function getDashboardStats(): Promise<DashboardStats> {
  const db = getDb();

  const actRows = await db.select({ count: sql<number>`count(*)` }).from(trackers).where(eq(trackers.archived, false));
  const totalActivities = Number((actRows as unknown as { count: number }[])[0]?.count ?? 0);

  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().slice(0, 10);
  const monthRows = await db
    .select({ count: sql<number>`count(*)` })
    .from(entries)
    .where(and(gte(entries.dateStr, monthStart), lte(entries.dateStr, monthEnd)));
  const totalEntriesMonth = Number((monthRows as unknown as { count: number }[])[0]?.count ?? 0);

  const dates = await getDistinctDatesDesc(365);
  const currentStreak = computeCurrentStreak(dates);
  const bestStreak = computeBestStreak(dates);

  return {
    currentStreak,
    bestStreak,
    totalActivities,
    totalEntriesMonth,
  };
}

export interface CalendarDayEntry {
  id: number;
  trackerId: number;
  value: number | null;
  note: string | null;
  timestamp: number;
  dateStr: string;
}

export interface CalendarMonthData {
  year: number;
  month: number;
  entriesByDate: Record<string, CalendarDayEntry[]>;
  activeDays: number[];
}


/**
 * THE BUTTERFLY EFFECT ENGINE
 * 
 * Calculates the impact of one tracker on another using cohort analysis.
 * Enhanced with robust error handling, data quality assessment, and type safety.
 * 
 * Logic:
 * - Cohort A (Triggered): Days where Source Value > 0 (or exists)
 * - Cohort B (Baseline): Days where Source Value is 0/Null
 * - Analysis: Compare Target averages on TriggerDate + offsetDays
 * 
 * This is deterministic SQL math - no AI hallucinations.
 */
export async function calculateImpact(
  sourceTrackerId: number,
  targetTrackerId: number,
  offsetDays: number = 0,
  options: Partial<CorrelationCalculationOptions> = {}
): Promise<EnhancedCorrelationResult> {
  // Enhanced input validation
  if (sourceTrackerId === targetTrackerId) {
    throw new Error('Source and target trackers must be different');
  }
  
  if (!Number.isInteger(sourceTrackerId) || sourceTrackerId <= 0) {
    throw new Error('Source tracker ID must be a positive integer');
  }
  
  if (!Number.isInteger(targetTrackerId) || targetTrackerId <= 0) {
    throw new Error('Target tracker ID must be a positive integer');
  }
  
  if (!Number.isInteger(offsetDays) || offsetDays < -30 || offsetDays > 30) {
    throw new Error('Offset days must be an integer between -30 and 30');
  }

  const minSampleSize = options.minSampleSize ?? MIN_SAMPLE_SIZE_DEFAULT;
  const confidenceThreshold = options.confidenceThreshold ?? CONFIDENCE_THRESHOLD_DEFAULT;
  
  const db = getDb();
  
  // Calculate date range using parameterized queries
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - 365);
  const cutoffDateStr = cutoffDate.toISOString().slice(0, 10);
  
  // Optimized SQL queries with proper parameterization
  const sourceQuery = db
    .select({
      dateStr: entries.dateStr,
      value: entries.value,
      hasEntry: sql<boolean>`CASE WHEN ${entries.value} > 0 OR ${entries.note} IS NOT NULL THEN true ELSE false END`
    })
    .from(entries)
    .where(and(
      eq(entries.trackerId, sourceTrackerId),
      gte(entries.dateStr, cutoffDateStr)
    ))
    .orderBy(desc(entries.dateStr));

  const targetQuery = db
    .select({
      dateStr: entries.dateStr,
      value: entries.value
    })
    .from(entries)
    .where(and(
      eq(entries.trackerId, targetTrackerId),
      gte(entries.dateStr, cutoffDateStr)
    ))
    .orderBy(desc(entries.dateStr));

  // Execute queries
  const sourceEntries = await sourceQuery;
  const targetEntries = await targetQuery;

  // Create date maps for efficient lookup
  const sourceMap = new Map<string, { value: number | null; hasEntry: boolean }>();
  sourceEntries.forEach(entry => {
    sourceMap.set(entry.dateStr, { value: entry.value, hasEntry: entry.hasEntry });
  });

  const targetMap = new Map<string, number | null>();
  targetEntries.forEach(entry => {
    targetMap.set(entry.dateStr, entry.value);
  });

  // Apply offset: calculate target dates with explicit date handling
  const cohortA: number[] = []; // Triggered days target values
  const cohortB: number[] = []; // Baseline days target values

  // Helper function to format date as YYYY-MM-DD in local time
  const formatDateLocal = (date: Date): string => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  for (const [sourceDate, sourceData] of sourceMap) {
    // Calculate target date with offset - use local time for consistency
    const targetDate = new Date(sourceDate); // Clone date
    targetDate.setDate(targetDate.getDate() + offsetDays); // Add days safely
    const targetDateStr = formatDateLocal(targetDate);

    const targetValue = targetMap.get(targetDateStr);
    
    if (targetValue !== undefined && targetValue !== null) {
      if (sourceData.hasEntry) {
        cohortA.push(targetValue);
      } else {
        cohortB.push(targetValue);
      }
    }
  }

  // Enhanced calculation with data quality assessment
  const calculateAverage = (values: number[]): number => {
    if (values.length === 0) return 0;
    return values.reduce((sum, val) => sum + val, 0) / values.length;
  };

  const baselineAvg = calculateAverage(cohortB);
  const impactedAvg = calculateAverage(cohortA);

  // Bulletproof impact calculation with comprehensive edge case handling
  let impact = 0;
  
  // Handle all edge cases explicitly to prevent Infinity/NaN
  if (baselineAvg <= 0) {
    // If baseline is zero or negative
    if (impactedAvg > 0) {
      // Positive impact when baseline was <= 0
      impact = MAX_IMPACT_PERCENTAGE;
    } else {
      // Both are <= 0, no meaningful impact
      impact = 0;
    }
  } else {
    // Baseline is positive, calculate percentage impact
    const rawImpact = ((impactedAvg - baselineAvg) / baselineAvg) * 100;
    
    // Validate the result is a finite number
    if (!Number.isFinite(rawImpact)) {
      impact = 0;
    } else {
      // Cap impact to prevent extreme values
      impact = Math.max(-MAX_IMPACT_PERCENTAGE, Math.min(MAX_IMPACT_PERCENTAGE, rawImpact));
    }
  }

  // Enhanced confidence calculation with sample size considerations
  const totalSamples = cohortA.length + cohortB.length;
  const baseConfidence = Math.min(100, (totalSamples / MIN_SAMPLES_FOR_CONFIDENCE) * 100);
  const cohortBalance = cohortA.length > 0 && cohortB.length > 0 
    ? Math.min(cohortA.length, cohortB.length) / Math.max(cohortA.length, cohortB.length)
    : 0;
  
  // Adjust confidence based on cohort balance
  const balanceBonus = cohortBalance * BALANCE_BONUS_FACTOR; // Up to 20% bonus for balanced cohorts
  const confidence = Math.min(100, baseConfidence + balanceBonus);

  // Determine insight type based on impact magnitude and confidence
  const insightType: EnhancedCorrelationResult['insightType'] = 
    Math.abs(impact) > IMPACT_THRESHOLD_POSITIVE && confidence > confidenceThreshold
      ? impact > 0 ? 'positive_synergy' : 'destructive_interference'
      : 'neutral_correlation';

  // Assess data quality
  const dataQuality: CorrelationMetadata['dataQuality'] = assessDataQuality(totalSamples, cohortBalance);
  const hasSufficientData = totalSamples >= minSampleSize && dataQuality !== 'low';
  
  // Generate user-friendly confidence description
  const userFriendlyConfidence = generateConfidenceDescription(confidence, totalSamples);
  
  // Generate recommended actions
  const recommendedActions = generateRecommendations(insightType, dataQuality, hasSufficientData);

  const metadata: CorrelationMetadata = {
    totalDays: totalSamples,
    dataQuality,
    hasSufficientData,
    recommendedActions
  };

  // Final validation to ensure no invalid values escape
  const finalImpact = Number.isFinite(impact) ? Math.round(impact * 10) / 10 : 0;
  const finalConfidence = Number.isFinite(confidence) ? Math.round(confidence) : 0;
  const finalBaselineAvg = Number.isFinite(baselineAvg) ? Math.round(baselineAvg * 100) / 100 : 0;
  const finalImpactedAvg = Number.isFinite(impactedAvg) ? Math.round(impactedAvg * 100) / 100 : 0;

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
    userFriendlyConfidence
  };
}

/** Returns entries for the given month, grouped by dateStr, and list of active day numbers. */
export async function getCalendarMonth(year: number, month: number): Promise<CalendarMonthData> {
  const db = getDb();
  const monthStart = new Date(year, month, 1).toISOString().slice(0, 10);
  const monthEnd = new Date(year, month + 1, 0).toISOString().slice(0, 10);

  const rows = await db
    .select()
    .from(entries)
    .where(and(gte(entries.dateStr, monthStart), lte(entries.dateStr, monthEnd)))
    .orderBy(entries.timestamp);

  const entriesByDate: Record<string, CalendarDayEntry[]> = {};
  const activeDaysSet = new Set<number>();

  for (const r of rows as unknown as Array<{ id: number; trackerId: number; value: number | null; note: string | null; timestamp: number; dateStr: string }>) {
    const dateStr = r.dateStr;
    const day = parseInt(dateStr.slice(8, 10), 10);
    if (Number.isNaN(day) || day < 1 || day > 31) continue;
    activeDaysSet.add(day);
    if (!entriesByDate[dateStr]) entriesByDate[dateStr] = [];
    entriesByDate[dateStr].push({
      id: r.id,
      trackerId: r.trackerId,
      value: r.value,
      note: r.note,
      timestamp: r.timestamp,
      dateStr,
    });
  }

  return {
    year,
    month,
    entriesByDate,
    activeDays: Array.from(activeDaysSet).sort((a, b) => a - b),
  };
}

// Helper functions for enhanced correlation engine

function assessDataQuality(totalSamples: number, cohortBalance: number): 'high' | 'medium' | 'low' {
  if (totalSamples >= 30 && cohortBalance >= 0.3) return 'high';
  if (totalSamples >= 15 && cohortBalance >= 0.2) return 'medium';
  return 'low';
}

function generateConfidenceDescription(confidence: number, totalSamples: number): string {
  if (confidence >= 80) return `Very High (${totalSamples} days)`;
  if (confidence >= 60) return `High (${totalSamples} days)`;
  if (confidence >= 40) return `Medium (${totalSamples} days)`;
  if (confidence >= 20) return `Low (${totalSamples} days)`;
  return `Very Low (${totalSamples} days)`;
}

function generateRecommendations(
  insightType: EnhancedCorrelationResult['insightType'],
  dataQuality: CorrelationMetadata['dataQuality'],
  hasSufficientData: boolean
): string[] {
  const recommendations: string[] = [];
  
  if (!hasSufficientData) {
    recommendations.push('Continue tracking for more reliable insights');
    return recommendations;
  }
  
  switch (insightType) {
    case 'positive_synergy':
      recommendations.push('Consider doing these habits together');
      if (dataQuality === 'medium') {
        recommendations.push('Track more consistently to strengthen this insight');
      }
      break;
    case 'destructive_interference':
      recommendations.push('Consider separating these habits');
      if (dataQuality === 'medium') {
        recommendations.push('Monitor this relationship closely');
      }
      break;
    case 'neutral_correlation':
      recommendations.push('These habits appear independent');
      if (dataQuality === 'high') {
        recommendations.push('Focus on other habit combinations');
      }
      break;
  }
  
  if (dataQuality === 'low') {
    recommendations.push('More data needed for reliable conclusions');
  }
  
  return recommendations;
}
