# Database Contracts

`packages/db/src/schema.ts` is the schema source. App-facing shapes are mapped into `packages/shared` contracts before reaching the renderer.

## Core Tables

- `settings`: global preferences and persisted dashboard layout.
- `trackers`: tracker definitions, config, order, favorite state, archive state, and custom/default status.
- `entries`: generic tracker entries with value, note, metadata, optional asset, timestamp, and normalized `dateStr`.
- `reminders`: reminder records, one-off dates, recurring weekdays, enabled/completed state, and trigger timestamps.
- `assets`: local asset metadata; files live under the runtime asset directory.
- `contacts`: personal CRM records.
- `contactInteractions`: interaction history linked to contacts and optionally entries.

## Tags Foundation

- `tags`: global tag records.
- `entriesToTags`: many-to-many entry/tag join table.
- `tagRelationships`: parent/child tag relationships used for inheritance and tree building.

Backend and web routes can create/update/delete tags, replace entry tags, build tag trees, and resolve inherited tags. Full user-facing tag picker/chip UI remains pending.

## Weight Foundation

- `entryWeight`: specialized one-to-one row for Weight entries.
- `trackerGoals`: tracker goal records used by Weight detail calculations.

Weight writes store both:

- generic data in `entries` for broad app surfaces, and
- specialized data in `entryWeight` for exact Weight history, chart, and stats contracts.

## Runtime Ownership

- `packages/db/src/database.ts` owns the shared DB connection helper.
- `apps/electron/src/main/database.ts` owns Electron startup migration, drift checks, reset/retry behavior, and default tracker seeding.
- `apps/web/server/db.ts` owns the web runtime database path and local web DB initialization.

## Notes

- The renderer does not access SQLite directly.
- DB rows should be mapped to shared contracts before crossing Electron IPC or web API boundaries.
- This cleanup does not add schema, migrations, or behavior.
