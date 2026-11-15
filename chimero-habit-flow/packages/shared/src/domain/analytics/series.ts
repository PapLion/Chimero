import type {
  DailySeries,
  MetricDescriptor,
  MetricSummary,
  PairAnalysis,
  PairSplit,
  RelationshipStrength,
  SeriesPoint,
} from '../../contracts/analytics'
import { compareGroups, correlationP, describe, linearFit, median, pearson, spearman } from './stats'

export const MIN_PAIRS = 5
export const PRELIMINARY_BELOW = 14
export const SOLID_FROM = 30

const DAY_MS = 86_400_000

export function parseDate(dateStr: string): number {
  const [y, m, d] = dateStr.split('-').map(Number)
  return Date.UTC(y, m - 1, d)
}

export function formatDate(utcMs: number): string {
  const d = new Date(utcMs)
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`
}

export function addDays(dateStr: string, days: number): string {
  return formatDate(parseDate(dateStr) + days * DAY_MS)
}

export function daysBetween(from: string, to: string): number {
  return Math.round((parseDate(to) - parseDate(from)) / DAY_MS)
}

export function eachDay(from: string, to: string): string[] {
  const out: string[] = []
  const end = parseDate(to)
  for (let t = parseDate(from); t <= end; t += DAY_MS) out.push(formatDate(t))
  return out
}

export function localDateStr(timestamp: number): string {
  const d = new Date(timestamp)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

/**
 * Turn sparse recorded values into a daily series.
 *
 * - `measure` metrics (weight, mood…) describe a state: a day without a record is
 *   unknown and stays out of the series.
 * - `activity` and `flag` metrics describe something that happened: inside the
 *   observation window (first record of the tracker → end of range) a day without
 *   a record is a real zero. Before the tracker existed the day is unknown.
 */
export function buildDailySeries(
  metric: MetricDescriptor,
  recorded: ReadonlyMap<string, number>,
  window: { from: string; to: string; observedFrom: string | null },
): DailySeries {
  const points: SeriesPoint[] = []
  if (metric.kind === 'measure') {
    for (const date of [...recorded.keys()].sort()) {
      if (date >= window.from && date <= window.to) points.push({ date, value: recorded.get(date) as number })
    }
  } else if (window.observedFrom) {
    const start = window.observedFrom > window.from ? window.observedFrom : window.from
    if (start <= window.to) {
      for (const date of eachDay(start, window.to)) points.push({ date, value: recorded.get(date) ?? 0 })
    }
  }
  return { metric, from: window.from, to: window.to, points, recordedDays: countRecorded(recorded, window.from, window.to) }
}

function countRecorded(recorded: ReadonlyMap<string, number>, from: string, to: string): number {
  let n = 0
  for (const date of recorded.keys()) if (date >= from && date <= to) n++
  return n
}

export function summarizeSeries(series: DailySeries): MetricSummary {
  const values = series.points.map((p) => p.value)
  const stats = describe(values)
  let trend: number | null = null
  if (values.length >= 3) {
    const first = parseDate(series.points[0].date)
    const fit = linearFit(series.points.map((p) => (parseDate(p.date) - first) / DAY_MS), values)
    trend = fit ? fit.slope : null
  }
  return {
    metric: series.metric,
    days: values.length,
    recordedDays: series.recordedDays,
    mean: stats ? stats.mean : null,
    median: stats ? stats.median : null,
    sd: stats ? stats.sd : null,
    min: stats ? stats.min : null,
    max: stats ? stats.max : null,
    total: stats ? stats.sum : null,
    trendPerDay: trend,
    first: series.points[0] ?? null,
    last: series.points[series.points.length - 1] ?? null,
  }
}

export function strengthOf(coefficient: number | null): RelationshipStrength {
  if (coefficient == null) return 'none'
  const a = Math.abs(coefficient)
  if (a >= 0.5) return 'strong'
  if (a >= 0.3) return 'moderate'
  if (a >= 0.1) return 'weak'
  return 'none'
}

/**
 * Relate metric A on day d to metric B on day d + lagDays, using only days where
 * both are known.
 */
export function analyzePair(a: DailySeries, b: DailySeries, lagDays: number): PairAnalysis {
  const bByDate = new Map(b.points.map((p) => [p.date, p.value]))
  const points: PairAnalysis['points'] = []
  for (const p of a.points) {
    const targetDate = lagDays === 0 ? p.date : addDays(p.date, lagDays)
    const y = bByDate.get(targetDate)
    if (y !== undefined) points.push({ date: p.date, x: p.value, y })
  }
  const xs = points.map((p) => p.x)
  const ys = points.map((p) => p.y)
  const n = points.length

  const base: PairAnalysis = {
    a: a.metric,
    b: b.metric,
    lagDays,
    from: a.from,
    to: a.to,
    n,
    status: 'ok',
    pearson: null,
    spearman: null,
    fit: null,
    split: null,
    strength: 'none',
    direction: 'none',
    reliability: n < PRELIMINARY_BELOW ? 'preliminary' : n < SOLID_FROM ? 'fair' : 'solid',
    points,
  }

  if (n < MIN_PAIRS) return { ...base, status: 'insufficient' }

  const r = pearson(xs, ys)
  const rho = spearman(xs, ys)
  if (r == null || rho == null) {
    return { ...base, status: new Set(xs).size < 2 ? 'constant-a' : 'constant-b', split: buildSplit(a.metric, xs, ys) }
  }

  const strength = strengthOf(rho)
  return {
    ...base,
    pearson: { value: r, p: correlationP(r, n) },
    spearman: { value: rho, p: correlationP(rho, n) },
    fit: linearFit(xs, ys),
    split: buildSplit(a.metric, xs, ys),
    strength,
    direction: strength === 'none' ? 'none' : rho > 0 ? 'positive' : 'negative',
  }
}

/** Split B by whether A happened (flag/zero-inflated) or by A's median. */
function buildSplit(metricA: MetricDescriptor, xs: number[], ys: number[]): PairSplit | null {
  const zeros = xs.filter((x) => x === 0).length
  const byOccurrence = metricA.kind !== 'measure' && zeros > 0 && zeros < xs.length
  const threshold = byOccurrence ? 0 : median(xs)
  const high: number[] = []
  const low: number[] = []
  xs.forEach((x, i) => (x > threshold ? high : low).push(ys[i]))
  if (high.length === 0 || low.length === 0) return null
  const cmp = compareGroups(high, low)
  if (!cmp) return null
  const yIsFlag = ys.every((y) => y === 0 || y === 1)
  return {
    mode: byOccurrence ? 'occurrence' : 'median',
    threshold,
    high: { n: high.length, mean: cmp.meanA },
    low: { n: low.length, mean: cmp.meanB },
    diff: cmp.diff,
    p: cmp.p,
    cohenD: cmp.cohenD,
    outcomeIsRate: yIsFlag,
  }
}
