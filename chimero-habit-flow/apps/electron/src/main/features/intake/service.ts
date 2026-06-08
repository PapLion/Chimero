import { and, desc, eq } from 'drizzle-orm'
import { entries, entriesToTags, entryIntake, intakeItems, trackers } from '@packages/db'
import { getDb } from '@packages/db/database'
import {
  buildIntakeDetailReadModel,
  buildIntakeHomeWidgetReadModel,
  entryToIntakeHistoryItem,
  normalizeIntakeItemKey,
  normalizeIntakeItemName,
  normalizeIntakeItemVariant,
  validateDosageOptional,
  validateIntakeItemType,
  validateUnitOptional,
} from '@contracts/domain'
import type {
  CreateIntakeEntryRequest,
  Entry,
  IntakeDetailResponse,
  IntakeEntryResponse,
  IntakeHomeWidgetReadModel,
  UpdateIntakeEntryRequest,
} from '@contracts/contracts'
import { mapEntry, mapTracker } from '../../shared/mappers'
import { getEntryTagIds, getTags, replaceEntryTags } from '../tags/service'
import { getTrackerIdentity } from '@contracts/features/tracking'

function formatDateStr(timestamp: number): string {
  const date = new Date(timestamp)
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

async function isIntakeTracker(trackerId: number): Promise<boolean> {
  const [row] = await getDb()
    .select()
    .from(trackers)
    .where(eq(trackers.id, trackerId))
    .limit(1)

  if (!row) return false
  return getTrackerIdentity(mapTracker(row as Record<string, unknown>)) === 'intake'
}

async function findOrCreateItem(
  tx: any,
  trackerId: number,
  itemName: string,
  itemType: ReturnType<typeof validateIntakeItemType>,
  variant: string | null,
): Promise<number> {
  const itemKey = normalizeIntakeItemKey(itemName, itemType, variant)
  const [existing] = await tx
    .select()
    .from(intakeItems)
    .where(and(eq(intakeItems.trackerId, trackerId), eq(intakeItems.itemKey, itemKey)))
    .limit(1)

  if (existing) {
    const set: Record<string, unknown> = {}
    if (existing.itemName !== itemName) set.itemName = itemName
    if (existing.itemType !== itemType) set.itemType = itemType
    if ((existing.variant ?? null) !== variant) set.variant = variant
    if (Object.keys(set).length > 0) {
      set.updatedAt = Date.now()
      await tx.update(intakeItems).set(set).where(eq(intakeItems.id, existing.id))
    }
    return Number(existing.id)
  }

  const [inserted] = await tx
    .insert(intakeItems)
    .values({
      trackerId,
      itemName,
      itemKey,
      itemType,
      variant,
    })
    .returning()

  if (!inserted) throw new Error('Unable to create intake item definition')
  return Number(inserted.id)
}

async function getIntakeEntries(trackerId: number, limit = 365): Promise<Entry[]> {
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
      intakeStructured: entryIntake.entryId,
      itemId: entryIntake.itemId,
      itemName: intakeItems.itemName,
      itemKey: intakeItems.itemKey,
      itemType: intakeItems.itemType,
      variant: intakeItems.variant,
      dosage: entryIntake.dosage,
      unit: entryIntake.unit,
    })
    .from(entries)
    .leftJoin(entryIntake, eq(entryIntake.entryId, entries.id))
    .leftJoin(intakeItems, eq(intakeItems.id, entryIntake.itemId))
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

async function getIntakeEntryById(entryId: number): Promise<IntakeEntryResponse | null> {
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
      intakeStructured: entryIntake.entryId,
      itemId: entryIntake.itemId,
      itemName: intakeItems.itemName,
      itemKey: intakeItems.itemKey,
      itemType: intakeItems.itemType,
      variant: intakeItems.variant,
      dosage: entryIntake.dosage,
      unit: entryIntake.unit,
    })
    .from(entries)
    .leftJoin(entryIntake, eq(entryIntake.entryId, entries.id))
    .leftJoin(intakeItems, eq(intakeItems.id, entryIntake.itemId))
    .where(eq(entries.id, entryId))
    .limit(1)

  if (!row) return null
  const mapped = mapEntry(row as Record<string, unknown>)
  if (!mapped.intake?.structured) return null

  return {
    entry: entryToIntakeHistoryItem(mapped) as IntakeEntryResponse['entry'],
    tags: await tagsForEntry(mapped.id),
  }
}

export async function addIntakeEntry(data: CreateIntakeEntryRequest): Promise<IntakeEntryResponse | null> {
  if (!(await isIntakeTracker(data.trackerId))) {
    throw new Error('Intake entries can only be created for the Vitamins & Medications tracker')
  }

  const itemName = normalizeIntakeItemName(data.itemName)
  if (!itemName) throw new Error('Item name is required')
  const itemType = validateIntakeItemType(data.itemType)
  const variant = normalizeIntakeItemVariant(data.variant)
  const dosage = validateDosageOptional(data.dosage)
  const unit = validateUnitOptional(data.unit)
  const timestamp = Number(data.timestamp)
  if (!Number.isFinite(timestamp)) throw new Error('Timestamp must be finite')
  const dateStr = formatDateStr(timestamp)
  const itemKey = normalizeIntakeItemKey(itemName, itemType, variant)

  const database = getDb()
  const inserted = await database.transaction(async (tx) => {
    const itemId = await findOrCreateItem(tx, data.trackerId, itemName, itemType, variant)
    const [row] = await tx
      .insert(entries)
      .values({
        trackerId: data.trackerId,
        value: null,
        note: data.note ?? null,
        metadata: JSON.stringify({
          trackerKind: 'intake',
          intake: {
            structured: true,
            itemName,
            itemKey,
            itemType,
            variant,
            dosage,
            unit,
          },
        }),
        timestamp,
        dateStr,
        assetId: data.assetId ?? null,
      })
      .returning()

    if (!row) return null
    const entryId = (row as { id: number }).id
    await tx.insert(entryIntake).values({
      entryId,
      itemId,
      dosage,
      unit,
    })
    await replaceEntryTags(entryId, data.tagIds, tx)
    return entryId
  })

  if (inserted == null) return null
  return getIntakeEntryById(inserted)
}

export async function updateIntakeEntry(entryId: number, updates: UpdateIntakeEntryRequest): Promise<IntakeEntryResponse | null> {
  const [existing] = await getDb()
    .select({
      trackerId: entries.trackerId,
      intakeStructured: entryIntake.entryId,
      itemId: entryIntake.itemId,
      itemName: intakeItems.itemName,
      itemKey: intakeItems.itemKey,
      itemType: intakeItems.itemType,
      variant: intakeItems.variant,
      dosage: entryIntake.dosage,
      unit: entryIntake.unit,
    })
    .from(entries)
    .leftJoin(entryIntake, eq(entryIntake.entryId, entries.id))
    .leftJoin(intakeItems, eq(intakeItems.id, entryIntake.itemId))
    .where(eq(entries.id, entryId))
    .limit(1)

  if (!existing?.intakeStructured || !(await isIntakeTracker(existing.trackerId))) {
    throw new Error('Structured intake entries can only be updated through the Vitamins & Medications flow')
  }

  const entrySet: Record<string, unknown> = {}
  const itemSet: Record<string, unknown> = {}
  const intakeSet: Record<string, unknown> = {}

  const nextItemName = updates.itemName !== undefined ? normalizeIntakeItemName(updates.itemName) : String(existing.itemName ?? '')
  if (updates.itemName !== undefined && !nextItemName) {
    throw new Error('Item name is required')
  }
  const nextItemType = updates.itemType !== undefined ? validateIntakeItemType(updates.itemType) : (existing.itemType as ReturnType<typeof validateIntakeItemType>)
  const nextVariant = updates.variant !== undefined ? normalizeIntakeItemVariant(updates.variant) : (existing.variant ?? null)
  const nextDosage = updates.dosage !== undefined ? validateDosageOptional(updates.dosage) : existing.dosage == null ? null : Number(existing.dosage)
  const nextUnit = updates.unit !== undefined ? validateUnitOptional(updates.unit) : (existing.unit ?? null)
  const nextTimestamp = updates.timestamp !== undefined ? Number(updates.timestamp) : null
  if (nextTimestamp !== null && !Number.isFinite(nextTimestamp)) throw new Error('Timestamp must be finite')

  if (updates.note !== undefined) entrySet.note = updates.note
  if (updates.assetId !== undefined) entrySet.assetId = updates.assetId
  if (nextTimestamp !== null) {
    entrySet.timestamp = nextTimestamp
    entrySet.dateStr = formatDateStr(nextTimestamp)
  }
  if (updates.itemName !== undefined || updates.itemType !== undefined || updates.variant !== undefined) {
    itemSet.itemName = nextItemName
    itemSet.itemKey = normalizeIntakeItemKey(nextItemName, nextItemType, nextVariant)
    itemSet.itemType = nextItemType
    itemSet.variant = nextVariant
    itemSet.updatedAt = Date.now()
  }
  if (updates.dosage !== undefined) intakeSet.dosage = nextDosage
  if (updates.unit !== undefined) intakeSet.unit = nextUnit

  const database = getDb()
  await database.transaction(async (tx) => {
    let itemId = Number(existing.itemId)
    if (Object.keys(itemSet).length > 0) {
      itemId = await findOrCreateItem(tx, Number(existing.trackerId), nextItemName, nextItemType, nextVariant)
    }

    if (Object.keys(entrySet).length > 0) {
      await tx.update(entries).set(entrySet).where(eq(entries.id, entryId))
    }
    if (Object.keys(intakeSet).length > 0 || itemId !== Number(existing.itemId)) {
      const set: Record<string, unknown> = { ...intakeSet }
      if (itemId !== Number(existing.itemId)) set.itemId = itemId
      await tx.update(entryIntake).set(set).where(eq(entryIntake.entryId, entryId))
    }

    if (updates.tagIds !== undefined) {
      await replaceEntryTags(entryId, updates.tagIds, tx)
    }
  })

  return getIntakeEntryById(entryId)
}

export async function deleteIntakeEntry(entryId: number): Promise<boolean> {
  await getDb().transaction(async (tx) => {
    await tx.delete(entriesToTags).where(eq(entriesToTags.entryId, entryId))
    await tx.delete(entries).where(eq(entries.id, entryId))
  })
  return true
}

export async function getIntakeDetail(trackerId: number, options?: { limit?: number }): Promise<IntakeDetailResponse> {
  if (!(await isIntakeTracker(trackerId))) {
    throw new Error('Intake detail can only be read for the Vitamins & Medications tracker')
  }
  const historyEntries = await getIntakeEntries(trackerId, options?.limit ?? 365)
  const tags = await getTags()
  return buildIntakeDetailReadModel(historyEntries, tags)
}

export async function getIntakeHomeWidget(trackerId: number, options?: { selectedDate?: string; limit?: number }): Promise<IntakeHomeWidgetReadModel> {
  if (!(await isIntakeTracker(trackerId))) {
    throw new Error('Intake home can only be read for the Vitamins & Medications tracker')
  }
  const entries = await getIntakeEntries(trackerId, options?.limit ?? 365)
  const selectedDate = options?.selectedDate ?? new Date().toISOString().slice(0, 10)
  const tags = await getTags()
  return buildIntakeHomeWidgetReadModel(entries, {
    trackerId,
    title: 'Vitamins & Medications',
    selectedDate,
  }, tags)
}
