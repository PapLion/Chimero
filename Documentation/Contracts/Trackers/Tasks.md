# Tasks Contract

## 1. Purpose

Tasks tracks task creation and completion-like state through the current generic entry model, with postpone state stored as typed task metadata on `entries.metadata`. Due dates, recurrence, priority, reminders integration, subtasks, boards, and richer task semantics remain Future unless requested and implemented.

## 2. Current Implementation Status

- Status: GENERIC_TASK_POSTPONE_FOUNDATION_IMPLEMENTED.
- Tasks is seeded/default and task-like trackers are detected by name/type/icon.
- Quick Entry captures task description as text.
- BentoGrid has a Task widget and can toggle generic task entry value for actionable tasks.
- `get-task-entries` returns generic entries with `tagIds`.
- No dedicated task table, task migration, historical backfill, due date, priority, recurrence, or reminder integration exists today.
- Postpone support uses shared pure helpers and typed `TaskStateMetadata`; repeated postpone transitions preserve history.

## 3. Surface Contract / Frontend

### 3.1 Quick Entry / Edit Entry Input

- Quick Entry captures task description in note/text.
- Quick Entry creates a generic entry; no creation-time postpone control exists.
- Completed state is inferred from generic numeric value in task widget contexts.
- Postponed state is stored in `entries.metadata` as `TaskStateMetadata`.
- Edit Entry updates value, note/task description, timestamp, tags, and asset reference.
- Generic Edit Entry preserves task metadata when editing canonical fields.
- Delete uses generic delete behavior.

### 3.2 BentoGrid / Home Widget Read Model

- Shows selected-day task list.
- Shows completed count / total count.
- Uses `TaskDayReadModel` to show actionable tasks on `activeDate` and postponed markers on every prior `fromDate`.
- Allows toggling completion only for actionable tasks by updating generic entry value.
- Adds a local postpone action for actionable tasks; it appends a transition and moves `activeDate` to the next calendar day.
- Postponed rows are visually distinct from completed rows and cannot be toggled complete from the old postponed date.

### 3.3 Tracker Detail / Entries Tab Read Model

- Shows tasks in timeline/list style with text, completion indicator from value, timestamp, tags, assets, edit, delete, and task state badges.
- Shows actionable/postponed context for the selected day. Actionable tasks can be postponed to the next day from this surface.

### 3.4 Tracker Detail / Statistics Tab Read Model

- May show total tasks/entries, completed count, completion percentage, tasks this week/year, current streak, and days since last task.
- Postponed counts and advanced task statistics remain Future; generic entry metrics are not expanded to count projected calendar displays as extra persisted entries.

### 3.5 Tracker Detail / Graphs Tab Read Model

- Relevant.
- Graphs generic task count/completion values over time.

### 3.6 Calendar Selected-Day Summary Read Model

- Shows selected-day tasks, completion state, note/text, timestamp, tags, asset reference, and optional task state fields.
- Calendar visibility projects task read models without duplicate DB rows: original/intermediate `fromDate` days render as postponed, and the current `activeDate` renders as actionable.

### 3.7 Insights / Correlations Read Model

- Generic correlations can use task values/counts.
- Productivity correlations are Future unless explicitly requested.

## 4. Deep Contract / Backend-Service

### 1. Backend Entry Point

- Status: PARTIAL.
- Implemented generic methods: `add-entry`, `update-entry`, `delete-entry`, `get-entries`, `get-calendar-month`.
- Implemented task-specific read helper: `get-task-entries` for entries plus `tagIds`.
- Task completion toggle uses generic `update-entry` value updates.
- Task postpone uses generic `update-entry` metadata updates in Electron and web runtimes.
- There is no dedicated task table, task status service, due date endpoint, recurrence endpoint, or priority schema today.

### 2. Request Validation

- Current fields: `trackerId`, task text in `note`, optional numeric `value`, `timestamp`, optional `assetId`, optional `tagIds`, optional typed task `metadata`.
- Shared task helpers validate postpone metadata: only task tracker surfaces should call postpone, `fromDate` must equal current `activeDate`, `toDate` must be the next calendar day, duplicate identical transitions are rejected, and legacy no-metadata tasks are actionable on `entries.dateStr`.
- Current backend still does not require non-empty task text, enforce a first-class completed boolean, validate due dates, priority, recurrence, or reminder behavior.
- Complete/uncomplete is represented by generic numeric value convention, not a first-class backend enum.
- Invalid generic writes return `null` or `false`.

### 3. Normalization

- Backend computes `dateStr` from `timestamp`.
- `note` stores task text; `value` stores generic completion/state convention.
- `metadata` defaults to `{}`; task scheduling/postpone state is typed as `TaskStateMetadata`.
- `assetId` defaults to `null`; tags follow generic replacement semantics.
- `get-task-entries` orders newest-first and attaches tag IDs.

### 4. Persistence Plan

Write flow:

1. Insert/update base entry in `entries`.
2. Insert/update specialized tracker table if needed: none exists for Tasks.
3. Insert/update `entries.metadata` only when task postpone metadata is provided through generic `update-entry`.
4. Insert/update junction rows in `entries_to_tags` when `tagIds` is provided.
5. Update related entity state if needed: none today.
6. Return mapped generic `Entry` contract, with tag IDs for task reads.

- Generic entry/tag writes are transactional.
- Delete removes `entries` and tag joins; assets remain separate.
- Completion is stored structurally only as generic `entries.value`; postponed state is stored in typed metadata and is sufficient for this local read-model foundation.

### 5. Read / Query Plan

- BentoGrid: reads generic entries, maps them through `TaskDayReadModel`, shows actionable tasks on `activeDate`, shows postponed markers on `fromDate`, maps note to text and value to completed state, computes actionable completed/total count.
- Entries tab: reads entries by tracker, shows selected-day actionable/postponed task state, task text, completion indicator, tags/assets.
- Statistics tab: generic stats plus task surface calculations can compute total tasks, completed count, completion percent, tasks this week/year, days since last task.
- Graphs: generic task count/completion values over time.
- Calendar selected-day: month query projects task entries by typed metadata so `fromDate` days render postponed and `activeDate` renders actionable without creating extra persisted rows.
- Edit Entry prefill: generic entry response with text/value/timestamp/asset/tags.
- Correlation/Insight: generic correlation can use task count/value; productivity-specific insight is FUTURE.
- Empty state: no selected-day tasks returns empty list and `0/0` style counts where appropriate.

### 6. Computed Metrics

- Implemented/generic: selected-day completion count/total in widget, generic entry count, active days, grouped stats, generic correlation caveat.
- Implemented: selected-day actionable/postponed state and repeated-postpone history read models.
- Future: postponed count metrics, due-date visibility, priority/recurrence summaries.
- Metrics are computed on read/surface; no task metric cache exists.

### 7. Response Mapping

- Flow: `entries` DB rows -> `mapEntry` -> shared `Entry` -> shared task helpers/read models -> Task widget/detail/calendar response.
- Raw DB rows never return to renderer surfaces.
- Missing task text/value/asset/tags return `null` or `[]`.
- Completed state is derived from generic value convention in the task surface, not a backend-owned boolean today. Completion updates do not erase postpone metadata.

### 8. Error Handling

- Invalid generic entry/DB failure returns `null` or `false`.
- Missing tracker/entry/tag/asset uses generic null/empty fallback.
- Empty task list returns empty state.
- Unsupported due/priority/recurrence requests should be marked Future or PRODUCT_REQUESTED_NOT_IMPLEMENTED.

### 9. Transaction Rules

- Generic add/update/delete are transactional for `entries` and `entries_to_tags`.
- Task toggle/postpone through `update-entry` is transactional for entry update and tag replacement semantics.
- No specialized task related rows exist today.
- Current status: transaction safety is IMPLEMENTED for generic entry/tag writes.

### 10. Data Ownership Rules

Frontend owns: capture, display, UI state, visual formatting.
Backend owns: validation, normalization, derived metrics, relation resolution, persistence orchestration, response mapping.
Database owns: durable storage, relational integrity, queryable structure.
Shared contracts own: request/response shapes, app-facing types, pure domain helpers when reusable.

### 11. Deep Contract Status

- Status: PARTIAL_WITH_POSTPONE_FOUNDATION.
- Implemented: generic task creation/edit/delete, task-specific read helper with tags, generic complete/uncomplete value update, metadata update path, repeated postpone metadata, selected-day widget/detail/calendar read models.
- Gaps: first-class completed boolean/status schema, undo/unpostpone, due dates, priority, recurrence, reminder integration, advanced task metrics, and stronger backend validation beyond shared helper/UI constraints.

## 5. Persistence and Schema / Database

- `trackers`: Tasks uses text/check-square-style config.
- `entries.note`: task description.
- `entries.value`: generic state/value; task widgets infer done when value is high enough.
- `entries.timestamp` and `entries.date_str`: task creation/log date.
- `entries.metadata`: typed postpone state for Tasks.
- `entries.asset_id`: optional attachment.
- `entries_to_tags`: explicit tags.

## 6. Input / Output Contracts

```ts
type CreateTaskEntryRequest = BaseEntryRequest & {
  trackerId: number
  note: string | null
  value?: number | null
  timestamp: number
  assetId?: number | null
  tagIds?: number[]
  metadata?: TaskStateMetadata
}

type UpdateTaskEntryRequest = Partial<Omit<CreateTaskEntryRequest, "trackerId">>

type TaskEntryResponse = BaseEntryResponse

type TaskPostponement = {
  fromDate: string
  toDate: string
  timestamp: number
}

type TaskStateMetadata = {
  activeDate: string
  postponements: TaskPostponement[]
}

type TaskEntryReadModel = {
  entryId: number
  trackerId: number
  text: string
  completed: boolean
  state: "actionable" | "postponed"
  selectedDate: string
  dateStr: string
  activeDate: string
  postponements: TaskPostponement[]
  timestamp: number
  assetId?: number | null
  tagIds?: number[]
}

type TaskDayReadModel = {
  dateStr: string
  entries: TaskEntryReadModel[]
  actionable: TaskEntryReadModel[]
  postponed: TaskEntryReadModel[]
}

type PostponeTaskRequest = {
  entryId: number
  fromDate: string
  toDate: string
  timestamp: number
}

type PostponeTaskResponse = {
  entry: BaseEntryResponse["entry"]
  task: TaskEntryReadModel
}

type TaskDetailResponse = {
  entries: BaseEntryResponse["entry"][]
}

type TaskBentoWidgetResponse = {
  trackerId: number
  tasks: TaskEntryReadModel[]
  completedCount: number
  totalCount: number
}

type TaskEntriesTabResponse = {
  entries: Array<BaseEntryResponse["entry"] & { completed?: boolean; tags?: TagSummary[]; assets?: AssetSummary[] }>
}

type TaskStatisticsResponse = {
  totalEntries: number
  completedCount?: number
  completionPercent?: number | null
  tasksThisWeek?: number
  tasksThisYear?: number
  daysSinceLastEntry?: number | null
  postponedCount?: Future<number>
}

type TaskCalendarDayResponse = TimelineEvent & {
  entryId: number
  trackerId: number
  text?: string | null
  completed?: boolean
  taskState?: "actionable" | "postponed"
  taskBaseDate?: string
  taskActiveDate?: string
  taskPostponements?: TaskPostponement[]
  tagIds?: number[]
  assets?: AssetSummary[]
}
```

## 7. Field Visibility Matrix

| Field | Quick Entry | Edit Entry | DB | Backend Computed | BentoGrid | Entries Tab | Statistics Tab | Graphs Tab | Calendar | Insights/Correlations |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| task text | Yes | Yes | Yes | No | Yes | Yes | Optional | No | Yes | Optional |
| completed state | Optional | Optional | Optional | Computed | Yes | Yes | Yes | Yes | Yes | Optional |
| postponed state | No | Preserved | Yes metadata | Computed | Yes | Yes | Future metrics | No | Yes | Future |
| due date | Future | Future | Future | Future | Future | Future | Future | Future | Future | Future |
| priority/recurrence | Future | Future | Future | Future | Future | Future | Future | Future | Future | Future |
| completion count | No | No | No | Computed | Yes | No | Yes | Yes | Optional | Optional |
| tagIds | Optional | Optional | Yes | Optional | No | Yes | Future | Future | Optional | Future |
| assets | Optional | Optional | Optional | Optional | No | Optional | No | No | Optional | Future |

## 8. Completeness Checklist

- [x] Quick Entry / Edit Entry input is documented.
- [x] Backend request path is documented.
- [x] Database persistence shape is documented.
- [x] Backend computed response is documented.
- [x] BentoGrid read model is documented.
- [x] Entries tab read model is documented.
- [x] Statistics tab read model is documented.
- [x] Graphs tab relevance is documented.
- [x] Calendar selected-day summary is documented.
- [x] Edit/Delete behavior is documented.
- [x] Future Insights/Correlations are limited to explicit/generic scope.

## 9. Deep Contract Checklist

- [x] Does backend have a clear entry point?
- [ ] Does backend validate all request fields? Task postpone helpers validate metadata transitions, but generic backend request validation is still thin.
- [x] Does backend normalize timestamp/dateStr/defaults?
- [x] Does backend know which tables to write?
- [x] Does backend write related rows transactionally?
- [x] Does backend know which tables to read for each surface?
- [ ] Does backend compute metrics instead of frontend? Completion counts are mostly widget/surface-derived.
- [x] Does backend map DB rows into shared contracts?
- [x] Does backend handle empty/insufficient data?
- [ ] Does backend return clear errors/warnings? Current path uses generic fallbacks.
- [x] Does delete/update affect related rows safely?
- [x] Is current implementation status honest?
