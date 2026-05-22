# Chimero Developer Vocabulary Map

| Term | Meaning in Chimero | Files to look at | Real task example | Risk if misunderstood | Use Plan Mode? |
| --- | --- | --- | --- | --- | --- |
| surface | A UI place where tracker data is captured or shown. | `App.tsx`, `QuickEntry.tsx`, `BentoGrid.tsx`, `TrackerDetailView.tsx`, `CalendarPage` | Add Weight waist display to Calendar. | You update one UI but forget Bento/Entries/Stats. | Yes, if cross-surface. |
| tracker | The definition of a thing the user tracks. | `packages/db/src/schema.ts`, `tracking/handler.ts`, `entry-config.ts` | Add or update default tracker config. | You confuse tracker definition with logged data. | Yes. |
| entry | A user log for a tracker. Most tracker data starts here. | `entry/handler.ts`, `app-types.ts`, `schema.ts` | Add tags to entry creation. | You lose data between Quick Entry and history/calendar. | Yes. |
| contract | The agreed shape/behavior between UI, backend, DB, and docs. | `Documentation/Contracts/*`, `packages/shared/src/contracts/*` | Define Diet response for Statistics tab. | Code and docs drift; surfaces expect fields backend never returns. | Yes. |
| request | Data sent from renderer to backend/API. | `electron-api.ts`, `app-types.ts`, `preload/index.ts` | Add `tagIds` to create entry flow. | Backend receives incomplete or unsafe input. | Usually. |
| response | Data returned to renderer after backend work. | `electron-api.ts`, `mappers.ts`, `weight.ts` domain | Return Weight detail with goal progress. | UI reads raw DB-ish data or misses computed values. | Usually. |
| read model | Frontend-safe shape designed for one surface. | `packages/shared/src/domain/weight.ts`, tracker docs | Build Bento widget data for Weight. | UI recomputes backend/domain logic inconsistently. | Yes. |
| backend service | Main-process logic that validates, persists, reads, and computes. | `apps/electron/src/main/features/*` | Implement specialized Weight update. | Renderer starts owning domain logic. | Yes. |
| IPC | Electron call boundary from renderer to main process. | `preload/index.ts`, `main/features/*/handler.ts`, `electron-api.ts` | Add `get-weight-detail`. | You bypass the safe runtime boundary or mismatch method names. | Yes. |
| preload | Secure bridge exposing `window.api` to renderer. | `apps/electron/src/preload/index.ts` | Add a new API method. | Renderer cannot call backend, or types drift. | Yes. |
| renderer | React UI runtime. It should not touch SQLite directly. | `apps/electron/src/renderer/src/*` | Update Quick Entry UX. | You put DB/service logic in UI. | Depends; yes for data changes. |
| handler | IPC endpoint registration in main process. | `main/features/*/handler.ts` | Register `create-contact-interaction`. | API exists in types but not in runtime. | Yes. |
| database table | Durable SQLite storage for a concept. | `packages/db/src/schema.ts` | Add a specialized tracker table. | You hide queryable fields in metadata or break migrations. | Yes. |
| schema | Drizzle definition of DB structure. | `packages/db/src/schema.ts` | Add indexed column for analytics. | Runtime DB and code disagree. | Yes, always. |
| migration | DB change script applied to local SQLite. | `packages/db/drizzle/*`, `main/database.ts` | Add `entry_weight` table. | Existing users hit schema drift/reset risk. | Yes, always. |
| metadata | JSON blob on `entries` for flexible/custom data. | `schema.ts`, `entry/handler.ts`, tracker docs | Store selected exercises for Exercise entry. | Analytics/search cannot reliably query important fields. | Yes, if semantics matter. |
| dateStr | Normalized `YYYY-MM-DD` used for grouping/filtering. | `entry/handler.ts`, `calendar/service.ts`, `schema.ts` | Fix Calendar daily grouping. | Stats/calendar show the wrong day. | Yes, if changing dates. |
| timestamp | Exact event time in milliseconds. | `app-types.ts`, `schema.ts`, entry/weight handlers | Preserve time of a mood entry. | Multiple entries per day or ordering breaks. | Yes, if changing time logic. |
| query invalidation | React Query refresh after mutations. | `shared/queries.ts` | After deleting an entry, refresh calendar and dashboard. | UI shows stale data after save/delete. | Usually. |
| generic entry | Tracker data stored only in `entries.value`, `entries.note`, and `entries.metadata`. | `entry/handler.ts`, non-Weight tracker docs | Log a custom numeric tracker entry. | You assume specialized fields exist when they do not. | Maybe. |
| specialized tracker table | Extra table for tracker-specific structured fields. | `entry_weight`, `weight/service.ts` | Add a proper Exercise workout schema. | You overbuild, or underbuild and block analytics. | Yes, always. |
| tag inheritance | Parent tag resolution for selected tags. | `tags/service.ts`, `domain/tags.ts`, `entries_to_tags` | Selecting child tag also resolves parent. | Filters/correlations miss inherited context. | Yes. |
| asset protocol | Local file URL bridge for media display. | `main/index.ts`, `assets/service.ts`, `assets/handler.ts` | Show entry photo in Tracker Detail. | Broken images or unsafe file access. | Yes, if touching file handling. |
| computed metric | Derived value from stored data. | `domain/weight.ts`, `tracking/service.ts`, tracker docs | Compute Weight streak/delta. | Frontend and backend disagree. | Yes. |
| placeholder UI | UI that appears functional but is not fully wired to real domain data. | feature pages, contract status labels | Identify whether Exercise is search-only or workout-ready. | You report fake completeness. | Yes, when replacing it. |
| stale docs | Documentation that no longer matches code. | `Documentation/*`, current source files | Update docs after Weight contract changes. | Developers build from wrong assumptions. | Yes, if broad docs sync. |

## Practical Rule

Use Plan Mode when the term crosses more than one layer:

- UI plus contract,
- contract plus backend,
- backend plus DB,
- DB plus migration,
- or any change that affects multiple frontend surfaces.

For one-surface text tweaks, Plan Mode is usually unnecessary.
