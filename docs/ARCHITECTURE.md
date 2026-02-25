# Chimero Habit Flow v1.0.0 - Architecture

## Core Stack
- **Desktop Framework**: Electron (IPC for communication)
- **Database**: SQLite (via `better-sqlite3` and `drizzle-orm`)
- **Frontend**: React 18, TypeScript, Tailwind CSS
- **Data Fetching**: TanStack React Query

## Key Components

### 1. Main Process (Backend)
- **Database (`database.ts`)**: Handles SQLite initialization and Drizzle schema (trackers, entries, settings, assets, reminders).
- **IPC Handlers (`ipc-handlers.ts`)**: The bridge between React and SQLite. Exposes typed API methods.
- **Services**:
  - `stats-service.ts`: Powers the Dashboard and Correlation Engine.
  - `reminder-service.ts`: Runs a cron loop to trigger notifications.
  - `asset-manager.ts`: Handles file uploads to `userData/assets` and protocol `chimero-asset://`.

### 2. Preload Script
- Exposes `window.api` with strictly typed methods (no `any` types), providing a secure sandbox.

### 3. Renderer Process (Frontend)
- **Queries (`queries.ts`)**: React Query hooks wrapping the exposed `window.api` calls, providing caching, optimistic updates, and background refetching.
- **Store (`store.ts`)**: Zustand for global UI state (e.g., `commandBarOpen`, `activeTracker`), replacing all mock data with real DB states.
- **Widgets System**: `dnd-kit` powered Bento Grid layout, persisted via database settings.
- **Correlation Engine (`StatsPage`)**: The "Insight Lab" analyzes habits, providing statistical impact tracking dynamically.

## Data Flow
Renderer (React Query) -> Preload (window.api) -> Main (IPC Handlers) -> Services / SQLite -> Return to Renderer.

No old tech stacks or mock data exist in this v1.0.0 setup.
