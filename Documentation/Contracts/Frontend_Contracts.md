# Frontend Contracts

## Runtime Boundary

- Electron renderer calls `window.api` through preload.
- Web runtime reuses the renderer app and routes calls through `apps/web/src/runtime/api-client.ts`, which exports the shared renderer API adapter.
- The UI should depend on shared contracts, not raw database rows.

## App Shell

- `useAppStore` holds page state, active tracker, selected date, selected contact, and overlay flags.
- The current top-level page values are `home`, `calendar`, `assets`, `custom-trackers`, `stats`, and `contact`.
- `QuickEntry`, `NotificationsModal`, `FloatingActionButton`, `ToastHost`, and exercise download status are global shell surfaces.

## Home / Tracker Detail

- `BentoGrid` needs trackers, entries, assets, saved dashboard layout, selected date, and active tracker state.
- `WidgetCard` can use specialized Weight detail when rendering Weight widgets.
- `TrackerDetailView` needs tracker detail data, entries/history, assets, and edit/delete actions.
- Weight tracker detail uses specialized Weight read models for history and statistics.

## Calendar

- `CalendarPage` needs trackers, reminders, stats, month entries, and current month view state.
- Selected-day entries can include Weight-specific fields, `assetId`, and `tagIds`.
- Tag labels and inline asset rendering remain UI gaps.

## Quick Entry and Entry Editing

- `QuickEntry` needs trackers, recent/favorite trackers, assets, reminders, contacts, exercise search, and quick-entry context.
- Weight Quick Entry sends specialized Weight requests including weight, unit, optional waist, note, asset, and tag IDs when available.
- `EditEntryDialog` supports generic entry editing and specialized Weight editing, including waist fields.

## Tags

- Tag contracts exist in shared/backend/web.
- Full visible tag picker, tag chips, and tag editing surfaces are pending.

## Notes

- There is no auth/login flow in the current app behavior.
- Future tracker ideas should stay marked planned/future until a real surface and contract exist.
