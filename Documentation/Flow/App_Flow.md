# App Flow

## Startup

- Electron mounts `apps/electron/src/renderer/src/main.tsx` inside `QueryClientProvider`.
- Web mounts `apps/web/src/main.tsx`, which reuses the Electron renderer app through Vite aliases.
- `App.tsx` reads UI state from `useAppStore`.
- The app shell keeps global overlays mounted: Quick Entry, notifications, floating action button, toast host, and exercise download status.

## Navigation

Current app page values:

- `home`
- `calendar`
- `assets`
- `custom-trackers`
- `stats`
- `contact`

## Real Page Flow

- `home` shows `BentoGrid`.
- If `activeTracker` is set, the home area switches to `TrackerDetailView`.
- `calendar` shows `CalendarPage`.
- `assets` shows `AssetsPage`.
- `custom-trackers` shows `CustomTrackersPage`.
- `stats` shows the Insight Lab / correlation page.
- `contact` shows `ContactProfilePage`.

## Main Interactions

- Header changes `selectedDate`.
- Quick Entry opens with `Alt+Q` and can create activities or reminders.
- Weight entries use the specialized Weight contract.
- Notifications shows pending and completed reminders.
- Contact bubbles can open contact profile flows.

## Notes

- There is no auth/login flow in the current app behavior.
- Tags contracts exist, but full visible tag UI is still pending.
