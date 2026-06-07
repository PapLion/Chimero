import type { IncomingMessage, ServerResponse } from 'node:http'
import { createReadStream, existsSync } from 'node:fs'
import { resolve, sep } from 'node:path'
import { getWebDb, getAssetsRoot, getWebDbPath, type WebDb } from '../db'
import { books, bookActivities } from '../../../../packages/db/src/schema'
import { buildTagTree, resolveInheritedTagIds } from '../../../../packages/shared/src/domain/tags'
import {
  buildCalendarDayEntry,
  buildBookHistoryReadModel,
  buildBookSelectedDayReadModel,
  buildBookStatisticsReadModel,
  buildFoodDetailReadModel,
  buildGamingDetailReadModel,
  entryToFoodHistoryItem,
  entryToBookHistoryItem,
  entryToGamingReadModel,
  getTaskActiveDate,
  getTaskStateForDate,
  normalizeFoodKey,
  normalizeFoodName,
  normalizeGameKey,
  normalizeGamingTitle,
  normalizeBookTitle,
  normalizeBookTitleKey,
  validateEstimatedHours,
  validateBookRatingTenths,
  validateCaloriesOptional,
  validateMealType,
  isTaskTrackerLike,
  parseTaskStateMetadata,
} from '../../../../packages/shared/src/domain'
import { getBookLifecycleRecord } from '../../../../packages/shared/src/features/books'
import { calculateWeightDetail } from '../../../../packages/shared/src/domain/weight'
import { computeBestStreak, computeCurrentStreak } from '../../../../packages/shared/src/domain/streak'
import type {
  BaseEntryRequest,
  Contact,
  ContactInteraction,
  ContactInteractionInsert,
  ContactInsert,
  ContactUpdate,
  CorrelationQueryRequest,
  Book,
  BookActivityResponse,
  BookHistoryItem,
  BookResponse,
  BookSelectedDaySummaryReadModel,
  BookStatisticsReadModel,
  CreateBookActivityRequest,
  CreateBookRequest,
  CreateFoodEntryRequest,
  CreateWeightEntryRequest,
  CreateGamingEntryRequest,
  Entry,
  EntryUpdateRequest,
  BookActivityType,
  FoodDetailResponse,
  FoodEntryResponse,
  MealType,
  UpdateFoodEntryRequest,
  GamingDetailResponse,
  GamingEntryResponse,
  Reminder,
  ReminderInsert,
  SetTrackerGoalRequest,
  StatsQueryRequest,
  Tag,
  TagRelationship,
  Tracker,
  TrackerGoal,
  UpdateBookActivityRequest,
  UpdateBookRequest,
  UpdateWeightEntryRequest,
  UpdateGamingEntryRequest,
  WeightEntry,
} from '../../../../packages/shared/src/contracts'
import { getTrackerIdentity } from '../../../../packages/shared/src/features/tracking'
import type { AssetWithUrls } from '../../../../packages/shared/src/features/assets'

type JsonRecord = Record<string, unknown>

const MAX_CORRELATION_IMPACT = 100
const MIN_SAMPLES_FOR_CONFIDENCE = 30

function json(res: ServerResponse, status: number, payload: unknown): void {
  const body = JSON.stringify(payload)
  res.statusCode = status
  res.setHeader('content-type', 'application/json; charset=utf-8')
  res.setHeader('content-length', Buffer.byteLength(body))
  res.end(body)
}

function noContent(res: ServerResponse): void {
  res.statusCode = 204
  res.end()
}

function readBody(req: IncomingMessage): Promise<unknown> {
  return new Promise((resolveBody, reject) => {
    const chunks: Buffer[] = []
    req.on('data', (chunk) => chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)))
    req.on('end', () => {
      const text = Buffer.concat(chunks).toString('utf-8').trim()
      if (!text) {
        resolveBody({})
        return
      }
      try {
        resolveBody(JSON.parse(text))
      } catch (error) {
        reject(error)
      }
    })
    req.on('error', reject)
  })
}

function asRecord(value: unknown): JsonRecord {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as JsonRecord : {}
}

function toInt(value: unknown, fallback = 0): number {
  const parsed = Number(value)
  return Number.isInteger(parsed) ? parsed : fallback
}

function optionalInt(value: unknown): number | undefined {
  if (value == null || value === '') return undefined
  const parsed = Number(value)
  return Number.isInteger(parsed) ? parsed : undefined
}

function formatDateStr(timestamp: number): string {
  const date = new Date(timestamp)
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

function parseJsonObject(value: unknown): JsonRecord {
  if (!value) return {}
  if (typeof value === 'object') return value as JsonRecord
  if (typeof value !== 'string') return {}
  try {
    const parsed = JSON.parse(value)
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed as JsonRecord : {}
  } catch {
    return {}
  }
}

function parseJsonArray<T>(value: unknown): T[] | null {
  if (Array.isArray(value)) return value as T[]
  if (typeof value !== 'string' || !value) return null
  try {
    const parsed = JSON.parse(value)
    return Array.isArray(parsed) ? parsed as T[] : null
  } catch {
    return null
  }
}

function schemaTypeToUI(type: string, config: JsonRecord): Tracker['type'] {
  if (type === 'numeric') return 'counter'
  if (type === 'range' && (config.max === 5 || config.max === 10)) return 'rating'
  if (type === 'text' || type === 'composite') return 'list'
  return type as Tracker['type']
}

function mapTracker(row: JsonRecord): Tracker {
  const config = parseJsonObject(row.config)
  const schemaType = String(row.type ?? 'numeric')
  return {
    id: Number(row.id),
    name: String(row.name ?? ''),
    type: schemaTypeToUI(schemaType, config),
    icon: row.icon == null ? null : String(row.icon),
    color: row.color == null ? null : String(row.color),
    order: Number(row.order ?? row.order_id ?? 0),
    config,
    archived: !!row.archived,
    isCustom: !!(row.is_custom ?? row.isCustom),
    isFavorite: !!(row.is_favorite ?? row.isFavorite),
    createdAt: row.created_at == null ? null : Number(row.created_at),
  }
}

function mapEntry(row: JsonRecord): Entry {
  const gamingStructured = row.gaming_structured ?? row.gamingStructured
  const gameTitle = row.game_title ?? row.gameTitle
  const gameKey = row.game_key ?? row.gameKey
  const estimatedHours = row.estimated_hours ?? row.estimatedHours
  const foodStructured = row.food_structured ?? row.foodStructured
  const foodName = row.food_name ?? row.foodName
  const foodKey = row.food_key ?? row.foodKey
  const calories = row.calories
  const mealType = row.meal_type ?? row.mealType
  const bookStructured = row.book_structured ?? row.bookStructured
  const bookId = row.book_id ?? row.bookId
  const bookTitle = row.book_title ?? row.bookTitle
  const bookTitleKey = row.book_title_key ?? row.bookTitleKey
  const bookActivityType = row.book_activity_type ?? row.bookActivityType
  return {
    id: Number(row.id),
    trackerId: Number(row.tracker_id ?? row.trackerId),
    value: row.value == null ? null : Number(row.value),
    note: row.note == null ? null : String(row.note),
    metadata: parseJsonObject(row.metadata),
    timestamp: Number(row.timestamp),
    dateStr: String(row.date_str ?? row.dateStr),
    assetId: row.asset_id == null ? null : Number(row.asset_id),
    gaming: gamingStructured
        ? {
            structured: true,
            gameTitle: String(gameTitle ?? ''),
            gameKey: String(gameKey ?? ''),
            estimatedHours: Number(estimatedHours ?? 0),
          }
        : undefined,
    food: foodStructured
        ? {
          structured: true,
          foodName: String(foodName ?? ''),
          foodKey: String(foodKey ?? ''),
          calories: calories == null ? null : Number(calories),
          mealType: mealType == null ? null : mealType as MealType,
        }
      : undefined,
    book: bookStructured
      ? {
          structured: true,
          bookId: Number(bookId),
          title: String(bookTitle ?? ''),
          titleKey: String(bookTitleKey ?? ''),
          activityType: (['started', 'read', 'finished'].includes(String(bookActivityType))
            ? (bookActivityType as BookActivityType)
            : 'read'),
        }
      : undefined,
  }
}

function mapTag(row: JsonRecord): Tag {
  return {
    id: Number(row.id),
    name: String(row.name ?? ''),
    color: row.color == null ? null : String(row.color),
  }
}

function mapTagRelationship(row: JsonRecord): TagRelationship {
  return {
    parentTagId: Number(row.parent_tag_id ?? row.parentTagId),
    childTagId: Number(row.child_tag_id ?? row.childTagId),
    relationshipType: 'parent',
  }
}

function mapReminder(row: JsonRecord): Reminder {
  return {
    id: Number(row.id),
    trackerId: row.tracker_id == null ? null : Number(row.tracker_id),
    title: String(row.title ?? ''),
    description: row.description == null ? null : String(row.description),
    time: String(row.time ?? ''),
    date: row.date == null ? null : String(row.date),
    days: parseJsonArray<number>(row.days),
    enabled: !!row.enabled,
    lastTriggered: row.last_triggered == null ? null : Number(row.last_triggered),
    completedAt: row.completed_at == null ? null : Number(row.completed_at),
    createdAt: row.created_at == null ? null : Number(row.created_at),
  }
}

function mapAsset(row: JsonRecord): AssetWithUrls {
  const path = String(row.path ?? '')
  const thumbnailPath = row.thumbnail_path == null ? null : String(row.thumbnail_path)
  const assetUrl = `/api/assets/files/${encodeURIComponent(path)}`
  const thumbnailUrl = thumbnailPath ? `/api/assets/files/${encodeURIComponent(thumbnailPath)}` : assetUrl
  return {
    id: Number(row.id),
    filename: String(row.filename ?? ''),
    originalName: row.original_name == null ? null : String(row.original_name),
    path,
    type: String(row.type ?? 'image'),
    mimeType: row.mime_type == null ? null : String(row.mime_type),
    size: row.size == null ? null : Number(row.size),
    thumbnailPath,
    createdAt: row.created_at == null ? null : Number(row.created_at),
    assetUrl,
    thumbnailUrl,
  }
}

function mapContact(row: JsonRecord): Contact {
  return {
    id: Number(row.id),
    name: String(row.name ?? ''),
    avatarAssetId: row.avatar_asset_id == null ? null : Number(row.avatar_asset_id),
    birthday: row.birthday == null ? null : String(row.birthday),
    dateMet: row.date_met == null ? null : String(row.date_met),
    dateLastTalked: row.date_last_talked == null ? null : String(row.date_last_talked),
    traits: parseJsonArray<string>(row.traits),
    notes: row.notes == null ? null : String(row.notes),
    createdAt: row.created_at == null ? null : Number(row.created_at),
  }
}

function mapContactInteraction(row: JsonRecord): ContactInteraction {
  return {
    id: Number(row.id),
    contactId: Number(row.contact_id),
    entryId: row.entry_id == null ? null : Number(row.entry_id),
    mood: (row.mood as ContactInteraction['mood']) ?? 'neutral',
    timestamp: Number(row.timestamp),
    notes: row.notes == null ? null : String(row.notes),
  }
}

function mapTrackerGoal(row: JsonRecord): TrackerGoal {
  return {
    id: Number(row.id),
    trackerId: Number(row.tracker_id),
    goalType: row.goal_type as TrackerGoal['goalType'],
    targetValue: Number(row.target_value),
    unit: row.unit == null ? null : String(row.unit),
    direction: row.direction == null ? null : row.direction as TrackerGoal['direction'],
    startDate: row.start_date == null ? null : String(row.start_date),
    targetDate: row.target_date == null ? null : String(row.target_date),
    active: !!row.active,
    createdAt: row.created_at == null ? null : Number(row.created_at),
    updatedAt: row.updated_at == null ? null : Number(row.updated_at),
  }
}

function mapWeightEntry(row: JsonRecord): WeightEntry {
  return {
    entryId: Number(row.entry_id ?? row.entryId),
    trackerId: Number(row.tracker_id ?? row.trackerId),
    weight: Number(row.weight_value ?? row.weightValue ?? row.value),
    weightUnit: (row.weight_unit ?? row.weightUnit ?? 'kg') as WeightEntry['weightUnit'],
    waist: row.waist_value == null ? null : Number(row.waist_value),
    waistUnit: row.waist_unit == null ? null : row.waist_unit as WeightEntry['waistUnit'],
    bodyFatPercentage: row.body_fat_percentage == null ? null : Number(row.body_fat_percentage),
    note: row.note == null ? null : String(row.note),
    timestamp: Number(row.timestamp),
    dateStr: String(row.date_str),
    assetId: row.asset_id == null ? null : Number(row.asset_id),
  }
}

let activeDb: WebDb | null = null

function getDb(): WebDb {
  if (!activeDb) throw new Error('Web DB not initialized for request')
  return activeDb
}

function normalizeIds(ids?: unknown): number[] {
  if (!Array.isArray(ids)) return []
  return Array.from(new Set(ids.map((id) => Number(id)).filter((id) => Number.isInteger(id) && id > 0)))
}

function getTags(): Tag[] {
  return getDb().prepare('SELECT * FROM tags ORDER BY name ASC').all().map((row) => mapTag(row as JsonRecord))
}

function getTagRelationships(): TagRelationship[] {
  return getDb().prepare('SELECT * FROM tag_relationships').all().map((row) => mapTagRelationship(row as JsonRecord))
}

function getEntryTagIds(entryIds: number[]): Map<number, number[]> {
  const normalized = normalizeIds(entryIds)
  const result = new Map<number, number[]>()
  if (normalized.length === 0) return result
  const placeholders = normalized.map(() => '?').join(',')
  const rows = getDb()
    .prepare(`SELECT entry_id, tag_id FROM entries_to_tags WHERE entry_id IN (${placeholders})`)
    .all(...normalized) as Array<{ entry_id: number; tag_id: number }>
  for (const row of rows) {
    const current = result.get(row.entry_id) ?? []
    current.push(row.tag_id)
    result.set(row.entry_id, current)
  }
  return result
}

function replaceEntryTags(entryId: number, tagIds?: unknown): void {
  if (!Array.isArray(tagIds)) return
  const normalized = normalizeIds(tagIds)
  if (normalized.length > 0) {
    const placeholders = normalized.map(() => '?').join(',')
    const existing = getDb()
      .prepare(`SELECT id FROM tags WHERE id IN (${placeholders})`)
      .all(...normalized) as Array<{ id: number }>
    const existingIds = new Set(existing.map((row) => row.id))
    const missing = normalized.filter((id) => !existingIds.has(id))
    if (missing.length > 0) throw new Error(`Unknown tag IDs: ${missing.join(', ')}`)
  }

  getDb().prepare('DELETE FROM entries_to_tags WHERE entry_id = ?').run(entryId)
  const insert = getDb().prepare('INSERT INTO entries_to_tags (entry_id, tag_id) VALUES (?, ?)')
  for (const tagId of normalized) insert.run(entryId, tagId)
}

function withTagIds(entries: Entry[]): Entry[] {
  const tagIdsByEntry = getEntryTagIds(entries.map((entry) => entry.id))
  return entries.map((entry) => ({ ...entry, tagIds: tagIdsByEntry.get(entry.id) ?? [] }))
}

function getTrackers(): Tracker[] {
  return getDb()
    .prepare('SELECT * FROM trackers WHERE archived = 0 ORDER BY "order" ASC, id ASC')
    .all()
    .map((row) => mapTracker(row as JsonRecord))
}

function getEntries(options: { limit?: number; trackerId?: number } = {}): Entry[] {
  const limit = Math.min(options.limit ?? 100, 1000)
  const rows = options.trackerId
    ? getDb()
      .prepare(`
        SELECT
          e.*,
          eg.entry_id AS gaming_structured,
          eg.game_title,
          eg.game_key,
          eg.estimated_hours,
          ef.entry_id AS food_structured,
          ef.food_name,
          ef.food_key,
          ef.calories,
          ef.meal_type,
          ba.entry_id AS book_structured,
          ba.book_id,
          b.title AS book_title,
          b.title_key AS book_title_key,
          ba.activity_type AS book_activity_type
        FROM entries e
        LEFT JOIN entry_gaming eg ON eg.entry_id = e.id
        LEFT JOIN entry_food ef ON ef.entry_id = e.id
        LEFT JOIN book_activities ba ON ba.entry_id = e.id
        LEFT JOIN books b ON b.id = ba.book_id
        WHERE e.tracker_id = ?
        ORDER BY e.timestamp DESC
        LIMIT ?
      `)
      .all(options.trackerId, limit)
    : getDb()
      .prepare(`
        SELECT
          e.*,
          eg.entry_id AS gaming_structured,
          eg.game_title,
          eg.game_key,
          eg.estimated_hours,
          ef.entry_id AS food_structured,
          ef.food_name,
          ef.food_key,
          ef.calories,
          ef.meal_type,
          ba.entry_id AS book_structured,
          ba.book_id,
          b.title AS book_title,
          b.title_key AS book_title_key,
          ba.activity_type AS book_activity_type
        FROM entries e
        LEFT JOIN entry_gaming eg ON eg.entry_id = e.id
        LEFT JOIN entry_food ef ON ef.entry_id = e.id
        LEFT JOIN book_activities ba ON ba.entry_id = e.id
        LEFT JOIN books b ON b.id = ba.book_id
        ORDER BY e.timestamp DESC
        LIMIT ?
      `)
      .all(limit)
  return withTagIds(rows.map((row) => mapEntry(row as JsonRecord)))
}

function addEntry(data: BaseEntryRequest): Entry | null {
  if (!Number.isInteger(data.trackerId) || data.trackerId <= 0) throw new Error('Invalid trackerId')
  if (!Number.isFinite(data.timestamp)) throw new Error('Invalid timestamp')
  if (isGamingTracker(data.trackerId)) throw new Error('Use add-gaming-entry for Gaming entries')
  if (isFoodTracker(data.trackerId)) throw new Error('Use add-food-entry for structured Food entries')
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
  } as JsonRecord)
  const candidateBook = getBookLifecycleRecord(candidateEntry)
  const insert = getDb().transaction(() => {
    if (candidateBook.action === 'read' && !candidateBook.legacy) {
      const rows = getDb()
        .prepare(`
          SELECT
            e.*,
            eg.entry_id AS gaming_structured,
            eg.game_title,
            eg.game_key,
            eg.estimated_hours,
            ba.entry_id AS book_structured,
            ba.book_id,
            b.title AS book_title,
            b.title_key AS book_title_key,
            ba.activity_type AS book_activity_type
          FROM entries e
          LEFT JOIN entry_gaming eg ON eg.entry_id = e.id
          LEFT JOIN book_activities ba ON ba.entry_id = e.id
          LEFT JOIN books b ON b.id = ba.book_id
          WHERE e.tracker_id = ? AND e.date_str = ?
          ORDER BY e.timestamp DESC
        `)
        .all(data.trackerId, dateStr)

      const existing = rows
        .map((row) => mapEntry(row as JsonRecord))
        .find((entry) => {
          const existingBook = getBookLifecycleRecord(entry)
          return existingBook.action === 'read' && !existingBook.legacy && existingBook.title === candidateBook.title
        })

      if (existing) {
        return existing.id
      }
    }

    const result = getDb()
      .prepare(`
        INSERT INTO entries (tracker_id, value, note, metadata, asset_id, timestamp, date_str)
        VALUES (@trackerId, @value, @note, @metadata, @assetId, @timestamp, @dateStr)
      `)
      .run({
        trackerId: data.trackerId,
        value: data.value ?? null,
        note: data.note ?? null,
        metadata: JSON.stringify(data.metadata ?? {}),
        assetId: data.assetId ?? null,
        timestamp: data.timestamp,
        dateStr,
      })
    const id = Number(result.lastInsertRowid)
    replaceEntryTags(id, data.tagIds)
    return id
  })
  if (insert == null) return null
  const row = getDb().prepare('SELECT * FROM entries WHERE id = ?').get(insert)
  return row ? withTagIds([mapEntry(row as JsonRecord)])[0] : null
}

function updateEntry(id: number, updates: EntryUpdateRequest): Entry | null {
  const existing = getDb()
    .prepare(`
      SELECT
        e.tracker_id,
        eg.entry_id AS gaming_structured,
        ef.entry_id AS food_structured,
        ba.entry_id AS book_structured
      FROM entries e
      LEFT JOIN entry_gaming eg ON eg.entry_id = e.id
      LEFT JOIN entry_food ef ON ef.entry_id = e.id
      LEFT JOIN book_activities ba ON ba.entry_id = e.id
      WHERE e.id = ?
      LIMIT 1
    `)
    .get(id) as JsonRecord | undefined
  if (existing?.gaming_structured && isGamingTracker(Number(existing.tracker_id))) {
    throw new Error('Use update-gaming-entry for structured Gaming entries')
  }
  if (existing?.food_structured && isFoodTracker(Number(existing.tracker_id))) {
    throw new Error('Use the Food flow for structured Food entries')
  }
  if (existing?.book_structured && isBooksTracker(Number(existing.tracker_id))) {
    throw new Error('Use the Books flow for structured Books entries')
  }

  const set: string[] = []
  const params: JsonRecord = { id }
  if ('value' in updates) {
    set.push('value = @value')
    params.value = updates.value ?? null
  }
  if ('note' in updates) {
    set.push('note = @note')
    params.note = updates.note ?? null
  }
  if ('metadata' in updates) {
    set.push('metadata = @metadata')
    params.metadata = JSON.stringify(updates.metadata ?? {})
  }
  if ('assetId' in updates) {
    set.push('asset_id = @assetId')
    params.assetId = updates.assetId ?? null
  }
  if ('timestamp' in updates) {
    const timestamp = Number(updates.timestamp)
    if (!Number.isFinite(timestamp)) throw new Error('Invalid timestamp')
    set.push('timestamp = @timestamp')
    set.push('date_str = @dateStr')
    params.timestamp = timestamp
    params.dateStr = formatDateStr(timestamp)
  }

  getDb().transaction(() => {
    if (set.length > 0) {
      getDb().prepare(`UPDATE entries SET ${set.join(', ')} WHERE id = @id`).run(params)
    }
    replaceEntryTags(id, updates.tagIds)
  })()

  const row = getDb().prepare('SELECT * FROM entries WHERE id = ?').get(id)
  return row ? withTagIds([mapEntry(row as JsonRecord)])[0] : null
}

function deleteEntry(id: number): boolean {
  const existing = getDb()
    .prepare(`
      SELECT
        e.tracker_id,
        eg.entry_id AS gaming_structured,
        ef.entry_id AS food_structured,
        ba.entry_id AS book_structured
      FROM entries e
      LEFT JOIN entry_gaming eg ON eg.entry_id = e.id
      LEFT JOIN entry_food ef ON ef.entry_id = e.id
      LEFT JOIN book_activities ba ON ba.entry_id = e.id
      WHERE e.id = ?
      LIMIT 1
    `)
    .get(id) as JsonRecord | undefined
  if (existing?.gaming_structured && isGamingTracker(Number(existing.tracker_id))) {
    throw new Error('Use delete-gaming-entry logic for structured Gaming entries')
  }
  if (existing?.food_structured && isFoodTracker(Number(existing.tracker_id))) {
    throw new Error('Use the Food flow for structured Food entries')
  }
  if (existing?.book_structured && isBooksTracker(Number(existing.tracker_id))) {
    throw new Error('Use the Books flow for structured Books entries')
  }

  getDb().transaction(() => {
    getDb().prepare('DELETE FROM entries_to_tags WHERE entry_id = ?').run(id)
    getDb().prepare('DELETE FROM entry_gaming WHERE entry_id = ?').run(id)
    getDb().prepare('DELETE FROM entry_food WHERE entry_id = ?').run(id)
    getDb().prepare('DELETE FROM book_activities WHERE entry_id = ?').run(id)
    getDb().prepare('DELETE FROM entry_weight WHERE entry_id = ?').run(id)
    getDb().prepare('DELETE FROM entries WHERE id = ?').run(id)
  })()
  return true
}

function getQuickEntryContext() {
  const recentRows = getDb()
    .prepare('SELECT tracker_id AS trackerId, max(timestamp) AS maxTs FROM entries GROUP BY tracker_id ORDER BY max(timestamp) DESC LIMIT 10')
    .all() as Array<{ trackerId: number }>
  const allTrackers = getTrackers()
  const byId = new Map(allTrackers.map((tracker) => [tracker.id, tracker]))
  const recentTrackers = recentRows.map((row) => byId.get(row.trackerId)).filter((tracker): tracker is Tracker => !!tracker)
  const favoriteTrackers = allTrackers.filter((tracker) => tracker.isFavorite)
  const allTags = getTags()
  const suggestedTagRows = getDb()
    .prepare('SELECT tag_id AS tagId, count(*) AS useCount FROM entries_to_tags GROUP BY tag_id ORDER BY count(*) DESC LIMIT 10')
    .all() as Array<{ tagId: number }>
  const tagById = new Map(allTags.map((tag) => [tag.id, tag]))
  const suggestedTags = suggestedTagRows.map((row) => tagById.get(row.tagId)).filter((tag): tag is Tag => !!tag)
  return { recentTrackers, favoriteTrackers, tags: allTags, suggestedTags }
}

function getDashboardStats() {
  const totalActivities = Number((getDb().prepare('SELECT count(*) AS count FROM trackers WHERE archived = 0').get() as { count: number }).count ?? 0)
  const now = new Date()
  const monthStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`
  const monthEndDate = new Date(now.getFullYear(), now.getMonth() + 1, 0)
  const monthEnd = `${monthEndDate.getFullYear()}-${String(monthEndDate.getMonth() + 1).padStart(2, '0')}-${String(monthEndDate.getDate()).padStart(2, '0')}`
  const totalEntriesMonth = Number((getDb()
    .prepare('SELECT count(*) AS count FROM entries WHERE date_str >= ? AND date_str <= ?')
    .get(monthStart, monthEnd) as { count: number }).count ?? 0)
  const dates = (getDb()
    .prepare('SELECT date_str AS dateStr FROM entries GROUP BY date_str ORDER BY date_str DESC LIMIT 365')
    .all() as Array<{ dateStr: string }>).map((row) => row.dateStr)
  return {
    currentStreak: computeCurrentStreak(dates),
    bestStreak: computeBestStreak(dates),
    totalActivities,
    totalEntriesMonth,
  }
}

function getStatsBucket(dateStr: string, groupBy?: StatsQueryRequest['groupBy']): string {
  if (groupBy === 'month') return dateStr.slice(0, 7)
  if (groupBy === 'week') {
    const date = new Date(dateStr)
    const day = date.getDay()
    date.setDate(date.getDate() - day + (day === 0 ? -6 : 1))
    return date.toISOString().slice(0, 10)
  }
  return dateStr
}

function getStats(request: StatsQueryRequest = {}) {
  const rows = getDb()
    .prepare('SELECT id, tracker_id AS trackerId, value, date_str AS dateStr FROM entries ORDER BY date_str ASC')
    .all() as Array<{ id: number; trackerId: number; value: number | null; dateStr: string }>

  let allowedEntryIds: Set<number> | null = null
  if (request.tagIds && request.tagIds.length > 0) {
    const placeholders = request.tagIds.map(() => '?').join(',')
    const tagRows = getDb()
      .prepare(`SELECT entry_id AS entryId FROM entries_to_tags WHERE tag_id IN (${placeholders})`)
      .all(...request.tagIds) as Array<{ entryId: number }>
    allowedEntryIds = new Set(tagRows.map((row) => row.entryId))
  }

  const trackerIds = request.trackerIds && request.trackerIds.length > 0 ? new Set(request.trackerIds) : null
  const filtered = rows
    .filter((entry) => !trackerIds || trackerIds.has(entry.trackerId))
    .filter((entry) => !allowedEntryIds || allowedEntryIds.has(entry.id))
    .filter((entry) => !request.startDate || entry.dateStr >= request.startDate)
    .filter((entry) => !request.endDate || entry.dateStr <= request.endDate)

  const buckets = new Map<string, { total: number; count: number }>()
  const activeDays = new Set<string>()
  const seenTrackerIds = new Set<number>()
  for (const entry of filtered) {
    activeDays.add(entry.dateStr)
    seenTrackerIds.add(entry.trackerId)
    const bucket = getStatsBucket(entry.dateStr, request.groupBy ?? 'day')
    const current = buckets.get(bucket) ?? { total: 0, count: 0 }
    current.total += entry.value ?? 1
    current.count += 1
    buckets.set(bucket, current)
  }

  return {
    totals: {
      entryCount: filtered.length,
      trackerCount: seenTrackerIds.size,
      activeDays: activeDays.size,
    },
    series: Array.from(buckets.entries()).sort(([a], [b]) => a.localeCompare(b)).map(([date, bucket]) => ({
      date,
      value: Math.round(bucket.total * 100) / 100,
      count: bucket.count,
    })),
    caveat: 'Deterministic local summary only; descriptive stats do not imply causation.',
  }
}

function calculateImpact(sourceTrackerId: number, targetTrackerId: number, offsetDays = 0, minSampleSize = 5) {
  if (sourceTrackerId === targetTrackerId) throw new Error('Source and target trackers must be different')
  const cutoff = new Date()
  cutoff.setDate(cutoff.getDate() - 365)
  const cutoffDateStr = cutoff.toISOString().slice(0, 10)
  const sourceRows = getDb()
    .prepare('SELECT date_str AS dateStr, value, CASE WHEN value > 0 OR note IS NOT NULL THEN 1 ELSE 0 END AS hasEntry FROM entries WHERE tracker_id = ? AND date_str >= ? ORDER BY date_str DESC')
    .all(sourceTrackerId, cutoffDateStr) as Array<{ dateStr: string; value: number | null; hasEntry: number }>
  const targetRows = getDb()
    .prepare('SELECT date_str AS dateStr, value FROM entries WHERE tracker_id = ? AND date_str >= ? ORDER BY date_str DESC')
    .all(targetTrackerId, cutoffDateStr) as Array<{ dateStr: string; value: number | null }>

  const targetMap = new Map(targetRows.map((entry) => [entry.dateStr, entry.value]))
  const cohortA: number[] = []
  const cohortB: number[] = []
  for (const source of sourceRows) {
    const targetDate = new Date(source.dateStr)
    targetDate.setDate(targetDate.getDate() + offsetDays)
    const targetDateStr = formatDateStr(targetDate.getTime())
    const value = targetMap.get(targetDateStr)
    if (value == null) continue
    if (source.hasEntry) cohortA.push(value)
    else cohortB.push(value)
  }

  const average = (values: number[]) => values.length === 0 ? 0 : values.reduce((sum, value) => sum + value, 0) / values.length
  const baselineAvg = average(cohortB)
  const impactedAvg = average(cohortA)
  const rawImpact = baselineAvg <= 0 ? (impactedAvg > 0 ? MAX_CORRELATION_IMPACT : 0) : ((impactedAvg - baselineAvg) / baselineAvg) * 100
  const totalSamples = cohortA.length + cohortB.length
  const confidence = Math.min(100, (totalSamples / MIN_SAMPLES_FOR_CONFIDENCE) * 100)
  const cohortBalance = cohortA.length > 0 && cohortB.length > 0 ? Math.min(cohortA.length, cohortB.length) / Math.max(cohortA.length, cohortB.length) : 0
  const dataQuality = totalSamples >= 30 && cohortBalance >= 0.3 ? 'high' : totalSamples >= 15 && cohortBalance >= 0.2 ? 'medium' : 'low'
  const hasSufficientData = totalSamples >= minSampleSize && dataQuality !== 'low'
  const impact = Number.isFinite(rawImpact) ? Math.max(-100, Math.min(100, rawImpact)) : 0
  const insightType = Math.abs(impact) > 10 && confidence > 30
    ? impact > 0 ? 'positive_synergy' : 'destructive_interference'
    : 'neutral_correlation'

  return {
    sourceTrackerId,
    targetTrackerId,
    offsetDays,
    impact: Math.round(impact * 10) / 10,
    confidence: Math.round(confidence),
    baselineAvg: Math.round(baselineAvg * 100) / 100,
    impactedAvg: Math.round(impactedAvg * 100) / 100,
    triggeredDays: cohortA.length,
    baselineDays: cohortB.length,
    metadata: {
      totalDays: totalSamples,
      dataQuality,
      hasSufficientData,
      recommendedActions: hasSufficientData ? ['Review this pattern with more context before acting.'] : ['Continue tracking for more reliable insights'],
    },
    insightType,
    userFriendlyConfidence: `${Math.round(confidence)}% confidence (${totalSamples} samples)`,
  }
}

function getCorrelationResult(request: CorrelationQueryRequest) {
  const result = calculateImpact(
    request.sourceTrackerId,
    request.targetTrackerId,
    request.offsetDays ?? 0,
    request.minSampleSize ?? 5,
  )
  return {
    sourceTrackerId: result.sourceTrackerId,
    targetTrackerId: result.targetTrackerId,
    offsetDays: result.offsetDays,
    impact: result.impact,
    confidence: result.confidence,
    baselineAvg: result.baselineAvg,
    impactedAvg: result.impactedAvg,
    triggeredDays: result.triggeredDays,
    baselineDays: result.baselineDays,
    caveat: 'Correlation is descriptive and local-only; it is not evidence of causation.',
  }
}

function addWeightEntry(data: CreateWeightEntryRequest) {
  if (!Number.isFinite(data.weight)) throw new Error('Weight must be a finite number')
  const insert = getDb().transaction(() => {
    const dateStr = formatDateStr(data.timestamp)
    const inserted = getDb()
      .prepare(`
        INSERT INTO entries (tracker_id, value, note, metadata, asset_id, timestamp, date_str)
        VALUES (@trackerId, @value, @note, @metadata, @assetId, @timestamp, @dateStr)
      `)
      .run({
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
        assetId: data.assetId ?? null,
        timestamp: data.timestamp,
        dateStr,
      })
    const entryId = Number(inserted.lastInsertRowid)
    getDb()
      .prepare(`
        INSERT INTO entry_weight (entry_id, weight_value, weight_unit, waist_value, waist_unit, body_fat_percentage)
        VALUES (@entryId, @weight, @weightUnit, @waist, @waistUnit, @bodyFatPercentage)
      `)
      .run({
        entryId,
        weight: data.weight,
        weightUnit: data.weightUnit,
        waist: data.waist ?? null,
        waistUnit: data.waistUnit ?? null,
        bodyFatPercentage: data.bodyFatPercentage ?? null,
      })
    replaceEntryTags(entryId, data.tagIds)
    return entryId
  })()
  const id = insert
  const entry = getWeightEntryById(id)
  return entry ? { entry, tags: tagsForEntry(id) } : null
}

function getWeightEntryById(entryId: number): WeightEntry | null {
  const row = getDb()
    .prepare(`
      SELECT e.id AS entry_id, e.tracker_id, e.note, e.timestamp, e.date_str, e.asset_id,
             ew.weight_value, ew.weight_unit, ew.waist_value, ew.waist_unit, ew.body_fat_percentage
      FROM entry_weight ew
      JOIN entries e ON ew.entry_id = e.id
      WHERE e.id = ?
    `)
    .get(entryId)
  if (!row) return null
  const entry = mapWeightEntry(row as JsonRecord)
  const tagIdsByEntry = getEntryTagIds([entry.entryId])
  return { ...entry, tagIds: tagIdsByEntry.get(entry.entryId) ?? [] }
}

function tagsForEntry(entryId: number): Tag[] {
  const tagIds = new Set(getEntryTagIds([entryId]).get(entryId) ?? [])
  return getTags().filter((tag) => tagIds.has(tag.id))
}

function updateWeightEntry(entryId: number, updates: UpdateWeightEntryRequest) {
  getDb().transaction(() => {
    const entrySet: string[] = []
    const entryParams: JsonRecord = { entryId }
    const weightSet: string[] = []
    const weightParams: JsonRecord = { entryId }

    if (updates.weight !== undefined) {
      if (!Number.isFinite(updates.weight)) throw new Error('Weight must be a finite number')
      entrySet.push('value = @weight')
      weightSet.push('weight_value = @weight')
      entryParams.weight = updates.weight
      weightParams.weight = updates.weight
    }
    if (updates.weightUnit !== undefined) {
      weightSet.push('weight_unit = @weightUnit')
      weightParams.weightUnit = updates.weightUnit
    }
    if (updates.waist !== undefined) {
      weightSet.push('waist_value = @waist')
      weightParams.waist = updates.waist
    }
    if (updates.waistUnit !== undefined) {
      weightSet.push('waist_unit = @waistUnit')
      weightParams.waistUnit = updates.waistUnit
    }
    if (updates.bodyFatPercentage !== undefined) {
      weightSet.push('body_fat_percentage = @bodyFatPercentage')
      weightParams.bodyFatPercentage = updates.bodyFatPercentage
    }
    if (updates.note !== undefined) {
      entrySet.push('note = @note')
      entryParams.note = updates.note
    }
    if (updates.assetId !== undefined) {
      entrySet.push('asset_id = @assetId')
      entryParams.assetId = updates.assetId
    }
    if (updates.timestamp !== undefined) {
      entrySet.push('timestamp = @timestamp')
      entrySet.push('date_str = @dateStr')
      entryParams.timestamp = updates.timestamp
      entryParams.dateStr = formatDateStr(updates.timestamp)
    }
    if (entrySet.length > 0) {
      getDb().prepare(`UPDATE entries SET ${entrySet.join(', ')} WHERE id = @entryId`).run(entryParams)
    }
    if (weightSet.length > 0) {
      getDb().prepare(`UPDATE entry_weight SET ${weightSet.join(', ')} WHERE entry_id = @entryId`).run(weightParams)
    }
    replaceEntryTags(entryId, updates.tagIds)
  })()
  const entry = getWeightEntryById(entryId)
  return entry ? { entry, tags: tagsForEntry(entryId) } : null
}

function getWeightHistory(trackerId: number, limit = 365): WeightEntry[] {
  const rows = getDb()
    .prepare(`
      SELECT e.id AS entry_id, e.tracker_id, e.note, e.timestamp, e.date_str, e.asset_id,
             ew.weight_value, ew.weight_unit, ew.waist_value, ew.waist_unit, ew.body_fat_percentage
      FROM entry_weight ew
      JOIN entries e ON ew.entry_id = e.id
      WHERE e.tracker_id = ?
      ORDER BY e.timestamp DESC
      LIMIT ?
    `)
    .all(trackerId, limit)
  const history = rows.map((row) => mapWeightEntry(row as JsonRecord))
  const tagIdsByEntry = getEntryTagIds(history.map((entry) => entry.entryId))
  return history.map((entry) => ({ ...entry, tagIds: tagIdsByEntry.get(entry.entryId) ?? [] }))
}

function getWeightGoal(trackerId: number): TrackerGoal | null {
  const row = getDb()
    .prepare('SELECT * FROM tracker_goals WHERE tracker_id = ? AND active = 1 ORDER BY created_at DESC LIMIT 1')
    .get(trackerId)
  return row ? mapTrackerGoal(row as JsonRecord) : null
}

function setWeightGoal(data: SetTrackerGoalRequest): TrackerGoal | null {
  const now = Date.now()
  getDb().transaction(() => {
    if (data.active ?? true) {
      getDb().prepare('UPDATE tracker_goals SET active = 0, updated_at = ? WHERE tracker_id = ?').run(now, data.trackerId)
    }
    getDb()
      .prepare(`
        INSERT INTO tracker_goals (tracker_id, goal_type, target_value, unit, direction, start_date, target_date, active, created_at, updated_at)
        VALUES (@trackerId, @goalType, @targetValue, @unit, @direction, @startDate, @targetDate, @active, @createdAt, @updatedAt)
      `)
      .run({
        trackerId: data.trackerId,
        goalType: data.goalType,
        targetValue: data.targetValue,
        unit: data.unit ?? null,
        direction: data.direction ?? null,
        startDate: data.startDate ?? null,
        targetDate: data.targetDate ?? null,
        active: data.active ?? true ? 1 : 0,
        createdAt: now,
        updatedAt: now,
      })
  })()
  return getWeightGoal(data.trackerId)
}

function isFoodTracker(trackerId: number): boolean {
  const row = getDb().prepare('SELECT * FROM trackers WHERE id = ? LIMIT 1').get(trackerId)
  if (!row) return false
  return getTrackerIdentity(mapTracker(row as JsonRecord)) === 'diet'
}

function isGamingTracker(trackerId: number): boolean {
  const row = getDb().prepare('SELECT * FROM trackers WHERE id = ? LIMIT 1').get(trackerId)
  if (!row) return false
  return getTrackerIdentity(mapTracker(row as JsonRecord)) === 'gaming'
}

function isBooksTracker(trackerId: number): boolean {
  const row = getDb().prepare('SELECT * FROM trackers WHERE id = ? LIMIT 1').get(trackerId)
  if (!row) return false
  return getTrackerIdentity(mapTracker(row as JsonRecord)) === 'books'
}

function getGamingEntryById(entryId: number): GamingEntryResponse | null {
  const row = getDb()
    .prepare(`
      SELECT
        e.id,
        e.tracker_id,
        e.value,
        e.note,
        e.metadata,
        e.timestamp,
        e.date_str,
        e.asset_id,
        eg.entry_id AS gaming_structured,
        eg.game_title,
        eg.game_key,
        eg.estimated_hours
      FROM entries e
      LEFT JOIN entry_gaming eg ON eg.entry_id = e.id
      WHERE e.id = ?
      LIMIT 1
    `)
    .get(entryId) as JsonRecord | undefined

  if (!row) return null
  const entry = mapEntry(row)
  if (!entry.gaming?.structured) return null
  return {
    entry: entryToGamingReadModel(entry) as GamingEntryResponse['entry'],
    tags: tagsForEntry(entryId),
  }
}

function addGamingEntry(data: CreateGamingEntryRequest): GamingEntryResponse | null {
  if (!isGamingTracker(data.trackerId)) throw new Error('Gaming entries can only be created for the Gaming tracker')
  const gameTitle = normalizeGamingTitle(data.gameTitle)
  if (!gameTitle) throw new Error('Game title is required')
  const estimatedHours = validateEstimatedHours(data.estimatedHours)
  const gameKey = normalizeGameKey(gameTitle)
  if (!Number.isFinite(data.timestamp)) throw new Error('Timestamp must be finite')
  const dateStr = formatDateStr(data.timestamp)

  const insert = getDb().transaction(() => {
    const result = getDb()
      .prepare(`
        INSERT INTO entries (tracker_id, value, note, metadata, asset_id, timestamp, date_str)
        VALUES (@trackerId, @value, @note, @metadata, @assetId, @timestamp, @dateStr)
      `)
      .run({
        trackerId: data.trackerId,
        value: null,
        note: gameTitle,
        metadata: JSON.stringify({ trackerKind: 'gaming' }),
        assetId: data.assetId ?? null,
        timestamp: data.timestamp,
        dateStr,
      })
    const entryId = Number(result.lastInsertRowid)
    getDb()
      .prepare(`
        INSERT INTO entry_gaming (entry_id, game_title, game_key, estimated_hours)
        VALUES (?, ?, ?, ?)
      `)
      .run(entryId, gameTitle, gameKey, estimatedHours)
    replaceEntryTags(entryId, data.tagIds)
    return entryId
  })()

  return getGamingEntryById(insert)
}

function updateGamingEntry(entryId: number, updates: UpdateGamingEntryRequest): GamingEntryResponse | null {
  const existing = getDb()
    .prepare(`
      SELECT e.tracker_id, eg.entry_id AS gaming_structured
      FROM entries e
      LEFT JOIN entry_gaming eg ON eg.entry_id = e.id
      WHERE e.id = ?
      LIMIT 1
    `)
    .get(entryId) as JsonRecord | undefined

  if (!existing || !existing.gaming_structured || !isGamingTracker(Number(existing.tracker_id))) {
    throw new Error('Structured Gaming entries can only be updated through the Gaming flow')
  }

  const entrySet: string[] = []
  const entryParams: JsonRecord = { id: entryId }
  const gamingSet: string[] = []
  const gamingParams: JsonRecord = { id: entryId }

  if ('gameTitle' in updates) {
    const gameTitle = normalizeGamingTitle(String(updates.gameTitle ?? ''))
    if (!gameTitle) throw new Error('Game title is required')
    entrySet.push('note = @gameTitle')
    entryParams.gameTitle = gameTitle
    gamingSet.push('game_title = @gameTitle')
    gamingSet.push('game_key = @gameKey')
    gamingParams.gameTitle = gameTitle
    gamingParams.gameKey = normalizeGameKey(gameTitle)
  }
  if ('estimatedHours' in updates) {
    gamingSet.push('estimated_hours = @estimatedHours')
    gamingParams.estimatedHours = validateEstimatedHours(updates.estimatedHours)
  }
  if ('assetId' in updates) {
    entrySet.push('asset_id = @assetId')
    entryParams.assetId = updates.assetId ?? null
  }
  if ('timestamp' in updates) {
    const timestamp = Number(updates.timestamp)
    if (!Number.isFinite(timestamp)) throw new Error('Timestamp must be finite')
    entrySet.push('timestamp = @timestamp')
    entrySet.push('date_str = @dateStr')
    entryParams.timestamp = timestamp
    entryParams.dateStr = formatDateStr(timestamp)
  }

  getDb().transaction(() => {
    if (entrySet.length > 0) {
      getDb().prepare(`UPDATE entries SET ${entrySet.join(', ')} WHERE id = @id`).run(entryParams)
    }
    if (gamingSet.length > 0) {
      getDb().prepare(`UPDATE entry_gaming SET ${gamingSet.join(', ')} WHERE entry_id = @id`).run(gamingParams)
    }
    replaceEntryTags(entryId, updates.tagIds)
  })()

  return getGamingEntryById(entryId)
}

function getFoodEntryById(entryId: number): FoodEntryResponse | null {
  const row = getDb()
    .prepare(`
      SELECT
        e.id,
        e.tracker_id,
        e.value,
        e.note,
        e.metadata,
        e.timestamp,
        e.date_str,
        e.asset_id,
        ef.entry_id AS food_structured,
        ef.food_name,
        ef.food_key,
        ef.calories,
        ef.meal_type
      FROM entries e
      LEFT JOIN entry_food ef ON ef.entry_id = e.id
      WHERE e.id = ?
      LIMIT 1
    `)
    .get(entryId) as JsonRecord | undefined

  if (!row) return null
  const entry = mapEntry(row)
  if (!entry.food?.structured) return null
  return {
    entry: entryToFoodHistoryItem(entry) as FoodEntryResponse['entry'],
    tags: tagsForEntry(entryId),
  }
}

function addFoodEntry(data: CreateFoodEntryRequest): FoodEntryResponse | null {
  if (!isFoodTracker(data.trackerId)) throw new Error('Food entries can only be created for the Diet tracker')
  const foodName = normalizeFoodName(data.foodName)
  if (!foodName) throw new Error('Food name is required')
  const foodKey = normalizeFoodKey(foodName)
  const calories = validateCaloriesOptional(data.calories)
  const mealType = validateMealType(data.mealType)
  if (!Number.isFinite(data.timestamp)) throw new Error('Timestamp must be finite')
  const dateStr = formatDateStr(data.timestamp)

  const entryId = getDb().transaction(() => {
    const inserted = getDb()
      .prepare(`
        INSERT INTO entries (tracker_id, value, note, metadata, asset_id, timestamp, date_str)
        VALUES (@trackerId, @value, @note, @metadata, @assetId, @timestamp, @dateStr)
      `)
      .run({
        trackerId: data.trackerId,
        value: null,
        note: foodName,
        metadata: JSON.stringify({
          trackerKind: 'diet',
          food: { structured: true, foodName, foodKey, calories, mealType },
        }),
        assetId: data.assetId ?? null,
        timestamp: data.timestamp,
        dateStr,
      })
    const insertedEntryId = Number(inserted.lastInsertRowid)
    getDb()
      .prepare(`
        INSERT INTO entry_food (entry_id, food_name, food_key, calories, meal_type)
        VALUES (?, ?, ?, ?, ?)
      `)
      .run(insertedEntryId, foodName, foodKey, calories, mealType)
    replaceEntryTags(insertedEntryId, data.tagIds)
    return insertedEntryId
  })()

  return getFoodEntryById(entryId)
}

function updateFoodEntry(entryId: number, updates: UpdateFoodEntryRequest): FoodEntryResponse | null {
  const existing = getDb()
    .prepare(`
      SELECT e.tracker_id, ef.entry_id AS food_structured
      FROM entries e
      LEFT JOIN entry_food ef ON ef.entry_id = e.id
      WHERE e.id = ?
      LIMIT 1
    `)
    .get(entryId) as JsonRecord | undefined

  if (!existing?.food_structured || !isFoodTracker(Number(existing.tracker_id))) {
    throw new Error('Structured Food entries can only be updated through the Food flow')
  }

  const entrySet: string[] = []
  const foodSet: string[] = []
  const entryParams: JsonRecord = { entryId }
  const foodParams: JsonRecord = { entryId }

  if (updates.foodName !== undefined) {
    const foodName = normalizeFoodName(updates.foodName)
    if (!foodName) throw new Error('Food name is required')
    entrySet.push('note = @foodName')
    foodSet.push('food_name = @foodName')
    foodSet.push('food_key = @foodKey')
    entryParams.foodName = foodName
    foodParams.foodName = foodName
    foodParams.foodKey = normalizeFoodKey(foodName)
  }
  if (updates.calories !== undefined) {
    foodSet.push('calories = @calories')
    foodParams.calories = validateCaloriesOptional(updates.calories)
  }
  if (updates.mealType !== undefined) {
    foodSet.push('meal_type = @mealType')
    foodParams.mealType = validateMealType(updates.mealType)
  }
  if (updates.assetId !== undefined) {
    entrySet.push('asset_id = @assetId')
    entryParams.assetId = updates.assetId ?? null
  }
  if (updates.timestamp !== undefined) {
    const timestamp = Number(updates.timestamp)
    if (!Number.isFinite(timestamp)) throw new Error('Timestamp must be finite')
    entrySet.push('timestamp = @timestamp')
    entrySet.push('date_str = @dateStr')
    entryParams.timestamp = timestamp
    entryParams.dateStr = formatDateStr(timestamp)
  }

  getDb().transaction(() => {
    if (entrySet.length > 0) {
      getDb().prepare(`UPDATE entries SET ${entrySet.join(', ')} WHERE id = @entryId`).run(entryParams)
    }
    if (foodSet.length > 0) {
      getDb().prepare(`UPDATE entry_food SET ${foodSet.join(', ')} WHERE entry_id = @entryId`).run(foodParams)
    }
    replaceEntryTags(entryId, updates.tagIds)
  })()

  return getFoodEntryById(entryId)
}

function deleteFoodEntry(entryId: number): boolean {
  const existing = getDb()
    .prepare(`
      SELECT e.tracker_id, ef.entry_id AS food_structured
      FROM entries e
      LEFT JOIN entry_food ef ON ef.entry_id = e.id
      WHERE e.id = ?
      LIMIT 1
    `)
    .get(entryId) as JsonRecord | undefined

  if (!existing?.food_structured || !isFoodTracker(Number(existing.tracker_id))) {
    throw new Error('Structured Food entries can only be deleted through the Food flow')
  }

  getDb().transaction(() => {
    getDb().prepare('DELETE FROM entries_to_tags WHERE entry_id = ?').run(entryId)
    getDb().prepare('DELETE FROM entry_food WHERE entry_id = ?').run(entryId)
    getDb().prepare('DELETE FROM entries WHERE id = ?').run(entryId)
  })()
  return true
}

function getFoodDetail(trackerId: number, options: { limit?: number } = {}): FoodDetailResponse {
  if (!isFoodTracker(trackerId)) {
    throw new Error('Food detail can only be read for the Diet tracker')
  }
  const entries = getEntries({ trackerId, limit: options.limit ?? 365 })
  return buildFoodDetailReadModel(entries, getTags())
}

function getGamingDetail(trackerId: number, options: { limit?: number } = {}): GamingDetailResponse {
  const entries = getEntries({ trackerId, limit: options.limit ?? 365 })
  return buildGamingDetailReadModel(entries)
}

function assertFiniteNumber(value: number, label: string): void {
  if (!Number.isFinite(value)) {
    throw new Error(`${label} must be a finite number`)
  }
}

function assertDateString(value: string, label: string): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw new Error(`${label} must be an ISO date string in YYYY-MM-DD format`)
  }
  return value
}

function validateShelf(value: unknown): Book['shelf'] {
  const allowed: Book['shelf'][] = ['tbr', 'reading', 'finished', 'paused', 'dropped']
  if (value === undefined || value === null) return 'tbr'
  const text = String(value)
  if (!allowed.includes(text as Book['shelf'])) {
    throw new Error(`Shelf must be one of: ${allowed.join(', ')}`)
  }
  return text as Book['shelf']
}

function validateStatus(value: unknown): Book['status'] {
  const allowed: Book['status'][] = ['planned', 'active', 'completed', 'paused', 'dropped']
  if (value === undefined || value === null) return 'planned'
  const text = String(value)
  if (!allowed.includes(text as Book['status'])) {
    throw new Error(`Status must be one of: ${allowed.join(', ')}`)
  }
  return text as Book['status']
}

function mapBookRow(row: JsonRecord): Book {
  return {
    id: Number(row.id),
    title: String(row.title ?? ''),
    titleKey: String(row.title_key ?? row.titleKey ?? ''),
    shelf: (row.shelf as Book['shelf']) ?? 'tbr',
    status: (row.status as Book['status']) ?? 'planned',
    startedDate: (row.started_date ?? row.startedDate ?? null) as string | null,
    finishedDate: (row.finished_date ?? row.finishedDate ?? null) as string | null,
    ratingTenths: row.rating_tenths == null ? (row.ratingTenths == null ? null : Number(row.ratingTenths)) : Number(row.rating_tenths),
    createdAt: row.created_at == null ? (row.createdAt == null ? null : Number(row.createdAt)) : Number(row.created_at),
    updatedAt: row.updated_at == null ? (row.updatedAt == null ? null : Number(row.updatedAt)) : Number(row.updated_at),
  }
}

function getBookById(bookId: number): Book | null {
  const row = getDb().prepare('SELECT * FROM books WHERE id = ? LIMIT 1').get(bookId)
  return row ? mapBookRow(row as JsonRecord) : null
}

function getBookEntryById(entryId: number): BookActivityResponse | null {
  const row = getDb()
    .prepare(`
      SELECT
        e.id,
        e.tracker_id,
        e.timestamp,
        e.date_str,
        e.asset_id,
        ba.entry_id AS book_structured,
        ba.book_id,
        b.title AS book_title,
        b.title_key AS book_title_key,
        ba.activity_type AS book_activity_type
      FROM entries e
      LEFT JOIN book_activities ba ON ba.entry_id = e.id
      LEFT JOIN books b ON b.id = ba.book_id
      WHERE e.id = ?
      LIMIT 1
    `)
    .get(entryId) as JsonRecord | undefined

  if (!row) return null
  const entry = mapEntry(row)
  if (!entry.book?.structured) return null
  const book = getBookById(entry.book.bookId)
  if (!book) return null
  return {
    entry: entryToBookHistoryItem(entry) as BookActivityResponse['entry'],
    book,
    tags: tagsForEntry(entryId),
  }
}

function getBook(bookId: number): BookResponse | null {
  const row = getDb().prepare('SELECT * FROM books WHERE id = ? LIMIT 1').get(bookId)
  return row ? { book: mapBookRow(row as JsonRecord) } : null
}

function getBooks(): Book[] {
  return getDb()
    .prepare('SELECT * FROM books ORDER BY updated_at DESC, created_at DESC, id DESC')
    .all()
    .map((row) => mapBookRow(row as JsonRecord))
}

function getBookEntries(trackerId: number, limit = 365): Entry[] {
  return getEntries({ trackerId, limit })
}

function applyBookActivityState(book: Book, activityType: BookActivityType, dateStr: string): Partial<Book> {
  const next: Partial<Book> = { updatedAt: Date.now() }
  if (activityType === 'started') {
    next.shelf = 'reading'
    next.status = 'active'
    next.startedDate = book.startedDate ?? dateStr
  }
  if (activityType === 'read') {
    next.shelf = book.status === 'completed' || book.status === 'dropped' ? book.shelf : 'reading'
    next.status = book.status === 'completed' || book.status === 'dropped' ? book.status : 'active'
    next.startedDate = book.startedDate ?? dateStr
  }
  if (activityType === 'finished') {
    next.shelf = 'finished'
    next.status = 'completed'
    next.startedDate = book.startedDate ?? dateStr
    next.finishedDate = dateStr
  }
  return next
}

function createBookActivity(
  activityType: BookActivityType,
  data: CreateBookActivityRequest,
): BookActivityResponse | null {
  if (!isBooksTracker(data.trackerId)) {
    throw new Error('Book activities can only be created for the Books tracker')
  }

  assertFiniteNumber(data.timestamp, 'Timestamp')
  const dateStr = formatDateStr(data.timestamp)
  const book = getBookById(data.bookId)
  if (!book) throw new Error('Book not found')

  const inserted = getDb().transaction(() => {
    if (activityType === 'read') {
      const existing = getDb()
        .prepare('SELECT entry_id AS entryId FROM book_activities WHERE book_id = ? AND date_str = ? AND activity_type = ? LIMIT 1')
        .get(data.bookId, dateStr, 'read') as { entryId?: number } | undefined
      if (existing?.entryId != null) {
        return Number(existing.entryId)
      }
    }

    const result = getDb()
      .prepare(`
        INSERT INTO entries (tracker_id, value, note, metadata, asset_id, timestamp, date_str)
        VALUES (@trackerId, @value, @note, @metadata, @assetId, @timestamp, @dateStr)
      `)
      .run({
        trackerId: data.trackerId,
        value: null,
        note: book.title,
        metadata: JSON.stringify({ trackerKind: 'books', bookId: book.id, activityType }),
        assetId: data.assetId ?? null,
        timestamp: data.timestamp,
        dateStr,
      })
    const entryId = Number(result.lastInsertRowid)
    getDb()
      .prepare('INSERT INTO book_activities (entry_id, book_id, activity_type, date_str) VALUES (?, ?, ?, ?)')
      .run(entryId, data.bookId, activityType, dateStr)
    replaceEntryTags(entryId, data.tagIds)

    const bookUpdates = applyBookActivityState(book, activityType, dateStr)
    if (Object.keys(bookUpdates).length > 0) {
      const set: string[] = []
      const params: JsonRecord = { id: book.id }
      if (bookUpdates.updatedAt !== undefined) {
        set.push('updated_at = @updatedAt')
        params.updatedAt = bookUpdates.updatedAt
      }
      if (bookUpdates.shelf !== undefined) {
        set.push('shelf = @shelf')
        params.shelf = bookUpdates.shelf
      }
      if (bookUpdates.status !== undefined) {
        set.push('status = @status')
        params.status = bookUpdates.status
      }
      if (bookUpdates.startedDate !== undefined) {
        set.push('started_date = @startedDate')
        params.startedDate = bookUpdates.startedDate
      }
      if (bookUpdates.finishedDate !== undefined) {
        set.push('finished_date = @finishedDate')
        params.finishedDate = bookUpdates.finishedDate
      }
      if (set.length > 0) {
        getDb().prepare(`UPDATE books SET ${set.join(', ')} WHERE id = @id`).run(params)
      }
    }

    return entryId
  })()

  if (inserted == null) return null
  return getBookEntryById(inserted)
}

function createBook(data: CreateBookRequest): BookResponse | null {
  const title = normalizeBookTitle(data.title)
  if (!title) throw new Error('Book title is required')
  const result = getDb()
    .prepare(`
      INSERT INTO books (title, title_key, shelf, status, started_date, finished_date, rating_tenths, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `)
    .run(
      title,
      normalizeBookTitleKey(title),
      validateShelf(data.shelf),
      validateStatus(data.status),
      data.startedDate == null ? null : assertDateString(data.startedDate, 'Started date'),
      data.finishedDate == null ? null : assertDateString(data.finishedDate, 'Finished date'),
      data.ratingTenths == null ? null : validateBookRatingTenths(data.ratingTenths),
      Date.now(),
      Date.now(),
    )
  const row = getDb().prepare('SELECT * FROM books WHERE id = ?').get(result.lastInsertRowid)
  return row ? { book: mapBookRow(row as JsonRecord) } : null
}

function updateBook(bookId: number, updates: UpdateBookRequest): BookResponse | null {
  const existing = getBookById(bookId)
  if (!existing) return null

  const set: string[] = ['updated_at = ?']
  const params: Array<unknown> = [Date.now()]
  if (updates.title !== undefined) {
    const title = normalizeBookTitle(updates.title)
    if (!title) throw new Error('Book title is required')
    set.push('title = ?')
    set.push('title_key = ?')
    params.push(title, normalizeBookTitleKey(title))
  }
  if (updates.shelf !== undefined) {
    set.push('shelf = ?')
    params.push(validateShelf(updates.shelf))
  }
  if (updates.status !== undefined) {
    set.push('status = ?')
    params.push(validateStatus(updates.status))
  }
  if (updates.startedDate !== undefined) {
    set.push('started_date = ?')
    params.push(updates.startedDate == null ? null : assertDateString(updates.startedDate, 'Started date'))
  }
  if (updates.finishedDate !== undefined) {
    set.push('finished_date = ?')
    params.push(updates.finishedDate == null ? null : assertDateString(updates.finishedDate, 'Finished date'))
  }
  if (updates.ratingTenths !== undefined) {
    set.push('rating_tenths = ?')
    params.push(updates.ratingTenths == null ? null : validateBookRatingTenths(updates.ratingTenths))
  }

  params.push(bookId)
  getDb().prepare(`UPDATE books SET ${set.join(', ')} WHERE id = ?`).run(...params)
  const updated = getBookById(bookId)
  return updated ? { book: updated } : null
}

function updateBookReadActivity(entryId: number, updates: UpdateBookActivityRequest): BookActivityResponse | null {
  const existing = getDb()
    .prepare(`
      SELECT
        e.tracker_id,
        ba.entry_id AS book_structured,
        ba.book_id AS book_id,
        ba.activity_type AS activity_type
      FROM entries e
      LEFT JOIN book_activities ba ON ba.entry_id = e.id
      WHERE e.id = ?
      LIMIT 1
    `)
    .get(entryId) as JsonRecord | undefined

  if (!existing?.book_structured || !isBooksTracker(Number(existing.tracker_id)) || String(existing.activity_type) !== 'read') {
    throw new Error('Structured book read activities can only be updated through the Books flow')
  }
  if (existing.book_id == null) {
    throw new Error('Structured book read activities must reference a book')
  }

  const entrySet: Record<string, unknown> = {}
  if (updates.timestamp !== undefined) {
    assertFiniteNumber(updates.timestamp, 'Timestamp')
    const dateStr = formatDateStr(updates.timestamp)

    const duplicate = getDb()
      .prepare('SELECT entry_id FROM book_activities WHERE book_id = ? AND date_str = ? AND activity_type = ? AND entry_id != ? LIMIT 1')
      .all(existing.book_id, dateStr, 'read', entryId)
    if (duplicate.length > 0) {
      throw new Error('One read activity per book and date is allowed')
    }
    entrySet.timestamp = updates.timestamp
    entrySet.dateStr = dateStr
  }
  if (updates.assetId !== undefined) entrySet.assetId = updates.assetId

  getDb().transaction(() => {
    if (entrySet.timestamp !== undefined) {
      getDb().prepare('UPDATE entries SET timestamp = ? WHERE id = ?').run(entrySet.timestamp, entryId)
    }
    if (entrySet.dateStr !== undefined) {
      getDb().prepare('UPDATE entries SET date_str = ? WHERE id = ?').run(entrySet.dateStr, entryId)
      getDb().prepare('UPDATE book_activities SET date_str = ? WHERE entry_id = ?').run(entrySet.dateStr, entryId)
    }
    if (entrySet.assetId !== undefined) {
      getDb().prepare('UPDATE entries SET asset_id = ? WHERE id = ?').run(entrySet.assetId ?? null, entryId)
    }
    replaceEntryTags(entryId, updates.tagIds)
  })()

  return getBookEntryById(entryId)
}

function deleteBookReadActivity(entryId: number): boolean {
  const existing = getDb()
    .prepare(`
      SELECT
        e.tracker_id,
        ba.entry_id AS book_structured,
        ba.activity_type AS activity_type
      FROM entries e
      LEFT JOIN book_activities ba ON ba.entry_id = e.id
      WHERE e.id = ?
      LIMIT 1
    `)
    .get(entryId) as JsonRecord | undefined

  if (!existing?.book_structured || !isBooksTracker(Number(existing.tracker_id)) || String(existing.activity_type) !== 'read') {
    throw new Error('Structured book read activities can only be deleted through the Books flow')
  }

  getDb().transaction(() => {
    getDb().prepare('DELETE FROM entries_to_tags WHERE entry_id = ?').run(entryId)
    getDb().prepare('DELETE FROM book_activities WHERE entry_id = ?').run(entryId)
    getDb().prepare('DELETE FROM entries WHERE id = ?').run(entryId)
  })()
  return true
}

function getBookHistory(trackerId: number, limit = 365): BookHistoryItem[] {
  return buildBookHistoryReadModel(getBookEntries(trackerId, limit)).entries
}

function getBookStats(trackerId: number, limit = 365): BookStatisticsReadModel {
  return buildBookStatisticsReadModel(getBookEntries(trackerId, limit))
}

function getBookSelectedDaySummary(trackerId: number, selectedDate: string, limit = 365): BookSelectedDaySummaryReadModel {
  return buildBookSelectedDayReadModel(getBookEntries(trackerId, limit), {
    trackerId,
    title: 'Books',
    selectedDate,
  })
}

function safeAssetPath(encodedPath: string): string | null {
  const relative = decodeURIComponent(encodedPath).replace(/\//g, sep).replace(/\\/g, sep)
  const assetsRoot = getAssetsRoot()
  const fullPath = resolve(assetsRoot, relative.replace(/^assets[\\/]/, ''))
  return fullPath.startsWith(assetsRoot + sep) || fullPath === assetsRoot ? fullPath : null
}

function contentType(filePath: string): string {
  const lower = filePath.toLowerCase()
  if (lower.endsWith('.png')) return 'image/png'
  if (lower.endsWith('.jpg') || lower.endsWith('.jpeg')) return 'image/jpeg'
  if (lower.endsWith('.gif')) return 'image/gif'
  if (lower.endsWith('.webp')) return 'image/webp'
  if (lower.endsWith('.svg')) return 'image/svg+xml'
  if (lower.endsWith('.mp4')) return 'video/mp4'
  if (lower.endsWith('.webm')) return 'video/webm'
  return 'application/octet-stream'
}

async function route(req: IncomingMessage, res: ServerResponse, url: URL): Promise<void> {
  const method = req.method ?? 'GET'
  const path = url.pathname

  if (path === '/api/health' && method === 'GET') {
    json(res, 200, { ok: true, dbPath: getWebDbPath() })
    return
  }

  if (path.startsWith('/api/assets/files/') && method === 'GET') {
    const filePath = safeAssetPath(path.slice('/api/assets/files/'.length))
    if (!filePath || !existsSync(filePath)) {
      json(res, 404, { error: 'Asset file not found' })
      return
    }
    res.statusCode = 200
    res.setHeader('content-type', contentType(filePath))
    createReadStream(filePath).pipe(res)
    return
  }

  if (path === '/api/trackers/recent' && method === 'GET') {
    const limit = Math.min(optionalInt(url.searchParams.get('limit')) ?? 10, 50)
    const rows = getDb()
      .prepare('SELECT tracker_id AS trackerId, max(timestamp) AS maxTs FROM entries GROUP BY tracker_id ORDER BY max(timestamp) DESC LIMIT ?')
      .all(limit) as Array<{ trackerId: number }>
    const byId = new Map(getTrackers().map((tracker) => [tracker.id, tracker]))
    json(res, 200, rows.map((row) => byId.get(row.trackerId)).filter((tracker): tracker is Tracker => !!tracker))
    return
  }

  if (path === '/api/trackers/favorites' && method === 'GET') {
    json(res, 200, getTrackers().filter((tracker) => tracker.isFavorite))
    return
  }

  if (path === '/api/trackers/reorder' && method === 'PUT') {
    const ids = normalizeIds(await readBody(req))
    getDb().transaction(() => {
      const update = getDb().prepare('UPDATE trackers SET "order" = ? WHERE id = ?')
      ids.forEach((id, index) => update.run(index, id))
    })()
    json(res, 200, true)
    return
  }

  if (path === '/api/trackers' && method === 'GET') {
    json(res, 200, getTrackers())
    return
  }

  if (path === '/api/trackers' && method === 'POST') {
    const body = asRecord(await readBody(req))
    const name = String(body.name ?? '').trim()
    if (!name) throw new Error('Tracker name is required')
    const uiType = String(body.type ?? 'numeric')
    const schemaType = uiType === 'counter' ? 'numeric' : uiType === 'rating' ? 'range' : uiType === 'list' ? 'text' : uiType
    const result = getDb()
      .prepare(`
        INSERT INTO trackers (name, type, icon, color, "order", config, is_custom, archived)
        VALUES (@name, @type, @icon, @color, @order, @config, 1, 0)
      `)
      .run({
        name,
        type: schemaType,
        icon: body.icon ?? null,
        color: body.color ?? null,
        order: Number(body.order ?? 0),
        config: JSON.stringify(body.config ?? {}),
      })
    const row = getDb().prepare('SELECT * FROM trackers WHERE id = ?').get(result.lastInsertRowid)
    json(res, 200, row ? mapTracker(row as JsonRecord) : null)
    return
  }

  const trackerTaskMatch = path.match(/^\/api\/trackers\/(\d+)\/task-entries$/)
  if (trackerTaskMatch && method === 'GET') {
    json(res, 200, getEntries({ trackerId: Number(trackerTaskMatch[1]), limit: optionalInt(url.searchParams.get('limit')) ?? 100 }))
    return
  }

  const trackerFavoriteMatch = path.match(/^\/api\/trackers\/(\d+)\/favorite$/)
  if (trackerFavoriteMatch && method === 'POST') {
    const id = Number(trackerFavoriteMatch[1])
    const row = getDb().prepare('SELECT is_favorite FROM trackers WHERE id = ?').get(id) as { is_favorite: number } | undefined
    if (!row) {
      json(res, 200, null)
      return
    }
    getDb().prepare('UPDATE trackers SET is_favorite = ? WHERE id = ?').run(row.is_favorite ? 0 : 1, id)
    const updated = getDb().prepare('SELECT * FROM trackers WHERE id = ?').get(id)
    json(res, 200, updated ? mapTracker(updated as JsonRecord) : null)
    return
  }

  const trackerMatch = path.match(/^\/api\/trackers\/(\d+)$/)
  if (trackerMatch && method === 'PUT') {
    const id = Number(trackerMatch[1])
    const updates = asRecord(await readBody(req))
    const set: string[] = []
    const params: JsonRecord = { id }
    if ('order' in updates) { set.push('"order" = @order'); params.order = updates.order }
    if ('isFavorite' in updates) { set.push('is_favorite = @isFavorite'); params.isFavorite = updates.isFavorite ? 1 : 0 }
    if ('name' in updates) { set.push('name = @name'); params.name = updates.name }
    if ('icon' in updates) { set.push('icon = @icon'); params.icon = updates.icon }
    if ('color' in updates) { set.push('color = @color'); params.color = updates.color }
    if ('config' in updates) { set.push('config = @config'); params.config = JSON.stringify(updates.config ?? {}) }
    if ('type' in updates) {
      const uiType = String(updates.type)
      set.push('type = @type')
      params.type = uiType === 'counter' ? 'numeric' : uiType === 'rating' ? 'range' : uiType === 'list' ? 'text' : uiType
    }
    if (set.length === 0) {
      json(res, 200, null)
      return
    }
    getDb().prepare(`UPDATE trackers SET ${set.join(', ')} WHERE id = @id`).run(params)
    const updated = getDb().prepare('SELECT * FROM trackers WHERE id = ?').get(id)
    json(res, 200, updated ? mapTracker(updated as JsonRecord) : null)
    return
  }

  if (trackerMatch && method === 'DELETE') {
    getDb().prepare('DELETE FROM trackers WHERE id = ?').run(Number(trackerMatch[1]))
    json(res, 200, true)
    return
  }

  if (path === '/api/entries' && method === 'GET') {
    json(res, 200, getEntries({
      limit: optionalInt(url.searchParams.get('limit')),
      trackerId: optionalInt(url.searchParams.get('trackerId')),
    }))
    return
  }

  if (path === '/api/entries' && method === 'POST') {
    json(res, 200, addEntry(await readBody(req) as BaseEntryRequest))
    return
  }

  const entryMatch = path.match(/^\/api\/entries\/(\d+)$/)
  if (entryMatch && method === 'PUT') {
    json(res, 200, updateEntry(Number(entryMatch[1]), asRecord(await readBody(req))))
    return
  }

  if (entryMatch && method === 'DELETE') {
    json(res, 200, deleteEntry(Number(entryMatch[1])))
    return
  }

  if (path === '/api/books' && method === 'POST') {
    json(res, 200, createBook(await readBody(req) as CreateBookRequest))
    return
  }

  if (path === '/api/books' && method === 'GET') {
    json(res, 200, getBooks())
    return
  }

  const bookMatch = path.match(/^\/api\/books\/(\d+)$/)
  if (bookMatch && method === 'GET') {
    json(res, 200, getBook(Number(bookMatch[1])))
    return
  }

  if (path === '/api/books/start' && method === 'POST') {
    json(res, 200, createBookActivity('started', await readBody(req) as CreateBookActivityRequest))
    return
  }

  if (path === '/api/books/read' && method === 'POST') {
    json(res, 200, createBookActivity('read', await readBody(req) as CreateBookActivityRequest))
    return
  }

  if (path === '/api/books/finish' && method === 'POST') {
    json(res, 200, createBookActivity('finished', await readBody(req) as CreateBookActivityRequest))
    return
  }

  if (bookMatch && method === 'PUT') {
    json(res, 200, updateBook(Number(bookMatch[1]), await readBody(req) as UpdateBookRequest))
    return
  }

  const bookReadMatch = path.match(/^\/api\/books\/read\/(\d+)$/)
  if (bookReadMatch && method === 'PUT') {
    json(res, 200, updateBookReadActivity(Number(bookReadMatch[1]), asRecord(await readBody(req)) as UpdateBookActivityRequest))
    return
  }

  if (bookReadMatch && method === 'DELETE') {
    json(res, 200, deleteBookReadActivity(Number(bookReadMatch[1])))
    return
  }

  const bookHistoryMatch = path.match(/^\/api\/books\/trackers\/(\d+)\/history$/)
  if (bookHistoryMatch && method === 'GET') {
    json(res, 200, getBookHistory(Number(bookHistoryMatch[1]), optionalInt(url.searchParams.get('limit')) ?? 365))
    return
  }

  const bookStatsMatch = path.match(/^\/api\/books\/trackers\/(\d+)\/stats$/)
  if (bookStatsMatch && method === 'GET') {
    json(res, 200, getBookStats(Number(bookStatsMatch[1]), optionalInt(url.searchParams.get('limit')) ?? 365))
    return
  }

  const bookSelectedDayMatch = path.match(/^\/api\/books\/trackers\/(\d+)\/selected-day\/([^/]+)$/)
  if (bookSelectedDayMatch && method === 'GET') {
    json(res, 200, getBookSelectedDaySummary(Number(bookSelectedDayMatch[1]), decodeURIComponent(bookSelectedDayMatch[2]), optionalInt(url.searchParams.get('limit')) ?? 365))
    return
  }

  if (path === '/api/quick-entry/context' && method === 'GET') {
    json(res, 200, getQuickEntryContext())
    return
  }

  if (path === '/api/dashboard/stats' && method === 'GET') {
    json(res, 200, getDashboardStats())
    return
  }

  if (path === '/api/dashboard/layout' && method === 'GET') {
    const row = getDb().prepare('SELECT dashboard_layout FROM settings WHERE id = 1').get() as { dashboard_layout?: string } | undefined
    json(res, 200, row?.dashboard_layout ? JSON.parse(row.dashboard_layout) : null)
    return
  }

  if (path === '/api/dashboard/layout' && method === 'PUT') {
    const body = await readBody(req)
    getDb().prepare('INSERT OR IGNORE INTO settings (id) VALUES (1)').run()
    getDb().prepare('UPDATE settings SET dashboard_layout = ? WHERE id = 1').run(JSON.stringify(body))
    json(res, 200, true)
    return
  }

  const calendarMatch = path.match(/^\/api\/calendar\/(\d+)\/(\d+)$/)
  if (calendarMatch && method === 'GET') {
    const year = Number(calendarMatch[1])
    const month = Number(calendarMatch[2])
    const monthStart = new Date(year, month, 1).toISOString().slice(0, 10)
    const monthEnd = new Date(year, month + 1, 0).toISOString().slice(0, 10)
    const data = getDb()
      .prepare(`
        SELECT
          e.*,
          t.name AS tracker_name,
          t.type AS tracker_type,
          t.icon AS tracker_icon,
          eg.entry_id AS gaming_structured,
          eg.game_title,
          eg.game_key,
          eg.estimated_hours,
          ef.entry_id AS food_structured,
          ef.food_name,
          ef.food_key,
          ef.calories,
          ef.meal_type,
          ew.weight_value,
          ew.weight_unit,
          ew.waist_value,
          ew.waist_unit
        FROM entries e
        LEFT JOIN trackers t ON t.id = e.tracker_id
        LEFT JOIN entry_gaming eg ON eg.entry_id = e.id
        LEFT JOIN entry_food ef ON ef.entry_id = e.id
        LEFT JOIN entry_weight ew ON ew.entry_id = e.id
        ORDER BY e.timestamp ASC
      `)
      .all()
    const tagIdsByEntry = getEntryTagIds(data.map((row) => Number((row as JsonRecord).id)))
    const entriesByDate: Record<string, ReturnType<typeof buildCalendarDayEntry>[]> = {}
    const activeDays = new Set<number>()
    for (const row of data) {
      const entry = mapEntry(row as JsonRecord)
      const record = row as JsonRecord
      const tracker = {
        name: String(record.tracker_name ?? ''),
        type: schemaTypeToUI(String(record.tracker_type ?? 'numeric'), {}),
        icon: record.tracker_icon == null ? null : String(record.tracker_icon),
      }
      const displayDates = new Set<string>()
      if (entry.dateStr >= monthStart && entry.dateStr <= monthEnd) displayDates.add(entry.dateStr)
      if (isTaskTrackerLike(tracker)) {
        const metadata = parseTaskStateMetadata(entry.metadata)
        if (metadata) {
          displayDates.add(getTaskActiveDate(entry))
          for (const postponement of metadata.postponements) displayDates.add(postponement.fromDate)
        }
      }

      for (const dateStr of displayDates) {
        if (dateStr < monthStart || dateStr > monthEnd) continue
        const day = Number(dateStr.slice(8, 10))
        activeDays.add(day)
        entriesByDate[dateStr] ??= []
        const taskState = isTaskTrackerLike(tracker) ? getTaskStateForDate(entry, dateStr) : 'hidden'
        const taskMetadata = parseTaskStateMetadata(entry.metadata)
        entriesByDate[dateStr].push(buildCalendarDayEntry({
        id: entry.id,
        trackerId: entry.trackerId,
        value: entry.value,
        note: entry.note,
        timestamp: entry.timestamp,
        dateStr,
        assetId: entry.assetId ?? null,
        tagIds: tagIdsByEntry.get(entry.id) ?? [],
        gaming: entry.gaming
          ? {
              structured: true,
              gameTitle: entry.gaming.gameTitle,
              gameKey: entry.gaming.gameKey,
              estimatedHours: entry.gaming.estimatedHours,
            }
          : undefined,
        food: entry.food
          ? {
              structured: true,
              foodName: entry.food.foodName,
              foodKey: entry.food.foodKey,
              calories: entry.food.calories,
              mealType: entry.food.mealType,
            }
          : undefined,
        task: taskState === 'hidden' || !taskMetadata
          ? null
          : {
              state: taskState,
              baseDate: entry.dateStr,
              activeDate: taskMetadata.activeDate,
              completed: (entry.value ?? 0) >= 1,
              postponements: taskMetadata.postponements,
            },
        weight: record.weight_value != null
          ? {
              weight: Number(record.weight_value),
              weightUnit: record.weight_unit === 'lb' ? 'lb' : 'kg',
              waist: record.waist_value == null ? null : Number(record.waist_value),
              waistUnit: record.waist_unit === 'in' ? 'in' : record.waist_unit === 'cm' ? 'cm' : null,
          }
          : null,
        }))
      }
    }
    json(res, 200, { year, month, entriesByDate, activeDays: Array.from(activeDays).sort((a, b) => a - b) })
    return
  }

  if (path === '/api/gaming/entries' && method === 'POST') {
    json(res, 200, addGamingEntry(await readBody(req) as CreateGamingEntryRequest))
    return
  }

  const gamingEntryMatch = path.match(/^\/api\/gaming\/entries\/(\d+)$/)
  if (gamingEntryMatch && method === 'PUT') {
    json(res, 200, updateGamingEntry(Number(gamingEntryMatch[1]), await readBody(req) as UpdateGamingEntryRequest))
    return
  }

  const gamingDetailMatch = path.match(/^\/api\/gaming\/trackers\/(\d+)\/detail$/)
  if (gamingDetailMatch && method === 'GET') {
    json(res, 200, getGamingDetail(Number(gamingDetailMatch[1]), { limit: optionalInt(url.searchParams.get('limit')) ?? 365 }))
    return
  }

  if (path === '/api/food/entries' && method === 'POST') {
    json(res, 200, addFoodEntry(await readBody(req) as CreateFoodEntryRequest))
    return
  }

  const foodEntryMatch = path.match(/^\/api\/food\/entries\/(\d+)$/)
  if (foodEntryMatch && method === 'PUT') {
    json(res, 200, updateFoodEntry(Number(foodEntryMatch[1]), await readBody(req) as UpdateFoodEntryRequest))
    return
  }

  if (foodEntryMatch && method === 'DELETE') {
    json(res, 200, deleteFoodEntry(Number(foodEntryMatch[1])))
    return
  }

  const foodDetailMatch = path.match(/^\/api\/food\/trackers\/(\d+)\/detail$/)
  if (foodDetailMatch && method === 'GET') {
    json(res, 200, getFoodDetail(Number(foodDetailMatch[1]), { limit: optionalInt(url.searchParams.get('limit')) ?? 365 }))
    return
  }

  if (path === '/api/mood/daily-aggregates' && method === 'GET') {
    const days = optionalInt(url.searchParams.get('days')) ?? 30
    const trackerId = optionalInt(url.searchParams.get('trackerId'))
    const cutoff = new Date()
    cutoff.setDate(cutoff.getDate() - days)
    const cutoffStr = cutoff.toISOString().slice(0, 10)
    const rows = trackerId
      ? getDb().prepare('SELECT date_str AS date, avg(value) AS value, count(*) AS count FROM entries WHERE date_str >= ? AND tracker_id = ? GROUP BY date_str ORDER BY date_str').all(cutoffStr, trackerId)
      : getDb().prepare('SELECT date_str AS date, avg(value) AS value, count(*) AS count FROM entries WHERE date_str >= ? GROUP BY date_str ORDER BY date_str').all(cutoffStr)
    json(res, 200, (rows as Array<{ date: string; value: number; count: number }>).map((row) => ({
      date: row.date,
      value: Math.round((Number(row.value) || 0) * 10) / 10,
      count: Number(row.count) || 0,
    })))
    return
  }

  if (path === '/api/assets' && method === 'GET') {
    const limit = Math.min(optionalInt(url.searchParams.get('limit')) ?? 50, 200)
    const offset = optionalInt(url.searchParams.get('offset')) ?? 0
    const rows = getDb().prepare('SELECT * FROM assets ORDER BY created_at DESC LIMIT ? OFFSET ?').all(limit, offset)
    json(res, 200, rows.map((row) => mapAsset(row as JsonRecord)))
    return
  }

  const assetMatch = path.match(/^\/api\/assets\/(\d+)$/)
  if (assetMatch && method === 'PUT') {
    const body = asRecord(await readBody(req))
    if ('originalName' in body) {
      getDb().prepare('UPDATE assets SET original_name = ? WHERE id = ?').run(body.originalName ?? null, Number(assetMatch[1]))
    }
    const updated = getDb().prepare('SELECT * FROM assets WHERE id = ?').get(Number(assetMatch[1]))
    json(res, 200, updated ? mapAsset(updated as JsonRecord) : null)
    return
  }

  if (assetMatch && method === 'DELETE') {
    getDb().prepare('DELETE FROM assets WHERE id = ?').run(Number(assetMatch[1]))
    json(res, 200, true)
    return
  }

  if (path === '/api/reminders' && method === 'GET') {
    const rows = getDb().prepare('SELECT * FROM reminders ORDER BY id ASC').all()
    json(res, 200, rows.map((row) => mapReminder(row as JsonRecord)))
    return
  }

  if (path === '/api/reminders' && method === 'POST') {
    const body = await readBody(req) as ReminderInsert & { id?: number }
    const payload = {
      title: body.title,
      description: body.description ?? null,
      trackerId: body.trackerId ?? null,
      time: body.time,
      date: body.date ?? null,
      days: body.days ? JSON.stringify(body.days) : null,
      enabled: body.enabled ?? true ? 1 : 0,
    }
    if (body.id && body.id > 0) {
      getDb()
        .prepare('UPDATE reminders SET title = @title, description = @description, tracker_id = @trackerId, time = @time, date = @date, days = @days, enabled = @enabled WHERE id = @id')
        .run({ ...payload, id: body.id })
      const updated = getDb().prepare('SELECT * FROM reminders WHERE id = ?').get(body.id)
      json(res, 200, updated ? mapReminder(updated as JsonRecord) : null)
      return
    }
    const inserted = getDb()
      .prepare('INSERT INTO reminders (title, description, tracker_id, time, date, days, enabled) VALUES (@title, @description, @trackerId, @time, @date, @days, @enabled)')
      .run(payload)
    const row = getDb().prepare('SELECT * FROM reminders WHERE id = ?').get(inserted.lastInsertRowid)
    json(res, 200, row ? mapReminder(row as JsonRecord) : null)
    return
  }

  const reminderMatch = path.match(/^\/api\/reminders\/(\d+)$/)
  if (reminderMatch && method === 'DELETE') {
    getDb().prepare('DELETE FROM reminders WHERE id = ?').run(Number(reminderMatch[1]))
    json(res, 200, true)
    return
  }

  const reminderToggleMatch = path.match(/^\/api\/reminders\/(\d+)\/toggle$/)
  if (reminderToggleMatch && method === 'POST') {
    const body = asRecord(await readBody(req))
    getDb().prepare('UPDATE reminders SET enabled = ? WHERE id = ?').run(body.enabled ? 1 : 0, Number(reminderToggleMatch[1]))
    const updated = getDb().prepare('SELECT * FROM reminders WHERE id = ?').get(Number(reminderToggleMatch[1]))
    json(res, 200, updated ? mapReminder(updated as JsonRecord) : null)
    return
  }

  const reminderCompleteMatch = path.match(/^\/api\/reminders\/(\d+)\/(complete|uncomplete)$/)
  if (reminderCompleteMatch && method === 'POST') {
    const value = reminderCompleteMatch[2] === 'complete' ? Date.now() : null
    getDb().prepare('UPDATE reminders SET completed_at = ? WHERE id = ?').run(value, Number(reminderCompleteMatch[1]))
    const updated = getDb().prepare('SELECT * FROM reminders WHERE id = ?').get(Number(reminderCompleteMatch[1]))
    json(res, 200, updated ? mapReminder(updated as JsonRecord) : null)
    return
  }

  if (path === '/api/stats' && method === 'POST') {
    json(res, 200, getStats(await readBody(req) as StatsQueryRequest))
    return
  }

  if (path === '/api/correlation/impact' && method === 'POST') {
    const body = asRecord(await readBody(req))
    json(res, 200, calculateImpact(toInt(body.sourceTrackerId), toInt(body.targetTrackerId), toInt(body.offsetDays), toInt(body.minSampleSize, 5)))
    return
  }

  if (path === '/api/correlation/result' && method === 'POST') {
    json(res, 200, getCorrelationResult(await readBody(req) as CorrelationQueryRequest))
    return
  }

  if (path === '/api/tags' && method === 'GET') {
    json(res, 200, getTags())
    return
  }

  if (path === '/api/tags' && method === 'POST') {
    const body = asRecord(await readBody(req))
    const name = String(body.name ?? '').trim()
    if (!name) throw new Error('Tag name is required')
    const result = getDb().prepare('INSERT INTO tags (name, color) VALUES (?, ?)').run(name, body.color ?? null)
    const inserted = getDb().prepare('SELECT * FROM tags WHERE id = ?').get(result.lastInsertRowid)
    json(res, 200, inserted ? mapTag(inserted as JsonRecord) : null)
    return
  }

  if (path === '/api/tags/tree' && method === 'GET') {
    const tags = getTags()
    const relationships = getTagRelationships()
    json(res, 200, { tags, relationships, tree: buildTagTree(tags, relationships) })
    return
  }

  if (path === '/api/tags/relationships' && method === 'PUT') {
    const body = await readBody(req)
    const relationships = Array.isArray(body) ? body : (asRecord(body).relationships as unknown[])
    const clean = (Array.isArray(relationships) ? relationships : [])
      .map((item) => asRecord(item))
      .filter((relationship) => Number(relationship.parentTagId) > 0 && Number(relationship.childTagId) > 0 && Number(relationship.parentTagId) !== Number(relationship.childTagId))
    getDb().transaction(() => {
      getDb().prepare('DELETE FROM tag_relationships').run()
      const insert = getDb().prepare('INSERT OR IGNORE INTO tag_relationships (parent_tag_id, child_tag_id, relationship_type) VALUES (?, ?, ?)')
      for (const relationship of clean) {
        insert.run(Number(relationship.parentTagId), Number(relationship.childTagId), 'parent')
      }
    })()
    const tags = getTags()
    const updatedRelationships = getTagRelationships()
    json(res, 200, { tags, relationships: updatedRelationships, tree: buildTagTree(tags, updatedRelationships) })
    return
  }

  if (path === '/api/tags/resolve-inheritance' && method === 'POST') {
    const body = await readBody(req)
    const requestedTagIds = Array.isArray(body) ? normalizeIds(body) : normalizeIds(asRecord(body).tagIds)
    const relationships = getTagRelationships()
    const resolvedTagIds = resolveInheritedTagIds(requestedTagIds, relationships)
    const byId = new Map(getTags().map((tag) => [tag.id, tag]))
    json(res, 200, {
      requestedTagIds,
      resolvedTagIds,
      tags: resolvedTagIds.map((id) => byId.get(id)).filter((tag): tag is Tag => !!tag),
    })
    return
  }

  const tagMatch = path.match(/^\/api\/tags\/(\d+)$/)
  if (tagMatch && method === 'PUT') {
    const body = asRecord(await readBody(req))
    const set: string[] = []
    const params: JsonRecord = { id: Number(tagMatch[1]) }
    if ('name' in body) { set.push('name = @name'); params.name = String(body.name ?? '').trim() }
    if ('color' in body) { set.push('color = @color'); params.color = body.color ?? null }
    if (set.length === 0) { json(res, 200, null); return }
    getDb().prepare(`UPDATE tags SET ${set.join(', ')} WHERE id = @id`).run(params)
    const updated = getDb().prepare('SELECT * FROM tags WHERE id = ?').get(params.id)
    json(res, 200, updated ? mapTag(updated as JsonRecord) : null)
    return
  }

  if (tagMatch && method === 'DELETE') {
    getDb().prepare('DELETE FROM tags WHERE id = ?').run(Number(tagMatch[1]))
    json(res, 200, true)
    return
  }

  if (path === '/api/weight/entries' && method === 'POST') {
    json(res, 200, addWeightEntry(await readBody(req) as CreateWeightEntryRequest))
    return
  }

  const weightEntryMatch = path.match(/^\/api\/weight\/entries\/(\d+)$/)
  if (weightEntryMatch && method === 'PUT') {
    json(res, 200, updateWeightEntry(Number(weightEntryMatch[1]), await readBody(req) as UpdateWeightEntryRequest))
    return
  }

  if (weightEntryMatch && method === 'DELETE') {
    json(res, 200, deleteEntry(Number(weightEntryMatch[1])))
    return
  }

  const weightDetailMatch = path.match(/^\/api\/weight\/trackers\/(\d+)\/detail$/)
  if (weightDetailMatch && method === 'GET') {
    const trackerId = Number(weightDetailMatch[1])
    json(res, 200, calculateWeightDetail(getWeightHistory(trackerId, optionalInt(url.searchParams.get('limit')) ?? 365), getWeightGoal(trackerId)))
    return
  }

  const weightGoalMatch = path.match(/^\/api\/weight\/trackers\/(\d+)\/goal$/)
  if (weightGoalMatch && method === 'GET') {
    json(res, 200, { goal: getWeightGoal(Number(weightGoalMatch[1])) })
    return
  }

  if (weightGoalMatch && method === 'PUT') {
    json(res, 200, { goal: setWeightGoal(await readBody(req) as SetTrackerGoalRequest) })
    return
  }

  if (path === '/api/contacts' && method === 'GET') {
    const rows = getDb().prepare('SELECT * FROM contacts ORDER BY name ASC').all()
    json(res, 200, rows.map((row) => mapContact(row as JsonRecord)))
    return
  }

  if (path === '/api/contacts' && method === 'POST') {
    const body = await readBody(req) as ContactInsert
    const name = body.name.trim()
    if (!name) throw new Error('Contact name is required')
    const inserted = getDb()
      .prepare('INSERT INTO contacts (name, avatar_asset_id, birthday, date_met, notes) VALUES (?, ?, ?, ?, ?)')
      .run(name, body.avatarAssetId ?? null, body.birthday ?? null, body.dateMet ?? null, body.notes ?? null)
    const row = getDb().prepare('SELECT * FROM contacts WHERE id = ?').get(inserted.lastInsertRowid)
    json(res, 200, row ? mapContact(row as JsonRecord) : null)
    return
  }

  const contactInteractionsMatch = path.match(/^\/api\/contacts\/(\d+)\/interactions$/)
  if (contactInteractionsMatch && method === 'GET') {
    const rows = getDb().prepare('SELECT * FROM contact_interactions WHERE contact_id = ? ORDER BY timestamp DESC').all(Number(contactInteractionsMatch[1]))
    json(res, 200, rows.map((row) => mapContactInteraction(row as JsonRecord)))
    return
  }

  if (contactInteractionsMatch && method === 'POST') {
    const body = await readBody(req) as ContactInteractionInsert
    const contactId = Number(contactInteractionsMatch[1])
    const inserted = getDb()
      .prepare('INSERT INTO contact_interactions (contact_id, entry_id, mood, timestamp, notes) VALUES (?, ?, ?, ?, ?)')
      .run(contactId, body.entryId ?? null, body.mood, Date.now(), body.notes ?? null)
    const today = formatDateStr(Date.now())
    getDb().prepare('UPDATE contacts SET date_last_talked = ? WHERE id = ?').run(today, contactId)
    const row = getDb().prepare('SELECT * FROM contact_interactions WHERE id = ?').get(inserted.lastInsertRowid)
    json(res, 200, row ? mapContactInteraction(row as JsonRecord) : null)
    return
  }

  const contactMatch = path.match(/^\/api\/contacts\/(\d+)$/)
  if (contactMatch && method === 'GET') {
    const row = getDb().prepare('SELECT * FROM contacts WHERE id = ?').get(Number(contactMatch[1]))
    json(res, 200, row ? mapContact(row as JsonRecord) : null)
    return
  }

  if (contactMatch && method === 'PUT') {
    const id = Number(contactMatch[1])
    const updates = await readBody(req) as ContactUpdate
    const set: string[] = []
    const params: JsonRecord = { id }
    if (updates.name !== undefined) { set.push('name = @name'); params.name = updates.name }
    if (updates.avatarAssetId !== undefined) { set.push('avatar_asset_id = @avatarAssetId'); params.avatarAssetId = updates.avatarAssetId }
    if (updates.birthday !== undefined) { set.push('birthday = @birthday'); params.birthday = updates.birthday }
    if (updates.dateMet !== undefined) { set.push('date_met = @dateMet'); params.dateMet = updates.dateMet }
    if (updates.dateLastTalked !== undefined) { set.push('date_last_talked = @dateLastTalked'); params.dateLastTalked = updates.dateLastTalked }
    if (updates.traits !== undefined) { set.push('traits = @traits'); params.traits = updates.traits ? JSON.stringify(updates.traits) : null }
    if (updates.notes !== undefined) { set.push('notes = @notes'); params.notes = updates.notes }
    if (set.length === 0) { json(res, 200, null); return }
    getDb().prepare(`UPDATE contacts SET ${set.join(', ')} WHERE id = @id`).run(params)
    const row = getDb().prepare('SELECT * FROM contacts WHERE id = ?').get(id)
    json(res, 200, row ? mapContact(row as JsonRecord) : null)
    return
  }

  if (contactMatch && method === 'DELETE') {
    getDb().prepare('DELETE FROM contacts WHERE id = ?').run(Number(contactMatch[1]))
    json(res, 200, { success: true })
    return
  }

  if (path === '/api/exercises/status' && method === 'GET') {
    json(res, 200, { status: 'ready', count: 0, error: null, progress: 100 })
    return
  }

  if (path === '/api/exercises' && method === 'GET') {
    json(res, 200, [])
    return
  }

  if (path === '/api/exercises/search' && method === 'GET') {
    json(res, 200, [])
    return
  }

  json(res, 404, { error: `No web API route for ${method} ${path}` })
}

export async function handleWebApiRequest(req: IncomingMessage, res: ServerResponse): Promise<void> {
  const url = new URL(req.url ?? '/', 'http://chimero.local')
  if (!url.pathname.startsWith('/api')) {
    noContent(res)
    return
  }

  try {
    activeDb = await getWebDb()
    await route(req, res, url)
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    console.error('[chimero-web-api]', req.method, url.pathname, message)
    json(res, 500, { error: message })
  }
}
