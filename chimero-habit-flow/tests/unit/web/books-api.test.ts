import { EventEmitter } from 'node:events'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { handleWebApiRequest } from '../../../apps/web/server/routes/api'

const mocks = vi.hoisted(() => ({
  getWebDbMock: vi.fn(),
}))

vi.mock('../../../apps/web/server/db', () => ({
  getWebDb: mocks.getWebDbMock,
}))

type JsonRecord = Record<string, unknown>

function createWebBooksDb() {
  const trackerRow = {
    id: 9,
    name: 'Books',
    type: 'text',
    icon: 'book',
    color: '#8b5cf6',
    order: 5,
    config: JSON.stringify({ identity: 'books' }),
    archived: 0,
    is_custom: 0,
    is_favorite: 0,
    created_at: null,
  }
  const bookRow = {
    id: 11,
    title: 'Dune',
    title_key: 'dune',
    shelf: 'tbr',
    status: 'planned',
    started_date: null,
    finished_date: null,
    rating_tenths: null,
    created_at: 1_000,
    updated_at: 1_000,
  }
  const state = {
    nextEntryId: 101,
    trackerRow,
    bookRow,
    entries: new Map<number, JsonRecord>(),
    bookActivities: new Map<number, JsonRecord>(),
    entryTags: new Map<number, number[]>(),
    tags: [] as JsonRecord[],
    insertCounts: { entries: 0, bookActivities: 0 },
  }

  function buildBookEntryRow(entryId: number): JsonRecord | undefined {
    const entry = state.entries.get(entryId)
    const activity = state.bookActivities.get(entryId)
    if (!entry || !activity) return undefined
    const book = state.bookRow
    return {
      id: entry.id,
      tracker_id: entry.tracker_id,
      timestamp: entry.timestamp,
      date_str: entry.date_str,
      asset_id: entry.asset_id,
      note: entry.note,
      metadata: entry.metadata,
      book_structured: activity.entry_id,
      book_id: activity.book_id,
      book_title: book.title,
      book_title_key: book.title_key,
      book_activity_type: activity.activity_type,
    }
  }

  function prepare(sql: string) {
    const normalized = sql.replace(/\s+/g, ' ').trim().toLowerCase()
    return {
      get(...params: unknown[]) {
        if (normalized === 'select * from trackers where id = ? limit 1') {
          return Number(params[0]) === state.trackerRow.id ? state.trackerRow : undefined
        }
        if (normalized === 'select * from books where id = ? limit 1' || normalized === 'select * from books where id = ?') {
          return Number(params[0]) === state.bookRow.id ? state.bookRow : undefined
        }
        if (normalized === 'select entry_id as entryid from book_activities where book_id = ? and date_str = ? and activity_type = ? limit 1') {
          const [bookId, dateStr, activityType] = params
          for (const activity of state.bookActivities.values()) {
            if (activity.book_id === Number(bookId) && activity.date_str === String(dateStr) && activity.activity_type === activityType) {
              return { entryId: activity.entry_id }
            }
          }
          return undefined
        }
        if (normalized.startsWith('select e.id, e.tracker_id, e.timestamp, e.date_str, e.asset_id')) {
          return buildBookEntryRow(Number(params[0]))
        }
        if (normalized === 'select * from tags order by name asc') {
          return state.tags
        }
        return undefined
      },
      all(...params: unknown[]) {
        if (normalized === 'select * from tags order by name asc') {
          return state.tags
        }
        if (normalized === 'select * from books order by updated_at desc, created_at desc, id desc') {
          return [state.bookRow]
        }
        if (normalized === 'select entry_id, tag_id from entries_to_tags where entry_id in (?)') {
          const entryId = Number(params[0])
          const tagIds = state.entryTags.get(entryId) ?? []
          return tagIds.map((tagId) => ({ entry_id: entryId, tag_id: tagId }))
        }
        if (normalized === 'select entry_id from book_activities where book_id = ? and date_str = ? and activity_type = ? and entry_id != ? limit 1') {
          const [bookId, dateStr, activityType, entryId] = params
          return Array.from(state.bookActivities.values()).filter((activity) =>
            activity.book_id === Number(bookId)
            && activity.date_str === String(dateStr)
            && activity.activity_type === activityType
            && activity.entry_id !== Number(entryId),
          ).map((activity) => ({ entry_id: activity.entry_id }))
        }
        if (normalized === 'select entry_id as entryid from book_activities where book_id = ? and date_str = ? and activity_type = ? limit 1') {
          const single = this.get(...params)
          return single ? [single] : []
        }
        return []
      },
      run(...params: unknown[]) {
        if (normalized.startsWith('insert into entries ')) {
          state.insertCounts.entries += 1
          const payload = params[0] as JsonRecord
          const entryId = state.nextEntryId++
          state.entries.set(entryId, {
            id: entryId,
            tracker_id: Number(payload.trackerId),
            value: payload.value ?? null,
            note: payload.note ?? null,
            metadata: payload.metadata ?? '{}',
            timestamp: Number(payload.timestamp),
            date_str: String(payload.dateStr),
            asset_id: payload.assetId ?? null,
          })
          return { changes: 1, lastInsertRowid: entryId }
        }
        if (normalized.startsWith('insert into book_activities ')) {
          state.insertCounts.bookActivities += 1
          const [entryId, bookId, activityType, dateStr] = params
          state.bookActivities.set(Number(entryId), {
            entry_id: Number(entryId),
            book_id: Number(bookId),
            activity_type: String(activityType),
            date_str: String(dateStr),
          })
          return { changes: 1, lastInsertRowid: Number(entryId) }
        }
        if (normalized.startsWith('update books set ')) {
          const payload = params[0] as JsonRecord
          if (payload.updatedAt !== undefined) state.bookRow.updated_at = Number(payload.updatedAt)
          if (payload.shelf !== undefined) state.bookRow.shelf = payload.shelf
          if (payload.status !== undefined) state.bookRow.status = payload.status
          if (payload.startedDate !== undefined) state.bookRow.started_date = payload.startedDate
          if (payload.finishedDate !== undefined) state.bookRow.finished_date = payload.finishedDate
          return { changes: 1, lastInsertRowid: 0 }
        }
        if (normalized === 'update entries set timestamp = ? where id = ?') {
          const [timestamp, entryId] = params
          const entry = state.entries.get(Number(entryId))
          if (entry) entry.timestamp = Number(timestamp)
          return { changes: 1, lastInsertRowid: 0 }
        }
        if (normalized === 'update entries set date_str = ? where id = ?') {
          const [dateStr, entryId] = params
          const entry = state.entries.get(Number(entryId))
          if (entry) entry.date_str = String(dateStr)
          return { changes: 1, lastInsertRowid: 0 }
        }
        if (normalized === 'update entries set asset_id = ? where id = ?') {
          const [assetId, entryId] = params
          const entry = state.entries.get(Number(entryId))
          if (entry) entry.asset_id = assetId ?? null
          return { changes: 1, lastInsertRowid: 0 }
        }
        if (normalized === 'update book_activities set date_str = ? where entry_id = ?') {
          const [dateStr, entryId] = params
          const activity = state.bookActivities.get(Number(entryId))
          if (activity) activity.date_str = String(dateStr)
          return { changes: 1, lastInsertRowid: 0 }
        }
        if (normalized === 'delete from entries_to_tags where entry_id = ?') return { changes: 0, lastInsertRowid: 0 }
        if (normalized === 'delete from book_activities where entry_id = ?') {
          state.bookActivities.delete(Number(params[0]))
          return { changes: 1, lastInsertRowid: 0 }
        }
        if (normalized === 'delete from entries where id = ?') {
          state.entries.delete(Number(params[0]))
          return { changes: 1, lastInsertRowid: 0 }
        }
        return { changes: 0, lastInsertRowid: 0 }
      },
    }
  }

  return {
    state,
    prepare,
    transaction<TArgs extends unknown[], TResult>(fn: (...args: TArgs) => TResult) {
      return (...args: TArgs) => fn(...args)
    },
  }
}

function createResponse() {
  let body = ''
  let resolveDone: () => void = () => undefined
  const done = new Promise<void>((resolve) => {
    resolveDone = resolve
  })
  const res = {
    statusCode: 0,
    headers: {} as Record<string, unknown>,
    setHeader(name: string, value: string | number) {
      res.headers[name.toLowerCase()] = value
    },
    end(chunk?: unknown) {
      if (typeof chunk === 'string') body = chunk
      else if (Buffer.isBuffer(chunk)) body = chunk.toString('utf-8')
      else if (chunk != null) body = String(chunk)
      resolveDone()
    },
  } as unknown as import('node:http').ServerResponse & { headers: Record<string, unknown> }
  return { res, done, getBody: () => body, getJson: () => JSON.parse(body) as JsonRecord }
}

async function invokeJson(method: string, url: string, body: unknown) {
  const req = new EventEmitter() as EventEmitter & { method?: string; url?: string }
  req.method = method
  req.url = url

  const response = createResponse()
  const requestPromise = handleWebApiRequest(req as unknown as import('node:http').IncomingMessage, response.res)
  queueMicrotask(() => {
    if (body !== undefined) {
      req.emit('data', Buffer.from(JSON.stringify(body)))
    }
    req.emit('end')
  })
  await Promise.all([requestPromise, response.done])
  return { statusCode: response.res.statusCode, json: response.getJson() as JsonRecord }
}

describe('web books api', () => {
  beforeEach(() => {
    mocks.getWebDbMock.mockReset()
  })

  it('returns an existing same-day read activity on the web path instead of creating a duplicate', async () => {
    const db = createWebBooksDb()
    mocks.getWebDbMock.mockResolvedValue(db)

    const payload = {
      trackerId: 9,
      bookId: 11,
      timestamp: Date.UTC(2026, 4, 19, 8, 0, 0),
    }

    const first = await invokeJson('POST', '/api/books/read', payload)
    const second = await invokeJson('POST', '/api/books/read', payload)

    expect(first.statusCode).toBe(200)
    expect(second.statusCode).toBe(200)
    expect(first.json.entry.entryId).toBe(101)
    expect(second.json.entry.entryId).toBe(101)
    expect(db.state.insertCounts.entries).toBe(1)
    expect(db.state.insertCounts.bookActivities).toBe(1)
    expect(db.state.bookActivities.size).toBe(1)
  })

  it('returns a book record for the renderer book read contract', async () => {
    const db = createWebBooksDb()
    mocks.getWebDbMock.mockResolvedValue(db)

    const response = await invokeJson('GET', '/api/books/11', undefined)

    expect(response.statusCode).toBe(200)
    expect(response.json).toMatchObject({
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
    const db = createWebBooksDb()
    mocks.getWebDbMock.mockResolvedValue(db)

    const response = await invokeJson('GET', '/api/books', undefined)

    expect(response.statusCode).toBe(200)
    expect(response.json).toEqual([
      expect.objectContaining({
        id: 11,
        title: 'Dune',
        shelf: 'tbr',
        status: 'planned',
      }),
    ])
    expect(db.state.bookActivities.size).toBe(0)
  })
})
