# Weight Contract

## 1. Purpose

Weight is the reference specialized tracker. It defines the full contract flow from Quick Entry/Edit Entry through the specialized backend service, `entries` plus `entry_weight` persistence, computed detail response, BentoGrid, Tracker Detail tabs, Calendar selected-day summaries, and delete behavior.

Body fat is not a required product surface in this contract. If legacy/shared code exposes `bodyFatPercentage`, treat it as optional/future and do not add UI requirements for it in this pass.

## 2. Current Implementation Status

- Status: SPECIALIZED_IMPLEMENTED_WITH_HONEST_GAPS.
- Quick Entry uses the specialized Weight mutation.
- Edit/Delete use Weight-aware mutation/delete paths.
- Persistence writes both generic `entries` data and specialized `entry_weight` data.
- Weight detail uses `WeightDetailResponse` and shared domain calculations.
- Remaining gaps stay explicit: goal editing UI, tag UX polish, selected-day inline asset display, and the undefined threshold for waist statistics.

## 3. Surface Contract / Frontend

### 3.1 Quick Entry / Edit Entry Input

- Quick Entry captures `value` as the current weight.
- Quick Entry sends `unit` as `lbs|kg` at the product level, mapped to shared `lb|kg` where the current code uses the short enum.
- Quick Entry captures optional `waist`.
- Quick Entry captures optional `waistUnit` as `in|cm`, derived by UI when possible but still explicit in the request.
- Quick Entry captures optional `note/context`.
- Quick Entry captures optional `tagIds`.
- Quick Entry captures optional `assetIds`; the current mutation supports one `assetId`, while broader asset-link support remains a shared/future contract.
- Edit Entry can change weight, unit, waist, waistUnit, note/context, timestamp, explicit tags, and the current single asset reference.
- Delete removes the entry from Weight-specific and generic read surfaces; it does not delete the underlying asset file.

### 3.2 BentoGrid / Home Widget Read Model

- Shows current weight and unit.
- Shows delta/trend when available.
- Shows sparkline when available.
- Shows compact goal/trend status if available.
- May show waist only as an optional secondary value.
- Must stay compact and must not overload the widget with every stored field.

### 3.3 Tracker Detail / Entries Tab Read Model

- Shows exact logged weight and unit.
- Shows optional waist and waistUnit when entered.
- Shows note/context, timestamp/date, tag chips from resolved `tagIds`, and an asset indicator/preview when available.
- May show `deltaPrevious` per row when useful; it must not be required for every row.
- Provides edit and delete affordances for each row.

### 3.4 Tracker Detail / Statistics Tab Read Model

- May show total entries, current streak, weekly average, 30-day average, days since last entry, goal progress, total change, deltaPrevious, deltaWeek, and distance to goal.
- May show waist stats only when enough waist data exists.
- The sample threshold for "enough waist data" is NEEDS_CLIENT_CONFIRMATION.

### 3.5 Tracker Detail / Graphs Tab Read Model

- Relevant.
- Uses specialized `chartData` when available.
- Graphs weight over time and can include waist only where waist values exist.
- Graphs must not require body-fat data.

### 3.6 Calendar Selected-Day Summary Read Model

- Receives weight, unit, optional waist, optional waistUnit, note/context, timestamp/dateStr, optional tagIds, and optional asset reference.
- Renders enough information for the user to identify the exact weigh-in.
- Calendar is a compact review surface, not an edit form.

### 3.7 Insights / Correlations Read Model

- Future/optional unless an explicit Insight Lab request selects Weight as a source or target tracker.
- Generic correlation responses may use `entries.value` for weight, but waist/body-fat correlations are not in scope now.

## 4. Deep Contract / Backend-Service

### 1. Backend Entry Point

- Status: IMPLEMENTED specialized backend.
- Electron IPC/API: `add-weight-entry`, `update-weight-entry`, `delete-weight-entry`, `get-weight-detail`, `get-weight-goal`, `set-weight-goal`.
- Web/runtime adapter mirrors these as local `/api/weight/*` style calls where the web runtime is active.
- This is specialized, not generic-entry-only: the service writes `entries` plus `entry_weight`, maps through shared Weight contracts, and uses shared Weight domain helpers for detail/read models.

### 2. Request Validation

- Required create fields: `trackerId`, finite `weight`, `weightUnit`, `timestamp`.
- Optional fields: `waist`, `waistUnit`, `bodyFatPercentage` legacy/future, `note`, `assetId`, `tagIds`.
- Current backend validates finite `weight`, finite optional `waist`, finite optional `bodyFatPercentage`, and finite goal `targetValue`.
- Current shared enum stores `weightUnit` as `kg|lb` and `waistUnit` as `cm|in`; product copy may say `lbs`, but backend persistence preserves `lb`.
- Validation gaps: tracker existence, asset existence, tag existence, waist/unit pairing, positive/nonzero range, goal direction semantics, and body-fat product readiness are not all enforced in the service today.
- Invalid create/update errors are caught by handlers and returned as `null`; delete failures return `false`; detail failures return an empty Weight detail response.

### 3. Normalization

- Backend computes `dateStr` from `timestamp` as local `YYYY-MM-DD`.
- Create stores `entries.value = weight` and duplicates Weight-specific fields into `entry_weight`.
- Create stores `metadata.trackerKind = "weight"` plus current unit/waist/body-fat context for generic fallback surfaces.
- `note` defaults to `null`; `assetId` defaults to `null`; `tagIds` defaults to an empty mapped list when omitted.
- Update only touches fields provided in the partial request; omitted fields keep existing values.
- Sorting is newest-first for history and oldest-to-newest for chart data in the shared domain read model.

### 4. Persistence Plan

Write flow:

1. Insert/update base entry in `entries`.
2. Insert/update specialized Weight row in `entry_weight`.
3. Insert/update junction rows in `entries_to_tags` when `tagIds` is provided.
4. Update related entity state if needed: `set-weight-goal` deactivates older active goals, then inserts the new active goal in `tracker_goals`.
5. Return mapped contract from `mapWeightEntry` / `mapTrackerGoal` and shared domain calculation output.

- Create, update, delete, and set-goal use database transactions.
- Delete explicitly removes `entries_to_tags`, `entry_weight`, then `entries`; asset files are not deleted.
- `entries.asset_id` uses set-null behavior if the asset is removed elsewhere.
- Analytics fields such as weight, unit, waist, and goal values are structural (`entry_weight`, `tracker_goals`), not hidden only in metadata.

### 5. Read / Query Plan

- BentoGrid: calls Weight detail, builds `WeightHomeWidgetReadModel`, reads `entry_weight` joined to `entries`, ordered by timestamp, plus active `tracker_goals`.
- Entries tab: uses Weight detail history via `buildWeightEntriesTabReadModel`; source tables are `entries`, `entry_weight`, and `entries_to_tags`.
- Statistics tab: uses `buildWeightStatisticsReadModel`; source is Weight detail history plus active goal.
- Graphs: uses `WeightDetailResponse.chartData`, ordered ascending, with weight and optional waist.
- Calendar selected-day: `get-calendar-month` reads `entries` left-joined to `entry_weight`, filters by month `dateStr`, orders by timestamp, and includes `tagIds`.
- Edit Entry prefill: receives a mapped Weight history item or calendar/detail entry with weight, unit, waist, waistUnit, note, timestamp, asset, and tags.
- Correlation/Insight: generic correlation can use `entries.value`; waist/body-fat correlations are Future unless a specific shared query model is added.
- Empty state: no history returns `current: null`, `history: []`, `chartData: []`, null deltas/goals, and `streakDays: 0`.

### 6. Computed Metrics

- Implemented/current: `currentWeight`, `deltaPrevious`, `deltaWeek`, `weeklyAvg`, `currentStreak`/`streakDays`, `distanceToGoal`, `goalAchieved`, `chartData`, trend/visual state derived in read models.
- Waist stats are computed on read when there is at least one waist value; the product threshold for "enough" waist data remains NEEDS_CLIENT_CONFIRMATION.
- `thirtyDayAverage`, `daysSinceLastEntry`, and broader visual states should remain documented as desired/available only if the shared read model exposes them; do not claim them implemented unless code adds them.
- Metrics are computed on read from history and active goal; they are not cached or denormalized today.

### 7. Response Mapping

- Flow: `entries` + `entry_weight` DB rows -> `mapWeightEntry` domain object -> `WeightEntryResponse` / `WeightDetailResponse` -> BentoGrid, Entries, Statistics, Graphs, Calendar read models.
- Raw DB rows never cross to renderer surfaces.
- Missing optional values are represented as `null`, empty arrays, or omitted optional properties according to the shared contract.
- Unit display preserves stored `kg|lb` and `cm|in`; frontend may format labels but must not rewrite persisted unit semantics.

### 8. Error Handling

- Invalid request: handler logs and returns `null` for create/update/goal, `false` for delete, or empty detail for read.
- Missing entry after update maps to `null`.
- Missing goal returns `{ goal: null }`.
- Missing tags/assets are not strongly validated today; tag replacement can only map IDs that exist.
- DB failure or migration/schema mismatch is caught at handler boundary and returned as safe fallback.
- Empty dataset is a valid empty Weight detail response, not an error.

### 9. Transaction Rules

- Create/update/delete Weight entry operations are atomic across `entries`, `entry_weight`, and `entries_to_tags`.
- Goal updates are atomic across active-goal deactivation and new `tracker_goals` insert.
- Delete is hard delete for `entries`, `entry_weight`, and tag joins; asset deletion is separate.
- Current status: transaction safety is IMPLEMENTED for the specialized Weight paths.

### 10. Data Ownership Rules

Frontend owns: capture, display, UI state, visual formatting.
Backend owns: validation, normalization, derived metrics, relation resolution, persistence orchestration, response mapping.
Database owns: durable storage, relational integrity, queryable structure.
Shared contracts own: request/response shapes, app-facing types, pure domain helpers when reusable.

### 11. Deep Contract Status

- Status: IMPLEMENTED with honest gaps.
- Implemented: specialized create/update/delete/read detail/goals/units, structural `entry_weight`, tag replacement, active goals, shared Weight read models, calendar enrichment.
- Gaps: stronger range/unit-pair validation, resolved tag labels in all surfaces, multi-asset mutation support, dedicated goal editing UI, waist statistics threshold, body-fat product semantics, and any unimplemented `thirtyDayAverage`/`daysSinceLastEntry` read model claims.

## 5. Persistence and Schema / Database

- `entries.value`: mirrors the weight value for generic stats, graphs, calendar, dashboard, and correlations.
- `entries.note`: note/context.
- `entries.timestamp` and `entries.date_str`: write time and normalized calendar date.
- `entries.asset_id`: current single attachment reference.
- `entry_weight.weight_value`: specialized source of truth for Weight detail.
- `entry_weight.weight_unit`: `kg|lb` in the current shared enum.
- `entry_weight.waist_value`: nullable optional waist.
- `entry_weight.waist_unit`: nullable `cm|in`.
- `entries_to_tags`: explicit entry tags.
- `tracker_goals`: active Weight goal records, read by detail/goal contracts and not created by Quick Entry.

## 6. Input / Output Contracts

```ts
type WeightUnit = "lbs" | "kg" // product surface; current shared type stores "lb" | "kg"
type WaistUnit = "in" | "cm"

type CreateWeightEntryRequest = BaseEntryRequest & {
  trackerId: number
  weight: number
  weightUnit: WeightUnit
  waist?: number | null
  waistUnit?: WaistUnit | null
  note?: string | null
  timestamp: number
  assetId?: number | null
  assetIds?: number[]
  tagIds?: number[]
}

type UpdateWeightEntryRequest = Partial<Omit<CreateWeightEntryRequest, "trackerId">> & {
  tagIds?: number[]
}

type WeightEntryResponse = EntryMutationResponse & {
  entry: BaseEntryResponse["entry"] & {
    weight: number
    weightUnit: WeightUnit
    waist?: number | null
    waistUnit?: WaistUnit | null
    deltaPrevious?: number | null
  }
  tags?: TagSummary[]
  assets?: AssetSummary[]
}

type WeightDetailResponse = {
  current: WeightEntryResponse["entry"] | null
  history: WeightEntryResponse["entry"][]
  totalEntries: number
  currentStreak: number
  daysSinceLastEntry?: number | null
  deltaPrevious: number | null
  deltaWeek: number | null
  weeklyAverage: number | null
  thirtyDayAverage?: number | null
  distanceToGoal: number | null
  goalAchieved: boolean | null
  visualState?: "positive" | "negative" | "neutral"
  chartData: Array<{ date: string; weight: number; waist?: number | null }>
}

type WeightBentoWidgetResponse = {
  trackerId: number
  currentWeight: number | null
  unit: WeightUnit
  deltaPrevious?: number | null
  trend?: "up" | "down" | "neutral"
  sparkline?: Array<{ date: string; value: number }>
  goalStatus?: { distanceToGoal: number | null; goalAchieved: boolean | null }
  secondaryWaist?: { value: number; unit: WaistUnit } | null
}

type WeightEntriesTabResponse = {
  entries: Array<WeightEntryResponse["entry"] & {
    tags?: TagSummary[]
    assets?: AssetSummary[]
  }>
}

type WeightStatisticsResponse = {
  totalEntries: number
  currentStreak: number
  weeklyAverage: number | null
  thirtyDayAverage?: number | null
  daysSinceLastEntry?: number | null
  goalProgress?: { distanceToGoal: number | null; goalAchieved: boolean | null }
  totalChange?: number | null
  waistStats?: { latest: number; unit: WaistUnit; deltaPrevious?: number | null }
}

type WeightCalendarDayResponse = TimelineEvent & {
  entryId: number
  trackerId: number
  weight: number
  unit: WeightUnit
  waist?: number | null
  waistUnit?: WaistUnit | null
  note?: string | null
  tagIds?: number[]
  assets?: AssetSummary[]
}
```

## 7. Field Visibility Matrix

| Field | Quick Entry | Edit Entry | DB | Backend Computed | BentoGrid | Entries Tab | Statistics Tab | Graphs Tab | Calendar | Insights/Correlations |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| weight/value | Yes | Yes | Yes | Yes | Yes | Yes | Yes | Yes | Yes | Yes |
| unit lbs/kg | Yes | Yes | Yes | Yes | Yes | Yes | Yes | Yes | Yes | Optional |
| waist | Optional | Optional | Optional | Optional | Optional | Yes | Optional | Optional | Optional | Future |
| waistUnit in/cm | Optional | Optional | Optional | Optional | Optional | Yes | Optional | Optional | Optional | Future |
| note/context | Optional | Optional | Yes | No | No | Yes | No | No | Optional | Optional |
| tagIds | Optional | Optional | Yes | Optional | No | Yes | Future | Future | Optional | Future |
| assetIds/assetId | Optional | Optional | Yes | Optional | Optional | Yes | No | No | Optional | Future |
| deltaPrevious | No | No | No | Computed | Optional | Optional | Yes | Optional | No | Optional |
| deltaWeek | No | No | No | Computed | Optional | No | Yes | Optional | No | Optional |
| weeklyAverage | No | No | No | Computed | Optional | No | Yes | Yes | No | Optional |
| thirtyDayAverage | No | No | No | Computed | No | No | Optional | Optional | No | Optional |
| currentStreak | No | No | No | Computed | Optional | No | Yes | No | No | Optional |
| daysSinceLastEntry | No | No | No | Computed | No | No | Optional | No | No | Optional |
| distanceToGoal | No | No | Yes | Computed | Optional | No | Optional | Optional | No | Optional |
| goalAchieved | No | No | Yes | Computed | Optional | No | Optional | Optional | No | Optional |
| visualState | No | No | No | Computed | Optional | No | Optional | Optional | No | Optional |
| bodyFatPercentage | No | No | Optional | Optional | No | No | No | No | No | Future |

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
- [ ] Does backend validate all request fields? Current validation is strong for finite numbers but incomplete for existence/ranges/unit pairings.
- [x] Does backend normalize timestamp/dateStr/defaults?
- [x] Does backend know which tables to write?
- [x] Does backend write related rows transactionally?
- [x] Does backend know which tables to read for each surface?
- [x] Does backend compute metrics instead of frontend?
- [x] Does backend map DB rows into shared contracts?
- [x] Does backend handle empty/insufficient data?
- [x] Does backend return clear errors/warnings? Current handlers return safe fallbacks, but typed errors are still a future improvement.
- [x] Does delete/update affect related rows safely?
- [x] Is current implementation status honest?
