# Gaming Contract

## 1. Purpose

Gaming tracks daily game sessions with a structured title, a normalized local grouping key, estimated hours, tags, assets, and selected-day summaries. Wins/losses, platform, mode, catalog identity, and mood correlation by game remain future scope.

## 2. Current Implementation Status

- Status: STRUCTURED_ENTRY_FOUNDATION_IMPLEMENTED.
- Gaming is seeded/default and available as a preset.
- New Gaming entries use `entries` plus the additive `entry_gaming` extension row.
- Legacy generic Gaming entries remain readable, but they are unstructured and excluded from verified structured-hour totals.
- No game catalog, platform field, outcome-capability model, or win/loss schema exists yet.

## 3. Surface Contract / Frontend

### 3.1 Quick Entry / Edit Entry Input

- Quick Entry captures `gameTitle` and `estimatedHours` for structured Gaming entries.
- Edit Entry can update `gameTitle`, `estimatedHours`, timestamp/date, tags, and assets.
- Legacy generic Gaming entries can still be read and edited with generic fallback behavior.
- Wins/losses, platform, mode, rating, and progress are still Future.

### 3.2 BentoGrid / Home Widget Read Model

- Shows the latest structured game title and estimated hours.
- Shows the selected-day structured game title and hours when available.
- Shows an attached asset if present.
- Does not surface fake totals from legacy values.

### 3.3 Tracker Detail / Entries Tab Read Model

- Shows structured game title, estimated hours, timestamp, tags, assets, edit, and delete.
- Shows legacy unstructured history distinctly when present.

### 3.4 Tracker Detail / Statistics Tab Read Model

- Shows structured total hours, structured entry count, legacy entry count, and per-game grouped hours.
- Legacy generic values are excluded from verified structured-hour totals.

### 3.5 Tracker Detail / Graphs Tab Read Model

- Uses structured hours over time only.
- Must not treat legacy values as verified playtime.

### 3.6 Calendar Selected-Day Summary Read Model

- Shows selected-day structured game title, estimated hours, timestamp, tags, and assets.
- Legacy generic entries may still appear, but they must be marked as unstructured.

### 3.7 Insights / Correlations Read Model

- Gaming counts and hours can be consumed later by insights.
- Mood-by-game and losing-by-game correlations are still Future.

## 4. Deep Contract / Backend-Service

### 4.1 Backend Entry Point

- Status: STRUCTURED_GAMING_SERVICE_PRESENT.
- Implemented methods include `add-gaming-entry`, `update-gaming-entry`, `get-gaming-detail`, plus shared entry/calendar reads that expose Gaming rows honestly.
- Structured Gaming writes validate title and hours before persisting the extension row.

### 4.2 Request Validation

- Structured fields: `trackerId`, `gameTitle`, `estimatedHours`, `timestamp`, optional `assetId`, optional `tagIds`.
- The backend requires a non-empty title and a finite non-negative hour value.
- Legacy generic Gaming rows remain readable, but they are not backfilled or reinterpreted as structured hours.

### 4.3 Normalization

- Backend computes `dateStr` from `timestamp`.
- `gameTitle` is trimmed and collapsed for display.
- `gameKey` is a normalized local grouping key derived from the title.
- `estimatedHours` is stored as a validated numeric hour value.

### 4.4 Persistence Plan

Write flow:

1. Insert/update base entry in `entries`.
2. Insert/update structured Gaming row in `entry_gaming`.
3. Insert/update tag joins in `entries_to_tags` when `tagIds` is provided.
4. Return a mapped shared Gaming read model.

- Gaming writes are transactional across base row, extension row, and tags.
- Delete removes the extension row safely along with the base entry.
- Legacy generic Gaming entries are not backfilled into structured rows.

### 4.5 Read / Query Plan

- BentoGrid: latest structured game plus selected-day summary.
- Entries tab: structured title, key, hours, timestamp, tags, assets, edit, delete.
- Statistics tab: structured total hours, entry count, legacy count, per-game hours.
- Graphs: structured hours over time only.
- Calendar selected-day: same-day structured Gaming entries with honest hours.
- Edit Entry prefill: structured title, key, hours, timestamp, asset, tags.

### 4.6 Computed Metrics

- Implemented: structured total hours, structured entry count, legacy count, per-game grouped hours, day series.
- Future: win/loss rate, platform stats, timeline-by-game spans, outcome-aware mood correlations.

### 4.7 Response Mapping

- Flow: `entries` + `entry_gaming` DB rows -> shared Gaming read models -> UI surfaces.
- Raw DB rows never return to renderer surfaces.
- Missing structured data returns a legacy/unstructured read model instead of fabricated hours.

### 4.8 Error Handling

- Invalid structured Gaming entry returns a safe failure/null response through the runtime adapter.
- Empty dataset returns empty state.
- Unsupported win/loss/platform/correlation behavior must remain marked Future.

### 4.9 Transaction Rules

- Gaming add/update/delete are transactional for `entries`, `entry_gaming`, and `entries_to_tags`.
- Current status: transaction safety is implemented for structured Gaming writes.

### 4.10 Data Ownership Rules

- Frontend owns capture and display.
- Backend owns validation, normalization, derived metrics, and response mapping.
- Database owns durable storage and relational integrity.
- Shared contracts own app-facing request/response shapes and pure domain helpers.

### 4.11 Deep Contract Status

- Status: STRUCTURED_GAMING_FOUNDATION.
- Implemented: structured title, normalized key, estimated hours, additive extension table, honest read models, compact widget/detail/calendar support.
- Gaps: outcome-capability model, win/loss, platform, mode, catalog/entity system, mood correlation by game, timeline-by-game surfacing.

## 5. Persistence and Schema / Database

- `entries`: shared base row for timestamp, note, asset, and tags compatibility.
- `entry_gaming`: structured extension row with `game_title`, `game_key`, and `estimated_hours`.
- `entries_to_tags`: explicit tags.
- Legacy generic Gaming entries without `entry_gaming` remain readable but unstructured.

## 6. Input / Output Contracts

```ts
type CreateGamingEntryRequest = {
  trackerId: number
  gameTitle: string
  estimatedHours: number
  timestamp: number
  assetId?: number | null
  tagIds?: number[]
}

type UpdateGamingEntryRequest = {
  gameTitle?: string
  estimatedHours?: number
  timestamp?: number
  assetId?: number | null
  tagIds?: number[]
}

type GamingEntryResponse = {
  entry: GamingEntryReadModel
  tags: Tag[]
}

type GamingDetailResponse = {
  current: GamingEntryReadModel | null
  history: GamingHistoryItem[]
  chartData: Array<{ date: string; value: number; count: number }>
  totalHours: number
  structuredEntryCount: number
  legacyEntryCount: number
  perGameHours: Array<{ gameTitle: string; gameKey: string; hours: number; entryCount: number }>
}

type GamingHomeWidgetReadModel = {
  trackerId: number
  title: string
  currentGameTitle: string | null
  currentEstimatedHours: number | null
  selectedDayGameTitle: string | null
  selectedDayEstimatedHours: number | null
  totalHours: number
  legacyEntryCount: number
  sparkline: Array<{ date: string; value: number }>
}
```

## 7. Field Visibility Matrix

| Field | Quick Entry | Edit Entry | DB | Backend Computed | BentoGrid | Entries Tab | Statistics Tab | Graphs Tab | Calendar | Insights/Correlations |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| game title | Yes | Yes | Yes | No | Yes | Yes | Yes | No | Yes | Optional |
| estimated hours | Yes | Yes | Yes | No | Yes | Yes | Yes | Yes | Yes | Optional |
| win/loss | Future | Future | Future | Future | Future | Future | Future | Future | Future | Future |
| platform/game identity | Future | Future | Future | Future | Future | Future | Future | Future | Future | Future |
| per-game breakdown | No | No | No | Future | Future | No | Yes | Future | Future | Future |
| mood correlation | No | No | No | Future | No | No | Future | Future | No | Future |
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
- [x] Does backend validate all request fields that are now structural?
- [x] Does backend normalize timestamp/dateStr/defaults?
- [x] Does backend know which tables to write?
- [x] Does backend write related rows transactionally?
- [x] Does backend know which tables to read for each surface?
- [x] Does backend compute metrics instead of frontend?
- [x] Does backend map DB rows into shared contracts?
- [x] Does backend handle empty/insufficient data?
- [x] Does backend return clear errors/warnings?
- [x] Does delete/update affect related rows safely?
- [x] Is current implementation status honest?
