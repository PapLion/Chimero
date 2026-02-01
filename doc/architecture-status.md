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
| `assets` | Archivos locales (filename, path, thumbnail) |
| `tags` | Categorización transversal |
| `entries_to_tags` | Relación many-to-many |

### Tipos de Tracker (Schema)

- `numeric` → UI: counter
- `range` (max 5/10) → UI: rating
- `text` / `composite` → UI: list
- `binary` (futuro)

## Canales IPC

| Canal | Parámetros | Retorno |
|-------|------------|---------|
| `get-trackers` | - | Tracker[] |
| `create-tracker` | TrackerInsert | Tracker \| null |
| `get-entries` | { limit?, trackerId? } | Entry[] |
| `add-entry` | { trackerId, value?, metadata?, timestamp } | Entry \| null |

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
