# Release verification — 2026-11-17

Branch `feat/chimero-2`, code at `e31e23a`. Linux (Arch, Wayland), Node 22.16.0, pnpm 10.28.2, Electron 40.1.0. Every check below was run on that code. Reproduce them from `chimero-habit-flow/` with the commands in the [root README](../../README.md).

| Check | Result |
|---|---|
| `pnpm check-types` (app and tests, e2e included) | Passed |
| `pnpm lint` (zero warnings allowed) | Passed |
| `pnpm test` (Vitest on Electron's Node) | 38 files, 171 tests passed, no warnings |
| `python3 scripts/verify-migrations.py` | All 12 upgrade paths passed: data written after each migration survives reopening, update, cascade delete and an integrity check |
| `pnpm build` | Passed |
| `pnpm test:e2e` on the built app | 3 of 3 passed |
| `pnpm package` | `dist/Chimero-2.0.0-x86_64.AppImage` built |
| `pnpm test:e2e` on the packaged binary (`CHIMERO_TEST_EXECUTABLE=dist/linux-unpacked/chimero`) | 3 of 3 passed |
| AppImage launched directly on a throwaway profile | Started, migrated a fresh database and seeded the default trackers |

## What the end-to-end tests do

Each test runs the real Electron app on a new, temporary SQLite profile and fails on any console error.

1. **Build, log, arrange, restart.**
   - Creates a "Reading" tracker in the builder.
   - Logs it through Alt+Q, then logs mood using only the keyboard (digit, then Enter).
   - Edits a record from the tracker page, then adds a second record and deletes it through the confirm dialog.
   - Adds the tracker to Today, drags it two columns over and one row up, and resizes it by one column and one row.
   - Restarts, then checks the record values and the exact grid position.
   - Checks for horizontal overflow and that Quick Entry opens at 1024×700, 1440×900 and 1920×1080.
2. **Upgrade from the last release.**
   - Builds the database the previous release left behind: migrations 0000–0010 with drizzle's own history rows.
   - Fills it in that release's shapes: weigh-ins, mood notes, tagged custom-tracker entries, a contact, and the old array-format dashboard layout.
   - Starts this build on it and checks that every value, note, tag and contact survived, and that the layout came through as a grid with the same widgets.
   - Checks that exactly one `backups/before-upgrade-*.db` copy was taken, and none on the next start.
3. **Backup, export, restore.**
   - Backs up, exports JSON and CSV, changes the data, then restores.
   - After the restart, the later change is gone, the replaced database is kept beside the restored one, and the staging file is cleared.

## Fixed in this pass

- **Structured writes failed at runtime.** Every book, weigh-in, goal, meal, symptom, supplement, game session, workout and tag edit failed with "Transaction function cannot return a promise". Mocked unit tests hid it. Fixed with `transact()`, and covered by integration tests on real SQLite.
- `get-task-entries` selected `intake_items` columns without joining the table.
- **Pattern scan.**
  - It made about 5,000 comparisons with no multiple-testing control.
  - It reported tag-vs-item tautologies and 11-day samples.
  - It now applies Benjamini–Hochberg at a 5% false-discovery rate, needs 14 shared days, filters out definitional pairs, and lists findings with the same information once.
- **Trend on reading-type trackers.** It was last minus first, which could contradict the per-week trend. It is now the fitted change over the period.
- **Windows package.** It carried Linux's `better_sqlite3.node`. An `afterPack` hook now installs the official win32 prebuilt binary. Confirmed: `dist/win-unpacked/.../better_sqlite3.node` is a PE32+ DLL.
- **Exercise catalogue.**
  - It is now bundled, so search works offline.
  - "bench press" returned "Bench Press with Chains" first; the everyday variants of common lifts now rank first.
- Score scales now work from the keyboard alone.
- The text field for the time could clip, and the remove button covered the widget headers in edit mode.

## Not verified here

- **Windows runtime.**
  - `electron-builder --win` produced `dist/win-unpacked` with the correct native module.
  - The NSIS installer step needs wine, which this machine doesn't have.
  - `.github/workflows/ci.yml` builds the installer on `windows-latest` and runs the E2E suite against `Chimero.exe`. It has not been run yet.
- **Notification delivery.** The due-time rule is unit-tested, but whether the OS shows the notification was not checked.
- **macOS.** Not built or run.
- **Accessibility.** Keyboard paths are covered for Quick Entry and grid moves. No full screen-reader audit was done.
- **Performance.** No startup or memory benchmarks. The renderer bundle is about 1.5 MB of JavaScript, loaded from disk.

## Data used

Only throwaway test profiles and the synthetic showcase profile (`.showcase-profile/`, git-ignored, guarded by a marker file). No personal database was opened.
