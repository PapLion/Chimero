import { beforeEach, describe, expect, it, vi } from 'vitest'
import { registerEntryHandlers } from '../../../apps/electron/src/main/features/entry/handler'
import { addWeightEntry, deleteWeightEntry, updateWeightEntry } from '../../../apps/electron/src/main/features/weight/service'
import { trackers } from '@packages/db'

const mocks = vi.hoisted(() => ({
  handleMock: vi.fn(),
  getDbMock: vi.fn(),
  replaceEntryTagsMock: vi.fn(),
  getEntryTagIdsMock: vi.fn(),
  getTagsMock: vi.fn(),
}))

vi.mock('electron', () => ({
  ipcMain: {
    handle: mocks.handleMock,
  },
}))

vi.mock('@packages/db/database', () => ({
  getDb: mocks.getDbMock,
}))

vi.mock('../../../apps/electron/src/main/features/tags/service', () => ({
  replaceEntryTags: mocks.replaceEntryTagsMock,
  getEntryTagIds: mocks.getEntryTagIdsMock,
  getTags: mocks.getTagsMock,
}))

type IpcHandler = (_event: unknown, ...args: unknown[]) => Promise<unknown>

function createQueryDb() {
  const entryRow = {
    id: 101,
    trackerId: 1,
    value: 80,
    note: null,
    metadata: {},
    timestamp: Date.UTC(2026, 0, 1),
    dateStr: '2026-01-01',
    assetId: null,
  }
  const trackerRow = {
    id: 1,
    name: 'Weight',
    type: 'numeric',
    icon: 'scale',
    color: null,
    order: 1,
    config: '{}',
    archived: 0,
    is_custom: 0,
    is_favorite: 0,
    created_at: null,
  }
  const weightRow = {
    entryId: 101,
    trackerId: 1,
    note: null,
    timestamp: Date.UTC(2026, 0, 1),
    dateStr: '2026-01-01',
    assetId: null,
    weightValue: 80,
    weightUnit: 'kg',
    waistValue: null,
    waistUnit: null,
    bodyFatPercentage: null,
  }

  function createResultQuery(rows: unknown[], options?: { innerJoinRows?: unknown[]; leftJoinRows?: unknown[] }) {
    const state = { rows }
    const query: Record<string, unknown> = {}
    query.where = vi.fn(() => query)
    query.leftJoin = vi.fn(() => {
      state.rows = options?.leftJoinRows ?? state.rows
      return query
    })
    query.innerJoin = vi.fn(() => {
      state.rows = options?.innerJoinRows ?? state.rows
      return query
    })
    query.orderBy = vi.fn(() => query)
    query.limit = vi.fn(() => state.rows)
    query[Symbol.iterator] = function* () {
      yield* state.rows as unknown[]
    }
    return query
  }

  const updateSetMock = vi.fn(() => ({
    where: vi.fn(() => undefined),
  }))
  const db = {
    transaction: vi.fn(async (callback: (tx: unknown) => unknown) => callback(tx)),
    insert: vi.fn(() => ({
      values: vi.fn((values: Record<string, unknown>) => ({
        returning: vi.fn(() => [{ ...entryRow, ...values, id: entryRow.id }]),
      })),
    })),
    update: vi.fn(() => ({
      set: updateSetMock,
    })),
    delete: vi.fn(() => ({
      where: vi.fn(() => undefined),
    })),
    select: vi.fn(() => ({
      from: vi.fn((table: unknown) => {
        if (table === trackers) {
          return createResultQuery([trackerRow])
        }
        return createResultQuery([entryRow], {
          leftJoinRows: [entryRow],
          innerJoinRows: [weightRow],
        })
      }),
    })),
  }
  const tx = {
    insert: db.insert,
    update: db.update,
    delete: db.delete,
    select: db.select,
  }

  return { db, tx, updateSetMock }
}

function getRegisteredHandler(channel: string): IpcHandler {
  const match = mocks.handleMock.mock.calls.find(([registeredChannel]) => registeredChannel === channel)
  if (!match) throw new Error(`Missing IPC handler: ${channel}`)
  return match[1] as IpcHandler
}

describe('entry and weight tag mutations', () => {
  beforeEach(() => {
    mocks.handleMock.mockReset()
    mocks.replaceEntryTagsMock.mockReset()
    mocks.replaceEntryTagsMock.mockResolvedValue(undefined)
    mocks.getEntryTagIdsMock.mockReset()
    mocks.getEntryTagIdsMock.mockResolvedValue(new Map([[101, [7]]]))
    mocks.getTagsMock.mockReset()
    mocks.getTagsMock.mockResolvedValue([{ id: 7, name: 'Morning', color: null }])
  })

  it('uses one transaction for add-entry and its tag replacement', async () => {
    const { db, tx } = createQueryDb()
    mocks.getDbMock.mockReturnValue(db)
    registerEntryHandlers()

    const addEntry = getRegisteredHandler('add-entry')
    await addEntry(null, {
      trackerId: 1,
      value: 1,
      note: 'transactional',
      metadata: {},
      timestamp: Date.UTC(2026, 0, 1),
      tagIds: [7],
    })

    expect(db.transaction).toHaveBeenCalledTimes(1)
    expect(mocks.replaceEntryTagsMock).toHaveBeenCalledWith(101, [7], tx)
  })

  it('uses one transaction for update-entry and its tag replacement', async () => {
    const { db, tx } = createQueryDb()
    mocks.getDbMock.mockReturnValue(db)
    registerEntryHandlers()

    const updateEntry = getRegisteredHandler('update-entry')
    await updateEntry(null, 101, { value: 2, tagIds: [7] })

    expect(db.transaction).toHaveBeenCalledTimes(1)
    expect(mocks.replaceEntryTagsMock).toHaveBeenCalledWith(101, [7], tx)
  })

  it('updates entry metadata through the generic update-entry path without requiring tag changes', async () => {
    const { db, updateSetMock } = createQueryDb()
    mocks.getDbMock.mockReturnValue(db)
    registerEntryHandlers()

    const updateEntry = getRegisteredHandler('update-entry')
    await updateEntry(null, 101, {
      metadata: {
        activeDate: '2026-05-19',
        postponements: [{ fromDate: '2026-05-18', toDate: '2026-05-19', timestamp: 1_777_000 }],
      },
    })

    expect(updateSetMock).toHaveBeenCalledWith({
      metadata: JSON.stringify({
        activeDate: '2026-05-19',
        postponements: [{ fromDate: '2026-05-18', toDate: '2026-05-19', timestamp: 1_777_000 }],
      }),
    })
    expect(mocks.replaceEntryTagsMock).toHaveBeenCalledWith(101, undefined, expect.anything())
  })

  it('uses one transaction for delete-entry cleanup', async () => {
    const { db } = createQueryDb()
    mocks.getDbMock.mockReturnValue(db)
    registerEntryHandlers()

    const deleteEntry = getRegisteredHandler('delete-entry')
    await deleteEntry(null, 101)

    expect(db.transaction).toHaveBeenCalledTimes(1)
  })

  it('uses one transaction for add-weight-entry and its tag replacement', async () => {
    const { db, tx } = createQueryDb()
    mocks.getDbMock.mockReturnValue(db)

    await addWeightEntry({
      trackerId: 1,
      weight: 80,
      weightUnit: 'kg',
      timestamp: Date.UTC(2026, 0, 1),
      tagIds: [7],
    })

    expect(db.transaction).toHaveBeenCalledTimes(1)
    expect(mocks.replaceEntryTagsMock).toHaveBeenCalledWith(101, [7], tx)
  })

  it('uses one transaction for update-weight-entry and its tag replacement', async () => {
    const { db, tx } = createQueryDb()
    mocks.getDbMock.mockReturnValue(db)

    await updateWeightEntry(101, { weight: 82, tagIds: [7] })

    expect(db.transaction).toHaveBeenCalledTimes(1)
    expect(mocks.replaceEntryTagsMock).toHaveBeenCalledWith(101, [7], tx)
  })

  it('uses one transaction for delete-weight-entry cleanup', async () => {
    const { db } = createQueryDb()
    mocks.getDbMock.mockReturnValue(db)

    await deleteWeightEntry(101)

    expect(db.transaction).toHaveBeenCalledTimes(1)
  })
})
