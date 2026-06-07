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

function createWebFoodDb() {
  const trackerRow = {
    id: 12,
    name: 'Diet',
    type: 'numeric',
    icon: 'salad',
    color: '#22c55e',
    order: 1,
    config: JSON.stringify({ identity: 'diet' }),
    archived: 0,
    is_custom: 0,
    is_favorite: 0,
    created_at: null,
  }
  const state = {
    trackerRow,
    tags: [{ id: 4, name: 'Lunch', color: '#f59e0b' }] as JsonRecord[],
    entries: [
      {
        id: 201,
        tracker_id: 12,
        value: null,
        note: 'Chicken Bowl',
        metadata: {},
        timestamp: Date.parse('2026-05-19T08:00:00'),
        date_str: '2026-05-19',
        asset_id: null,
        food_structured: 201,
        food_name: 'Chicken Bowl',
        food_key: 'chicken bowl',
        calories: 540,
        meal_type: 'lunch',
      },
      {
        id: 202,
        tracker_id: 12,
        value: 2,
        note: 'legacy food note',
        metadata: {},
        timestamp: Date.parse('2026-05-18T18:00:00'),
        date_str: '2026-05-18',
        asset_id: null,
      },
    ] as JsonRecord[],
    entryTags: new Map<number, number[]>([[201, [4]]]),
  }

  function prepare(sql: string) {
    const normalized = sql.replace(/\s+/g, ' ').trim().toLowerCase()
    return {
      get(...params: unknown[]) {
        if (normalized === 'select * from trackers where id = ? limit 1') {
          return Number(params[0]) === state.trackerRow.id ? state.trackerRow : undefined
        }
        return undefined
      },
      all(...params: unknown[]) {
        if (normalized === 'select * from tags order by name asc') {
          return state.tags
        }
        if (normalized.startsWith('select e.*,')) {
          return state.entries
        }
        if (normalized.startsWith('select entry_id, tag_id from entries_to_tags where entry_id in')) {
          const ids = params.map((value) => Number(value))
          return ids.flatMap((entryId) => (state.entryTags.get(entryId) ?? []).map((tagId) => ({
            entry_id: entryId,
            tag_id: tagId,
          })))
        }
        return []
      },
      run() {
        return { changes: 0, lastInsertRowid: 0 }
      },
    }
  }

  return {
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
  return { res, done, getJson: () => JSON.parse(body) as JsonRecord }
}

async function invokeJson(method: string, url: string) {
  const req = new EventEmitter() as EventEmitter & { method?: string; url?: string }
  req.method = method
  req.url = url

  const response = createResponse()
  const requestPromise = handleWebApiRequest(req as unknown as import('node:http').IncomingMessage, response.res)
  queueMicrotask(() => {
    req.emit('end')
  })
  await Promise.all([requestPromise, response.done])
  return { statusCode: response.res.statusCode, json: response.getJson() as JsonRecord }
}

describe('web food api', () => {
  beforeEach(() => {
    mocks.getWebDbMock.mockReset()
  })

  it('returns structured and legacy food history in the detail endpoint', async () => {
    mocks.getWebDbMock.mockResolvedValue(createWebFoodDb())

    const response = await invokeJson('GET', '/api/food/trackers/12/detail')

    expect(response.statusCode).toBe(200)
    expect(response.json).toMatchObject({
      current: {
        foodName: 'Chicken Bowl',
        foodKey: 'chicken bowl',
        calories: 540,
        mealType: 'lunch',
        structured: true,
      },
      totalCalories: 540,
      structuredEntryCount: 1,
      legacyEntryCount: 1,
    })
    expect(response.json.history).toHaveLength(2)
    expect(response.json.history[1]).toMatchObject({
      structured: false,
      legacyText: 'legacy food note',
      legacyValue: 2,
    })
    expect(response.json.tagFrequency).toEqual([
      { tagId: 4, tagName: 'Lunch', entryCount: 1 },
    ])
  })
})
