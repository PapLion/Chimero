import { beforeEach, describe, expect, it, vi } from 'vitest'
import { replaceEntryTags } from '../../../apps/electron/src/main/features/tags/service'

const mocks = vi.hoisted(() => ({
  getDbMock: vi.fn(),
}))

vi.mock('@packages/db/database', () => ({
  getDb: mocks.getDbMock,
}))

describe('tag service replacement validation', () => {
  beforeEach(() => {
    mocks.getDbMock.mockReset()
  })

  it('rejects unknown tag IDs before deleting existing entry tags', async () => {
    const db = {
      select: vi.fn(() => ({
        from: vi.fn(() => ({
          where: vi.fn(() => [{ id: 7 }]),
        })),
      })),
      delete: vi.fn(() => ({
        where: vi.fn(() => undefined),
      })),
      insert: vi.fn(() => ({
        values: vi.fn(() => undefined),
      })),
    }
    mocks.getDbMock.mockReturnValue(db)

    await expect(replaceEntryTags(101, [7, 999])).rejects.toThrow('Unknown tag IDs: 999')

    expect(db.delete).not.toHaveBeenCalled()
    expect(db.insert).not.toHaveBeenCalled()
  })
})
