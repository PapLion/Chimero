# Exercise Contract

## 1. Purpose

Exercise covers two distinct things: exercise search/database support and workout logging. Current implementation supports exercise search and generic workout entry logging with selected exercise metadata. First-class sets/reps/load/routines/volume contracts are Future unless already implemented.

## 2. Current Implementation Status

- Status: EXERCISE_SEARCH_IMPLEMENTED_AND_WORKOUT_LOGGING_GENERIC.
- Quick Entry requires at least one selected exercise for Exercise/Fitness trackers.
- The selected exercise list is stored in generic `entries.metadata.exercises`.
- BentoGrid has an Exercise widget for selected-day totals/activity names.
- No `entry_exercise`, set, rep, weight, routine, or preset workout table exists today.

## 3. Surface Contract / Frontend

### 3.1 Quick Entry / Edit Entry Input

- Quick Entry uses `ExerciseSearch` and captures selected exercises.
- Quick Entry stores selected exercise count as generic `value`.
- Quick Entry captures optional workout/activity note.
- Sets, reps, load, duration, routines, and presets are CONTRACT_ONLY/FUTURE unless a later implementation adds a schema.
- Edit Entry can update generic value, note, timestamp, tags, and asset. It does not currently provide a structured workout editor for nested exercise metadata.
- Delete uses generic delete behavior.

### 3.2 BentoGrid / Home Widget Read Model

- Shows selected-day total value.
- Shows activity names from notes when available.
- Shows recent chart data from generic entry values.
- Must not claim volume or PR support without structured workout data.

### 3.3 Tracker Detail / Entries Tab Read Model

- Shows workout entries, note/activity name, timestamp, tags, and assets.
- May show selected exercise metadata if a surface renders it, but current contract should not require full nested display.
- Provides edit/delete controls.

### 3.4 Tracker Detail / Statistics Tab Read Model

- May show total entries, current streak, average value, 30-day average, entries this week/year, days since last entry, and generic chart stats.
- Volume, streak by exercise, PRs, set/reps/load summaries, and routine adherence are Future.

### 3.5 Tracker Detail / Graphs Tab Read Model

- Relevant.
- Graphs generic workout value over time.
- Volume/load graphs are Future until first-class exercise entry schema exists.

### 3.6 Calendar Selected-Day Summary Read Model

- Shows workout value/count, note, timestamp, tags, and asset reference.
- Selected exercise names may be shown from metadata only if the UI can safely read them.

### 3.7 Insights / Correlations Read Model

- Generic correlations can use Exercise values.
- Mood/weight/health correlations are Future unless explicitly requested and backed by existing data.

## 4. Deep Contract / Backend-Service

### 1. Backend Entry Point

- Status: PARTIAL.
- Implemented exercise search/database endpoints: `search-exercises`, `get-all-exercises`, `get-exercise-db-status`.
- Implemented workout logging endpoints: generic `add-entry`, `update-entry`, `delete-entry`, `get-entries`.
- Workout logging is GENERIC_ENTRY_ONLY; search is IMPLEMENTED.
- There is no specialized workout logging service, routine endpoint, set/rep/load endpoint, or `entry_exercise` table today.

### 2. Request Validation

- Current workout entry required fields: `trackerId`, numeric `value` or selected-exercise count, `timestamp`.
- Quick Entry requires at least one selected exercise before submit, but backend does not validate `metadata.exercises` as a stable schema.
- Optional fields: workout note/name, `metadata.exercises`, `assetId`, `tagIds`.
- Search validates only query/limit defensively at handler/service level; empty search results are valid.
- Future fields such as sets, reps, load, duration, routines, presets, volume, and PRs are not validated/persisted structurally.

### 3. Normalization

- Backend computes `dateStr` from `timestamp`.
- Generic entry defaults `note`/`assetId` to `null` and metadata to `{}`.
- Exercise selected metadata is stored as renderer-shaped JSON and not normalized to canonical exercise IDs in the entry service.
- Entry reads order newest-first; calendar reads by month and timestamp.
- Search results come from the exercise dataset/cache, not from workout entry persistence.

### 4. Persistence Plan

Write flow:

1. Insert/update base entry in `entries`.
2. Insert/update specialized tracker table if needed: none exists for workout logging.
3. Insert/update junction rows in `entries_to_tags` when `tagIds` is provided.
4. Update related entity state if needed: none today.
5. Return mapped generic `Entry` contract; exercise search returns shared `Exercise` contracts separately.

- Generic entry/tag writes are transactional.
- Delete removes generic entry/tag rows; exercise dataset rows/cache are not affected by workout entry delete.
- Workout analytics fields that require reliable volume/PRs must not stay hidden only in metadata in future implementation.

### 5. Read / Query Plan

- BentoGrid: reads generic exercise entries by tracker/date, uses value/count and note/metadata names where safely available.
- Entries tab: reads generic entries newest-first with note, value, metadata, tags, and assets.
- Statistics tab: generic stats can compute total entries, active days, averages, entries this week/year, and days since last entry from entries.
- Graphs: plots `entries.value`; volume/load graphs are FUTURE.
- Calendar selected-day: month query returns workout entries with value, note, timestamp, asset, tag IDs, and metadata only through generic entry paths.
- Edit Entry prefill: generic entry response does not guarantee a full nested workout editor.
- Correlation/Insight: generic correlations can use workout values; exercise-specific correlations are FUTURE.
- Empty state: no workouts/search matches returns empty arrays and neutral stats.

### 6. Computed Metrics

- Implemented/generic: entry count, selected-day total/count, average value, grouped stats/correlation caveats.
- Search status is returned by the exercise database status endpoint.
- Future: volume, PRs, set/reps/load summaries, routine adherence, per-exercise streaks, duration normalization.
- Metrics are computed on read or in frontend widgets; no workout metric cache/denormalization exists.

### 7. Response Mapping

- Workout flow: `entries` DB rows -> `mapEntry` -> shared `Entry` -> Exercise widget/detail/calendar response.
- Search flow: exercise dataset/cache -> shared `Exercise` response -> Quick Entry search surface.
- Raw DB rows never return to renderer surfaces.
- Missing metadata/tags/assets return `{}`, `[]`, or `null`.

### 8. Error Handling

- Invalid generic entry/DB failure returns `null` or `false`.
- Search failure returns empty arrays or status fallback; empty search result is not an error.
- Missing tracker/entry/tag/asset uses generic fallbacks.
- Unsupported workout schema fields should be marked CONTRACT_ONLY/FUTURE.

### 9. Transaction Rules

- Generic add/update/delete are transactional for `entries` and `entries_to_tags`.
- Exercise search/cache operations are separate from entry transactions.
- Current status: transaction safety is IMPLEMENTED for generic workout entry/tag writes; specialized workout logging is CONTRACT_ONLY/FUTURE.

### 10. Data Ownership Rules

Frontend owns: capture, display, UI state, visual formatting.
Backend owns: validation, normalization, derived metrics, relation resolution, persistence orchestration, response mapping.
Database owns: durable storage, relational integrity, queryable structure.
Shared contracts own: request/response shapes, app-facing types, pure domain helpers when reusable.

### 11. Deep Contract Status

- Status: PARTIAL.
- Implemented: exercise database search/status and generic workout entries.
- Gaps: structured workout schema, backend metadata validation, set/rep/load/routine persistence, volume/PR metrics, and full edit prefill for nested workout data.

## 5. Persistence and Schema / Database

- `trackers`: Exercise/Fitness trackers use numeric/dumbbell-style config.
- `entries.value`: selected exercise count or generic workout value.
- `entries.note`: activity/workout name/context.
- `entries.metadata.exercises`: renderer-shaped selected exercise array.
- `entries.timestamp` and `entries.date_str`: workout time/day.
- `entries.asset_id`: optional attachment.
- `entries_to_tags`: explicit tags.
- Exercise search cache/database is separate from entry persistence.
- No workout-specific table exists today.

## 6. Input / Output Contracts

```ts
type CreateExerciseEntryRequest = BaseEntryRequest & {
  trackerId: number
  value: number
  note?: string | null
  timestamp: number
  assetId?: number | null
  tagIds?: number[]
  metadata: {
    exercises: SelectedExercise[]
    sets?: Future<Array<{ exerciseId?: string; reps?: number; weight?: number }>>
    routineId?: Future<string>
  }
}

type UpdateExerciseEntryRequest = Partial<Omit<CreateExerciseEntryRequest, "trackerId">>

type ExerciseEntryResponse = BaseEntryResponse

type ExerciseDetailResponse = {
  entries: BaseEntryResponse["entry"][]
  searchStatus?: ExerciseDbSnapshot
}

type ExerciseBentoWidgetResponse = {
  trackerId: number
  selectedDateTotal: number
  activities: string[]
  sparkline?: Array<{ date: string; value: number }>
}

type ExerciseEntriesTabResponse = {
  entries: Array<BaseEntryResponse["entry"] & { tags?: TagSummary[]; assets?: AssetSummary[] }>
}

type ExerciseStatisticsResponse = {
  totalEntries: number
  currentStreak?: number
  averageValue?: number | null
  thirtyDayAverage?: number | null
  daysSinceLastEntry?: number | null
  volume?: Future<number>
  personalRecords?: Future<Array<{ exercise: string; value: number }>>
}

type ExerciseCalendarDayResponse = TimelineEvent & {
  entryId: number
  trackerId: number
  value: number
  activityNames?: string[]
  note?: string | null
  tagIds?: number[]
  assets?: AssetSummary[]
}
```

## 7. Field Visibility Matrix

| Field | Quick Entry | Edit Entry | DB | Backend Computed | BentoGrid | Entries Tab | Statistics Tab | Graphs Tab | Calendar | Insights/Correlations |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| exercise search result | Yes | No | No | No | No | Optional | No | No | No | No |
| selected exercises metadata | Yes | Optional | Yes | No | Optional | Optional | Future | Future | Optional | Future |
| workout value/count | Yes | Yes | Yes | Optional | Yes | Yes | Yes | Yes | Yes | Yes |
| workout note/name | Optional | Optional | Yes | No | Optional | Yes | Optional | No | Optional | Optional |
| sets/reps/weight | Future | Future | Future | Future | Future | Future | Future | Future | Future | Future |
| routines/presets | Future | Future | Future | Future | Future | Future | Future | Future | Future | Future |
| volume/PRs | No | No | No | Future | Future | Future | Future | Future | Future | Future |
| tagIds | Optional | Optional | Yes | Optional | No | Yes | Future | Future | Optional | Future |
| assets | Optional | Optional | Optional | Optional | No | Optional | No | No | Optional | Future |

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
- [ ] Does backend validate all request fields? Search exists, but workout metadata is not schema-validated.
- [x] Does backend normalize timestamp/dateStr/defaults?
- [x] Does backend know which tables to write?
- [x] Does backend write related rows transactionally?
- [x] Does backend know which tables to read for each surface?
- [ ] Does backend compute metrics instead of frontend? Only generic stats/search status exist.
- [x] Does backend map DB rows into shared contracts?
- [x] Does backend handle empty/insufficient data?
- [ ] Does backend return clear errors/warnings? Generic null/false/empty fallback remains.
- [x] Does delete/update affect related rows safely?
- [x] Is current implementation status honest?
