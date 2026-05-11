# Contracts Flow

## Electron Path

1. Renderer calls `window.api`.
2. `window.api` is typed by `packages/shared/src/contracts/electron-api.ts`.
3. Preload forwards calls to `ipcRenderer.invoke`.
4. Main feature handlers call DB/service logic.
5. Results are mapped into shared contract shapes and returned to the renderer.

## Web Path

1. Web renderer reuses the same app surfaces.
2. Runtime calls are routed through the web API adapter.
3. Vite middleware handles `/api/*` in `apps/web/server/routes/api.ts`.
4. The web route layer maps local DB rows into the same shared contract family.

## Shared Source of Truth

- `packages/shared/src/contracts`: app-facing types.
- `packages/shared/src/features`: feature-specific response/request types.
- `packages/shared/src/domain`: pure calculations for streaks, calendar enrichment, tags, and Weight.

## Common Data Paths

- Home dashboard: trackers, entries, assets, dashboard layout, stats, and Weight detail when needed.
- Quick Entry: trackers, quick-entry context, assets, reminders, contacts, exercises, tags, and Weight submit contracts.
- Calendar: entries, reminders, trackers, stats, Weight enrichment, and tag IDs.
- Contact profile: contacts, interaction history, assets.
- Insight Lab: trackers and correlation/impact calculations.

## Notes

- The renderer should not reach into SQLite directly.
- Future tracker contracts should be added to shared contracts first, then wired through backend/web/runtime surfaces.
