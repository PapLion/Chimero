import { ipcMain } from 'electron'
import { and, desc, eq, inArray, sql } from 'drizzle-orm'
import { books, bookActivities, contactInteractions, contacts, entries, entriesToTags, entryFood, entryGaming, entryHealth, entryIntake, entryWeight, intakeItems, symptoms, trackers } from '@packages/db'
import { getDb as db } from '@packages/db/database'
import { mapEntry, mapTracker } from '../../shared/mappers'
import type { BaseEntryRequest, Entry, EntryUpdateRequest, QuickEntryContextResponse, SocialInteractionReadModel } from '@contracts/contracts'
import { getContactInitials } from '@contracts/domain'
import { getTrackerIdentity } from '@contracts/features/tracking'
import { getBookLifecycleRecord } from '@contracts/features/books'
import { getEntryTagIds, getTags, replaceEntryTags } from '../tags/service'

function formatDateStr(timestamp: number): string {
  const d = new Date(timestamp)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function normalizeSocialInteractions(data: BaseEntryRequest | EntryUpdateRequest) {
  return (data.socialInteractions ?? [])
    .map((interaction) => ({
      contactId: Number(interaction.contactId),
      method: interaction.method ?? null,
      moodImpact: interaction.moodImpact ?? interaction.mood ?? 'neutral',
      notes: interaction.notes ?? null,
    }))
    .filter((interaction) => Number.isInteger(interaction.contactId) && interaction.contactId > 0)
}

function toContactIdRows(rows: unknown): Array<{ contactId: number }> {
  if (Array.isArray(rows)) return rows as Array<{ contactId: number }>
  if (rows && typeof (rows as Iterable<unknown>)[Symbol.iterator] === 'function') {
    return Array.from(rows as Iterable<{ contactId: number }>)
  }
  return []
}

async function refreshContactsLastTalked(tx: any, contactIds: number[]): Promise<void> {
  const uniqueIds = Array.from(new Set(contactIds)).filter((id) => Number.isInteger(id) && id > 0)
  for (const contactId of uniqueIds) {
    const [latest] = await tx
      .select({ timestamp: contactInteractions.timestamp })
      .from(contactInteractions)
      .where(eq(contactInteractions.contactId, contactId))
      .orderBy(desc(contactInteractions.timestamp))
      .limit(1)
    const timestamp = latest?.timestamp ?? null
    await tx
      .update(contacts)
      .set({
        lastTalkedAt: timestamp,
        dateLastTalked: timestamp == null ? null : formatDateStr(timestamp),
      })
      .where(eq(contacts.id, contactId))
  }
}

async function withSocialInteractions(mappedEntries: Entry[]): Promise<Entry[]> {
  const entryIds = mappedEntries.map((entry) => entry.id).filter((id) => Number.isInteger(id) && id > 0)
  if (entryIds.length === 0) return mappedEntries

  const interactionRows = await db()
    .select({
      entryId: contactInteractions.entryId,
      contactId: contactInteractions.contactId,
      contactName: contacts.name,
      method: contactInteractions.method,
      mood: contactInteractions.mood,
      moodImpact: contactInteractions.moodImpact,
      timestamp: contactInteractions.timestamp,
      notes: contactInteractions.notes,
    })
    .from(contactInteractions)
    .leftJoin(contacts, eq(contacts.id, contactInteractions.contactId))
    .where(inArray(contactInteractions.entryId, entryIds))

  const byEntry = new Map<number, SocialInteractionReadModel[]>()
  for (const row of interactionRows) {
    if (row.entryId == null) continue
    const contactName = row.contactName ?? null
    const interaction: SocialInteractionReadModel = {
      contactId: row.contactId,
      contactName,
      contactInitials: contactName ? getContactInitials(contactName) : null,
      method: row.method as SocialInteractionReadModel['method'],
      moodImpact: (row.moodImpact ?? row.mood ?? 'neutral') as SocialInteractionReadModel['moodImpact'],
      note: row.notes ?? null,
    }
    const list = byEntry.get(row.entryId) ?? []
    list.push(interaction)
    byEntry.set(row.entryId, list)
  }

  return mappedEntries.map((entry) => {
    const socialInteractions = byEntry.get(entry.id)
    return socialInteractions && socialInteractions.length > 0
      ? { ...entry, socialInteractions }
      : entry
  })
}

async function isGamingTracker(trackerId: number): Promise<boolean> {
  const [row] = await db()
    .select()
    .from(trackers)
    .where(eq(trackers.id, trackerId))
    .limit(1)

  if (!row) return false
  return getTrackerIdentity(mapTracker(row as Record<string, unknown>)) === 'gaming'
}

async function isBooksTracker(trackerId: number): Promise<boolean> {
  const [row] = await db()
    .select()
    .from(trackers)
    .where(eq(trackers.id, trackerId))
    .limit(1)

  if (!row) return false
  return getTrackerIdentity(mapTracker(row as Record<string, unknown>)) === 'books'
}

async function isFoodTracker(trackerId: number): Promise<boolean> {
  const [row] = await db()
    .select()
    .from(trackers)
    .where(eq(trackers.id, trackerId))
    .limit(1)

  if (!row) return false
  return getTrackerIdentity(mapTracker(row as Record<string, unknown>)) === 'diet'
}

async function isHealthTracker(trackerId: number): Promise<boolean> {
  const [row] = await db()
    .select()
    .from(trackers)
    .where(eq(trackers.id, trackerId))
    .limit(1)

  if (!row) return false
  return getTrackerIdentity(mapTracker(row as Record<string, unknown>)) === 'health'
}

async function isIntakeTracker(trackerId: number): Promise<boolean> {
  const [row] = await db()
    .select()
    .from(trackers)
    .where(eq(trackers.id, trackerId))
    .limit(1)

  if (!row) return false
  return getTrackerIdentity(mapTracker(row as Record<string, unknown>)) === 'intake'
}

const entryProjection = {
  id: entries.id,
  trackerId: entries.trackerId,
  value: entries.value,
  note: entries.note,
  metadata: entries.metadata,
  timestamp: entries.timestamp,
  dateStr: entries.dateStr,
  assetId: entries.assetId,
  gamingStructured: entryGaming.entryId,
  gameTitle: entryGaming.gameTitle,
  gameKey: entryGaming.gameKey,
  estimatedHours: entryGaming.estimatedHours,
  foodStructured: entryFood.entryId,
  foodName: entryFood.foodName,
  foodKey: entryFood.foodKey,
  calories: entryFood.calories,
  mealType: entryFood.mealType,
  healthStructured: entryHealth.entryId,
  symptomId: entryHealth.symptomId,
  symptomName: symptoms.name,
  symptomKey: symptoms.symptomKey,
  category: symptoms.category,
  severity: entryHealth.severity,
  intakeStructured: entryIntake.entryId,
  itemId: entryIntake.itemId,
  itemName: intakeItems.itemName,
  itemKey: intakeItems.itemKey,
  itemType: intakeItems.itemType,
  variant: intakeItems.variant,
  dosage: entryIntake.dosage,
  unit: entryIntake.unit,
  bookStructured: bookActivities.entryId,
  bookId: bookActivities.bookId,
  bookTitle: books.title,
  bookTitleKey: books.titleKey,
  bookActivityType: bookActivities.activityType,
}

export function registerEntryHandlers(): void {
  ipcMain.handle('get-entries', async (_, options?: { limit?: number; trackerId?: number }) => {
    try {
      const limit = options?.limit ?? 100
      const base = db()
        .select(entryProjection)
        .from(entries)
        .leftJoin(entryGaming, eq(entryGaming.entryId, entries.id))
        .leftJoin(entryFood, eq(entryFood.entryId, entries.id))
        .leftJoin(entryHealth, eq(entryHealth.entryId, entries.id))
        .leftJoin(entryIntake, eq(entryIntake.entryId, entries.id))
        .leftJoin(intakeItems, eq(intakeItems.id, entryIntake.itemId))
        .leftJoin(symptoms, eq(symptoms.id, entryHealth.symptomId))
        .leftJoin(bookActivities, eq(bookActivities.entryId, entries.id))
        .leftJoin(books, eq(bookActivities.bookId, books.id))
        .orderBy(desc(entries.timestamp))
        .limit(limit)
      const rows = options?.trackerId
        ? await db()
          .select(entryProjection)
          .from(entries)
          .leftJoin(entryGaming, eq(entryGaming.entryId, entries.id))
          .leftJoin(entryFood, eq(entryFood.entryId, entries.id))
          .leftJoin(entryHealth, eq(entryHealth.entryId, entries.id))
          .leftJoin(entryIntake, eq(entryIntake.entryId, entries.id))
          .leftJoin(intakeItems, eq(intakeItems.id, entryIntake.itemId))
          .leftJoin(symptoms, eq(symptoms.id, entryHealth.symptomId))
          .leftJoin(bookActivities, eq(bookActivities.entryId, entries.id))
          .leftJoin(books, eq(bookActivities.bookId, books.id))
          .where(eq(entries.trackerId, options.trackerId))
          .orderBy(desc(entries.timestamp))
          .limit(limit)
        : await base
      const mapped = rows.map((r) => mapEntry(r as Record<string, unknown>))
      const tagIdsByEntry = await getEntryTagIds(mapped.map((entry) => entry.id))
      return await withSocialInteractions(mapped.map((entry) => ({ ...entry, tagIds: tagIdsByEntry.get(entry.id) ?? [] })))
    } catch (e) {
      console.error('get-entries error:', e)
      return []
    }
  })

  ipcMain.handle('add-entry', async (_, data: BaseEntryRequest) => {
    try {
      if (await isGamingTracker(data.trackerId)) {
        throw new Error('Use add-gaming-entry for Gaming entries')
      }
      if (await isFoodTracker(data.trackerId)) {
        throw new Error('Use add-food-entry for Diet entries')
      }
      if (await isHealthTracker(data.trackerId)) {
        throw new Error('Use add-health-symptom-entry for Health entries')
      }
      if (await isIntakeTracker(data.trackerId)) {
        throw new Error('Use add-intake-entry for Vitamins & Medications entries')
      }
      const dateStr = formatDateStr(data.timestamp)
      const candidateEntry = mapEntry({
        id: 0,
        tracker_id: data.trackerId,
        value: data.value ?? null,
        note: data.note ?? null,
        metadata: data.metadata ?? {},
        timestamp: data.timestamp,
        date_str: dateStr,
        asset_id: data.assetId ?? null,
      } as Record<string, unknown>)
      const candidateBook = getBookLifecycleRecord(candidateEntry)
      const database = db()
      const inserted = await database.transaction(async (tx) => {
        if (candidateBook.action === 'read' && !candidateBook.legacy) {
          const rows = await tx
            .select({
              id: entries.id,
              trackerId: entries.trackerId,
              value: entries.value,
              note: entries.note,
              metadata: entries.metadata,
              timestamp: entries.timestamp,
              dateStr: entries.dateStr,
              assetId: entries.assetId,
              gamingStructured: entryGaming.entryId,
              gameTitle: entryGaming.gameTitle,
              gameKey: entryGaming.gameKey,
              estimatedHours: entryGaming.estimatedHours,
              intakeStructured: entryIntake.entryId,
              itemId: entryIntake.itemId,
              itemName: intakeItems.itemName,
              itemKey: intakeItems.itemKey,
              itemType: intakeItems.itemType,
              variant: intakeItems.variant,
              dosage: entryIntake.dosage,
              unit: entryIntake.unit,
              bookStructured: bookActivities.entryId,
              bookId: bookActivities.bookId,
              bookTitle: books.title,
              bookTitleKey: books.titleKey,
              bookActivityType: bookActivities.activityType,
            })
            .from(entries)
            .leftJoin(entryGaming, eq(entryGaming.entryId, entries.id))
            .leftJoin(entryIntake, eq(entryIntake.entryId, entries.id))
            .leftJoin(intakeItems, eq(intakeItems.id, entryIntake.itemId))
            .leftJoin(bookActivities, eq(bookActivities.entryId, entries.id))
            .leftJoin(books, eq(bookActivities.bookId, books.id))
            .where(and(eq(entries.trackerId, data.trackerId), eq(entries.dateStr, dateStr)))
            .orderBy(desc(entries.timestamp))

          const existing = rows
            .map((row) => mapEntry(row as Record<string, unknown>))
            .find((entry) => {
              const existingBook = getBookLifecycleRecord(entry)
              return existingBook.action === 'read' && !existingBook.legacy && existingBook.title === candidateBook.title
            })

          if (existing) {
            return existing.id
          }
        }

        const [row] = await tx
          .insert(entries)
          .values({
            trackerId: data.trackerId,
            value: data.value ?? null,
            note: data.note ?? null,
            metadata: JSON.stringify(data.metadata ?? {}),
            timestamp: data.timestamp,
            dateStr,
            assetId: data.assetId ?? null,
          })
          .returning()
        if (!row) return null
        const socialInteractions = normalizeSocialInteractions(data)
        if (socialInteractions.length > 0) {
          for (const interaction of socialInteractions) {
            await tx.insert(contactInteractions).values({
              contactId: interaction.contactId,
              entryId: row.id,
              mood: interaction.moodImpact,
              moodImpact: interaction.moodImpact,
              method: interaction.method,
              timestamp: data.timestamp,
              notes: interaction.notes,
            })
          }
          await refreshContactsLastTalked(tx, socialInteractions.map((interaction) => interaction.contactId))
        }
        await replaceEntryTags((row as { id: number }).id, data.tagIds, tx)
        return (row as { id: number }).id
      })
      if (inserted == null) return null
      const [row] = await db()
        .select()
        .from(entries)
        .where(eq(entries.id, inserted))
        .limit(1)
      if (!row) return null
      const mapped = mapEntry(row as Record<string, unknown>)
      const tagIdsByEntry = await getEntryTagIds([mapped.id])
      const [entryWithSocial] = await withSocialInteractions([{ ...mapped, tagIds: tagIdsByEntry.get(mapped.id) ?? [] }])
      return entryWithSocial ?? null
    } catch (e) {
      console.error('add-entry error:', e)
      return null
    }
  })

  ipcMain.handle('update-entry', async (_, id: number, updates: EntryUpdateRequest) => {
    try {
      const [existing] = await db()
        .select({
          trackerId: entries.trackerId,
          gamingStructured: entryGaming.entryId,
          foodStructured: entryFood.entryId,
          healthStructured: entryHealth.entryId,
          intakeStructured: entryIntake.entryId,
          bookStructured: bookActivities.entryId,
        })
        .from(entries)
        .leftJoin(entryGaming, eq(entryGaming.entryId, entries.id))
        .leftJoin(entryFood, eq(entryFood.entryId, entries.id))
        .leftJoin(entryHealth, eq(entryHealth.entryId, entries.id))
        .leftJoin(entryIntake, eq(entryIntake.entryId, entries.id))
        .leftJoin(bookActivities, eq(bookActivities.entryId, entries.id))
        .where(eq(entries.id, id))
        .limit(1)

      if (!existing) return null
      if (existing.gamingStructured && await isGamingTracker(existing.trackerId)) {
        throw new Error('Use update-gaming-entry for structured Gaming entries')
      }
      if (existing.foodStructured && await isFoodTracker(existing.trackerId)) {
        throw new Error('Use the Food flow for structured Diet entries')
      }
      if (existing.healthStructured && await isHealthTracker(existing.trackerId)) {
        throw new Error('Use the Health flow for structured Health entries')
      }
      if (existing.intakeStructured && await isIntakeTracker(existing.trackerId)) {
        throw new Error('Use the Vitamins & Medications flow for structured intake entries')
      }
      if (existing.bookStructured && await isBooksTracker(existing.trackerId)) {
        throw new Error('Use the Books flow for structured Books entries')
      }

      const set: Record<string, unknown> = {}
      if (updates.value !== undefined) set.value = updates.value
      if (updates.note !== undefined) set.note = updates.note
      if (updates.metadata !== undefined) set.metadata = JSON.stringify(updates.metadata)
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
        if (updates.socialInteractions !== undefined) {
          const existingContactRows = await tx
            .select({ contactId: contactInteractions.contactId })
            .from(contactInteractions)
            .where(eq(contactInteractions.entryId, id))
          const existingContactIds = toContactIdRows(existingContactRows).map((row) => row.contactId)
          await tx.delete(contactInteractions).where(eq(contactInteractions.entryId, id))
          const nextTimestamp = updates.timestamp ?? Number(existing.trackerId ? (await tx.select({ timestamp: entries.timestamp }).from(entries).where(eq(entries.id, id)).limit(1))[0]?.timestamp : Date.now())
          const socialInteractions = normalizeSocialInteractions(updates)
          for (const interaction of socialInteractions) {
            await tx.insert(contactInteractions).values({
              contactId: interaction.contactId,
              entryId: id,
              mood: interaction.moodImpact,
              moodImpact: interaction.moodImpact,
              method: interaction.method,
              timestamp: nextTimestamp,
              notes: interaction.notes,
            })
          }
          await refreshContactsLastTalked(tx, [
            ...existingContactIds,
            ...socialInteractions.map((interaction) => interaction.contactId),
          ])
        }
        await replaceEntryTags(id, updates.tagIds, tx)
        const [row] = await tx.select().from(entries).where(eq(entries.id, id))
        return row ?? null
      })
      if (!updated) return null
      const mapped = mapEntry(updated as Record<string, unknown>)
      const tagIdsByEntry = await getEntryTagIds([mapped.id])
      const [entryWithSocial] = await withSocialInteractions([{ ...mapped, tagIds: tagIdsByEntry.get(mapped.id) ?? [] }])
      return entryWithSocial ?? null
    } catch (e) {
      console.error('update-entry error:', e)
      return null
    }
  })

  ipcMain.handle('delete-entry', async (_, id: number) => {
    try {
      const [existing] = await db()
        .select({
          trackerId: entries.trackerId,
          gamingStructured: entryGaming.entryId,
          foodStructured: entryFood.entryId,
          healthStructured: entryHealth.entryId,
          intakeStructured: entryIntake.entryId,
          bookStructured: bookActivities.entryId,
        })
        .from(entries)
        .leftJoin(entryGaming, eq(entryGaming.entryId, entries.id))
        .leftJoin(entryFood, eq(entryFood.entryId, entries.id))
        .leftJoin(entryHealth, eq(entryHealth.entryId, entries.id))
        .leftJoin(entryIntake, eq(entryIntake.entryId, entries.id))
        .leftJoin(bookActivities, eq(bookActivities.entryId, entries.id))
        .where(eq(entries.id, id))
        .limit(1)

      if (existing?.gamingStructured && await isGamingTracker(existing.trackerId)) {
        throw new Error('Use delete-gaming-entry logic for structured Gaming entries')
      }
      if (existing?.foodStructured && await isFoodTracker(existing.trackerId)) {
        throw new Error('Use the Food flow for structured Diet entries')
      }
      if (existing?.healthStructured && await isHealthTracker(existing.trackerId)) {
        throw new Error('Use the Health flow for structured Health entries')
      }
      if (existing?.intakeStructured && await isIntakeTracker(existing.trackerId)) {
        throw new Error('Use the Vitamins & Medications flow for structured intake entries')
      }
      if (existing?.bookStructured && await isBooksTracker(existing.trackerId)) {
        throw new Error('Use the Books flow for structured Books entries')
      }

      const database = db()
      await database.transaction(async (tx) => {
        const linkedContactRows = await tx
          .select({ contactId: contactInteractions.contactId })
          .from(contactInteractions)
          .where(eq(contactInteractions.entryId, id))
        const linkedContactIds = toContactIdRows(linkedContactRows).map((row) => row.contactId)
        await tx.delete(contactInteractions).where(eq(contactInteractions.entryId, id))
        await tx.delete(entriesToTags).where(eq(entriesToTags.entryId, id))
        await tx.delete(entryGaming).where(eq(entryGaming.entryId, id))
        await tx.delete(entryIntake).where(eq(entryIntake.entryId, id))
        await tx.delete(bookActivities).where(eq(bookActivities.entryId, id))
        await tx.delete(entryWeight).where(eq(entryWeight.entryId, id))
        await tx.delete(entries).where(eq(entries.id, id))
        await refreshContactsLastTalked(tx, linkedContactIds)
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
        .select(entryProjection)
        .from(entries)
        .leftJoin(entryGaming, eq(entryGaming.entryId, entries.id))
        .leftJoin(entryFood, eq(entryFood.entryId, entries.id))
        .leftJoin(entryHealth, eq(entryHealth.entryId, entries.id))
        .leftJoin(entryIntake, eq(entryIntake.entryId, entries.id))
        .leftJoin(symptoms, eq(symptoms.id, entryHealth.symptomId))
        .leftJoin(bookActivities, eq(bookActivities.entryId, entries.id))
        .leftJoin(books, eq(bookActivities.bookId, books.id))
        .where(eq(entries.trackerId, trackerId))
        .orderBy(desc(entries.timestamp))
        .limit(limit)
      const mapped = rows.map((r) => mapEntry(r as Record<string, unknown>))
      const tagIdsByEntry = await getEntryTagIds(mapped.map((entry) => entry.id))
      return await withSocialInteractions(mapped.map((entry) => ({ ...entry, tagIds: tagIdsByEntry.get(entry.id) ?? [] })))
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
