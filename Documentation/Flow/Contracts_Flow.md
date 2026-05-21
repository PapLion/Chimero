# Contracts Flow

## Purpose

Contracts are the practical agreement between Chimero surfaces, runtime APIs, backend services, database persistence, and shared read models. They exist so a developer can answer: "If this field is captured here, where is it validated, stored, computed, returned, and rendered?"

## Electron Path

1. Renderer calls `window.api`.
2. `window.api` is typed by `packages/shared/src/contracts/electron-api.ts`.
3. Preload forwards calls to `ipcRenderer.invoke`.
4. Main feature handlers call service/database logic.
5. DB rows are mapped into shared contract shapes.
6. React Query caches the result under keys in `renderer/src/shared/queries.ts`.
7. Surfaces render the mapped response.

## Web Path

1. Web renderer reuses the same app surfaces.
2. Runtime calls route through `renderer/src/shared/api.ts`.
3. Vite middleware handles `/api/*` in `apps/web/server/routes/api.ts`.
4. The web route layer maps local DB rows into the same shared contract family where implemented.

## Contract Categories

- Request contracts: what a surface may send.
- Response contracts: what backend returns.
- Surface read models: what a specific UI surface consumes.
- Deep/backend contracts: validation, normalization, persistence, query plans, metrics, response mapping.
- Persistence/database contracts: durable tables, columns, joins, indexes, cascade behavior.
- Validation rules: required fields, ranges, enums, related entity existence.
- Field semantics: what `value`, `note`, `metadata`, `tagIds`, `assetId`, `timestamp`, and `dateStr` mean for a tracker.
- Data quality rules: insufficient data, caveats, empty states, correlation confidence.
- Lineage/dependencies: captured field -> request -> DB -> response -> surfaces.
- Testing/debugging contracts: sample payloads, expected query invalidations, unit tests for shared domain helpers.

## Shared Source of Truth

- `packages/shared/src/contracts`: app-facing types and `ElectronApi`.
- `packages/shared/src/features`: feature-specific response/request types.
- `packages/shared/src/domain`: pure calculations for streaks, calendar enrichment, tags, and Weight.
- `packages/db/src/schema.ts`: persistence source of truth.
- `Documentation/7_Contratcs.md`: master contract index/alignment guide.
- `Documentation/Contracts/Trackers/*.md`: tracker-specific surface/deep/persistence/input-output details.

## Common Data Paths

- Home dashboard: trackers, entries, assets, dashboard layout, stats, and Weight detail when needed.
- Quick Entry: trackers, quick-entry context, assets, reminders, contacts, exercises, tags, and Weight submit contracts.
- Calendar: entries, reminders, trackers, Weight enrichment, and tag IDs.
- Contact profile: contacts, interaction history, assets.
- Insight Lab: trackers and correlation/impact calculations.
- Tracker Detail: generic entries plus tracker-specific read models where implemented.

## What Can Go Wrong

- A tracker contract says a field exists but `packages/shared` has no request/response type for it.
- A frontend surface expects resolved tags/assets but backend only returns IDs.
- A DB field exists but no mapper/read model exposes it.
- A future idea is documented as required implementation.
- A contract duplicates tracker details in too many places and drifts.

## Notes

- The renderer should not reach into SQLite directly.
- Future specialized tracker work should start from the tracker contract file, then shared contracts/domain, then backend service, then frontend surfaces.
- Do not add auth, cloud governance, billing, external analytics, or enterprise SLA theory unless runtime/product scope changes.
