import { ipcMain } from 'electron'
import { asc, eq, desc } from 'drizzle-orm'
import { contacts, contactInteractions, contactProfileBlocks, contactReminderSettings } from '@packages/db'
import { getDb as db } from '@packages/db/database'
import { mapContact, mapContactInteraction, mapContactProfileBlock, mapContactReminderSettings } from '../../shared/mappers'
import type { ContactInsert, ContactUpdate, ContactInteractionInsert, ContactProfileBlockInput, ContactReminderSettingsInput } from '@contracts/contracts'

function encodeList(value?: string[] | null): string | null | undefined {
  if (value === undefined) return undefined
  return value && value.length > 0 ? JSON.stringify(value) : null
}

function formatDateStr(timestamp: number): string {
  const d = new Date(timestamp)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export function registerContactHandlers(): void {
  ipcMain.handle('get-contacts', async (_, options?: { sortBy?: 'name' | 'most-talked-to' | 'least-talked-to' }) => {
    try {
      const rows = await db()
        .select()
        .from(contacts)
        .orderBy(asc(contacts.name))
      const mapped = rows.map((r) => mapContact(r as Record<string, unknown>))
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
      if (!data.name || typeof data.name !== 'string' || !data.name.trim()) {
        throw new Error('Invalid contact name')
      }
      const [inserted] = await db()
        .insert(contacts)
        .values({
          name: data.name,
          avatarAssetId: data.avatarAssetId ?? null,
          birthday: data.birthday ?? null,
          dateMet: data.dateMet ?? null,
          likes: encodeList(data.likes) ?? null,
          dislikes: encodeList(data.dislikes) ?? null,
          traits: encodeList(data.traits) ?? null,
          hasKids: data.hasKids ?? false,
          kidsNotes: data.kidsNotes ?? null,
          notes: data.notes ?? null,
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
      if (updates.name !== undefined) set.name = updates.name
      if (updates.avatarAssetId !== undefined) set.avatarAssetId = updates.avatarAssetId
      if (updates.birthday !== undefined) set.birthday = updates.birthday
      if (updates.dateMet !== undefined) set.dateMet = updates.dateMet
      if (updates.dateLastTalked !== undefined) set.dateLastTalked = updates.dateLastTalked
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
      await db().delete(contacts).where(eq(contacts.id, id))
      return { success: true }
    } catch (e) {
      console.error('delete-contact error:', e)
      return { success: false }
    }
  })

  ipcMain.handle('create-contact-interaction', async (_, data: ContactInteractionInsert) => {
    try {
      const moodImpact = data.moodImpact ?? data.mood ?? 'neutral'
      if (!data.contactId || !data.entryId) {
        throw new Error('Invalid interaction data')
      }
      const timestamp = Date.now()
      const [inserted] = await db()
        .insert(contactInteractions)
        .values({
          contactId: data.contactId,
          entryId: data.entryId,
          mood: moodImpact,
          moodImpact,
          method: data.method ?? null,
          timestamp,
          notes: data.notes ?? null,
        })
        .returning()

      await db().update(contacts).set({ dateLastTalked: formatDateStr(timestamp), lastTalkedAt: timestamp }).where(eq(contacts.id, data.contactId))

      return inserted ? mapContactInteraction(inserted as Record<string, unknown>) : null
    } catch (e) {
      console.error('create-contact-interaction error:', e)
      return null
    }
  })

  ipcMain.handle('get-contact-interactions', async (_, contactId: number) => {
    try {
      const rows = await db()
        .select()
        .from(contactInteractions)
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
      const existing = await db().select().from(contactReminderSettings).where(eq(contactReminderSettings.contactId, data.contactId))
      if (existing[0]) {
        await db().update(contactReminderSettings).set({
          birthdayReminderEnabled: data.birthdayReminderEnabled ?? existing[0].birthdayReminderEnabled,
          birthdayReminderDaysBefore: data.birthdayReminderDaysBefore ?? existing[0].birthdayReminderDaysBefore,
          checkInReminderEnabled: data.checkInReminderEnabled ?? existing[0].checkInReminderEnabled,
          checkInAfterDays: data.checkInAfterDays ?? existing[0].checkInAfterDays,
          updatedAt: now,
        }).where(eq(contactReminderSettings.contactId, data.contactId))
      } else {
        await db().insert(contactReminderSettings).values({
          contactId: data.contactId,
          birthdayReminderEnabled: data.birthdayReminderEnabled ?? false,
          birthdayReminderDaysBefore: data.birthdayReminderDaysBefore ?? 7,
          checkInReminderEnabled: data.checkInReminderEnabled ?? false,
          checkInAfterDays: data.checkInAfterDays ?? 14,
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
      const title = data.title.trim()
      if (!title) throw new Error('Invalid block title')
      const [inserted] = await db().insert(contactProfileBlocks).values({
        contactId: data.contactId,
        title,
        body: data.body,
        orderIndex: data.orderIndex ?? 0,
        blockType: data.blockType ?? 'text',
      }).returning()
      return inserted ? mapContactProfileBlock(inserted as Record<string, unknown>) : null
    } catch (e) {
      console.error('create-contact-profile-block error:', e)
      return null
    }
  })

  ipcMain.handle('update-contact-profile-block', async (_, id: number, updates: Partial<ContactProfileBlockInput>) => {
    try {
      const set: Record<string, unknown> = { updatedAt: Date.now() }
      if (updates.title !== undefined) set.title = updates.title
      if (updates.body !== undefined) set.body = updates.body
      if (updates.orderIndex !== undefined) set.orderIndex = updates.orderIndex
      if (updates.blockType !== undefined) set.blockType = updates.blockType
      await db().update(contactProfileBlocks).set(set).where(eq(contactProfileBlocks.id, id))
      const [row] = await db().select().from(contactProfileBlocks).where(eq(contactProfileBlocks.id, id))
      return row ? mapContactProfileBlock(row as Record<string, unknown>) : null
    } catch (e) {
      console.error('update-contact-profile-block error:', e)
      return null
    }
  })

  ipcMain.handle('delete-contact-profile-block', async (_, id: number) => {
    try {
      await db().delete(contactProfileBlocks).where(eq(contactProfileBlocks.id, id))
      return true
    } catch (e) {
      console.error('delete-contact-profile-block error:', e)
      return false
    }
  })

  ipcMain.handle('reorder-contact-profile-blocks', async (_, contactId: number, ids: number[]) => {
    try {
      await db().transaction(async (tx) => {
        for (const [orderIndex, id] of ids.entries()) {
          await tx.update(contactProfileBlocks).set({ orderIndex, updatedAt: Date.now() }).where(eq(contactProfileBlocks.id, id))
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
