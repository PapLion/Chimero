import { ipcMain } from 'electron'
import { eq } from 'drizzle-orm'
import { reminders } from '@packages/db'
import { getDb as db } from '@packages/db/database'
import { mapReminder } from '../../shared/mappers'
import type { ReminderInsert } from '@contracts/contracts'

export function registerReminderHandlers(): void {
  ipcMain.handle('get-reminders', async () => {
    try {
      const rows = await db().select().from(reminders).orderBy(reminders.id)
      return rows.map((r) => mapReminder(r as Record<string, unknown>))
    } catch (e) {
      console.error('get-reminders error:', e)
      return []
    }
  })

  ipcMain.handle('upsert-reminder', async (_, data: ReminderInsert & { id?: number }) => {
    try {
      const id = data.id
      const payload = {
        title: data.title,
        description: data.description ?? null,
        trackerId: data.trackerId ?? null,
        time: data.time,
        date: data.date ?? null,
        days: data.days ?? null,
        enabled: data.enabled ?? true,
      }
      if (id != null && id > 0) {
        await db().update(reminders).set(payload).where(eq(reminders.id, id))
        const [updated] = await db().select().from(reminders).where(eq(reminders.id, id))
        return updated ? mapReminder(updated as Record<string, unknown>) : null
      }
      const [inserted] = await db().insert(reminders).values(payload).returning()
      return inserted ? mapReminder(inserted as Record<string, unknown>) : null
    } catch (e) {
      console.error('upsert-reminder error:', e)
      return null
    }
  })

  ipcMain.handle('delete-reminder', async (_, id: number) => {
    try {
      await db().delete(reminders).where(eq(reminders.id, id))
      return true
    } catch (e) {
      console.error('delete-reminder error:', e)
      return false
    }
  })

  ipcMain.handle('toggle-reminder', async (_, id: number, enabled: boolean) => {
    try {
      await db().update(reminders).set({ enabled }).where(eq(reminders.id, id))
      const [updated] = await db().select().from(reminders).where(eq(reminders.id, id))
      return updated ? mapReminder(updated as Record<string, unknown>) : null
    } catch (e) {
      console.error('toggle-reminder error:', e)
      return null
    }
  })

  ipcMain.handle('complete-reminder', async (_, id: number) => {
    try {
      const completedAt = new Date()
      await db().update(reminders).set({ completedAt }).where(eq(reminders.id, id))
      const [updated] = await db().select().from(reminders).where(eq(reminders.id, id))
      return updated ? mapReminder(updated as Record<string, unknown>) : null
    } catch (e) {
      console.error('complete-reminder error:', e)
      return null
    }
  })

  ipcMain.handle('uncomplete-reminder', async (_, id: number) => {
    try {
      await db().update(reminders).set({ completedAt: null }).where(eq(reminders.id, id))
      const [updated] = await db().select().from(reminders).where(eq(reminders.id, id))
      return updated ? mapReminder(updated as Record<string, unknown>) : null
    } catch (e) {
      console.error('uncomplete-reminder error:', e)
      return null
    }
  })
}
