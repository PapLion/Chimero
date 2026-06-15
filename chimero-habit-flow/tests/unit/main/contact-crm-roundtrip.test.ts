import { mkdtempSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest'
import { assets, contactInteractions, contacts, trackers } from '@packages/db'
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

const FIXED_NOW = Date.UTC(2026, 5, 14, 12, 0, 0)

function getHandler(channel: string): IpcHandler {
  const match = mocks.handleMock.mock.calls.find(([registeredChannel]) => registeredChannel === channel)
  if (!match) throw new Error(`Missing IPC handler: ${channel}`)
  return match[1] as IpcHandler
}

function createTempUserDataDir(): string {
  return mkdtempSync(join(tmpdir(), 'chimero-contact-crm-'))
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

function createAvatarFixture() {
  getDb()
    .insert(assets)
    .values({
      filename: 'jack-avatar.png',
      originalName: 'jack-avatar.png',
      path: 'avatars/jack-avatar.png',
      type: 'image',
      mimeType: 'image/png',
      size: 1024,
      thumbnailPath: 'avatars/thumbs/jack-avatar.png',
    })
    .run()

  const row = getDb().select().from(assets).all().at(-1)
  if (!row) throw new Error('Failed to create avatar fixture')
  return Number((row as { id: number }).id)
}

describe('contact CRM round trip', () => {
  beforeEach(async () => {
    await bootstrapFreshDatabase()
    vi.spyOn(Date, 'now').mockReturnValue(FIXED_NOW)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('creates, reads, updates, reopens, and preserves the canonical contact profile contract', async () => {
    const createContact = getHandler('create-contact')
    const updateContact = getHandler('update-contact')
    const getContact = getHandler('get-contact')
    const getContacts = getHandler('get-contacts')

    const avatarAssetId = createAvatarFixture()

    const created = await createContact(null, {
      name: '  Jack Robert  ',
      birthday: '1990-06-15',
      dateMet: '2019-02-01',
      likes: ['sports', 'gaming'],
      dislikes: ['fish'],
      traits: ['funny', 'shy'],
      notes: 'Met at a conference',
      hasKids: false,
      kidsNotes: '',
      avatarAssetId,
    }) as Record<string, unknown> | null

    expect(created).not.toBeNull()
    expect(created?.name).toBe('Jack Robert')
    expect(created?.initials).toBe('JR')
    expect(created?.age).toBe(35)
    expect(created?.daysSinceLastTalked).toBeNull()
    expect(created?.lastTalkedAt).toBeNull()
    expect(created?.updatedAt).toBe(FIXED_NOW)

    const storedContact = getDb().select().from(contacts).all().find((row) => row.id === created?.id) as {
      name: string
      likes: string | null
      dislikes: string | null
      traits: string | null
      notes: string | null
      avatarAssetId: number | null
      updatedAt: number | null
      lastTalkedAt: number | null
    }

    expect(storedContact.name).toBe('Jack Robert')
    expect(storedContact.likes).toBe(JSON.stringify(['sports', 'gaming']))
    expect(storedContact.dislikes).toBe(JSON.stringify(['fish']))
    expect(storedContact.traits).toBe(JSON.stringify(['funny', 'shy']))
    expect(storedContact.notes).toBe('Met at a conference')
    expect(storedContact.avatarAssetId).toBe(avatarAssetId)
    expect(storedContact.lastTalkedAt).toBeNull()
    expect(storedContact.updatedAt).toBe(FIXED_NOW)

    const fetched = await getContact(null, Number(created?.id)) as Record<string, unknown> | null
    expect(fetched?.id).toBe(created?.id)
    expect(fetched?.name).toBe('Jack Robert')
    expect(fetched?.initials).toBe('JR')
    expect(fetched?.age).toBe(35)
    expect(fetched?.daysSinceLastTalked).toBeNull()

    const contactsByName = await getContacts(null, { sortBy: 'name' }) as Array<Record<string, unknown>>
    expect(contactsByName).toHaveLength(1)
    expect(contactsByName[0].id).toBe(created?.id)
    expect(contactsByName[0].age).toBe(35)
    expect(contactsByName[0].updatedAt).toBe(FIXED_NOW)

    const updated = await updateContact(null, Number(created?.id), {
      name: 'Jack R. Robert',
      birthday: '1989-06-15',
      dateMet: '2019-02-01',
      likes: ['coffee'],
      dislikes: [],
      traits: ['curious', 'kind'],
      notes: 'Updated note',
      hasKids: true,
      kidsNotes: 'Two kids',
      avatarAssetId: null,
      dateLastTalked: '2026-06-14',
      lastTalkedAt: Date.UTC(2026, 5, 14, 0, 0, 0),
    }) as Record<string, unknown> | null

    expect(updated).not.toBeNull()
    expect(updated?.id).toBe(created?.id)
    expect(updated?.name).toBe('Jack R. Robert')
    expect(updated?.initials).toBe('JR')
    expect(updated?.age).toBe(36)
    expect(updated?.avatarAssetId).toBeNull()
    expect(updated?.lastTalkedAt).toBe(Date.UTC(2026, 5, 14, 0, 0, 0))
    expect(updated?.daysSinceLastTalked).toBe(0)

    const reopened = await getContact(null, Number(created?.id)) as Record<string, unknown> | null
    expect(reopened?.name).toBe('Jack R. Robert')
    expect(reopened?.birthday).toBe('1989-06-15')
    expect(reopened?.likes).toEqual(['coffee'])
    expect(reopened?.dislikes).toEqual([])
    expect(reopened?.traits).toEqual(['curious', 'kind'])
    expect(reopened?.notes).toBe('Updated note')
    expect(reopened?.hasKids).toBe(true)
    expect(reopened?.kidsNotes).toBe('Two kids')
    expect(reopened?.avatarAssetId).toBeNull()
    expect(reopened?.initials).toBe('JR')
    expect(reopened?.updatedAt).toBe(FIXED_NOW)
  })

  it('round trips reminder settings, profile blocks, history, deletion safety, and list sorting', async () => {
    const createContact = getHandler('create-contact')
    const getContact = getHandler('get-contact')
    const getContacts = getHandler('get-contacts')
    const getReminderSettings = getHandler('get-contact-reminder-settings')
    const upsertReminderSettings = getHandler('upsert-contact-reminder-settings')
    const createProfileBlock = getHandler('create-contact-profile-block')
    const updateProfileBlock = getHandler('update-contact-profile-block')
    const deleteProfileBlock = getHandler('delete-contact-profile-block')
    const reorderProfileBlocks = getHandler('reorder-contact-profile-blocks')
    const getProfileBlocks = getHandler('get-contact-profile-blocks')
    const createContactInteraction = getHandler('create-contact-interaction')
    const getContactInteractions = getHandler('get-contact-interactions')
    const deleteContact = getHandler('delete-contact')
    const addEntry = getHandler('add-entry')
    const socialTrackerId = getSocialTrackerId()

    const jack = await createContact(null, { name: 'Jack Robert' }) as Record<string, unknown>
    const annabelle = await createContact(null, { name: 'Annabelle' }) as Record<string, unknown>

    const invalidThreshold = await upsertReminderSettings(null, {
      contactId: Number(jack.id),
      birthdayReminderEnabled: true,
      birthdayReminderDaysBefore: 0,
      checkInReminderEnabled: true,
      checkInAfterDays: 14,
    })
    expect(invalidThreshold).toBeNull()

    const reminderEnabled = await upsertReminderSettings(null, {
      contactId: Number(jack.id),
      birthdayReminderEnabled: true,
      birthdayReminderDaysBefore: 21,
      checkInReminderEnabled: true,
      checkInAfterDays: 14,
    }) as Record<string, unknown> | null

    expect(reminderEnabled?.birthdayReminderEnabled).toBe(true)
    expect(reminderEnabled?.birthdayReminderDaysBefore).toBe(21)
    expect(reminderEnabled?.checkInReminderEnabled).toBe(true)
    expect(reminderEnabled?.checkInAfterDays).toBe(14)

    const reminderDisabled = await upsertReminderSettings(null, {
      contactId: Number(jack.id),
      birthdayReminderEnabled: false,
      checkInReminderEnabled: false,
    }) as Record<string, unknown> | null

    expect(reminderDisabled?.birthdayReminderEnabled).toBe(false)
    expect(reminderDisabled?.birthdayReminderDaysBefore).toBeNull()
    expect(reminderDisabled?.checkInReminderEnabled).toBe(false)
    expect(reminderDisabled?.checkInAfterDays).toBeNull()

    const settingsRow = await getReminderSettings(null, Number(jack.id)) as Record<string, unknown> | null
    expect(settingsRow?.birthdayReminderDaysBefore).toBeNull()
    expect(settingsRow?.checkInAfterDays).toBeNull()

    const firstBlock = await createProfileBlock(null, {
      contactId: Number(jack.id),
      title: 'Favorite games',
      body: 'Roblox, Minecraft',
      blockType: 'list',
      orderIndex: 0,
    }) as Record<string, unknown> | null
    const secondBlock = await createProfileBlock(null, {
      contactId: Number(jack.id),
      title: 'Gift ideas',
      body: 'Sports merch',
      blockType: 'note',
      orderIndex: 1,
    }) as Record<string, unknown> | null

    expect(firstBlock?.contactId).toBe(jack.id)
    expect(secondBlock?.contactId).toBe(jack.id)

    const initialBlocks = await getProfileBlocks(null, Number(jack.id)) as Array<Record<string, unknown>>
    expect(initialBlocks.map((block) => block.id)).toEqual([firstBlock?.id, secondBlock?.id])

    const updatedBlock = await updateProfileBlock(null, Number(firstBlock?.id), {
      contactId: Number(jack.id),
      title: 'Favorite games and shows',
      body: 'Roblox, Minecraft, animation',
      blockType: 'text',
      orderIndex: 0,
    }) as Record<string, unknown> | null
    expect(updatedBlock?.title).toBe('Favorite games and shows')
    expect(updatedBlock?.body).toBe('Roblox, Minecraft, animation')

    const reordered = await reorderProfileBlocks(null, Number(jack.id), [Number(secondBlock?.id), Number(firstBlock?.id)]) as Array<Record<string, unknown>>
    expect(reordered.map((block) => block.id)).toEqual([secondBlock?.id, firstBlock?.id])

    const wrongOwnerUpdate = await updateProfileBlock(null, Number(firstBlock?.id), {
      contactId: Number(annabelle.id),
      title: 'Should not move',
    })
    expect(wrongOwnerUpdate).toBeNull()

    const wrongOwnerDelete = await deleteProfileBlock(null, Number(firstBlock?.id), Number(annabelle.id))
    expect(wrongOwnerDelete).toBe(false)

    const legacyTimestamp = Date.UTC(2026, 5, 12, 9, 0, 0)
    getDb()
      .insert(contactInteractions)
      .values({
        contactId: Number(jack.id),
        entryId: null,
        mood: 'neutral',
        moodImpact: 'neutral',
        method: 'text',
        timestamp: legacyTimestamp,
        notes: 'legacy interaction',
      })
      .run()

    const structuredTimestamp = Date.UTC(2026, 5, 14, 11, 0, 0)
    const structuredEntry = await addEntry(null, {
      trackerId: socialTrackerId,
      value: 1,
      note: 'Shared a project update',
      timestamp: structuredTimestamp,
      tagIds: [],
      socialInteractions: [
        {
          contactId: Number(jack.id),
          method: 'call',
          moodImpact: 'positive',
          notes: 'structured interaction',
        },
      ],
    }) as Record<string, unknown> | null

    expect(structuredEntry).not.toBeNull()

    const history = await getContactInteractions(null, Number(jack.id)) as Array<Record<string, unknown>>
    expect(history).toHaveLength(2)
    expect(history[0].structured).toBe(true)
    expect(history[0].entryId).toBe(structuredEntry?.id)
    expect(history[0].method).toBe('call')
    expect(history[0].moodImpact).toBe('positive')
    expect(history[1].structured).toBe(false)
    expect(history[1].entryId).toBeNull()
    expect(history[1].notes).toBe('legacy interaction')

    const jackAfterInteraction = await getContact(null, Number(jack.id)) as Record<string, unknown> | null
    expect(jackAfterInteraction?.lastTalkedAt).toBe(structuredTimestamp)
    expect(jackAfterInteraction?.daysSinceLastTalked).toBe(0)

    const contactsByRecent = await getContacts(null, { sortBy: 'most-recently-talked-to' }) as Array<Record<string, unknown>>
    expect(contactsByRecent[0].id).toBe(jack.id)

    const contactsByMostTalked = await getContacts(null, { sortBy: 'most-talked-to' }) as Array<Record<string, unknown>>
    expect(contactsByMostTalked[0].id).toBe(jack.id)

    const contactsByLeastTalked = await getContacts(null, { sortBy: 'least-talked-to' }) as Array<Record<string, unknown>>
    expect(contactsByLeastTalked[0].id).toBe(annabelle.id)

    const deletedBlocked = await deleteContact(null, Number(jack.id)) as { success: boolean }
    expect(deletedBlocked.success).toBe(false)

    const noHistoryDelete = await deleteContact(null, Number(annabelle.id)) as { success: boolean }
    expect(noHistoryDelete.success).toBe(true)
  })

  it('rejects invalid contact names and direct interactions without a real entry id', async () => {
    const createContact = getHandler('create-contact')
    const createContactInteraction = getHandler('create-contact-interaction')

    expect(await createContact(null, { name: '   ' })).toBeNull()
    expect(await createContact(null, { name: '' })).toBeNull()

    const jack = await createContact(null, { name: 'Jack' }) as Record<string, unknown>
    expect(jack).not.toBeNull()

    const invalidInteraction = await createContactInteraction(null, {
      contactId: Number(jack.id),
      entryId: null,
      method: 'text',
      moodImpact: 'neutral',
      notes: 'missing entry',
    })

    expect(invalidInteraction).toBeNull()

    const badMethod = await createContactInteraction(null, {
      contactId: Number(jack.id),
      entryId: 12345,
      method: 'fax' as never,
      moodImpact: 'neutral',
      notes: 'bad method',
    })
    expect(badMethod).toBeNull()
  })
})
