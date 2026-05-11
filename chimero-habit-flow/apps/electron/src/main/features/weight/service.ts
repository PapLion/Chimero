import { and, desc, eq } from 'drizzle-orm'
import { entries, entriesToTags, entryWeight, trackerGoals } from '@packages/db'
import { getDb } from '@packages/db/database'
import { calculateWeightDetail } from '@contracts/domain'
import type {
  CreateWeightEntryRequest,
  SetTrackerGoalRequest,
  Tag,
  TrackerGoal,
  UpdateWeightEntryRequest,
  WeightDetailResponse,
  WeightEntry,
  WeightEntryResponse,
} from '@contracts/contracts'
import { mapTrackerGoal, mapWeightEntry } from '../../shared/mappers'
import { getEntryTagIds, getTags, replaceEntryTags } from '../tags/service'

function formatDateStr(timestamp: number): string {
  const date = new Date(timestamp)
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

function assertFiniteNumber(value: number, label: string): void {
  if (!Number.isFinite(value)) {
    throw new Error(`${label} must be a finite number`)
  }
}

async function tagsForEntry(entryId: number): Promise<Tag[]> {
  const [allTags, tagIdsByEntry] = await Promise.all([getTags(), getEntryTagIds([entryId])])
  const tagIds = new Set(tagIdsByEntry.get(entryId) ?? [])
  return allTags.filter((tag) => tagIds.has(tag.id))
}

async function getWeightEntryById(entryId: number): Promise<WeightEntry | null> {
  const [row] = await getDb()
    .select({
      entryId: entries.id,
      trackerId: entries.trackerId,
      note: entries.note,
      timestamp: entries.timestamp,
      dateStr: entries.dateStr,
      assetId: entries.assetId,
      weightValue: entryWeight.weightValue,
      weightUnit: entryWeight.weightUnit,
      waistValue: entryWeight.waistValue,
      waistUnit: entryWeight.waistUnit,
      bodyFatPercentage: entryWeight.bodyFatPercentage,
    })
    .from(entryWeight)
    .innerJoin(entries, eq(entryWeight.entryId, entries.id))
    .where(eq(entries.id, entryId))

  if (!row) return null
  const weightEntry = mapWeightEntry(row as Record<string, unknown>)
  const tagIdsByEntry = await getEntryTagIds([weightEntry.entryId])
  return { ...weightEntry, tagIds: tagIdsByEntry.get(weightEntry.entryId) ?? [] }
}

export async function addWeightEntry(data: CreateWeightEntryRequest): Promise<WeightEntryResponse | null> {
  assertFiniteNumber(data.weight, 'Weight')
  if (data.waist !== undefined && data.waist !== null) assertFiniteNumber(data.waist, 'Waist')
  if (data.bodyFatPercentage !== undefined && data.bodyFatPercentage !== null) assertFiniteNumber(data.bodyFatPercentage, 'Body fat percentage')

  const database = getDb()
  const dateStr = formatDateStr(data.timestamp)
  const inserted = await database.transaction(async (tx) => {
    const [row] = await tx
      .insert(entries)
      .values({
        trackerId: data.trackerId,
        value: data.weight,
        note: data.note ?? null,
        metadata: JSON.stringify({
          trackerKind: 'weight',
          weightUnit: data.weightUnit,
          waist: data.waist ?? null,
          waistUnit: data.waistUnit ?? null,
          bodyFatPercentage: data.bodyFatPercentage ?? null,
        }),
        timestamp: data.timestamp,
        dateStr,
        assetId: data.assetId ?? null,
      })
      .returning()

    if (!row) return null
    const entryId = (row as { id: number }).id

    await tx.insert(entryWeight).values({
      entryId,
      weightValue: data.weight,
      weightUnit: data.weightUnit,
      waistValue: data.waist ?? null,
      waistUnit: data.waistUnit ?? null,
      bodyFatPercentage: data.bodyFatPercentage ?? null,
    })
    await replaceEntryTags(entryId, data.tagIds, tx)
    return row
  })
  if (!inserted) return null
  const entryId = (inserted as { id: number }).id

  const entry = await getWeightEntryById(entryId)
  if (!entry) return null
  return { entry, tags: await tagsForEntry(entryId) }
}

export async function updateWeightEntry(entryId: number, updates: UpdateWeightEntryRequest): Promise<WeightEntryResponse | null> {
  const entrySet: Record<string, unknown> = {}
  const weightSet: Record<string, unknown> = {}

  if (updates.weight !== undefined) {
    assertFiniteNumber(updates.weight, 'Weight')
    entrySet.value = updates.weight
    weightSet.weightValue = updates.weight
  }
  if (updates.weightUnit !== undefined) weightSet.weightUnit = updates.weightUnit
  if (updates.waist !== undefined) {
    if (updates.waist !== null) assertFiniteNumber(updates.waist, 'Waist')
    weightSet.waistValue = updates.waist
  }
  if (updates.waistUnit !== undefined) weightSet.waistUnit = updates.waistUnit
  if (updates.bodyFatPercentage !== undefined) {
    if (updates.bodyFatPercentage !== null) assertFiniteNumber(updates.bodyFatPercentage, 'Body fat percentage')
    weightSet.bodyFatPercentage = updates.bodyFatPercentage
  }
  if (updates.note !== undefined) entrySet.note = updates.note
  if (updates.assetId !== undefined) entrySet.assetId = updates.assetId
  if (updates.timestamp !== undefined) {
    entrySet.timestamp = updates.timestamp
    entrySet.dateStr = formatDateStr(updates.timestamp)
  }

  const database = getDb()
  await database.transaction(async (tx) => {
    if (Object.keys(entrySet).length > 0) {
      await tx.update(entries).set(entrySet).where(eq(entries.id, entryId))
    }

    if (Object.keys(weightSet).length > 0) {
      await tx.update(entryWeight).set(weightSet).where(eq(entryWeight.entryId, entryId))
    }

    await replaceEntryTags(entryId, updates.tagIds, tx)
  })

  const entry = await getWeightEntryById(entryId)
  if (!entry) return null
  return { entry, tags: await tagsForEntry(entryId) }
}

export async function deleteWeightEntry(entryId: number): Promise<boolean> {
  const database = getDb()
  await database.transaction(async (tx) => {
    await tx.delete(entriesToTags).where(eq(entriesToTags.entryId, entryId))
    await tx.delete(entryWeight).where(eq(entryWeight.entryId, entryId))
    await tx.delete(entries).where(eq(entries.id, entryId))
  })
  return true
}

export async function getWeightHistory(trackerId: number, limit = 365): Promise<WeightEntry[]> {
  const rows = await getDb()
    .select({
      entryId: entries.id,
      trackerId: entries.trackerId,
      note: entries.note,
      timestamp: entries.timestamp,
      dateStr: entries.dateStr,
      assetId: entries.assetId,
      weightValue: entryWeight.weightValue,
      weightUnit: entryWeight.weightUnit,
      waistValue: entryWeight.waistValue,
      waistUnit: entryWeight.waistUnit,
      bodyFatPercentage: entryWeight.bodyFatPercentage,
    })
    .from(entryWeight)
    .innerJoin(entries, eq(entryWeight.entryId, entries.id))
    .where(eq(entries.trackerId, trackerId))
    .orderBy(desc(entries.timestamp))
    .limit(limit)

  const history = rows.map((row) => mapWeightEntry(row as Record<string, unknown>))
  const tagIdsByEntry = await getEntryTagIds(history.map((entry) => entry.entryId))
  return history.map((entry) => ({ ...entry, tagIds: tagIdsByEntry.get(entry.entryId) ?? [] }))
}

export async function getWeightGoal(trackerId: number): Promise<TrackerGoal | null> {
  const [goal] = await getDb()
    .select()
    .from(trackerGoals)
    .where(and(eq(trackerGoals.trackerId, trackerId), eq(trackerGoals.active, true)))
    .orderBy(desc(trackerGoals.createdAt))
    .limit(1)

  return goal ? mapTrackerGoal(goal as Record<string, unknown>) : null
}

export async function setWeightGoal(data: SetTrackerGoalRequest): Promise<TrackerGoal | null> {
  assertFiniteNumber(data.targetValue, 'Target value')
  const now = Date.now()
  const database = getDb()

  await database.transaction(async (tx) => {
    if (data.active ?? true) {
      await tx
        .update(trackerGoals)
        .set({ active: false, updatedAt: now })
        .where(eq(trackerGoals.trackerId, data.trackerId))
    }
    await tx.insert(trackerGoals).values({
      trackerId: data.trackerId,
      goalType: data.goalType,
      targetValue: data.targetValue,
      unit: data.unit ?? null,
      direction: data.direction ?? null,
      startDate: data.startDate ?? null,
      targetDate: data.targetDate ?? null,
      active: data.active ?? true,
      createdAt: now,
      updatedAt: now,
    })
  })

  return getWeightGoal(data.trackerId)
}

export async function getWeightDetail(trackerId: number, options?: { limit?: number }): Promise<WeightDetailResponse> {
  const [history, activeGoal] = await Promise.all([
    getWeightHistory(trackerId, options?.limit ?? 365),
    getWeightGoal(trackerId),
  ])
  return calculateWeightDetail(history, activeGoal)
}
