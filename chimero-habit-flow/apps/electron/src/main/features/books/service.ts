import { and, desc, eq, ne } from 'drizzle-orm'
import { books, bookActivities, entries, entriesToTags, trackers } from '@packages/db'
import { getDb } from '@packages/db/database'
import { entryToBookHistoryItem, buildBookHistoryReadModel, buildBookSelectedDayReadModel, buildBookStatisticsReadModel, normalizeBookTitle, normalizeBookTitleKey, validateBookRatingTenths } from '@contracts/domain'
import type {
  Book,
  BookActivityResponse,
  BookResponse,
  BookSelectedDaySummaryReadModel,
  BookStatisticsReadModel,
  CreateBookActivityRequest,
  CreateBookRequest,
  Entry,
  UpdateBookActivityRequest,
  UpdateBookRequest,
} from '@contracts/contracts'
import { mapEntry, mapTracker } from '../../shared/mappers'
import { getEntryTagIds, getTags, replaceEntryTags } from '../tags/service'
import { getTrackerIdentity } from '@contracts/features/tracking'

function formatDateStr(timestamp: number): string {
  const date = new Date(timestamp)
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
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

function mapBookRow(row: Record<string, unknown>): Book {
  return {
    id: Number(row.id),
    title: String(row.title ?? ''),
    titleKey: String(row.titleKey ?? row.title_key ?? ''),
    shelf: (row.shelf as Book['shelf']) ?? 'tbr',
    status: (row.status as Book['status']) ?? 'planned',
    startedDate: ((row.startedDate ?? row.started_date) as string | null) ?? null,
    finishedDate: ((row.finishedDate ?? row.finished_date) as string | null) ?? null,
    ratingTenths: ((row.ratingTenths ?? row.rating_tenths) as number | null) ?? null,
    createdAt: (row.createdAt ?? row.created_at) as number | null,
    updatedAt: (row.updatedAt ?? row.updated_at) as number | null,
  }
}

async function isBooksTracker(trackerId: number): Promise<boolean> {
  const [row] = await getDb()
    .select()
    .from(trackers)
    .where(eq(trackers.id, trackerId))
    .limit(1)

  if (!row) return false
  return getTrackerIdentity(mapTracker(row as Record<string, unknown>)) === 'books'
}

async function getBookById(bookId: number): Promise<Book | null> {
  const [row] = await getDb()
    .select()
    .from(books)
    .where(eq(books.id, bookId))
    .limit(1)

  return row ? mapBookRow(row as Record<string, unknown>) : null
}

export async function getBook(bookId: number): Promise<BookResponse | null> {
  const book = await getBookById(bookId)
  return book ? { book } : null
}

const bookEntryProjection = {
  id: entries.id,
  trackerId: entries.trackerId,
  value: entries.value,
  note: entries.note,
  metadata: entries.metadata,
  timestamp: entries.timestamp,
  dateStr: entries.dateStr,
  assetId: entries.assetId,
  bookStructured: bookActivities.entryId,
  bookId: bookActivities.bookId,
  bookTitle: books.title,
  bookTitleKey: books.titleKey,
  bookActivityType: bookActivities.activityType,
}

async function tagsForEntry(entryId: number) {
  const [allTags, tagIdsByEntry] = await Promise.all([getTags(), getEntryTagIds([entryId])])
  const tagIds = new Set(tagIdsByEntry.get(entryId) ?? [])
  return allTags.filter((tag) => tagIds.has(tag.id))
}

async function getBookEntryById(entryId: number): Promise<BookActivityResponse | null> {
  const [row] = await getDb()
    .select(bookEntryProjection)
    .from(entries)
    .leftJoin(bookActivities, eq(bookActivities.entryId, entries.id))
    .leftJoin(books, eq(bookActivities.bookId, books.id))
    .where(eq(entries.id, entryId))
    .limit(1)

  if (!row) return null
  const mapped = mapEntry(row as Record<string, unknown>)
  if (!mapped.book?.structured) return null
  const book = await getBookById(mapped.book.bookId)
  if (!book) return null
  return {
    entry: entryToBookHistoryItem(mapped) as BookActivityResponse['entry'],
    book,
    tags: await tagsForEntry(mapped.id),
  }
}

async function getBookEntries(trackerId: number, limit = 365): Promise<Entry[]> {
  const rows = await getDb()
    .select(bookEntryProjection)
    .from(entries)
    .leftJoin(bookActivities, eq(bookActivities.entryId, entries.id))
    .leftJoin(books, eq(bookActivities.bookId, books.id))
    .where(eq(entries.trackerId, trackerId))
    .orderBy(desc(entries.timestamp))
    .limit(limit)

  const mapped = rows.map((row) => mapEntry(row as Record<string, unknown>))
  const tagIdsByEntry = await getEntryTagIds(mapped.map((entry) => entry.id))
  return mapped.map((entry) => ({ ...entry, tagIds: tagIdsByEntry.get(entry.id) ?? [] }))
}

function applyActivityState(book: Book, activityType: 'started' | 'read' | 'finished', dateStr: string): Partial<Book> {
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

async function createBookActivity(
  activityType: 'started' | 'read' | 'finished',
  data: CreateBookActivityRequest,
): Promise<BookActivityResponse | null> {
  if (!(await isBooksTracker(data.trackerId))) {
    throw new Error('Book activities can only be created for the Books tracker')
  }

  assertFiniteNumber(data.timestamp, 'Timestamp')
  const dateStr = formatDateStr(data.timestamp)
  const book = await getBookById(data.bookId)
  if (!book) throw new Error('Book not found')

  const database = getDb()
  const entryId = await database.transaction(async (tx) => {
    if (activityType === 'read') {
      const [existing] = await tx
        .select({
          entryId: bookActivities.entryId,
        })
        .from(bookActivities)
        .where(and(eq(bookActivities.bookId, data.bookId), eq(bookActivities.dateStr, dateStr), eq(bookActivities.activityType, 'read')))
        .limit(1)

      if (existing?.entryId != null) {
        return Number(existing.entryId)
      }
    }

    const [entryRow] = await tx
      .insert(entries)
      .values({
        trackerId: data.trackerId,
        value: null,
        note: book.title,
        metadata: JSON.stringify({ trackerKind: 'books', bookId: book.id, activityType }),
        timestamp: data.timestamp,
        dateStr,
        assetId: data.assetId ?? null,
      })
      .returning()

    if (!entryRow) return null
    const entryId = (entryRow as { id: number }).id

    await tx.insert(bookActivities).values({
      entryId,
      bookId: data.bookId,
      activityType,
      dateStr,
    })
    await replaceEntryTags(entryId, data.tagIds, tx)

    const bookUpdates = applyActivityState(book, activityType, dateStr)
    if (Object.keys(bookUpdates).length > 0) {
      await tx.update(books).set(bookUpdates).where(eq(books.id, data.bookId))
    }

    return entryId
  })

  if (entryId == null) return null
  return getBookEntryById(entryId)
}

export async function createBook(data: CreateBookRequest): Promise<BookResponse | null> {
  const title = normalizeBookTitle(data.title)
  if (!title) throw new Error('Book title is required')
  const book = {
    title,
    titleKey: normalizeBookTitleKey(title),
    shelf: validateShelf(data.shelf),
    status: validateStatus(data.status),
    startedDate: data.startedDate == null ? null : assertDateString(data.startedDate, 'Started date'),
    finishedDate: data.finishedDate == null ? null : assertDateString(data.finishedDate, 'Finished date'),
    ratingTenths: data.ratingTenths == null ? null : validateBookRatingTenths(data.ratingTenths),
    createdAt: Date.now(),
    updatedAt: Date.now(),
  }

  const [row] = await getDb()
    .insert(books)
    .values(book)
    .returning()

  return row ? { book: mapBookRow(row as Record<string, unknown>) } : null
}

export async function updateBook(bookId: number, updates: UpdateBookRequest): Promise<BookResponse | null> {
  const existing = await getBookById(bookId)
  if (!existing) return null

  const set: Record<string, unknown> = { updatedAt: Date.now() }
  if (updates.title !== undefined) {
    const title = normalizeBookTitle(updates.title)
    if (!title) throw new Error('Book title is required')
    set.title = title
    set.titleKey = normalizeBookTitleKey(title)
  }
  if (updates.shelf !== undefined) set.shelf = validateShelf(updates.shelf)
  if (updates.status !== undefined) set.status = validateStatus(updates.status)
  if (updates.startedDate !== undefined) set.startedDate = updates.startedDate == null ? null : assertDateString(updates.startedDate, 'Started date')
  if (updates.finishedDate !== undefined) set.finishedDate = updates.finishedDate == null ? null : assertDateString(updates.finishedDate, 'Finished date')
  if (updates.ratingTenths !== undefined) set.ratingTenths = updates.ratingTenths == null ? null : validateBookRatingTenths(updates.ratingTenths)

  await getDb()
    .update(books)
    .set(set)
    .where(eq(books.id, bookId))

  const updated = await getBookById(bookId)
  return updated ? { book: updated } : null
}

export async function startBook(data: CreateBookActivityRequest): Promise<BookActivityResponse | null> {
  return createBookActivity('started', data)
}

export async function readBook(data: CreateBookActivityRequest): Promise<BookActivityResponse | null> {
  return createBookActivity('read', data)
}

export async function finishBook(data: CreateBookActivityRequest): Promise<BookActivityResponse | null> {
  return createBookActivity('finished', data)
}

export async function updateBookReadActivity(entryId: number, updates: UpdateBookActivityRequest): Promise<BookActivityResponse | null> {
  const [existing] = await getDb()
    .select({
      trackerId: entries.trackerId,
      bookStructured: bookActivities.entryId,
      bookId: bookActivities.bookId,
      activityType: bookActivities.activityType,
    })
    .from(entries)
    .leftJoin(bookActivities, eq(bookActivities.entryId, entries.id))
    .where(eq(entries.id, entryId))
    .limit(1)

  if (!existing?.bookStructured || !(await isBooksTracker(existing.trackerId)) || existing.activityType !== 'read') {
    throw new Error('Structured book read activities can only be updated through the Books flow')
  }
  if (existing.bookId == null) {
    throw new Error('Structured book read activities must reference a book')
  }

  const entrySet: Record<string, unknown> = {}
  const activitySet: Record<string, unknown> = {}
  if (updates.timestamp !== undefined) {
    assertFiniteNumber(updates.timestamp, 'Timestamp')
    entrySet.timestamp = updates.timestamp
    const dateStr = formatDateStr(updates.timestamp)
    entrySet.dateStr = dateStr
    activitySet.dateStr = dateStr

    const duplicate = await getDb()
      .select()
      .from(bookActivities)
      .where(and(eq(bookActivities.bookId, existing.bookId), eq(bookActivities.dateStr, dateStr), eq(bookActivities.activityType, 'read'), ne(bookActivities.entryId, entryId)))
      .limit(1)
    if (duplicate.length > 0) {
      throw new Error('One read activity per book and date is allowed')
    }
  }
  if (updates.assetId !== undefined) entrySet.assetId = updates.assetId

  const database = getDb()
  await database.transaction(async (tx) => {
    if (Object.keys(entrySet).length > 0) {
      await tx.update(entries).set(entrySet).where(eq(entries.id, entryId))
    }
    if (Object.keys(activitySet).length > 0) {
      await tx.update(bookActivities).set(activitySet).where(eq(bookActivities.entryId, entryId))
    }
    await replaceEntryTags(entryId, updates.tagIds, tx)
  })

  return getBookEntryById(entryId)
}

export async function deleteBookReadActivity(entryId: number): Promise<boolean> {
  const [existing] = await getDb()
    .select({
      trackerId: entries.trackerId,
      bookStructured: bookActivities.entryId,
      activityType: bookActivities.activityType,
    })
    .from(entries)
    .leftJoin(bookActivities, eq(bookActivities.entryId, entries.id))
    .where(eq(entries.id, entryId))
    .limit(1)

  if (!existing?.bookStructured || !(await isBooksTracker(existing.trackerId)) || existing.activityType !== 'read') {
    throw new Error('Structured book read activities can only be deleted through the Books flow')
  }

  await getDb().transaction(async (tx) => {
    await tx.delete(entriesToTags).where(eq(entriesToTags.entryId, entryId))
    await tx.delete(bookActivities).where(eq(bookActivities.entryId, entryId))
    await tx.delete(entries).where(eq(entries.id, entryId))
  })
  return true
}

export async function getBookHistory(trackerId: number, limit = 365) {
  if (!(await isBooksTracker(trackerId))) {
    throw new Error('Book history can only be read for the Books tracker')
  }
  const historyEntries = await getBookEntries(trackerId, limit)
  return buildBookHistoryReadModel(historyEntries).entries
}

export async function getBookStats(trackerId: number, limit = 365): Promise<BookStatisticsReadModel> {
  if (!(await isBooksTracker(trackerId))) {
    throw new Error('Book stats can only be read for the Books tracker')
  }
  const historyEntries = await getBookEntries(trackerId, limit)
  return buildBookStatisticsReadModel(historyEntries)
}

export async function getBookSelectedDaySummary(
  trackerId: number,
  selectedDate: string,
  limit = 365,
): Promise<BookSelectedDaySummaryReadModel> {
  if (!(await isBooksTracker(trackerId))) {
    throw new Error('Book selected-day summaries can only be read for the Books tracker')
  }
  const tracker = await getDb()
    .select()
    .from(trackers)
    .where(eq(trackers.id, trackerId))
    .limit(1)
  const title = tracker[0] ? mapTracker(tracker[0] as Record<string, unknown>).name : 'Books'
  const historyEntries = await getBookEntries(trackerId, limit)
  return buildBookSelectedDayReadModel(historyEntries, { trackerId, title, selectedDate })
}
