# Diet / Calories Contract

## 1. Purpose

Diet is the product identity for structured Food logs. The file name remains `Diet-Calories`, but the shipped contract now treats Food as first-class structured entries with legacy generic Diet rows still readable as unstructured history. The contract must not collapse the tracker back to calories-only semantics.

## 2. Current Implementation Status

- Status: STRUCTURED_FOOD_IMPLEMENTED_WITH_LEGACY_ROWS.
- Default/preset names still differ between `Diet`, `Diet / Calories`, and broader food-like detection, but the active runtime now routes the Diet identity through the Food flow.
- Quick Entry and Edit Entry now capture structured `foodName`, normalized `foodKey`, optional positive calories, optional meal type, tags, and assets.
- Tracker Detail, Home widget, Calendar, and stats surfaces now render structured Food logs and keep legacy generic Diet rows visible as unstructured history.
- Dedicated `entry_food` rows now exist; no catalog, macro, ingredient, or nutrition lookup table exists.

## 3. Surface Contract / Frontend

### 3.1 Quick Entry / Edit Entry Input

- Quick Entry captures structured `foodName`.
- Quick Entry captures optional positive calories and optional meal type.
- Tags are explicit `tagIds`; inherited tags are not silently persisted.
- Edit Entry can update `foodName`, calories, meal type, timestamp, tags, and asset reference for structured Food rows.
- Legacy generic Diet rows remain editable through the generic entry path when they are not structured Food rows.
- Delete uses the Food flow for structured Food rows and generic delete behavior for legacy unstructured rows.

### 3.2 BentoGrid / Home Widget Read Model

- Shows the latest structured food, its calories when present, and the selected-day Food summary.
- Shows total calories from structured Food rows only.
- Shows legacy Diet row count separately.
- Must not imply macro tracking unless that data is present.

### 3.3 Tracker Detail / Entries Tab Read Model

- Shows structured `foodName`, calories, meal type, timestamp, tags, and meal photo/asset when present.
- Keeps legacy generic Diet rows visible as unstructured history.
- Provides edit/delete controls.

### 3.4 Tracker Detail / Statistics Tab Read Model

- Shows structured entry count, legacy entry count, total calories, structured food frequency, tag frequency, and calories over time.
- Days-since-last-entry style summary is still available, but macro or nutrition analytics remain out of scope.

### 3.5 Tracker Detail / Graphs Tab Read Model

- Relevant.
- Graphs generic numeric values over time, typically calories/day.
- Macro graphs are Not applicable until macros are persisted.

### 3.6 Calendar Selected-Day Summary Read Model

- Shows structured `foodName`, calories, meal type, timestamp, tags, and asset reference.
- Legacy generic Diet rows remain visible as unstructured entries.
- Multiple meals on the same day should remain visible or be explicitly summarized.

### 3.7 Insights / Correlations Read Model

- Correlations with mood, health, or weight are Future unless requested through existing generic Insight Lab contracts.
- Food tag inherited rollups are Future and must remain opt-in.

## 4. Deep Contract / Backend-Service

### 1. Backend Entry Point

- Status: STRUCTURED_FOOD_IMPLEMENTED with legacy generic Diet rows still readable.
- Implemented generic IPC/API methods remain available for legacy entries, but structured Food now has dedicated IPC/API methods and dedicated read models.
- Dedicated Food endpoints/service paths now exist for add, update, delete, and detail reads.
- The contract should not claim macro/ingredient/nutrition table support.

### 2. Request Validation

- Required current fields for structured Food: `trackerId`, `foodName`, `timestamp`.
- Optional current fields for structured Food: positive `calories`, `mealType`, `assetId`, `tagIds`.
- Legacy generic Diet entries remain readable and editable as unstructured rows.
- Current backend does not enforce macros, ingredients, inherited food tags, or nutrition lookup data.
- Invalid request/DB failure returns `null` or `false`; reads return empty states.

### 3. Normalization

- Backend computes `dateStr` from `timestamp`.
- Structured Food normalizes `foodName` and `foodKey`; calories must be positive when present.
- Legacy `note` values remain available for unstructured Diet rows.
- `assetId` defaults to `null`; `tagIds` replacement follows generic handler semantics.
- Daily totals/grouping use `dateStr`; individual food timestamps stay exact.

### 4. Persistence Plan

Write flow:

1. Insert/update base entry in `entries`.
2. Insert/update specialized Food row in `entry_food` for structured Food logs.
3. Insert/update junction rows in `entries_to_tags` when `tagIds` is provided.
4. Return mapped `Entry` contract with tag IDs when available.

- Structured Food writes are transactional.
- Delete removes `entries`, tags, and the specialized `entry_food` row.
- Legacy Diet rows remain in `entries` without an `entry_food` record and continue to render as unstructured history.

### 5. Read / Query Plan

- Home widget: reads structured Food history, selected-day meals, total calories, and legacy row count.
- Entries tab: reads entries by tracker newest-first, renders structured Food rows first-class and keeps legacy Diet rows readable.
- Statistics tab: structured stats compute total calories, structured counts, legacy counts, food frequency, tag frequency, and calorie series.
- Graphs: plots structured calorie totals by day; macro graphs remain unsupported.
- Calendar selected-day: month query returns each food entry with `foodName`, calories, meal type, timestamp, asset, and `tagIds`.
- Edit Entry prefill: structured Food entry response provides `foodName`, calories, meal type, timestamp, asset, tags.
- Empty state: no meals returns empty arrays and zero/null totals.

### 6. Computed Metrics

- Implemented: daily total calories, structured entry counts, legacy entry counts, active days, structured food frequency, tag frequency, and calorie series.
- Future/contract-only: macros, quantity normalization, ingredient tag rollups, inherited tag aggregation, nutrition validation, and external Health correlations.
- Metrics are computed on read, not cached/denormalized.

### 7. Response Mapping

- Flow: `entries` DB rows plus `entry_food` rows -> `mapEntry` -> shared `Entry` -> Food surface read model.
- Raw DB rows never return to renderer surfaces.
- Missing food/asset/tags return `null` or `[]`.
- Unit display is no longer inferred from calories alone; structured food uses its dedicated read model.

### 8. Error Handling

- Invalid create/update/DB failure returns `null`; delete failure returns `false`.
- Missing tracker/entry/asset/tag is represented by generic null/empty fallback, not a typed Food error.
- Empty dataset is a valid empty state.
- Unsupported macros/food identity/inherited tag requests should be marked CONTRACT_ONLY/FUTURE, not silently fabricated.

### 9. Transaction Rules

- Structured Food add/update/delete are transactional for `entries`, `entry_food`, and `entries_to_tags`.
- Legacy generic Diet updates remain transactional for `entries` and `entries_to_tags`.
- Current status: transaction safety is IMPLEMENTED for Food and legacy entry/tag writes.

### 10. Data Ownership Rules

Frontend owns: capture, display, UI state, visual formatting.
Backend owns: validation, normalization, derived metrics, relation resolution, persistence orchestration, response mapping.
Database owns: durable storage, relational integrity, queryable structure.
Shared contracts own: request/response shapes, app-facing types, pure domain helpers when reusable.

### 11. Deep Contract Status

- Status: STRUCTURED_FOOD_IMPLEMENTED on the Diet identity with legacy generic rows still readable.
- Implemented: structured food entries, generic tags/assets, calendar/detail/home/stats, and generic legacy compatibility.
- Gaps: food catalogs, quantity/unit normalization, macros, ingredient/inherited tags, last-time/count food queries, and external Health correlations.

## 5. Persistence and Schema / Database

- `trackers`: seeded as Diet/Diet Calories, numeric, salad icon, config unit/goal where present.
- `entry_food`: structured food rows with `food_name`, `food_key`, `calories`, and `meal_type`.
- `entries.value`: legacy calories/value amount for unstructured Diet rows and other generic entries.
- `entries.note`: legacy meal/item/category/free text.
- `entries.timestamp` and `entries.date_str`: meal time and calendar day.
- `entries.metadata`: generic/empty today.
- `entries.asset_id`: optional meal photo/asset.
- `entries_to_tags`: explicit food/context tags.
- No food, meal, macro, nutrition, or tag-inheritance rollup table exists today.

## 6. Legacy Input / Output Contracts

The historical generic shapes below are kept for context. The active structured Food contracts now live in `packages/shared/src/contracts/app-types.ts`.

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
