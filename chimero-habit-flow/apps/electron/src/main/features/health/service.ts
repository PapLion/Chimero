import { and, desc, eq } from 'drizzle-orm'
import { entries, entriesToTags, entryHealth, symptoms, trackers } from '@packages/db'
import { getDb } from '@packages/db/database'
import {
  buildHealthDetailReadModel,
  buildHealthHomeWidgetReadModel,
  normalizeSymptomKey,
  normalizeSymptomName,
  validateSeverityOptional,
  validateSymptomCategory,
} from '@contracts/domain'
import type {
  CreateHealthSymptomRequest,
  Entry,
  HealthDetailResponse,
  HealthHomeWidgetReadModel,
  HealthSymptomResponse,
  UpdateHealthSymptomRequest,
} from '@contracts/contracts'
import { mapEntry, mapTracker } from '../../shared/mappers'
import { getEntryTagIds, getTags, replaceEntryTags } from '../tags/service'
import { getTrackerIdentity } from '@contracts/features/tracking'

function formatDateStr(timestamp: number): string {
  const date = new Date(timestamp)
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

async function isHealthTracker(trackerId: number): Promise<boolean> {
  const [row] = await getDb()
    .select()
    .from(trackers)
    .where(eq(trackers.id, trackerId))
    .limit(1)

  if (!row) return false
  return getTrackerIdentity(mapTracker(row as Record<string, unknown>)) === 'health'
}

async function getHealthEntries(trackerId: number, limit = 365): Promise<Entry[]> {
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
      healthStructured: entryHealth.entryId,
      symptomId: entryHealth.symptomId,
      symptomName: symptoms.name,
      symptomKey: symptoms.symptomKey,
      category: symptoms.category,
      severity: entryHealth.severity,
    })
    .from(entries)
    .leftJoin(entryHealth, eq(entryHealth.entryId, entries.id))
    .leftJoin(symptoms, eq(symptoms.id, entryHealth.symptomId))
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

async function findOrCreateSymptom(tx: any, trackerId: number, symptomName: string, category: ReturnType<typeof validateSymptomCategory>): Promise<number> {
  const symptomKey = normalizeSymptomKey(symptomName)
  const [existing] = await tx
    .select()
    .from(symptoms)
    .where(and(eq(symptoms.trackerId, trackerId), eq(symptoms.symptomKey, symptomKey)))
    .limit(1)

  if (existing) {
    const set: Record<string, unknown> = {}
    if (existing.name !== symptomName) set.name = symptomName
    if (existing.category !== category) set.category = category
    if (Object.keys(set).length > 0) {
      set.updatedAt = Date.now()
      await tx.update(symptoms).set(set).where(eq(symptoms.id, existing.id))
    }
    return Number(existing.id)
  }

  const [inserted] = await tx
    .insert(symptoms)
    .values({
      trackerId,
      name: symptomName,
      symptomKey,
      category,
    })
    .returning()

  if (!inserted) throw new Error('Unable to create symptom definition')
  return Number(inserted.id)
}

async function getHealthEntryById(entryId: number): Promise<HealthSymptomResponse | null> {
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
      healthStructured: entryHealth.entryId,
      symptomId: entryHealth.symptomId,
      symptomName: symptoms.name,
      symptomKey: symptoms.symptomKey,
      category: symptoms.category,
      severity: entryHealth.severity,
    })
    .from(entries)
    .leftJoin(entryHealth, eq(entryHealth.entryId, entries.id))
    .leftJoin(symptoms, eq(symptoms.id, entryHealth.symptomId))
    .where(eq(entries.id, entryId))
    .limit(1)

  if (!row) return null
  const mapped = mapEntry(row as Record<string, unknown>)
  if (!mapped.health?.structured) return null

  return {
    entry: {
      entryId: mapped.id,
      trackerId: mapped.trackerId,
      symptomId: mapped.health.symptomId,
      symptomName: mapped.health.symptomName,
      symptomKey: mapped.health.symptomKey,
      category: mapped.health.category,
      severity: mapped.health.severity,
      note: mapped.note,
      timestamp: mapped.timestamp,
      dateStr: mapped.dateStr,
      assetId: mapped.assetId ?? null,
      tagIds: mapped.tagIds ?? [],
      structured: true,
    },
    tags: await tagsForEntry(mapped.id),
  }
}

export async function addHealthSymptomEntry(data: CreateHealthSymptomRequest): Promise<HealthSymptomResponse | null> {
  if (!(await isHealthTracker(data.trackerId))) {
    throw new Error('Health symptom entries can only be created for the Health tracker')
  }

  const symptomName = normalizeSymptomName(data.symptomName)
  if (!symptomName) throw new Error('Symptom name is required')
  const category = validateSymptomCategory(data.category)
  const severity = validateSeverityOptional(data.severity)
  const timestamp = data.timestamp ?? Date.now()
  if (!Number.isFinite(timestamp)) throw new Error('Timestamp must be finite')
  const dateStr = formatDateStr(timestamp)

  const database = getDb()
  const inserted = await database.transaction(async (tx) => {
    const symptomId = await findOrCreateSymptom(tx, data.trackerId, symptomName, category)
    const [row] = await tx
      .insert(entries)
      .values({
        trackerId: data.trackerId,
        value: null,
        note: data.note ?? null,
        metadata: JSON.stringify({
          trackerKind: 'health',
          health: {
            structured: true,
            symptomName,
            symptomKey: normalizeSymptomKey(symptomName),
            category,
            severity,
          },
        }),
        timestamp,
        dateStr,
        assetId: data.assetId ?? null,
      })
      .returning()

    if (!row) return null
    const entryId = (row as { id: number }).id
    await tx.insert(entryHealth).values({
      entryId,
      symptomId,
      severity,
    })
    await replaceEntryTags(entryId, data.tagIds, tx)
    return entryId
  })

  if (inserted == null) return null
  return getHealthEntryById(inserted)
}

export async function updateHealthSymptomEntry(entryId: number, updates: UpdateHealthSymptomRequest): Promise<HealthSymptomResponse | null> {
  const [existing] = await getDb()
    .select({
      trackerId: entries.trackerId,
      healthStructured: entryHealth.entryId,
      symptomId: entryHealth.symptomId,
      symptomName: symptoms.name,
      symptomKey: symptoms.symptomKey,
      category: symptoms.category,
      severity: entryHealth.severity,
    })
    .from(entries)
    .leftJoin(entryHealth, eq(entryHealth.entryId, entries.id))
    .leftJoin(symptoms, eq(symptoms.id, entryHealth.symptomId))
    .where(eq(entries.id, entryId))
    .limit(1)

  if (!existing?.healthStructured || !(await isHealthTracker(existing.trackerId))) {
    throw new Error('Structured Health entries can only be updated through the Health flow')
  }

  const entrySet: Record<string, unknown> = {}
  const severitySet: Record<string, unknown> = {}
  const symptomSet: Record<string, unknown> = {}

  const nextSymptomName = updates.symptomName !== undefined ? normalizeSymptomName(updates.symptomName) : String(existing.symptomName ?? '')
  if (updates.symptomName !== undefined && !nextSymptomName) {
    throw new Error('Symptom name is required')
  }
  const nextCategory = updates.category !== undefined ? validateSymptomCategory(updates.category) : (existing.category as ReturnType<typeof validateSymptomCategory>)
  const nextSeverity = updates.severity !== undefined ? validateSeverityOptional(updates.severity) : existing.severity == null ? null : Number(existing.severity)
  const nextTimestamp = updates.timestamp !== undefined ? Number(updates.timestamp) : null
  if (nextTimestamp !== null && !Number.isFinite(nextTimestamp)) throw new Error('Timestamp must be finite')

  if (updates.note !== undefined) entrySet.note = updates.note
  if (updates.assetId !== undefined) entrySet.assetId = updates.assetId
  if (nextTimestamp !== null) {
    entrySet.timestamp = nextTimestamp
    entrySet.dateStr = formatDateStr(nextTimestamp)
  }
  if (updates.symptomName !== undefined || updates.category !== undefined) {
    symptomSet.name = nextSymptomName
    symptomSet.symptomKey = normalizeSymptomKey(nextSymptomName)
    symptomSet.category = nextCategory
    symptomSet.updatedAt = Date.now()
  }
  if (updates.severity !== undefined) {
    severitySet.severity = nextSeverity
  }

  const database = getDb()
  await database.transaction(async (tx) => {
    let symptomId = Number(existing.symptomId)
    if (Object.keys(symptomSet).length > 0) {
      symptomId = await findOrCreateSymptom(tx, Number(existing.trackerId), nextSymptomName, nextCategory)
    }

    if (Object.keys(entrySet).length > 0) {
      await tx.update(entries).set(entrySet).where(eq(entries.id, entryId))
    }
    if (Object.keys(severitySet).length > 0 || symptomId !== Number(existing.symptomId)) {
      const set: Record<string, unknown> = { ...severitySet }
      if (symptomId !== Number(existing.symptomId)) set.symptomId = symptomId
      await tx.update(entryHealth).set(set).where(eq(entryHealth.entryId, entryId))
    }

    if (updates.tagIds !== undefined) {
      await replaceEntryTags(entryId, updates.tagIds, tx)
    }
  })

  return getHealthEntryById(entryId)
}

export async function deleteHealthSymptomEntry(entryId: number): Promise<boolean> {
  await getDb().transaction(async (tx) => {
    await tx.delete(entriesToTags).where(eq(entriesToTags.entryId, entryId))
    await tx.delete(entries).where(eq(entries.id, entryId))
  })
  return true
}

export async function getHealthDetail(trackerId: number, options?: { limit?: number }): Promise<HealthDetailResponse> {
  if (!(await isHealthTracker(trackerId))) {
    throw new Error('Health detail can only be read for the Health tracker')
  }
  const historyEntries = await getHealthEntries(trackerId, options?.limit ?? 365)
  const tags = await getTags()
  return buildHealthDetailReadModel(historyEntries, tags)
}

export async function getHealthHomeWidget(trackerId: number, options?: { selectedDate?: string; limit?: number }): Promise<HealthHomeWidgetReadModel> {
  if (!(await isHealthTracker(trackerId))) {
    throw new Error('Health home can only be read for the Health tracker')
  }
  const entries = await getHealthEntries(trackerId, options?.limit ?? 365)
  const selectedDate = options?.selectedDate ?? new Date().toISOString().slice(0, 10)
  const tags = await getTags()
  return buildHealthHomeWidgetReadModel(entries, {
    trackerId,
    title: 'Health',
    selectedDate,
  }, tags)
}
