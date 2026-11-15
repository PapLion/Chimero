import { describe, expect, it } from 'vitest'
import type { MetricDescriptor } from '@contracts/contracts'
import { addDays, analyzePair, buildDailySeries, daysBetween, eachDay, summarizeSeries } from '@contracts/domain/analytics/series'

const metric = (id: string, kind: MetricDescriptor['kind']): MetricDescriptor => ({ id, trackerId: 1, label: id, group: id, unit: null, kind, color: null, aggregate: 'mean' })
const window = { from: '2026-01-01', to: '2026-01-10', observedFrom: '2026-01-03' }

describe('daily series', () => {
  it('walks calendar days across month and year boundaries', () => {
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01')
    expect(addDays('2024-03-01', -1)).toBe('2024-02-29')
    expect(daysBetween('2026-01-01', '2026-01-31')).toBe(30)
    expect(eachDay('2026-02-27', '2026-03-01')).toEqual(['2026-02-27', '2026-02-28', '2026-03-01'])
  })

  it('keeps unknown days out of measures', () => {
    const series = buildDailySeries(metric('weight', 'measure'), new Map([['2026-01-04', 80], ['2026-01-08', 79]]), window)
    expect(series.points).toEqual([{ date: '2026-01-04', value: 80 }, { date: '2026-01-08', value: 79 }])
  })

  it('fills zeros for activities only after the tracker was first used', () => {
    const series = buildDailySeries(metric('hours', 'activity'), new Map([['2026-01-04', 2]]), window)
    expect(series.points.map((p) => p.date)).toEqual(eachDay('2026-01-03', '2026-01-10'))
    expect(series.points.filter((p) => p.value === 0)).toHaveLength(7)
    expect(series.recordedDays).toBe(1)
  })

  it('returns nothing for an activity that was never recorded', () => {
    expect(buildDailySeries(metric('hours', 'activity'), new Map(), { ...window, observedFrom: null }).points).toEqual([])
  })

  it('summarises with a per-day trend', () => {
    const recorded = new Map(eachDay('2026-01-01', '2026-01-10').map((date, i) => [date, 80 - i * 0.5]))
    const summary = summarizeSeries(buildDailySeries(metric('weight', 'measure'), recorded, window))
    expect(summary.trendPerDay).toBeCloseTo(-0.5, 10)
    expect(summary.first?.value).toBe(80)
    expect(summary.last?.value).toBe(75.5)
  })
})

describe('pair analysis', () => {
  const days = eachDay('2026-01-01', '2026-01-30')
  const full = { from: '2026-01-01', to: '2026-01-30', observedFrom: '2026-01-01' }

  it('reports insufficient data instead of a coefficient', () => {
    const a = buildDailySeries(metric('a', 'measure'), new Map([['2026-01-01', 1], ['2026-01-02', 2]]), full)
    const b = buildDailySeries(metric('b', 'measure'), new Map([['2026-01-01', 1], ['2026-01-02', 2]]), full)
    const result = analyzePair(a, b, 0)
    expect(result.status).toBe('insufficient')
    expect(result.n).toBe(2)
    expect(result.spearman).toBeNull()
  })

  it('uses only days where both metrics are known', () => {
    const a = buildDailySeries(metric('a', 'measure'), new Map(days.slice(0, 20).map((d, i) => [d, i])), full)
    const b = buildDailySeries(metric('b', 'measure'), new Map(days.slice(10).map((d, i) => [d, i * 2])), full)
    const result = analyzePair(a, b, 0)
    expect(result.n).toBe(10)
    expect(result.pearson?.value).toBeCloseTo(1, 10)
    expect(result.reliability).toBe('preliminary')
  })

  it('distinguishes a real zero from a missing day', () => {
    // Exercise on even days only; mood is higher on exactly those days.
    const exercise = buildDailySeries(metric('trained', 'flag'), new Map(days.filter((_, i) => i % 2 === 0).map((d) => [d, 1])), full)
    const mood = buildDailySeries(metric('mood', 'measure'), new Map(days.map((d, i) => [d, i % 2 === 0 ? 8 : 5])), full)
    const result = analyzePair(exercise, mood, 0)
    expect(result.n).toBe(30)
    expect(result.split).toMatchObject({ mode: 'occurrence', high: { n: 15, mean: 8 }, low: { n: 15, mean: 5 }, diff: 3 })
    expect(result.direction).toBe('positive')
    expect(result.strength).toBe('strong')
    expect(result.reliability).toBe('solid')
  })

  it('shifts the outcome by the lag', () => {
    const a = buildDailySeries(metric('a', 'activity'), new Map(days.map((d, i) => [d, i % 3])), full)
    const b = buildDailySeries(metric('b', 'activity'), new Map(days.map((d, i) => [d, (i + 2) % 3])), full)
    // b today equals a yesterday
    expect(analyzePair(a, b, 1).pearson?.value).toBeCloseTo(1, 10)
    expect(Math.abs(analyzePair(a, b, 0).pearson?.value ?? 1)).toBeLessThan(0.6)
    expect(analyzePair(a, b, 1).n).toBe(29)
  })

  it('flags a metric that never varies', () => {
    const a = buildDailySeries(metric('a', 'measure'), new Map(days.map((d) => [d, 5])), full)
    const b = buildDailySeries(metric('b', 'measure'), new Map(days.map((d, i) => [d, i])), full)
    expect(analyzePair(a, b, 0).status).toBe('constant-a')
    expect(analyzePair(b, a, 0).status).toBe('constant-b')
  })

  it('reads a flag outcome as a rate', () => {
    const wheat = buildDailySeries(metric('wheat', 'flag'), new Map(days.filter((_, i) => i % 3 === 0).map((d) => [d, 1])), full)
    const cold = buildDailySeries(metric('cold', 'flag'), new Map(days.filter((_, i) => i % 3 === 1).map((d) => [d, 1])), full)
    const result = analyzePair(wheat, cold, 1)
    expect(result.split?.outcomeIsRate).toBe(true)
    expect(result.split?.high.mean).toBe(1)
    expect(result.split?.low.mean).toBe(0)
  })
})
