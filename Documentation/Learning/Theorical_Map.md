# Chimero Theoretical Map

## 1. Core Product Concepts

| Concept | Meaning in Chimero | Main files | Data | Status |
| --- | --- | --- | --- | --- |
| Trackers | Definitions of what the user tracks. Default trackers and custom trackers live here. | `chimero-habit-flow/apps/electron/src/main/features/tracking/handler.ts`, `chimero-habit-flow/packages/db/src/schema.ts` | `trackers`, `config` | ACTIVE |
| Entries | Logged user data points. Most tracker data starts as an entry. | `chimero-habit-flow/apps/electron/src/main/features/entry/handler.ts`, `chimero-habit-flow/packages/shared/src/contracts/app-types.ts` | `entries`, `metadata`, `value`, `note`, `dateStr` | ACTIVE |
| Quick Entry | Main capture surface for entries and reminders. | `chimero-habit-flow/apps/electron/src/renderer/src/features/entry/components/QuickEntry.tsx`, `chimero-habit-flow/apps/electron/src/renderer/src/features/entry/entry-config.ts` | trackers, tags, assets, contacts, exercises | ACTIVE |
| BentoGrid / Home | Dashboard surface for tracker summaries. | `chimero-habit-flow/apps/electron/src/renderer/src/features/dashboard/components/BentoGrid.tsx`, `chimero-habit-flow/apps/electron/src/renderer/src/features/dashboard/components/WidgetCard.tsx` | trackers, entries, assets, layout | ACTIVE |
| Tracker Detail | Per-tracker history, stats, graphs, edit, and delete. | `chimero-habit-flow/apps/electron/src/renderer/src/features/tracking/components/TrackerDetailView.tsx` | entries, Weight detail, tags, assets | ACTIVE |
| Calendar / Timeline | Date-based entry and reminder view. | `chimero-habit-flow/apps/electron/src/main/features/calendar/service.ts`, `chimero-habit-flow/apps/electron/src/renderer/src/features/calendar/page.tsx` | `entries.dateStr`, Weight enrichment | ACTIVE |
| Stats / Correlations | Generic stats and Insight Lab impact calculations. | `chimero-habit-flow/apps/electron/src/main/features/tracking/service.ts`, `chimero-habit-flow/apps/electron/src/renderer/src/features/tracking/page.tsx` | entries, tracker IDs, date ranges | PARTIAL |
| Tags | Cross-cutting categorization and inheritance. | `chimero-habit-flow/apps/electron/src/main/features/tags/service.ts`, `chimero-habit-flow/packages/shared/src/domain/tags.ts` | `tags`, `entries_to_tags`, `tag_relationships` | BACKEND ACTIVE / UI PARTIAL |
| Assets | Local media library and attachments. | `chimero-habit-flow/apps/electron/src/main/features/assets/handler.ts`, `chimero-habit-flow/apps/electron/src/main/index.ts` | `assets`, `asset_links`, file storage | ACTIVE |
| Contacts / Social CRM | Personal CRM plus interaction history. | `chimero-habit-flow/apps/electron/src/main/features/contacts/handler.ts`, `chimero-habit-flow/apps/electron/src/renderer/src/features/contacts/page.tsx` | `contacts`, `contact_interactions` | PARTIAL |
| Reminders | Local notifications and completion state. | `chimero-habit-flow/apps/electron/src/main/features/reminders/handler.ts`, `chimero-habit-flow/apps/electron/src/renderer/src/features/reminders/modals/NotificationsModal.tsx` | `reminders` | ACTIVE |
| Custom Trackers | User-created tracker definitions. | `chimero-habit-flow/apps/electron/src/renderer/src/features/trackers/modals/CreateTrackerDialog.tsx` | `trackers.isCustom`, `config` | ACTIVE |
| Exercises | Exercise search/cache support, not a full workout schema. | `chimero-habit-flow/apps/electron/src/main/features/exercises/service.ts`, `chimero-habit-flow/apps/electron/src/renderer/src/features/exercises/components/ExerciseSearch.tsx` | exercise cache, entry metadata | PARTIAL |
| Weight | Reference specialized tracker. | `chimero-habit-flow/apps/electron/src/main/features/weight/service.ts`, `chimero-habit-flow/packages/shared/src/domain/weight.ts` | `entries`, `entry_weight`, `tracker_goals` | ACTIVE SPECIALIZED |

## 2. Core Data Flow Concepts

The main Chimero flow is:

```text
Usuario
-> Frontend Input/UI
-> Contract Request
-> Backend/Service
-> Database
-> Backend/Service
-> Contract Response
-> Frontend Rendering/UI
-> Usuario
```

Responsible areas:

- Frontend input/rendering: `App.tsx`, `QuickEntry.tsx`, `BentoGrid.tsx`, `TrackerDetailView.tsx`.
- Contract request/response: `packages/shared/src/contracts/electron-api.ts`, `packages/shared/src/contracts/app-types.ts`.
- Runtime boundary: `apps/electron/src/preload/index.ts`, `apps/electron/src/renderer/src/shared/api.ts`.
- Backend/service: `apps/electron/src/main/features/*`.
- Database: `packages/db/src/schema.ts`, `apps/electron/src/main/database.ts`.
- Response mapping: `apps/electron/src/main/shared/mappers.ts`.

Common failure points:

- Renderer bypasses contracts.
- Raw DB rows leak into frontend.
- `dateStr` and `timestamp` drift.
- Generic `metadata` hides fields that should be queryable.
- Query invalidation misses a surface.
- Documentation says a tracker is specialized when the code still stores generic entries.

## 3. Frontend Surface Concepts

| Surface | Consumes | Needed contracts | Current uncertainty |
| --- | --- | --- | --- |
| Quick Entry | Trackers, quick-entry context, tags, assets, contacts, exercises | Create requests, validation hints, tracker-specific input contracts | Non-Weight trackers mostly still become generic entries. |
| Edit Entry | Existing `Entry` or Weight history mapped back to entry shape | Update requests and edit prefill models | Future specialized tracker fields are not fully represented. |
| BentoGrid / Home | Trackers, entries, assets, dashboard layout, Weight detail where needed | Compact widget read models | Some widgets still compute too much in frontend. |
| Tracker Detail / Entries | Generic entries, tags, assets, Weight detail | Per-tracker entry read models | Generic trackers do not always expose exact field semantics. |
| Tracker Detail / Statistics | Entries or Weight statistics read model | Aggregation responses/read models | Tracker-specific statistics are partial outside Weight. |
| Tracker Detail / Graphs | Entry-derived chart data or Weight chart data | Chart read models | Mostly frontend aggregation except Weight. |
| Calendar selected-day | `CalendarMonthData`, generic entries, Weight enrichment | Calendar day read models | Resolved tag labels and inline assets remain partial. |
| Timeline | Calendar/timeline data | `TimelineEvent` style contracts | Not uniformly backed by all domains. |
| Insight Lab / correlations | Trackers, correlation result contracts | Stats/correlation requests and responses | Active but should stay statistically cautious. |
| Contact Profile | Contacts, interactions, assets | Contact and interaction contracts | CRM active; social tracker linkage partial. |
| Assets | Asset API, `chimero-asset://` URLs | Asset response contracts | Active. |
| Reminders | Reminder API and loop | Reminder request/response contracts | Active. |
| Custom Trackers | Tracker CRUD/config | Tracker config contracts | Active but generic. |

## 4. Backend Concepts

| Responsibility | Status | Where |
| --- | --- | --- |
| Validation | PARTIAL | Weight validates finite numbers; contacts/reminders/tags have basic checks; generic entries are lighter. |
| Normalization | ACTIVE | timestamp to `dateStr`, JSON config/metadata mapping, tag inheritance, asset URLs. |
| Transaction orchestration | PARTIAL | Generic entry and Weight related writes are transactional; some contact interaction updates are less clearly atomic. |
| DB writes/reads | ACTIVE | Feature handlers/services under `apps/electron/src/main/features`. |
| Computed metrics | ACTIVE/PARTIAL | Weight has strongest domain calculations; generic stats/correlation exist; most tracker-specific stats remain generic. |
| Response mapping | ACTIVE | `apps/electron/src/main/shared/mappers.ts`. |
| Reminders loop | ACTIVE | Main process reminder service/handlers. |
| Asset protocol/file handling | ACTIVE | Local files plus `chimero-asset://`. |
| Exercise DB cache | ACTIVE SUPPORT | Search/cache service, not full workout backend. |
| Correlation/stats | PARTIAL | Local calculations, not a deep analytics platform. |
| Tag inheritance | BACKEND ACTIVE / UI PARTIAL | Tags service/domain. |
| Weight-specific logic | ACTIVE | Reference specialized tracker. |

## 5. Database Concepts

| Table | Purpose | Producer | Consumer | Notes |
| --- | --- | --- | --- | --- |
| `settings` | Preferences and dashboard layout. | tracking handlers | dashboard | Generic app state. |
| `trackers` | Tracker definitions. | tracking/custom tracker flows | all tracker surfaces | Core registry. |
| `entries` | Generic logs. | Quick Entry/edit | dashboard/detail/calendar/stats | Main analytics table. |
| `reminders` | Notification records. | Quick Entry/reminder modal | reminder loop/UI | Active. |
| `assets` | Local file metadata. | asset upload/contact/avatar flows | assets/page/entries | Active. |
| `tags` | Tag dictionary. | tag handlers/UI | quick entry/stats | Backend active. |
| `entries_to_tags` | Entry-tag join. | entry/weight writes | stats/filter/UI chips | Important for analytics. |
| `tag_relationships` | Parent-child tags. | tags service | inheritance resolver | Active backend. |
| `entry_weight` | Weight-specific data. | weight service | Weight detail/calendar | Proper specialized table. |
| `tracker_goals` | Tracker goals, currently used by Weight. | weight goal service | Weight metrics | Active for Weight. |
| `asset_links` | General asset relations. | schema exists | limited current use | PARTIAL / DB_READY. |
| `contacts` | CRM profiles. | contacts page | contacts/social | Active. |
| `contact_interactions` | Social interaction history. | Quick Entry/contact profile | contacts/social | Active, but entry linkage is weak. |

The main DB theory is: generic `entries` for common logging, specialized tables only when analytics/read models require structure. Weight proves why specialized tables matter.

## 6. Contract Concepts

| Contract type | Exists? | Keep? | Notes |
| --- | --- | --- | --- |
| Request contracts | Yes | Keep | `BaseEntryRequest`, `CreateWeightEntryRequest`, reminders, contacts, tags. |
| Response contracts | Yes | Keep | Shared app types and feature types. |
| Surface read models | Partial | Keep and expand carefully | Strongest for Weight; weaker for other trackers. |
| Deep/backend contracts | Docs now describe them; code partially implements them | Keep | Useful to avoid UI-only thinking. |
| Persistence contracts | Yes | Keep | DB docs/schema explain storage ownership. |
| Validation rules | Partial | Keep | Should tie to real handlers. |
| Field semantics | Essential | Keep | `value`, `note`, and `metadata` mean different things per tracker. |
| Data quality rules | Partial | Keep lightweight | Needed for stats/correlation caveats. |
| Lifecycle/status labels | Yes | Keep | Useful because many things are PARTIAL/CONTRACT_ONLY. |
| Lineage/dependencies | Useful | Keep | Field captured in Quick Entry must appear downstream or be intentionally hidden. |
| Versioning/breaking changes | Minimal | Reduce | Only needed around migrations/schema changes for now. |
| Contract tests | Partial | Keep selectively | Strongest for Weight/shared domains. |
| Debugging signals/sample payloads | Partial | Add selectively | Helpful where IPC/read models are confusing. |

## 7. Things This App Does Not Need

- Enterprise billing: no payments/account plans exist.
- Legal data usage agreements: local personal app, no marketplace or data sharing layer.
- Data marketplace/governance: not a multi-tenant data product.
- Multi-team approval workflow: repo/product does not need process theory.
- Auth/login/register: current runtime docs/code say not present.
- External analytics by default: stats are local app features, not telemetry.
- Cloud AI by default: no required AI/backend cloud theory.
- SLA/availability theory: local Electron/web runtime, not hosted SaaS.
- Complex event sourcing/CQRS: current DB is simple SQLite CRUD plus read models.

## 8. Hidden Complexity

- Electron preload/IPC boundary: renderer must use `window.api`.
- Dual runtime: Electron IPC and web `/api/*` adapter both need contract alignment.
- Query invalidation: React Query keys must update all surfaces after mutations.
- Local DB migrations/drift/reset: startup can repair/reset schema.
- Asset protocol: DB stores metadata, files live on disk, renderer uses `chimero-asset://`.
- `timestamp` vs `dateStr`: calendar/stats logic depends on correct normalization.
- Generic entries vs specialized tracker data: Weight is structured; most others lean on `entries.value`, `entries.note`, and `entries.metadata`.
- Metadata risk: if analytics need a field, hiding it in JSON makes future queries harder.
- Response shape mismatch: Bento, detail, calendar, and stats can accidentally compute their own truth.
- Stale docs risk: docs are moving faster than implementation for non-Weight trackers.
- Placeholder UI risk: some surfaces render plausible summaries from generic data but not full tracker semantics.

## 9. Final Minimal Theory Set

Maintain only these core theory documents:

- App Flow: runtime startup, navigation, major user flows.
- Architecture: Electron/web boundary, preload/API adapter, main handlers, shared packages.
- Directory Tree: current useful paths only.
- Views: actual mounted pages/surfaces.
- View Interactions: Quick Entry, edit/delete, calendar selection, dashboard selection, reminders.
- Feature Inventory: ACTIVE/PARTIAL/CONTRACT_ONLY status map.
- Contracts Master Index: `7_Contratcs.md` as overview, not duplicated mega-contract.
- Per-Tracker Contracts: one file per tracker with surface, deep, DB, and input/output contracts.
- Database Contracts: table purpose, producer/consumer, migration notes.
- Backend IPC Contracts: exact `window.api`/IPC methods.
- Frontend Contracts: what each surface consumes and must not compute.
- Shared Contracts: app-facing type source of truth.
- Testing/Verification Plan: typecheck, unit tests for shared domains, IPC/read-model tests, no fake completeness.
- Actual Task: current milestone truth and remaining gaps.

## 10. Brutally Honest Diagnosis

Chimero is mainly a contract/data-flow app with a simple local backend, not a deep business-theory backend.

The real theory is:

- personal tracking concepts,
- typed request/response contracts,
- SQLite persistence,
- Electron IPC boundaries,
- shared read models,
- local computed metrics,
- and keeping every frontend surface aligned with the same source of truth.

The only deeper domain area today is tracker semantics: deciding when a tracker can stay generic versus when it needs structured persistence like Weight. That is the heart of the app. Everything else is supporting machinery.
