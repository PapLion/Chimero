import { beforeEach, describe, expect, it, vi } from 'vitest'
import { entries, entryGaming, entryWeight, entryFood, entryHealth, entryIntake, intakeItems, symptoms, trackers } from '@packages/db'
import { getCalendarMonth } from '../../../apps/electron/src/main/features/calendar/service'

const mocks = vi.hoisted(() => ({
  getDbMock: vi.fn(),
  getEntryTagIdsMock: vi.fn(),
}))

vi.mock('@packages/db/database', () => ({
  getDb: mocks.getDbMock,
}))

vi.mock('../../../apps/electron/src/main/features/tags/service', () => ({
  getEntryTagIds: mocks.getEntryTagIdsMock,
}))

type QueryRows = Array<Record<string, unknown>>

function createQuery(rows: QueryRows) {
  const query: Record<string, unknown> = {}
  query.leftJoin = vi.fn(() => query)
  query.orderBy = vi.fn(() => rows)
  return query
}

describe('calendar service', () => {
  beforeEach(() => {
    mocks.getDbMock.mockReset()
    mocks.getEntryTagIdsMock.mockReset()
    mocks.getEntryTagIdsMock.mockResolvedValue(new Map())
  })

  it('joins gaming entries when building the month calendar', async () => {
    const selectMock = vi.fn(() => ({
      from: vi.fn(() =>
        createQuery([
          {
            id: 42,
            trackerId: 7,
            value: 1,
            note: 'text check-in',
            metadata: '{}',
            timestamp: Date.UTC(2026, 5, 11, 14, 30),
            dateStr: '2026-06-11',
            assetId: null,
            gamingStructured: null,
            gameTitle: null,
            gameKey: null,
            estimatedHours: null,
            foodStructured: null,
            foodName: null,
            foodKey: null,
            calories: null,
            mealType: null,
            healthStructured: null,
            symptomId: null,
            symptomName: null,
            symptomKey: null,
            category: null,
            severity: null,
            intakeStructured: null,
            itemId: null,
            itemName: null,
            itemKey: null,
            itemType: null,
            variant: null,
            dosage: null,
            unit: null,
            trackerName: 'Social',
            trackerType: 'numeric',
            trackerIcon: 'users',
            weightValue: null,
            weightUnit: null,
            waistValue: null,
            waistUnit: null,
          },
        ]),
      ),
    }))

    const db = {
      select: selectMock,
    }
    mocks.getDbMock.mockReturnValue(db)

    const result = await getCalendarMonth(2026, 5)

    const query = selectMock.mock.results[0]?.value.from.mock.results[0]?.value
    expect(query.leftJoin).toHaveBeenCalledWith(entryWeight, expect.anything())
    expect(query.leftJoin).toHaveBeenCalledWith(entryGaming, expect.anything())
    expect(query.leftJoin).toHaveBeenCalledWith(entryFood, expect.anything())
    expect(query.leftJoin).toHaveBeenCalledWith(entryHealth, expect.anything())
    expect(query.leftJoin).toHaveBeenCalledWith(entryIntake, expect.anything())
    expect(result.entriesByDate['2026-06-11']).toBeDefined()
  })
})
