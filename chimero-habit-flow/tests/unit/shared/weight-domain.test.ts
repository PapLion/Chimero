import { describe, expect, it } from 'vitest'
import { calculateWeightDetail } from '@contracts/domain'
import type { TrackerGoal, WeightEntry } from '@contracts/contracts'

const history: WeightEntry[] = [
  {
    entryId: 10,
    trackerId: 1,
    weight: 82.2,
    weightUnit: 'kg',
    waist: null,
    waistUnit: null,
    bodyFatPercentage: null,
    note: null,
    timestamp: Date.parse('2026-04-30T08:00:00'),
    dateStr: '2026-04-30',
  },
  {
    entryId: 11,
    trackerId: 1,
    weight: 81.4,
    weightUnit: 'kg',
    waist: 92,
    waistUnit: 'cm',
    bodyFatPercentage: null,
    note: 'morning',
    timestamp: Date.parse('2026-05-06T08:00:00'),
    dateStr: '2026-05-06',
  },
  {
    entryId: 12,
    trackerId: 1,
    weight: 81.1,
    weightUnit: 'kg',
    waist: 91,
    waistUnit: 'cm',
    bodyFatPercentage: 18.5,
    note: 'morning',
    timestamp: Date.parse('2026-05-07T08:00:00'),
    dateStr: '2026-05-07',
  },
]

const goal: TrackerGoal = {
  id: 1,
  trackerId: 1,
  goalType: 'target',
  targetValue: 80,
  unit: 'kg',
  direction: 'decrease',
  startDate: '2026-04-01',
  targetDate: null,
  active: true,
  createdAt: 1,
  updatedAt: 1,
}

describe('shared weight domain', () => {
  it('calculates honest deltas, weekly average, goal distance, and streak', () => {
    const detail = calculateWeightDetail(history, goal, '2026-05-07')

    expect(detail.current?.weight).toBe(81.1)
    expect(detail.deltaPrevious).toBeCloseTo(-0.3)
    expect(detail.deltaWeek).toBeCloseTo(-1.1)
    expect(detail.weeklyAvg).toBeCloseTo(81.57, 2)
    expect(detail.distanceToGoal).toBeCloseTo(1.1)
    expect(detail.goalAchieved).toBe(false)
    expect(detail.streakDays).toBe(2)
    expect(detail.history.map((entry) => entry.entryId)).toEqual([12, 11, 10])
  })

  it('returns null metrics when there is not enough data', () => {
    const detail = calculateWeightDetail([], null, '2026-05-07')

    expect(detail.current).toBeNull()
    expect(detail.deltaPrevious).toBeNull()
    expect(detail.deltaWeek).toBeNull()
    expect(detail.weeklyAvg).toBeNull()
    expect(detail.distanceToGoal).toBeNull()
    expect(detail.goalAchieved).toBeNull()
    expect(detail.streakDays).toBe(0)
    expect(detail.history).toEqual([])
  })
})
