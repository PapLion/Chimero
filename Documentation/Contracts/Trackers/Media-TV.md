# Media / TV Contract

## 1. Purpose

Media / TV tracks watched or consumed media sessions. It covers title, media type, episode/season when applicable, watched session/status as note/value conventions today, and calendar/timeline summaries without inventing a full media catalog.

## 2. Current Implementation Status

- Status: GENERIC_MEDIA_STYLE_IMPLEMENTED.
- Media/TV is seeded/default with icon mismatch across some seed paths (`music` vs `tv`).
- Quick Entry is text-first with optional numeric secondary value.
- BentoGrid uses the Media widget.
- Tracker Detail uses media-style generic rendering.
- No media catalog, watch-status entity, episode schema, or season table exists today.

## 3. Surface Contract / Frontend

### 3.1 Quick Entry / Edit Entry Input

- Quick Entry captures title in note/text.
- Quick Entry may capture episode/rating/progress as generic `value` or note text.
- Media type, episode, season, watched session, and status are Future unless represented by user convention in note/tags.
- Edit Entry updates generic title/note, value, timestamp, tags, and asset reference.
- Delete uses generic delete behavior.

### 3.2 BentoGrid / Home Widget Read Model

- Shows recent media titles from notes.
- Shows thumbnail/asset when attached.
- Shows generic value if present.

### 3.3 Tracker Detail / Entries Tab Read Model

- Shows media entries with title/note, optional value, timestamp, tags, image/asset, edit, and delete.
- Does not require episode/season/status fields unless they are encoded in note text.

### 3.4 Tracker Detail / Statistics Tab Read Model

- May show total entries, items this week/year, days since last item, generic averages, and activity frequency.
- Watched counts by title/status are Future until title/status are structured.

### 3.5 Tracker Detail / Graphs Tab Read Model

- Relevant for generic frequency/value over time.
- Episode/season progress graphs are Not applicable until structured media fields exist.

### 3.6 Calendar Selected-Day Summary Read Model

- Shows selected-day media title/note, optional value, timestamp, tags, and asset reference.
- Timeline summaries can use the generic `TimelineEvent` shape.

### 3.7 Insights / Correlations Read Model

- Generic correlations can use Media values/counts by tracker ID.
- Mood/sleep/media-type correlations are Future unless explicitly requested and backed by data.

## 4. Deep Contract / Backend-Service

### 1. Backend Entry Point

- Status: GENERIC_ENTRY_ONLY.
- Implemented generic IPC/API methods: `add-entry`, `update-entry`, `delete-entry`, `get-entries`, `get-stats`, `get-correlation-result`, `get-calendar-month`.
- There is no Media/TV-specific service, catalog endpoint, watched-session endpoint, episode/season endpoint, or status endpoint today.
- Timeline summaries are generic calendar/timeline events, not a specialized Media backend model.

### 2. Request Validation

- Current fields: `trackerId`, title/progress text in `note`, optional numeric `value`, `timestamp`, optional `assetId`, optional `tagIds`.
- Current backend does not require title, validate media type, episode/season numbers, watched duration/count, status enums, or catalog identity.
- Type/status/episode fields are optional user conventions in note/tags until a structured schema exists.
- Invalid generic writes return `null` or `false`.

### 3. Normalization

- Backend computes `dateStr` from `timestamp`.
- `note` stores free text title/episode/progress; `value` stays generic.
- `metadata` defaults to `{}`; future media fields should not be analytics-critical while ad hoc metadata.
- `assetId` defaults to `null`; tags follow generic replacement semantics.
- Reads sort newest-first; calendar reads by timestamp within month.

### 4. Persistence Plan

Write flow:

1. Insert/update base entry in `entries`.
2. Insert/update specialized tracker table if needed: none exists for Media/TV.
3. Insert/update junction rows in `entries_to_tags` when `tagIds` is provided.
4. Update related entity state if needed: none today.
5. Return mapped generic `Entry` contract.

- Generic entry/tag writes are transactional.
- Delete removes `entries` and tag joins; media thumbnail/assets are not deleted.
- Media identity, season, episode, status, and watched duration/count should become structural before backend catalog/stats depend on them.

### 5. Read / Query Plan

- BentoGrid: reads recent generic entries and renders note/title, optional value, optional asset.
- Entries tab: reads entries by tracker newest-first with title/note, value, tags, assets.
- Statistics tab: generic stats can compute total entries, active days, items this week/year, generic averages, and days since last item.
- Graphs: generic frequency/value only; season/episode progress graphs are FUTURE.
- Calendar selected-day: month query returns each media entry with title/note, value, timestamp, asset, tag IDs.
- Edit Entry prefill: generic entry response with note/value/timestamp/asset/tags.
- Correlation/Insight: generic correlation can use count/value; media-type or sleep/mood correlations are FUTURE unless explicitly requested and structurally represented.
- Empty state: no entries returns empty arrays/neutral metrics.

### 6. Computed Metrics

- Implemented/generic: item count, active days, grouped series, average generic value, generic correlation caveats.
- Future: watched count by title/status, watched duration, episode/season progress, media-type breakdown, catalog state.
- Metrics are computed on read, not cached/denormalized.

### 7. Response Mapping

- Flow: `entries` DB rows -> `mapEntry` -> shared `Entry` -> Media surface read model.
- Raw DB rows never return to renderer surfaces.
- Missing title/status/episode/asset/tags return `null` or `[]`.
- Type/status formatting belongs to frontend until a shared Media contract exists.

### 8. Error Handling

- Invalid generic entry/DB failure returns `null` or `false`.
- Missing tracker/entry/tag/asset uses generic null/empty fallback.
- Empty dataset returns empty state.
- Unsupported catalog/status/episode requests should be marked Future instead of guessed from note text.

### 9. Transaction Rules

- Generic add/update/delete are transactional for `entries` and `entries_to_tags`.
- No specialized Media/TV related rows exist today.
- Current status: transaction safety is IMPLEMENTED for generic entry/tag writes.

### 10. Data Ownership Rules

Frontend owns: capture, display, UI state, visual formatting.
Backend owns: validation, normalization, derived metrics, relation resolution, persistence orchestration, response mapping.
Database owns: durable storage, relational integrity, queryable structure.
Shared contracts own: request/response shapes, app-facing types, pure domain helpers when reusable.

### 11. Deep Contract Status

- Status: GENERIC_ENTRY_ONLY.
- Implemented: generic watched/media entries, media-style surfaces, calendar/timeline summaries through generic events, assets/tags, generic stats/correlation compatibility.
- Gaps: media item identity, structured watched session, type/status, season/episode, watched duration/count, catalog-level timeline.

## 5. Persistence and Schema / Database

- `trackers`: Media/TV or Media, text type, icon `music` or `tv` depending seed path.
- `entries.note`: title/episode/rating/progress text.
- `entries.value`: optional generic value such as rating/progress.
- `entries.timestamp` and `entries.date_str`: watched/logged time and day.
- `entries.metadata`: generic/empty today.
- `entries.asset_id`: optional image/reference.
- `entries_to_tags`: explicit tags.

## 6. Input / Output Contracts

```ts
type CreateMediaEntryRequest = BaseEntryRequest & {
  trackerId: number
  note: string | null
  value?: number | null
  timestamp: number
  assetId?: number | null
  tagIds?: number[]
  metadata?: {
    mediaType?: Future<"tv" | "movie" | "series" | "music" | "app" | "other">
    season?: Future<number>
    episode?: Future<number>
    status?: Future<"planned" | "watching" | "watched" | "dropped">
  }
}

type UpdateMediaEntryRequest = Partial<Omit<CreateMediaEntryRequest, "trackerId">>

type MediaEntryResponse = BaseEntryResponse

type MediaDetailResponse = {
  entries: BaseEntryResponse["entry"][]
}

type MediaBentoWidgetResponse = {
  trackerId: number
  recentItems: Array<{ entryId: number; title: string; value?: number | null; asset?: AssetSummary | null }>
}

type MediaEntriesTabResponse = {
  entries: Array<BaseEntryResponse["entry"] & { tags?: TagSummary[]; assets?: AssetSummary[] }>
}

type MediaStatisticsResponse = {
  totalEntries: number
  itemsThisWeek?: number
  itemsThisYear?: number
  daysSinceLastEntry?: number | null
  watchedCountByTitle?: Future<Array<{ title: string; count: number }>>
}

type MediaCalendarDayResponse = TimelineEvent & {
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
| title | Yes | Yes | Yes | No | Yes | Yes | Optional | No | Yes | Optional |
| media type | Future | Future | Future | Future | Future | Future | Future | Future | Future | Future |
| season/episode | Optional | Optional | Optional | No | Optional | Optional | Future | Future | Optional | Future |
| watched session/status | Optional | Optional | Optional | Future | Optional | Optional | Future | Future | Optional | Future |
| rating/progress value | Optional | Optional | Optional | Optional | Optional | Optional | Optional | Optional | Optional | Optional |
| timeline summary | No | No | Yes | Computed | Optional | Optional | Optional | Optional | Yes | Optional |
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
- [ ] Does backend validate all request fields? Media-specific fields are not validated.
- [x] Does backend normalize timestamp/dateStr/defaults?
- [x] Does backend know which tables to write?
- [x] Does backend write related rows transactionally?
- [x] Does backend know which tables to read for each surface?
- [ ] Does backend compute metrics instead of frontend? Only generic stats exist.
- [x] Does backend map DB rows into shared contracts?
- [x] Does backend handle empty/insufficient data?
- [ ] Does backend return clear errors/warnings? Current path uses generic fallbacks.
- [x] Does delete/update affect related rows safely?
- [x] Is current implementation status honest?
