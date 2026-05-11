# Backend Flow

## Electron Startup

- `apps/electron/src/main/index.ts` starts the Electron backend.
- It configures `userData`, registers `chimero-asset://`, runs database setup, starts exercise DB initialization, registers IPC handlers, creates windows, and starts the reminder loop.

## IPC Registration

`apps/electron/src/main/features/index.ts` registers:

- `tracking`
- `entry`
- `reminders`
- `assets`
- `contacts`
- `calendar`
- `exercises`
- `tags`
- `weight`

## Feature Responsibilities

- `tracking`: trackers, dashboard stats/layout, stats, correlation, mood aggregates.
- `entry`: generic entry CRUD and tag replacement at the entry boundary.
- `reminders`: reminder CRUD and completion state.
- `assets`: file picking, upload, rename, delete, and download.
- `contacts`: contacts and interaction history.
- `calendar`: month aggregation and enriched selected-day entries.
- `exercises`: local exercise dataset loading/search.
- `tags`: tag CRUD, tag tree, relationship updates, and inheritance resolution.
- `weight`: specialized Weight entry CRUD, detail response, and goals.

## Web Runtime

- `apps/web/server/index.ts` provides Vite middleware for `/api/*`.
- `apps/web/server/routes/api.ts` mirrors core app contracts with local REST-style routes.
- Web DB and assets are local runtime data, not a remote backend.

## Notes

- The current tree does not include the old `ipc-handlers.ts` monolith or `main/services/*` compatibility shims.
- Renderer code should keep going through preload or the web runtime API adapter.
