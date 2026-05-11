# Backend Structure

## Electron Main Process

- `apps/electron/src/main/index.ts`: backend entrypoint and window lifecycle.
- `apps/electron/src/main/database.ts`: Electron DB bootstrap, migration, drift check, and seeding.
- `apps/electron/src/main/features/index.ts`: IPC feature registration.
- `apps/electron/src/main/shared/mappers.ts`: DB row to shared-contract mappers.

## Electron Feature Folders

- `features/tracking`: tracker CRUD, dashboard stats/layout, stats, correlation, mood aggregates.
- `features/entry`: generic entry CRUD.
- `features/reminders`: reminder CRUD, completion, and runtime reminder service.
- `features/assets`: local asset file flows.
- `features/contacts`: contact and interaction flows.
- `features/calendar`: month aggregation.
- `features/exercises`: exercise dataset search/cache.
- `features/tags`: tag CRUD, tree, relationships, inheritance, entry tag helpers.
- `features/weight`: specialized Weight CRUD, detail, and goals.

## Web Runtime Backend

- `apps/web/server/index.ts`: Vite middleware entry.
- `apps/web/server/routes/api.ts`: local `/api/*` route implementation.
- `apps/web/server/db.ts`: web runtime DB path and initialization.

## What Is Not Present

- No current `ipc-handlers.ts` monolith.
- No current `main/services/*` tree.
- No auth/login backend flow.

## Notes

- Electron backend should remain main-process only.
- Renderer code should use preload or the web runtime API adapter.
