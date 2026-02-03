# Estado de la Arquitectura - Chimero

**Última actualización:** Alineado con planificación Week 1–2.

## Diagrama de Arquitectura

```
┌─────────────────────────────────────────────────────────────────┐
│  Electron Main Process (Node.js)                                 │
│  ├── database.ts     → initDb(app.getPath('userData')/chimero.db)│
│  ├── ipc-handlers.ts → getTrackers, createTracker, getEntries,   │
│  │                     addEntry                                  │
│  └── SQLite (better-sqlite3) + Drizzle ORM                       │
└─────────────────────────────────────────────────────────────────┘
                              ▲
                              │ IPC (contextBridge)
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  Preload (Bridge)                                                │
│  └── api: { getTrackers, createTracker, getEntries, addEntry }   │
└─────────────────────────────────────────────────────────────────┘
                              ▲
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  Renderer (React + Vite)                                         │
│  ├── Zustand Store (mock data por ahora)                         │
│  ├── QuickEntry, BentoGrid, WidgetCard                           │
│  └── Tipos: Tracker, Entry desde @packages/db                    │
└─────────────────────────────────────────────────────────────────┘
```

## Esquema de Base de Datos (Drizzle)

| Tabla | Descripción |
|-------|-------------|
| `settings` | Tema, moneda, idioma (singleton) |
| `trackers` | Definición de qué rastreamos (tipo, icono, color, config JSON) |
| `entries` | Datos reales (trackerId, value, note, metadata, timestamp, dateStr) |
| `reminders` | title, time (HH:MM), date? (YYYY-MM-DD one-off), days (JSON 0–6), enabled, lastTriggered, completedAt?, trackerId opcional |
| `assets` | filename, originalName, path, type ('image'\|'video'), size, thumbnailPath |
| `tags` | Categorización transversal |
| `entries_to_tags` | Relación many-to-many |

### Tipos de Tracker (Schema)

- `numeric` → UI: counter
- `range` (max 5/10) → UI: rating
- `text` / `composite` → UI: list
- `binary` (futuro)

## Servicios (Main Process)

- **asset-manager.ts:** saveFile, deleteFile, getAssetAbsolutePath (userData/assets).
- **stats-service.ts:** getDashboardStats (rachas, totalActivities, totalEntriesMonth), getCalendarMonth.
- **reminder-service.ts:** setInterval 60s, notificación nativa o IPC on-reminder.

## Canales IPC

| Canal | Parámetros | Retorno |
|-------|------------|---------|
| `get-trackers` | - | Tracker[] |
| `create-tracker` | TrackerInsert | Tracker \| null |
| `update-tracker` | id, updates | Tracker \| null |
| `reorder-trackers` | ids[] | boolean |
| `get-entries` | { limit?, trackerId? } | Entry[] |
| `add-entry` | { trackerId, value?, note?, metadata?, timestamp } | Entry \| null |
| `get-dashboard-stats` | - | { currentStreak, bestStreak, totalActivities, totalEntriesMonth } |
| `get-calendar-month` | year, month | { year, month, entriesByDate, activeDays } |
| `get-reminders` | - | Reminder[] |
| `upsert-reminder` | { id?, title, time, date?, days?, enabled? } | Reminder \| null |
| `delete-reminder` | id | boolean |
| `toggle-reminder` | id, enabled | Reminder \| null |
| `complete-reminder` | id | Reminder \| null |
| `uncomplete-reminder` | id | Reminder \| null |
| `get-assets` | { limit?, offset? } | Asset[] (con assetUrl) |
| `upload-asset` | sourcePath | Asset \| null |
| `delete-asset` | id | boolean |
| `download-asset` | id, suggestedName | { ok, path? \| error?, canceled? } |
| `open-file-dialog` | { filters? } | { path: string \| null } |

## Definición de Tipos (packages/db)

```
packages/db/src/
├── schema.ts    # Drizzle schema (trackers, entries, tags, assets, settings)
├── types.ts     # Tracker, Entry, TrackerInsert, EntryInsert (shared)
├── database.ts  # initDb(), getDb() - SOLO Main process
└── index.ts     # Re-exports schema + types (safe for Renderer)
```

**Import rules:**

- **Renderer:** `import { Tracker, Entry } from '@packages/db'` (NO database.ts)
- **Main:** `import { getDb } from '@packages/db/database'`, `import { trackers, entries } from '@packages/db'`

## Stack
    
- **Electron** v40+
- **Vite** (build)
- **React** 19
- **Drizzle ORM** + **better-sqlite3**
- **Zustand** (estado UI)
- **Tailwind CSS** + Radix UI
- **pnpm** (monorepo)
