import { ipcMain } from 'electron'
import { asc, eq, desc, sql } from 'drizzle-orm'
import { contacts, contactInteractions, contactProfileBlocks, contactReminderSettings, entries, trackers } from '@packages/db'
import { getDb as db } from '@packages/db/database'
import { mapContact, mapContactInteraction, mapContactProfileBlock, mapContactReminderSettings, mapTracker } from '../../shared/mappers'
import type { ContactInsert, ContactUpdate, ContactInteractionInsert, ContactProfileBlockInput, ContactReminderSettingsInput, ContactSortBy } from '@contracts/contracts'
import { computeContactLastTalkedTimestamp, normalizeContactListValue, normalizeContactName, normalizeSocialMethod, normalizeSocialMoodImpact, reorderContactProfileBlocks } from '@contracts/domain'
import { getTrackerIdentity } from '@contracts/features/tracking'

const BIRTHDAY_REMINDER_MAX_DAYS = 365
const CHECK_IN_REMINDER_MAX_DAYS = 3650

interface ReminderSettingsLike {
  birthdayReminderEnabled: boolean
  birthdayReminderDaysBefore: number | null
  checkInReminderEnabled: boolean
  checkInAfterDays: number | null
}

function encodeList(value?: string[] | null): string | null | undefined {
  if (value === undefined) return undefined
  const normalized = normalizeContactListValue(value)
  return normalized && normalized.length > 0 ? JSON.stringify(normalized) : null
}

function formatDateStr(timestamp: number): string {
  const d = new Date(timestamp)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function parseDateOnlyTimestamp(value: string | null | undefined): number | null {
  if (!value) return null
  const timestamp = Date.parse(`${value}T00:00:00Z`)
  return Number.isFinite(timestamp) ? timestamp : null
}

function normalizePositiveInteger(value: unknown, max: number): number | null {
  if (value == null || value === '') return null
  const numeric = typeof value === 'number' ? value : Number(value)
  if (!Number.isInteger(numeric) || numeric <= 0 || numeric > max) return null
  return numeric
}

function normalizeReminderSettingsInput(
  data: ContactReminderSettingsInput,
  existing?: ReminderSettingsLike,
): {
  birthdayReminderEnabled: boolean
  birthdayReminderDaysBefore: number | null
  checkInReminderEnabled: boolean
  checkInAfterDays: number | null
} {
  const birthdayReminderEnabled = data.birthdayReminderEnabled ?? existing?.birthdayReminderEnabled ?? false
  const checkInReminderEnabled = data.checkInReminderEnabled ?? existing?.checkInReminderEnabled ?? false
  const birthdayReminderDaysBefore = birthdayReminderEnabled
    ? normalizePositiveInteger(data.birthdayReminderDaysBefore ?? existing?.birthdayReminderDaysBefore, BIRTHDAY_REMINDER_MAX_DAYS)
    : null
  const checkInAfterDays = checkInReminderEnabled
    ? normalizePositiveInteger(data.checkInAfterDays ?? existing?.checkInAfterDays, CHECK_IN_REMINDER_MAX_DAYS)
    : null

  if (birthdayReminderEnabled && birthdayReminderDaysBefore == null) {
    throw new Error('Invalid birthday reminder threshold')
  }
  if (checkInReminderEnabled && checkInAfterDays == null) {
    throw new Error('Invalid check-in threshold')
  }

  return {
    birthdayReminderEnabled,
    birthdayReminderDaysBefore,
    checkInReminderEnabled,
    checkInAfterDays,
  }
}

function refreshContactLastTalked(tx: any, contactId: number): void {
  const rows = tx
    .select({ timestamp: contactInteractions.timestamp })
    .from(contactInteractions)
    .where(eq(contactInteractions.contactId, contactId))
    .orderBy(desc(contactInteractions.timestamp))
    .all()
  const timestamp = computeContactLastTalkedTimestamp(rows as Array<{ timestamp: number }>)
  tx.update(contacts).set({
    lastTalkedAt: timestamp,
    dateLastTalked: timestamp == null ? null : formatDateStr(timestamp),
  }).where(eq(contacts.id, contactId)).run()
}

function sortContactsByLastTalked<T extends { id: number; name: string; lastTalkedAt?: number | null }>(items: T[]): T[] {
  return [...items].sort((a, b) => {
    const left = a.lastTalkedAt ?? Number.NEGATIVE_INFINITY
    const right = b.lastTalkedAt ?? Number.NEGATIVE_INFINITY
    if (left !== right) return right - left
    return a.name.localeCompare(b.name)
  })
}

export function registerContactHandlers(): void {
  ipcMain.handle('get-contacts', async (_, options?: { sortBy?: ContactSortBy }) => {
    try {
      const rows = await db()
        .select()
        .from(contacts)
        .orderBy(asc(contacts.name))
      const mapped = rows.map((r) => mapContact(r as Record<string, unknown>))
      if (options?.sortBy === 'most-recently-talked-to') {
        return sortContactsByLastTalked(mapped)
      }
      if (options?.sortBy === 'most-talked-to' || options?.sortBy === 'least-talked-to') {
        const interactionRows = await db().select().from(contactInteractions)
        const counts = new Map<number, number>()
        interactionRows.forEach((row) => {
          if ((row as { entryId?: number | null }).entryId == null) return
          const contactId = Number((row as { contactId: number }).contactId)
          counts.set(contactId, (counts.get(contactId) ?? 0) + 1)
        })
        const multiplier = options.sortBy === 'most-talked-to' ? -1 : 1
        return mapped.sort((a, b) => {
          const byCount = ((counts.get(a.id) ?? 0) - (counts.get(b.id) ?? 0)) * multiplier
          return byCount || a.name.localeCompare(b.name)
        })
      }
      return mapped
    } catch (e) {
      console.error('get-contacts error:', e)
      return []
    }
  })

  ipcMain.handle('get-contact', async (_, id: number) => {
    try {
      const rows = await db().select().from(contacts).where(eq(contacts.id, id))
      return rows[0] ? mapContact(rows[0] as Record<string, unknown>) : null
    } catch (e) {
      console.error('get-contact error:', e)
      return null
    }
  })

  ipcMain.handle('create-contact', async (_, data: ContactInsert) => {
    try {
      const name = normalizeContactName(data.name)
      if (!name) {
        throw new Error('Invalid contact name')
      }
      const now = Date.now()
      const [inserted] = await db()
        .insert(contacts)
        .values({
          name,
          avatarAssetId: data.avatarAssetId ?? null,
          birthday: data.birthday ?? null,
          dateMet: data.dateMet ?? null,
          likes: encodeList(data.likes) ?? null,
          dislikes: encodeList(data.dislikes) ?? null,
          traits: encodeList(data.traits) ?? null,
          hasKids: data.hasKids ?? false,
          kidsNotes: data.kidsNotes ?? null,
          notes: data.notes ?? null,
          updatedAt: now,
        })
        .returning()
      return inserted ? mapContact(inserted as Record<string, unknown>) : null
    } catch (e) {
      console.error('create-contact error:', e)
      return null
    }
  })

  ipcMain.handle('update-contact', async (_, id: number, updates: ContactUpdate) => {
    try {
      const set: Record<string, unknown> = {}
      if (updates.name !== undefined) {
        const name = normalizeContactName(updates.name)
        if (!name) throw new Error('Invalid contact name')
        set.name = name
      }
      if (updates.avatarAssetId !== undefined) set.avatarAssetId = updates.avatarAssetId
      if (updates.birthday !== undefined) set.birthday = updates.birthday
      if (updates.dateMet !== undefined) set.dateMet = updates.dateMet
      if (updates.dateLastTalked !== undefined) {
        const normalizedDate = updates.dateLastTalked ? updates.dateLastTalked : null
        set.dateLastTalked = normalizedDate
        set.lastTalkedAt = parseDateOnlyTimestamp(normalizedDate)
      }
      if (updates.lastTalkedAt !== undefined) {
        set.lastTalkedAt = updates.lastTalkedAt
        set.dateLastTalked = updates.lastTalkedAt ? formatDateStr(updates.lastTalkedAt) : null
      }
      const likes = encodeList(updates.likes)
      const dislikes = encodeList(updates.dislikes)
      const traits = encodeList(updates.traits)
      if (likes !== undefined) set.likes = likes
      if (dislikes !== undefined) set.dislikes = dislikes
      if (traits !== undefined) set.traits = traits
      if (updates.hasKids !== undefined) set.hasKids = updates.hasKids
      if (updates.kidsNotes !== undefined) set.kidsNotes = updates.kidsNotes
      if (updates.notes !== undefined) set.notes = updates.notes
      if (Object.keys(set).length > 0) set.updatedAt = Date.now()
      if (Object.keys(set).length === 0) return null
      await db().update(contacts).set(set).where(eq(contacts.id, id))
      const [updated] = await db().select().from(contacts).where(eq(contacts.id, id))
      return updated ? mapContact(updated as Record<string, unknown>) : null
    } catch (e) {
      console.error('update-contact error:', e)
      return null
    }
  })

  ipcMain.handle('delete-contact', async (_, id: number) => {
    try {
      const [hasInteractions] = await db()
        .select({ id: contactInteractions.id })
        .from(contactInteractions)
        .where(eq(contactInteractions.contactId, id))
        .limit(1)
      if (hasInteractions) {
        return { success: false }
      }
      await db().delete(contacts).where(eq(contacts.id, id))
      return { success: true }
    } catch (e) {
      console.error('delete-contact error:', e)
      return { success: false }
    }
  })

  ipcMain.handle('create-contact-interaction', async (_, data: ContactInteractionInsert) => {
    try {
      const contactId = Number(data.contactId)
      const entryId = Number(data.entryId)
      const method = normalizeSocialMethod(data.method)
      const moodImpact = normalizeSocialMoodImpact(data.moodImpact)
      if (!Number.isInteger(contactId) || contactId <= 0 || !Number.isInteger(entryId) || entryId <= 0 || !method || !moodImpact) {
        throw new Error('Invalid interaction data')
      }
      const inserted = db().transaction((tx) => {
        const [contactRow] = tx.select({ id: contacts.id }).from(contacts).where(eq(contacts.id, contactId)).limit(1).all()
        if (!contactRow) {
          throw new Error('Unknown contact')
        }
        const [entryRow] = tx.select({ trackerId: entries.trackerId }).from(entries).where(eq(entries.id, entryId)).limit(1).all()
        if (!entryRow) {
          throw new Error('Unknown entry')
        }
        const [trackerRow] = tx
          .select({
            id: trackers.id,
            name: trackers.name,
            icon: trackers.icon,
            config: trackers.config,
          })
          .from(trackers)
          .where(eq(trackers.id, entryRow.trackerId))
          .limit(1)
          .all()
        if (!trackerRow || getTrackerIdentity(mapTracker(trackerRow as Record<string, unknown>)) !== 'social') {
          throw new Error('Structured contact interactions require a Social entry')
        }
        const timestamp = Date.now()
        const result = tx.insert(contactInteractions).values({
          contactId,
          entryId,
          mood: moodImpact,
          moodImpact,
          method,
          timestamp,
          notes: data.notes ?? null,
        }).run()
        const [row] = tx
          .select()
          .from(contactInteractions)
          .where(eq(contactInteractions.id, Number(result.lastInsertRowid)))
          .limit(1)
          .all()
        refreshContactLastTalked(tx, contactId)
        return row ?? null
      })

      return inserted ? mapContactInteraction(inserted as Record<string, unknown>) : null
    } catch (e) {
      console.error('create-contact-interaction error:', e)
      return null
    }
  })

  ipcMain.handle('get-contact-interactions', async (_, contactId: number) => {
    try {
      const rows = await db()
        .select({
          id: contactInteractions.id,
          contactId: contactInteractions.contactId,
          entryId: contactInteractions.entryId,
          method: contactInteractions.method,
          mood: contactInteractions.mood,
          moodImpact: contactInteractions.moodImpact,
          timestamp: contactInteractions.timestamp,
          notes: contactInteractions.notes,
          contactName: contacts.name,
        })
        .from(contactInteractions)
        .leftJoin(contacts, eq(contacts.id, contactInteractions.contactId))
        .where(eq(contactInteractions.contactId, contactId))
        .orderBy(desc(contactInteractions.timestamp))
      return rows.map((r) => mapContactInteraction(r as Record<string, unknown>))
    } catch (e) {
      console.error('get-contact-interactions error:', e)
      return []
    }
  })

  ipcMain.handle('get-contact-reminder-settings', async (_, contactId: number) => {
    try {
      const [row] = await db().select().from(contactReminderSettings).where(eq(contactReminderSettings.contactId, contactId))
      return row ? mapContactReminderSettings(row as Record<string, unknown>) : null
    } catch (e) {
      console.error('get-contact-reminder-settings error:', e)
      return null
    }
  })

  ipcMain.handle('upsert-contact-reminder-settings', async (_, data: ContactReminderSettingsInput) => {
    try {
      const now = Date.now()
      const [contactRow] = await db().select({ id: contacts.id }).from(contacts).where(eq(contacts.id, data.contactId)).limit(1)
      if (!contactRow) throw new Error('Unknown contact')
      const existing = await db().select().from(contactReminderSettings).where(eq(contactReminderSettings.contactId, data.contactId))
      if (existing[0]) {
        const normalized = normalizeReminderSettingsInput(data, existing[0] as unknown as ReminderSettingsLike)
        await db().update(contactReminderSettings).set({
          birthdayReminderEnabled: normalized.birthdayReminderEnabled,
          birthdayReminderDaysBefore: normalized.birthdayReminderDaysBefore,
          checkInReminderEnabled: normalized.checkInReminderEnabled,
          checkInAfterDays: normalized.checkInAfterDays,
          updatedAt: now,
        }).where(eq(contactReminderSettings.contactId, data.contactId))
      } else {
        const normalized = normalizeReminderSettingsInput(data)
        await db().insert(contactReminderSettings).values({
          contactId: data.contactId,
          birthdayReminderEnabled: normalized.birthdayReminderEnabled,
          birthdayReminderDaysBefore: normalized.birthdayReminderDaysBefore,
          checkInReminderEnabled: normalized.checkInReminderEnabled,
          checkInAfterDays: normalized.checkInAfterDays,
          createdAt: now,
          updatedAt: now,
        })
      }
      const [row] = await db().select().from(contactReminderSettings).where(eq(contactReminderSettings.contactId, data.contactId))
      return row ? mapContactReminderSettings(row as Record<string, unknown>) : null
    } catch (e) {
      console.error('upsert-contact-reminder-settings error:', e)
      return null
    }
  })

  ipcMain.handle('get-contact-profile-blocks', async (_, contactId: number) => {
    try {
      const rows = await db()
        .select()
        .from(contactProfileBlocks)
        .where(eq(contactProfileBlocks.contactId, contactId))
        .orderBy(asc(contactProfileBlocks.orderIndex))
      return rows.map((row) => mapContactProfileBlock(row as Record<string, unknown>))
    } catch (e) {
      console.error('get-contact-profile-blocks error:', e)
      return []
    }
  })

  ipcMain.handle('create-contact-profile-block', async (_, data: ContactProfileBlockInput) => {
    try {
      const [contactRow] = await db().select({ id: contacts.id }).from(contacts).where(eq(contacts.id, data.contactId)).limit(1)
      if (!contactRow) throw new Error('Unknown contact')
      const title = data.title.trim()
      if (!title) throw new Error('Invalid block title')
      const body = data.body.trim()
      const blockType = data.blockType ?? 'text'
      if (!['text', 'list', 'note'].includes(blockType)) throw new Error('Invalid block type')
      const orderIndex = data.orderIndex == null ? undefined : Number(data.orderIndex)
      if (orderIndex != null && (!Number.isInteger(orderIndex) || orderIndex < 0)) throw new Error('Invalid block order')
      const [existingCount] = await db()
        .select({ count: sql<number>`count(*)` })
        .from(contactProfileBlocks)
        .where(eq(contactProfileBlocks.contactId, data.contactId))
      const [inserted] = await db().insert(contactProfileBlocks).values({
        contactId: data.contactId,
        title,
        body,
        orderIndex: orderIndex ?? Number((existingCount as { count?: number } | undefined)?.count ?? 0),
        blockType,
      }).returning()
      return inserted ? mapContactProfileBlock(inserted as Record<string, unknown>) : null
    } catch (e) {
      console.error('create-contact-profile-block error:', e)
      return null
    }
  })

  ipcMain.handle('update-contact-profile-block', async (_, id: number, updates: Partial<ContactProfileBlockInput>) => {
    try {
      const [existing] = await db()
        .select()
        .from(contactProfileBlocks)
        .where(eq(contactProfileBlocks.id, id))
        .limit(1)
      if (!existing) return null
      if (updates.contactId != null && updates.contactId !== existing.contactId) return null
      const set: Record<string, unknown> = { updatedAt: Date.now() }
      if (updates.title !== undefined) {
        const title = updates.title.trim()
        if (!title) throw new Error('Invalid block title')
        set.title = title
      }
      if (updates.body !== undefined) set.body = updates.body.trim()
      if (updates.orderIndex !== undefined) {
        const orderIndex = Number(updates.orderIndex)
        if (!Number.isInteger(orderIndex) || orderIndex < 0) throw new Error('Invalid block order')
        set.orderIndex = orderIndex
      }
      if (updates.blockType !== undefined) {
        if (!['text', 'list', 'note'].includes(updates.blockType)) throw new Error('Invalid block type')
        set.blockType = updates.blockType
      }
      await db().update(contactProfileBlocks).set(set).where(eq(contactProfileBlocks.id, id))
      const [row] = await db().select().from(contactProfileBlocks).where(eq(contactProfileBlocks.id, id))
      return row ? mapContactProfileBlock(row as Record<string, unknown>) : null
    } catch (e) {
      console.error('update-contact-profile-block error:', e)
      return null
    }
  })

  ipcMain.handle('delete-contact-profile-block', async (_, id: number, contactId?: number) => {
    try {
      const [existing] = await db()
        .select({ contactId: contactProfileBlocks.contactId })
        .from(contactProfileBlocks)
        .where(eq(contactProfileBlocks.id, id))
        .limit(1)
      if (!existing) return false
      if (contactId != null && Number(existing.contactId) !== Number(contactId)) return false
      await db().delete(contactProfileBlocks).where(eq(contactProfileBlocks.id, id))
      return true
    } catch (e) {
      console.error('delete-contact-profile-block error:', e)
      return false
    }
  })

  ipcMain.handle('reorder-contact-profile-blocks', async (_, contactId: number, ids: number[]) => {
    try {
      const currentBlocks = await db()
        .select()
        .from(contactProfileBlocks)
        .where(eq(contactProfileBlocks.contactId, contactId))
        .orderBy(asc(contactProfileBlocks.orderIndex))
      const currentIds = new Set(currentBlocks.map((block) => block.id))
      const normalizedIds = Array.from(new Set(ids))
      if (normalizedIds.length !== ids.length) throw new Error('Duplicate profile block ids')
      if (normalizedIds.some((id) => !currentIds.has(id))) throw new Error('Profile block ownership mismatch')
      const reordered = reorderContactProfileBlocks(currentBlocks.map((block) => mapContactProfileBlock(block as Record<string, unknown>)), normalizedIds)
      db().transaction((tx) => {
        for (const block of reordered) {
          tx.update(contactProfileBlocks).set({ orderIndex: block.orderIndex, updatedAt: Date.now() }).where(eq(contactProfileBlocks.id, block.id)).run()
        }
      })
      const rows = await db().select().from(contactProfileBlocks).where(eq(contactProfileBlocks.contactId, contactId)).orderBy(asc(contactProfileBlocks.orderIndex))
      return rows.map((row) => mapContactProfileBlock(row as Record<string, unknown>))
    } catch (e) {
      console.error('reorder-contact-profile-blocks error:', e)
      return []
    }
  })
}
