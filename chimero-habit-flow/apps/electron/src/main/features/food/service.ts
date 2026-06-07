import { desc, eq } from 'drizzle-orm'
import { entries, entriesToTags, entryFood, trackers } from '@packages/db'
import { getDb } from '@packages/db/database'
import {
  buildFoodDetailReadModel,
  entryToFoodHistoryItem,
  normalizeFoodKey,
  normalizeFoodName,
  validateCaloriesOptional,
  validateMealType,
} from '@contracts/domain'
import type {
  CreateFoodEntryRequest,
  Entry,
  FoodDetailResponse,
  FoodEntryResponse,
  UpdateFoodEntryRequest,
} from '@contracts/contracts'
import { mapEntry, mapTracker } from '../../shared/mappers'
import { getEntryTagIds, getTags, replaceEntryTags } from '../tags/service'
import { getTrackerIdentity } from '@contracts/features/tracking'

function formatDateStr(timestamp: number): string {
  const date = new Date(timestamp)
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

async function isFoodTracker(trackerId: number): Promise<boolean> {
  const [row] = await getDb()
    .select()
    .from(trackers)
    .where(eq(trackers.id, trackerId))
    .limit(1)

  if (!row) return false
  return getTrackerIdentity(mapTracker(row as Record<string, unknown>)) === 'diet'
}

async function getFoodEntries(trackerId: number, limit = 365): Promise<Entry[]> {
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
      foodStructured: entryFood.entryId,
      foodName: entryFood.foodName,
      foodKey: entryFood.foodKey,
      calories: entryFood.calories,
      mealType: entryFood.mealType,
    })
    .from(entries)
    .leftJoin(entryFood, eq(entryFood.entryId, entries.id))
    .where(eq(entries.trackerId, trackerId))
    .orderBy(desc(entries.timestamp))
    .limit(limit)

  const mapped = rows.map((row) => mapEntry(row as Record<string, unknown>))
  const tagIdsByEntry = await getEntryTagIds(mapped.map((entry) => entry.id))
  return mapped.map((entry) => ({ ...entry, tagIds: tagIdsByEntry.get(entry.id) ?? [] }))
}

async function tagsForEntry(entryId: number) {
  const [allTags, tagIdsByEntry] = await Promise.all([getTags(), getEntryTagIds([entryId])])
  const tagIds = new Set(tagIdsByEntry.get(entryId) ?? [])
  return allTags.filter((tag) => tagIds.has(tag.id))
}

async function getFoodEntryById(entryId: number): Promise<FoodEntryResponse | null> {
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
      foodStructured: entryFood.entryId,
      foodName: entryFood.foodName,
      foodKey: entryFood.foodKey,
      calories: entryFood.calories,
      mealType: entryFood.mealType,
    })
    .from(entries)
    .leftJoin(entryFood, eq(entryFood.entryId, entries.id))
    .where(eq(entries.id, entryId))
    .limit(1)

  if (!row) return null
  const mapped = mapEntry(row as Record<string, unknown>)
  if (!mapped.food?.structured) return null

  return {
    entry: entryToFoodHistoryItem(mapped) as FoodEntryResponse['entry'],
    tags: await tagsForEntry(mapped.id),
  }
}

export async function addFoodEntry(data: CreateFoodEntryRequest): Promise<FoodEntryResponse | null> {
  if (!(await isFoodTracker(data.trackerId))) {
    throw new Error('Food entries can only be created for the Diet tracker')
  }

  const foodName = normalizeFoodName(data.foodName)
  if (!foodName) throw new Error('Food name is required')
  const foodKey = normalizeFoodKey(foodName)
  const calories = validateCaloriesOptional(data.calories)
  const mealType = validateMealType(data.mealType)
  const timestamp = Number(data.timestamp)
  if (!Number.isFinite(timestamp)) throw new Error('Timestamp must be finite')
  const dateStr = formatDateStr(timestamp)

  const database = getDb()
  const inserted = await database.transaction(async (tx) => {
    const [row] = await tx
      .insert(entries)
      .values({
        trackerId: data.trackerId,
        value: null,
        note: foodName,
        metadata: JSON.stringify({
          trackerKind: 'diet',
          food: { structured: true, foodName, foodKey, calories, mealType },
        }),
        timestamp,
        dateStr,
        assetId: data.assetId ?? null,
      })
      .returning()

    if (!row) return null
    const entryId = (row as { id: number }).id
    await tx.insert(entryFood).values({
      entryId,
      foodName,
      foodKey,
      calories,
      mealType,
    })
    await replaceEntryTags(entryId, data.tagIds, tx)
    return entryId
  })

  if (inserted == null) return null
  return getFoodEntryById(inserted)
}

export async function updateFoodEntry(entryId: number, updates: UpdateFoodEntryRequest): Promise<FoodEntryResponse | null> {
  const [existing] = await getDb()
    .select({
      trackerId: entries.trackerId,
      foodStructured: entryFood.entryId,
    })
    .from(entries)
    .leftJoin(entryFood, eq(entryFood.entryId, entries.id))
    .where(eq(entries.id, entryId))
    .limit(1)

  if (!existing?.foodStructured || !(await isFoodTracker(existing.trackerId))) {
    throw new Error('Structured Food entries can only be updated through the Food flow')
  }

  const entrySet: Record<string, unknown> = {}
  const foodSet: Record<string, unknown> = {}

  if (updates.foodName !== undefined) {
    const foodName = normalizeFoodName(updates.foodName)
    if (!foodName) throw new Error('Food name is required')
    entrySet.note = foodName
    foodSet.foodName = foodName
    foodSet.foodKey = normalizeFoodKey(foodName)
  }
  if (updates.calories !== undefined) {
    foodSet.calories = validateCaloriesOptional(updates.calories)
  }
  if (updates.mealType !== undefined) {
    foodSet.mealType = validateMealType(updates.mealType)
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
    if (Object.keys(foodSet).length > 0) {
      await tx.update(entryFood).set(foodSet).where(eq(entryFood.entryId, entryId))
    }
    await replaceEntryTags(entryId, updates.tagIds, tx)
  })

  return getFoodEntryById(entryId)
}

export async function deleteFoodEntry(entryId: number): Promise<boolean> {
  await getDb().transaction(async (tx) => {
    await tx.delete(entriesToTags).where(eq(entriesToTags.entryId, entryId))
    await tx.delete(entries).where(eq(entries.id, entryId))
  })
  return true
}

export async function getFoodDetail(trackerId: number, options?: { limit?: number }): Promise<FoodDetailResponse> {
  if (!(await isFoodTracker(trackerId))) {
    throw new Error('Food detail can only be read for the Diet tracker')
  }
  const historyEntries = await getFoodEntries(trackerId, options?.limit ?? 365)
  const tags = await getTags()
  return buildFoodDetailReadModel(historyEntries, tags)
}
