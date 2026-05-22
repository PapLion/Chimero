# Tracker Discovery Cleanup Plan

Purpose: provide a Product-facing cleanup workflow for converting the messy Notion Tracker Design Discovery notes into clean tracker specs that match current Chimero reality. This is a bridge from raw discovery to contracts, not a source of truth for implementation by itself.

The Notion Tracker Design Discovery page is raw discovery material, not final architecture. Its AI-generated structure may be noisy, overbuilt, duplicated, or inconsistent with the current app. The most valuable parts are the client's direct answers, crossed-out rejected items, comments, specific examples, repeated preferences, and existing chat requirements.

The current tracker system must not blindly implement the Notion format. Each tracker needs a clean contract/spec before implementation so final work fits the current app architecture: renderer via `window.api`, preload/IPC, main handlers/services, local DB, shared contracts, and renderer queries/read models where applicable.

## Source Discovery File

Primary raw discovery input:

- `C:\Users\Dani\Desktop\Chimero — Tracker Design Discovery 45591a98b33d82f795e901037a4f61f1.md`

That Desktop file is the working local Notion export the cleanup pass must visibly process. It is external/local source material, not currently treated here as a repo-tracked Product contract. If the team wants durable provenance inside the repository, copy or curate it into `Documentation/Product/` in a separate documentation provenance step; do not silently treat the Desktop path as a permanent repo source.

Use the Desktop file to extract raw client/product signals. Then map each signal to the current source of truth, Product reality audit, and code reality before any implementation plan is accepted.

## Current Source Of Truth

Use these sources before treating any tracker behavior as current reality:

- `../7_Contratcs.md` for the current tracker contract map.
- `../Contracts/Trackers/*.md` for per-tracker surface and deep contract details.
- `../Contracts/Backend_IPC_Contracts.md` for backend/preload/IPC boundaries.
- `../Contracts/Database_Contracts.md` for persistence boundaries.
- `../Flow/Contracts_Flow.md` for cross-layer contract flow.
- `./ClientContext_Audit_Index.md` for the Product reality-audit index and links to detailed audit files.
- `../../chimero-habit-flow/` for code reality: preload/IPC, handlers/services, shared contracts, DB schema, renderer queries/read models, and UI surfaces.

Rule: do not create schemas, endpoints, IPC methods, DB tables, read models, or UI completion claims from Notion discovery alone. A tracker needs confirmed client intent plus current docs/code evidence before implementation work.

## How To Read The Notion Discovery File

Read the Desktop discovery file as a layered artifact:

1. First prioritize the client's own answer blocks, usually marked like `chamero's answer`, because those are the strongest raw intent signals.
2. Next capture comments added inside reference-list bullets, such as Weight notes about liking daily numbers while also accepting averages, or using Food tags like cheat day / very bad food to explain weight changes.
3. Treat crossed-out markdown such as `~~Log body fat percentage(probably won't use)~~` as rejection or low-confidence intent unless a later client answer re-confirms it.
4. Treat `❌`, blank answer blocks, incomplete numbered answers, and "idk" style answers as uncertainty markers, not implementation approval.
5. Extract specific examples and repeated preferences: fast logging, presets, Bento widget expectations, history/edit/delete, graphs, correlations, and low-friction/simple-vs-deep choices.
6. Ignore AI-generated tracker boilerplate unless the client answer, comment, checkmark, rejection, or repeated preference confirms it.
7. Do not promote examples directly into specs. Every extracted requirement must be mapped to `../7_Contratcs.md`, the matching tracker contract, Product audit evidence, and current app/code reality before implementation.

If the file contains Markdown headings, blockquotes, checkboxes, crossed-out Markdown, HTML strike/delete markers, or repeated AI-generated patterns, interpret them as formatting and discovery context. The cleanup output should preserve meaning, not clone the Notion structure.

## Discovery Extraction Checklist

For each tracker section in the Desktop discovery file, extract these fields before writing or updating a clean tracker spec:

- Tracker name and discovery heading/topic.
- Client quote or close paraphrase from the answer block.
- Rejected items, crossed-out items, `❌` markers, or explicit backburner decisions.
- Concrete examples the client accepted, modified, or expanded.
- Simple/deep preference and friction tolerance.
- Fields requested, including required vs optional fields when the client made that clear.
- Quick Entry expectations, presets, one-tap behavior, edit/delete behavior, and history expectations.
- Bento/widget expectations and what must be real data vs visual placeholder.
- Statistics, graphs, timelines, heatmaps, streaks, trends, and date-range requests.
- Tags, assets, linked entities, and correlation requests.
- Current contract/doc/code status after reality mapping.
- Uncertainty and open questions that must stay labeled instead of being filled in by assumption.

## Tracker Signals Found In The Discovery File

These are raw discovery signals found in `C:\Users\Dani\Desktop\Chimero — Tracker Design Discovery 45591a98b33d82f795e901037a4f61f1.md`. They prove what the cleanup plan is anchored to, but they are not final specs until mapped to current contracts and reality audit evidence.

- Weight: client prefers pounds by default with switchable units, weight as primary, basic waist measurement, daily morning logging, target weights, and color motivation around progress/loss or neutral streaks. Body fat was crossed out as probably unused. Weight also has a concrete Food/Diet tag-correlation idea: cheat day / very bad food tags may explain weight differences.
- Mood: client leans toward red/orange/yellow/green color language instead of a pure 1-10 mental model, expects 3-10 entries per day, wants before-work vs after-work separation, accepts cause tags mainly for major moods, asks for line graphs with peaks/lows over day/week/month, and explicitly wants everything interconnected.
- Sleep: client wants both hours and bedtime/wake time, a personal quality rating, dream/nightmare memory, number of wakeups, bathroom wakeups, and useful views around recent hours slept and quality.
- Exercise / Gym: client likes search but wants user-made presets/routines for 1-4 recurring lifting routines, with expected exercises/sets/reps prefilled and adjustable at entry time. The popout pattern is called out as undesirable for this tracker and maybe others.
- Books: client wants start date, days read, and finish date, but rejects tracking pages read per session as too much friction. Rating should be 1-5 stars with tenth-step precision, plus reading streaks and books read per week/month, with separate shelves.
- Gaming: client wants games played each day, estimated hours, correlations with mood, several games but often 1-2 per month, and game-specific wins/losses where useful to explain mood impact.
- Diet / Meals: client already logs food daily and wants food/ingredient tags to correlate with Health symptoms such as allergy or inflammation, while also serving fitness goals and general awareness.
- Water: marked with `❌` and the client says water is not tracked now and should be backburnered.
- Meditation: client wants it relatively basic and low priority: meditation days, streaks, length, and small tags for how it felt during/after, with no app/method dependency.
- Social / Personal CRM: client will track weekly contacts plus important family/work people, wants mood + notes and how interactions made them feel, wants key details, birthdays/events, traits for remembering kind or bad people, aggregate charts, and optional reminders that can be disabled per person or globally.
- Grouping: client wants a Health section for mental health and physical symptoms such as sickness, injury, and depression; a Mind grouping is acceptable; weight + body measurements should stay together; Health should remain its own area for symptoms.
- Redundant/backburner signal: the client explicitly says Water will not be used for now and should be on the backburner.

## What To Trust

- Client's direct answers.
- Crossed-out rejected items.
- Client comments and clarification notes.
- Specific examples.
- Repeated preferences.
- Existing chat requirements.
- Current contract-backed docs.
- Product reality-audit evidence in `./ClientContext_Audit_Index.md` and the detailed `ClientContext_Audit_*.md` files.
- Current code behavior in `../../chimero-habit-flow/` when it agrees with the contracts or clearly exposes implementation reality.

## What Not To Trust Blindly

- AI-generated reference lists.
- Overly complex examples not confirmed by the client.
- Generic tracker suggestions.
- Notion sections that mix candidate, future, rejected, and implemented behavior.
- Visual shells, tabs, cards, or routes by themselves.
- Generic `entries.value/note/metadata` persistence as proof that a deep tracker is complete.
- Mock-looking charts, shallow charts, or frontend heuristics as proof of real tracker-specific analytics.
- Any structure that ignores app architecture, request/response contracts, schemas, read models, transactions, or correlation flow.

## Conversion Workflow

For each tracker:

1. Extract client-specific requirements from direct answers, comments, crossed-out items, examples, repeated preferences, and existing chat requirements.
2. Separate "must have" from "nice to have", future, rejected, and unclear ideas.
3. Identify whether the tracker is current, generic-only, partial, contract-only/future, or blocked on client confirmation.
4. Compare the tracker against `../7_Contratcs.md` and the matching `../Contracts/Trackers/*.md` file when one exists.
5. Cross-check Product reality in `./ClientContext_Audit_Index.md` and relevant `ClientContext_Audit_*.md` files.
6. Cross-check code reality in `../../chimero-habit-flow/` only enough to confirm current implementation boundaries.
7. Define simple vs deep depth from client preference and current feasibility.
8. Define required fields, optional fields, validation, and entry shape only when backed by confirmed contract intent.
9. Define data schema notes only when backed by current database contracts or code evidence; otherwise mark as a contract decision.
10. Define Quick Entry behavior, including context-aware defaults, one-click/preset expectations, and history/frequent/recent behavior where relevant.
11. Define Bento widget behavior, including what is real data, what is heuristic, and what remains visual-only or partial.
12. Define detail page tabs: Statistics, Graphs, Entries/History, and any tracker-specific tabs.
13. Define stats, graphs, tags, assets, and correlations with explicit evidence for whether they are generic, specialized, partial, or future.
14. Define IPC/API/contracts/read models: `window.api`, preload/IPC channel, main handler/service, shared contract, response mapping, renderer query, and read model.
15. Define errors, empty states, transaction expectations, acceptance criteria, explicit gaps, and open questions.

## Existing Contract-Backed Trackers To Clean First

These trackers currently have contract docs under `../Contracts/Trackers/` and should be cleaned before implementation changes. Treat them as contract-backed, not automatically complete or specialized:

- Weight: reference specialized tracker; current reality audit says it is the only tracker that meets the specialized-schema bar, with honest remaining gaps.
- Mood: current seeded tracker with Quick Entry/widget/aggregate behavior, but generic persistence and scale/schema questions remain.
- Hydration: useful current surface, but generic/partial unless client confirms simple generic behavior is enough.
- Diet/Calories: current calorie/value plus note behavior; deep Food/Diet requirements need structured schema/read-model decisions before expansion.
- Exercise: current useful surface, but deep workout semantics remain generic/partial.
- Social: current Social tracker and Contacts domain exist, but tracker/contact linkage, read models, and transactions remain partial.
- Books: useful current generic surface, but not complete structured tracker behavior.
- Gaming: useful current surface, but deep game-specific semantics remain generic/partial.
- Media/TV: useful current surface, but structured show/movie/history semantics remain generic/partial.
- Tasks: useful current surface, but task-specific behaviors such as postpone/defer need explicit contract and implementation evidence.

## Candidate/Future Trackers From Discovery

These appear in discovery or Product context, but are not current contracts unless separately confirmed by newer contract and code evidence:

- Health.
- Vitamins/Medications.
- Sleep.
- Meditation.
- Water backburner.

Treat candidate/future items as `CONTRACT_ONLY/FUTURE` or `NEEDS_CLIENT_CONFIRMATION` until a clean spec is accepted. Do not add schemas, endpoints, tracker seeds, tables, read models, or UI completion claims for these directly from discovery notes.

## Required Status Markers

Every clean tracker spec must declare one or more status markers:

- `SPECIALIZED_IMPLEMENTED`: current docs/code show tracker-specific contracts, persistence, handlers/services, read models, and renderer behavior.
- `GENERIC_ENTRY_ONLY`: current behavior uses the generic tracker entry flow without tracker-specific semantics.
- `PARTIAL`: some current docs/code behavior exists, but important contract, persistence, read model, analytics, transaction, or UI behavior is missing or unclear.
- `CONTRACT_ONLY/FUTURE`: desired or documented behavior exists as contract intent only, or belongs to future planning.
- `NEEDS_CLIENT_CONFIRMATION`: discovery/client intent is ambiguous, contradicted, crossed out, or not confirmed enough to implement.

Use Product audit status words such as DONE, PARTIAL, DOC_ONLY, MISSING, BROKEN, CODE_ONLY, or UNCLEAR as evidence inputs, but translate the clean tracker spec to the required markers above.

## Output Format For Each Clean Tracker Spec

Use this template for every cleaned tracker:

```md
# Tracker Name

## Current Status Marker

One or more of: SPECIALIZED_IMPLEMENTED, GENERIC_ENTRY_ONLY, PARTIAL, CONTRACT_ONLY/FUTURE, NEEDS_CLIENT_CONFIRMATION.

## Purpose

## User Input

Direct client answers, comments, crossed-out items, examples, repeated preferences, and chat requirements.

## Required Fields

## Optional Fields

## Simple vs Deep Depth

State client preference, current implementation depth, and whether the current system satisfies that depth.

## Quick Entry UX

## Bento Widget

## Detail Tabs

## Statistics

## Graphs

## Entries/History

## Tags

## Assets

## Correlations

## Data Schema Notes

Document DB tables/columns only when backed by current database contracts or code evidence. Mark unknowns explicitly.

## Persistence Notes

State whether current persistence is tracker-specific, generic `entries`, mixed, or future/unknown.

## IPC/Contract Notes

List `window.api`, preload/IPC channels, handlers/services, shared contracts, request/response shapes, and mapping expectations.

## Read Model Notes

State which backend/shared/renderer read models exist or need design.

## Error/Empty States

Validation errors, failed persistence behavior, no-data states, disabled/unavailable states, and unsupported future states.

## Transaction Expectations

Create/update/delete expectations, atomicity needs, and side effects such as derived stats, linked contacts, tags, assets, or correlations.

## Visibility Matrix

Map which fields appear in Quick Entry, Bento, Entries, Detail, Statistics, Graphs, Calendar, Assets, and Correlations.

## Acceptance Criteria

## Explicit Gaps

Anything not currently proven by contract docs, Product audit evidence, or code evidence.

## Open Questions
```

## Non-Negotiable Rules

- Do not create schemas, endpoints, IPC methods, DB tables, tracker seeds, or read models from Notion discovery without confirmed contract and code/docs evidence.
- Do not treat visual shells as DONE. Routes, cards, tabs, modals, or charts are not complete unless data contracts and persistence support the claimed behavior.
- Generic entries are `PARTIAL` for deep trackers unless the client explicitly confirms generic behavior is enough.
- Mock charts, shallow generic charts, or frontend-only heuristics are `PARTIAL` until backed by real tracker-specific data/read models.
- Docs-only systems need implementation evidence before being treated as real.
- Contract docs must label uncertainty instead of implying completion.
- Existing working flows should be preserved while specs clarify gaps.
- Product discovery examples should become acceptance examples only after the tracker contract confirms they belong in scope.
- Health/Vitamins/Sleep/Meditation/Water backburner should stay candidate/future unless current contracts and code prove otherwise.
- Weight remains the reference specialized tracker pattern, but other trackers should not copy it blindly without a tracker-specific contract.

## How This Relates To The Client Context Reality Audit

The Product audit files under `Documentation/Product/` are the bridge between historical/client context and current implementation reality:

- `./ClientContext_Audit_Index.md` summarizes the audit and points to detailed files.
- `./ClientContext_Audit_04_Trackers_Core.md` is the main tracker-by-tracker reality check for Weight, Mood, Exercise, Gaming, Diet/Meals, Social, Books, Media/TV, Tasks, Hydration, Health, Vitamins/Medications, and custom tracker boundaries.
- `./ClientContext_Audit_06_Food_Health_Tags_Vitamins.md` is required context for Diet/Food, Health, tags, Vitamins/Medications, and tag-aware correlations.
- `./ClientContext_Audit_07_Stats_Correlations.md` is required context before claiming tracker statistics, graphs, or correlations are complete.
- `./ClientContext_Audit_08_CustomTrackers_TechnicalDebt.md` is required context before treating generic custom trackers as substitutes for specialized default trackers.
- `./PHASE_2_REALITY_AUDIT.md` provides a focused implementation reality check for persistence, structured entries, real charts, CRUD, Quick Entry, Bento/Grid, Assets, Stats, correlations, and Phase 2 gaps.

Use the audit as a reality check, not as permission to implement blindly. If an audit says a surface is partial, generic, doc-only, missing, broken, or unclear, the clean tracker spec must carry that forward as an explicit gap or open question.
