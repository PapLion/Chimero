# Backend Flow

## Electron Startup

- `chimero-habit-flow/apps/electron/src/main/index.ts` starts the Electron backend.
- It configures `userData`, registers the `chimero-asset://` protocol, runs database setup, starts exercise DB initialization, registers IPC handlers, creates windows, and starts the reminder loop.
- Electron backend code lives in the main process. Renderer code should not import DB/runtime internals directly.

## IPC Registration

`chimero-habit-flow/apps/electron/src/main/features/index.ts` registers these feature handler groups:

- `tracking`
- `entry`
- `reminders`
- `assets`
- `contacts`
- `calendar`
- `exercises`
- `tags`
- `weight`

The preload bridge in `apps/electron/src/preload/index.ts` exposes matching `window.api` methods to the renderer.

## Feature Responsibilities

| Feature group | Responsibility | Status |
| --- | --- | --- |
| `tracking` | Tracker CRUD, default tracker seeding safety, dashboard stats/layout, generic stats, correlation, mood daily aggregates. | ACTIVE/PARTIAL |
| `entry` | Generic entry CRUD, `dateStr` calculation, single asset reference, explicit tag replacement. | ACTIVE |
| `reminders` | Reminder CRUD, completion state, runtime reminder loop. | ACTIVE |
| `assets` | File picker, upload, rename, delete, download, URL mapping. | ACTIVE |
| `contacts` | Contact CRUD and contact interaction history. | ACTIVE/PARTIAL |
| `calendar` | Month aggregation and Weight-enriched calendar entries. | ACTIVE |
| `exercises` | Local exercise dataset loading/search/cache. | PARTIAL support feature |
| `tags` | Tag CRUD, tag tree, relationship updates, inheritance resolution, entry tag helpers. | BACKEND ACTIVE / UI PARTIAL |
| `weight` | Specialized Weight entry CRUD, detail response, and goals. | ACTIVE specialized |

## Backend Request Path

```text
Renderer call
  -> `window.api.method(...)`
  -> preload `ipcRenderer.invoke(channel, args)`
  -> `ipcMain.handle(channel, handler)`
  -> feature handler/service
  -> Drizzle/SQLite through `db()`
  -> mapper/domain helper
  -> shared response object
```

## Web Runtime

- `chimero-habit-flow/apps/web/server/index.ts` provides Vite middleware for `/api/*`.
- `chimero-habit-flow/apps/web/server/routes/api.ts` mirrors core app contracts with local REST-style routes.
- Web DB and assets are local runtime data, not a remote SaaS backend.
- Do not document Electron IPC methods as HTTP endpoints unless the web route actually exists.

## Where Backend Responsibility Starts

Backend/service code starts at the runtime boundary: IPC handler in Electron or `/api/*` route in Web. It owns:

- validation,
- timestamp/dateStr normalization,
- transaction orchestration,
- DB reads/writes,
- relation resolution for tags/assets/contacts where implemented,
- computed metrics and aggregation,
- DB row to shared contract mapping,
- safe empty/error returns.

## What Can Go Wrong

- Preload exposes a method that is missing from shared `ElectronApi`, or vice versa.
- A handler returns a raw DB row shape instead of a mapped shared contract.
- Related writes are split across non-transactional calls.
- Generic entry paths silently ignore tracker-specific validation.
- Web routes and Electron IPC drift.
- A future tracker adds metadata but never adds a queryable schema/read model.

## What Is Not Present

- No current `ipc-handlers.ts` monolith.
- No current `main/services/*` tree.
- No auth/login/register backend flow.
- No enterprise/cloud backend layer.
