# Gaming Contract

## 1. Purpose

Gaming tracks game sessions with game played, estimated duration/value, optional win/loss only for games where the user records it, mood-correlation intent as future/generic insight support, per-game breakdowns, and calendar day summaries.

## 2. Current Implementation Status

- Status: GENERIC_MEDIA_STYLE_IMPLEMENTED.
- Gaming is seeded/default and also available as a preset.
- Quick Entry is text-first with optional numeric secondary value.
- BentoGrid uses the Media widget for game-like trackers.
- No game catalog, session table, platform field, win/loss field, or playtime validator exists today.

## 3. Surface Contract / Frontend

### 3.1 Quick Entry / Edit Entry Input

- Quick Entry captures game name in note/text.
- Quick Entry may capture estimated duration/hours/rating as generic `value` or note text.
- Optional win/loss is Future unless stored by user convention in note/tags.
- Edit Entry updates generic note/game name, value/duration, timestamp, tags, and asset reference.
- Delete uses generic delete behavior.

### 3.2 BentoGrid / Home Widget Read Model

- Shows recent games from notes.
- Shows screenshot/asset if attached.
- Shows generic value when present.

### 3.3 Tracker Detail / Entries Tab Read Model

- Shows game/session entries with note/game name, optional value, timestamp, tags, assets, edit, and delete.
- Does not require platform, win/loss, or structured game identity.

### 3.4 Tracker Detail / Statistics Tab Read Model

- May show total entries, entries this week/year, days since last game, generic average value, and per-game counts if title parsing is reliable.
- Per-game breakdowns are Future unless a stable game identity field exists.

### 3.5 Tracker Detail / Graphs Tab Read Model

- Relevant for generic frequency/value over time.
- Playtime graphs are only valid if duration is consistently captured as numeric value.

### 3.6 Calendar Selected-Day Summary Read Model

- Shows selected-day game/session title, optional duration/value, timestamp, tags, and asset reference.

### 3.7 Insights / Correlations Read Model

- Generic correlations can use Gaming values/counts by tracker ID.
- Mood correlation intent is Future unless explicitly requested through Insight Lab and represented by comparable data.

## 4. Deep Contract / Backend-Service

### 1. Backend Entry Point

- Status: GENERIC_ENTRY_ONLY.
- Implemented generic IPC/API methods: `add-entry`, `update-entry`, `delete-entry`, `get-entries`, `get-stats`, `get-correlation-result`, `get-calendar-month`.
- There is no Gaming-specific service, game catalog endpoint, session endpoint, win/loss endpoint, or playtime validator today.
- Per-game breakdowns and timeline enhancements are FUTURE unless a stable game identity field is added.

### 2. Request Validation

- Current fields: `trackerId`, game/session title in `note`, optional duration/rating in `value`, `timestamp`, optional `assetId`, optional `tagIds`.
- Current backend does not require non-empty title, validate duration units, validate win/loss enums, enforce platform/game identity, or check per-game catalog references.
- Mood correlation intent is not a request field; it remains generic Insight Lab selection.
- Invalid generic writes return `null` or `false`.

### 3. Normalization

- Backend computes `dateStr` from `timestamp`.
- `note` stores free text game/session identity; `value` stays a generic number.
- `metadata` defaults to `{}`; future game IDs/results should not be treated as reliable while ad hoc metadata.
- `assetId` defaults to `null`; tags follow generic replacement semantics.
- Reads sort newest-first; calendar sorts by timestamp.

### 4. Persistence Plan

Write flow:

1. Insert/update base entry in `entries`.
2. Insert/update specialized tracker table if needed: none exists for Gaming.
3. Insert/update junction rows in `entries_to_tags` when `tagIds` is provided.
4. Update related entity state if needed: none today.
5. Return mapped generic `Entry` contract.

- Generic entry/tag writes are transactional.
- Delete removes the entry/tag joins; screenshots/assets are not deleted.
- Analytics fields such as game identity, duration, and result should become structural before backend per-game stats depend on them.

### 5. Read / Query Plan

- BentoGrid: reads recent generic entries and renders note/title, optional value, optional asset.
- Entries tab: reads entries by tracker newest-first with title/note, value, timestamp, tags, assets.
- Statistics tab: generic stats can compute total entries, active days, items this week/year, average value, and days since last entry.
- Graphs: generic frequency/value over time; playtime graphs are valid only if value consistently means duration.
- Calendar selected-day: month query returns each session with note/title, value, asset, tags.
- Edit Entry prefill: generic entry response with note/value/timestamp/asset/tags.
- Correlation/Insight: generic correlation can use count/value; mood correlation is FUTURE unless explicitly run through generic Insight Lab with sufficient data.
- Empty state: no sessions returns empty arrays/neutral metrics.

### 6. Computed Metrics

- Implemented/generic: entry count, active days, generic series, average value, generic correlation confidence/caveat.
- Future: per-game breakdown, total playtime by game, win/loss rate, platform stats, timeline-specific session model.
- Metrics are computed on read, not cached/denormalized.

### 7. Response Mapping

- Flow: `entries` DB rows -> `mapEntry` -> shared `Entry` -> Gaming media-style surface response.
- Raw DB rows never return to renderer surfaces.
- Missing title/value/result/asset/tags return `null` or `[]`.
- Duration and game title display remains frontend-owned until a shared Gaming contract exists.

### 8. Error Handling

- Invalid generic entry/DB failure returns `null` or `false`.
- Missing tracker/entry/tag/asset uses generic null/empty fallback.
- Empty dataset returns empty state.
- Unsupported game identity/win-loss/per-game stats should be marked Future, not inferred as implemented.

### 9. Transaction Rules

- Generic add/update/delete are transactional for `entries` and `entries_to_tags`.
- No specialized Gaming related rows exist today.
- Current status: transaction safety is IMPLEMENTED for generic entry/tag writes.

### 10. Data Ownership Rules

Frontend owns: capture, display, UI state, visual formatting.
Backend owns: validation, normalization, derived metrics, relation resolution, persistence orchestration, response mapping.
Database owns: durable storage, relational integrity, queryable structure.
Shared contracts own: request/response shapes, app-facing types, pure domain helpers when reusable.

### 11. Deep Contract Status

- Status: GENERIC_ENTRY_ONLY.
- Implemented: generic game session entries, media-style widget/detail/calendar, assets/tags, generic stats/correlation compatibility.
- Gaps: game entity/catalog, structured session duration, win/loss, per-game breakdown, mood-correlation-specific backend model, timeline-specific session support.

## 5. Persistence and Schema / Database

- `trackers`: Gaming uses text/gamepad-style config.
- `entries.note`: game/session/progress text.
- `entries.value`: optional generic value such as hours/rating.
- `entries.timestamp` and `entries.date_str`: session event time/day.
- `entries.metadata`: generic/empty today.
- `entries.asset_id`: optional screenshot/photo.
- `entries_to_tags`: explicit tags.

## 6. Input / Output Contracts

```ts
type CreateGamingEntryRequest = BaseEntryRequest & {
  trackerId: number
  note: string | null
  value?: number | null
  timestamp: number
  assetId?: number | null
  tagIds?: number[]
  metadata?: {
    gameId?: Future<string>
    gameTitle?: Future<string>
    durationMinutes?: Future<number>
    result?: Future<"win" | "loss" | "draw" | "not_applicable">
  }
}

type UpdateGamingEntryRequest = Partial<Omit<CreateGamingEntryRequest, "trackerId">>

type GamingEntryResponse = BaseEntryResponse

type GamingDetailResponse = {
  entries: BaseEntryResponse["entry"][]
}

type GamingBentoWidgetResponse = {
  trackerId: number
  recentItems: Array<{ entryId: number; title: string; value?: number | null; asset?: AssetSummary | null }>
}

type GamingEntriesTabResponse = {
  entries: Array<BaseEntryResponse["entry"] & { tags?: TagSummary[]; assets?: AssetSummary[] }>
}

type GamingStatisticsResponse = {
  totalEntries: number
  itemsThisWeek?: number
  itemsThisYear?: number
  daysSinceLastEntry?: number | null
  perGameBreakdown?: Future<Array<{ game: string; count: number; duration?: number }>>
}

type GamingCalendarDayResponse = TimelineEvent & {
  entryId: number
  trackerId: number
  game?: string | null
  value?: number | null
  tagIds?: number[]
  assets?: AssetSummary[]
}
```

## 7. Field Visibility Matrix

| Field | Quick Entry | Edit Entry | DB | Backend Computed | BentoGrid | Entries Tab | Statistics Tab | Graphs Tab | Calendar | Insights/Correlations |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| game played/title | Yes | Yes | Yes | No | Yes | Yes | Optional | No | Yes | Optional |
| estimated duration/value | Optional | Optional | Optional | Optional | Optional | Optional | Optional | Optional | Optional | Optional |
| win/loss | Future | Future | Future | Future | Future | Future | Future | Future | Future | Future |
| platform/game identity | Future | Future | Future | Future | Future | Future | Future | Future | Future | Future |
| per-game breakdown | No | No | No | Future | Future | No | Future | Future | Future | Future |
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
- [ ] Does backend validate all request fields? Game/session-specific fields are not validated.
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
