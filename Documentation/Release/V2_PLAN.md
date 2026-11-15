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

## Checklist

### Backend
- [ ] B1 remove apps/web, fix userData path, window-control IPC
- [ ] B2 migration 0011: `settings.preferences` JSON; settings IPC
- [ ] B3 dashboard layout v2 contract + IPC + legacy upgrade
- [ ] B4 analytics: shared stats math, metric catalog, daily series, correlate, scan + tests
- [ ] B5 entries range query; tracker archive/restore; identity from config
- [ ] B6 custom tracker field config + templates
- [ ] B7 data export / backup / restore
- [ ] B8 reminders: verify notification loop

### Renderer
- [ ] R1 tokens, fonts, primitives (button, field, dialog, menu, tabs, toast)
- [ ] R2 shell: title bar, sidebar, date context, command palette, shortcuts
- [ ] R3 dashboard grid engine + widget registry + edit mode + persistence
- [ ] R4 Quick Entry (all tracker kinds, recents, context-aware, Enter to save)
- [ ] R5 tracker detail pages (per identity + generic) with ranges, stats, history CRUD
- [ ] R6 Journal: calendar month, day detail, timeline
- [ ] R7 Insight Lab: explorer, pair analysis, discoveries scan
- [ ] R8 People (contacts CRM)
- [ ] R9 Tags hierarchy manager
- [ ] R10 Trackers manager + custom tracker builder
- [ ] R11 Reminders, Assets, Settings

### Release
- [ ] V1 unit/integration tests for new code; old renderer tests retired
- [ ] V2 Electron E2E (CRUD, restart persistence, layout drag/resize persistence)
- [ ] V3 lint, types, build, Linux package, Windows package attempt
- [ ] V4 synthetic showcase profile + 8–12 screenshots
- [ ] V5 portfolio docs, README, verification report
