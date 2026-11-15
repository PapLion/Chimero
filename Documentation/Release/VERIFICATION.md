# Release verification — 2026-11-14

Verified locally on the Linux host, Node 22.16.0 and pnpm 10.28.2:

| Check | Result |
|---|---|
| TypeScript, Electron and web | Passed |
| ESLint, zero-warning threshold | Passed |
| Unit tests using Electron native ABI | 63 files, 184 tests passed |
| Disposable SQLite migration upgrades | All 11 historical migration paths passed; reopen, update, cascade deletion and integrity checked |
| Electron production build | Passed |
| Web production build | Passed; bundle-size warning remains |
| Real Electron E2E | Passed: custom tracker and entry CRUD, saved layout, full restart, persisted reads and Calendar navigation |
| Portfolio | Eight authentic Electron captures with synthetic persisted data |

Tests use a separate disposable profile. SQL migration verification checks the SQL upgrade paths, not every possible damaged user database. The current startup repair is additive and fails closed on unknown incomplete schemas.

## Implementation reality

- Implemented and tested paths include structured Weight, Books, Gaming, Social, Exercise, Health and Intake domain/service behavior. Existing tests cover selected tracker-specific forms, histories and edits; this is not exhaustive manual certification.
- Dashboard, Quick Entry, Calendar, contacts and custom tracker management are implemented. This release fixes sidebar collapse, loading/error recovery, keyboard focus and stale form/chart dependencies.
- Broken behaviors corrected: destructive schema recovery, timezone-sensitive correlation pairing, overwritten daily samples and invented impact/confidence without a baseline.
- Partial: custom trackers remain generic/configurable rather than a full schema designer; timeline is not an item-level era system; broad entity/tag analytics and global arbitrary queries remain incomplete.
- Historical “Weight only” specialization claims are obsolete. Cloud billing/authentication and an AI chatbot are outside the product scope.

## Limits

No Windows installer startup, platform notification delivery, comprehensive accessibility audit, long-term performance benchmark or exhaustive manual tracker matrix was verified. Unit tests still emit some existing Radix dialog-description and jsdom chart-size warnings. These do not fail tests but warrant follow-up. Statistical confidence is a heuristic, not a validated scientific significance measure.

See the portfolio demo documentation for reproducible launch and package commands. Do not infer production certification from these checks.

## Packaged Linux follow-up

Rebuilt `dist/linux-unpacked` and launched its actual `chimero-electron` executable through Playwright. The same CRUD/layout/restart test passed (8.5 seconds total). This verifies unpacked Linux startup on this host, not an installer or all Linux distributions. Added viewport checks at 1280×720, 1440×900 and 1920×1080: navigation visible, no document-level horizontal overflow, Quick Entry opens and closes. This is a focused responsive smoke check, not exhaustive visual certification.

Reproduce from `chimero-habit-flow/`:

```sh
pnpm build
pnpm exec electron-builder --linux dir --publish never
CHIMERO_TEST_EXECUTABLE="$PWD/dist/linux-unpacked/chimero-electron" pnpm test:e2e
```

Demo source now records explicit zero-activity days to form a legitimate synthetic baseline; missing observations are still treated as unknown by the application.
