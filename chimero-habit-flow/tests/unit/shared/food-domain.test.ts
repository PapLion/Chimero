import { describe, expect, it } from 'vitest'
import {
  buildFoodDetailReadModel,
  buildFoodHomeWidgetReadModel,
  buildFoodStatisticsReadModel,
  computeFoodFrequency,
  computeStructuredCaloriesTotal,
  normalizeFoodKey,
  normalizeFoodName,
  validateCaloriesOptional,
  validateMealType,
} from '@contracts/domain'
import type { Entry } from '@contracts/contracts'

const entries: Entry[] = [
  {
    id: 1,
    trackerId: 12,
    value: 4,
    note: 'legacy food note',
    metadata: {},
    timestamp: Date.parse('2026-05-18T18:00:00'),
    dateStr: '2026-05-18',
  },
  {
    id: 2,
    trackerId: 12,
    value: null,
    note: 'Chicken Bowl',
    metadata: {},
    timestamp: Date.parse('2026-05-19T08:00:00'),
    dateStr: '2026-05-19',
    food: {
      structured: true,
      foodName: 'Chicken Bowl',
      foodKey: 'chicken bowl',
      calories: 540,
      mealType: 'lunch',
    },
  },
  {
    id: 3,
    trackerId: 12,
    value: null,
    note: 'CHICKEN BOWL',
    metadata: {},
    timestamp: Date.parse('2026-05-19T12:00:00'),
    dateStr: '2026-05-19',
    food: {
      structured: true,
      foodName: 'CHICKEN BOWL',
      foodKey: 'chicken bowl',
      calories: 520,
      mealType: 'lunch',
    },
  },
  {
    id: 4,
    trackerId: 12,
    value: null,
    note: 'Garden Salad',
    metadata: {},
    timestamp: Date.parse('2026-05-20T09:00:00'),
    dateStr: '2026-05-20',
    assetId: 7,
    tagIds: [4],
    food: {
      structured: true,
      foodName: 'Garden Salad',
      foodKey: 'garden salad',
      calories: null,
      mealType: 'dinner',
    },
  },
]

describe('food domain helpers', () => {
  it('normalizes food names and keys and validates structured calories and meal types', () => {
    expect(normalizeFoodName('  Chicken   Bowl ')).toBe('Chicken Bowl')
    expect(normalizeFoodKey('  Chicken   Bowl ')).toBe('chicken bowl')
    expect(validateCaloriesOptional('540')).toBe(540)
    expect(validateCaloriesOptional(null)).toBeNull()
    expect(() => validateCaloriesOptional(0)).toThrow('Calories must be a finite positive number')
    expect(validateMealType(' lunch ')).toBe('lunch')
    expect(() => validateMealType('brunch')).toThrow('Meal type must be breakfast, lunch, dinner, snack, or other')
  })

  it('keeps legacy food rows readable while excluding them from structured totals', () => {
    const detail = buildFoodDetailReadModel(entries)
    const stats = buildFoodStatisticsReadModel(entries)
    const home = buildFoodHomeWidgetReadModel(entries, {
      trackerId: 12,
      title: 'Diet',
      selectedDate: '2026-05-19',
    })

    expect(computeStructuredCaloriesTotal(detail.history)).toBe(1060)
    expect(computeFoodFrequency(detail.history)).toEqual([
      {
        foodName: 'CHICKEN BOWL',
        foodKey: 'chicken bowl',
        entryCount: 2,
        totalCalories: 1060,
      },
      {
        foodName: 'Garden Salad',
        foodKey: 'garden salad',
        entryCount: 1,
        totalCalories: 0,
      },
    ])

    expect(detail.current).toMatchObject({
      entryId: 4,
      structured: true,
      foodName: 'Garden Salad',
      calories: null,
      mealType: 'dinner',
    })
    expect(detail.history.map((entry) => entry.entryId)).toEqual([4, 3, 2, 1])
    expect(detail.history[3]).toMatchObject({
      entryId: 1,
      structured: false,
      legacyText: 'legacy food note',
      legacyValue: 4,
    })
    expect(detail.totalCalories).toBe(1060)
    expect(detail.structuredEntryCount).toBe(3)
    expect(detail.legacyEntryCount).toBe(1)
    expect(detail.chartData).toEqual([
      { date: '2026-05-19', value: 1060, count: 2 },
    ])

    expect(stats).toMatchObject({
      entryCount: 4,
      structuredEntryCount: 3,
      legacyEntryCount: 1,
      totalCalories: 1060,
    })

    expect(home).toMatchObject({
      trackerId: 12,
      title: 'Diet',
      currentFoodName: 'Garden Salad',
      currentCalories: null,
      totalCalories: 1060,
      legacyEntryCount: 1,
    })
    expect(home.selectedDayEntries.map((entry) => entry.entryId)).toEqual([3, 2])
    expect(home.sparkline).toEqual([
      { date: '2026-05-19', value: 1060 },
    ])
  })
})
