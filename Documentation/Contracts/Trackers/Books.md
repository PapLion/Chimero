# Books Contract

## 1. Purpose

Books is a structured lifecycle tracker for books. The durable source of truth is the Book entity plus linked reading activity rows. Legacy generic Books entries remain readable for continuity, but structured analytics must only trust the structured lifecycle data.

## 2. Current Implementation Status

- Status: STRUCTURED_BOOK_LIFECYCLE_APPROVED_WITH_LEGACY_READS.
- Books is entity-based, not a generic note/value tracker.
- Structured model: Book entity plus linked reading activity rows.
- Lifecycle states are Want to Read, Reading, and Finished.
- Legacy generic Books entries remain readable, but they are excluded from structured analytics, streaks, and finish counts.
- `ratingTenths` lives on the Book entity as integer tenths from 10 to 50, displayed as 1.0 to 5.0.
- Deferred or rejected for this contract: pages/progress, author, genre, reviews, catalog browsing, Mood correlations, and rereads.

## 3. Surface Contract / Frontend

### 3.1 Quick Entry / Edit Entry Input

- Create or add to Want to Read creates or updates the Book entity only; it does not create a reading activity.
- Start book, read day, and finish book are separate actions.
- Read-day logging creates one explicit read activity for the selected book on the selected day.
- The UI must not create two read-day markers for the same book on the same day.
- Quick Entry and edit may capture title and optional `ratingTenths`; start and finish timestamps come from the explicit lifecycle actions.
- `ratingTenths` is stored as an integer tenths value from 10 to 50 and rendered as 1.0 to 5.0.
- Pages, progress, author, genre, reviews, and catalog fields are not part of the required surface.

### 3.2 BentoGrid / Home Widget Read Model

- Shows current shelf/status and recent explicit activity.
- May show the latest read day and the current reading state.
- May show finished-book signals from structured finish data.
- Does not depend on pages or progress totals.
- Legacy generic entries may appear only as a fallback/readability layer and must not inflate structured counts.

### 3.3 Tracker Detail / Entries Tab Read Model

- Shows the Book entity list plus linked reading activity history.
- Shows start, read-day, and finish events separately.
- Legacy generic entries can be shown in a clearly labeled legacy section.
- Does not require pages, author, genre, review, or catalog fields.

### 3.4 Tracker Detail / Statistics Tab Read Model

- Uses explicit read activities for reading streaks.
- Uses structured finish data for finished-book counts.
- May show Want to Read, Reading, and Finished counts.
- Does not derive streaks from generic legacy entries.
- Pages/progress stats are deferred.

### 3.5 Tracker Detail / Graphs Tab Read Model

- Relevant only for structured read-day and finish counts.
- No page-progress graph is required.
- Legacy generic values must not be used as structured graph input.

### 3.6 Calendar Selected-Day Summary Read Model

- Shows explicit read-day markers for the selected day.
- Start and finish events remain visible as separate lifecycle markers.
- The same book can have at most one read-day marker per calendar day.
- Legacy generic entries may still be shown, but they must be labeled unstructured.

### 3.7 Insights / Correlations Read Model

- Mood correlations are deferred.
- Reread and catalog-style correlations are deferred.
- Structured book counts and finish counts may be reused by other surfaces only if they come from explicit book lifecycle data.

## 4. Deep Contract / Backend-Service

### 1. Backend Entry Point

- Status: STRUCTURED_BOOK_LIFECYCLE_APPROVED.
- Structured book mutations operate on the Book entity and linked reading activity rows.
- Generic entry APIs remain available for legacy reads, but they are not the source of structured analytics.
- There is no pages/progress/catalog/reviews service today.

### 2. Request Validation

- Create and update must validate a non-empty book title.
- Lifecycle fields must validate against the allowed shelf/status values.
- `ratingTenths`, when present, must be an integer from 10 to 50.
- A read-day request must identify one book and one calendar day.
- The backend must enforce one read-day marker per book/day.
- Starting a book, finishing a book, and logging a read day are distinct actions.
- Create or add to Want to Read does not create an activity row.
- Pages/progress/author/genre/review/catalog fields are rejected or deferred, not inferred from free text.
- Invalid structured writes should return a safe failure or empty response.

### 3. Normalization

- Backend computes `dateStr` from `timestamp` for read activities.
- Title is trimmed for storage and display.
- Lifecycle transitions update the Book entity, not a fake read-day activity.
- `ratingTenths` stays an integer tenths value.
- Legacy generic `entries.note` and `entries.value` remain readable, but they are not normalized into structured book state.

### 4. Persistence Plan

Write flow:

1. Insert/update the Book entity row.
2. Insert/update a linked reading activity row when the action is a read-day marker.
3. Update `entries_to_tags` when `tagIds` is provided, if tags remain part of the surface.
4. Return mapped Book responses and activity read models.

- Create or add to Want to Read writes the Book entity only.
- Start and finish mutate the Book entity lifecycle fields.
- Read-day markers are one row per book/day.
- Legacy generic entries are read-only for structured analytics and are not backfilled into the structured tables.

### 5. Read / Query Plan

- BentoGrid: reads the current structured Book entity and recent activities.
- Entries tab: reads structured entities plus linked activity history and optionally a labeled legacy section.
- Statistics tab: computes streaks from explicit read activities and finished-book counts from structured finish data.
- Graphs: based on read-day and finish counts only.
- Calendar selected-day: reads explicit read-day markers and lifecycle events.
- Edit Entry prefill: returns the structured entity state plus recent activity context.
- Correlations/insights: only structured counts if used; Mood and reread correlations are deferred.

### 6. Computed Metrics

- Implemented/approved: active shelf counts, explicit read-day streak, days since last explicit read day, finished-book counts, and structured completion counts.
- `ratingTenths` display formatting is frontend-owned.
- Deferred: pages-progress metrics, catalog stats, author/genre aggregates, review sentiment, reread analytics, and Mood correlation.
- Metrics must come from structured lifecycle data, not legacy generic entries.

### 7. Response Mapping

- Flow: Book entity rows plus linked reading activity rows -> shared Book read models -> UI surfaces.
- Raw DB rows never return to the renderer.
- Legacy generic entries map to a separate fallback legacy read model.
- Missing optional fields return `null` or empty arrays as appropriate.

### 8. Error Handling

- Invalid structured writes return `null`, `false`, or a typed empty response, consistent with the surrounding runtime.
- Missing book or activity data returns empty states, not fabricated analytics.
- Duplicate same-day read markers must not produce duplicate structured rows.
- Unsupported pages/progress/author/genre/review/catalog/Mood/reread requests stay deferred or rejected.

### 9. Transaction Rules

- Book create/update/finish/start/delete should be transactional across the Book entity and any linked read activity rows.
- Read-day writes should be transactional and enforce the one-marker-per-day rule.
- Legacy generic entry reads remain separate from structured writes.
- Current status: transaction safety is required for the structured Book paths.

### 10. Data Ownership Rules

Frontend owns: capture, display, UI state, visual formatting.
Backend owns: validation, normalization, derived metrics, relation resolution, persistence orchestration, response mapping.
Database owns: durable storage, relational integrity, queryable structure.
Shared contracts own: request/response shapes, app-facing types, and pure domain helpers when reusable.

### 11. Deep Contract Status

- Status: STRUCTURED_BOOK_LIFECYCLE_APPROVED_WITH_LEGACY_READS.
- Implemented/approved: Book entity, linked reading activities, explicit read-day lifecycle, finish counts, `ratingTenths`, and legacy read fallback.
- Gaps: pages/progress, author, genre, reviews, catalog browsing, Mood correlations, rereads, and any non-explicit progress model.

## 5. Persistence and Schema / Database

- Book entity storage is the structured source of truth.
- Reading activity rows store explicit start/read/finish events.
- `entries` remain as legacy compatibility rows for readable fallback surfaces.
- `entries_to_tags` remains available if tags are still attached to the Book surfaces.

## 6. Input / Output Contracts

```ts
type BookStatus = "want_to_read" | "reading" | "finished"

type CreateBookRequest = {
  trackerId: number
  title: string
  tagIds?: number[]
}

type UpdateBookRequest = Partial<CreateBookRequest> & {
  trackerId?: number
  ratingTenths?: number | null
}

type LogBookReadDayRequest = {
  bookId: number
  timestamp: number
}

type StartBookRequest = {
  bookId: number
  timestamp: number
}

type FinishBookRequest = {
  bookId: number
  timestamp: number
  ratingTenths?: number | null
}

type BookResponse = {
  bookId: number
  title: string
  status: BookStatus
  startedAt?: number | null
  finishedAt?: number | null
  ratingTenths?: number | null
}

type BookReadActivityResponse = {
  bookId: number
  timestamp: number
  dateStr: string
  kind: "start" | "read_day" | "finish"
}

type BookDetailResponse = {
  book: BookResponse | null
  activities: BookReadActivityResponse[]
  legacyEntries?: BaseEntryResponse["entry"][]
}

type BookStatisticsResponse = {
  wantToReadCount: number
  readingCount: number
  finishedCount: number
  readingStreak?: number
  daysSinceLastReadDay?: number | null
}

type BookCalendarDayResponse = TimelineEvent & {
  bookId: number
  title: string
  kind: "start" | "read_day" | "finish"
  ratingTenths?: number | null
}
```

## 7. Field Visibility Matrix

| Field | Quick Entry | Edit Entry | DB | Backend Computed | BentoGrid | Entries Tab | Statistics Tab | Graphs Tab | Calendar | Insights/Correlations |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| title | Yes | Yes | Yes | No | Yes | Yes | Yes | No | Yes | Optional |
| shelf/status | Yes | Yes | Yes | Yes | Yes | Yes | Yes | No | Yes | Optional |
| start date | Optional | Optional | Yes | Yes | Optional | Yes | Optional | No | Yes | Future |
| finish date | Optional | Optional | Yes | Yes | Optional | Yes | Yes | Yes | Yes | Future |
| read-day marker | Yes | Yes | Yes | Yes | Yes | Yes | Yes | Yes | Yes | No |
| ratingTenths | Optional | Optional | Yes | Yes | Optional | Yes | Optional | No | Optional | Future |
| pages/progress | No | No | No | No | No | No | No | No | No | No |
| author/genre/review/catalog | No | No | No | No | No | No | No | No | No | No |
| reading streak/counts | No | No | No | Computed | Optional | No | Yes | Optional | No | Optional |
| legacy generic entries | No | No | Yes | No | Optional | Yes | No | No | Optional | No |
| tagIds | Optional | Optional | Yes | Optional | No | Yes | Future | Future | Optional | Future |
| assets | Optional | Optional | Optional | Optional | Optional | Yes | No | No | Optional | Future |

## 8. Completeness Checklist

- [x] Quick Entry / Edit Entry input is documented.
- [x] Backend request path is documented.
- [x] Database persistence shape is documented.
- [x] Backend computed response is documented.
- [x] BentoGrid read model is documented.
- [x] Entries tab read model is documented.
- [x] Statistics tab read model is documented.
- [x] Graphs tab relevance is documented.
- [x] Calendar selected-day summary is documented.
- [x] Edit/Delete behavior is documented.
- [x] Future Insights/Correlations are limited to explicit/structured scope.

## 9. Deep Contract Checklist

- [x] Does backend have a clear entry point?
- [x] Does backend validate all request fields that are now structural?
- [x] Does backend normalize timestamp/dateStr/defaults?
- [x] Does backend know which tables to write?
- [x] Does backend write related rows transactionally?
- [x] Does backend know which tables to read for each surface?
- [x] Does backend compute metrics instead of frontend?
- [x] Does backend map DB rows into shared contracts?
- [x] Does backend handle empty/insufficient data?
- [x] Does backend return clear errors/warnings for rejected/deferred fields?
- [x] Does delete/update affect related rows safely?
- [x] Is current implementation status honest?
