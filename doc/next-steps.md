    # Próximos Pasos - Chimero

    ## ✅ Completado (Week 1 & 2)

    | Item | Estado |
    |------|--------|
    | Schema Drizzle: trackers, entries, tags, assets, settings | ✅ |
    | Drizzle + better-sqlite3 inicializado en Main (database.ts) | ✅ |
    | IPC handlers: getTrackers, createTracker, getEntries, addEntry | ✅ |
    | Tipos compartidos (Tracker, Entry) en packages/db | ✅ |
    | QuickEntry importa tipos desde @packages/db (vía store) | ✅ |
    | Dashboard widgets compatibles con schema Drizzle | ✅ |
    | Preload API con métodos tipados | ✅ |

    ## 📋 Pendiente para Week 3 (Dashboard & Visualización)

    - [ ] Conectar TanStack Query a IPC (reemplazar mock en store por datos reales)
    - [ ] Implementar dnd-kit para persistir layout de widgets en DB
    - [ ] Tabla `widgets` o `settings` para layout (posiciones)
    - [ ] Widgets: Mood Graph, Tasks virtualizado, Media lazy loading
    - [ ] Sistema de Themes (Dark/Low-contrast) en settings

    ## 📋 Pendiente para Week 4 (Analytics & Deploy)

    - [ ] Página de Estadísticas: correlaciones SQL, rachas
    - [ ] electron-builder configurado para .exe / .dmg
    - [ ] Backups automáticos locales
    - [ ] Tests E2E con Playwright

    ## 🔧 Migración UI → DB (Prioridad Alta)

    La UI sigue usando **mock data** en el store. Para conectar:

    1. En `store.ts`: sustituir `mockTrackers` / `mockEntries` por llamadas a `window.api.getTrackers()` y `window.api.getEntries()` (o TanStack Query).
    2. En `addEntry`: además del optimistic update local, llamar a `window.api.addEntry()` para persistir.
    3. Seed inicial: script para poblar la DB con trackers por defecto la primera vez.

    ## Backend – Current Status & Next Steps

    ### MVP – Done
    - **Assets:** Tabla `assets` (filename, originalName, path, type). Asset Manager en Main (saveFile, deleteFile). IPC: `upload-asset`, `get-assets`, `update-asset`, `delete-asset`, `open-file-dialog`. Protocolo `chimero-asset://` para cargar imágenes (path con `/`, sanitización y 404). AssetsPage conectada con TanStack Query; edición de nombre persistida.
    - **Streaks & Stats:** Servicio `stats-service.ts` con `getDashboardStats()` y `getCalendarMonth(year, month)` (entries por fecha con camelCase). IPC: `get-dashboard-stats`, `get-calendar-month`. Header y CalendarPage usan datos reales; día seleccionado muestra entradas reales.
    - **Custom Trackers:** `create-tracker` y `update-tracker` aceptan objeto `config` completo. IPC `reorder-trackers(ids[])`. Botones Edit/Delete en tarjetas clickables (z-index y pointer-events).
    - **Reminders:** Tabla `reminders` (time HH:MM, days JSON, enabled, lastTriggered). Servicio `reminder-service.ts` con loop cada 60s. IPC: `get-reminders`, `upsert-reminder`, `delete-reminder`, `toggle-reminder`. QuickEntry → Reminder tab llama `upsert-reminder`. NotificationsModal lista recordatorios; CalendarPage muestra indicador en días con recordatorios.

    ### Backend Integration & Bugfix – Resolved
    - **A. Assets Protocol:** Protocol handler `chimero-asset` sanitiza path (decode, normaliza `/`, bloquea `..`), resuelve bajo userData y devuelve 404 si no existe. Path en DB guardado con `/` (asset-manager).
    - **B. Assets Metadata:** IPC `update-asset(id, { originalName })`; modal Edit Asset con nombre editable y mutación que persiste.
    - **C. Custom Trackers UI:** Botones Edit/Delete con `relative z-10`, `pointer-events-auto` y `stopPropagation` para que sean clickables.
    - **D. Calendar Entries:** `getCalendarMonth` mapea filas con camelCase (dateStr, trackerId); día seleccionado muestra actividades reales.
    - **E. Reminders Lifecycle:** QuickEntry reminder submit llama `useUpsertReminderMutation`; listado en NotificationsModal; calendario con indicador de días con recordatorios.

    ### Calendar, Reminders & Assets Bugfix – Resolved (Feb 2025)
    - **Calendar Dot Logic (Purple):** Entries grouped by **local** date: `add-entry` now computes `dateStr` from local time (`getFullYear/getMonth/getDate`), and `getCalendarMonth` derives day from `dateStr.slice(8,10)` to avoid UTC-offset -1 day shift. Purple dot appears only on the correct day.
    - **Calendar Dot Logic (Yellow):** Reminders support one-off **date** (YYYY-MM-DD). Schema + migration `0004_reminders_date`. QuickEntry sends `date` for new reminders. Calendar shows yellow dot only on the specific date when `reminder.date` is set; recurring (no date) still uses `days` (weekday).
    - **Reminders Completed State:** Schema + migration `0005_reminders_completed_at`. IPC `complete-reminder(id)` and `uncomplete-reminder(id)`. `get-reminders` returns all (no filter). NotificationsModal: Pending = `completedAt == null`, Completed = `completedAt != null`; mark as done moves to Completed and persists in DB.
    - **Assets Protocol & Download:** Protocol handler uses `join(userDataPath, pathname)` and `normalize` for robust path resolution; full `decodeURIComponent` on pathname. IPC `download-asset(id, suggestedName)` saves file via system Save dialog (no `chimero-asset://` in system), avoiding ERR_UNEXPECTED on download. AssetsPage Download button calls `downloadAsset` IPC.

    ### Reminders, Assets & Sidebar Bugfix – Resolved
    - **Reminders missing `date` column:** Runtime fallback in `database.ts`: after `migrate()`, `ensureRemindersColumns()` runs PRAGMA table_info(reminders) and runs ALTER TABLE to add `date` and `completed_at` if missing, so existing chimero.db gets columns without user deleting the file. `reminder-service.ts` now handles one-off reminders (trigger only when `reminder.date === todayStr` in local time) and recurring (days/weekday).
    - **Assets broken image previews:** Protocol handler builds path with `join(userDataPath, ...pathname.split('/').filter(Boolean))` for correct resolution on all platforms; security check uses `baseDir + pathSep` so file must be under userData. Thumbnails in AssetsPage use same `assetUrl` from backend.
    - **Sidebar mocked streak:** Sidebar footer "Current Streak" now uses `useStats()` (same as CalendarPage); hardcoded "14" removed. Value matches Calendar quick stats.

    ### Pending / Post-MVP
    - Cloud backups, correlaciones SQL avanzadas, heatmaps anuales.
    - Tests E2E (Playwright).
    - Thumbnails/compresión para assets (sharp).
    - electron-builder: mover `electron` a devDependencies si falla el empaquetado.

    ## Tipos de Datos

    - **Tracker type mapping**: DB usa `numeric`/`range`/`text`; UI usa `counter`/`rating`/`list`. El mapper en `ipc-handlers.ts` traduce automáticamente.
    - **Reminders**: Tabla `reminders` con time (HH:MM), days (0–6), enabled; tipos en `@packages/db`.
