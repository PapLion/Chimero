/**
 * Insight Lab contracts. A metric is one number per day derived from persisted
 * records of a tracker (or a tag).
 */

/**
 * - measure: a state reading (weight, mood). Days without a record are unknown.
 * - activity: an amount that happened (hours, sessions, calories). No record = 0.
 * - flag: whether something happened that day (0 / 1). No record = 0.
 */
export type MetricKind = 'measure' | 'activity' | 'flag'

export interface MetricDescriptor {
  /** Stable id, e.g. `t:3:volume`, `t:9:symptom:4`, `tag:12`. */
  id: string
  trackerId: number | null
  /** Short name: "Average mood", "Hours played". */
  label: string
  /** Owning tracker or "Tags". */
  group: string
  unit: string | null
  kind: MetricKind
  color: string | null
  /** How several records on one day combine. */
  aggregate: 'mean' | 'sum' | 'max' | 'any' | 'last'
}

export interface SeriesPoint {
  date: string
  value: number
}

export interface DailySeries {
  metric: MetricDescriptor
  from: string
  to: string
  points: SeriesPoint[]
  /** Days in range that have at least one real record (before zero filling). */
  recordedDays: number
}

export interface MetricSummary {
  metric: MetricDescriptor
  days: number
  recordedDays: number
  mean: number | null
  median: number | null
  sd: number | null
  min: number | null
  max: number | null
  total: number | null
  /** Least-squares change per day across the range. */
  trendPerDay: number | null
  first: SeriesPoint | null
  last: SeriesPoint | null
}

export type RelationshipStrength = 'none' | 'weak' | 'moderate' | 'strong'

export interface Coefficient {
  value: number
  /** Two-sided p-value against "no relationship". */
  p: number | null
}

export interface PairSplit {
  /** occurrence: days A happened vs days it did not. median: A above vs at/below its median. */
  mode: 'occurrence' | 'median'
  threshold: number
  high: { n: number; mean: number }
  low: { n: number; mean: number }
  diff: number
  p: number | null
  cohenD: number | null
  /** B is a 0/1 flag, so group means read as "share of days". */
  outcomeIsRate: boolean
}

export interface PairAnalysis {
  a: MetricDescriptor
  b: MetricDescriptor
  lagDays: number
  from: string
  to: string
  /** Days where both metrics are known. */
  n: number
  status: 'ok' | 'insufficient' | 'constant-a' | 'constant-b'
  pearson: Coefficient | null
  spearman: Coefficient | null
  fit: { slope: number; intercept: number } | null
  split: PairSplit | null
  strength: RelationshipStrength
  direction: 'positive' | 'negative' | 'none'
  reliability: 'preliminary' | 'fair' | 'solid'
  points: Array<{ date: string; x: number; y: number }>
}

export interface AnalyticsRange {
  from: string
  to: string
}

export interface PairRequest extends AnalyticsRange {
  a: string
  b: string
  lagDays?: number
}

export interface ScanRequest extends AnalyticsRange {
  /** Lags to test, default [0, 1]. */
  lags?: number[]
}

export interface ScanFinding {
  a: MetricDescriptor
  b: MetricDescriptor
  lagDays: number
  n: number
  rho: number
  p: number | null
  strength: RelationshipStrength
  reliability: PairAnalysis['reliability']
}

export interface ScanResult {
  from: string
  to: string
  metricsConsidered: number
  pairsTested: number
  findings: ScanFinding[]
}

export interface SeriesRequest extends AnalyticsRange {
  metricIds: string[]
}

export interface SeriesResponse {
  series: DailySeries[]
  summaries: MetricSummary[]
}

export interface ActivityDay {
  date: string
  /** Number of records per tracker id. */
  byTracker: Record<number, number>
  total: number
}

export interface OverviewResponse {
  from: string
  to: string
  days: ActivityDay[]
  totalEntries: number
  activeDays: number
  currentStreak: number
  bestStreak: number
  firstEntryDate: string | null
}
