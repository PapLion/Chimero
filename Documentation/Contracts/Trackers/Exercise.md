# Exercise Contract

## 1. Purpose

Exercise covers structured workout logging plus exercise search/database support. New workouts are DB-backed, linked to the base `entries` row, and rendered as workouts across detail, statistics, graphs, home, and calendar surfaces. Legacy generic Exercise rows remain readable as unstructured history.

## 2. Current Implementation Status

- Status: STRUCTURED_WORKOUT_PERSISTENCE_AND_SURFACES_IMPLEMENTED.
- Migration `0009_workout_structured_persistence.sql` adds workout session, session-exercise, set, routine, and routine-exercise tables.
- Dedicated workout service/handler, preload/API/query wiring, and web routes exist.
- Quick Entry can launch structured workout creation; edit stays honest and does not flatten nested data.
- Tracker Detail, Statistics, Graphs, Home, and Calendar read structured workout models.
- Legacy metadata-backed Exercise rows still render, but they are labeled unstructured and excluded from structured volume/PR metrics.

## 3. Surface Contract / Frontend

### 3.1 Quick Entry / Workout Builder

- Quick Entry exposes structured workout start/build flows.
- The workout builder supports session name, source routine, date/time, kg/lb, duration, exercise search/add, reordering, sets, reps, load, note/context, tags/assets where supported, and Save Workout.
- Edit Entry can safely edit note/context without destroying structured workout data.

### 3.2 Home Widget Read Model

- Shows last workout session, routine/session name, days since last workout, sessions this week, active-week streak, and latest session volume with unit.
- Uses structured workout data when available.

### 3.3 Tracker Detail / Entries Tab Read Model

- Structured sessions render as workouts with session name, routine name, date/time, duration, load unit, exercise list, sets, reps, load, note/context, tags/assets where available, total volume, and PR context.
- Bodyweight-only sets remain visible but do not fabricate zero load.
- Legacy rows are labeled unstructured and stay readable.

### 3.4 Tracker Detail / Statistics Tab Read Model

- Shows total structured sessions, sessions this week, days since last workout, active-week streak, weekly volume, average session volume, average duration, frequent exercises, recent PRs, and structured vs legacy counts.
- Volume and PR metrics are unit-safe and exclude legacy/unstructured rows.

### 3.5 Tracker Detail / Graphs Tab Read Model

- Shows weekly volume, session volume over time, and per-exercise progression charts.
- Progression includes session volume, heaviest load, and best set volume.
- No estimated 1RM, no mixed-unit series, and no fake load progression for bodyweight-only sets.

### 3.6 Calendar Selected-Day Summary Read Model

- Shows structured workout sessions by day with session/routine name, time, duration, exercise count, top exercises, total volume/unit, note/context, and tags/assets where supported.
- Multiple sessions in one day remain visible.
- Legacy rows stay readable as unstructured entries.

### 3.7 Insights / Correlations Read Model

- Exercise-specific correlation claims are not part of the current contract.
- Mood/weight/health correlations remain separate tracker concerns.

## 4. Deep Contract / Backend-Service

### 1. Backend Entry Point

- Status: IMPLEMENTED.
- Dedicated workout service/handler exists alongside exercise search/database endpoints.
- Structured create/update/delete, routine CRUD, and routine/session instantiation flows are available.
- Generic `add-entry` remains the shared base entry event, but new workout saves are not metadata-only.

### 2. Request Validation

- New structured sessions require explicit load unit selection, at least one exercise, and valid nested set data.
- Reps are positive integers or null; load is finite non-negative or null.
- Bodyweight sets can have load null.
- Unknown legacy unit data is preserved as unstructured and excluded from structured analytics.

### 3. Normalization

- Backend computes `dateStr` from `timestamp`.
- Session and routine names, notes, exercise snapshots, set snapshots, and order indices are normalized for read models.
- Legacy exercise rows without safe structured unit data remain unstructured.

### 4. Persistence / Schema

- `entries` remains the shared session event table.
- `workout_sessions` stores session metadata and load unit.
- `workout_session_exercises` stores ordered exercise snapshots.
- `workout_sets` stores ordered set rows.
- `workout_routines` stores reusable routine metadata.
- `workout_routine_exercises` stores ordered routine exercise snapshots and targets.

### 5. Read / Query Plan

- History/detail: reads structured workout sessions when present, else legacy unstructured exercise rows.
- Statistics: reads structured workout aggregates only from structured sessions.
- Graphs: plots unit-safe structured session and exercise progression.
- Home: reads the structured workout summary read model.
- Calendar: reads structured workout day summaries.
- Search: exercise dataset/cache remains the source for selectable exercises.

### 6. Computed Metrics

- Structured metrics: total sessions, sessions this week, days since last workout, active-week streak, weekly volume, average session volume, average duration, heaviest-load PRs, best-set-volume PRs, and per-exercise progression.
- Legacy metrics: readable history only; not counted in structured volume or PRs.

### 7. Transaction Rules

- Workout session create/update/delete is transactional across session, exercises, and sets.
- Routine CRUD is independent from historical sessions.
- Saving a workout as a routine must not mutate historical workout sessions.

### 8. Data Ownership Rules

Frontend owns: capture, display, UI state, visual formatting.
Backend owns: validation, normalization, derived metrics, relation resolution, persistence orchestration, response mapping.
Database owns: durable storage, relational integrity, queryable structure.
Shared contracts own: request/response shapes, app-facing types, pure domain helpers when reusable.

## 5. Input / Output Contracts

```ts
type WorkoutSessionReadModel = {
  structured: true
  entryId: number
  trackerId: number
  routineId: number | null
  timestamp: number
  dateStr: string
  sessionName: string | null
  title: string | null
  note: string | null
  loadUnit: 'kg' | 'lb'
  durationMinutes: number | null
  totalSets: number
  totalVolume: number | null
  completedAt: number | null
  routine: WorkoutRoutineReadModel | null
  exercises: Array<{
    exerciseId: string
    exerciseName: string
    bodyPartSnapshot: string[]
    equipment: string | null
    sets: Array<{
      setIndex: number
      reps: number | null
      load: number | null
      weight: number | null
      weightUnit: 'kg' | 'lb' | null
    }>
  }>
}
```

## 6. Field Visibility Matrix

| Field | Quick Entry | Edit Entry | DB | Backend Computed | Home | Entries Tab | Statistics Tab | Graphs Tab | Calendar |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| session name | Yes | Yes | Yes | Yes | Yes | Yes | Yes | No | Yes |
| routine name | Yes | Yes | Yes | Yes | Yes | Yes | Yes | No | Yes |
| exercise search result | Yes | No | Yes | No | No | Yes | No | No | No |
| sets/reps/load | Yes | Protected | Yes | Yes | No | Yes | Yes | Yes | Yes |
| duration | Yes | Yes | Yes | Yes | Yes | Yes | Yes | No | Yes |
| volume / PRs | Yes | Protected | Yes | Yes | Yes | Yes | Yes | Yes | Yes |
| legacy unstructured row | No | Yes | Yes | No | No | Yes | No | No | Yes |
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
- [ ] Does backend validate all request fields? Search exists, but workout metadata is not schema-validated.
- [x] Does backend normalize timestamp/dateStr/defaults?
- [x] Does backend know which tables to write?
- [x] Does backend write related rows transactionally?
- [x] Does backend know which tables to read for each surface?
- [ ] Does backend compute metrics instead of frontend? Only generic stats/search status exist.
- [x] Does backend map DB rows into shared contracts?
- [x] Does backend handle empty/insufficient data?
- [ ] Does backend return clear errors/warnings? Generic null/false/empty fallback remains.
- [x] Does delete/update affect related rows safely?
- [x] Is current implementation status honest?
