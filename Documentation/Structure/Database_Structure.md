# Database Structure

## Packages

- `chimero-habit-flow/packages/db/src/schema.ts`: SQLite/Drizzle schema.
- `chimero-habit-flow/packages/db/src/database.ts`: DB connection helper.
- `chimero-habit-flow/packages/db/src/index.ts`: schema/runtime exports.
- `chimero-habit-flow/packages/db/src/types.ts`: shared contract re-exports.
- `chimero-habit-flow/packages/db/drizzle/*`: migration files and snapshots.

## Electron Bootstrap

- `chimero-habit-flow/apps/electron/src/main/database.ts` runs migrations, checks drift, seeds defaults, and repairs known reminder columns when needed.
- Startup owns schema readiness before feature handlers are useful.

## Web Runtime

- `chimero-habit-flow/apps/web/server/db.ts` initializes the local web DB and runtime data directory.
- `chimero-habit-flow/apps/web/.data/` is local generated data and should stay ignored.

## Table Map

| Table | Current status | Purpose |
| --- | --- | --- |
| `settings` | ACTIVE | Preferences and dashboard layout. |
| `trackers` | ACTIVE | Tracker definitions and config. |
| `entries` | ACTIVE | Generic tracker data points. |
| `reminders` | ACTIVE | Reminder records and completion state. |
| `assets` | ACTIVE | Local file metadata. |
| `tags` | BACKEND ACTIVE / UI PARTIAL | Tag records. |
| `entries_to_tags` | ACTIVE | Entry/tag many-to-many join. |
| `tag_relationships` | BACKEND ACTIVE / UI PARTIAL | Parent/child tag relationships. |
| `entry_weight` | ACTIVE SPECIALIZED | Weight-specific entry data. |
| `tracker_goals` | ACTIVE FOR WEIGHT | Tracker goal records. |
| `asset_links` | DB_READY / PARTIAL | General asset relation table; current tracker flows mostly use single `assetId`. |
| `contacts` | ACTIVE | Personal CRM records. |
| `contact_interactions` | ACTIVE / PARTIAL | Contact interaction history with optional entry link. |

## Schema Rules

- Store queryable tracker facts in columns/tables, not hidden JSON, when they drive stats, search, graphs, calendar, or correlations.
- Use `entries.metadata` for generic/custom data only when the field is not yet a stable analytics contract.
- Keep `entries.timestamp` as exact event time and `entries.dateStr` as normalized `YYYY-MM-DD` grouping key.
- Specialized tracker tables must link back to `entries`.
- Junction tables such as `entries_to_tags` should be updated transactionally with their base entry writes.

## Where To Add Schema

- Add schema in `packages/db/src/schema.ts`.
- Add migrations under `packages/db/drizzle/*`.
- Add shared app-facing types under `packages/shared/src/contracts` or `packages/shared/src/features`.
- Add backend mappers when DB shape differs from response shape.

## Where Not To Add Schema

- Do not add schema just because a UI wants a label; first confirm the field is durable/queryable.
- Do not add body measurements, finance ledgers, workout sets, or media catalogs unless a tracker contract/product requirement makes them current scope.
- Do not treat `metadata` as a substitute for a required structured analytics field.

## Notes

- DB rows are mapped to shared contracts before renderer use.
- This document is a structure guide; it does not replace the schema file as source of truth.
