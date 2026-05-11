import { ipcMain } from 'electron'
import { desc, eq, sql } from 'drizzle-orm'
import { entries, entriesToTags, entryWeight, trackers } from '@packages/db'
import { getDb as db } from '@packages/db/database'
import { mapEntry, mapTracker } from '../../shared/mappers'
import type { BaseEntryRequest, QuickEntryContextResponse } from '@contracts/contracts'
import { getEntryTagIds, getTags, replaceEntryTags } from '../tags/service'

function formatDateStr(timestamp: number): string {
  const d = new Date(timestamp)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export function registerEntryHandlers(): void {
  ipcMain.handle('get-entries', async (_, options?: { limit?: number; trackerId?: number }) => {
    try {
      const limit = options?.limit ?? 100
      const base = db().select().from(entries).orderBy(desc(entries.timestamp)).limit(limit)
      const rows = options?.trackerId
        ? await db()
          .select()
          .from(entries)
          .where(eq(entries.trackerId, options.trackerId))
          .orderBy(desc(entries.timestamp))
          .limit(limit)
        : await base
      const mapped = rows.map((r) => mapEntry(r as Record<string, unknown>))
      const tagIdsByEntry = await getEntryTagIds(mapped.map((entry) => entry.id))
      return mapped.map((entry) => ({ ...entry, tagIds: tagIdsByEntry.get(entry.id) ?? [] }))
    } catch (e) {
      console.error('get-entries error:', e)
      return []
    }
  })

  ipcMain.handle('add-entry', async (_, data: BaseEntryRequest) => {
    try {
      const database = db()
      const inserted = await database.transaction(async (tx) => {
        const [row] = await tx
          .insert(entries)
          .values({
            trackerId: data.trackerId,
            value: data.value ?? null,
            note: data.note ?? null,
            metadata: JSON.stringify(data.metadata ?? {}),
            timestamp: data.timestamp,
            dateStr: formatDateStr(data.timestamp),
            assetId: data.assetId ?? null,
          })
          .returning()
        if (!row) return null
        await replaceEntryTags((row as { id: number }).id, data.tagIds, tx)
        return row
      })
      if (!inserted) return null
      const mapped = mapEntry(inserted as Record<string, unknown>)
      return { ...mapped, tagIds: data.tagIds ?? [] }
    } catch (e) {
      console.error('add-entry error:', e)
      return null
    }
  })

  ipcMain.handle('update-entry', async (_, id: number, updates: { value?: number | null; note?: string | null; timestamp?: number; assetId?: number | null; tagIds?: number[] }) => {
    try {
      const set: Record<string, unknown> = {}
      if (updates.value !== undefined) set.value = updates.value
      if (updates.note !== undefined) set.note = updates.note
      if (updates.assetId !== undefined) set.assetId = updates.assetId
      if (updates.timestamp !== undefined) {
        set.timestamp = updates.timestamp
        set.dateStr = formatDateStr(updates.timestamp)
      }
      const database = db()
      const updated = await database.transaction(async (tx) => {
        if (Object.keys(set).length > 0) {
          await tx.update(entries).set(set).where(eq(entries.id, id))
        }
        await replaceEntryTags(id, updates.tagIds, tx)
        const [row] = await tx.select().from(entries).where(eq(entries.id, id))
        return row ?? null
      })
      if (!updated) return null
      const mapped = mapEntry(updated as Record<string, unknown>)
      const tagIdsByEntry = await getEntryTagIds([mapped.id])
      return { ...mapped, tagIds: tagIdsByEntry.get(mapped.id) ?? [] }
    } catch (e) {
      console.error('update-entry error:', e)
      return null
    }
  })

  ipcMain.handle('delete-entry', async (_, id: number) => {
    try {
      const database = db()
      await database.transaction(async (tx) => {
        await tx.delete(entriesToTags).where(eq(entriesToTags.entryId, id))
        await tx.delete(entryWeight).where(eq(entryWeight.entryId, id))
        await tx.delete(entries).where(eq(entries.id, id))
      })
      return true
    } catch (e) {
      console.error('delete-entry error:', e)
      return false
    }
  })

  ipcMain.handle('get-task-entries', async (_, trackerId: number, options?: { limit?: number }) => {
    try {
      const limit = options?.limit ?? 100
      const rows = await db()
        .select()
        .from(entries)
        .where(eq(entries.trackerId, trackerId))
        .orderBy(desc(entries.timestamp))
        .limit(limit)
      const mapped = rows.map((r) => mapEntry(r as Record<string, unknown>))
      const tagIdsByEntry = await getEntryTagIds(mapped.map((entry) => entry.id))
      return mapped.map((entry) => ({ ...entry, tagIds: tagIdsByEntry.get(entry.id) ?? [] }))
    } catch (e) {
      console.error('get-task-entries error:', e)
      return []
    }
  })

  ipcMain.handle('get-quick-entry-context', async (): Promise<QuickEntryContextResponse> => {
    try {
      const recentRows = await db()
        .select({
          trackerId: entries.trackerId,
          maxTs: sql<number>`max(${entries.timestamp})`,
        })
        .from(entries)
        .groupBy(entries.trackerId)
        .orderBy(desc(sql`max(${entries.timestamp})`))
        .limit(10)

      const allTrackers = await db()
        .select()
        .from(trackers)
        .where(eq(trackers.archived, false))

      const byId = new Map(allTrackers.map((tracker) => [(tracker as { id: number }).id, tracker]))
      const recentTrackers = recentRows
        .map((row) => byId.get(row.trackerId))
        .filter((row): row is typeof allTrackers[number] => row !== undefined)
        .map((row) => mapTracker(row as Record<string, unknown>))

      const favoriteTrackers = allTrackers
        .filter((tracker) => !!(tracker as { isFavorite?: boolean }).isFavorite)
        .map((row) => mapTracker(row as Record<string, unknown>))

      const allTags = await getTags()
      const suggestedTagRows = await db()
        .select({
          tagId: entriesToTags.tagId,
          useCount: sql<number>`count(*)`,
        })
        .from(entriesToTags)
        .groupBy(entriesToTags.tagId)
        .orderBy(desc(sql`count(*)`))
        .limit(10)
      const tagById = new Map(allTags.map((tag) => [tag.id, tag]))
      const suggestedTags = suggestedTagRows
        .map((row) => tagById.get(Number(row.tagId)))
        .filter((tag): tag is typeof allTags[number] => tag !== undefined)

      return {
        recentTrackers,
        favoriteTrackers,
        tags: allTags,
        suggestedTags,
      }
    } catch (e) {
      console.error('get-quick-entry-context error:', e)
      return { recentTrackers: [], favoriteTrackers: [], tags: [], suggestedTags: [] }
    }
  })
}
