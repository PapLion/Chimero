import type { MetricDescriptor, PairAnalysis } from '@contracts/contracts'
import { MIN_PAIRS } from '@contracts/domain/analytics/series'
import { num, percent } from './format'

export function lagPhrase(lagDays: number): string {
  if (lagDays === 0) return 'the same day'
  if (lagDays === 1) return 'the next day'
  return `${lagDays} days later`
}

function amount(value: number, metric: MetricDescriptor): string {
  return `${num(value, value >= 100 ? 0 : 1)}${metric.unit ? ` ${metric.unit}` : ''}`
}

export function strengthLabel(analysis: Pick<PairAnalysis, 'strength' | 'direction' | 'status'>): string {
  if (analysis.status === 'insufficient') return 'Not enough data'
  if (analysis.status !== 'ok') return 'Nothing to compare'
  if (analysis.strength === 'none') return 'No clear relationship'
  const direction = analysis.direction === 'positive' ? 'move together' : 'move in opposite directions'
  return `${analysis.strength[0].toUpperCase()}${analysis.strength.slice(1)}: they ${direction}`
}

export const RELIABILITY_TEXT: Record<PairAnalysis['reliability'], string> = {
  preliminary: 'Early read — fewer than 14 days in common',
  fair: 'Reasonable sample — 14 to 29 days in common',
  solid: 'Solid sample — 30 or more days in common',
}

/** Plain-language reading of a pair analysis, built only from its numbers. */
export function describePair(analysis: PairAnalysis): string {
  const { a, b, split, lagDays } = analysis
  if (analysis.status === 'insufficient') {
    return `Only ${analysis.n} ${analysis.n === 1 ? 'day has' : 'days have'} both “${a.label}” and “${b.label}” recorded. At least ${MIN_PAIRS} are needed before a comparison means anything.`
  }
  if (analysis.status === 'constant-a') return `“${a.label}” had the same value on every day in this period, so there is nothing to compare it against.`
  if (analysis.status === 'constant-b') return `“${b.label}” had the same value on every day in this period, so nothing could have moved it.`
  const when = lagDays === 0 ? '' : ` ${lagPhrase(lagDays)}`
  if (!split) return `“${a.label}” and “${b.label}” were both recorded on ${analysis.n} days.`
  const condition = split.mode === 'occurrence' ? `On days with “${a.label}”` : `On days when “${a.label}” was above ${amount(split.threshold, a)}`
  const otherwise = split.mode === 'occurrence' ? 'on days without it' : 'on the other days'
  if (split.outcomeIsRate) {
    return `${condition}, “${b.label}” happened${when} ${percent(split.high.mean)} of the time (${split.high.n} days), compared with ${percent(split.low.mean)} ${otherwise} (${split.low.n} days).`
  }
  return `${condition}, “${b.label}”${when} averaged ${amount(split.high.mean, b)} (${split.high.n} days), compared with ${amount(split.low.mean, b)} ${otherwise} (${split.low.n} days).`
}

export function shortFinding(a: MetricDescriptor, b: MetricDescriptor, rho: number, lagDays: number): string {
  const verb = rho > 0 ? 'rises with' : 'falls with'
  return lagDays === 0 ? `${b.label} ${verb} ${a.label}` : `${b.label} ${verb} ${a.label} ${lagDays === 1 ? 'the day before' : `${lagDays} days before`}`
}
