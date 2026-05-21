# Tasks Contract

## 1. Purpose

Tasks tracks task creation and completion-like state through the current generic entry model. Postponed state, due dates, recurrence, priority, and richer task semantics remain Future unless requested and implemented.

## 2. Current Implementation Status

- Status: GENERIC_TASK_STYLE_IMPLEMENTED.
- Tasks is seeded/default and task-like trackers are detected by name/type/icon.
- Quick Entry captures task description as text.
- BentoGrid has a Task widget and can toggle generic task entry value.
- `get-task-entries` returns generic entries with `tagIds`.
- No dedicated task table or task status API exists today.

## 3. Surface Contract / Frontend

### 3.1 Quick Entry / Edit Entry Input

- Quick Entry captures task description in note/text.
- Quick Entry creates a generic entry, usually with value `1`.
- Completed state is inferred from generic numeric value in task widget contexts.
- Postponed state is Future/PRODUCT_REQUESTED_NOT_IMPLEMENTED if requested; it has no first-class schema today.
- Edit Entry updates value, note/task description, timestamp, tags, and asset reference.
- Delete uses generic delete behavior.

### 3.2 BentoGrid / Home Widget Read Model

- Shows selected-day task list.
- Shows completed count / total count.
- Allows toggling completion by updating generic entry value.
- Must not imply due date/postponed support unless added to schema.

### 3.3 Tracker Detail / Entries Tab Read Model

- Shows tasks in timeline/list style with text, completion indicator from value, timestamp, tags, assets, edit, and delete.

### 3.4 Tracker Detail / Statistics Tab Read Model

- May show total tasks/entries, completed count, completion percentage, tasks this week/year, current streak, and days since last task.
- Postponed counts are Future.

### 3.5 Tracker Detail / Graphs Tab Read Model

- Relevant.
- Graphs generic task count/completion values over time.

### 3.6 Calendar Selected-Day Summary Read Model

- Shows selected-day tasks, completion state, note/text, timestamp, tags, and asset reference.
- Calendar visibility uses generic entry dates.

### 3.7 Insights / Correlations Read Model

- Generic correlations can use task values/counts.
- Productivity correlations are Future unless explicitly requested.

## 4. Deep Contract / Backend-Service

### 1. Backend Entry Point

- Status: PARTIAL.
- Implemented generic methods: `add-entry`, `update-entry`, `delete-entry`, `get-entries`, `get-calendar-month`.
- Implemented task-specific read helper: `get-task-entries` for entries plus `tagIds`.
- Task completion toggle uses generic `update-entry` value updates.
- There is no dedicated task table, task status service, postpone endpoint, due date endpoint, recurrence endpoint, or priority schema today.

### 2. Request Validation

- Current fields: `trackerId`, task text in `note`, optional numeric `value`, `timestamp`, optional `assetId`, optional `tagIds`.
- Current backend does not require non-empty task text, enforce completed boolean, validate due/postponed dates, priority, recurrence, or selected-day visibility rules.
- Complete/uncomplete is represented by generic numeric value convention, not a first-class backend enum.
- Invalid generic writes return `null` or `false`.

### 3. Normalization

- Backend computes `dateStr` from `timestamp`.
- `note` stores task text; `value` stores generic completion/state convention.
- `metadata` defaults to `{}`; postponed/due/priority fields are not reliable while ad hoc metadata.
- `assetId` defaults to `null`; tags follow generic replacement semantics.
- `get-task-entries` orders newest-first and attaches tag IDs.

### 4. Persistence Plan

Write flow:

1. Insert/update base entry in `entries`.
2. Insert/update specialized tracker table if needed: none exists for Tasks.
3. Insert/update junction rows in `entries_to_tags` when `tagIds` is provided.
4. Update related entity state if needed: none today.
5. Return mapped generic `Entry` contract, with tag IDs for task reads.

- Generic entry/tag writes are transactional.
- Delete removes `entries` and tag joins; assets remain separate.
- Completion is stored structurally only as generic `entries.value`; postponed/due state should become structural before backend scheduling/rollover depends on it.

### 5. Read / Query Plan

- BentoGrid: reads selected-day tasks from generic entries, maps note to text and value to completed state, computes completed/total count.
- Entries tab: reads entries by tracker/date, shows task text, completion indicator, tags/assets.
- Statistics tab: generic stats plus task surface calculations can compute total tasks, completed count, completion percent, tasks this week/year, days since last task.
- Graphs: generic task count/completion values over time.
- Calendar selected-day: month query returns tasks by `dateStr`; previous-day postponed visibility is FUTURE unless a real postponed field exists.
- Edit Entry prefill: generic entry response with text/value/timestamp/asset/tags.
- Correlation/Insight: generic correlation can use task count/value; productivity-specific insight is FUTURE.
- Empty state: no selected-day tasks returns empty list and `0/0` style counts where appropriate.

### 6. Computed Metrics

- Implemented/generic: selected-day completion count/total in widget, generic entry count, active days, grouped stats, generic correlation caveat.
- Future: postponed count, previous-day rollover, due-date visibility, priority/recurrence summaries.
- Metrics are computed on read/surface; no task metric cache exists.

### 7. Response Mapping

- Flow: `entries` DB rows -> `mapEntry` -> shared `Entry` -> Task widget/detail/calendar response.
- Raw DB rows never return to renderer surfaces.
- Missing task text/value/asset/tags return `null` or `[]`.
- Completed state is derived from generic value convention in the task surface, not a backend-owned boolean today.

### 8. Error Handling

- Invalid generic entry/DB failure returns `null` or `false`.
- Missing tracker/entry/tag/asset uses generic null/empty fallback.
- Empty task list returns empty state.
- Unsupported postponed/due/priority/recurrence requests should be marked Future or PRODUCT_REQUESTED_NOT_IMPLEMENTED.

### 9. Transaction Rules

- Generic add/update/delete are transactional for `entries` and `entries_to_tags`.
- Task toggle through `update-entry` is transactional for entry update and tag replacement semantics.
- No specialized task related rows exist today.
- Current status: transaction safety is IMPLEMENTED for generic entry/tag writes.

### 10. Data Ownership Rules

Frontend owns: capture, display, UI state, visual formatting.
Backend owns: validation, normalization, derived metrics, relation resolution, persistence orchestration, response mapping.
Database owns: durable storage, relational integrity, queryable structure.
Shared contracts own: request/response shapes, app-facing types, pure domain helpers when reusable.

### 11. Deep Contract Status

- Status: PARTIAL.
- Implemented: generic task creation/edit/delete, task-specific read helper with tags, generic complete/uncomplete value update, selected-day widget behavior.
- Gaps: first-class completed boolean/status schema, postpone flow, previous-day postponed rollover, due dates, priority, recurrence, and stronger task validation.

## 5. Persistence and Schema / Database

- `trackers`: Tasks uses text/check-square-style config.
- `entries.note`: task description.
- `entries.value`: generic state/value; task widgets infer done when value is high enough.
- `entries.timestamp` and `entries.date_str`: task creation/log date.
- `entries.metadata`: generic/empty today.
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
  metadata?: {
    completed?: Future<boolean>
    postponedUntil?: Future<string | null>
    dueDate?: Future<string | null>
  }
}

type UpdateTaskEntryRequest = Partial<Omit<CreateTaskEntryRequest, "trackerId">>

type TaskEntryResponse = BaseEntryResponse

type TaskDetailResponse = {
  entries: BaseEntryResponse["entry"][]
}

type TaskBentoWidgetResponse = {
  trackerId: number
  tasks: Array<{ entryId: number; text: string; completed: boolean }>
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
  tagIds?: number[]
  assets?: AssetSummary[]
}
```

## 7. Field Visibility Matrix

| Field | Quick Entry | Edit Entry | DB | Backend Computed | BentoGrid | Entries Tab | Statistics Tab | Graphs Tab | Calendar | Insights/Correlations |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| task text | Yes | Yes | Yes | No | Yes | Yes | Optional | No | Yes | Optional |
| completed state | Optional | Optional | Optional | Computed | Yes | Yes | Yes | Yes | Yes | Optional |
| postponed state | Future | Future | Future | Future | Future | Future | Future | Future | Future | Future |
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
- [ ] Does backend validate all request fields? Task-specific state fields are not validated.
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
