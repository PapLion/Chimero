import { beforeEach, describe, expect, it, vi } from 'vitest'
import { contactInteractions, contacts, entries, entryFood, entryGaming, entryHealth, entryIntake, entryWeight, intakeItems, symptoms, trackers } from '@packages/db'
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
  query.where = vi.fn(() => query)
  query.orderBy = vi.fn(() => rows)
  query.limit = vi.fn(() => query)
  query.all = vi.fn(() => rows)
  return query
}

describe('calendar service social read model', () => {
  beforeEach(() => {
    mocks.getDbMock.mockReset()
    mocks.getEntryTagIdsMock.mockReset()
    mocks.getEntryTagIdsMock.mockResolvedValue(new Map([[42, [3, 8]]]))
  })

  it('aggregates structured Social contacts without duplicating the base entry', async () => {
    const selectMock = vi.fn((projection?: Record<string, unknown>) => ({
      from: vi.fn((table: unknown) => {
        if (table === entries) {
          return createQuery([
            {
              id: 42,
              trackerId: 4,
              value: 1,
              note: 'Planning the weekend',
              metadata: '{}',
              timestamp: Date.UTC(2026, 5, 15, 18, 30, 0),
              dateStr: '2026-06-15',
              assetId: 77,
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
          ])
        }
        if (table === contactInteractions) {
          return createQuery([
            {
              entryId: 42,
              contactId: 11,
              contactName: 'Jack Robert',
              contactInitials: 'JR',
              contactAvatarAssetId: 91,
              method: 'call',
              moodImpact: 'positive',
              timestamp: Date.UTC(2026, 5, 15, 18, 30, 0),
              notes: 'Planning the weekend',
            },
            {
              entryId: 42,
              contactId: 12,
              contactName: 'Annabelle',
              contactInitials: 'A',
              contactAvatarAssetId: null,
              method: 'call',
              moodImpact: 'neutral',
              timestamp: Date.UTC(2026, 5, 15, 18, 30, 0),
              notes: 'Planning the weekend',
            },
          ])
        }
        return createQuery([])
      }),
    }))

    const db = { select: selectMock }
    mocks.getDbMock.mockReturnValue(db)

    const result = await getCalendarMonth(2026, 5)

    const dayEntry = result.entriesByDate['2026-06-15'][0]
    expect(result.entriesByDate['2026-06-15']).toHaveLength(1)
    expect(dayEntry).toMatchObject({
      id: 42,
      trackerId: 4,
      note: 'Planning the weekend',
      timestamp: Date.UTC(2026, 5, 15, 18, 30, 0),
      dateStr: '2026-06-15',
      assetId: 77,
      tagIds: [3, 8],
    })
    expect(dayEntry.social).toMatchObject({
      entryId: 42,
      trackerId: 4,
      timestamp: Date.UTC(2026, 5, 15, 18, 30, 0),
      dateStr: '2026-06-15',
      method: 'call',
      note: 'Planning the weekend',
      tagIds: [3, 8],
      assetId: 77,
      structured: true,
    })
    expect(dayEntry.social && dayEntry.social.structured ? dayEntry.social.contacts : []).toEqual([
      {
        contactId: 11,
        name: 'Jack Robert',
        initials: 'JR',
        avatarAssetId: 91,
        moodImpact: 'positive',
      },
      {
        contactId: 12,
        name: 'Annabelle',
        initials: 'AN',
        avatarAssetId: null,
        moodImpact: 'neutral',
      },
    ])
  })
})
