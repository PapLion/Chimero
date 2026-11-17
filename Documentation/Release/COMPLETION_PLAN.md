> Superseded by [V2_PLAN.md](V2_PLAN.md) and [READINESS_CHECKLIST.md](READINESS_CHECKLIST.md). Kept as the record of the 14 November scope.

# Portfolio completion — 14 November 2026

## Scope and evidence

The existing Electron application remains the product. Preserve its local SQLite data, typed IPC, specialized trackers and renderer. Historical audit claims are hypotheses, not an implementation backlog.

Source inspection contradicts the older “Weight only” specialization inventory: main/features contains books, food, gaming, health, intake and workouts services; shared domain/read-model tests and incremental migrations exist. Social lifecycle and structured edit tests also exist. Their presence is implementation evidence, not yet runtime proof.

## Priorities

1. Prevent destructive database recovery: startup currently deletes the database when selected columns are absent. Replace with safe repair or fail closed; verify preservation with disposable databases.
2. Correct Insight Lab date handling and cohort calculations: local dates, multiple readings per day and missing baselines must not manufacture confidence.
3. Preserve and refine the existing dark visual language: functional sidebar collapse, keyboard navigation, contrast, loading/error recovery and responsive spacing across surfaces.
4. Add the missing real Electron E2E suite, isolated synthetic demo profile and reproducible captures. Existing Playwright configuration points at an absent tests/e2e directory.
5. Run types, lint, unit tests, production builds, migration and restart checks; package locally when supported. Record failures and limitations without equating compilation with platform certification.
6. Deliver demo-safe screenshots, English case study and setup instructions. Do not republish client context or personal assets.

## Boundaries

Custom trackers remain configurable generic trackers; a full schema designer is a separate expansion. Item-level timeline eras, unrestricted arbitrary statistical queries and universal entity/tag analytics are not required for this focused release. No SaaS, AI service, new cloud dependency or replacement application.

## Design decision

Refine the existing restrained dark interface and its reusable tokens rather than introduce another component system. Daily logging remains Home; tracker pages remain deeper review. Empty, error and insufficient-data states must tell the truth. Portfolio imagery must come from the running Electron app and persisted synthetic records.
