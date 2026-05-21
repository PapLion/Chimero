# Diet / Calories Contract

## 1. Purpose

Diet tracks food/diet entries. Current file name is Diet-Calories, but product intent includes broader Food/Diet tracking. The contract must not reduce the tracker to calories only where surfaces already ask for meal/item, quantity/unit, food tags, inherited tags, and last-time/count style support.

## 2. Current Implementation Status

- Status: GENERIC_IMPLEMENTED_WITH_BROADER_PRODUCT_INTENT.
- Default/preset names differ between `Diet`, `Diet / Calories`, and broader food-like detection.
- Quick Entry currently captures numeric calories/value plus meal/category note.
- Tracker Detail has diet-specific rendering branches for meal-like entries and assets.
- No dedicated food item, macro, meal, or nutrition table exists.

## 3. Surface Contract / Frontend

### 3.1 Quick Entry / Edit Entry Input

- Quick Entry captures numeric calories/value today.
- Quick Entry captures optional meal/item name in note/context.
- Quantity/unit and macros are Future unless a product/code path explicitly adds them.
- Food tags are explicit `tagIds`; inherited tags are not silently persisted.
- Edit Entry can update value, note/meal, timestamp, tags, and asset reference.
- Delete uses generic delete behavior.

### 3.2 BentoGrid / Home Widget Read Model

- Shows selected-day total calories/value.
- Shows unit from tracker config, commonly `kcal`.
- Shows goal progress when `tracker.config.goal` exists.
- Must not imply macro tracking unless that data is present.

### 3.3 Tracker Detail / Entries Tab Read Model

- Shows meal/item note, calories/value, timestamp, tags, and meal photo/asset when present.
- Uses diet-oriented entry layout, but data remains generic.
- Provides edit/delete controls.

### 3.4 Tracker Detail / Statistics Tab Read Model

- May show total entries, meals this week/year, daily average, 30-day average, days since last meal, goal progress, and generic high/low values.
- Last-time/count queries for remembered foods are Future stats support until food identity exists structurally.

### 3.5 Tracker Detail / Graphs Tab Read Model

- Relevant.
- Graphs generic numeric values over time, typically calories/day.
- Macro graphs are Not applicable until macros are persisted.

### 3.6 Calendar Selected-Day Summary Read Model

- Shows calories/value, unit, meal/item note, timestamp, tags, and asset reference.
- Multiple meals on the same day should remain visible or be explicitly summarized.

### 3.7 Insights / Correlations Read Model

- Correlations with mood, health, or weight are Future unless requested through existing generic Insight Lab contracts.
- Food tag inherited rollups are Future and must remain opt-in.

## 4. Deep Contract / Backend-Service

### 1. Backend Entry Point

- Status: GENERIC_ENTRY_ONLY with CONTRACT_ONLY broader Food/Diet intent.
- Implemented generic IPC/API methods: `add-entry`, `update-entry`, `delete-entry`, `get-entries`, `get-stats`, `get-correlation-result`, `get-calendar-month`.
- There is no specialized Diet/Food service, food item endpoint, meal endpoint, macro endpoint, or nutrition table today.
- The file name remains `Diet-Calories.md`, but the contract should not claim full Food/Diet backend support until structural data exists.

### 2. Request Validation

- Required current fields: `trackerId`, numeric `value` for calories/amount, `timestamp`.
- Optional current fields: meal/item text in `note`, `assetId`, `tagIds`, generic metadata.
- Future/contract-only fields: food identity, quantity/unit, macros, ingredients, inherited food tags, last-time/count food stats.
- Current generic backend does not enforce calorie ranges, quantity units, macro totals, food tag existence beyond generic joins, tracker type, asset existence, or meal composition.
- Invalid request/DB failure returns `null` or `false`; reads return empty states.

### 3. Normalization

- Backend computes `dateStr` from `timestamp`.
- `note` defaults to `null` and is currently the only durable meal/item identity.
- `metadata` defaults to `{}`; food analytics fields must not be considered reliable if only stored ad hoc in metadata.
- `assetId` defaults to `null`; `tagIds` replacement follows generic handler semantics.
- Daily totals/grouping use `dateStr`; individual meal timestamps stay exact.

### 4. Persistence Plan

Write flow:

1. Insert/update base entry in `entries`.
2. Insert/update specialized tracker table if needed: none exists for Diet/Food.
3. Insert/update junction rows in `entries_to_tags` when `tagIds` is provided.
4. Update related entity state if needed: none today.
5. Return mapped `Entry` contract with tag IDs when available.

- Generic entry/tag writes are transactional.
- Delete removes `entries` and tag joins; attached asset files remain in the asset library.
- Calories/value are structural in `entries.value`; meal/item identity is free text in `entries.note`; macros/quantity should become structural before analytics depend on them.

### 5. Read / Query Plan

- BentoGrid: filters generic entries by tracker/date, sums numeric `value`, reads unit/goal from tracker config, and computes progress if configured.
- Entries tab: reads entries by tracker newest-first, renders diet-oriented note/value/assets/tags.
- Statistics tab: generic stats can compute total entries, series, active days, average values, meals this week/year by entry count.
- Graphs: plots or groups `entries.value`; macro graphs are unsupported.
- Calendar selected-day: month query returns each meal entry with value, note, timestamp, asset, and `tagIds`.
- Edit Entry prefill: generic entry response provides value, note, timestamp, asset, tags.
- Correlation/Insight: generic correlation can use calories/value; mood/weight/ingredient correlations are FUTURE unless requested and structurally represented.
- Empty state: no meals returns empty arrays and zero/null totals.

### 6. Computed Metrics

- Implemented/generic: daily total calories/value, entry counts, active days, generic averages/series, generic correlation caveats.
- Future/contract-only: macros, quantity normalization, food identity last-time/count, ingredient tag rollups, inherited tag aggregation, nutrition validation.
- Minimum data for correlation follows generic correlation logic; insufficient data returns low confidence/caveat.
- Metrics are computed on read, not cached/denormalized.

### 7. Response Mapping

- Flow: `entries` DB rows -> `mapEntry` -> shared `Entry` -> Diet surface read model.
- Raw DB rows never return to renderer surfaces.
- Missing note/asset/tags return `null` or `[]`.
- Unit display uses tracker config (`kcal` where present); backend does not infer or convert food units.

### 8. Error Handling

- Invalid create/update/DB failure returns `null`; delete failure returns `false`.
- Missing tracker/entry/asset/tag is represented by generic null/empty fallback, not a typed Diet error.
- Empty dataset is a valid empty state.
- Unsupported macros/food identity/inherited tag requests should be marked CONTRACT_ONLY/FUTURE, not silently fabricated.

### 9. Transaction Rules

- Generic add/update/delete are transactional for `entries` and `entries_to_tags`.
- There are no specialized Diet/Food related rows today.
- Current status: transaction safety is IMPLEMENTED for generic entry/tag writes.

### 10. Data Ownership Rules

Frontend owns: capture, display, UI state, visual formatting.
Backend owns: validation, normalization, derived metrics, relation resolution, persistence orchestration, response mapping.
Database owns: durable storage, relational integrity, queryable structure.
Shared contracts own: request/response shapes, app-facing types, pure domain helpers when reusable.

### 11. Deep Contract Status

- Status: GENERIC_ENTRY_ONLY for current runtime; CONTRACT_ONLY/FUTURE for broader Food/Diet semantics.
- Implemented: numeric meal/calorie entries, generic tags/assets, calendar/detail/generic stats, generic correlation compatibility.
- Gaps: food item schema, quantity/unit normalization, macros, ingredient/inherited tags, last-time/count food queries, and dedicated Food/Diet backend response shapes.

## 5. Persistence and Schema / Database

- `trackers`: seeded as Diet/Diet Calories, numeric, salad icon, config unit/goal where present.
- `entries.value`: calories/value amount.
- `entries.note`: meal/item/category/free text.
- `entries.timestamp` and `entries.date_str`: meal time and calendar day.
- `entries.metadata`: generic/empty today.
- `entries.asset_id`: optional meal photo/asset.
- `entries_to_tags`: explicit food/context tags.
- No food, meal, macro, nutrition, or tag-inheritance rollup table exists today.

## 6. Input / Output Contracts

```ts
type CreateDietEntryRequest = BaseEntryRequest & {
  trackerId: number
  value: number
  note?: string | null
  timestamp: number
  assetId?: number | null
  tagIds?: number[]
  metadata?: {
    mealType?: string
    quantity?: number
    quantityUnit?: string
    macros?: { protein?: number; carbs?: number; fat?: number }
  }
}

type UpdateDietEntryRequest = Partial<Omit<CreateDietEntryRequest, "trackerId">>

type DietEntryResponse = BaseEntryResponse

type DietDetailResponse = {
  entries: BaseEntryResponse["entry"][]
}

type DietBentoWidgetResponse = {
  trackerId: number
  dailyTotal: number
  unit?: string | null
  goal?: number | null
  progressPercent?: number | null
}

type DietEntriesTabResponse = {
  entries: Array<BaseEntryResponse["entry"] & { tags?: TagSummary[]; assets?: AssetSummary[] }>
}

type DietStatisticsResponse = {
  totalEntries: number
  mealsThisWeek?: number
  mealsThisYear?: number
  dailyAverage?: number | null
  thirtyDayAverage?: number | null
  daysSinceLastEntry?: number | null
  lastTimeByFoodTag?: Future<Record<string, string>>
  countByFoodTag?: Future<Record<string, number>>
}

type DietCalendarDayResponse = TimelineEvent & {
  entryId: number
  trackerId: number
  calories: number
  unit?: string | null
  meal?: string | null
  tagIds?: number[]
  assets?: AssetSummary[]
}
```

## 7. Field Visibility Matrix

| Field | Quick Entry | Edit Entry | DB | Backend Computed | BentoGrid | Entries Tab | Statistics Tab | Graphs Tab | Calendar | Insights/Correlations |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| calories/value | Yes | Yes | Yes | Optional | Yes | Yes | Yes | Yes | Yes | Yes |
| meal/item note | Optional | Optional | Yes | No | Optional | Yes | Optional | No | Optional | Optional |
| quantity/unit | Future | Future | Future | Future | Future | Future | Future | Future | Future | Future |
| macros | Future | Future | Future | Future | Future | Future | Future | Future | Future | Future |
| food tags/tagIds | Optional | Optional | Yes | Optional | No | Yes | Future | Future | Optional | Future |
| inherited tags | No | No | No | Future | No | Future | Future | Future | Future | Future |
| last-time/count food stats | No | No | No | Future | Future | No | Future | Future | No | Future |
| goal progress | No | No | Optional | Computed | Optional | No | Optional | Optional | No | Optional |
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
- [ ] Does backend validate all request fields? Food-specific validation is absent.
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
