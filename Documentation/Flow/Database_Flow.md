# Database Flow

## Ownership

- `packages/db` owns schema and shared DB runtime helpers.
- `apps/electron/src/main/database.ts` owns Electron startup migrations, drift checks, reset/retry behavior, and seeding.
- `apps/web/server/db.ts` owns the local web runtime DB location and initialization.
- Renderers do not talk to SQLite directly.

## Electron Lifecycle

On startup, `setupDatabase()`:

- picks the migrations folder,
- initializes the DB,
- runs Drizzle migrations,
- repairs known reminder columns when needed,
- checks schema drift,
- hard-resets and reruns migrations if required,
- seeds default trackers.

## Other Storage

- Electron SQLite file: `userData/chimero.db`
- Electron assets: `userData/assets`
- Exercise cache: `userData/exercise-db-cache.json`
- Web local data: `apps/web/.data/`

## Tables

- `settings`
- `trackers`
- `entries`
- `reminders`
- `assets`
- `tags`
- `entriesToTags`
- `tagRelationships`
- `entryWeight`
- `trackerGoals`
- `contacts`
- `contactInteractions`

## Notes

- Tags and Weight are now backend/shared foundations, not just schema placeholders.
- Tags UI remains pending.
- Weight is the current reference specialized tracker.
