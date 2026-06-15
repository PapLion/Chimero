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

function createWebEntriesDb() {
  const trackerRow = {
    id: 4,
    name: 'Social',
    type: 'numeric',
    icon: 'users',
    color: '#3b82f6',
    order: 3,
    config: JSON.stringify({ identity: 'social', unit: 'interactions' }),
    archived: 0,
    is_custom: 0,
    is_favorite: 0,
    created_at: null,
  }
  const contacts = new Map<number, JsonRecord>([
    [2, { id: 2, name: 'Jack', date_last_talked: null, last_talked_at: null }],
    [3, { id: 3, name: 'Annabelle', date_last_talked: null, last_talked_at: null }],
  ])
  const state = {
    trackerRow,
    nextEntryId: 101,
    nextInteractionId: 501,
    entries: new Map<number, JsonRecord>(),
    contactInteractions: new Map<number, JsonRecord[]>(),
    entryTags: new Map<number, number[]>(),
    contacts,
    transactionCalls: 0,
    insertCounts: { entries: 0, contactInteractions: 0 },
  }

  function getLatestContactTimestamp(contactId: number): number | null {
    const rows = state.contactInteractions.get(contactId) ?? []
    if (rows.length === 0) return null
    return Math.max(...rows.map((row) => Number(row.timestamp ?? NaN)).filter((value) => Number.isFinite(value)))
  }

  function prepare(sql: string) {
    const normalized = sql.replace(/\s+/g, ' ').trim().toLowerCase()
    return {
      get(...params: unknown[]) {
        if (normalized === 'select * from trackers where id = ? limit 1') {
          return Number(params[0]) === state.trackerRow.id ? state.trackerRow : undefined
        }
        if (normalized === 'select * from entries where id = ?') {
          return state.entries.get(Number(params[0]))
        }
        if (normalized === 'select * from contacts where id = ?') {
          return state.contacts.get(Number(params[0]))
        }
        return undefined
      },
      all(...params: unknown[]) {
        if (normalized === 'select entry_id, tag_id from entries_to_tags where entry_id in (?)') {
          return state.entryTags.get(Number(params[0]))?.map((tagId) => ({ entry_id: Number(params[0]), tag_id: tagId })) ?? []
        }
        if (normalized === 'select timestamp from contact_interactions where contact_id = ? order by timestamp desc limit 1') {
          const timestamp = getLatestContactTimestamp(Number(params[0]))
          return timestamp == null ? [] : [{ timestamp }]
        }
        if (normalized === 'select * from contact_interactions where entry_id = ? order by id asc') {
          const entryId = Number(params[0])
          return Array.from(state.contactInteractions.values()).flat().filter((row) => Number(row.entry_id) === entryId)
        }
        return []
      },
      run(...params: unknown[]) {
        if (normalized === 'insert into entries (tracker_id, value, note, metadata, asset_id, timestamp, date_str) values (@trackerid, @value, @note, @metadata, @assetid, @timestamp, @datestr)') {
          const row = {
            id: state.nextEntryId++,
            tracker_id: Number((params[0] as JsonRecord)?.trackerId ?? (params[0] as JsonRecord)?.tracker_id ?? params[0]),
            value: (params[0] as JsonRecord)?.value ?? null,
            note: (params[0] as JsonRecord)?.note ?? null,
            metadata: (params[0] as JsonRecord)?.metadata ?? '{}',
            asset_id: (params[0] as JsonRecord)?.assetId ?? null,
            timestamp: (params[0] as JsonRecord)?.timestamp ?? null,
            date_str: (params[0] as JsonRecord)?.dateStr ?? null,
          }
          state.entries.set(row.id, row)
          state.insertCounts.entries += 1
          return { changes: 1, lastInsertRowid: row.id }
        }
        if (normalized === 'insert into contact_interactions (contact_id, entry_id, mood, mood_impact, method, timestamp, notes) values (?, ?, ?, ?, ?, ?, ?)') {
          const [contactId, entryId, mood, moodImpact, method, timestamp, notes] = params
          const row = {
            id: state.nextInteractionId++,
            contact_id: Number(contactId),
            entry_id: Number(entryId),
            mood,
            mood_impact: moodImpact,
            method,
            timestamp: Number(timestamp),
            notes: notes ?? null,
          }
          const list = state.contactInteractions.get(row.contact_id) ?? []
          list.push(row)
          state.contactInteractions.set(row.contact_id, list)
          state.insertCounts.contactInteractions += 1
          return { changes: 1, lastInsertRowid: row.id }
        }
        if (normalized === 'update contacts set date_last_talked = ?, last_talked_at = ? where id = ?') {
          const [dateLastTalked, lastTalkedAt, contactId] = params
          const contact = state.contacts.get(Number(contactId))
          if (contact) {
            contact.date_last_talked = dateLastTalked ?? null
            contact.last_talked_at = lastTalkedAt ?? null
          }
          return { changes: 1, lastInsertRowid: 0 }
        }
        return { changes: 0, lastInsertRowid: 0 }
      },
    }
  }

  return {
    state,
    prepare,
    transaction(fn: (...args: unknown[]) => unknown) {
      return (...args: unknown[]) => {
        state.transactionCalls += 1
        return fn(...args)
      }
    },
    persist() {},
  }
}

function createResponse() {
  let body = ''
  let resolveDone: () => void = () => {}
  const done = new Promise<void>((resolve) => {
    resolveDone = resolve
  })
  const res = {
    statusCode: 200,
    setHeader() {},
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

describe('web entries api', () => {
  beforeEach(() => {
    mocks.getWebDbMock.mockReset()
  })

  it('persists structured Social interactions when saving the visible Quick Entry payload', async () => {
    const db = createWebEntriesDb()
    mocks.getWebDbMock.mockResolvedValue(db)

    const timestamp = Date.UTC(2026, 5, 15, 18, 30, 0)
    const response = await invokeJson('POST', '/api/entries', {
      trackerId: 4,
      value: null,
      note: 'Planning the weekend',
      metadata: {},
      timestamp,
      assetId: null,
      socialInteractions: [
        { contactId: 2, method: 'call', moodImpact: 'positive', notes: 'Planning the weekend' },
        { contactId: 3, method: 'call', moodImpact: 'neutral', notes: 'Planning the weekend' },
      ],
    })

    expect(response.statusCode).toBe(200)
    expect(response.json).toMatchObject({
      id: 101,
      trackerId: 4,
      note: 'Planning the weekend',
      timestamp,
      socialInteractions: [
        { contactId: 2, method: 'call', moodImpact: 'positive', notes: 'Planning the weekend' },
        { contactId: 3, method: 'call', moodImpact: 'neutral', notes: 'Planning the weekend' },
      ],
    })
    expect(db.state.transactionCalls).toBe(1)
    expect(db.state.insertCounts.entries).toBe(1)
    expect(db.state.insertCounts.contactInteractions).toBe(2)
    expect(db.state.entries.get(101)).toMatchObject({
      tracker_id: 4,
      note: 'Planning the weekend',
      timestamp,
    })
    expect(db.state.contactInteractions.get(2)?.[0]).toMatchObject({
      entry_id: 101,
      mood_impact: 'positive',
      method: 'call',
      timestamp,
    })
    expect(db.state.contactInteractions.get(3)?.[0]).toMatchObject({
      entry_id: 101,
      mood_impact: 'neutral',
      method: 'call',
      timestamp,
    })
    expect(db.state.contacts.get(2)).toMatchObject({
      date_last_talked: '2026-06-15',
      last_talked_at: timestamp,
    })
    expect(db.state.contacts.get(3)).toMatchObject({
      date_last_talked: '2026-06-15',
      last_talked_at: timestamp,
    })
  })
})
