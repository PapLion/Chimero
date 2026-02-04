import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { computeCurrentStreak, computeBestStreak } from '../../apps/electron/src/main/services/streak-utils'

describe('streak-utils', () => {
  describe('computeBestStreak', () => {
    it('returns 0 for empty dates', () => {
      expect(computeBestStreak([])).toBe(0)
    })

    it('returns 1 for a single date', () => {
      expect(computeBestStreak(['2025-02-01'])).toBe(1)
    })

    it('counts consecutive dates', () => {
      expect(computeBestStreak(['2025-02-01', '2025-02-02', '2025-02-03'])).toBe(3)
    })

    it('returns longest run when there are gaps', () => {
      const dates = ['2025-01-01', '2025-01-02', '2025-01-05', '2025-01-06', '2025-01-07']
      expect(computeBestStreak(dates)).toBe(3)
    })

    it('handles unsorted input', () => {
      expect(computeBestStreak(['2025-02-03', '2025-02-01', '2025-02-02'])).toBe(3)
    })
  })

  describe('computeCurrentStreak', () => {
    const today = '2025-02-03'

    afterEach(() => {
      vi.useRealTimers()
    })

    it('returns 0 for empty dates', () => {
      expect(computeCurrentStreak([], today)).toBe(0)
    })

    it('returns 0 when today is not in dates', () => {
      expect(computeCurrentStreak(['2025-01-01', '2025-01-02'], today)).toBe(0)
    })

    it('counts consecutive days ending at today', () => {
      const dates = ['2025-02-03', '2025-02-02', '2025-02-01']
      expect(computeCurrentStreak(dates, today)).toBe(3)
    })

    it('stops at a gap', () => {
      const dates = ['2025-02-03', '2025-02-02', '2025-01-30']
      expect(computeCurrentStreak(dates, today)).toBe(2)
    })

    it('uses only dates up to today', () => {
      const dates = ['2025-02-05', '2025-02-04', '2025-02-03', '2025-02-02']
      expect(computeCurrentStreak(dates, today)).toBe(2)
    })
  })
})
