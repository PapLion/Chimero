# Chimero Habit Flow v1.0.0

A cyberpunk-themed, privacy-first habit and life tracking application built strictly as a local-first Electron desktop app. No cloud dependencies, no subscriptions. You own your data.

## Features
- **Customizable Trackers**: Numeric, Ratings, Text, and Boolean list trackers.
- **Bento Dashboard**: Drag-and-drop widget layout powered by `dnd-kit`.
- **Insight Lab**: A Correlation Engine that mathematically analyzes the relationships between your habits (e.g., does tracking "Reading" improve your "Mood"?).
- **Asset Manager**: Attach images and files directly to your entries, served locally.
- **Reminders**: Built-in cron system to ping you when it's time to log.

## Technology
- **Electron** for the desktop shell.
- **React & Tailwind CSS** for the high-end, cyberpunk-inspired UI.
- **SQLite + Drizzle ORM** for lightning-fast, highly reliable local storage.
- **TanStack Query** for robust data synchronization between the UI and IPC bridge.

## Setup
Install dependencies:
```bash
npm install
```
Run development server:
```bash
npm run dev
```

*Note: As of v1.0.0, the codebase relies completely on the local SQLite DB. All mock data systems have been fully excised.*
