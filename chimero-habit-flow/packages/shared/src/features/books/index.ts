import type { Entry } from '../../contracts'

export type BookLifecycleAction = 'want' | 'started' | 'read' | 'finished' | 'legacy'
export type BookShelf = 'want' | 'reading' | 'finished' | 'legacy'

export interface BookLifecycleRecord {
  entryId: number
  trackerId: number
  bookId: number | null
  title: string
  action: BookLifecycleAction
  shelf: BookShelf
  timestamp: number
  dateStr: string
  note: string | null
  rating: number | null
  assetId?: number | null
  tagIds?: number[]
  legacy: boolean
  editable: boolean
  deletable: boolean
  metadata: Record<string, unknown>
}

export interface BooksTrackerReadModel {
  structured: BookLifecycleRecord[]
  legacy: BookLifecycleRecord[]
  wantToRead: BookLifecycleRecord[]
  started: BookLifecycleRecord[]
  read: BookLifecycleRecord[]
  finished: BookLifecycleRecord[]
  latestStructured: BookLifecycleRecord | null
  selectedDay: BookLifecycleRecord | null
  selectedDayEntries: BookLifecycleRecord[]
  recentFinished: BookLifecycleRecord[]
  shelfCounts: {
    want: number
    reading: number
    finished: number
  }
  itemsThisWeek: number
  itemsThisMonth: number
  itemsThisYear: number
  finishedThisWeek: number
  finishedThisMonth: number
  finishedThisYear: number
  readingStreakDays: number
  daysSinceLastEvent: number | null
}

const structuredActionLabels: Record<BookLifecycleAction, BookShelf> = {
  want: 'want',
  started: 'reading',
  read: 'reading',
  finished: 'finished',
  legacy: 'legacy',
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function readMetadata(entry: Entry): Record<string, unknown> {
  const metadata = entry.metadata as unknown
  if (typeof metadata === 'string') {
    try {
      const parsed = JSON.parse(metadata)
      return isRecord(parsed) ? parsed : {}
    } catch {
      return {}
    }
  }
  return isRecord(metadata) ? metadata : {}
}

function readNestedBookPayload(metadata: Record<string, unknown>): Record<string, unknown> {
  const candidates = [
    metadata.book,
    metadata.bookEntry,
    metadata.bookLifecycle,
    metadata.lifecycle,
    metadata.reading,
  ]
  return candidates.find(isRecord) ?? metadata
}

function readStringCandidate(value: unknown): string | null {
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : null
}

function readNumberCandidate(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number(value)
    return Number.isFinite(parsed) ? parsed : null
  }
  return null
}

function getDateStr(timestamp: number): string {
  return new Date(timestamp).toISOString().slice(0, 10)
}

function normalizeAction(raw: string, payload: Record<string, unknown>): BookLifecycleAction | null {
  const value = raw.replace(/[_/]+/g, ' ').replace(/\s+/g, ' ').trim()

  if (
    value === 'want' ||
    value === 'want to read' ||
    value === 'to read' ||
    value === 'backlog' ||
    value === 'wishlist'
  ) {
    return 'want'
  }

  if (
    value === 'started' ||
    value === 'start' ||
    value === 'starting' ||
    value === 'currently reading' ||
    value === 'reading' ||
    value === 'in progress'
  ) {
    return payload.readAt != null || payload.readDate != null ? 'read' : 'started'
  }

  if (
    value === 'read' ||
    value === 'read today' ||
    value === 'read day' ||
    value === 'session' ||
    value === 'reading session'
  ) {
    return 'read'
  }

  if (
    value === 'finished' ||
    value === 'finish' ||
    value === 'completed' ||
    value === 'complete' ||
    value === 'done'
  ) {
    return 'finished'
  }

  return null
}

function normalizeShelf(raw: string, payload: Record<string, unknown>): BookShelf {
  const value = raw.replace(/[_/]+/g, ' ').replace(/\s+/g, ' ').trim()
  if (
    value === 'want' ||
    value === 'want to read' ||
    value === 'to read' ||
    value === 'backlog' ||
    value === 'wishlist'
  ) {
    return 'want'
  }

  if (
    value === 'finished' ||
    value === 'complete' ||
    value === 'completed' ||
    value === 'done'
  ) {
    return 'finished'
  }

  if (
    value === 'reading' ||
    value === 'currently reading' ||
    value === 'started' ||
    value === 'start' ||
    value === 'in progress'
  ) {
    return 'reading'
  }

  if (payload.finishedAt != null || payload.finishedDate != null) return 'finished'
  if (payload.startedAt != null || payload.startedDate != null || payload.readAt != null || payload.readDate != null) {
    return 'reading'
  }

  return 'legacy'
}

export function getBookLifecycleRecord(entry: Entry): BookLifecycleRecord {
  const metadata = readMetadata(entry)
  const payload = readNestedBookPayload(metadata)
  const candidateAction = readStringCandidate(
    payload.action ??
      payload.activityType ??
      payload.eventType ??
      payload.kind ??
      payload.status ??
      payload.lifecycle ??
      metadata.action ??
      metadata.activityType ??
      metadata.eventType ??
      metadata.kind ??
      metadata.status ??
      metadata.lifecycle,
  )
  const candidateShelf = readStringCandidate(
    payload.shelf ?? payload.shelfName ?? payload.status ?? metadata.shelf ?? metadata.shelfName ?? metadata.status,
  )
  const title =
    readStringCandidate(entry.book?.title) ??
    readStringCandidate(payload.title) ??
    readStringCandidate(payload.bookTitle) ??
    readStringCandidate(payload.name) ??
    readStringCandidate(metadata.title) ??
    readStringCandidate(metadata.bookTitle) ??
    readStringCandidate(entry.note) ??
    'Untitled'
  const bookId =
    (typeof entry.book?.bookId === 'number' && Number.isFinite(entry.book.bookId) ? entry.book.bookId : null) ??
    readNumberCandidate(payload.bookId) ??
    readNumberCandidate(payload.id) ??
    readNumberCandidate(metadata.bookId) ??
    readNumberCandidate(metadata.id)
  const action =
    (candidateAction && normalizeAction(candidateAction, payload)) ||
    (candidateShelf && normalizeAction(candidateShelf, payload)) ||
    (payload.finishedAt != null || payload.finishedDate != null
      ? 'finished'
      : payload.readAt != null || payload.readDate != null
        ? 'read'
        : payload.startedAt != null || payload.startedDate != null
          ? 'started'
          : payload.wantAt != null || payload.wantedAt != null
            ? 'want'
            : 'legacy')

  const shelf = action === 'legacy' ? normalizeShelf(candidateShelf ?? '', payload) : structuredActionLabels[action]
  const rating = readNumberCandidate(payload.rating ?? payload.stars ?? metadata.rating ?? metadata.stars)
  const legacy = action === 'legacy'

  return {
    entryId: entry.id,
    trackerId: entry.trackerId,
    bookId,
    title,
    action,
    shelf,
    timestamp: entry.timestamp,
    dateStr: entry.dateStr || getDateStr(entry.timestamp),
    note: entry.note ?? null,
    rating,
    assetId: entry.assetId ?? null,
    tagIds: entry.tagIds ?? [],
    legacy,
    editable: !legacy && action === 'read' && bookId != null,
    deletable: !legacy && action === 'read' && bookId != null,
    metadata,
  }
}

export function getBookActionLabel(action: BookLifecycleAction): string {
  switch (action) {
    case 'want':
      return 'Want to Read'
    case 'started':
      return 'Started'
    case 'read':
      return 'Read'
    case 'finished':
      return 'Finished'
    case 'legacy':
    default:
      return 'Legacy'
  }
}

export function getBookShelfLabel(shelf: BookShelf): string {
  switch (shelf) {
    case 'want':
      return 'Want to Read'
    case 'reading':
      return 'Reading'
    case 'finished':
      return 'Finished'
    case 'legacy':
    default:
      return 'Legacy'
  }
}

export function isStructuredBookEntry(entry: Entry): boolean {
  return getBookLifecycleRecord(entry).action !== 'legacy'
}

function countDistinctDays(entries: BookLifecycleRecord[]): number {
  return new Set(entries.map((entry) => entry.dateStr)).size
}

function daysBetween(a: number, b: number): number {
  return Math.floor((a - b) / (1000 * 60 * 60 * 24))
}

export function buildBooksTrackerReadModel(entries: Entry[], selectedDate: Date): BooksTrackerReadModel {
  const records = entries
    .map(getBookLifecycleRecord)
    .sort((a, b) => b.timestamp - a.timestamp)

  const structured = records.filter((entry) => entry.action !== 'legacy')
  const legacy = records.filter((entry) => entry.action === 'legacy')
  const wantToRead = records.filter((entry) => entry.action === 'want')
  const started = records.filter((entry) => entry.action === 'started')
  const read = records.filter((entry) => entry.action === 'read')
  const finished = records.filter((entry) => entry.action === 'finished')
  const latestStructured = structured[0] ?? null
  const selectedDayStr = `${selectedDate.getFullYear()}-${String(selectedDate.getMonth() + 1).padStart(2, '0')}-${String(selectedDate.getDate()).padStart(2, '0')}`
  const selectedDayEntries = structured.filter((entry) => entry.dateStr === selectedDayStr)
  const selectedDay = selectedDayEntries[0] ?? null
  const recentFinished = finished.slice(0, 3)
  const now = new Date(selectedDate.getTime())
  now.setHours(23, 59, 59, 999)
  const refTime = now.getTime()
  const msPerDay = 1000 * 60 * 60 * 24
  const startOfWeek = new Date(refTime - 6 * msPerDay)
  const startOfMonth = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1).getTime()
  const startOfYear = new Date(selectedDate.getFullYear(), 0, 1).getTime()

  const structuredPast = structured.filter((entry) => entry.timestamp <= refTime)
  const finishedPast = finished.filter((entry) => entry.timestamp <= refTime)
  const itemsThisWeek = structuredPast.filter((entry) => entry.timestamp >= startOfWeek.getTime()).length
  const itemsThisMonth = structuredPast.filter((entry) => entry.timestamp >= startOfMonth).length
  const itemsThisYear = structuredPast.filter((entry) => entry.timestamp >= startOfYear).length
  const finishedThisWeek = finishedPast.filter((entry) => entry.timestamp >= startOfWeek.getTime()).length
  const finishedThisMonth = finishedPast.filter((entry) => entry.timestamp >= startOfMonth).length
  const finishedThisYear = finishedPast.filter((entry) => entry.timestamp >= startOfYear).length
  const readingStreakDays = countDistinctDays(
    records.filter((entry) => entry.action === 'read' || entry.action === 'started' || entry.action === 'finished'),
  )
  const daysSinceLastEvent = latestStructured
    ? daysBetween(refTime, latestStructured.timestamp)
    : null

  return {
    structured,
    legacy,
    wantToRead,
    started,
    read,
    finished,
    latestStructured,
    selectedDay,
    selectedDayEntries,
    recentFinished,
    shelfCounts: {
      want: wantToRead.length,
      reading: started.length + read.length,
      finished: finished.length,
    },
    itemsThisWeek,
    itemsThisMonth,
    itemsThisYear,
    finishedThisWeek,
    finishedThisMonth,
    finishedThisYear,
    readingStreakDays,
    daysSinceLastEvent,
  }
}

export function buildBooksEntryMetadata(action: Exclude<BookLifecycleAction, 'legacy'>, title: string, timestamp: number) {
  return {
    book: {
      action,
      shelf: structuredActionLabels[action],
      title,
      timestamp,
      ...(action === 'read' ? { readAt: timestamp } : {}),
      ...(action === 'started' ? { startedAt: timestamp } : {}),
      ...(action === 'finished' ? { finishedAt: timestamp } : {}),
    },
  }
}

export function formatBookRatingDisplay(ratingTenths: number | null): string | null {
  if (ratingTenths == null) return null
  return `${(ratingTenths / 10).toFixed(1)} / 5.0`
}
