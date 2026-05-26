import { beforeEach, describe, expect, it, vi } from 'vitest'
import { books, bookActivities, entries, trackers } from '@packages/db'
import { createBook, getBook, getBooks, readBook } from '../../../apps/electron/src/main/features/books/service'

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

function createBooksDb() {
  const trackerRow = {
    id: 9,
    name: 'Books',
    type: 'text',
    icon: 'book-open',
    color: null,
    order: 1,
    config: '{}',
    archived: 0,
    is_custom: 0,
    is_favorite: 0,
    created_at: null,
  }
  const bookRow = {
    id: 11,
    title: 'Dune',
    titleKey: 'dune',
    shelf: 'tbr',
    status: 'planned',
    startedDate: null,
    finishedDate: null,
    ratingTenths: null,
    createdAt: Date.UTC(2026, 4, 19),
    updatedAt: Date.UTC(2026, 4, 19),
  }
  const state = {
    nextEntryId: 101,
    nextBookId: 12,
    entries: new Map<number, Record<string, unknown>>(),
    readActivities: new Map<string, { entryId: number; bookId: number; dateStr: string; activityType: string }>(),
    bookRow,
    books: [bookRow],
  }

  function buildEntryProjectionRow(entryId: number) {
    const entry = state.entries.get(entryId)
    if (!entry) return []
    const activity = state.readActivities.get(`${state.bookRow.id}:${entry.dateStr}`) ?? {
      entryId,
      bookId: state.bookRow.id,
      dateStr: entry.dateStr,
      activityType: 'read',
    }
    return [{
      id: entry.id,
      trackerId: entry.trackerId,
      value: entry.value,
      note: entry.note,
      metadata: entry.metadata,
      timestamp: entry.timestamp,
      dateStr: entry.dateStr,
      assetId: entry.assetId,
      bookStructured: activity.entryId,
      bookId: activity.bookId,
      bookTitle: state.bookRow.title,
      bookTitleKey: state.bookRow.titleKey,
      bookActivityType: activity.activityType,
    }]
  }

  function createQuery(projection?: unknown) {
    let kind: 'tracker' | 'book' | 'bookActivities' | 'entryProjection' | 'unknown' = projection ? 'entryProjection' : 'unknown'
    const resolveRows = () => {
      if (kind === 'tracker') return [trackerRow]
      if (kind === 'book') return state.books
      if (kind === 'bookActivities') return Array.from(state.readActivities.values())
      if (kind === 'entryProjection') return buildEntryProjectionRow(101)
      return []
    }
    const query: Record<string, unknown> = {}
    query.where = vi.fn(() => query)
    query.leftJoin = vi.fn(() => query)
    query.orderBy = vi.fn(() => query)
    query.limit = vi.fn(() => {
      return resolveRows()
    })
    query.then = vi.fn((resolve: (value: unknown) => unknown) => Promise.resolve(resolve(resolveRows())))
    query.from = vi.fn((table: unknown) => {
      if (table === trackers) kind = 'tracker'
      else if (table === books) kind = 'book'
      else if (table === bookActivities) kind = 'bookActivities'
      else if (table === entries) kind = 'entryProjection'
      return query
    })
    return query
  }

  const tx = {
    select: vi.fn((projection?: unknown) => createQuery(projection)),
    insert: vi.fn((table: unknown) => {
      if (table === entries) {
        return {
          values: vi.fn((values: Record<string, unknown>) => ({
            returning: vi.fn(() => {
              const row = { ...values, id: state.nextEntryId++ }
              state.entries.set(row.id as number, row)
              return [row]
            }),
          })),
        }
      }
      if (table === books) {
        return {
          values: vi.fn((values: Record<string, unknown>) => ({
            returning: vi.fn(() => {
              const row = { ...values, id: state.nextBookId++ }
              state.books.unshift(row as typeof bookRow)
              state.bookRow = row as typeof bookRow
              return [row]
            }),
          })),
        }
      }
      if (table === bookActivities) {
        return {
          values: vi.fn((values: Record<string, unknown>) => {
            state.readActivities.set(`${values.bookId}:${values.dateStr}`, {
              entryId: Number(values.entryId),
              bookId: Number(values.bookId),
              dateStr: String(values.dateStr),
              activityType: String(values.activityType),
            })
          }),
        }
      }
      return {
        values: vi.fn(() => undefined),
      }
    }),
    update: vi.fn((table: unknown) => ({
      set: vi.fn((values: Record<string, unknown>) => ({
        where: vi.fn(() => {
          if (table === books) {
            Object.assign(state.bookRow, values)
          }
          return undefined
        }),
      })),
    })),
    delete: vi.fn(() => ({
      where: vi.fn(() => undefined),
    })),
  }

  const db = {
    transaction: vi.fn(async (callback: (value: typeof tx) => unknown) => callback(tx)),
    select: vi.fn((projection?: unknown) => createQuery(projection)),
    insert: tx.insert,
    update: tx.update,
    delete: tx.delete,
  }

  return { db, tx, state }
}

describe('books persistence service', () => {
  beforeEach(() => {
    mocks.getDbMock.mockReset()
    mocks.replaceEntryTagsMock.mockReset()
    mocks.getEntryTagIdsMock.mockReset()
    mocks.getTagsMock.mockReset()
    mocks.getTrackerIdentityMock.mockReset()

    mocks.replaceEntryTagsMock.mockResolvedValue(undefined)
    mocks.getEntryTagIdsMock.mockResolvedValue(new Map([[101, [7]]]))
    mocks.getTagsMock.mockResolvedValue([{ id: 7, name: 'Sci-fi', color: null }])
    mocks.getTrackerIdentityMock.mockReturnValue('books')
  })

  it('returns an existing same-day read activity instead of inserting a duplicate', async () => {
    const { db, tx, state } = createBooksDb()
    mocks.getDbMock.mockReturnValue(db)

    const payload = {
      trackerId: 9,
      bookId: 11,
      timestamp: Date.UTC(2026, 4, 19, 8, 0, 0),
      tagIds: [7],
    }

    const first = await readBook(payload)
    const second = await readBook(payload)

    expect(first).toMatchObject({
      entry: {
        entryId: 101,
        structured: true,
        activityType: 'read',
        bookId: 11,
      },
    })
    expect(second).toMatchObject({
      entry: {
        entryId: 101,
        structured: true,
        activityType: 'read',
        bookId: 11,
      },
    })
    expect(db.transaction).toHaveBeenCalledTimes(2)
    expect(tx.insert).toHaveBeenCalledTimes(2)
    expect(mocks.replaceEntryTagsMock).toHaveBeenCalledTimes(1)
    expect(state.readActivities.size).toBe(1)
  })

  it('returns a book record for the renderer book read contract', async () => {
    const { db } = createBooksDb()
    mocks.getDbMock.mockReturnValue(db)

    await expect(getBook(11)).resolves.toMatchObject({
      book: {
        id: 11,
        title: 'Dune',
        titleKey: 'dune',
        shelf: 'tbr',
        status: 'planned',
        startedDate: null,
        finishedDate: null,
        ratingTenths: null,
      },
    })
  })

  it('returns structured books for the visible shelf surface without inventing activities', async () => {
    const { db, state } = createBooksDb()
    state.bookRow.shelf = 'tbr'
    state.bookRow.status = 'planned'
    mocks.getDbMock.mockReturnValue(db)

    await expect(getBooks()).resolves.toEqual([
      expect.objectContaining({
        id: 11,
        title: 'Dune',
        shelf: 'tbr',
        status: 'planned',
      }),
    ])
    expect(state.readActivities.size).toBe(0)
  })

  it('persists a want-to-read book entity without creating a reading activity', async () => {
    const { db, state } = createBooksDb()
    mocks.getDbMock.mockReturnValue(db)

    const response = await createBook({
      title: 'Want to Read smoke',
      shelf: 'tbr',
      status: 'planned',
    })

    expect(response).toMatchObject({
      book: {
        title: 'Want to Read smoke',
        shelf: 'tbr',
        status: 'planned',
      },
    })
    expect(state.books.some((book) => book.title === 'Want to Read smoke')).toBe(true)
    expect(state.readActivities.size).toBe(0)
  })
})
