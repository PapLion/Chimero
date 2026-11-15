import { describe, expect, it } from 'vitest'
import { compareGroups, correlationP, describe as summarize, incompleteBeta, linearFit, median, pearson, rank, spearman, tTwoSidedP, variance } from '@contracts/domain/analytics/stats'

describe('statistics', () => {
  it('matches textbook descriptive values', () => {
    const values = [2, 4, 4, 4, 5, 5, 7, 9]
    expect(summarize(values)).toMatchObject({ n: 8, mean: 5, min: 2, max: 9, median: 4.5, sum: 40 })
    expect(variance(values)).toBeCloseTo(32 / 7, 10)
    expect(median([3, 1, 2])).toBe(2)
    expect(summarize([])).toBeNull()
  })

  it('ranks with ties sharing the average position', () => {
    expect(rank([10, 20, 20, 30])).toEqual([1, 2.5, 2.5, 4])
  })

  it('computes Pearson and Spearman coefficients', () => {
    // Anscombe's first quartet: r = 0.8164
    const x = [10, 8, 13, 9, 11, 14, 6, 4, 12, 7, 5]
    const y = [8.04, 6.95, 7.58, 8.81, 8.33, 9.96, 7.24, 4.26, 10.84, 4.82, 5.68]
    expect(pearson(x, y)).toBeCloseTo(0.8164, 4)
    expect(spearman(x, y)).toBeCloseTo(0.8182, 4)
    expect(pearson([1, 2, 3], [2, 4, 6])).toBe(1)
    expect(pearson([1, 2, 3], [6, 4, 2])).toBe(-1)
    expect(spearman([1, 2, 3, 4], [1, 8, 27, 64])).toBe(1)
    const fit = linearFit(x, y)
    expect(fit?.slope).toBeCloseTo(0.5001, 4)
    expect(fit?.intercept).toBeCloseTo(3.0001, 4)
  })

  it('refuses a coefficient when one side never varies', () => {
    expect(pearson([1, 1, 1], [1, 2, 3])).toBeNull()
    expect(spearman([1, 2, 3], [5, 5, 5])).toBeNull()
    expect(pearson([1], [1])).toBeNull()
  })

  it('computes Student t tail probabilities', () => {
    expect(tTwoSidedP(2.228, 10)).toBeCloseTo(0.05, 3)
    expect(tTwoSidedP(1.96, 1000)).toBeCloseTo(0.0503, 3)
    expect(tTwoSidedP(0, 10)).toBeCloseTo(1, 10)
    expect(incompleteBeta(0.5, 2, 2)).toBeCloseTo(0.5, 10)
    expect(incompleteBeta(0.2, 2, 3)).toBeCloseTo(0.1808, 4)
  })

  it('computes correlation p-values', () => {
    // Anscombe I: p = 0.00217
    expect(correlationP(0.8164, 11)).toBeCloseTo(0.00217, 4)
    expect(correlationP(0, 20)).toBeCloseTo(1, 10)
    expect(correlationP(1, 20)).toBe(0)
    expect(correlationP(0.5, 2)).toBeNull()
  })

  it('compares two groups with Welch t', () => {
    const a = [27.5, 21.0, 19.0, 23.6, 17.0, 17.9, 16.9, 20.1, 21.9, 22.6, 23.1, 19.6, 19.0, 21.7, 21.4]
    const b = [27.1, 22.0, 20.8, 23.4, 23.4, 23.5, 25.8, 22.0, 24.8, 20.2, 21.9, 22.1, 22.9, 20.5, 24.4]
    const result = compareGroups(a, b)
    expect(result?.diff).toBeCloseTo(-2.1667, 3)
    expect(result?.p).toBeCloseTo(0.02138, 4)
    expect(result?.cohenD).toBeLessThan(0)
    expect(compareGroups([1], [2, 3])).toMatchObject({ diff: -1.5, p: null })
    expect(compareGroups([], [1])).toBeNull()
  })
})
