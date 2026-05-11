# Database Structure

## Packages

- `packages/db/src/schema.ts`: SQLite/Drizzle schema.
- `packages/db/src/database.ts`: DB connection helper.
- `packages/db/src/index.ts`: schema/runtime exports.
- `packages/db/src/types.ts`: shared contract re-exports.

## Electron Bootstrap

- `apps/electron/src/main/database.ts` runs migrations, checks drift, seeds defaults, and repairs known reminder columns when needed.

## Web Runtime

- `apps/web/server/db.ts` initializes the local web DB and runtime data directory.
- `apps/web/.data/` is local generated data and should stay ignored.

## Table Map

- `settings`: preferences and dashboard layout.
- `trackers`: tracker definitions.
- `entries`: generic tracker data points.
- `reminders`: reminder records.
- `assets`: local file metadata.
- `tags`: tag records.
- `entriesToTags`: entry/tag many-to-many join.
- `tagRelationships`: tag parent/child relationships.
- `entryWeight`: specialized Weight entry data.
- `trackerGoals`: tracker goal records.
- `contacts`: personal CRM records.
- `contactInteractions`: contact interaction history.

## Notes

- DB rows are mapped to shared contracts before renderer use.
- This cleanup does not alter schema or migrations.
