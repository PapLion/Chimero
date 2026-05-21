# Shared Contracts

This file defines what `packages/shared` owns in Chimero. Shared contracts are the app-facing source of truth between renderer, preload/API adapters, backend handlers, web routes, and tests.

## Ownership

`packages/shared` owns:

- request/response TypeScript shapes,
- app-facing domain types,
- feature-specific contracts,
- deterministic pure domain helpers,
- reusable read-model builders that are safe across layers.

`packages/shared` does not own:

- SQLite persistence,
- Electron IPC registration,
- file-system operations,
- React component state,
- network/server startup,
- non-deterministic side effects,
- product features not implemented or explicitly marked future.

## Source Areas

- `packages/shared/src/contracts/app-types.ts`: app-level types.
- `packages/shared/src/contracts/electron-api.ts`: `window.api`/Electron API surface.
- `packages/shared/src/features/*`: feature-specific shared contracts.
- `packages/shared/src/domain/*`: pure reusable calculations.
- `packages/db/src/types.ts`: DB package boundary re-exports of shared app contracts.

## Naming Conventions

- Requests describe input from frontend/runtime to backend: `BaseEntryRequest`, `CreateWeightEntryRequest`, `SetTrackerGoalRequest`.
- Responses describe backend-safe output: `EntryMutationResponse`, `WeightEntryResponse`, `WeightDetailResponse`, `TrackerGoalResponse`.
- Read models describe surface-oriented data: `WeightHomeWidgetReadModel`, `WeightEntriesTabReadModel`, `WeightStatisticsReadModel`.
- Feature contracts live near the feature when not app-global.
- Domain helpers should be verbs: `calculateWeightDetail`, `buildTagTree`, `resolveInheritedTagIds`.

## Contract Categories

| Category | Purpose | Representative types/helpers | Producers | Consumers | Status/gaps |
| --- | --- | --- | --- | --- | --- |
| Base entry contracts | Generic tracker logging shape. | `Entry`, `BaseEntryRequest`, `EntryInsert`, `BaseEntryResponse` | Quick Entry, entry handlers, web routes | dashboard, tracker detail, calendar, stats | ACTIVE; semantics vary by tracker. |
| Entry mutation contracts | Standard mutation result semantics. | `EntryMutationResponse` | backend/web mutation paths | frontend mutations/toasts | PARTIAL; some current API methods still return `Entry | null` or `boolean`. |
| Tracker contracts | Tracker definitions/config. | `Tracker`, `TrackerConfig`, `TrackerInsert`, tracker schema/UI types | tracking handlers/custom tracker UI | Sidebar, BentoGrid, Quick Entry, custom trackers | ACTIVE; custom trackers remain generic. |
| Weight contracts | Specialized Weight requests/read models. | `CreateWeightEntryRequest`, `UpdateWeightEntryRequest`, `WeightEntry`, `WeightEntryResponse`, `WeightDetailResponse`, `WeightHomeWidgetReadModel`, `WeightEntriesTabReadModel`, `WeightStatisticsReadModel` | Weight backend service/domain | Weight Quick Entry, widget, detail, calendar | ACTIVE specialized with documented gaps. |
| Goal contracts | Tracker goal shape currently used by Weight. | `TrackerGoal`, `SetTrackerGoalRequest`, `TrackerGoalResponse` | Weight goal service | Weight detail/stats/future goal UI | ACTIVE backend; dedicated UI partial. |
| Tag contracts | Explicit tags, trees, inheritance. | `Tag`, `TagRelationship`, `TagTree`, `ResolvedTagTreeResponse`, `ResolveTagInheritanceResponse` | tag handlers/domain | Quick Entry, Edit Entry, Entries, Calendar, future stats | BACKEND ACTIVE / UI PARTIAL. |
| Asset contracts | Asset metadata plus frontend-safe URLs. | `Asset`, `AssetLink`, `AssetWithUrls`, `SaveAssetResult` | asset handlers/service | assets page, entry/contact surfaces | ACTIVE; `AssetLink` broader than current mutation use. |
| Timeline/calendar contracts | Date-grouped event data. | `TimelineEvent`, `CalendarDayEntry`, `WeightCalendarDayEntry`, `CalendarMonthData`, `buildCalendarDayEntry` | calendar backend/domain | Calendar/Timeline surfaces | ACTIVE/PARTIAL; richer selected-day assets/tags remain partial. |
| Stats/correlation contracts | Local analytics and cautious correlation outputs. | `StatsQueryRequest`, `StatsQueryResponse`, `StatsSeriesPoint`, `CorrelationQueryRequest`, `CorrelationResultResponse`, `EnhancedCorrelationResult` | tracking service/hooks | Insight Lab, stats surfaces | ACTIVE/PARTIAL; do not imply causation. |
| Reminder contracts | Reminder records and inserts. | `Reminder`, `ReminderInsert` | reminder handlers/UI | notifications/reminder surfaces | ACTIVE. |
| Contact contracts | CRM and interaction data. | `Contact`, `ContactInsert`, `ContactUpdate`, `ContactInteraction`, `ContactInteractionInsert` | contacts handlers/UI | contacts page/social flows | ACTIVE/PARTIAL; entry linkage partial. |
| Exercise contracts | Exercise search/cache support. | `Exercise`, `ExerciseDbStatus`, `ExerciseDbSnapshot` | exercise service | Quick Entry exercise search | PARTIAL; not a workout persistence contract. |
| Domain helpers | Deterministic reusable calculations. | `calculateWeightDetail`, `buildWeightEntriesTabReadModel`, `buildWeightStatisticsReadModel`, `buildWeightHomeWidgetReadModel`, `computeCurrentStreak`, `computeBestStreak`, `buildTagTree`, `resolveInheritedTagIds` | shared/domain | backend services and frontend read-model consumers | ACTIVE where implemented. |

## How Shared Prevents Drift

Shared contracts prevent drift by giving renderer, preload, backend, web routes, and tests the same app-facing shape names. When a new field crosses a layer boundary, update shared contracts first or alongside backend/frontend changes.

Expected change path for a new implemented tracker field:

```text
Tracker contract file
  -> shared request/response/read model
  -> backend validation/persistence/mapping
  -> frontend surface consumption
  -> tests/verification
```

## What Should Live In Shared

- Types crossing renderer/backend/web boundaries.
- Feature response types consumed by more than one layer.
- Pure deterministic calculations that are safe in backend and frontend.
- Read-model builders that do not access IO or runtime state.

## What Should Not Live In Shared

- Drizzle table definitions.
- SQLite queries.
- Electron IPC handlers.
- React components/hooks with UI state.
- File-system access.
- Runtime notification loops.
- Product ideas with no current implementation.

## Tracker Contracts And Shared Types

Tracker-specific docs under `Documentation/Contracts/Trackers/*.md` describe what each tracker needs. Shared types should only be added when that tracker behavior is implemented or intentionally prepared as an app-facing contract.

Do not make `Shared_Contracts.md` a second `7_Contratcs.md`; this file explains shared package ownership, not the whole contract system.

## Known Shared Gaps

- Some mutation APIs still return simple `Entry | null` or `boolean` instead of a unified mutation response shape.
- Non-Weight tracker read models are mostly generic.
- Tag inheritance types exist, but automatic surface consumption is partial.
- `AssetLink` exists as a shared concept, but current UI/backend often uses single `assetId`.
