# Mood Contract

## 1. Purpose

Mood tracks subjective mood values over time. The contract stays limited to client-requested/current fields: mood value/color presentation, multiple entries per day, optional before/after work split only where documented, note/context, optional cause tags, average/high/low summaries, heatmap/calendar trends, and explicit correlations only through existing generic insight contracts.

## 2. Current Implementation Status

- Status: GENERIC_IMPLEMENTED_WITH_SPECIALIZED_BENTO_AGGREGATE.
- Quick Entry captures a 1-10 rating for smile/mood trackers and optional note/context.
- Mutations use the generic entry path, not a Mood-specific service.
- BentoGrid has a mood-specific widget using selected-day value and daily aggregates.
- Tracker Detail, Calendar, edit, and delete use generic entry contracts.
- Electron/web seed config differs (`max: 5` vs `max: 10` in older paths), so scale normalization is NEEDS_CLIENT_CONFIRMATION before stronger Mood guarantees.

## 3. Surface Contract / Frontend

### 3.1 Quick Entry / Edit Entry Input

- Quick Entry captures `value` as mood rating.
- Quick Entry captures optional `note/context`.
- Quick Entry may use tracker color/icon for mood visual tone.
- Quick Entry supports multiple entries per day because entries use exact timestamps.
- Cause tags are optional explicit `tagIds`; there is no dedicated cause field.
- Before/after work split is not a current first-class field. If needed, it must be represented by tags or note until a client-approved field exists.
- Edit Entry can update value, note/context, timestamp, explicit tags, and asset reference through the generic edit path.
- Delete uses generic delete behavior.

### 3.2 BentoGrid / Home Widget Read Model

- Shows selected-day mood value when logged.
- Shows mood visual state/color/emoji from value.
- Uses daily aggregates for recent trend/sparkline where available.
- Does not show every same-day entry; it summarizes compactly.

### 3.3 Tracker Detail / Entries Tab Read Model

- Shows each mood entry separately, including multiple entries on the same day.
- Shows value, note/context, timestamp, tags, and asset indicator when present.
- Provides edit/delete controls per entry.

### 3.4 Tracker Detail / Statistics Tab Read Model

- May show total entries, current streak, average mood, high/low mood, days since last entry, and generic active-day stats.
- Mood-specific average/high/low should be computed from `entries.value`.
- Cause-tag aggregation is Future unless implemented by generic tag stats.

### 3.5 Tracker Detail / Graphs Tab Read Model

- Relevant.
- Graphs mood value over time using generic numeric/range entries.
- Heatmap/calendar views may use value intensity.

### 3.6 Calendar Selected-Day Summary Read Model

- Shows each selected-day mood entry with value, note/context, timestamp, tags, and asset reference when available.
- Should not collapse multiple entries/day into one unless the UI explicitly labels it as an aggregate.

### 3.7 Insights / Correlations Read Model

- Generic Insight Lab correlations can use Mood as source or target via `CorrelationResultResponse`.
- Specific correlations with work, causes, food, health, or weight are Future unless explicitly requested and backed by data.

## 4. Deep Contract / Backend-Service

### 1. Backend Entry Point

- Status: PARTIAL.
- Implemented generic IPC/API methods: `add-entry`, `update-entry`, `delete-entry`, `get-entries`.
- Implemented Mood-specific read method: `get-mood-daily-aggregates`.
- Generic stats/correlation methods can include Mood by `trackerId`.
- No dedicated Mood create/update service or Mood table exists today; mutation status is GENERIC_ENTRY_ONLY.

### 2. Request Validation

- Required create fields: `trackerId`, numeric mood `value`, `timestamp`.
- Optional fields: `note`, `assetId`, `tagIds`, metadata for future/context.
- Current generic backend does not enforce Mood-specific min/max, color scale, before/after work enum, cause tags, or one scale across runtimes.
- Mood scale is NEEDS_CLIENT_CONFIRMATION because seeded/configured paths can imply `max: 5` or a 1-10 UI.
- Invalid DB/handler failures return `null` for mutation or `[]` for reads; stronger typed validation errors are Future.

### 3. Normalization

- Backend computes `dateStr` from `timestamp`.
- `note` and `assetId` normalize to `null` when omitted.
- `metadata` defaults to `{}`.
- Omitted `tagIds` leaves replacement semantics to the generic handler; provided `[]` clears tags.
- Multiple entries/day are preserved because `timestamp` remains exact; daily aggregates group by normalized `dateStr`.

### 4. Persistence Plan

Write flow:

1. Insert/update base entry in `entries`.
2. Insert/update specialized tracker table if needed: none exists for Mood.
3. Insert/update junction rows in `entries_to_tags` when `tagIds` is provided.
4. Update related entity state if needed: none today.
5. Return mapped contract from `mapEntry`, with explicit `tagIds` on mapped entries.

- Generic create/update/delete use transactions for `entries` plus tag joins.
- Delete is hard delete for `entries` and explicit tag joins; assets are not deleted.
- Mood analytics fields that need reliable heatmaps/cause rollups should not be hidden only in metadata in future work.

### 5. Read / Query Plan

- BentoGrid: reads generic entries and calls `get-mood-daily-aggregates` for recent selected-day trend; groups by `entries.date_str`, averages `entries.value`, returns `date`, rounded `value`, and `count`.
- Entries tab: reads `entries` filtered by tracker, ordered newest-first, with tag IDs.
- Statistics tab: currently computes generic counts/averages from entries in frontend/shared surfaces; backend `get-stats` can provide generic grouped series.
- Graphs: generic numeric graph uses `entries.value` over time; heatmap intensity uses aggregate value/count where available.
- Calendar selected-day: `get-calendar-month` reads `entries` by month, includes exact same-day entries and `tagIds`.
- Edit Entry prefill: generic entry response provides value, note, timestamp, asset, and tags.
- Correlation/Insight: `get-correlation-result` can use Mood values when selected; cause/work-specific correlations are CONTRACT_ONLY/FUTURE.
- Empty state: no entries returns empty arrays, null selected-day value, or neutral stats, never fake mood.

### 6. Computed Metrics

- Implemented backend metric: daily average mood and count through `get-mood-daily-aggregates`.
- Generic stats can compute entry count, active days, grouped sum/count, and descriptive correlation results.
- Mood average/high/low, heatmap intensity, visual tone/color, and before/after work split are not first-class backend metrics today unless derived by generic surfaces.
- Minimum data for correlation is controlled by generic correlation sample logic; insufficient data returns low confidence/caveat.
- Metrics are computed on read, not cached/denormalized.

### 7. Response Mapping

- Flow: `entries` DB rows -> `mapEntry` -> shared `Entry`/aggregate response -> Mood widget/detail/calendar surface response.
- Raw DB rows must not reach the renderer.
- Missing `note`, `assetId`, and optional tags return `null` or `[]`.
- Mood display colors belong to frontend/domain display logic unless a future shared Mood read model owns them.

### 8. Error Handling

- Invalid request or DB failure in mutation returns `null`.
- Aggregate read failure returns `[]`.
- Missing tracker/entry is represented by empty/null generic results.
- Missing tag/asset/contact references are not strongly validated by the generic Mood path today.
- Empty dataset is an empty state; insufficient correlation data returns generic caveat/low confidence.

### 9. Transaction Rules

- Generic add/update/delete are transactional for `entries` and `entries_to_tags`.
- There is no specialized Mood table to coordinate today.
- Current status: transaction safety is IMPLEMENTED for generic entry/tag writes; specialized Mood contract remains GENERIC_ENTRY_ONLY.

### 10. Data Ownership Rules

Frontend owns: capture, display, UI state, visual formatting.
Backend owns: validation, normalization, derived metrics, relation resolution, persistence orchestration, response mapping.
Database owns: durable storage, relational integrity, queryable structure.
Shared contracts own: request/response shapes, app-facing types, pure domain helpers when reusable.

### 11. Deep Contract Status

- Status: PARTIAL.
- Implemented: generic Mood entry CRUD, exact timestamps, multiple entries/day, daily aggregate endpoint, generic stats/correlation compatibility.
- Gaps: Mood-specific request validation, scale normalization, before/after work structural field, reason/cause aggregation, dedicated Mood response/read model, and explicit color/heatmap backend contract.

## 5. Persistence and Schema / Database

- `trackers`: Mood seeded as range/smile, with config max requiring normalization.
- `entries.value`: mood rating.
- `entries.note`: note/context.
- `entries.timestamp` and `entries.date_str`: exact event time and day grouping.
- `entries.metadata`: currently generic/empty from Quick Entry.
- `entries.asset_id`: optional attachment.
- `entries_to_tags`: explicit cause/context tags when selected.

## 6. Input / Output Contracts

```ts
type CreateMoodEntryRequest = BaseEntryRequest & {
  trackerId: number
  value: number
  note?: string | null
  timestamp: number
  assetId?: number | null
  tagIds?: number[]
}

type UpdateMoodEntryRequest = Partial<Omit<CreateMoodEntryRequest, "trackerId">>

type MoodEntryResponse = BaseEntryResponse & {
  entry: BaseEntryResponse["entry"] & {
    value: number
    visualState?: "positive" | "negative" | "neutral"
  }
}

type MoodDetailResponse = {
  entries: MoodEntryResponse["entry"][]
  dailyAggregates: Array<{ date: string; value: number; count: number }>
}

type MoodBentoWidgetResponse = {
  trackerId: number
  selectedDateValue: number | null
  displayColor?: string | null
  dailyAggregates: Array<{ date: string; value: number; count: number }>
}

type MoodEntriesTabResponse = {
  entries: Array<MoodEntryResponse["entry"] & { tags?: TagSummary[]; assets?: AssetSummary[] }>
}

type MoodStatisticsResponse = {
  totalEntries: number
  currentStreak?: number
  averageMood?: number | null
  highMood?: number | null
  lowMood?: number | null
  daysSinceLastEntry?: number | null
}

type MoodCalendarDayResponse = TimelineEvent & {
  entryId: number
  trackerId: number
  value: number
  note?: string | null
  tagIds?: number[]
  assets?: AssetSummary[]
}
```

## 7. Field Visibility Matrix

| Field | Quick Entry | Edit Entry | DB | Backend Computed | BentoGrid | Entries Tab | Statistics Tab | Graphs Tab | Calendar | Insights/Correlations |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| mood value | Yes | Yes | Yes | Optional | Yes | Yes | Yes | Yes | Yes | Yes |
| mood color/visual | Computed | Computed | No | Computed | Yes | Optional | Optional | Optional | Optional | Optional |
| multiple entries/day | Yes | Yes | Yes | Yes | Optional | Yes | Yes | Yes | Yes | Optional |
| before/after work split | Future | Future | Future | Future | Future | Future | Future | Future | Future | Future |
| note/context | Optional | Optional | Yes | No | No | Yes | No | No | Optional | Optional |
| cause tags/tagIds | Optional | Optional | Yes | Optional | No | Yes | Future | Future | Optional | Future |
| average/high/low | No | No | No | Computed | Optional | No | Yes | Yes | No | Optional |
| heatmap intensity | No | No | No | Computed | Optional | No | Optional | Yes | Optional | Optional |
| assets | Optional | Optional | Optional | Optional | No | Optional | No | No | Optional | No |

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
- [ ] Does backend validate all request fields? Mood scale/range and semantic fields are not enforced.
- [x] Does backend normalize timestamp/dateStr/defaults?
- [x] Does backend know which tables to write?
- [x] Does backend write related rows transactionally?
- [x] Does backend know which tables to read for each surface?
- [ ] Does backend compute metrics instead of frontend? Only daily aggregates and generic stats are backend-computed.
- [x] Does backend map DB rows into shared contracts?
- [x] Does backend handle empty/insufficient data?
- [ ] Does backend return clear errors/warnings? Current path returns null/[] fallbacks, not typed Mood errors.
- [x] Does delete/update affect related rows safely?
- [x] Is current implementation status honest?
