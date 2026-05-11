# Backend IPC Contracts

Electron renderer code talks to the main process through `window.api`, exposed by `apps/electron/src/preload/index.ts` and typed by `packages/shared/src/contracts/electron-api.ts`.

## Tracking

- `get-trackers` -> no args -> `Tracker[]`
- `create-tracker` -> tracker data -> `Tracker | null`
- `delete-tracker` -> `id: number` -> `boolean`
- `get-recent-trackers` -> `limit?: number` -> `Tracker[]`
- `get-favorite-trackers` -> no args -> `Tracker[]`
- `toggle-tracker-favorite` -> `trackerId: number` -> `Tracker | null`
- `get-dashboard-stats` -> no args -> `DashboardStats`
- `get-dashboard-layout` -> no args -> `DashboardLayoutItem[] | null`
- `save-dashboard-layout` -> layout array -> `boolean`
- `reorder-trackers` -> `ids: number[]` -> `boolean`
- `update-tracker` -> `id` plus partial updates -> `Tracker | null`
- `calculate-impact` -> source id, target id, offset days -> `EnhancedCorrelationResult`
- `get-stats` -> stats request -> `StatsQueryResponse`
- `get-correlation-result` -> correlation request -> `CorrelationResultResponse`
- `get-mood-daily-aggregates` -> options object -> `{ date: string; value: number; count: number }[]`

## Entries

- `get-entries` -> `options?: { limit?: number; trackerId?: number }` -> `Entry[]`
- `add-entry` -> `BaseEntryRequest` -> `Entry | null`
- `update-entry` -> `id` plus partial updates -> `Entry | null`
- `delete-entry` -> `id: number` -> `boolean`
- `get-task-entries` -> `trackerId` plus optional limit -> `Entry[]`
- Entry create/update supports `tagIds` at the contract boundary, even though full tag UI is still pending.

## Weight

- `add-weight-entry` -> `CreateWeightEntryRequest` -> `WeightEntryResponse | null`
- `update-weight-entry` -> `entryId`, `UpdateWeightEntryRequest` -> `WeightEntryResponse | null`
- `delete-weight-entry` -> `entryId: number` -> `boolean`
- `get-weight-detail` -> `trackerId`, optional `{ limit?: number }` -> `WeightDetailResponse`
- `get-weight-goal` -> `trackerId` -> `{ goal: TrackerGoal | null }`
- `set-weight-goal` -> `SetTrackerGoalRequest` -> `{ goal: TrackerGoal | null }`

## Tags

- `get-tags` -> no args -> `Tag[]`
- `create-tag` -> `{ name, color? }` -> `Tag | null`
- `update-tag` -> `id` plus partial updates -> `Tag | null`
- `delete-tag` -> `id: number` -> `boolean`
- `get-tag-tree` -> no args -> `ResolvedTagTreeResponse`
- `update-tag-relationships` -> relationships -> `ResolvedTagTreeResponse`
- `resolve-tag-inheritance` -> tag IDs -> `ResolveTagInheritanceResponse`

## Reminders

- `get-reminders` -> no args -> `Reminder[]`
- `upsert-reminder` -> reminder insert data plus optional `id` -> `Reminder | null`
- `delete-reminder` -> `id: number` -> `boolean`
- `toggle-reminder` -> `id: number, enabled: boolean` -> `Reminder | null`
- `complete-reminder` -> `id: number` -> `Reminder | null`
- `uncomplete-reminder` -> `id: number` -> `Reminder | null`

## Assets

- `open-file-dialog` -> dialog options -> `{ path: string | null }`
- `upload-asset` -> `sourcePath: string` -> `AssetWithUrls | null`
- `get-assets` -> optional paging options -> `AssetWithUrls[]`
- `update-asset` -> `id` plus partial update -> `Asset | null`
- `delete-asset` -> `id: number` -> `boolean`
- `download-asset` -> `id`, `suggestedName` -> `{ ok: boolean; path?: string; error?: string; canceled?: boolean }`

## Calendar

- `get-calendar-month` -> `year: number, month: number` -> `CalendarMonthData`
- Calendar month data includes enriched Weight fields and `tagIds` when available.

## Contacts

- `get-contacts` -> no args -> `Contact[]`
- `get-contact` -> `id: number` -> `Contact | null`
- `create-contact` -> `ContactInsert` -> `Contact | null`
- `update-contact` -> `id` plus `ContactUpdate` -> `Contact | null`
- `delete-contact` -> `id: number` -> `{ success: boolean }`
- `create-contact-interaction` -> `ContactInteractionInsert` -> `ContactInteraction | null`
- `get-contact-interactions` -> `contactId: number` -> `ContactInteraction[]`

## Exercises

- `search-exercises` -> query and optional limit -> `Exercise[]`
- `get-all-exercises` -> optional limit -> `Exercise[]`
- `get-exercise-db-status` -> no args -> `ExerciseDbSnapshot`

## Web Runtime

`apps/web/server/routes/api.ts` mirrors the same contract family through local `/api/*` routes for the Vite web runtime. It is a local development/runtime adapter, not a separate cloud backend.
