# Chimero Feature Inventory

This inventory reflects the current source tree and contract docs. Filesystem and shared contracts win over older planning notes. Do not mark a feature complete unless the UI, request contract, backend/service path, DB persistence, response/read model, and relevant surfaces all exist.

## Status Vocabulary

- `ACTIVE`: implemented and visible/usable in the current runtime.
- `PARTIAL`: implemented, but some important contract path or surface is incomplete.
- `CONTRACT_ONLY`: documented contract exists, but implementation is not wired.
- `DB_ONLY`: schema exists, but no meaningful UI/service flow uses it yet.
- `UI_ONLY`: UI exists without real backend/persistence support.
- `PLACEHOLDER`: visible or planned shell that should not be treated as working feature.
- `FUTURE`: explicitly not current scope.
- `OBSOLETE`: stale reference; do not build against it.

## User-Facing Features

| Feature | Purpose | Frontend files | Backend files | Shared contracts/domain | DB tables | Status | Tracker contract? | Main gaps |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Dashboard / Home | Default overview of trackers as draggable Bento widgets. | `BentoGrid.tsx`, `WidgetCard.tsx`, `Header.tsx`, `Sidebar.tsx` | `features/tracking/handler.ts`, `features/tracking/service.ts` | `features/dashboard`, `contracts/app-types.ts`, Weight read models where needed | `trackers`, `entries`, `settings`, `assets`, `entry_weight` | ACTIVE | Indirect via tracker files | Some widget logic still uses frontend heuristics for generic trackers. |
| Quick Entry | Main activity/reminder capture flow. | `QuickEntry.tsx`, `entry-config.ts`, `FloatingActionButton.tsx` | `features/entry/handler.ts`, `features/weight`, `features/reminders`, `features/contacts`, `features/tags` | `BaseEntryRequest`, `CreateWeightEntryRequest`, `ReminderInsert`, contact/tag contracts | `entries`, `entry_weight`, `reminders`, `entries_to_tags`, `contacts`, `contact_interactions`, `assets` | ACTIVE/PARTIAL | Yes, per tracker | Weight is specialized; most trackers still use generic entry semantics. Social contact interaction linkage is partial. |
| Tracker Detail | Per-tracker detail with Entries, Statistics, Graphs, Edit/Delete. | `TrackerDetailView.tsx`, `EditEntryDialog.tsx`, `ConfirmDeleteDialog.tsx`, `TagChips.tsx` | `features/entry`, `features/weight`, `features/tags` | Weight read models, `Entry`, `Tag`, `AssetWithUrls` | `entries`, `entry_weight`, `entries_to_tags`, `assets` | ACTIVE/PARTIAL | Yes | Generic stats/graphs are mostly frontend aggregation; non-Weight detail read models are not specialized. |
| Calendar / Timeline | Month and timeline review by date. | `CalendarPage`, `TimelineView` | `features/calendar/service.ts`, `features/calendar/handler.ts` | `features/calendar`, `domain/calendar.ts` | `entries`, `entry_weight`, `entries_to_tags` | ACTIVE/PARTIAL | Yes | Calendar is Weight-enriched, but generic tracker fields, resolved tag labels, reminders/assets, and expanded selected-day details are partial. |
| Insight Lab / Stats | Local stats and correlation/impact exploration. | `features/tracking/page.tsx`, correlation components/hooks | `features/tracking/service.ts`, `features/tracking/handler.ts` | `StatsQueryResponse`, `CorrelationResultResponse`, `features/tracking` | `entries`, `entries_to_tags`, `trackers` | ACTIVE/PARTIAL | Referenced by tracker files only where relevant | Must stay cautious; no causal claims. Tracker-specific insights mostly future. |
| Assets | Local media library and entry/contact attachments. | `AssetsPage`, asset picker in Quick/Edit surfaces | `features/assets/handler.ts`, `features/assets/service.ts`, `main/index.ts` asset protocol | `Asset`, `AssetWithUrls`, `AssetLink` | `assets`, `asset_links`, `entries.assetId`, `contacts.avatarAssetId` | ACTIVE/PARTIAL | Mentioned in tracker files | `asset_links` is broader than current single-asset entry flows. Calendar inline asset rendering remains partial. |
| Custom Trackers | Create/manage custom tracker definitions. | `CustomTrackersPage`, `CreateTrackerDialog` | `features/tracking/handler.ts` | `Tracker`, `TrackerConfig`, `TrackerInsert` | `trackers` | ACTIVE | Generic tracker contracts apply | Custom trackers use generic entry persistence/read behavior. |
| Contacts / Social CRM | Personal CRM plus interaction history. | `ContactProfilePage`, `ContactBubblesGrid`, Social Quick Entry pieces | `features/contacts/handler.ts` | `Contact`, `ContactInsert`, `ContactUpdate`, `ContactInteraction` | `contacts`, `contact_interactions`, `assets`, optionally `entries` | ACTIVE/PARTIAL | `Social.md` | Interaction entry linkage and transaction safety with generic Social entry are partial. |
| Reminders | Local notifications and completion state. | `NotificationsModal`, Quick Entry reminder mode | `features/reminders/handler.ts`, `features/reminders/service.ts` | `Reminder`, `ReminderInsert` | `reminders` | ACTIVE | Not a tracker contract | Reminder/task calendar interactions should not be invented beyond current behavior. |
| Exercises | Search/select exercise records for logging context. | `ExerciseSearch.tsx`, `ExerciseDownloadToast.tsx`, Quick Entry exercise branch | `features/exercises/service.ts`, `features/exercises/handler.ts` | `features/exercises` | exercise cache file, generic `entries.metadata` | PARTIAL | `Exercise.md` | Exercise search exists; structured workout tables, sets/reps/load/routines/PRs are CONTRACT_ONLY/FUTURE. |
| Tags | Explicit entry tags, tag tree, and inheritance support. | `TagChips.tsx`, tag selector in Quick/Edit surfaces | `features/tags/service.ts`, `features/tags/handler.ts`, entry/weight tag writes | `Tag`, `TagRelationship`, tag domain helpers | `tags`, `entries_to_tags`, `tag_relationships` | BACKEND ACTIVE / UI PARTIAL | Cross-cutting in tracker files | Inherited tags are not automatically displayed in every surface. Tag-based stats/widgets are future. |
| Weight | Reference specialized tracker. | Quick Entry Weight branch, Weight widget/detail/calendar paths | `features/weight/service.ts`, `features/weight/handler.ts` | `CreateWeightEntryRequest`, `WeightDetailResponse`, `domain/weight.ts` | `entries`, `entry_weight`, `tracker_goals`, `entries_to_tags`, `assets` | ACTIVE SPECIALIZED WITH HONEST GAPS | `Weight.md` | Goal editing UI, waist stats threshold, calendar asset display, and body fat product scope remain gaps/future. |
| Web runtime | Browser/dev runtime mirror for shared renderer app. | `apps/web/src/main.tsx`, renderer `shared/api.ts` fallback | `apps/web/server/index.ts`, `apps/web/server/routes/api.ts`, `apps/web/server/db.ts` | same shared contracts where mirrored | local web DB under `apps/web/.data` | ACTIVE/PARTIAL | No | Web route parity may lag Electron IPC; do not invent web endpoints. |
| Generic trackers | Default/custom trackers backed by `entries`. | Quick Entry, WidgetCard, TrackerDetailView, Calendar | `features/entry`, `features/tracking`, `features/calendar` | `BaseEntryRequest`, `Entry`, `StatsQueryResponse` | `trackers`, `entries`, `entries_to_tags`, `assets` | ACTIVE/PARTIAL | Yes, per existing tracker file | Field semantics differ per tracker but persistence is generic. |
| Specialized trackers | Trackers with extra structured backend/schema/read models. | Weight surfaces currently | `features/weight` | Weight request/response/read models | `entry_weight`, `tracker_goals` | ACTIVE for Weight only | `Weight.md` | Do not claim other trackers are specialized until schema/service/read models exist. |

## Existing Tracker Contract Files

- `Documentation/Contracts/Trackers/Weight.md`
- `Documentation/Contracts/Trackers/Mood.md`
- `Documentation/Contracts/Trackers/Hydration.md`
- `Documentation/Contracts/Trackers/Diet-Calories.md`
- `Documentation/Contracts/Trackers/Exercise.md`
- `Documentation/Contracts/Trackers/Social.md`
- `Documentation/Contracts/Trackers/Books.md`
- `Documentation/Contracts/Trackers/Gaming.md`
- `Documentation/Contracts/Trackers/Media-TV.md`
- `Documentation/Contracts/Trackers/Tasks.md`
- `Documentation/Contracts/Trackers/Savings.md`

Use these files before implementing tracker-specific behavior. `Weight.md` is the strongest reference pattern.

## Main Source Areas

- Electron main: `chimero-habit-flow/apps/electron/src/main`
- Electron preload: `chimero-habit-flow/apps/electron/src/preload`
- Electron renderer: `chimero-habit-flow/apps/electron/src/renderer/src`
- Web runtime: `chimero-habit-flow/apps/web`
- Shared contracts/domain: `chimero-habit-flow/packages/shared/src`
- Database schema/runtime: `chimero-habit-flow/packages/db/src`
- Shared UI package: `chimero-habit-flow/packages/ui`
- High-level docs: `Documentation/Flow`, `Documentation/Structure`, `Documentation/Contracts`

## Known Gaps

- Non-Weight trackers mostly rely on generic entry persistence and frontend read heuristics.
- Tags UI is partial across Quick Entry, entry editing, calendar, and visible tag chips; backend foundations exist.
- Inherited tag expansion is available as backend/domain logic but is not automatically displayed everywhere.
- Calendar selected-day cards carry Weight fields and tag IDs, but resolved tag labels and inline asset presentation remain partial.
- Dedicated Weight goal editing UI remains pending even though backend/web goal contracts exist.
- Exercise workout logging is generic metadata; structured workout schema is not implemented.
- Diet/Food, Books, Gaming, Media/TV, Tasks, and Savings have tracker contracts but no specialized table/service.
- Social CRM exists, but Social tracker entries and contact interactions are only partially linked.

## Obsolete Or Out-Of-Scope References To Avoid

- Auth/login/register runtime flows: not present in current app behavior.
- Old `ipc-handlers.ts` monolith or `main/services/*`: not present in current source tree.
- Old docs that say Insight Lab is obsolete: contradicted by the mounted `stats` page.
- Enterprise billing, legal data agreements, cloud governance, external analytics, and enterprise SLA theory.
- Directory trees that include `.codex`, `node_modules`, build output, generated `.data`, or screenshots as repo documentation.

## Developer Reading Order

Before implementing a tracker, read:

1. `Documentation/Flow/App_Flow.md`
2. `Documentation/Flow/Contracts_Flow.md`
3. `Documentation/Structure/Directory_Tree.md`
4. `Documentation/7_Contratcs.md`
5. The specific file under `Documentation/Contracts/Trackers/`
6. `Documentation/Contracts/Backend_IPC_Contracts.md`
7. `Documentation/Contracts/Database_Contracts.md`
8. `packages/shared/src/contracts/*`
9. `packages/db/src/schema.ts`
10. Existing implementation for the closest tracker, usually Weight for specialized tracker work.
