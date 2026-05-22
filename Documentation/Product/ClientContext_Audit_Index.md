# Client Context Reality Audit Index

## Scope

This index summarizes the client context reality audit for `Documentation/8_Client_Context.md` lines 1-939. The audit compares those client-context requirements against the current `chimero-habit-flow/` implementation and current `Documentation/` contract files. It treats `8_Client_Context.md` as product history/context, not proof that a feature is implemented.

This file is an index over the generated audit files in `Documentation/Product/`. It does not replace the detailed evidence tables in those files.

## Generated Audit Files

- `Documentation/Product/ClientContext_Audit_00_OriginalSeed_MVP.md` - audits the original Home/MVP shell, initial tracker set, Calendar, Assets, sidebar, and dark visual direction.
- `Documentation/Product/ClientContext_Audit_01_Architecture_LocalFirst.md` - audits Electron/Vite, TypeScript, Tailwind, IPC/preload/main/renderer boundaries, local SQLite, privacy/local-first claims, and docs/code alignment.
- `Documentation/Product/ClientContext_Audit_02_QuickEntry_Dashboard_Bento.md` - audits Quick Entry, `Alt+Q`, recent/favorite tracker behavior, context preselect, Home dashboard glanceability, Bento drag/drop, sizing, persistence, responsive behavior, and sidebar collapse.
- `Documentation/Product/ClientContext_Audit_03_Assets_Calendar_Timeline.md` - audits local asset storage, paste/drop/file picker input, asset categories, asset assignment, Calendar data/filtering, selected-day entries, and Timeline scope.
- `Documentation/Product/ClientContext_Audit_04_Trackers_Core.md` - audits core tracker status across Weight, Mood, Exercise, Gaming, Diet/Meals, Social, Books, Media/TV, Tasks, Hydration, and doc-only/future trackers.
- `Documentation/Product/ClientContext_Audit_05_Social_CRM.md` - audits Social tracker, contacts, bubbles, avatars, contact detail navigation, contact fields, interaction history, multi-contact logging, and Social/Mood correlation readiness.
- `Documentation/Product/ClientContext_Audit_06_Food_Health_Tags_Vitamins.md` - audits Diet/Food, tags, parent/child tag foundations, Health/Symptoms, Vitamins/Medications, and tag-aware correlation readiness.
- `Documentation/Product/ClientContext_Audit_07_Stats_Correlations.md` - audits global Stats/Insight Lab, tracker Statistics/Graphs/Entries tabs, retroactive queries, local pairwise correlations, and correlation examples.
- `Documentation/Product/ClientContext_Audit_08_CustomTrackers_TechnicalDebt.md` - audits custom tracker creation/edit/delete, shallow config, missing schema builder, generic widget/stats behavior, and custom analytics debt.
- `Documentation/Product/ClientContext_Audit_09_Platform_Performance_UXDebt.md` - audits Electron startup, Linux/Arch/Wayland uncertainty, titlebar/window behavior, Vite/Electron migration, old Next.js assumptions, overflow, modal UX, and unmeasured performance/polish.

## Executive Summary

Chimero has a real desktop application foundation: Electron/Vite, TypeScript/TSX, Tailwind styling, IPC/preload boundaries, renderer query hooks, local SQLite/Drizzle storage, a dark Home shell, Calendar, Assets, Quick Entry, Bento dashboard, tracker detail pages, custom tracker management, tags, contacts, and local stats/correlation infrastructure all exist in some form.

The product reality is still mostly PARTIAL outside the foundation. Local-first is real technically, but partial in product terms because most trackers persist through generic `entries.value/note/metadata`. Weight is the main genuinely specialized tracker path, with a dedicated schema/service/read model. Other trackers are useful, but generally generic or partially specialized.

Several screens are real but should not be treated as complete product features: Quick Entry, Bento/Grid, Calendar, Timeline, Assets, Social CRM, Stats/Correlations, Tags, and Custom Trackers all have important gaps. Sleep, Meditation, Health, and Vitamins/Medications are doc-only/discovery items in the audited scope, not implemented trackers. `/api/health` is a server health check, not a Health tracker.

The Vite + Electron migration appears DONE from package/source evidence, and old Next.js assumptions were not found in audited source/package paths. Linux/Arch/Wayland behavior, 500ms lag, tracker switching speed, window dragging, modal overflow, responsive behavior, and general production polish remain UNCLEAR/PARTIAL because they require runtime or visual QA.

## Highest Risk Areas

1. Tracker data is too shallow for the product scope. Most non-Weight trackers rely on generic `entries` and cannot support the structured fields, read models, graphs, CRUD semantics, or correlations described in the client context.

2. Custom tracker system is not production-ready. Creation/edit/delete works, and name/icon/color/type/unit/goal exist, but there is no real schema builder, field-level validation, schema-aware widgets, field analytics, or robust correlations.

3. Generic entries block analytics. Stats, graphs, entries, Bento widgets, and correlations can show real local data, but most are based on generic values, notes, tags, and frontend heuristics rather than tracker-specific contracts.

4. Tag system is missing/partial at the product layer. Tags, joins, and parent/child backend foundations exist, but the relationship graph/page UI and inherited tag read models are missing or partial.

5. Stats/correlations are not broad enough. Real local pairwise correlation logic exists, but the global Stats surface is not the arbitrary historical query system requested by the client, and correlations do not yet understand tags, assets, structured fields, symptoms, contacts, or item identity.

6. Bento/Grid has UX debt. Drag/drop and persistence exist, but resize UI, collision proof, responsive proof, interaction hardening, and manual regression evidence are incomplete.

7. Assets are not fully linked to entities. Local storage, preview, search, grid/list, and entry attachment exist, but asset product categories mismatch backend image/video inference, direct paste/drop ingestion is missing/partial, and entity assignment is not consistently surfaced.

8. Social CRM is partial and has broken navigation. Contacts/interactions exist, but selecting a contact from bubbles resets the selected contact ID when switching to the contact page. Social entries and contact interactions are not structurally joined, and multi-contact writes are non-atomic.

9. Calendar/Timeline are partial. Calendar displays real tracker data and selected-day entries, but filters are tracker toggles rather than stable product categories. Timeline is tracker/month counts, not item-level show/game periods or era/span visualization.

10. Linux/Wayland/window issues are unclear. Electron startup code and drag regions exist, but Linux/Arch/Wayland runtime behavior, custom titlebar controls, and window dragging are not proven.

11. Docs/code drift remains a risk. `8_Client_Context.md` includes historical statements that sound complete unless cross-checked against current implementation and contract docs.

12. Visual shells can be mistaken for completed features. Home, tracker detail tabs, custom tracker pages, Calendar, Timeline, Assets, and Stats may look present while the underlying contracts remain partial.

## Cross-Cutting Gaps

- Visual shell vs real data: many surfaces render real UI, but still depend on generic values, notes, metadata, tracker names, or frontend heuristics.
- Docs/code drift: `8_Client_Context.md` is useful history, but current source, `Documentation/6_Chimero_Features.md`, and contract docs are needed to establish implementation reality.
- Missing contracts: Health, Vitamins/Medications, Sleep, Meditation, tag-aware Health correlations, custom tracker schemas, item-level Timeline periods, and several deep tracker behaviors need contracts before code.
- Shallow persistence: most trackers persist through generic `entries`; Weight is the main specialized exception.
- Missing read models: Social/contact joins, asset/entity assignment, tag inheritance, structured Diet/Food, Gaming win/loss, Exercise workout fields, and tracker-specific stats need backend/shared read models.
- Missing CRUD depth: generic edit/delete exists, but many tracker-specific edits cannot reconstruct or validate structured data because that data is not first-class.
- Missing analytics: global historical Stats and tracker-specific Statistics/Graphs are partial for non-Weight trackers.
- Missing correlations: current local pairwise correlations do not cover structured tags, inherited tags, contacts, symptoms, food ingredients, assets, or custom fields.
- Insufficient schema design: custom trackers, deep trackers, Food/Health/Vitamins, Social CRM, and item-level Timeline require schema/read-model decisions before implementation.
- UX polish debt: Bento resize/collision/responsive behavior, full sidebar collapse, Quick Entry history/frequent flows, asset paste/drop/category selection, modal overflow, performance, and platform window behavior need focused QA and hardening.

## Recommended Implementation Order

1. Confirm contracts/source of truth.
2. Fix tracker data model / structured entries.
3. Fix custom tracker boundaries.
4. Fix core tracker CRUD/persistence.
5. Fix Quick Entry.
6. Fix Tags and relationships.
7. Fix Stats/Correlations after data is real.
8. Polish Bento/Grid/sidebar.
9. Polish Assets/entity assignment.
10. Expand Timeline/Social/etc.

## Do Not Do Yet

- Do not add random new trackers before data model cleanup.
- Do not build correlations on shallow entries and then call them product-complete.
- Do not implement directly from Notion/discovery examples without a current contract.
- Do not treat visual screens, tabs, or cards as completed features by themselves.
- Do not polish UI where data contracts are unclear.
- Do not rewrite everything destructively unless the audit proves it is necessary.
- Do not treat generic custom trackers as substitutes for specialized default trackers.
- Do not claim Health or Vitamins/Medications are implemented because a server health endpoint or generic tags exist.

## Next Suggested Actions

1. Create a short source-of-truth matrix that names which docs/contracts govern implementation now, and explicitly labels `8_Client_Context.md` as audited context/history.
2. Choose the next tracker specialization target after Weight and decide whether it gets a dedicated schema/read model or remains a typed generic model.
3. Write a custom tracker redesign contract before adding more custom tracker UI.
4. Fix the Social selected-contact navigation bug only after confirming Social CRM is the next implementation priority.
5. Run a dedicated runtime/visual QA pass for Electron startup, Quick Entry, Bento/Grid, Assets, Calendar/Timeline, modal overflow, tracker switching, and Linux/Wayland window behavior.
