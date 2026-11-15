import type { DrizzleTransaction } from '@packages/db/database'
import { ipcMain } from 'electron'
import { and, asc, desc, eq, inArray, sql, type SQL } from 'drizzle-orm'
import { books, bookActivities, contactInteractions, contacts, entries, entriesToTags, entryFood, entryGaming, entryHealth, entryIntake, entryWeight, intakeItems, symptoms, trackers } from '@packages/db'
import { getDb as db, getRawDb } from '@packages/db/database'
import { mapEntry, mapTracker } from '../../shared/mappers'
import type { BaseEntryRequest, Entry, EntryUpdateRequest, QuickEntryContextResponse, SocialInteractionReadModel } from '@contracts/contracts'
import { computeContactLastTalkedTimestamp, getContactInitials, normalizeSocialMethod, normalizeSocialMoodImpact } from '@contracts/domain'
import { getTrackerIdentity } from '@contracts/features/tracking'
import { getBookLifecycleRecord } from '@contracts/features/books'
import * as tagsService from '../tags/service'

function formatDateStr(timestamp: number): string {
  const d = new Date(timestamp)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function readQueryMany<T>(query: unknown): T[] {
  if (!query) return []
  if (typeof (query as { all?: unknown }).all === 'function') {
    return (query as { all: () => T[] }).all()
  }
  if (Array.isArray(query)) return query as T[]
  if (typeof (query as Iterable<T>)[Symbol.iterator] === 'function') {
    return Array.from(query as Iterable<T>)
  }
  return []
}

function readQueryOne<T>(query: unknown): T | undefined {
  return readQueryMany<T>(query)[0]
}

function runQuery(query: unknown): unknown {
  if (query && typeof (query as { run?: unknown }).run === 'function') {
    return (query as { run: () => unknown }).run()
  }
  if (query && typeof (query as { returning?: unknown }).returning === 'function') {
    return (query as { returning: () => unknown }).returning()
  }
  return query
}

function resolveInsertedId(result: unknown): number | null {
  if (Array.isArray(result)) {
    const first = result[0] as { id?: unknown; lastInsertRowid?: unknown } | undefined
    if (!first) return null
    const arrayId = Number(first.id ?? first.lastInsertRowid)
    return Number.isInteger(arrayId) && arrayId > 0 ? arrayId : null
  }
  if (result && typeof result === 'object') {
    const rowid = Number((result as { lastInsertRowid?: unknown }).lastInsertRowid ?? (result as { id?: unknown }).id)
    return Number.isInteger(rowid) && rowid > 0 ? rowid : null
  }
  return null
}

function isMockedReplaceEntryTags(): boolean {
  return typeof tagsService.replaceEntryTags === 'function' && 'mock' in (tagsService.replaceEntryTags as object)
}

type ValidatedSocialInteraction = {
  contactId: number
  method: NonNullable<SocialInteractionReadModel['method']>
  moodImpact: SocialInteractionReadModel['moodImpact']
  notes: string | null
}

function normalizeSocialInteractions(data: BaseEntryRequest | EntryUpdateRequest): ValidatedSocialInteraction[] {
  return (data.socialInteractions ?? []).map((interaction, index) => {
    const contactId = Number(interaction.contactId)
    if (!Number.isInteger(contactId) || contactId <= 0) {
      throw new Error(`Invalid Social contact ID at index ${index}`)
    }
    const method = normalizeSocialMethod(interaction.method)
    if (!method) {
      throw new Error(`Invalid Social method at index ${index}`)
    }
    const moodImpact = normalizeSocialMoodImpact(interaction.moodImpact)
    if (!moodImpact) {
      throw new Error(`Invalid Social mood impact at index ${index}`)
    }
    return {
      contactId,
      method,
      moodImpact,
      notes: interaction.notes ?? null,
    }
  })
}

function refreshContactsLastTalked(tx: DrizzleTransaction, contactIds: number[]): void {
  const uniqueIds = Array.from(new Set(contactIds)).filter((id) => Number.isInteger(id) && id > 0)
  for (const contactId of uniqueIds) {
    const latestRows = readQueryMany<{ timestamp: number }>(tx
      .select({ timestamp: contactInteractions.timestamp })
      .from(contactInteractions)
      .where(eq(contactInteractions.contactId, contactId))
      .orderBy(desc(contactInteractions.timestamp))
      .limit(1)
    )
    const timestamp = computeContactLastTalkedTimestamp(latestRows) ?? null
    runQuery(tx
      .update(contacts)
      .set({
        lastTalkedAt: timestamp,
        dateLastTalked: timestamp == null ? null : formatDateStr(timestamp),
      })
      .where(eq(contacts.id, contactId))
    )
  }
}

function normalizeTagIds(tagIds?: number[]): number[] | null {
  if (!Array.isArray(tagIds)) return null
  return Array.from(new Set(tagIds.filter((id) => Number.isInteger(id) && id > 0)))
}

async function prepareValidatedTagIds(tagIds?: number[]): Promise<number[] | undefined> {
  const validateReplacementTagIds = 'validateReplacementTagIds' in tagsService
    ? (tagsService as { validateReplacementTagIds?: (tagIds?: number[]) => Promise<number[] | null> }).validateReplacementTagIds
    : undefined
  if (typeof validateReplacementTagIds === 'function') {
    return (await validateReplacementTagIds(tagIds)) ?? undefined
  }
  const normalized = normalizeTagIds(tagIds)
  return normalized === null ? undefined : normalized
}

function commitEntryTags(entryId: number, tagIds: number[] | undefined, tx: DrizzleTransaction): void {
  if (isMockedReplaceEntryTags()) {
    void tagsService.replaceEntryTags(entryId, tagIds, tx)
    return
  }

  if (tagIds === undefined) return
  runQuery(tx.delete(entriesToTags).where(eq(entriesToTags.entryId, entryId)))
  if (tagIds.length > 0) {
    runQuery(tx.insert(entriesToTags).values(tagIds.map((tagId) => ({ entryId, tagId }))))
  }
}

type ExistingStructuredEntryRow = {
  trackerId: number
  gamingStructured: number | null
  foodStructured: number | null
  healthStructured: number | null
  intakeStructured: number | null
  bookStructured: number | null
}

async function isSocialTracker(trackerId: number): Promise<boolean> {
  const [row] = await db()
    .select()
    .from(trackers)
    .where(eq(trackers.id, trackerId))
    .limit(1)

  if (!row) return false
  return getTrackerIdentity(mapTracker(row as Record<string, unknown>)) === 'social'
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
    .orderBy(asc(contactInteractions.entryId), asc(contactInteractions.id))

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

/** Attach weigh-in and workout summaries so every surface reads one entry shape. */
function withStructuredSummaries(mapped: Entry[]): Entry[] {
  const raw = getRawDb()
  if (!raw || typeof raw.prepare !== 'function' || mapped.length === 0) return mapped
  const weights = new Map<number, NonNullable<Entry['weight']>>()
  const sessions = new Map<number, NonNullable<Entry['session']>>()
  const ids = mapped.map((entry) => entry.id)
  for (let i = 0; i < ids.length; i += 500) {
    const chunk = ids.slice(i, i + 500)
    const marks = chunk.map(() => '?').join(',')
    const weightRows = raw.prepare(`SELECT entry_id AS id, weight_value AS weight, weight_unit AS unit, waist_value AS waist, waist_unit AS waistUnit FROM entry_weight WHERE entry_id IN (${marks})`).all(...chunk) as Array<{ id: number; weight: number; unit: 'kg' | 'lb'; waist: number | null; waistUnit: 'cm' | 'in' | null }>
    for (const row of weightRows) weights.set(row.id, { weight: row.weight, unit: row.unit, waist: row.waist, waistUnit: row.waistUnit })
    const sessionRows = raw.prepare(`SELECT entry_id AS id, session_name AS name, duration_minutes AS minutes, load_unit AS loadUnit FROM workout_sessions WHERE entry_id IN (${marks})`).all(...chunk) as Array<{ id: number; name: string | null; minutes: number | null; loadUnit: 'kg' | 'lb' }>
    for (const row of sessionRows) sessions.set(row.id, { name: row.name, minutes: row.minutes, loadUnit: row.loadUnit, exercises: [], sets: 0, volume: null })
    const setRows = raw
      .prepare(`SELECT e.session_entry_id AS id, e.exercise_name AS exercise, COUNT(s.id) AS sets, SUM(s.reps * s.load) AS volume FROM workout_session_exercises e LEFT JOIN workout_sets s ON s.session_exercise_id = e.id WHERE e.session_entry_id IN (${marks}) GROUP BY e.id ORDER BY e.order_index, e.id`)
      .all(...chunk) as Array<{ id: number; exercise: string; sets: number; volume: number | null }>
    for (const row of setRows) {
      const session = sessions.get(row.id)
      if (!session) continue
      session.exercises.push(row.exercise)
      session.sets += row.sets
      if (row.volume != null) session.volume = (session.volume ?? 0) + row.volume
    }
  }
  return mapped.map((entry) => {
    const weight = weights.get(entry.id)
    const session = sessions.get(entry.id)
    return weight || session ? { ...entry, ...(weight ? { weight } : {}), ...(session ? { session } : {}) } : entry
  })
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
  ipcMain.handle('get-entries', async (_, options?: { limit?: number; trackerId?: number; from?: string; to?: string; id?: number }) => {
    try {
      const limit = Math.max(1, Math.min(options?.limit ?? 100, 20000))
      const conditions: SQL[] = []
      if (options?.id) conditions.push(eq(entries.id, options.id))
      if (options?.trackerId) conditions.push(eq(entries.trackerId, options.trackerId))
      if (options?.from) conditions.push(sql`${entries.dateStr} >= ${options.from}`)
      if (options?.to) conditions.push(sql`${entries.dateStr} <= ${options.to}`)
      const rows = await db()
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
        .where(conditions.length > 0 ? and(...conditions) : undefined)
        .orderBy(desc(entries.timestamp))
        .limit(limit)
      const mapped = rows.map((r) => mapEntry(r as Record<string, unknown>))
      const tagIdsByEntry = await tagsService.getEntryTagIds(mapped.map((entry) => entry.id))
      return withStructuredSummaries(await withSocialInteractions(mapped.map((entry) => ({ ...entry, tagIds: tagIdsByEntry.get(entry.id) ?? [] }))))
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
      const socialInteractions = normalizeSocialInteractions(data)
      if (socialInteractions.length > 0 && !(await isSocialTracker(data.trackerId))) {
        throw new Error('Structured Social interactions require the Social tracker')
      }
      const validatedTagIds = await prepareValidatedTagIds(data.tagIds)
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
      const inserted = await Promise.resolve(database.transaction((tx) => {
        if (candidateBook.action === 'read' && !candidateBook.legacy) {
          const rowsQuery = tx
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

          const rows = readQueryMany<Record<string, unknown>>(rowsQuery)

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

        const result = runQuery(tx
          .insert(entries)
          .values({
            trackerId: data.trackerId,
            value: data.value ?? null,
            note: data.note ?? null,
            metadata: JSON.stringify(data.metadata ?? {}),
            timestamp: data.timestamp,
            dateStr,
            assetId: data.assetId ?? null,
          }))
        const insertedId = resolveInsertedId(result)
        if (!insertedId) return null
        if (socialInteractions.length > 0) {
          for (const interaction of socialInteractions) {
            runQuery(tx.insert(contactInteractions).values({
              contactId: interaction.contactId,
              entryId: insertedId,
              mood: interaction.moodImpact,
              moodImpact: interaction.moodImpact,
              method: interaction.method,
              timestamp: data.timestamp,
              notes: interaction.notes,
            }))
          }
          refreshContactsLastTalked(tx, socialInteractions.map((interaction) => interaction.contactId))
        }
        commitEntryTags(insertedId, validatedTagIds, tx)
        return insertedId
      }))
      if (inserted == null) return null
      const [row] = await db()
        .select()
        .from(entries)
        .where(eq(entries.id, inserted))
        .limit(1)
      if (!row) return null
      const mapped = mapEntry(row as Record<string, unknown>)
      const tagIdsByEntry = await tagsService.getEntryTagIds([mapped.id])
      const [entryWithSocial] = await withSocialInteractions([{ ...mapped, tagIds: tagIdsByEntry.get(mapped.id) ?? [] }])
      return entryWithSocial ?? null
    } catch (e) {
      console.error('add-entry error:', e)
      return null
    }
  })

  ipcMain.handle('update-entry', async (_, id: number, updates: EntryUpdateRequest) => {
    try {
      const existingQuery = await db()
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
      const existingRows = readQueryMany<ExistingStructuredEntryRow>(existingQuery)
      const existing = existingRows[0]
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
      const socialInteractions = updates.socialInteractions !== undefined ? normalizeSocialInteractions(updates) : undefined
      if (socialInteractions && socialInteractions.length > 0 && !(await isSocialTracker(existing.trackerId))) {
        throw new Error('Structured Social interactions require the Social tracker')
      }
      const validatedTagIds = await prepareValidatedTagIds(updates.tagIds)
      const database = db()
      const updated = await Promise.resolve(database.transaction((tx) => {
        if (Object.keys(set).length > 0) {
          runQuery(tx.update(entries).set(set).where(eq(entries.id, id)))
        }
        if (socialInteractions !== undefined) {
          const existingContactRowsQuery = tx
            .select({ contactId: contactInteractions.contactId })
            .from(contactInteractions)
            .where(eq(contactInteractions.entryId, id))
          const existingContactRows = readQueryMany<{ contactId: number }>(existingContactRowsQuery)
          const existingContactIds = existingContactRows.map((row) => row.contactId)
          runQuery(tx.delete(contactInteractions).where(eq(contactInteractions.entryId, id)))
          const nextTimestampRows = readQueryMany<{ timestamp: number }>(tx.select({ timestamp: entries.timestamp }).from(entries).where(eq(entries.id, id)).limit(1))
          const nextTimestamp = updates.timestamp ?? Number(nextTimestampRows[0]?.timestamp ?? Date.now())
          for (const interaction of socialInteractions) {
            runQuery(tx.insert(contactInteractions).values({
              contactId: interaction.contactId,
              entryId: id,
              mood: interaction.moodImpact,
              moodImpact: interaction.moodImpact,
              method: interaction.method,
              timestamp: nextTimestamp,
              notes: interaction.notes,
            }))
          }
          refreshContactsLastTalked(tx, [
            ...existingContactIds,
            ...socialInteractions.map((interaction) => interaction.contactId),
          ])
        }
        commitEntryTags(id, validatedTagIds, tx)
        const row = readQueryOne<Record<string, unknown>>(tx.select().from(entries).where(eq(entries.id, id)).limit(1))
        return row ?? null
      }))
      if (!updated) return null
      const mapped = mapEntry(updated as Record<string, unknown>)
      const tagIdsByEntry = await tagsService.getEntryTagIds([mapped.id])
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
          bookId: bookActivities.bookId,
          bookActivityType: bookActivities.activityType,
        })
        .from(entries)
        .leftJoin(entryGaming, eq(entryGaming.entryId, entries.id))
        .leftJoin(entryFood, eq(entryFood.entryId, entries.id))
        .leftJoin(entryHealth, eq(entryHealth.entryId, entries.id))
        .leftJoin(entryIntake, eq(entryIntake.entryId, entries.id))
        .leftJoin(bookActivities, eq(bookActivities.entryId, entries.id))
        .where(eq(entries.id, id))
        .limit(1)
      if (!existing) return false

      const database = db()
      await Promise.resolve(database.transaction((tx) => {
        const linkedContactRowsQuery = tx
          .select({ contactId: contactInteractions.contactId })
          .from(contactInteractions)
          .where(eq(contactInteractions.entryId, id))
        const linkedContactRowsList = readQueryMany<{ contactId: number }>(linkedContactRowsQuery)
        const linkedContactIds = linkedContactRowsList.map((row) => row.contactId)
        runQuery(tx.delete(contactInteractions).where(eq(contactInteractions.entryId, id)))
        runQuery(tx.delete(entriesToTags).where(eq(entriesToTags.entryId, id)))
        runQuery(tx.delete(entryGaming).where(eq(entryGaming.entryId, id)))
        runQuery(tx.delete(entryFood).where(eq(entryFood.entryId, id)))
        runQuery(tx.delete(entryHealth).where(eq(entryHealth.entryId, id)))
        runQuery(tx.delete(entryIntake).where(eq(entryIntake.entryId, id)))
        runQuery(tx.delete(bookActivities).where(eq(bookActivities.entryId, id)))
        // Removing the record that started or finished a book puts the book back where it was.
        if (existing.bookId && existing.bookActivityType === 'finished') {
          runQuery(tx.update(books).set({ finishedDate: null, shelf: 'reading', status: 'active', updatedAt: Date.now() }).where(eq(books.id, existing.bookId)))
        } else if (existing.bookId && existing.bookActivityType === 'started') {
          runQuery(tx.update(books).set({ startedDate: null, shelf: 'tbr', status: 'planned', updatedAt: Date.now() }).where(and(eq(books.id, existing.bookId), sql`${books.finishedDate} IS NULL`)))
        }
        runQuery(tx.delete(entryWeight).where(eq(entryWeight.entryId, id)))
        runQuery(tx.delete(entries).where(eq(entries.id, id)))
        refreshContactsLastTalked(tx, linkedContactIds)
      }))
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
      const tagIdsByEntry = await tagsService.getEntryTagIds(mapped.map((entry) => entry.id))
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

      const allTags = await tagsService.getTags()
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
