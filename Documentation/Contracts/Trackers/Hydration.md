# Hydration Contract

## 1. Purpose

Hydration tracks simple fluid amount entries. The contract is intentionally small: amount, unit, daily total, goal progress where a tracker config already provides a goal, and calendar summaries.

## 2. Current Implementation Status

- Status: PRESET_SUPPORTED_GENERIC_IMPLEMENTED.
- Hydration is available as a create-tracker preset and water-like trackers are detected by name/icon.
- It is not seeded by default in the current default tracker lists.
- Mutations, detail, statistics, calendar, edit, and delete use generic entry contracts.
- BentoGrid uses the Progress widget for water/hydration-like trackers.

## 3. Surface Contract / Frontend

### 3.1 Quick Entry / Edit Entry Input

- Quick Entry captures numeric amount.
- Quick Entry displays the tracker unit from config when available, commonly `ml`.
- Quick Entry captures optional drink/type note.
- Quick Entry can attach optional tags/assets through the generic path.
- Edit Entry can update amount, note/type, timestamp, tags, and asset reference.
- Delete uses generic delete behavior.

### 3.2 BentoGrid / Home Widget Read Model

- Shows selected-day total amount.
- Shows unit from tracker config.
- Shows progress toward `tracker.config.goal` only if the goal exists.
- Uses generic selected-day aggregation; no hydration-specific service exists.

### 3.3 Tracker Detail / Entries Tab Read Model

- Shows each drink entry with amount, unit, note/type, timestamp, tags, and asset indicator when present.
- Provides edit/delete controls.

### 3.4 Tracker Detail / Statistics Tab Read Model

- May show total entries, current streak, daily average, 30-day average, days since last entry, and goal progress using generic numeric stats.
- Does not validate bottle sizes or caffeine categories.

### 3.5 Tracker Detail / Graphs Tab Read Model

- Relevant.
- Graphs selected-day or per-day aggregated amount using generic numeric series.

### 3.6 Calendar Selected-Day Summary Read Model

- Shows amount, unit, optional drink/type note, tags, and asset reference.
- Multiple hydration entries on one day should remain visible or be clearly summarized as a daily total.

### 3.7 Insights / Correlations Read Model

- Generic correlations can use hydration values if the tracker exists.
- Caffeine, drink-type, mood, health, or weight correlations are Future unless explicitly requested and represented by data.

## 4. Deep Contract / Backend-Service

### 1. Backend Entry Point

- Status: GENERIC_ENTRY_ONLY.
- Implemented generic IPC/API methods: `create-tracker`, `add-entry`, `update-entry`, `delete-entry`, `get-entries`, `get-stats`, `get-correlation-result`, `get-calendar-month`.
- There is no specialized Hydration service/table today.
- BentoGrid behavior is widget/read-model convention over generic entries, not a Hydration backend endpoint.

### 2. Request Validation

- Required create fields: `trackerId`, numeric `value` amount, `timestamp`.
- Optional fields: `note`, `assetId`, `tagIds`, generic metadata.
- Unit comes from `trackers.config.unit` and is not validated or converted by a Hydration service.
- Current backend does not enforce positive amount, max drink size, unit enum, daily goal range, tracker type, asset existence, or tag existence.
- Invalid DB/handler failures return `null` or `false`; reads return empty arrays/fallback stats.

### 3. Normalization

- Backend computes `dateStr` from `timestamp`.
- `note` and `assetId` default to `null`; `metadata` defaults to `{}`.
- `tagIds` are replaced only when provided.
- Daily totals are normalized by grouping/filtering on `dateStr`; individual drink timestamps stay exact.
- Sorting for entry reads is newest-first; calendar reads are timestamp ordered.

### 4. Persistence Plan

Write flow:

1. Insert/update base entry in `entries`.
2. Insert/update specialized tracker table if needed: none exists for Hydration.
3. Insert/update junction rows in `entries_to_tags` when `tagIds` is provided.
4. Update related entity state if needed: none today.
5. Return mapped `Entry` contract with `tagIds` when available.

- Generic create/update/delete use transactions for entry/tag writes.
- Delete is hard delete for `entries` and tag joins; assets are not deleted.
- Amount is structural in `entries.value`; drink type remains free text in `entries.note` unless future schema is added.

### 5. Read / Query Plan

- BentoGrid: filters generic entries by tracker and selected date, sums or displays numeric `value`, reads unit/goal from tracker config, computes progress if goal exists.
- Entries tab: reads `entries` filtered by tracker, ordered newest-first, with tags/assets.
- Statistics tab: uses generic entry stats: totals, averages, active days, streak-like UI calculations where available.
- Graphs: groups or plots `entries.value` by date; daily total should be a sum over same-day entries.
- Calendar selected-day: `get-calendar-month` returns each matching entry with value, note, timestamp, asset, and `tagIds`.
- Edit Entry prefill: generic entry response with amount, note, timestamp, asset, tags.
- Correlation/Insight: generic correlation can use Hydration values; drink-type-specific insight is FUTURE.
- Empty state: no selected-day entries yields `dailyTotal: 0` or null display according to surface.

### 6. Computed Metrics

- Daily total is computed by summing same-day `entries.value`.
- Goal progress is computed only when `trackers.config.goal` exists; otherwise it is `null`/omitted.
- Generic stats can compute count, active days, series value, daily average, and 30-day averages where the surface computes them from entries.
- No unit conversion, caffeine category, bottle-size validation, or hydration-specific streak service exists.
- Metrics are computed on read, not cached/denormalized.

### 7. Response Mapping

- Flow: `entries` DB rows -> `mapEntry` -> shared `Entry` -> Hydration surface read model.
- Raw DB rows never return to the renderer.
- Missing optional note/asset/tags return `null` or `[]`.
- Unit display should use `tracker.config.unit`; backend does not rewrite stored amounts into another unit.

### 8. Error Handling

- Invalid request/DB failure returns `null` for create/update, `false` for delete, empty arrays for reads.
- Missing tracker/entry/asset/tag is not strongly distinguished by typed Hydration errors today.
- Empty dataset returns empty entries and neutral totals.
- Unsupported drink-type/caffeine analytics should be marked Future, not error.

### 9. Transaction Rules

- Generic add/update/delete are transactional for `entries` and `entries_to_tags`.
- No specialized Hydration related rows exist today.
- Current status: transaction safety is IMPLEMENTED for generic entry/tag writes.

### 10. Data Ownership Rules

Frontend owns: capture, display, UI state, visual formatting.
Backend owns: validation, normalization, derived metrics, relation resolution, persistence orchestration, response mapping.
Database owns: durable storage, relational integrity, queryable structure.
Shared contracts own: request/response shapes, app-facing types, pure domain helpers when reusable.

### 11. Deep Contract Status

- Status: GENERIC_ENTRY_ONLY.
- Implemented: generic numeric amount entry, tags/assets through generic contracts, selected-day/calendar reads, generic stats/correlation compatibility.
- Gaps: Hydration-specific validation, unit conversion, daily goal service, drink category analytics, and specialized response shape.

## 5. Persistence and Schema / Database

- `trackers.config.unit`: unit such as `ml`.
- `trackers.config.goal`: optional daily goal.
- `entries.value`: amount.
- `entries.note`: optional drink/type/context.
- `entries.timestamp` and `entries.date_str`: event time and day grouping.
- `entries.metadata`: generic/empty today.
- `entries.asset_id`: optional attachment.
- `entries_to_tags`: explicit tags.
- No hydration-specific table exists.

## 6. Input / Output Contracts

```ts
type CreateHydrationEntryRequest = BaseEntryRequest & {
  trackerId: number
  value: number
  note?: string | null
  timestamp: number
  assetId?: number | null
  tagIds?: number[]
}

type UpdateHydrationEntryRequest = Partial<Omit<CreateHydrationEntryRequest, "trackerId">>

type HydrationEntryResponse = BaseEntryResponse

type HydrationDetailResponse = {
  entries: BaseEntryResponse["entry"][]
}

type HydrationBentoWidgetResponse = {
  trackerId: number
  dailyTotal: number
  unit?: string | null
  goal?: number | null
  progressPercent?: number | null
}

type HydrationEntriesTabResponse = {
  entries: Array<BaseEntryResponse["entry"] & { tags?: TagSummary[]; assets?: AssetSummary[] }>
}

type HydrationStatisticsResponse = {
  totalEntries: number
  currentStreak?: number
  dailyAverage?: number | null
  thirtyDayAverage?: number | null
  daysSinceLastEntry?: number | null
  goalProgress?: number | null
}

type HydrationCalendarDayResponse = TimelineEvent & {
  entryId: number
  trackerId: number
  amount: number
  unit?: string | null
  note?: string | null
  tagIds?: number[]
  assets?: AssetSummary[]
}
```

## 7. Field Visibility Matrix

| Field | Quick Entry | Edit Entry | DB | Backend Computed | BentoGrid | Entries Tab | Statistics Tab | Graphs Tab | Calendar | Insights/Correlations |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| amount/value | Yes | Yes | Yes | Optional | Yes | Yes | Yes | Yes | Yes | Yes |
| unit | Yes | Yes | Yes | No | Yes | Yes | Yes | Yes | Yes | Optional |
| daily total | No | No | No | Computed | Yes | No | Yes | Yes | Optional | Optional |
| goal progress | No | No | Optional | Computed | Optional | No | Optional | Optional | No | Optional |
| drink/type note | Optional | Optional | Yes | No | No | Yes | No | No | Optional | Future |
| tagIds | Optional | Optional | Yes | Optional | No | Yes | Future | Future | Optional | Future |
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
- [ ] Does backend validate all request fields? Generic storage does not enforce Hydration ranges/units.
- [x] Does backend normalize timestamp/dateStr/defaults?
- [x] Does backend know which tables to write?
- [x] Does backend write related rows transactionally?
- [x] Does backend know which tables to read for each surface?
- [ ] Does backend compute metrics instead of frontend? Daily total/progress are mostly surface/generic computations.
- [x] Does backend map DB rows into shared contracts?
- [x] Does backend handle empty/insufficient data?
- [ ] Does backend return clear errors/warnings? Current path uses null/false/empty fallbacks.
- [x] Does delete/update affect related rows safely?
- [x] Is current implementation status honest?
