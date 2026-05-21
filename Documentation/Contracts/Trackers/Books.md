# Books Contract

## 1. Purpose

Books tracks reading activity without adding friction. The contract documents title/progress/status-style data as current note/value conventions and avoids forcing pages-per-session as a required field.

## 2. Current Implementation Status

- Status: GENERIC_MEDIA_STYLE_IMPLEMENTED.
- Books is seeded/default and Reading is a create-tracker preset alias.
- Quick Entry is text-first with optional numeric secondary value.
- BentoGrid uses the Media widget for book-like trackers.
- Tracker Detail uses media-style generic rendering.
- No book catalog, shelf table, read-day table, rating field, or started/finished date schema exists today.

## 3. Surface Contract / Frontend

### 3.1 Quick Entry / Edit Entry Input

- Quick Entry captures book title in note/text.
- Quick Entry may capture optional progress/pages/chapter/rating as generic `value` or note text.
- Started date, finished date, shelves, and decimal/tenth ratings are Future unless product/client explicitly approves a structured book schema.
- Pages per session must not be required.
- Edit Entry updates generic value, note/title, timestamp, tags, and asset reference.
- Delete uses generic delete behavior.

### 3.2 BentoGrid / Home Widget Read Model

- Shows recent book entries from notes.
- Shows cover/photo asset if attached.
- May show generic value as rating/progress if present.
- Does not require page counts.

### 3.3 Tracker Detail / Entries Tab Read Model

- Shows book entries in media/shelf style: title/note, optional value, date, tags, asset/cover, edit, and delete.
- Does not require author, pages, shelf, or status fields.

### 3.4 Tracker Detail / Statistics Tab Read Model

- May show total entries, items this week/year, reading streak, days since last item, books per week/month/year if the data can be derived from generic entries.
- Started/finished-based completion stats are Future until status dates are structured.

### 3.5 Tracker Detail / Graphs Tab Read Model

- Relevant only for generic entry frequency/value graphs.
- Not applicable for page progress unless pages are consistently captured as `value` by the user.

### 3.6 Calendar Selected-Day Summary Read Model

- Shows selected-day reading entry title/note, optional value, timestamp, tags, and asset reference.

### 3.7 Insights / Correlations Read Model

- Generic correlations can use Books values/counts by tracker ID.
- Correlations with mood or habits are Future unless explicitly requested.

## 4. Deep Contract / Backend-Service

### 1. Backend Entry Point

- Status: GENERIC_ENTRY_ONLY.
- Implemented generic IPC/API methods: `add-entry`, `update-entry`, `delete-entry`, `get-entries`, `get-stats`, `get-correlation-result`, `get-calendar-month`.
- There is no Books-specific service, book catalog endpoint, shelf endpoint, read-day endpoint, rating endpoint, or started/finished date service today.
- Media-style display is a frontend/read convention over generic entries.

### 2. Request Validation

- Current fields: `trackerId`, text/title in `note`, optional numeric `value`, `timestamp`, optional `assetId`, optional `tagIds`.
- Current backend does not require non-empty book title, validate rating precision, enforce started/finished date formats, enforce shelf/status enums, or validate pages/progress semantics.
- Pages-per-session is explicitly not required.
- Invalid generic writes return `null` or `false`.

### 3. Normalization

- Backend computes `dateStr` from `timestamp`.
- `note` defaults to `null` if omitted; surface should avoid pretending that a missing title is a catalog record.
- `value` remains a generic number and is not normalized into pages, rating, or percent.
- `metadata` defaults to `{}`; future book catalog fields should not be treated as reliable while only ad hoc metadata.
- Entry reads sort newest-first; calendar reads by timestamp within date.

### 4. Persistence Plan

Write flow:

1. Insert/update base entry in `entries`.
2. Insert/update specialized tracker table if needed: none exists for Books.
3. Insert/update junction rows in `entries_to_tags` when `tagIds` is provided.
4. Update related entity state if needed: none today.
5. Return mapped generic `Entry` contract.

- Generic entry/tag writes are transactional.
- Delete removes the entry and tag joins; cover/photo assets are not deleted.
- Structural future analytics such as shelves/status/started/finished dates should get columns/tables before backend stats depend on them.

### 5. Read / Query Plan

- BentoGrid: reads generic entries and renders recent book titles from `note`, optional `value`, and attached asset.
- Entries tab: reads entries by tracker newest-first with note/title, value, tags, assets.
- Statistics tab: generic stats can compute total entries, active days, items this week/month/year, and reading streak from logged days.
- Graphs: generic frequency/value graphs only; page progress graphs require consistent captured `value` or future structure.
- Calendar selected-day: month query returns each reading entry with title/note, value, asset, tags.
- Edit Entry prefill: generic entry response with note/value/timestamp/asset/tags.
- Correlation/Insight: generic correlation can use count/value; mood/habit reading insights are FUTURE.
- Empty state: no entries returns empty arrays and neutral counts.

### 6. Computed Metrics

- Implemented/generic: entry count, active days, items per period, generic streak/count style calculations, generic correlation caveat.
- Future/contract-only: started date, finished date, shelf/status, rating decimals/tenths as a typed field, books per week/month/year from completion records.
- No pages-per-session metric is required.
- Metrics are computed on read, not cached/denormalized.

### 7. Response Mapping

- Flow: `entries` DB rows -> `mapEntry` -> shared `Entry` -> Books media-style surface response.
- Raw DB rows never return to the renderer.
- Missing title/value/asset/tags return `null` or `[]`.
- Unit/display formatting is frontend-owned unless a future Books shared read model adds structured fields.

### 8. Error Handling

- Invalid generic entry/DB failure returns `null` or `false`.
- Missing tracker/entry/tag/asset uses generic null/empty fallback.
- Empty dataset returns empty arrays.
- Unsupported shelf/catalog/status/rating requests should be marked Future, not inferred from note text.

### 9. Transaction Rules

- Generic add/update/delete are transactional for `entries` and `entries_to_tags`.
- No specialized Books related rows exist today.
- Current status: transaction safety is IMPLEMENTED for generic entry/tag writes.

### 10. Data Ownership Rules

Frontend owns: capture, display, UI state, visual formatting.
Backend owns: validation, normalization, derived metrics, relation resolution, persistence orchestration, response mapping.
Database owns: durable storage, relational integrity, queryable structure.
Shared contracts own: request/response shapes, app-facing types, pure domain helpers when reusable.

### 11. Deep Contract Status

- Status: GENERIC_ENTRY_ONLY.
- Implemented: low-friction generic reading entries, media-style surfaces, assets/tags through generic contracts, calendar/generic stats/correlation compatibility.
- Gaps: book catalog, started/finished dates, shelf/status, typed rating precision, completion-based books-per-period stats.

## 5. Persistence and Schema / Database

- `trackers`: Books/Reading uses text/book-style config.
- `entries.note`: title/progress/free text.
- `entries.value`: optional generic numeric value such as rating or progress.
- `entries.timestamp` and `entries.date_str`: reading event date/time.
- `entries.metadata`: generic/empty today.
- `entries.asset_id`: optional cover/photo asset.
- `entries_to_tags`: explicit tags.

## 6. Input / Output Contracts

```ts
type CreateBookEntryRequest = BaseEntryRequest & {
  trackerId: number
  note: string | null
  value?: number | null
  timestamp: number
  assetId?: number | null
  tagIds?: number[]
  metadata?: {
    startedDate?: Future<string>
    finishedDate?: Future<string>
    shelf?: Future<string>
    rating?: Future<number>
  }
}

type UpdateBookEntryRequest = Partial<Omit<CreateBookEntryRequest, "trackerId">>

type BookEntryResponse = BaseEntryResponse

type BookDetailResponse = {
  entries: BaseEntryResponse["entry"][]
}

type BookBentoWidgetResponse = {
  trackerId: number
  recentItems: Array<{ entryId: number; title: string; value?: number | null; asset?: AssetSummary | null }>
}

type BookEntriesTabResponse = {
  entries: Array<BaseEntryResponse["entry"] & { tags?: TagSummary[]; assets?: AssetSummary[] }>
}

type BookStatisticsResponse = {
  totalEntries: number
  readingStreak?: number
  itemsThisWeek?: number
  itemsThisMonth?: number
  itemsThisYear?: number
  daysSinceLastEntry?: number | null
}

type BookCalendarDayResponse = TimelineEvent & {
  entryId: number
  trackerId: number
  title?: string | null
  value?: number | null
  tagIds?: number[]
  assets?: AssetSummary[]
}
```

## 7. Field Visibility Matrix

| Field | Quick Entry | Edit Entry | DB | Backend Computed | BentoGrid | Entries Tab | Statistics Tab | Graphs Tab | Calendar | Insights/Correlations |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| book title | Yes | Yes | Yes | No | Yes | Yes | Optional | No | Yes | Optional |
| pages/progress | Optional | Optional | Optional | Optional | Optional | Optional | Optional | Optional | Optional | Optional |
| pages per session | No | No | No | No | No | No | No | No | No | No |
| started date | Future | Future | Future | Future | Future | Future | Future | Future | Future | Future |
| finished date | Future | Future | Future | Future | Future | Future | Future | Future | Future | Future |
| shelves/status | Future | Future | Future | Future | Future | Future | Future | Future | Future | Future |
| rating decimals/tenths | Future | Future | Future | Future | Optional | Optional | Future | Future | Optional | Future |
| reading streak/counts | No | No | No | Computed | Optional | No | Optional | Optional | No | Optional |
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
- [x] Future Insights/Correlations are limited to explicit/generic scope.

## 9. Deep Contract Checklist

- [x] Does backend have a clear entry point?
- [ ] Does backend validate all request fields? Book-specific fields are not validated.
- [x] Does backend normalize timestamp/dateStr/defaults?
- [x] Does backend know which tables to write?
- [x] Does backend write related rows transactionally?
- [x] Does backend know which tables to read for each surface?
- [ ] Does backend compute metrics instead of frontend? Only generic stats are available.
- [x] Does backend map DB rows into shared contracts?
- [x] Does backend handle empty/insufficient data?
- [ ] Does backend return clear errors/warnings? Current path uses generic fallbacks.
- [x] Does delete/update affect related rows safely?
- [x] Is current implementation status honest?
