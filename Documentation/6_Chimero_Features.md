# Chimero Feature Inventory

This inventory reflects the current source tree after the Weight contract foundation milestone. Filesystem and contracts win over older planning docs.

## Active User-Facing Features

| Feature | Status | Current surfaces | Notes |
| --- | --- | --- | --- |
| Dashboard / Home | Active | `BentoGrid`, `WidgetCard`, `Header`, `Sidebar` | Home is the default shell surface. Selecting a tracker opens contextual tracker detail inside Home. |
| Tracker Detail | Active contextual | `TrackerDetailView`, `EditEntryDialog`, `ConfirmDeleteDialog` | Shows statistics, graph/history surfaces, entry history, edit, and delete flows. |
| Insight Lab / Stats | Active | `tracking/page.tsx` and correlation components | Still mounted as `stats`; older docs that call it obsolete are stale. |
| Calendar | Active | `CalendarPage`, `TimelineView` | Month view and timeline view. Month entries are enriched with Weight fields when available. |
| Custom Trackers | Active | `CustomTrackersPage`, `CreateTrackerDialog` | Manages custom trackers; default trackers are seeded separately. |
| Assets | Active | `AssetsPage`, asset IPC, `chimero-asset://` | Local media library with upload, rename, download, and delete. |
| Contacts | Active | `ContactProfilePage`, `ContactBubblesGrid` | Personal CRM and social tracker support. |
| Quick Entry | Active | `QuickEntry`, floating action button, `Alt+Q` | Main write surface for entries and reminders. Weight has specialized handling. |
| Reminders | Active | `NotificationsModal`, reminder IPC, reminder loop | CRUD, completion state, and runtime notifications. |
| Exercises | Partial/support | `ExerciseSearch`, `ExerciseDownloadToast` | Embedded in Quick Entry; not a top-level page. |
| Weight | Active specialized tracker | Quick Entry, Weight widget, tracker detail, calendar, backend IPC, shared domain | Reference tracker implementation with `entry_weight`, goals, deltas, weekly average, streak, waist fields, and tag IDs. |

## Internal / Foundation Features

| Feature | Status | Current surfaces | Notes |
| --- | --- | --- | --- |
| Tags | Backend/shared foundation active; UI pending | IPC handlers, web API routes, shared domain helpers, DB tables | `get-tags`, tag tree, relationship updates, inheritance resolution, and entry tag replacement exist. Full tag picker/chip UI remains pending. |
| Web runtime | Active local dev/runtime mirror | `apps/web`, Vite middleware, `/api/*` routes | Web reuses the Electron renderer app through aliases and talks to a local REST-style API instead of Electron preload. |
| Shared contracts | Active | `packages/shared/src/contracts`, `features`, `domain` | Source of truth for app-facing types and pure helpers. |
| Database package | Active | `packages/db/src` | Owns schema and DB runtime helpers; Electron bootstrap owns migration/seeding startup. |

## Main Source Areas

- Electron main: `chimero-habit-flow/apps/electron/src/main`
- Electron preload: `chimero-habit-flow/apps/electron/src/preload`
- Electron renderer: `chimero-habit-flow/apps/electron/src/renderer/src`
- Web runtime: `chimero-habit-flow/apps/web`
- Shared contracts/domain: `chimero-habit-flow/packages/shared/src`
- Database schema/runtime: `chimero-habit-flow/packages/db/src`
- Shared UI package: `chimero-habit-flow/packages/ui`

## Known Gaps

- Tags UI remains pending across Quick Entry, entry editing, calendar, and visible tag chips.
- Weight reference tracker is implemented, but body fat remains optional/future from a product perspective.
- Waist statistics exist in the read model when waist data exists; product threshold language should stay conservative.
- Dedicated Weight goal editing UI remains pending even though backend/web goal contracts exist.
- Calendar selected-day cards carry Weight fields and tag IDs, but resolved tag labels and inline asset presentation still need UI work.

## Obsolete References To Avoid

- Auth/login/register runtime flows: not present in the current app behavior.
- Old `ipc-handlers.ts` monolith or `main/services/*`: not present in the current source tree.
- Old docs that say Insight Lab is obsolete: contradicted by the mounted `stats` page.
- Directory trees that include `.codex`, `node_modules`, build output, or screenshots as repo documentation.
