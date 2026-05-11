import { beforeEach, describe, expect, it, vi } from 'vitest'
import { registerEntryHandlers } from '../../../apps/electron/src/main/features/entry/handler'
import { addWeightEntry, deleteWeightEntry, updateWeightEntry } from '../../../apps/electron/src/main/features/weight/service'

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

  const db = {
    transaction: vi.fn(async (callback: (tx: unknown) => unknown) => callback(tx)),
    insert: vi.fn(() => ({
      values: vi.fn((values: Record<string, unknown>) => ({
        returning: vi.fn(() => [{ ...entryRow, ...values, id: entryRow.id }]),
      })),
    })),
    update: vi.fn(() => ({
      set: vi.fn(() => ({
        where: vi.fn(() => undefined),
      })),
    })),
    delete: vi.fn(() => ({
      where: vi.fn(() => undefined),
    })),
    select: vi.fn(() => ({
      from: vi.fn(() => ({
        innerJoin: vi.fn(() => ({
          where: vi.fn(() => [weightRow]),
        })),
        where: vi.fn(() => [entryRow]),
        orderBy: vi.fn(() => ({
          limit: vi.fn(() => [entryRow]),
        })),
        limit: vi.fn(() => [entryRow]),
      })),
    })),
  }
  const tx = {
    insert: db.insert,
    update: db.update,
    delete: db.delete,
    select: db.select,
  }

  return { db, tx }
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
