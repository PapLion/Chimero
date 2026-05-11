import { describe, expect, it } from 'vitest'
import { buildCalendarDayEntry } from '@contracts/domain'

describe('calendar weight day read model', () => {
  it('keeps Weight-specific selected-day fields when enrichment is available', () => {
    const entry = buildCalendarDayEntry({
      id: 10,
      trackerId: 1,
      value: 50,
      note: 'pre workout',
      timestamp: Date.parse('2026-05-10T07:30:00'),
      dateStr: '2026-05-10',
      assetId: 9,
      weight: {
        weight: 50,
        weightUnit: 'kg',
        waist: 30,
        waistUnit: 'cm',
      },
      tagIds: [4, 5],
    })

    expect(entry).toMatchObject({
      id: 10,
      trackerId: 1,
      value: 50,
      unit: 'kg',
      waist: 30,
      waistUnit: 'cm',
      note: 'pre workout',
      timestamp: Date.parse('2026-05-10T07:30:00'),
      dateStr: '2026-05-10',
      assetId: 9,
      tagIds: [4, 5],
    })
  })
})
