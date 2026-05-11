import { ipcMain } from 'electron'
import { asc, eq, desc } from 'drizzle-orm'
import { contacts, contactInteractions } from '@packages/db'
import { getDb as db } from '@packages/db/database'
import { mapContact, mapContactInteraction } from '../../shared/mappers'
import type { ContactInsert, ContactUpdate, ContactInteractionInsert } from '@contracts/contracts'

export function registerContactHandlers(): void {
  ipcMain.handle('get-contacts', async () => {
    try {
      const rows = await db()
        .select()
        .from(contacts)
        .orderBy(asc(contacts.name))
      return rows.map((r) => mapContact(r as Record<string, unknown>))
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
      if (updates.traits !== undefined) set.traits = updates.traits ? JSON.stringify(updates.traits) : null
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
      if (!data.contactId || !data.mood) {
        throw new Error('Invalid interaction data')
      }
      const timestamp = Date.now()
      const [inserted] = await db()
        .insert(contactInteractions)
        .values({
          contactId: data.contactId,
          entryId: data.entryId ?? null,
          mood: data.mood,
          timestamp,
          notes: data.notes ?? null,
        })
        .returning()

      const now = new Date()
      const dateLastTalked = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
      await db().update(contacts).set({ dateLastTalked }).where(eq(contacts.id, data.contactId))

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
}
