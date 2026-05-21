# Savings Contract

## 1. Purpose

Savings tracks numeric finance-like entries currently supported by the app/spec. This contract deliberately avoids inventing ledger, account, balance, transaction, investment, or budgeting features. Unclear finance semantics are marked NEEDS_CLIENT_CONFIRMATION.

## 2. Current Implementation Status

- Status: GENERIC_NUMERIC_IMPLEMENTED.
- Savings is seeded/default and Finance is a create-tracker preset alias.
- Quick Entry captures numeric amount and optional category/item note.
- BentoGrid uses the Counter widget with currency formatting from tracker config.
- Tracker Detail uses finance-oriented generic rendering with optional receipt/photo assets.
- No finance-specific service, ledger table, account table, or transaction schema exists today.

## 3. Surface Contract / Frontend

### 3.1 Quick Entry / Edit Entry Input

- Quick Entry captures numeric amount.
- Quick Entry displays unit/currency from `tracker.config.unit`, commonly `$`.
- Quick Entry captures optional category/item/source note.
- Income/expense direction, account, balance, and category taxonomy are NEEDS_CLIENT_CONFIRMATION and not implemented as fields.
- Edit Entry updates amount, note/category, timestamp, tags, and asset reference.
- Delete uses generic delete behavior.

### 3.2 BentoGrid / Home Widget Read Model

- Shows selected-day or recent numeric value using currency/unit formatting.
- May show generic aggregation based on Counter widget behavior.
- Must not imply running balance/account semantics.

### 3.3 Tracker Detail / Entries Tab Read Model

- Shows amount, unit/currency, category/item note, timestamp, tags, and receipt/photo asset if present.
- Provides edit/delete controls.

### 3.4 Tracker Detail / Statistics Tab Read Model

- May show total entries, current streak, 30-day average, days since last entry, total/average values, and generic chart stats.
- Savings goal support is only tracker config unless a specific goal service exists for this tracker.
- Running balance, budget variance, and account-level stats are Not in scope now.

### 3.5 Tracker Detail / Graphs Tab Read Model

- Relevant.
- Graphs generic numeric values over time.
- Balance/net-worth graphs are Not applicable until balance/account data exists.

### 3.6 Calendar Selected-Day Summary Read Model

- Shows amount, unit/currency, note/category, timestamp, tags, and asset reference.

### 3.7 Insights / Correlations Read Model

- Generic correlations can use Savings values.
- Finance-specific insights are NEEDS_CLIENT_CONFIRMATION and not in scope now.

## 4. Deep Contract / Backend-Service

### 1. Backend Entry Point

- Status: GENERIC_ENTRY_ONLY plus NEEDS_CLIENT_CONFIRMATION for finance semantics.
- Implemented generic IPC/API methods: `add-entry`, `update-entry`, `delete-entry`, `get-entries`, `get-stats`, `get-correlation-result`, `get-calendar-month`.
- There is no Savings-specific service, account endpoint, ledger endpoint, balance endpoint, budget endpoint, or transaction schema today.
- Do not document finance features beyond current/spec-supported generic numeric tracking.

### 2. Request Validation

- Current fields: `trackerId`, numeric `value` amount, `timestamp`, optional category/item/source text in `note`, optional `assetId`, optional `tagIds`.
- Unit/currency comes from `trackers.config.unit`; backend does not enforce currency enum or conversion.
- NEEDS_CLIENT_CONFIRMATION: whether the primary value means saved amount, expense, income, contribution, balance snapshot, or goal progress.
- Current backend does not validate direction, account, balance, category taxonomy, budget, receipt semantics, or finance-specific ranges.
- Invalid generic writes return `null` or `false`.

### 3. Normalization

- Backend computes `dateStr` from `timestamp`.
- `value` is stored as a generic numeric amount and is not normalized into income/expense/balance.
- `note` stores free text category/source; `metadata` defaults to `{}`.
- `assetId` defaults to `null`; tags follow generic replacement semantics.
- Reads sort newest-first; calendar reads by timestamp.

### 4. Persistence Plan

Write flow:

1. Insert/update base entry in `entries`.
2. Insert/update specialized tracker table if needed: none exists for Savings.
3. Insert/update junction rows in `entries_to_tags` when `tagIds` is provided.
4. Update related entity state if needed: none today.
5. Return mapped generic `Entry` contract.

- Generic entry/tag writes are transactional.
- Delete removes `entries` and tag joins; receipt/photo assets are not deleted.
- Finance analytics fields such as direction, account, balance, ledger, or budget must become structural before backend calculations rely on them.

### 5. Read / Query Plan

- BentoGrid: reads selected-day/recent generic numeric value, uses tracker config unit/currency for display, may aggregate according to Counter widget behavior.
- Entries tab: reads entries by tracker newest-first with amount, note/category, timestamp, tags, assets.
- Statistics tab: generic stats can compute total entries, total/average value, active days, 30-day style averages, and days since last entry.
- Graphs: generic numeric value series; balance/net-worth graphs are not applicable without account/balance data.
- Calendar selected-day: month query returns each amount entry with value, note, timestamp, asset, tag IDs.
- Edit Entry prefill: generic entry response with value/note/timestamp/asset/tags.
- Correlation/Insight: generic correlation can use values; finance-specific insights are NEEDS_CLIENT_CONFIRMATION/FUTURE.
- Empty state: no entries returns empty arrays and neutral totals.

### 6. Computed Metrics

- Implemented/generic: total/average generic value, entry count, active days, grouped series, generic correlation caveat.
- Optional goal progress may be displayed from tracker config only; there is no Savings goal service.
- Future/unclear: running balance, budget variance, account-level stats, income/expense split, cashflow, ledger rollups.
- Metrics are computed on read; no finance cache/denormalization exists.

### 7. Response Mapping

- Flow: `entries` DB rows -> `mapEntry` -> shared `Entry` -> Savings/Counter surface response.
- Raw DB rows never return to renderer surfaces.
- Missing note/asset/tags return `null` or `[]`.
- Currency/unit display uses tracker config and frontend formatting; backend does not infer finance meaning.

### 8. Error Handling

- Invalid generic entry/DB failure returns `null` or `false`.
- Missing tracker/entry/tag/asset uses generic null/empty fallback.
- Empty dataset returns empty state.
- Unsupported account/balance/ledger/budget requests should be NEEDS_CLIENT_CONFIRMATION or FUTURE, not invented.

### 9. Transaction Rules

- Generic add/update/delete are transactional for `entries` and `entries_to_tags`.
- No specialized Savings related rows exist today.
- Current status: transaction safety is IMPLEMENTED for generic entry/tag writes.

### 10. Data Ownership Rules

Frontend owns: capture, display, UI state, visual formatting.
Backend owns: validation, normalization, derived metrics, relation resolution, persistence orchestration, response mapping.
Database owns: durable storage, relational integrity, queryable structure.
Shared contracts own: request/response shapes, app-facing types, pure domain helpers when reusable.

### 11. Deep Contract Status

- Status: GENERIC_ENTRY_ONLY and NEEDS_CLIENT_CONFIRMATION.
- Implemented: generic numeric finance-like entries, currency/unit formatting from tracker config, generic stats/calendar/correlation compatibility, assets/tags.
- Gaps: primary value semantics, income/expense direction, account/balance, ledger, budget, category taxonomy, finance-specific insights, and Savings-specific response shape.

## 5. Persistence and Schema / Database

- `trackers.config.unit`: display unit/currency.
- `trackers.config.goal`: optional seeded goal/config value.
- `entries.value`: amount.
- `entries.note`: category/item/source/free text.
- `entries.timestamp` and `entries.date_str`: event date/time.
- `entries.metadata`: generic/empty today.
- `entries.asset_id`: optional receipt/photo.
- `entries_to_tags`: explicit tags.
- No ledger/account/transaction table exists.

## 6. Input / Output Contracts

```ts
type CreateSavingsEntryRequest = BaseEntryRequest & {
  trackerId: number
  value: number
  note?: string | null
  timestamp: number
  assetId?: number | null
  tagIds?: number[]
  metadata?: {
    direction?: Future<"income" | "expense" | "transfer">
    accountId?: Future<string>
    categoryId?: Future<string>
  }
}

type UpdateSavingsEntryRequest = Partial<Omit<CreateSavingsEntryRequest, "trackerId">>

type SavingsEntryResponse = BaseEntryResponse

type SavingsDetailResponse = {
  entries: BaseEntryResponse["entry"][]
}

type SavingsBentoWidgetResponse = {
  trackerId: number
  displayValue: number | null
  unit?: string | null
}

type SavingsEntriesTabResponse = {
  entries: Array<BaseEntryResponse["entry"] & { tags?: TagSummary[]; assets?: AssetSummary[] }>
}

type SavingsStatisticsResponse = {
  totalEntries: number
  totalValue?: number | null
  averageValue?: number | null
  thirtyDayAverage?: number | null
  daysSinceLastEntry?: number | null
  balance?: Future<number>
}

type SavingsCalendarDayResponse = TimelineEvent & {
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
| currency/unit | Yes | Yes | Yes | No | Yes | Yes | Yes | Yes | Yes | Optional |
| category/item note | Optional | Optional | Yes | No | Optional | Yes | Optional | No | Optional | Optional |
| receipt/photo asset | Optional | Optional | Optional | Optional | No | Optional | No | No | Optional | Future |
| goal config | No | No | Optional | Optional | Optional | No | Optional | Optional | No | Optional |
| income/expense direction | Future | Future | Future | Future | Future | Future | Future | Future | Future | Future |
| account/balance | Future | Future | Future | Future | Future | Future | Future | Future | Future | Future |
| tagIds | Optional | Optional | Yes | Optional | No | Yes | Future | Future | Optional | Future |

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
- [ ] Does backend validate all request fields? Finance-specific semantics are not validated.
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
