# Chimero 2 — rebuild plan and decision log

Branch: `feat/chimero-2` (from `feat/portfolio-release` @ d74455a + checkpoint dffb8b2).
Toolchain: Node 22 (`~/.local/share/chimero-node/node-v22.16.0-linux-x64/bin`), pnpm 10.28.2.
This file is the resume point: update the checklist as work lands.

## Product definition

Chimero is a local-first desktop app for recording many kinds of personal data
(weight, mood, training, food, symptoms, people, reading, play, custom variables),
arranging it on a dashboard the user composes, and exploring how those records
relate over time. No cloud, no accounts, no generative AI.

## Decisions

| # | Decision | Why |
|---|---|---|
| D1 | Keep main-process services, SQLite schema, shared domain (187 passing tests). | Structured persistence per tracker is real and tested; rewriting it buys nothing. |
| D2 | Rebuild the renderer from scratch (new shell, design system, dashboard, pages). | Old renderer: 2k-line components, fixed bento, "Soon" tabs, heuristics presented as stats. |
| D3 | Own grid layout engine (pure functions + pointer-driven canvas). | Deterministic, unit-testable collision/compaction; keyboard moves; no React-19 dependency risk. |
| D4 | New analytics engine: every tracker exposes daily *metrics*; correlation = Pearson/Spearman + group comparison with n, p-value, missing≠zero semantics. Replaces `calculate-impact` "% change / confidence" heuristic. | Insight Lab must be mathematically honest and work for custom variables. |
| D5 | Remove `apps/web` (duplicate 3.3k-line HTTP backend). | Desktop is the product; a second backend doubles every change and was already drifting. |
| D6 | Custom trackers get configurable fields + templates (Sleep, Meditation, Water…). | Client-requested trackers arrive through the generic system, not hardcoding. |
| D7 | Additive migrations only (0011+). Old `dashboard_layout` JSON is upgraded on read. | Never reset user databases. |
| D8 | Linux/macOS userData = Electron default; Windows keeps `%LOCALAPPDATA%/Chimero`. | Old fallback resolved to the *current working directory* off Windows. |
| D9 | Dark-first "Nocturne" identity (aubergine ink + iris violet), light theme available; Bricolage Grotesque + Instrument Sans bundled locally. | Keeps the client-approved dark/purple identity, drops the generic SaaS look. |
| D10 | Settings/data: units, theme, week start, JSON export, CSV export, DB backup/restore. | A local-first product must let users get their data out. |
| D11 | Async service transactions go through `transact()` (BEGIN IMMEDIATE / COMMIT / ROLLBACK, queued) rather than rewriting every service synchronously. | better-sqlite3 rejects promise-returning transaction callbacks; every structured write was failing at runtime while mocked unit tests passed. |
| D12 | Structured writes are covered by integration tests on real SQLite (`attachDb` + in-memory DB); tests are type-checked by `pnpm check-types`. | The mocks hid D11's bug; untyped test fixtures had drifted from the contracts. |
| D13 | Bundle a slimmed public-domain exercise catalogue (free-exercise-db, 876 entries, Unlicense) in `resources/`; rank everyday variants of common lifts first. | Search must work offline and on first launch; no runtime download. |
| D14 | The pattern scan controls the false-discovery rate (Benjamini–Hochberg, 5%) over every comparison, needs 14+ shared days, never compares a tag with counts/flags of the trackers it labels, and lists findings that carry the same information once. | ~5,000 tests at p ≤ 0.05 produced chance hits and tautologies ("Tagged ice cream" vs "Ate Ice cream"). |
| D15 | Reading-type trackers show the fitted trend over the period, not last minus first. | One noisy reading at either end decided the old number and could contradict the per-week trend. |
| D16 | Before pending migrations run on an existing database, write a consistent copy with `VACUUM INTO` to `backups/before-upgrade-*.db` (newest five kept, nothing else deleted). | Migrations are transactional, but a successful-yet-wrong upgrade must still be recoverable. |
| D17 | Cross-platform packages get the official prebuilt better-sqlite3 for the target via an `afterPack` hook; the Windows installer is built on Windows in CI. | A Windows build made on Linux shipped Linux's native module and would fail on first database call. |
| D18 | The portfolio showcase is seeded through `window.api` into an isolated, marker-guarded profile; screenshots are captures of the running app. | Real data paths, reproducible images, no fabricated screens, no personal data. |
| D19 | Requirements were taken from the repository's own documents; the Notion workspace they reference was not available in this environment. | Work from what can be read and cited. |

## Checklist

State on 2026-11-17, branch `feat/chimero-2`. `[x]` done and verified, `[~]` done with a stated limit.

### Backend
- [x] B1 remove apps/web, fix userData path, window-control IPC
- [x] B2 migration 0011: `settings.preferences` JSON; settings IPC
- [x] B3 dashboard layout v2 contract + IPC + legacy upgrade (E2E: old array layout upgraded)
- [x] B4 analytics: stats math, metric catalogue, daily series, pair analysis, FDR-controlled scan + tests
- [x] B5 entries range query; tracker archive/restore; identity from config
- [x] B6 custom tracker fields + templates
- [x] B7 JSON/CSV export, backup, restore (E2E across a restart)
- [~] B8 reminders: due logic fixed and unit-tested; OS notification delivery not verified
- [x] B9 `transact()` for async service transactions; integration tests on real SQLite
- [x] B10 copy before upgrading; E2E upgrade from the last release's database

### Renderer
- [x] R1 tokens, fonts, primitives (button, field, dialog, menu, tabs, toast)
- [x] R2 shell: title bar, sidebar, date context, command palette, shortcuts
- [x] R3 dashboard grid engine + widget registry + edit mode + persistence (E2E drag/resize/restart)
- [x] R4 Quick Entry: all tracker kinds, recents, context-aware, keyboard-only scales, Enter to save
- [x] R5 tracker pages per kind with ranges, stats, history CRUD
- [x] R6 Journal: month calendar, day list, month list
- [x] R7 Insights: pair analysis with lags, plain-language result, scan, pin to Today
- [x] R8 People (contacts CRM with nudges and custom sections)
- [x] R9 Tags with parent groups
- [x] R10 Trackers manager + custom tracker builder
- [x] R11 Reminders, Files, Settings

### Release
- [x] V1 unit + integration tests (38 files, 171 tests); tests type-checked
- [x] V2 Electron E2E: UI CRUD, restart persistence, grid drag/resize persistence, upgrade, backup/restore
- [x] V3 lint, types, build; Linux AppImage and Windows NSIS built; E2E passes on both packaged apps (local + CI run 44144485652)
- [x] V4 synthetic showcase profile + 12 reviewed screenshots, WebP versions, hero/OG image
- [x] V5 case study, demo guide, README, verification report

## Known limits

- Windows: the packaged app passes the E2E suite in CI (run 44144485652); the NSIS install/uninstall wizard has not been exercised by hand.
- Reminder notifications depend on the OS notification service; only the due-time logic is tested.
- `Documentation/` and `docs/Client-Requeriments/` hold client-context material: keep them out of anything published without the client's approval.
- Renderer bundle ~1.5 MB JS (local load, not split).
