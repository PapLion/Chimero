# Chimero Tracker Contracts

## 1. Purpose Of The Contracts System

This file is the master index and alignment guide for Chimero contracts. It explains how tracker data moves through the app and what each contract category owns.

It should not duplicate every tracker detail. Tracker-specific details belong in `Documentation/Contracts/Trackers/*.md`.

Use this file when you need to answer:

- What does the frontend send?
- What does backend/service validate, normalize, compute, and return?
- What does the database store structurally?
- Which frontend surfaces must receive the data?
- Which tracker-specific file should I read before implementing?

Chimero's core flow:

```text
Usuario
  -> Frontend Input/UI
  -> Contract Request
  -> Backend / Service Logic
  -> Database
  -> Backend / Service Logic
  -> Contract Response
  -> Frontend Rendering/UI
  -> Usuario
```

## 2. App-Wide Data Flow

### Electron Runtime

```text
Renderer surface
  -> window.api
  -> preload typed by shared contracts
  -> ipcMain handler
  -> feature service / DB mapper
  -> shared response shape
  -> React Query cache
  -> UI surface
```

### Web Runtime

```text
Renderer surface
  -> shared api adapter
  -> local /api route
  -> local DB/service logic
  -> shared response shape
  -> React Query cache
  -> UI surface
```

### Source Of Truth By Layer

- Renderer surfaces: `apps/electron/src/renderer/src`.
- Electron runtime boundary: `apps/electron/src/preload/index.ts`.
- Electron backend handlers/services: `apps/electron/src/main/features`.
- Web runtime routes: `apps/web/server/routes/api.ts`.
- App-facing request/response types: `packages/shared/src/contracts`.
- Feature-specific shared models: `packages/shared/src/features`.
- Pure domain helpers/read-model builders: `packages/shared/src/domain`.
- Database schema: `packages/db/src/schema.ts`.

## 3. Contract Categories

### Request Contracts

Request contracts define what a frontend surface may send.

Examples:

- `BaseEntryRequest`
- `CreateWeightEntryRequest`
- `UpdateWeightEntryRequest`
- `ReminderInsert`
- `ContactInsert`
- tag and correlation requests

They must define required fields, optional fields, tracker-specific fields, timestamps, `assetId`, `tagIds`, referenced IDs, valid units/enums, and empty/invalid behavior.

### Response Contracts

Response contracts define what the backend returns after create/update/delete/read operations.

They must be frontend-safe shared shapes, not raw Drizzle/SQLite rows. Missing optional fields should be represented consistently with `null`, empty arrays, typed failure responses, or omitted optional fields where already established.

### Surface Read Models

Surface read models define what each UI surface consumes:

- Quick Entry / Edit Entry prefill.
- BentoGrid / Home widget.
- Tracker Detail / Entries tab.
- Tracker Detail / Statistics tab.
- Tracker Detail / Graphs tab.
- Calendar selected-day summary.
- Insight Lab / correlations where applicable.

If a field is captured in Quick Entry, the tracker contract must either show where that field appears later or explicitly mark it hidden with a reason.

### Deep / Backend Contracts

Deep contracts define backend responsibility between request and response:

- entry point,
- validation,
- normalization,
- transaction plan,
- DB writes/reads,
- computed metrics,
- response mapping,
- error handling,
- data ownership rules.

Surface contracts answer "what does the UI show?" Deep contracts answer "what must the system do internally so the UI can show it correctly?"

### Persistence / Database Contracts

Persistence contracts define durable structure:

- base table use, usually `entries`,
- specialized table use, such as `entry_weight`,
- junction tables, such as `entries_to_tags`,
- asset/contact/tag relationships,
- fields that must be structural instead of hidden in `metadata`,
- indexes/cascade behavior where relevant.

### Validation Rules

Validation rules belong in the backend/service contract, not only in the UI. The frontend may guide input, but backend owns enforcement for durable data.

### Field Semantics

The same base fields can mean different things by tracker:

- `entries.value`: numeric value, completion state, count, duration, calories, or generic scalar.
- `entries.note`: free text, title/name, context, meal label, task title, or media item.
- `entries.metadata`: flexible generic payload, not a replacement for queryable analytics fields.
- `timestamp`: exact event time.
- `dateStr`: normalized `YYYY-MM-DD` grouping key.

Each tracker contract must clarify these meanings.

### Data Quality Rules

Statistics and correlations must not invent certainty. Contracts should define:

- minimum data requirements,
- empty states,
- caveats,
- future-only calculations,
- whether a metric is backend-computed, frontend-display-only, or unsupported.

### Lineage / Dependencies

Lineage means tracing a field through the app:

```text
Quick Entry field
  -> request field
  -> DB field/junction/metadata
  -> backend read/query
  -> response/read model
  -> BentoGrid / Entries / Stats / Graphs / Calendar
```

If this path is broken, the tracker contract is partial.

### Testing / Debugging Contracts

Useful contracts may include:

- sample payloads,
- expected query invalidation keys,
- expected empty states,
- status labels,
- known gaps,
- unit-test targets for shared domain helpers.

Do not turn documentation samples into new product requirements.

## 4. Deep Contracts Layer

Deep Contracts are the backend/service/data contracts behind each tracker. They define what the backend receives from `window.api` or the runtime adapter, what it validates, how it normalizes timestamps/defaults, which service process runs, which tables it writes and reads, which derived metrics are calculated, how failures/empty states are represented, and which shared response shape is returned.

### Backend Responsibility Boundaries

- Renderer must not talk to SQLite directly.
- Electron renderer calls must go through `window.api`, preload, and IPC.
- Web runtime calls must go through the shared API adapter and local `/api/*` routes.
- Main process handlers call feature service/database logic.
- Backend/service logic validates request shape, normalizes timestamps/date strings/defaults, resolves relations, orchestrates writes, computes derived values, maps DB rows into shared contracts, and returns typed success, null, empty, or error states.
- Backend/service logic must not leak raw DB rows into frontend surfaces.

### Database Responsibility Boundaries

- `packages/db/src/schema.ts` owns durable relational structure.
- SQLite stores queryable facts in columns/tables.
- Metadata JSON is allowed for generic/future tracker payloads, but analytics fields that need filtering, grouping, or reliable calculations should become structural columns/tables.
- Foreign keys/cascade behavior are database responsibilities, but services must still document delete/update effects.

### Shared Contracts Responsibility Boundaries

- `packages/shared` is the app-facing source of truth for request/response shapes.
- `packages/shared/src/features/*` owns feature-level shared read models.
- `packages/shared/src/domain/*` owns pure reusable calculations.
- Backend returns shared contracts, not Drizzle rows or renderer-only objects.

### Transaction Expectations

- Multi-row writes must be atomic when they affect one logical user action.
- Entry create/update/delete with tags should write `entries` plus `entries_to_tags` in one transaction.
- Specialized tracker writes should write base entry, specialized row, junction rows, and related state changes in one transaction.
- Delete flows must document whether related rows cascade, are explicitly deleted, are set null, or remain untouched.
- Any current path that writes related state outside one transaction must be marked `IMPLEMENTATION_GAP_TRANSACTION_SAFETY`.

### Response Mapping Expectations

Expected response flow:

```text
DB row
  -> domain object
  -> shared response
  -> surface-specific read model
```

Units must be preserved from persisted values when the tracker stores a unit and only formatted visually in the frontend.

### Error / Empty-State Standards

- Invalid create/update requests return `null`, `false`, or a typed failure response according to the existing API; future stronger contracts should prefer typed errors/warnings.
- Missing tracker/entry/related entity returns `null`, `false`, or an empty state, not raw exceptions to the renderer.
- Empty datasets return empty arrays and neutral metrics with no fake data.
- Insufficient data for stats/correlation returns a caveat, empty result, unsupported status, or Future status.
- DB failures and migration/schema mismatches are logged in backend handlers and return safe fallback values.

## 5. Tracker Contract File Index

| Tracker | Contract file | Status summary |
| --- | --- | --- |
| Weight | `Documentation/Contracts/Trackers/Weight.md` | Reference specialized tracker; implemented with honest gaps. |
| Mood | `Documentation/Contracts/Trackers/Mood.md` | Generic entries plus typed Mood read models; canonical scale is 1-10 with no `entry_mood` table or migration. |
| Hydration | `Documentation/Contracts/Trackers/Hydration.md` | Generic numeric tracker with simple daily-total conventions. |
| Diet / Calories | `Documentation/Contracts/Trackers/Diet-Calories.md` | Generic numeric tracker; broader Food/Diet intent documented without inventing schema. |
| Exercise | `Documentation/Contracts/Trackers/Exercise.md` | Exercise search implemented; workout logging is generic metadata. |
| Social | `Documentation/Contracts/Trackers/Social.md` | Generic Social entries plus contact interactions; entry/contact join is partial. |
| Books | `Documentation/Contracts/Trackers/Books.md` | Generic media-style reading tracker; no forced pages-per-session. |
| Gaming | `Documentation/Contracts/Trackers/Gaming.md` | Structured game session tracker with additive `entry_gaming` rows; legacy reads preserved, outcomes deferred. |
| TV / Media | `Documentation/Contracts/Trackers/Media-TV.md` | Separate TV and Media tracker identities sharing generic media-style entry infrastructure; no catalog/status schema. |
| Tasks | `Documentation/Contracts/Trackers/Tasks.md` | Generic task-style tracker with typed postpone metadata/read models; completion inferred from value. |

## 6. What Belongs Here Vs Tracker Files

Belongs in this file:

- app-wide contract flow,
- status vocabulary,
- shared boundaries,
- cross-surface rules,
- tracker file index,
- known vague contracts,
- missing tracker candidates,
- what is not needed in Chimero.

Belongs in tracker files:

- exact fields captured,
- tracker-specific request/response shapes,
- surface read models,
- backend entry points,
- persistence plan,
- computed metrics,
- field visibility matrix,
- completeness checklist,
- tracker-specific gaps.

## 7. Shared Base Contracts

Common shared shapes live in `packages/shared/src/contracts/app-types.ts` and related feature folders. Common concepts include:

- `BaseEntryRequest`
- `Entry`
- `BaseEntryResponse`
- `EntryMutationResponse`
- `Tracker`
- `TrackerConfig`
- `Tag`
- `Asset`
- `TimelineEvent`
- `StatsQueryResponse`
- `CorrelationResultResponse`
- Weight-specific request/response/read-model types
- contact/reminder/asset feature contracts

Do not duplicate incompatible tracker-specific shapes. Extend shared contracts deliberately when implementation actually needs a new app-facing shape.

## 8. Cross-Surface Requirements

### Quick Entry / Edit Entry

- Must list exact tracker fields captured.
- Must specify generic `BaseEntryRequest` vs specialized request.
- Must include note/context, tags, assets, and timestamp/date behavior where supported.
- Must say whether Edit Entry can update the same fields the user originally captured.

### BentoGrid / Home Widget

- Must stay compact.
- Must show only fields useful for a quick selected-day/recent summary.
- Must not imply specialized service support unless the tracker has one.

### Tracker Detail

- Entries tab must show exact logged data or intentionally hide it with a reason.
- Statistics tab must distinguish generic stats from specialized computed responses.
- Graphs tab must be marked relevant or Not applicable with a reason.
- Edit/delete affordances must map back to the correct mutation path.

### Calendar Selected-Day Summary

- Must include enough data to identify selected-day entries.
- Must not silently collapse multiple entries/day unless the UI labels the value as an aggregate.
- Must include specialized fields where the tracker contract requires them, such as Weight unit/waist.

### Future Insights / Correlations

- Use existing generic correlation contracts where applicable.
- Do not document tracker-specific insights as implemented unless real data, service logic, and UI surface exist.
- Never imply causation.

## 9. Known Vague Contracts / Backend Gaps

- Generic non-Weight trackers mostly use generic entry APIs, generic stats, generic calendar, and widget-side heuristics. Tasks now additionally uses typed `entries.metadata` plus shared read models for postpone state without a dedicated task table.
- Gaming now has a structured extension table and dedicated Gaming service/read models, but outcome-aware features are still deferred.
- Generic entry validation is thin compared with specialized Weight validation.
- Mood scale is now canonical 1-10 across create/edit/read surfaces, but it remains on generic entries and backend generic validation is still thinner than Weight.
- Exercise structured workout logging is `CONTRACT_ONLY/FUTURE`.
- Social contact interactions exist, but Social entry plus contact interaction linkage is partial.
- Diet/Food, Books, TV, Media, and advanced Task semantics beyond postpone do not have specialized tables/services.
- Multi-asset links exist at schema level, but current tracker mutations generally use a single `assetId`.
- Calendar tag labels/assets and tag-based stats/widgets remain partial/future unless a specific implementation proves otherwise.

## 10. Missing Tracker Contract Candidates

These items may appear in older docs or requested candidate lists, but they do not currently have tracker contract files. Do not silently invent full contracts for them.

| Candidate | Status | Required next action |
| --- | --- | --- |
| Health / Symptoms | PRODUCT_REQUESTED_NOT_DOCUMENTED | Needs separate tracker contract file in a future pass if client confirms scope. |
| Vitamins / Medications | PRODUCT_REQUESTED_NOT_DOCUMENTED | Needs separate tracker contract file in a future pass if client confirms scope. |
| Sleep | IMPLEMENTATION_UNKNOWN | Add only if client/spec confirms. |
| Meditation | IMPLEMENTATION_UNKNOWN | Add only if client/spec confirms. |

Product spec note: `docs/product/CHIMERO_PRODUCT_SPEC_V5_FINAL.md` was not present in this checkout during prior documentation passes.

## 11. What Chimero Does Not Need Right Now

Do not document or implement these unless product/runtime scope changes:

- enterprise billing,
- legal data usage agreements,
- cloud data governance,
- auth/login/register,
- external analytics/telemetry as product infrastructure,
- cloud AI by default,
- enterprise SLA/availability theory,
- multi-team approval workflow,
- complex event-sourcing/CQRS architecture.

## 12. Contract Completeness Checklist

A tracker contract is not complete unless it maps:

- Quick Entry / Edit Entry input,
- frontend request shape,
- backend/service write behavior,
- database persistence shape,
- backend/service read and computed response,
- BentoGrid/Home read model,
- Tracker Detail / Entries tab read model,
- Tracker Detail / Statistics tab read model,
- Tracker Detail / Graphs tab relevance,
- Calendar selected-day summary,
- Edit/Delete behavior,
- Insights/Correlations scope.

Honesty rule: do not call a tracker contract complete unless Quick Entry/Edit Entry -> backend request -> DB persistence -> backend computed/read response -> BentoGrid -> Entries tab -> Statistics tab -> Calendar selected-day summary -> Edit/Delete behavior are all mapped in that tracker file.
