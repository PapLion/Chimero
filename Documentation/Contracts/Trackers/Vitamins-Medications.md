# Vitamins & Medications Contract

## 1. Purpose

Vitamins & Medications is a combined structured intake tracker. The durable source of truth is the reusable intake item plus linked intake event rows. Legacy generic rows remain readable as unstructured history, but structured analytics must only trust the intake tables and shared intake read models.

## 2. Current Implementation Status

- Status: STRUCTURED_INTAKE_FOUNDATION_WITH_LEGACY_ROWS.
- The active tracker identity is `intake`, surfaced to users as `Vitamins & Medications`.
- Structured intake uses reusable `intake_items` plus linked `entry_intake` rows.
- Intake item identity is normalized through item name, item type, and optional variant.
- Missing dosage and missing unit stay `null`; they are not backfilled from generic rows.
- Legacy generic rows remain readable as unstructured history.
- Deferred or rejected for this contract: adherence, schedules, reminders, missed-dose logic, prescription management, diagnosis/treatment workflows, medical advice, and Health/Mood/Food/Weight correlation UI.

## 3. Surface Contract / Frontend

### 3.1 Quick Entry / Edit Entry Input

- Quick Entry captures item name.
- Quick Entry captures item type: vitamin, medication, supplement, or other.
- Quick Entry captures optional variant/brand/formula.
- Quick Entry captures optional dosage and optional unit.
- Quick Entry captures optional note/context through the base entry.
- Quick Entry captures timestamp/date through the base entry.
- Edit Entry can update item name, type, variant, dosage, unit, timestamp, note/context, tags, and asset reference.
- Multiple intakes per day are allowed.
- Legacy generic intake rows remain editable only as legacy rows when they are not structured intake entries.

### 3.2 Home Widget Read Model

- Must stay compact and honest.
- Shows the latest structured item when available.
- Shows current dosage/unit when available.
- Shows legacy row count separately.
- May show selected-day intake entries and a small sparkline.
- Must not imply adherence, schedule tracking, or medical guidance.

### 3.3 Tracker Detail / Entries Tab Read Model

- Shows structured intake entries first-class.
- Keeps legacy generic rows visible as unstructured history.
- Shows item name, type, variant, dosage, unit, timestamp/date, note/context, tags, and assets when present.
- Provides edit and delete affordances for each row.

### 3.4 Tracker Detail / Statistics Tab Read Model

- Shows intake count.
- Shows days with intakes.
- Shows frequency by item.
- Shows dose summaries only grouped by the same item plus the same unit.
- Must not sum doses across different units.
- Must not infer medical advice from the stats.

### 3.5 Tracker Detail / Graphs Tab Read Model

- Relevant only as a compact count/history view.
- Any graph must reflect actual structured intake history.
- Do not claim adherence or missed-dose analysis.

### 3.6 Calendar Selected-Day Summary Read Model

- Shows all intake entries for the selected day.
- Multiple intake entries on the same day remain visible.
- Legacy generic rows remain visible as unstructured entries.

### 3.7 Insights / Correlations Read Model

- Health, Mood, Food, and Weight correlations are future work unless a separate contract explicitly adds them.
- Do not claim correlations are implemented.

## 4. Deep Contract / Backend-Service

### 1. Backend Entry Point

- Status: IMPLEMENTED structured intake foundation.
- Dedicated Electron IPC/API methods exist for add, update, delete, detail, and home reads.
- The web runtime mirrors the same intake behavior through `/api/intake/*` routes.
- This is specialized, not generic-entry-only: the service writes `entries` plus `entry_intake`, maps through shared intake contracts, and uses shared intake domain helpers for detail/read models.

### 2. Request Validation

- Required create fields: `trackerId`, `itemName`, `timestamp`.
- Optional fields: `itemType`, `variant`, `dosage`, `unit`, `note`, `assetId`, `tagIds`.
- Missing dosage must stay `null`, not `0`.
- Missing unit must stay `null`.
- Validation should reject non-finite timestamps and invalid dosage values.
- Invalid create/update errors are caught by handlers and returned as safe failures.

### 3. Normalization

- Backend computes `dateStr` from `timestamp`.
- Structured intake normalizes item name, variant, and item key.
- `entry_intake.dosage` and `entry_intake.unit` are the source of truth for dosage display.
- Legacy note values remain available for unstructured intake rows.
- `assetId` defaults to `null`; `tagIds` replacement follows generic handler semantics.

### 4. Persistence Plan

Write flow:

1. Insert/update base entry in `entries`.
2. Insert/update reusable item row in `intake_items`.
3. Insert/update linked intake row in `entry_intake`.
4. Insert/update junction rows in `entries_to_tags` when `tagIds` is provided.
5. Return mapped shared intake response with tags.

- Structured intake writes are transactional.
- Delete removes `entries`, tags, and the linked `entry_intake` row.
- Legacy generic rows remain in `entries` without an `entry_intake` record and continue to render as unstructured history.

### 5. Read / Query Plan

- Home widget: reads structured intake history, selected-day entries, current item, dosage, and legacy row count.
- Entries tab: reads entries by tracker newest-first, renders structured intake rows first-class, and keeps legacy rows readable.
- Statistics tab: computes intake count, days with intakes, frequency by item, dose summaries, and a count-based chart series.
- Calendar selected-day: month query returns each intake entry with item name, type, variant, dosage, unit, timestamp, asset, and `tagIds`.
- Edit Entry prefill: structured intake response provides item name, item type, variant, dosage, unit, timestamp, asset, tags, and note/context.
- Empty state: no intakes returns empty arrays and zero/null totals.

### 6. Computed Metrics

- Implemented/current: intake count, days with intakes, item frequency, dose summaries grouped by same item plus same unit, and a simple count-based chart series.
- Future/contract-only: adherence, schedules, reminders, missed-dose logic, prescription management, and external Health/Mood/Food/Weight correlations.
- Metrics are computed on read, not cached or denormalized.

### 7. Response Mapping

- Flow: `entries` DB rows plus `entry_intake` rows -> `mapEntry` -> shared `Entry` -> intake surface read model.
- Raw DB rows never cross to renderer surfaces.
- Missing item/asset/tags return `null` or `[]`.
- Unit display must stay explicit and not infer dosage relationships across different units.

### 8. Error Handling

- Invalid request or DB failure returns `null`; delete failure returns `false`.
- Missing tracker/entry/asset/tag is represented by generic null/empty fallback, not a typed medical error.
- Empty dataset is a valid empty state.
- Unsupported adherence/schedule/reminder/prescription requests should be marked CONTRACT_ONLY/FUTURE, not silently fabricated.

### 9. Transaction Rules

- Structured intake add/update/delete are transactional for `entries`, `intake_items`, `entry_intake`, and `entries_to_tags`.
- Legacy generic entry writes remain transactional for `entries` and `entries_to_tags`.
- Current status: transaction safety is implemented for the structured intake paths.

### 10. Data Ownership Rules

Frontend owns: capture, display, UI state, visual formatting.
Backend owns: validation, normalization, derived metrics, relation resolution, persistence orchestration, response mapping.
Database owns: durable storage, relational integrity, queryable structure.
Shared contracts own: request/response shapes, app-facing types, and pure domain helpers when reusable.

### 11. Deep Contract Status

- Status: STRUCTURED_INTAKE_FOUNDATION_WITH_LEGACY_ROWS.
- Implemented: reusable intake items, linked intake events, detail/home surfaces, calendar support, and honest stats based on structured intake history.
- Gaps: adherence, schedules, reminders, missed-dose logic, prescription management, medical advice, diagnosis/treatment workflows, and correlations.

## 5. Persistence and Schema / Database

- `intake_items`: reusable item definitions keyed by tracker, item name, item type, and optional variant.
- `entry_intake`: structured intake event rows with dosage and unit.
- `entries.value`: remains available for legacy generic rows and other generic trackers.
- `entries.note`: context note for the base entry.
- `entries.timestamp` and `entries.date_str`: intake time and calendar day.
- `entries.asset_id`: optional asset reference.
- `entries_to_tags`: explicit entry tags.
- No adherence, schedule, reminder, or prescription table exists today.

## 6. Input / Output Contracts

```ts
type IntakeItemType = "vitamin" | "medication" | "supplement" | "other"

type CreateIntakeEntryRequest = BaseEntryRequest & {
  trackerId: number
  itemName: string
  itemType?: IntakeItemType
  variant?: string | null
  dosage?: number | null
  unit?: string | null
  note?: string | null
  timestamp: number
  assetId?: number | null
  tagIds?: number[]
}

type UpdateIntakeEntryRequest = Partial<Omit<CreateIntakeEntryRequest, "trackerId">> & {
  tagIds?: number[]
}

type IntakeEntryResponse = {
  entry: {
    entryId: number
    trackerId: number
    itemId: number
    itemName: string
    itemKey: string
    itemType: IntakeItemType
    variant?: string | null
    dosage?: number | null
    unit?: string | null
    note?: string | null
    timestamp: number
    dateStr: string
    assetId?: number | null
    tagIds?: number[]
    structured: true
  }
  tags?: TagSummary[]
}
```

## 7. Notes

- This contract intentionally keeps medical guidance, adherence, and schedule logic out of scope.
- The combined tracker name is `Vitamins & Medications`, but the active tracker identity is the shared `intake` contract.
- Missing dosage and unit must stay `null` throughout the stack.
