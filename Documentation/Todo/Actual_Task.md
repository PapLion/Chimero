# Typecheck Baseline Cleanup

## Completed
- Made the Electron and Web typecheck baseline pass.
- Fixed narrow renderer, preload, shared contract, and UI package typing debt found by `pnpm check-types`.
- Preserved Weight behavior and did not add tracker features, schema changes, migrations, or fake data.
- Ran the requested verification sequence.

## Fixed Typecheck Areas
- Contacts: Moved trait keys out of typed component props by rendering `SortableTrait` with `createElement`.
- BentoGrid: Rendered `WidgetCard` with `createElement` so React `key` is not treated as part of `WidgetCardProps`.
- Notifications: Narrowed reminder action before reading `id`, typed modal open state through restored React UI package types, and normalized nullable tracker colors before passing them to style props.
- Tracker config/color: Updated tracker create/update contract boundaries to use `TrackerConfig` instead of `Record<string, unknown>`, and normalized nullable custom tracker colors at the style boundary.
- Other: Added React type dev dependencies to `@chimero/ui` for cross-package typechecking and typed the shared Button component's dynamic element boundary.

## Documentation Sync
- Updated `Documentation/7_Contratcs.md` so it no longer describes implemented Weight waist, entries, statistics, BentoGrid, calendar enrichment, and edit support as gaps.
- Kept honest remaining gaps: tag labels/chips incomplete, tag picker UI incomplete, Calendar inline asset rendering pending, waist statistics threshold undefined, body fat optional/future only, and planned trackers still needing deeper contracts.

## Still Pending
- Tag picker/display in Quick Entry, Entries, Calendar, and Edit Entry.
- Named tag chips once tag labels are safely available to those surfaces.
- Dedicated Weight goal editing UI.
- Calendar inline asset rendering for selected-day summaries.
- Defined waist statistics sample threshold.
- Deeper/surface contracts for planned trackers.

## Verification
- `pnpm check-types`: passed.
- `pnpm test -- --reporter=verbose --pool=forks --poolOptions.forks.singleFork=true`: passed, 10 test files / 30 tests.
- `pnpm build`: passed.
- `pnpm build:web`: passed with warnings only: Node 22.11.0 is below Vite's 22.12+ recommendation, and one web chunk exceeds 500 kB.
