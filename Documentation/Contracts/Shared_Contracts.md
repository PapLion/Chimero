# Shared Contracts

## Source of Truth

- `packages/shared/src/contracts` holds app-facing contracts.
- `packages/shared/src/features/*` holds feature-specific shared types.
- `packages/shared/src/domain` holds pure domain logic.
- `packages/db/src/types.ts` re-exports shared app contracts at the DB package boundary.

## App-Level Contracts

- Trackers: `Tracker`, `TrackerConfig`, `TrackerInsert`
- Entries: `Entry`, `EntryInsert`, `BaseEntryRequest`
- Reminders: `Reminder`, `ReminderInsert`
- Assets: `Asset`, `AssetWithUrls`
- Contacts: `Contact`, `ContactInsert`, `ContactUpdate`, `ContactInteraction`, `ContactInteractionInsert`
- Tags: `Tag`, `TagRelationship`, resolved tag tree/inheritance responses
- Weight: `CreateWeightEntryRequest`, `UpdateWeightEntryRequest`, `WeightEntry`, `WeightDetailResponse`, `WeightEntryResponse`, `TrackerGoal`

## Feature Contracts

- Dashboard: layout item and dashboard stats.
- Calendar: month data and enriched day entries.
- Tracking: impact/correlation result contracts.
- Stats: deterministic local summary contracts.
- Exercises: exercise record and exercise DB status snapshot.

## Pure Domain Logic

- `domain/streak.ts`: shared streak calculations.
- `domain/calendar.ts`: enriched calendar day entry builder.
- `domain/tags.ts`: tag tree and inherited tag resolution.
- `domain/weight.ts`: Weight detail calculations and Weight read-model builders.

## Notes

- Shared contracts should describe current behavior or explicit future/gap state.
- Product ideas that lack runtime support should not be documented as implemented contracts.
