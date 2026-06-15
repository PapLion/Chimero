import { mkdtempSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { contactInteractions, contacts, entries, tags, trackers } from '@packages/db'
import { closeDb, getDb } from '@packages/db/database'
import { registerContactHandlers } from '../../../apps/electron/src/main/features/contacts/handler'
import { registerEntryHandlers } from '../../../apps/electron/src/main/features/entry/handler'
import { setupDatabase } from '../../../apps/electron/src/main/database'

const mocks = vi.hoisted(() => ({
  handleMock: vi.fn(),
  appGetPathMock: vi.fn(),
}))

vi.mock('electron', () => ({
  app: {
    getPath: mocks.appGetPathMock,
  },
  ipcMain: {
    handle: mocks.handleMock,
  },
}))

type IpcHandler = (_event: unknown, ...args: unknown[]) => Promise<unknown>

function getHandler(channel: string): IpcHandler {
  const match = mocks.handleMock.mock.calls.find(([registeredChannel]) => registeredChannel === channel)
  if (!match) throw new Error(`Missing IPC handler: ${channel}`)
  return match[1] as IpcHandler
}

function createTempUserDataDir(): string {
  return mkdtempSync(join(tmpdir(), 'chimero-social-contract-'))
}

function getSocialTrackerId(): number {
  const socialTracker = getDb()
    .select()
    .from(trackers)
    .all()
    .find((tracker) => tracker.name === 'Social')

  if (!socialTracker) throw new Error('Missing seeded Social tracker')
  return Number((socialTracker as { id: number }).id)
}

async function bootstrapFreshDatabase(): Promise<void> {
  closeDb()
  mocks.handleMock.mockReset()
  mocks.appGetPathMock.mockReset()
  mocks.appGetPathMock.mockReturnValue(createTempUserDataDir())
  setupDatabase()
  registerEntryHandlers()
  registerContactHandlers()
}

describe('social interaction contract lifecycle', () => {
  beforeEach(async () => {
    await bootstrapFreshDatabase()
  })

  it('creates, reads, updates, reopens, and deletes a structured Social entry without touching legacy rows', async () => {
    const socialTrackerId = getSocialTrackerId()
    const createContact = getHandler('create-contact')
    const addEntry = getHandler('add-entry')
    const updateEntry = getHandler('update-entry')
    const deleteEntry = getHandler('delete-entry')
    const getEntries = getHandler('get-entries')
    const getContactInteractions = getHandler('get-contact-interactions')

    const jack = await createContact(null, { name: 'Jack' }) as { id: number; name: string }
    const annabelle = await createContact(null, { name: 'Annabelle' }) as { id: number; name: string }

    const legacyTimestamp = Date.UTC(2026, 5, 9, 9, 0)
    getDb()
      .insert(contactInteractions)
      .values({
        contactId: jack.id,
        entryId: null,
        mood: 'neutral',
        moodImpact: 'neutral',
        method: 'text',
        timestamp: legacyTimestamp,
        notes: 'legacy touch',
      })
      .run()

    const createdTimestamp = Date.UTC(2026, 5, 10, 10, 30)
    const created = await addEntry(null, {
      trackerId: socialTrackerId,
      value: 1,
      note: 'context note',
      metadata: { source: 'test' },
      timestamp: createdTimestamp,
      tagIds: [],
      socialInteractions: [
        { contactId: jack.id, method: 'text', moodImpact: 'positive', notes: 'hello Jack' },
        { contactId: annabelle.id, method: 'text', moodImpact: 'neutral', notes: 'hello Annabelle' },
      ],
    }) as { id: number; socialInteractions?: Array<{ contactId: number; contactName?: string | null; method?: string | null; moodImpact: 'positive' | 'neutral' | 'negative'; note?: string | null }> } | null

    expect(created).not.toBeNull()
    expect(created?.socialInteractions).toHaveLength(2)
    expect(created?.socialInteractions?.every((interaction) => interaction.method === 'text')).toBe(true)
    expect(created?.socialInteractions?.every((interaction) => interaction.moodImpact !== undefined)).toBe(true)

    const entriesAfterCreate = getDb().select().from(entries).all()
    expect(entriesAfterCreate).toHaveLength(1)

    const linkedRowsAfterCreate = getDb()
      .select()
      .from(contactInteractions)
      .all()
      .filter((row) => row.entryId === created!.id)

    expect(linkedRowsAfterCreate).toHaveLength(2)
    expect(linkedRowsAfterCreate.every((row) => row.entryId === created!.id)).toBe(true)

    const jackAfterCreate = getDb().select().from(contacts).all().find((row) => row.id === jack.id) as { lastTalkedAt: number | null; dateLastTalked: string | null }
    const annabelleAfterCreate = getDb().select().from(contacts).all().find((row) => row.id === annabelle.id) as { lastTalkedAt: number | null; dateLastTalked: string | null }
    expect(jackAfterCreate.lastTalkedAt).toBe(createdTimestamp)
    expect(annabelleAfterCreate.lastTalkedAt).toBe(createdTimestamp)

    const structuredRead = await getEntries(null, { trackerId: socialTrackerId }) as Array<{ id: number; note?: string | null; socialInteractions?: Array<{ contactId: number; contactName?: string | null; method?: string | null; moodImpact: string; note?: string | null }> }>
    expect(structuredRead).toHaveLength(1)
    expect(structuredRead[0].note).toBe('context note')
    expect(structuredRead[0].socialInteractions).toHaveLength(2)
    expect(structuredRead[0].socialInteractions?.map((interaction) => interaction.contactName)).toEqual(['Jack', 'Annabelle'])

    const updatedTimestamp = Date.UTC(2026, 5, 12, 16, 45)
    const updated = await updateEntry(null, created!.id, {
      note: 'updated context',
      timestamp: updatedTimestamp,
      socialInteractions: [
        { contactId: jack.id, method: 'call', moodImpact: 'negative', notes: 'follow-up' },
      ],
    }) as { id: number; note?: string | null; socialInteractions?: Array<{ contactId: number; method?: string | null; moodImpact: 'positive' | 'neutral' | 'negative'; note?: string | null }> } | null

    expect(updated).not.toBeNull()
    expect(updated?.note).toBe('updated context')
    expect(updated?.socialInteractions).toHaveLength(1)
    expect(updated?.socialInteractions?.[0].contactId).toBe(jack.id)
    expect(updated?.socialInteractions?.[0].method).toBe('call')
    expect(updated?.socialInteractions?.[0].moodImpact).toBe('negative')

    const linkedRowsAfterUpdate = getDb()
      .select()
      .from(contactInteractions)
      .all()
      .filter((row) => row.entryId === created!.id)
    expect(linkedRowsAfterUpdate).toHaveLength(1)
    expect(linkedRowsAfterUpdate[0].contactId).toBe(jack.id)

    const jackAfterUpdate = getDb().select().from(contacts).all().find((row) => row.id === jack.id) as { lastTalkedAt: number | null; dateLastTalked: string | null }
    const annabelleAfterUpdate = getDb().select().from(contacts).all().find((row) => row.id === annabelle.id) as { lastTalkedAt: number | null; dateLastTalked: string | null }
    expect(jackAfterUpdate.lastTalkedAt).toBe(updatedTimestamp)
    expect(annabelleAfterUpdate.lastTalkedAt).toBeNull()

    const reopened = await getEntries(null, { trackerId: socialTrackerId }) as Array<{ id: number; note?: string | null; socialInteractions?: Array<{ contactId: number; method?: string | null; moodImpact: string }> }>
    expect(reopened).toHaveLength(1)
    expect(reopened[0].note).toBe('updated context')
    expect(reopened[0].socialInteractions).toHaveLength(1)
    expect(reopened[0].socialInteractions?.[0].method).toBe('call')
    expect(reopened[0].socialInteractions?.[0].moodImpact).toBe('negative')

    const deleted = await deleteEntry(null, created!.id)
    expect(deleted).toBe(true)

    expect(getDb().select().from(entries).all().some((row) => row.id === created!.id)).toBe(false)
    expect(getDb().select().from(contactInteractions).all().filter((row) => row.entryId === created!.id)).toHaveLength(0)

    const jackAfterDeleteInteractions = await getContactInteractions(null, jack.id) as Array<{ entryId?: number | null; timestamp: number }>
    const annabelleAfterDeleteInteractions = await getContactInteractions(null, annabelle.id) as Array<{ entryId?: number | null }>
    expect(jackAfterDeleteInteractions).toHaveLength(1)
    expect(jackAfterDeleteInteractions[0].entryId).toBeNull()
    expect(jackAfterDeleteInteractions[0].timestamp).toBe(legacyTimestamp)
    expect(annabelleAfterDeleteInteractions).toHaveLength(0)

    const jackAfterDelete = getDb().select().from(contacts).all().find((row) => row.id === jack.id) as { lastTalkedAt: number | null; dateLastTalked: string | null }
    const annabelleAfterDelete = getDb().select().from(contacts).all().find((row) => row.id === annabelle.id) as { lastTalkedAt: number | null; dateLastTalked: string | null }
    expect(jackAfterDelete.lastTalkedAt).toBe(legacyTimestamp)
    expect(jackAfterDelete.dateLastTalked).toBe('2026-06-09')
    expect(annabelleAfterDelete.lastTalkedAt).toBeNull()
  })

  it('rejects invalid Social methods when creating a structured entry', async () => {
    const socialTrackerId = getSocialTrackerId()
    const createContact = getHandler('create-contact')
    const addEntry = getHandler('add-entry')

    const jack = await createContact(null, { name: 'Jack' }) as { id: number }

    const result = await addEntry(null, {
      trackerId: socialTrackerId,
      value: 1,
      note: 'invalid method',
      timestamp: Date.UTC(2026, 5, 10, 10, 30),
      socialInteractions: [
        { contactId: jack.id, method: 'fax', moodImpact: 'positive', notes: 'bad method' },
      ],
    })

    expect(result).toBeNull()
    expect(getDb().select().from(entries).all()).toHaveLength(0)
    expect(getDb().select().from(contactInteractions).all()).toHaveLength(0)
  })

  it('rejects invalid mood impacts when creating a structured entry', async () => {
    const socialTrackerId = getSocialTrackerId()
    const createContact = getHandler('create-contact')
    const addEntry = getHandler('add-entry')

    const jack = await createContact(null, { name: 'Jack' }) as { id: number }

    const result = await addEntry(null, {
      trackerId: socialTrackerId,
      value: 1,
      note: 'invalid mood',
      timestamp: Date.UTC(2026, 5, 10, 10, 30),
      socialInteractions: [
        { contactId: jack.id, method: 'text', moodImpact: 'ecstatic', notes: 'bad mood' },
      ],
    })

    expect(result).toBeNull()
    expect(getDb().select().from(entries).all()).toHaveLength(0)
    expect(getDb().select().from(contactInteractions).all()).toHaveLength(0)
  })

  it('rejects mood-only structured writes when moodImpact is missing', async () => {
    const socialTrackerId = getSocialTrackerId()
    const createContact = getHandler('create-contact')
    const addEntry = getHandler('add-entry')

    const jack = await createContact(null, { name: 'Jack' }) as { id: number }

    const result = await addEntry(null, {
      trackerId: socialTrackerId,
      value: 1,
      note: 'legacy mood fallback should not drive writes',
      timestamp: Date.UTC(2026, 5, 10, 10, 30),
      socialInteractions: [
        { contactId: jack.id, method: 'text', mood: 'positive', notes: 'compatibility-only mood' },
      ],
    })

    expect(result).toBeNull()
    expect(getDb().select().from(entries).all()).toHaveLength(0)
    expect(getDb().select().from(contactInteractions).all()).toHaveLength(0)
  })

  it('rejects invalid contact interaction values on the direct contact interaction path', async () => {
    const createContact = getHandler('create-contact')
    const createContactInteraction = getHandler('create-contact-interaction')
    const socialTrackerId = getSocialTrackerId()

    const jack = await createContact(null, { name: 'Jack' }) as { id: number }
    const [baseEntry] = await getDb()
      .insert(entries)
      .values({
        trackerId: socialTrackerId,
        value: 1,
        note: 'direct path entry',
        metadata: '{}',
        timestamp: Date.UTC(2026, 5, 10, 10, 30),
        dateStr: '2026-06-10',
        assetId: null,
      })
      .returning()

    const invalidMethod = await createContactInteraction(null, {
      contactId: jack.id,
      entryId: baseEntry.id,
      method: 'carrier-pigeon',
      moodImpact: 'positive',
      notes: 'bad method',
    })
    expect(invalidMethod).toBeNull()

    const invalidMood = await createContactInteraction(null, {
      contactId: jack.id,
      entryId: baseEntry.id,
      method: 'text',
      moodImpact: 'thrilled',
      notes: 'bad mood',
    })
    expect(invalidMood).toBeNull()
    expect(getDb().select().from(contactInteractions).all()).toHaveLength(0)
  })

  it('can still read legacy mood values when moodImpact is missing', async () => {
    const createContact = getHandler('create-contact')
    const getContactInteractions = getHandler('get-contact-interactions')

    const jack = await createContact(null, { name: 'Jack' }) as { id: number }

    getDb()
      .insert(contactInteractions)
      .values({
        contactId: jack.id,
        entryId: null,
        mood: 'positive',
        moodImpact: null,
        method: 'text',
        timestamp: Date.UTC(2026, 5, 9, 9, 0),
        notes: 'legacy mood fallback',
      })
      .run()

    const rows = await getContactInteractions(null, jack.id) as Array<{ entryId?: number | null; moodImpact: string; mood?: string | null }>
    expect(rows).toHaveLength(1)
    expect(rows[0].entryId).toBeNull()
    expect(rows[0].moodImpact).toBe('positive')
  })

  it('rolls back a structured entry update when tag replacement fails', async () => {
    const socialTrackerId = getSocialTrackerId()
    const createContact = getHandler('create-contact')
    const addEntry = getHandler('add-entry')
    const updateEntry = getHandler('update-entry')

    const jack = await createContact(null, { name: 'Jack' }) as { id: number }
    const [tag] = await getDb()
      .insert(tags)
      .values({ name: 'Social test tag', color: null })
      .returning()

    const created = await addEntry(null, {
      trackerId: socialTrackerId,
      value: 1,
      note: 'rollback target',
      timestamp: Date.UTC(2026, 5, 10, 10, 30),
      tagIds: [tag.id],
      socialInteractions: [
        { contactId: jack.id, method: 'text', moodImpact: 'positive', notes: 'before rollback' },
      ],
    }) as { id: number } | null

    expect(created).not.toBeNull()

    const result = await updateEntry(null, created!.id, {
      note: 'should not stick',
      socialInteractions: [
        { contactId: jack.id, method: 'call', moodImpact: 'negative', notes: 'attempted update' },
      ],
      tagIds: [999999],
    })

    expect(result).toBeNull()

    const storedEntry = getDb().select().from(entries).all().find((row) => row.id === created!.id) as { note: string | null }
    const storedInteractions = getDb().select().from(contactInteractions).all().filter((row) => row.entryId === created!.id)
    expect(storedEntry.note).toBe('rollback target')
    expect(storedInteractions).toHaveLength(1)
    expect(storedInteractions[0].method).toBe('text')
    expect(storedInteractions[0].moodImpact).toBe('positive')
  })

  it('rejects direct structured contact interactions without an entryId', async () => {
    const createContact = getHandler('create-contact')
    const createContactInteraction = getHandler('create-contact-interaction')

    const jack = await createContact(null, { name: 'Jack' }) as { id: number }
    const result = await createContactInteraction(null, {
      contactId: jack.id,
      entryId: null,
      method: 'text',
      moodImpact: 'neutral',
      notes: 'missing entry',
    })

    expect(result).toBeNull()
    expect(getDb().select().from(contactInteractions).all()).toHaveLength(0)
  })
})
