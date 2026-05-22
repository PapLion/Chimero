# Database Contracts

This file defines what the database owns in Chimero. It does not define UI behavior or tracker-specific product semantics; it describes durable local persistence and queryability.

## Database Role

Chimero uses local SQLite through Drizzle. The schema source of truth is `packages/db/src/schema.ts`.

Database owns:

- durable storage,
- relational integrity,
- queryable structure,
- indexes and foreign keys,
- migration history,
- cascade/set-null behavior defined by schema.

Database does not own:

- frontend display behavior,
- backend validation policy by itself,
- product meaning for vague tracker fields,
- computed response/read-model naming.

## Runtime Ownership

- `packages/db/src/database.ts`: shared DB connection helper.
- `apps/electron/src/main/database.ts`: Electron startup migrations, schema drift checks, reset/retry behavior, and default tracker seeding.
- `apps/web/server/db.ts`: local web runtime DB path and initialization.
- Renderer code must not access SQLite directly.

## Table Contracts

| Table | Purpose | Main producer | Main consumer | Contract relationship | Analytics/search/correlation support | Notes/gaps |
| --- | --- | --- | --- | --- | --- | --- |
| `settings` | Singleton app settings and dashboard layout JSON. | tracking/dashboard layout handlers | dashboard/home | Supports `DashboardLayoutItem[]` persistence. | Low | Layout JSON is app state, not tracker data. |
| `trackers` | Tracker definitions, config, order, favorite/custom/archive state. | tracking/custom tracker flows | all tracker surfaces | Maps to `Tracker` and `TrackerConfig`. | Medium | Defines what can be logged; does not store logged data. |
| `entries` | Generic tracker log records. | Quick Entry, Edit Entry, generic entry handlers, Weight base write | dashboard, tracker detail, calendar, stats | Maps to `Entry`, `BaseEntryRequest`, generic read models. | High | Main table for stats/calendar; `value`, `note`, and `metadata` semantics depend on tracker. |
| `reminders` | Reminder records, date/time/days, enabled/completed state. | reminder handlers, Quick Entry reminder mode | notifications/reminder UI/loop | Maps to `Reminder` and `ReminderInsert`. | Low/Medium | Not a tracker entry table. |
| `assets` | Local file metadata. | asset upload/contact/avatar flows | assets page, entry/contact surfaces | Maps to `Asset` / `AssetWithUrls`. | Medium | Files live on disk; DB stores references. |
| `tags` | Global tag records. | tag handlers/UI | Quick Entry, Entries, Calendar, future stats | Maps to `Tag`. | High | Backend active; UI coverage partial. |
| `entries_to_tags` | Many-to-many entry/tag join. | entry/weight write flows | entries, calendar, stats filters | Supports explicit `tagIds`. | High | Should be updated transactionally with entry writes. |
| `tag_relationships` | Parent/child tag relationships. | tag service | tag tree and inheritance resolution | Maps to `TagRelationship`, tag tree/inheritance responses. | Medium/High | Inheritance exists but is not automatically displayed everywhere. |
| `entry_weight` | Specialized Weight fields. | Weight service | Weight detail, stats, calendar enrichment | Maps to `WeightEntry` and Weight read models. | High | Reference specialized tracker table. |
| `tracker_goals` | Tracker goal records, currently used by Weight. | Weight goal service | Weight detail/stats | Maps to `TrackerGoal` and `TrackerGoalResponse`. | Medium | Dedicated goal UI remains a gap. |
| `asset_links` | General asset relation table. | future/general asset relation flows | limited current use | Maps to `AssetLink`. | Medium | DB_READY/PARTIAL; current tracker mutations mostly use `entries.assetId`. |
| `contacts` | Personal CRM profiles. | contacts page/handlers | contacts page, social flows | Maps to `Contact`, `ContactInsert`, `ContactUpdate`. | Medium | Supports avatar asset reference. |
| `contact_interactions` | Contact interaction history. | contact/social flows | contact profile/social summaries | Maps to `ContactInteraction`. | Medium | `entryId` is optional; Social entry linkage is partial. |

## Generic Entries

Generic tracker data belongs in `entries`:

- `trackerId`: which tracker owns the entry.
- `value`: scalar number when the tracker has a numeric/count/completion meaning.
- `note`: user text, title, label, context, or description.
- `metadata`: flexible JSON for generic/custom payloads.
- `assetId`: current single attachment reference.
- `timestamp`: exact event time.
- `dateStr`: normalized `YYYY-MM-DD` grouping key.

Generic entries are useful for fast logging, calendar, dashboard, and generic stats. They are not enough when a tracker needs reliable structured analytics.

## Metadata JSON Rules

`entries.metadata` is acceptable for:

- custom tracker payloads,
- temporary/future fields,
- display-only details,
- support data that does not need stable SQL filtering/grouping.

A field should become a structured column/table when it is needed for:

- stats,
- filtering,
- calendar grouping beyond base entry,
- correlation,
- search,
- historical query by field,
- specialized edit/read models.

Do not hide durable analytics fields only in metadata unless the tracker contract explicitly accepts that limitation.

## Specialized Tracker Tables

Specialized tables belong in DB when tracker semantics require structure. Current example:

- `entry_weight` stores Weight value/unit/waist/unit/body-fat column support linked one-to-one to `entries`.
- `tracker_goals` stores goal data currently consumed by Weight.

Non-Weight trackers are mostly generic today. Do not add specialized tables for Exercise, Diet/Food, Books, Gaming, TV, Media, or Tasks without confirmed contract/product scope.

## Junction And Relation Tables

- `entries_to_tags` links entries to explicit tags.
- `tag_relationships` supports parent/child tag inheritance.
- `asset_links` supports general asset relation concepts but is not the primary path for current single-entry attachments.
- `contact_interactions.entryId` can link interactions to entries, but current Social flow treats that linkage as partial.

## Delete / Cascade Expectations

- `entries_to_tags` cascades with entries/tags.
- `entry_weight` cascades with entries.
- `tracker_goals` cascades with trackers.
- `contacts.avatarAssetId` and `entries.assetId` use set-null style references.
- Service delete flows should still document what they remove explicitly and what they rely on schema to clean up.

## Migration And Drift Risks

- Schema changes require migrations under `packages/db/drizzle/*`.
- Electron startup handles migrations, drift checks, and reset/retry behavior.
- Any schema change can affect local user data; do not change schema for documentation-only or UI-only ideas.
- Web and Electron DB setup must stay aligned when both runtimes use the changed schema.

## Known Database Gaps

- `asset_links` is broader than current usage.
- Social interaction linkage to generic entries is partial.
- Non-Weight tracker-specific fields are mostly generic/metadata-based.
- Tag inheritance is structurally present, but surface consumption is partial.
