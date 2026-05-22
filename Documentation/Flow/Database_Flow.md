# Database Flow

## Ownership

- `packages/db` owns schema and shared DB runtime helpers.
- `apps/electron/src/main/database.ts` owns Electron startup migrations, drift checks, reset/retry behavior, and default tracker seeding.
- `apps/web/server/db.ts` owns the local web runtime DB location and initialization.
- Renderers do not talk to SQLite directly.

## Electron Lifecycle

On startup, `setupDatabase()`:

- chooses the migrations folder,
- initializes the SQLite DB,
- runs Drizzle migrations,
- repairs known reminder columns when needed,
- checks schema drift,
- hard-resets and reruns migrations if required,
- seeds default trackers.

## Other Storage

- Electron SQLite file: `userData/chimero.db`.
- Electron assets: `userData/assets`.
- Exercise cache: `userData/exercise-db-cache.json`.
- Web local data: `apps/web/.data/`.

## Tables

| Table | Purpose | Main producers | Main consumers | Notes |
| --- | --- | --- | --- | --- |
| `settings` | Preferences and dashboard layout. | tracking handlers | dashboard | Stores dashboard layout JSON. |
| `trackers` | Tracker definitions. | tracking/custom tracker flows | all tracker surfaces | Core tracker registry. |
| `entries` | Generic tracker data points. | Quick Entry/edit | dashboard/detail/calendar/stats | Main logging table. |
| `reminders` | Reminder records. | reminder flows | notifications/reminder loop | Active. |
| `assets` | Local file metadata. | asset upload/avatar flows | assets, entries, contacts | Files live on disk. |
| `tags` | Tag records. | tag handlers/UI | Quick Entry, entries, future stats | Backend active. |
| `entries_to_tags` | Entry/tag many-to-many join. | entry/weight writes | entries, calendar, stats filters | Queryable tag linkage. |
| `tag_relationships` | Parent/child tag relationships. | tag service | tag tree/inheritance | Backend active. |
| `entry_weight` | Specialized Weight fields. | weight service | Weight detail/calendar | Reference specialized tracker table. |
| `tracker_goals` | Tracker goals, currently used by Weight. | weight goal service | Weight detail/stats | Active for Weight. |
| `asset_links` | General asset relation table. | schema/future flows | limited current use | DB_READY/PARTIAL. |
| `contacts` | Personal CRM records. | contact profile | contacts/social | Active. |
| `contact_interactions` | Interaction history for contacts. | contact/social flows | contacts/social | Entry linkage is partial. |

## Database Responsibility Boundary

Database owns:

- durable storage,
- relational integrity,
- queryable structure,
- indexes and foreign keys,
- migration history.

Database does not own:

- UI formatting,
- product semantics by itself,
- computed read model naming,
- whether a future tracker feature should exist.

## Generic vs Specialized Persistence

- Generic trackers usually use `entries.value`, `entries.note`, `entries.metadata`, `entries.assetId`, and `entries_to_tags`.
- Specialized trackers use extra tables when fields must be queryable or analytically reliable.
- Weight is the current reference specialized tracker with `entry_weight` and `tracker_goals`.
- Exercise, Diet/Food, Books, Gaming, Media/TV, and Tasks mostly remain generic unless their tracker docs explicitly mark a future specialized table.

## What Can Go Wrong

- A queryable field is hidden in JSON metadata and later cannot support stats/search/correlation well.
- A migration/schema drift reset risks local data.
- A delete path removes the base entry but not related rows, or assumes cascade without documenting it.
- `dateStr` is not generated consistently from `timestamp`.
- Web and Electron DB initialization diverge.

## Notes

- Tags and Weight are backend/shared foundations, not just schema placeholders.
- Tags UI is partial; do not assume every surface resolves inherited tags.
- This documentation describes schema ownership only; it does not change schema or migrations.
