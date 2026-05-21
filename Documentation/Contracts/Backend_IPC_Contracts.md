# Backend IPC Contracts

This file defines the Electron backend/API boundary. Chimero's primary runtime boundary is Electron IPC through preload and `window.api`. Web `/api/*` routes exist as a local runtime adapter, but do not document HTTP endpoints here unless they actually exist.

## Boundary Ownership

Backend/API owns:

- preload/window.api method availability,
- IPC method registration,
- request validation,
- timestamp/dateStr normalization,
- transaction orchestration,
- DB read/write coordination,
- relation resolution,
- computed metrics,
- DB row to shared contract mapping,
- safe error and empty-state responses.

Backend/API must never leak:

- raw SQLite/Drizzle rows,
- file-system paths that should be represented by asset URLs,
- unvalidated tracker-specific fields,
- unsupported future tracker behavior as if it were implemented.

## Runtime Path

```text
Renderer
  -> window.api method
  -> preload ipcRenderer.invoke(channel, args)
  -> ipcMain.handle(channel)
  -> feature handler/service
  -> packages/db
  -> mapper/domain helper
  -> shared response contract
  -> renderer query hook
```

Primary files:

- `apps/electron/src/preload/index.ts`
- `apps/electron/src/main/features/*`
- `apps/electron/src/main/shared/mappers.ts`
- `packages/shared/src/contracts/electron-api.ts`

## Method Groups

| Group | Existing methods | Behavior contract | Generic or specialized | Status |
| --- | --- | --- | --- | --- |
| tracking | `get-trackers`, `create-tracker`, `delete-tracker`, `get-recent-trackers`, `get-favorite-trackers`, `toggle-tracker-favorite`, `update-tracker`, `reorder-trackers`, `get-dashboard-stats`, `get-dashboard-layout`, `save-dashboard-layout` | Manage tracker registry, default tracker availability, favorites/order/layout, and dashboard stats. Return mapped `Tracker`, `DashboardStats`, and layout contracts. | Generic tracker infrastructure | ACTIVE |
| entry | `get-entries`, `add-entry`, `update-entry`, `delete-entry`, `get-task-entries`, `get-quick-entry-context` | Generic entry CRUD. Calculate `dateStr`, store base entry fields, replace explicit tags where supported, and return mapped `Entry` objects. | Generic | ACTIVE |
| weight | `add-weight-entry`, `update-weight-entry`, `delete-weight-entry`, `get-weight-detail`, `get-weight-goal`, `set-weight-goal` | Specialized Weight persistence/read contracts. Write base `entries` plus `entry_weight`; compute detail metrics through shared domain; manage goals. | Specialized | ACTIVE |
| tags | `get-tags`, `create-tag`, `update-tag`, `delete-tag`, `get-tag-tree`, `update-tag-relationships`, `resolve-tag-inheritance` | Manage tag records, parent relationships, tree building, and inheritance resolution. | Cross-cutting support | BACKEND ACTIVE / UI PARTIAL |
| assets | `open-file-dialog`, `upload-asset`, `get-assets`, `update-asset`, `delete-asset`, `download-asset` | Coordinate file picker, local file copy/delete/download, asset rows, and frontend-safe URLs. | Cross-cutting support | ACTIVE |
| contacts | `get-contacts`, `get-contact`, `create-contact`, `update-contact`, `delete-contact`, `create-contact-interaction`, `get-contact-interactions` | Manage personal CRM records and interaction history. Update contact state such as last-talked date where implemented. | Specialized support domain | ACTIVE/PARTIAL |
| reminders | `get-reminders`, `upsert-reminder`, `delete-reminder`, `toggle-reminder`, `complete-reminder`, `uncomplete-reminder` | Manage reminder records, enabled/completed state, and data consumed by the reminder loop/UI. | Support domain | ACTIVE |
| calendar | `get-calendar-month` | Return month data grouped by `dateStr`, including Weight enrichment and tag IDs where available. | Cross-surface read model | ACTIVE/PARTIAL |
| exercises | `search-exercises`, `get-all-exercises`, `get-exercise-db-status` | Search/read local exercise dataset cache. Does not imply structured workout persistence. | Support data source | PARTIAL |
| stats/correlation | `get-stats`, `calculate-impact`, `get-correlation-result`, `get-mood-daily-aggregates` | Read local entries for stats, cautious impact/correlation calculations, and mood aggregate series. | Generic analytics | ACTIVE/PARTIAL |
| web runtime adapter | methods mirrored in `apps/web/server/routes/api.ts` where present | Local web runtime parity for the same shared contract family. | Adapter | PARTIAL |

## Handler Responsibilities

Handlers should:

- accept only the request shape defined by shared contracts,
- call service/database logic,
- catch errors and return safe fallback values according to existing API style,
- map DB rows through shared mappers/domain helpers,
- avoid duplicating frontend display logic.

Handlers should not:

- return Drizzle rows directly,
- let renderer choose SQL,
- perform tracker-specific product invention,
- expose unsupported web endpoints as if they exist.

## Service Responsibilities

Services should:

- validate required fields and enum/unit constraints,
- normalize `timestamp`, `dateStr`, strings, null/undefined, and defaults,
- perform multi-row writes transactionally,
- resolve related tags/assets/contacts where implemented,
- compute metrics that define product meaning,
- call shared deterministic domain helpers when available,
- return shared contract shapes.

## Error And Empty-State Conventions

- Missing rows generally return `null`, `false`, an empty array, or an empty read model depending on method style.
- Invalid requests should not create partial data.
- Insufficient stats/correlation data must return caveats or neutral values, not fake insight.
- DB/migration failures should be logged in backend and surfaced as safe failure/empty states.

## Known Backend Boundary Gaps

- Non-Weight trackers mostly use generic entry methods.
- Generic entry validation is thinner than specialized Weight validation.
- Social Quick Entry writes generic entry and contact interactions separately; linkage/atomicity is partial.
- Exercise search is backend-supported, but structured workout logging is not.
- Tag inheritance exists as backend/domain support but is not automatically applied to every frontend read model.
