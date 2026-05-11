import { describe, expect, it } from 'vitest'
import {
  buildWeightEntriesTabReadModel,
  buildWeightHomeWidgetReadModel,
  buildWeightStatisticsReadModel,
} from '@contracts/domain'
import type { WeightDetailResponse, WeightEntry } from '@contracts/contracts'

const history: WeightEntry[] = [
  {
    entryId: 1,
    trackerId: 10,
    weight: 50,
    weightUnit: 'kg',
    waist: 30,
    waistUnit: 'cm',
    bodyFatPercentage: null,
    note: 'pre workout',
    timestamp: Date.parse('2026-05-10T07:30:00'),
    dateStr: '2026-05-10',
    assetId: 20,
    tagIds: [3],
  },
  {
    entryId: 2,
    trackerId: 10,
    weight: 51,
    weightUnit: 'kg',
    waist: null,
    waistUnit: null,
    bodyFatPercentage: null,
    note: null,
    timestamp: Date.parse('2026-05-09T07:30:00'),
    dateStr: '2026-05-09',
    assetId: null,
    tagIds: [],
  },
]

const detail: WeightDetailResponse = {
  current: history[0],
  history,
  chartData: [
    { date: '2026-05-09', weight: 51, waist: null },
    { date: '2026-05-10', weight: 50, waist: 30 },
  ],
  deltaPrevious: -1,
  deltaWeek: null,
  weeklyAvg: 50.5,
  activeGoal: null,
  distanceToGoal: null,
  goalAchieved: null,
  streakDays: 2,
}

describe('weight surface read models', () => {
  it('keeps exact logged fields for the Entries tab', () => {
    const readModel = buildWeightEntriesTabReadModel(detail)

    expect(readModel.entries[0]).toMatchObject({
      entryId: 1,
      trackerId: 10,
      weight: 50,
      weightUnit: 'kg',
      waist: 30,
      waistUnit: 'cm',
      note: 'pre workout',
      timestamp: Date.parse('2026-05-10T07:30:00'),
      dateStr: '2026-05-10',
      assetId: 20,
      tagIds: [3],
    })
  })

  it('keeps specialized chart data and conditional waist stats for statistics', () => {
    const readModel = buildWeightStatisticsReadModel(detail)

    expect(readModel.chartData).toEqual(detail.chartData)
    expect(readModel.weeklyAvg).toBe(50.5)
    expect(readModel.deltaPrevious).toBe(-1)
    expect(readModel.waistStats).toMatchObject({
      latest: 30,
      unit: 'cm',
    })
  })

  it('builds a compact home widget model with optional secondary waist', () => {
    const readModel = buildWeightHomeWidgetReadModel(detail, {
      trackerId: 10,
      title: 'Weight',
      fallbackUnit: 'kg',
    })

    expect(readModel).toMatchObject({
      trackerId: 10,
      title: 'Weight',
      currentWeight: 50,
      weightUnit: 'kg',
      deltaPrevious: -1,
      trend: 'down',
      secondaryWaist: {
        value: 30,
        unit: 'cm',
      },
    })
    expect(readModel.sparkline).toEqual([
      { date: '2026-05-09', value: 51 },
      { date: '2026-05-10', value: 50 },
    ])
  })
})
