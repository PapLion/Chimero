#### PLAN FOR CURSOR

**Context for Cursor**

You are working on **Chimero**, a local-first habit tracker monorepo (pnpm).

* **Stack:** Electron v40 (Main/Renderer/Preload), React 18, Vite, Tailwind CSS.
* **Data Layer:** SQLite (`better-sqlite3`) managed by **Drizzle ORM**.
* **State Management:** **Zustand** (UI State) + **TanStack Query** (Server/DB State).
* **Migrations:** Runtime migrations execute on app startup via `setupDatabase()`.

**Key File Paths (Reference):**

* **Schema & Types:** `packages/db/src/schema.ts`, `packages/db/src/types.ts`
* **Main Process (Backend):**
* `apps/electron/src/main/ipc-handlers.ts` (IPC Logic)
* `apps/electron/src/main/database.ts` (DB Connection)
* `apps/electron/src/main/index.ts` (App Entry)


* **Preload:** `apps/electron/src/preload/index.ts` (Context Bridge)
* **Renderer (Frontend):**
* `apps/electron/src/renderer/src/lib/api.ts` (API/IPC wrappers)
* `apps/electron/src/renderer/src/lib/queries.ts` (TanStack Query Hooks)
* `apps/electron/src/renderer/src/pages/*` (AssetsPage, CalendarPage, etc.)



---

**Priority Tasks (Backend MVP)**

**Task 1: Assets Backend (File System + DB)**

* **Goal:** Allow users to upload, view, and delete images/videos permanently.
* **Files:** `packages/db/src/schema.ts`, `apps/electron/src/main/services/asset-manager.ts` (new), `ipc-handlers.ts`.
* **Acceptance Criteria:**
* `assets` table exists (id, filename, originalName, path, type, size, createdAt).
* Images uploaded via UI are physically saved to `app.getPath('userData')/assets`.
* IPC `upload-asset` returns the saved asset object.
* IPC `get-assets` supports pagination (`limit`, `offset`).
* IPC `delete-asset` removes both the DB record and the physical file.



**Task 2: Streaks & Stats Engine (Main Process Logic)**

* **Goal:** Replace frontend mocks with real SQL-aggregated data for the Header and Calendar.
* **Files:** `ipc-handlers.ts`, `apps/electron/src/main/services/stats-service.ts` (new).
* **Acceptance Criteria:**
* `get-dashboard-stats` returns real `currentStreak` (calculated in Node/SQL), `bestStreak`, `totalActivities`, and `totalEntriesMonth`.
* `get-calendar-month` returns entries organized by date for the calendar view.
* Logic defines "Active Day" as any day with > 0 entries.
* Performance is optimized (indexes on `date` columns).



**Task 3: Custom Trackers & Configuration**

* **Goal:** Full CRUD for custom trackers, supporting JSON configuration.
* **Files:** `packages/db/src/schema.ts`, `ipc-handlers.ts`.
* **Acceptance Criteria:**
* `trackers` table has a `config` JSON column properly typed.
* IPC `create-tracker` and `update-tracker` handle the config object (min/max/units/options).
* `entries` table supports flexible values (numeric `value` column + text `note` column).
* QuickEntry and Widgets render correctly based on the `type` stored in DB.



**Task 4: Reminders System (Cron & Notifications)**

* **Goal:** User receives native notifications based on scheduled times.
* **Files:** `packages/db/src/schema.ts`, `apps/electron/src/main/services/reminder-service.ts` (new).
* **Acceptance Criteria:**
* `reminders` table exists (id, title, time, days, enabled).
* Main process runs a `setInterval` (e.g., every 60s) to check active reminders.
* Triggers native Electron `Notification` when time matches.
* IPC handlers exist for `get-reminders`, `upsert-reminder`, `delete-reminder`.



---

**Recommended Execution Order**

1. **Block A: Data Foundations & Assets.**
* Update `schema.ts` with `assets` and `reminders` tables + `config` column in trackers.
* Run `pnpm db:generate`.
* Implement Asset Manager (FS logic) and wire IPC.
* Connect `AssetsPage` to `useQuery(['assets'])`.


2. **Block C (Stats Part): Real Data Wiring.**
* Implement the Streak calculation logic in Main.
* Wire `get-dashboard-stats` and `get-calendar-month`.
* Replace mocks in Header and CalendarPage with `useQuery(['stats'])`.


3. **Block C (Trackers Part): Custom Trackers.**
* Refine `create-tracker` IPC to handle complex config.
* Ensure QuickEntry UI adapts to the tracker config (e.g., showing a range slider if `type` is 'range').


4. **Block B: Reminders System.**
* Implement the Interval Loop in Main.
* Wire the IPCs.
* Connect the Notification Modal to `useQuery(['reminders'])`.


5. **Block D: Final Polish.**
* Review `lib/queries.ts` to ensure `invalidateQueries` is called correctly after mutations (e.g., uploading an asset invalidates `['assets']`).
* Verify all mocks are deleted.



---

**Instructions for Cursor**

* **Type Safety:** Always import shared types from `@packages/db/src/types.ts`. Do not duplicate interfaces in the Renderer.
* **Source of Truth:** The Drizzle Schema is the single source of truth. If you change the schema, ALWAYS run `pnpm --filter db db:generate` immediately.
* **State Architecture:**
* Use **TanStack Query** for anything that comes from the DB (Trackers, Entries, Assets, Reminders).
* Use **Zustand** ONLY for UI state (e.g., `isModalOpen`, `selectedTab`).


* **IPC Pattern:** Keep handlers in `ipc-handlers.ts`. Keep logic complex (like streak calculation or file system ops) in separate service files inside `apps/electron/src/main/services/`.
* **No New Libs:** Use standard Node.js APIs (`fs`, `path`) for file handling. Do not add libraries for things like date manipulation unless absolutely necessary (use native `Date` or `Intl` where possible).