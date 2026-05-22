# TV / Media Contract

## 1. Purpose

TV and Media are separate supported tracker identities that share the same generic entry infrastructure. TV tracks watched shows/movies/series sessions; Media tracks broader consumed media/app/media items. Both cover title text, optional generic numeric value, tags, assets, and timestamp today without inventing a full media catalog.

## 2. Current Implementation Status

- Status: SEPARATE_GENERIC_ENTRY_IMPLEMENTED.
- Fresh/default seeds create separate `TV` and `Media` trackers; fresh databases must not create merged `Media/TV`.
- Existing `TV` and `Media` tracker records are preserved and completed if either one is missing.
- Populated legacy `Media/TV` records are preserved non-destructively and are not split, renamed, or deleted by default.
- Empty legacy `Media/TV` records may be replaced by separate `TV` and `Media` defaults when no entries exist.
- Quick Entry is text-first with optional numeric secondary value for both TV and Media, with separate labels/placeholders.
- BentoGrid/Home and Tracker Detail use shared media-style generic rendering keyed by explicit tracker identity/name/config, not by loose icon matching alone.
- No media catalog, watch-status entity, episode schema, or season table exists today.

## 3. Surface Contract / Frontend

### 3.1 Quick Entry / Edit Entry Input

- TV Quick Entry captures a TV title in note/text and may capture episode/rating as generic `value` or note text.
- Media Quick Entry captures a Media title in note/text and may capture rating/progress as generic `value` or note text.
- Legacy `Media/TV` remains compatible with generic media/TV text entry.
- Media type, episode, season, watched session, and status are Future unless represented by user convention in note/tags.
- Edit Entry updates generic title/note, value, timestamp, tags, and asset reference.
- Delete uses generic delete behavior.

### 3.2 BentoGrid / Home Widget Read Model

- Shows recent TV or Media titles from notes under the exact tracker label.
- Shows thumbnail/asset when attached.
- Shows generic value if present.

### 3.3 Tracker Detail / Entries Tab Read Model

- Shows TV and Media entries with title/note, optional value, timestamp, tags, image/asset, edit, and delete under their separate tracker labels.
- Does not require episode/season/status fields unless they are encoded in note text.

### 3.4 Tracker Detail / Statistics Tab Read Model

- May show total entries, items this week/year, days since last item, generic averages, and activity frequency.
- Watched counts by title/status are Future until title/status are structured.

### 3.5 Tracker Detail / Graphs Tab Read Model

- Relevant for generic frequency/value over time.
- Episode/season progress graphs are Not applicable until structured media fields exist.

### 3.6 Calendar Selected-Day Summary Read Model

- Shows selected-day TV and Media title/note, optional value, timestamp, tags, and asset reference under their separate tracker labels.
- Timeline summaries can use the generic `TimelineEvent` shape.

### 3.7 Insights / Correlations Read Model

- Generic correlations can use Media values/counts by tracker ID.
- Mood/sleep/media-type correlations are Future unless explicitly requested and backed by data.

## 4. Deep Contract / Backend-Service

### 1. Backend Entry Point

- Status: GENERIC_ENTRY_ONLY_WITH_SEPARATE_IDENTITIES.
- Implemented generic IPC/API methods: `add-entry`, `update-entry`, `delete-entry`, `get-entries`, `get-stats`, `get-correlation-result`, `get-calendar-month`.
- There is no TV-specific or Media-specific service, catalog endpoint, watched-session endpoint, episode/season endpoint, or status endpoint today.
- Timeline summaries are generic tracker/month events, not specialized TV/Media item spans.

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
2. Insert/update specialized tracker table if needed: none exists for TV or Media.
3. Insert/update junction rows in `entries_to_tags` when `tagIds` is provided.
4. Update related entity state if needed: none today.
5. Return mapped generic `Entry` contract.

- Generic entry/tag writes are transactional.
- Delete removes `entries` and tag joins; media thumbnail/assets are not deleted.
- TV/Media item identity, season, episode, status, and watched duration/count should become structural before backend catalog/stats depend on them.

### 5. Read / Query Plan

- BentoGrid: reads recent generic entries and renders note/title, optional value, optional asset under each separate tracker label.
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
- Type/status formatting belongs to frontend until shared structured TV/Media contracts exist.

### 8. Error Handling

- Invalid generic entry/DB failure returns `null` or `false`.
- Missing tracker/entry/tag/asset uses generic null/empty fallback.
- Empty dataset returns empty state.
- Unsupported catalog/status/episode requests should be marked Future instead of guessed from note text.

### 9. Transaction Rules

- Generic add/update/delete are transactional for `entries` and `entries_to_tags`.
- No specialized TV or Media related rows exist today.
- Current status: transaction safety is IMPLEMENTED for generic entry/tag writes.

### 10. Data Ownership Rules

Frontend owns: capture, display, UI state, visual formatting.
Backend owns: validation, normalization, derived metrics, relation resolution, persistence orchestration, response mapping.
Database owns: durable storage, relational integrity, queryable structure.
Shared contracts own: request/response shapes, app-facing types, pure domain helpers when reusable.

### 11. Deep Contract Status

- Status: GENERIC_ENTRY_ONLY_WITH_SEPARATE_IDENTITIES.
- Implemented: separate TV and Media tracker identities, generic watched/media entries, media-style surfaces, calendar/timeline summaries through generic events, assets/tags, generic stats/correlation compatibility.
- Gaps: media item identity, structured watched session, type/status, season/episode, watched duration/count, catalog-level timeline.

## 5. Persistence and Schema / Database

- `trackers`: `TV`, text type, icon `tv`, config identity `tv`.
- `trackers`: `Media`, text type, icon `music`, config identity `media`.
- `trackers`: populated legacy `Media/TV` may remain for compatibility; it must not be destructively renamed, split, or deleted.
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

type CreateTvEntryRequest = BaseEntryRequest & {
  trackerId: number
  note: string | null
  value?: number | null
  timestamp: number
  assetId?: number | null
  tagIds?: number[]
  metadata?: Record<string, unknown>
}

type UpdateMediaEntryRequest = Partial<Omit<CreateMediaEntryRequest, "trackerId">>

type TvEntryResponse = BaseEntryResponse
type MediaEntryResponse = BaseEntryResponse

type MediaDetailResponse = {
  entries: BaseEntryResponse["entry"][]
}

type TvOrMediaBentoWidgetResponse = {
  trackerId: number
  trackerName: "TV" | "Media" | "Media/TV"
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

type TvOrMediaCalendarDayResponse = TimelineEvent & {
  entryId: number
  trackerId: number
  trackerName: "TV" | "Media" | "Media/TV"
  title?: string | null
  value?: number | null
  tagIds?: number[]
  assets?: AssetSummary[]
}
```

## 7. Field Visibility Matrix

| Field | Quick Entry | Edit Entry | DB | Backend Computed | BentoGrid | Entries Tab | Statistics Tab | Graphs Tab | Calendar | Insights/Correlations |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| title | Yes | Yes | Yes | No | Yes, under separate TV/Media label | Yes, under separate TV/Media label | Optional | No | Yes, under separate TV/Media label | Optional |
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
