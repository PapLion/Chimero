import { beforeEach, describe, expect, it, vi } from 'vitest'
import { entries, entriesToTags, entryGaming } from '@packages/db'
import { addGamingEntry, deleteGamingEntryData, updateGamingEntry } from '../../../apps/electron/src/main/features/gaming/service'

const mocks = vi.hoisted(() => ({
  getDbMock: vi.fn(),
  replaceEntryTagsMock: vi.fn(),
  getEntryTagIdsMock: vi.fn(),
  getTagsMock: vi.fn(),
  getTrackerIdentityMock: vi.fn(),
}))

vi.mock('@packages/db/database', () => ({
  getDb: mocks.getDbMock,
}))

vi.mock('../../../apps/electron/src/main/features/tags/service', () => ({
  replaceEntryTags: mocks.replaceEntryTagsMock,
  getEntryTagIds: mocks.getEntryTagIdsMock,
  getTags: mocks.getTagsMock,
}))

vi.mock('@contracts/features/tracking', () => ({
  getTrackerIdentity: mocks.getTrackerIdentityMock,
}))

type QueryRows = unknown[]

function createQueryChain(rows: QueryRows) {
  const query: Record<string, unknown> = {}
  query.where = vi.fn(() => query)
  query.leftJoin = vi.fn(() => query)
  query.orderBy = vi.fn(() => query)
  query.limit = vi.fn(() => rows)
  return query
}

function createGamingDb(selectRows: QueryRows[]) {
  const updateSetMock = vi.fn(() => ({
    where: vi.fn(() => undefined),
  }))
  const deleteWhereMock = vi.fn(() => undefined)
  const tx = {
    insert: vi.fn((table: unknown) => ({
      values: vi.fn(() => {
        if (table === entries) {
          return {
            returning: vi.fn(() => [{ id: 101 }]),
          }
        }
        return undefined
      }),
    })),
    update: vi.fn(() => ({
      set: updateSetMock,
    })),
    delete: vi.fn(() => ({
      where: deleteWhereMock,
    })),
    select: vi.fn(() => {
      const rows = selectRows.shift() ?? []
      return {
        from: vi.fn(() => createQueryChain(rows)),
      }
    }),
  }
  const db = {
    transaction: vi.fn(async (callback: (value: typeof tx) => unknown) => callback(tx)),
    insert: tx.insert,
    update: tx.update,
    delete: tx.delete,
    select: tx.select,
  }

  return { db, tx, updateSetMock, deleteWhereMock }
}

describe('gaming persistence service', () => {
  beforeEach(() => {
    mocks.getDbMock.mockReset()
    mocks.replaceEntryTagsMock.mockReset()
    mocks.getEntryTagIdsMock.mockReset()
    mocks.getTagsMock.mockReset()
    mocks.getTrackerIdentityMock.mockReset()
    mocks.replaceEntryTagsMock.mockResolvedValue(undefined)
    mocks.getEntryTagIdsMock.mockResolvedValue(new Map([[101, [7]]]))
    mocks.getTagsMock.mockResolvedValue([{ id: 7, name: 'Pro', color: null }])
    mocks.getTrackerIdentityMock.mockReturnValue('gaming')
  })

  it('creates a structured gaming entry transactionally and preserves tags', async () => {
    const trackerRow = {
      id: 9,
      name: 'Gaming',
      type: 'numeric',
      icon: 'gamepad-2',
      color: null,
      order: 1,
      config: '{}',
      archived: 0,
      is_custom: 0,
      is_favorite: 0,
      created_at: null,
    }
    const structuredRow = {
      id: 101,
      trackerId: 9,
      value: null,
      note: 'Valorant',
      metadata: JSON.stringify({ trackerKind: 'gaming' }),
      timestamp: Date.parse('2026-05-19T08:00:00'),
      dateStr: '2026-05-19',
      assetId: 12,
      gamingStructured: 101,
      gameTitle: 'Valorant',
      gameKey: 'valorant',
      estimatedHours: 2.5,
    }
    const { db, tx } = createGamingDb([[trackerRow], [structuredRow]])
    mocks.getDbMock.mockReturnValue(db)

    const result = await addGamingEntry({
      trackerId: 9,
      gameTitle: '  Valorant  ',
      estimatedHours: 2.5,
      assetId: 12,
      tagIds: [7],
      timestamp: Date.parse('2026-05-19T08:00:00'),
    })

    expect(db.transaction).toHaveBeenCalledTimes(1)
    expect(mocks.replaceEntryTagsMock).toHaveBeenCalledWith(101, [7], tx)
    expect(result).toMatchObject({
      entry: {
        entryId: 101,
        structured: true,
        gameTitle: 'Valorant',
        gameKey: 'valorant',
        estimatedHours: 2.5,
      },
      tags: [{ id: 7, name: 'Pro', color: null }],
    })
    expect(db.insert).toHaveBeenCalledWith(entries)
  })

  it('updates structured gaming rows without falling back to generic entry writes', async () => {
    const existingRow = {
      trackerId: 9,
      gamingStructured: 101,
    }
    const trackerRow = {
      id: 9,
      name: 'Gaming',
      type: 'numeric',
      icon: 'gamepad-2',
      color: null,
      order: 1,
      config: '{}',
      archived: 0,
      is_custom: 0,
      is_favorite: 0,
      created_at: null,
    }
    const updatedRow = {
      id: 101,
      trackerId: 9,
      value: null,
      note: 'Minecraft',
      metadata: JSON.stringify({ trackerKind: 'gaming' }),
      timestamp: Date.parse('2026-05-20T10:00:00'),
      dateStr: '2026-05-20',
      assetId: 12,
      gamingStructured: 101,
      gameTitle: 'Minecraft',
      gameKey: 'minecraft',
      estimatedHours: 3,
    }
    const { db, updateSetMock } = createGamingDb([[existingRow], [trackerRow], [updatedRow]])
    mocks.getDbMock.mockReturnValue(db)

    const result = await updateGamingEntry(101, {
      gameTitle: ' Minecraft ',
      estimatedHours: 3,
      timestamp: Date.parse('2026-05-20T10:00:00'),
      assetId: 12,
      tagIds: [7],
    })

    expect(db.transaction).toHaveBeenCalledTimes(1)
    expect(mocks.replaceEntryTagsMock).toHaveBeenCalledWith(101, [7], expect.any(Object))
    expect(db.update).toHaveBeenCalledTimes(2)
    expect(db.update.mock.calls[0]?.[0]).toBe(entries)
    expect(db.update.mock.calls[1]?.[0]).toBe(entryGaming)
    expect(updateSetMock).toHaveBeenNthCalledWith(1, {
      note: 'Minecraft',
      assetId: 12,
      timestamp: Date.parse('2026-05-20T10:00:00'),
      dateStr: '2026-05-20',
    })
    expect(updateSetMock).toHaveBeenNthCalledWith(2, {
      gameTitle: 'Minecraft',
      gameKey: 'minecraft',
      estimatedHours: 3,
    })
    expect(result).toMatchObject({
      entry: {
        entryId: 101,
        gameTitle: 'Minecraft',
        gameKey: 'minecraft',
        estimatedHours: 3,
      },
    })
  })

  it('removes gaming extension rows before deleting the base entry', async () => {
    const { db } = createGamingDb([])
    mocks.getDbMock.mockReturnValue(db)

    await deleteGamingEntryData(101)

    expect(db.transaction).toHaveBeenCalledTimes(1)
    expect(db.delete).toHaveBeenCalledTimes(3)
    expect(db.delete.mock.calls.map(([table]) => table)).toEqual([entriesToTags, entryGaming, entries])
  })
})
