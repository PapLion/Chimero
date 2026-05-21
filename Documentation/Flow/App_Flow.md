# App Flow

## What Chimero Is

Chimero is a local-first habit and life-tracking app. The user creates or uses trackers, logs entries through Quick Entry or tracker surfaces, then reviews the data through Home/BentoGrid, Tracker Detail, Calendar/Timeline, Insight Lab, Contacts, Assets, and Reminders.

The app is not an auth/product-billing SaaS. It is primarily a contract/data-flow app: frontend surfaces send typed requests, backend/runtime code validates and persists them, shared contracts/read models shape the response, and the renderer displays the result.

## Startup

- Electron mounts `chimero-habit-flow/apps/electron/src/renderer/src/main.tsx` inside `QueryClientProvider`.
- Web mounts `chimero-habit-flow/apps/web/src/main.tsx`, which reuses the Electron renderer app through Vite aliases.
- `App.tsx` reads page and selection state from `useAppStore`.
- The app shell keeps these global overlays mounted: Quick Entry, notifications, floating action button, toast host, and exercise download status.
- Electron main process starts the local DB, asset protocol, IPC handlers, exercise cache, and reminder loop before the renderer is useful.

## Navigation

Current app page values from `useAppStore`:

- `home`
- `calendar`
- `assets`
- `custom-trackers`
- `tracking`
- `stats`
- `contact`

Current page rendering:

- `home` shows `BentoGrid`.
- If `activeTracker` is set, the Home area switches to `TrackerDetailView`.
- `calendar` shows `CalendarPage`.
- `assets` shows `AssetsPage`.
- `custom-trackers` shows `CustomTrackersPage`.
- `stats` shows the Insight Lab / correlation page.
- `contact` shows `ContactProfilePage`.
- `tracking` exists as a page state but is not the normal visible path; tracker detail is currently contextual from Home/sidebar selection.

## Runtime Data Flow

```text
Usuario
  -> Frontend Input/UI
  -> Shared request contract
  -> Runtime adapter (`window.api` in Electron, `/api/*` in Web)
  -> Backend handler/service
  -> SQLite through `packages/db`
  -> Backend mapper/domain helper
  -> Shared response/read model
  -> React Query cache
  -> Frontend Rendering/UI
  -> Usuario
```

## Main Interactions

- Header changes `selectedDate`, which affects Home widgets and Tracker Detail views.
- Quick Entry opens with `Alt+Q` and can create activities or reminders.
- Most trackers create generic entries through `add-entry`.
- Weight uses specialized Weight contracts and backend services.
- Social Quick Entry can create generic Social entries plus contact interactions.
- Exercise Quick Entry can search/select exercises and persist selected exercises in generic entry metadata.
- Notifications shows pending and completed reminders.
- Contact bubbles can open contact profile flows.

## Responsibility Boundaries

- Frontend owns capture, display, local UI state, visual formatting, and query invalidation after mutations.
- Backend/service owns validation, normalization, relation resolution, persistence orchestration, derived metrics, and response mapping.
- Database owns durable structure, indexes, foreign keys, and queryable facts.
- Shared contracts own app-facing request/response types and reusable pure domain helpers.

## What Can Go Wrong

- A surface captures a field that Entries, Calendar, or Edit Entry cannot show later.
- A mutation updates the DB but misses React Query invalidation, leaving stale UI.
- Renderer code calculates domain metrics that should come from backend/shared domain helpers.
- `timestamp` and `dateStr` disagree, breaking Calendar, streaks, and stats.
- Generic `metadata` stores a field that later needs SQL filtering or aggregation.
- Docs describe a specialized tracker while the code still only has generic entry support.

## Notes

- There is no auth/login flow in the current runtime behavior.
- Tags contracts and backend exist; visible tag UI is partial and should be checked surface by surface.
- Tracker-specific implementation rules belong in `Documentation/Contracts/Trackers/*.md`, not in this flow overview.
