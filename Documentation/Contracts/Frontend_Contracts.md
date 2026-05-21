# Frontend Contracts

This file defines what the Chimero frontend owns. It does not define DB tables, IPC handler internals, or tracker-specific fields; those live in the database/backend/tracker contract files.

## Responsibility Boundary

Frontend owns:

- capturing user input,
- displaying returned data,
- local UI state,
- visual formatting,
- loading/empty/error states,
- React Query cache invalidation after mutations,
- choosing the right shared request/response contract for a surface.

Frontend must not own:

- SQLite access,
- raw DB row interpretation,
- durable validation,
- persistence orchestration,
- transaction safety,
- tag inheritance as source of truth,
- Weight streaks/deltas/goal progress as source of truth,
- tracker-specific computed metrics when a backend/shared read model exists.

Rule: frontend should render meaning. Backend/shared domain should compute meaning.

## Runtime Boundary

- Electron renderer calls `window.api`, exposed by `apps/electron/src/preload/index.ts`.
- `window.api` is typed by `packages/shared/src/contracts/electron-api.ts`.
- Browser/web runtime uses `apps/electron/src/renderer/src/shared/api.ts`, which falls back to local `/api/*` routes when `window.api` is unavailable.
- Renderer code should depend on shared contracts and query hooks, not DB tables.

Key files:

- `apps/electron/src/renderer/src/App.tsx`
- `apps/electron/src/renderer/src/shared/api.ts`
- `apps/electron/src/renderer/src/shared/queries.ts`
- `apps/electron/src/renderer/src/shared/store.ts`
- `packages/shared/src/contracts/*`
- `packages/shared/src/features/*`
- `packages/shared/src/domain/*`

## Shared Contracts And Read Models

Frontend surfaces consume:

- app-level types such as `Tracker`, `Entry`, `Reminder`, `Asset`, `Tag`, `Contact`,
- runtime API types from `ElectronApi`,
- read models such as Weight detail/history/statistics/widget models,
- feature models such as `CalendarMonthData`, `DashboardStats`, `AssetWithUrls`, and correlation responses.

If a surface needs data that is not in a shared response/read model, the fix is usually to update the shared contract and backend mapping, not to infer from raw DB shape in the UI.

## Surface Contracts

| Surface | Purpose | Consumes | Expected contract/read model | Should not calculate | Empty state / gaps |
| --- | --- | --- | --- | --- | --- |
| Quick Entry | Main capture surface for activities and reminders. | Trackers, recent/favorite trackers, quick-entry context, tags, assets, contacts, exercise search. | `BaseEntryRequest`, `CreateWeightEntryRequest`, `ReminderInsert`, contact/tag requests. | Durable validation, tag inheritance, specialized metrics. | Empty tracker list should show no selectable tracker; non-Weight trackers mostly submit generic entries. |
| Edit Entry | Modify an existing logged entry. | Existing `Entry`, Weight history mapped for editing, tags, assets. | Generic `updateEntry` request or `UpdateWeightEntryRequest`. | Reconstructing hidden specialized DB fields from UI guesses. | Fields not captured by the original contract cannot be safely edited unless the tracker file says so. |
| BentoGrid / Home | Compact dashboard summary. | Trackers, entries, assets, dashboard layout, selected date, Weight detail when relevant. | `DashboardLayoutItem`, `DashboardStats`, generic `Entry[]`, Weight widget read model. | Weight deltas/streaks/goal progress; backend/shared read models should provide them. | Generic widgets may use simple frontend aggregation; do not treat that as specialized backend support. |
| Tracker Detail / Entries tab | Show exact logged history and edit/delete affordances. | Entries, tags, assets, Weight entries read model. | `Entry[]`, `WeightEntriesTabReadModel`, tag/asset summaries. | Inventing fields not returned by backend. | If Quick Entry captured a field, Entries must show it or the tracker contract must mark it hidden with reason. |
| Tracker Detail / Statistics tab | Show aggregates and progress. | Generic entries or specialized read models. | Generic stats conventions or `WeightStatisticsReadModel`. | Domain metrics already owned by backend/shared domain. | Non-Weight statistics are mostly generic and should not be overclaimed. |
| Tracker Detail / Graphs tab | Visualize trend/history. | Chart-ready values from entries or Weight chart data. | Generic entry-derived series or specialized tracker chart data. | Querying DB or inventing unavailable axes. | Graphs should show empty/insufficient-data state when series is empty. |
| Calendar selected-day summary | Show entries grouped by date. | `CalendarMonthData`, entries by `dateStr`, Weight-enriched day entries. | `CalendarDayEntry`, `WeightCalendarDayEntry`. | Date grouping source of truth if backend already sends `dateStr`. | Resolved tag labels and inline assets are partial; do not assume every field is expanded. |
| Insight Lab / correlations | Explore local relationships between trackers. | Trackers, stats/correlation responses. | `StatsQueryResponse`, `CorrelationResultResponse`, `EnhancedCorrelationResult`. | Causation, hidden statistical rules, sample quality beyond returned caveats. | Must be cautious when sample size/confidence is low. |
| Assets page | Manage local media library. | Assets and generated asset URLs. | `Asset`, `AssetWithUrls`, asset mutation responses. | File-system persistence or URL protocol resolution. | Empty library should render no-assets state. |
| Contacts / Social CRM | Manage contacts and social interaction history. | Contacts, contact interactions, assets. | `Contact`, `ContactInsert`, `ContactUpdate`, `ContactInteraction`. | Contact interaction transaction semantics. | Social tracker entry linkage remains partial. |
| Reminders | Create/show/complete reminders. | Reminders and completion mutations. | `Reminder`, `ReminderInsert`. | Main-process reminder scheduling loop. | Empty reminder list should show no pending notifications. |
| Custom Trackers | Create/manage tracker definitions. | Trackers and tracker config. | `Tracker`, `TrackerInsert`, `TrackerConfig`. | Adding specialized persistence just because a tracker exists. | Custom trackers are generic unless a future contract says otherwise. |

## Query Invalidation Contract

Frontend mutations must invalidate every surface affected by the changed data. Current shared query hooks invalidate groups such as:

- entries,
- recent/favorite trackers,
- dashboard stats/layout,
- calendar month,
- mood aggregates,
- task entries,
- Weight detail/goal,
- tags/tag tree/quick-entry context,
- assets,
- reminders,
- contacts/contact interactions.

If a new mutation affects Calendar, BentoGrid, Tracker Detail, or Insight Lab, add cache invalidation for those query roots.

## Known Frontend Gaps

- Generic widgets and generic tracker detail still use frontend aggregation for several non-Weight trackers.
- Tag inheritance is not automatically displayed across every surface.
- Calendar selected-day assets and resolved tag labels are partial.
- Weight goal editing UI is not fully represented even though backend goal contracts exist.
- Exercise search is implemented, but structured workout logging is not.

## Out Of Scope

Do not add or document frontend support for auth/login, enterprise billing, cloud governance, external analytics, or new tracker product behavior unless the product/runtime scope changes.
