import { desc, eq } from 'drizzle-orm'
import { entries, entriesToTags, entryGaming, trackers } from '@packages/db'
import { getDb } from '@packages/db/database'
import { mapEntry, mapTracker } from '../../shared/mappers'
import { getEntryTagIds, getTags, replaceEntryTags } from '../tags/service'
import type {
  CreateGamingEntryRequest,
  GamingDetailResponse,
  GamingEntryResponse,
  GamingHistoryItem,
  UpdateGamingEntryRequest,
} from '@contracts/contracts'
import { buildGamingDetailReadModel, entryToGamingReadModel, normalizeGameKey, normalizeGamingTitle, validateEstimatedHours } from '@contracts/domain'
import { getTrackerIdentity } from '@contracts/features/tracking'

function formatDateStr(timestamp: number): string {
  const date = new Date(timestamp)
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

async function isGamingTracker(trackerId: number): Promise<boolean> {
  const [row] = await getDb()
    .select()
    .from(trackers)
    .where(eq(trackers.id, trackerId))
    .limit(1)

  if (!row) return false
  return getTrackerIdentity(mapTracker(row as Record<string, unknown>)) === 'gaming'
}

async function getGamingEntryRows(trackerId: number, limit = 365) {
  const rows = await getDb()
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
    })
    .from(entries)
    .leftJoin(entryGaming, eq(entryGaming.entryId, entries.id))
    .where(eq(entries.trackerId, trackerId))
    .orderBy(desc(entries.timestamp))
    .limit(limit)

  const mapped = rows.map((row) => mapEntry(row as Record<string, unknown>))
  const tagIdsByEntry = await getEntryTagIds(mapped.map((entry) => entry.id))
  return mapped.map((entry) => ({ ...entry, tagIds: tagIdsByEntry.get(entry.id) ?? [] }))
}

async function getGamingEntryById(entryId: number): Promise<GamingEntryResponse | null> {
  const [row] = await getDb()
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
    })
    .from(entries)
    .leftJoin(entryGaming, eq(entryGaming.entryId, entries.id))
    .where(eq(entries.id, entryId))
    .limit(1)

  if (!row) return null
  const mapped = mapEntry(row as Record<string, unknown>)
  const entry = entryToGamingReadModel(mapped)
  if (!entry.structured) return null
  const tags = await tagsForEntry(mapped.id)
  return {
    entry,
    tags,
  }
}

async function tagsForEntry(entryId: number) {
  const [allTags, tagIdsByEntry] = await Promise.all([getTags(), getEntryTagIds([entryId])])
  const tagIds = new Set(tagIdsByEntry.get(entryId) ?? [])
  return allTags.filter((tag) => tagIds.has(tag.id))
}

export async function addGamingEntry(data: CreateGamingEntryRequest): Promise<GamingEntryResponse | null> {
  if (!(await isGamingTracker(data.trackerId))) {
    throw new Error('Gaming entries can only be created for the Gaming tracker')
  }

  const gameTitle = normalizeGamingTitle(data.gameTitle)
  if (!gameTitle) throw new Error('Game title is required')
  const estimatedHours = validateEstimatedHours(data.estimatedHours)
  const gameKey = normalizeGameKey(gameTitle)
  const timestamp = Number(data.timestamp)
  if (!Number.isFinite(timestamp)) throw new Error('Timestamp must be finite')

  const database = getDb()
  const inserted = await database.transaction(async (tx) => {
    const [row] = await tx
      .insert(entries)
      .values({
        trackerId: data.trackerId,
        value: null,
        note: gameTitle,
        metadata: JSON.stringify({ trackerKind: 'gaming' }),
        timestamp,
        dateStr: formatDateStr(timestamp),
        assetId: data.assetId ?? null,
      })
      .returning()

    if (!row) return null
    const entryId = (row as { id: number }).id
    await tx.insert(entryGaming).values({
      entryId,
      gameTitle,
      gameKey,
      estimatedHours,
    })
    await replaceEntryTags(entryId, data.tagIds, tx)
    return entryId
  })

  if (!inserted) return null
  return getGamingEntryById(inserted)
}

export async function updateGamingEntry(entryId: number, updates: UpdateGamingEntryRequest): Promise<GamingEntryResponse | null> {
  const [existing] = await getDb()
    .select({
      trackerId: entries.trackerId,
      gamingStructured: entryGaming.entryId,
    })
    .from(entries)
    .leftJoin(entryGaming, eq(entryGaming.entryId, entries.id))
    .where(eq(entries.id, entryId))
    .limit(1)

  if (!existing?.gamingStructured || !(await isGamingTracker(existing.trackerId))) {
    throw new Error('Structured Gaming entries can only be updated through the Gaming flow')
  }

  const entrySet: Record<string, unknown> = {}
  const gamingSet: Record<string, unknown> = {}

  if (updates.gameTitle !== undefined) {
    const gameTitle = normalizeGamingTitle(updates.gameTitle)
    if (!gameTitle) throw new Error('Game title is required')
    entrySet.note = gameTitle
    gamingSet.gameTitle = gameTitle
    gamingSet.gameKey = normalizeGameKey(gameTitle)
  }
  if (updates.estimatedHours !== undefined) {
    gamingSet.estimatedHours = validateEstimatedHours(updates.estimatedHours)
  }
  if (updates.assetId !== undefined) entrySet.assetId = updates.assetId
  if (updates.timestamp !== undefined) {
    const timestamp = Number(updates.timestamp)
    if (!Number.isFinite(timestamp)) throw new Error('Timestamp must be finite')
    entrySet.timestamp = timestamp
    entrySet.dateStr = formatDateStr(timestamp)
  }

  const database = getDb()
  await database.transaction(async (tx) => {
    if (Object.keys(entrySet).length > 0) {
      await tx.update(entries).set(entrySet).where(eq(entries.id, entryId))
    }
    if (Object.keys(gamingSet).length > 0) {
      await tx.update(entryGaming).set(gamingSet).where(eq(entryGaming.entryId, entryId))
    }
    await replaceEntryTags(entryId, updates.tagIds, tx)
  })

  return getGamingEntryById(entryId)
}

export async function deleteGamingEntryData(entryId: number): Promise<boolean> {
  const database = getDb()
  await database.transaction(async (tx) => {
    await tx.delete(entriesToTags).where(eq(entriesToTags.entryId, entryId))
    await tx.delete(entryGaming).where(eq(entryGaming.entryId, entryId))
    await tx.delete(entries).where(eq(entries.id, entryId))
  })
  return true
}

export async function getGamingDetail(trackerId: number, options?: { limit?: number }): Promise<GamingDetailResponse> {
  const historyEntries = await getGamingEntryRows(trackerId, options?.limit ?? 365)
  return buildGamingDetailReadModel(historyEntries)
}

export async function getGamingHistory(trackerId: number, limit = 365): Promise<GamingHistoryItem[]> {
  const historyEntries = await getGamingEntryRows(trackerId, limit)
  return historyEntries.map((entry) => entryToGamingReadModel(entry))
}

export async function getGamingWidgetEntries(trackerId: number, limit = 365) {
  return getGamingEntryRows(trackerId, limit)
}
