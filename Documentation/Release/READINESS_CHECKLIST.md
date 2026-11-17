# Readiness checklist — 2026-11-17

`[x]` verified here, `[~]` done with a stated limit. Evidence: [VERIFICATION.md](VERIFICATION.md). Decisions: [V2_PLAN.md](V2_PLAN.md).

- [x] Dashboard: add, remove, drag, resize, collisions, snapping to the grid, per-widget minimum and maximum sizes, keyboard moves, saved and restored across restarts (E2E)
- [x] Trackers: create, edit, archive, restore and delete custom trackers; templates, fields and goals; history with editing (E2E for the full path)
- [x] Quick Entry: Alt+Q from anywhere; type and Enter to pick; keyboard-only scales; a form fitted to each kind of record (E2E)
- [x] Structured writes: books, weight and goals, food, health, intake, gaming, workouts and tags, checked against real SQLite
- [x] Statistics: missing days are unknown, not zero; only days where both values are known are compared; FDR-controlled scan; every result says it is not proof of cause
- [x] Data safety: additive migrations, a copy before upgrades, upgrade from the last release (E2E), backup, restore and export (E2E)
- [x] Showcase: isolated synthetic profile, 12 reviewed captures, WebP and OG versions
- [x] Linux: AppImage built and launched, E2E passes on the packaged binary
- [~] Windows: unpacked build carries a verified win32 native module; installer and runtime need Windows (CI job added, not yet run)
- [~] Reminders: due logic tested; OS notification delivery not verified
- [x] Docs: case study, demo guide, README, decision log, verification report
