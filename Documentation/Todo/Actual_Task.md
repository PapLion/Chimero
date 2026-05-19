# Tags Surface Contract Milestone

## Completed

- Explicit entry tags are selectable and creatable from Quick Entry.
- Explicit entry tags are selectable, creatable, replaceable, and clearable from Edit Entry.
- Generic, exercise, and Weight creation flows pass `tagIds`.
- Generic and Weight update flows pass replacement `tagIds`.
- Entries tab renders explicit tag chips from persisted `tagIds`.
- Calendar selected-day summary renders explicit tag chips from persisted `tagIds`.
- Tag persistence remains in `entries_to_tags`; no schema change was introduced.
- Browser smoke verified Quick Entry creation, Edit Entry tag replacement, Entries chips, and Calendar selected-day chips.

## Partial

- Suggested tags are available in Quick Entry context, but ranking remains based on current usage count only.
- Weight mutation responses can resolve tags, while most read surfaces use `tagIds` plus the shared tag list.
- Calendar selected-day cards show tag chips but still do not render entry assets inline.

## Still Missing

- Inherited tag expansion in entry surfaces is not automatic and remains opt-in/future.
- Tag-based Statistics and BentoGrid aggregation are not part of this milestone.
- Tag management UX beyond create/select/clear is not included here.

## UI Surfaces Updated

- Quick Entry: added explicit tag selector/create flow and submits selected `tagIds`.
- Edit Entry: initializes from `entry.tagIds`, supports tag creation, and submits replacement `tagIds`.
- Entries: renders resolved explicit tag chips for visible entry rows.
- Calendar: renders compact explicit tag chips in selected-day entry cards.

## Backend/API Changes

- No backend/schema changes were made by this worker.
- Existing API support for `tagIds`, `createTag`, `replaceEntryTags`, entry reads, Weight reads, and Calendar reads is the contract used by the updated surfaces.

## Known Gaps

- Tag chips only render tags that resolve from the current tag list; unknown IDs are ignored.
- Inherited tags are not shown unless a future read model requests them.
- Statistics, correlations, and home widgets do not yet summarize by tag.

## Next Step

- Decide whether inherited tags should remain explicit-only or get a separate opt-in display mode.
