# Backend Structure

## Electron Main Process

- `chimero-habit-flow/apps/electron/src/main/index.ts`: backend entrypoint, app/window lifecycle, asset protocol registration, DB setup, exercise DB initialization, IPC registration, and reminder loop startup.
- `chimero-habit-flow/apps/electron/src/main/database.ts`: Electron DB bootstrap, migrations, drift check, reset/retry behavior, and default tracker seeding.
- `chimero-habit-flow/apps/electron/src/main/features/index.ts`: IPC feature registration.
- `chimero-habit-flow/apps/electron/src/main/shared/mappers.ts`: DB row to shared-contract mappers.

## Electron Feature Folders

| Folder | Owns | Add code here when |
| --- | --- | --- |
| `features/tracking` | Tracker CRUD, dashboard stats/layout, generic stats, correlations, mood aggregates. | The task changes tracker registry, dashboard layout, generic stats, or Insight Lab backend. |
| `features/entry` | Generic entry CRUD, tag replacement, quick-entry context. | The task affects generic logs across trackers. |
| `features/reminders` | Reminder CRUD, completion, runtime reminder loop. | The task affects notifications/reminder behavior. |
| `features/assets` | Local asset file flows. | The task affects file upload, local asset URLs, rename, download, or delete. |
| `features/contacts` | Contact and interaction flows. | The task affects personal CRM or social interactions. |
| `features/calendar` | Month aggregation and selected-day entry data. | The task affects Calendar data returned from backend. |
| `features/exercises` | Exercise dataset search/cache. | The task affects exercise search support, not workout persistence. |
| `features/tags` | Tag CRUD, tree, relationships, inheritance, entry tag helpers. | The task affects tag management or tag resolution. |
| `features/weight` | Specialized Weight CRUD, detail, goals. | The task affects Weight-specific persistence or metrics. |

## Runtime Boundaries

- Renderer calls go through `window.api` exposed by preload.
- Preload forwards to `ipcRenderer.invoke`.
- Handlers call backend/service logic and return shared contract shapes.
- Renderer code must not import `packages/db` directly.
- Backend code should map DB rows through `main/shared/mappers.ts` or shared/domain helpers before returning data.

## Web Runtime Backend

- `chimero-habit-flow/apps/web/server/index.ts`: Vite middleware entry.
- `chimero-habit-flow/apps/web/server/routes/api.ts`: local `/api/*` route implementation.
- `chimero-habit-flow/apps/web/server/db.ts`: web runtime DB path and initialization.

Use web route code only for web runtime parity. Do not invent HTTP endpoints when the task only concerns Electron IPC.

## Where Not To Add Code

- Do not add new backend logic under old `main/services/*`; that tree is not present.
- Do not recreate an `ipc-handlers.ts` monolith.
- Do not put SQLite access in renderer components.
- Do not add auth/login/register backend flows unless runtime/product scope changes.
- Do not add enterprise/cloud service layers for local tracker work.

## Notes

- Weight is the reference specialized backend pattern.
- Non-Weight trackers mostly use generic entry backend paths unless their tracker contract says otherwise.
- Tags and Weight are current backend/shared foundations; many other tracker-specific ideas remain CONTRACT_ONLY/FUTURE.
