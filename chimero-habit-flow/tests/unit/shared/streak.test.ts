import { describe, expect, it } from 'vitest'
import { computeBestStreak, computeCurrentStreak } from '@contracts/domain'

describe('shared streak domain', () => {
  it('computes the current streak from the most recent consecutive days', () => {
    const dates = ['2026-04-27', '2026-04-26', '2026-04-24']
    expect(computeCurrentStreak(dates, '2026-04-27')).toBe(2)
  })

  it('computes the best streak across separated runs', () => {
    const dates = ['2026-04-24', '2026-04-25', '2026-04-27', '2026-04-28']
    expect(computeBestStreak(dates)).toBe(2)
  })
})
