import { getWebDbSync } from '../db'
import { entries, entriesToTags, trackers, workoutRoutineExercises, workoutRoutines, workoutSessionExercises, workoutSessions, workoutSets } from '../../../../packages/db/src/schema'
import {
  buildExerciseProgressReadModel,
  buildWorkoutCalendarReadModel,
  buildWorkoutGraphReadModel,
  buildWorkoutHomeReadModel,
  buildWorkoutLegacyEntryReadModel,
  buildWorkoutRoutineReadModel,
  buildWorkoutSessionReadModel,
  buildWorkoutStatisticsReadModel,
  normalizeWorkoutWeightUnit,
  parseJsonObject,
  validateWorkoutLoad,
  validateWorkoutReps,
  validateWorkoutWeightUnit,
} from '../../../../packages/shared/src/domain'
import { getTrackerIdentity } from '../../../../packages/shared/src/features/tracking'
import type {
  CreateWorkoutRoutineRequest,
  CreateWorkoutSessionRequest,
  DeleteWorkoutRoutineResponse,
  ExerciseProgressReadModel,
  InstantiateWorkoutFromRoutineRequest,
  LegacyExerciseEntryReadModel,
  SaveWorkoutAsRoutineRequest,
  UpdateWorkoutRoutineRequest,
  UpdateWorkoutSessionRequest,
  WorkoutRoutineExerciseInput,
  WorkoutCalendarReadModel,
  WorkoutGraphReadModel,
  WorkoutHomeReadModel,
  WorkoutRoutineDetailResponse,
  WorkoutRoutineReadModel,
  WorkoutSessionDetailResponse,
  WorkoutSessionExerciseInput,
  WorkoutSessionReadModel,
  WorkoutStatisticsReadModel,
} from '../../../../packages/shared/src/contracts'

type JsonRecord = Record<string, unknown>

function formatDateStr(timestamp: number): string {
  const date = new Date(timestamp)
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

function db() {
  return getWebDbSync()
}

function isExerciseTracker(trackerId: number): boolean {
  const row = db().prepare('SELECT * FROM trackers WHERE id = ? LIMIT 1').get(trackerId) as JsonRecord | undefined
  if (!row) return false
  return getTrackerIdentity({
    name: String(row.name ?? ''),
    icon: row.icon == null ? null : String(row.icon),
    config: typeof row.config === 'string' ? JSON.parse(row.config) : (row.config as Record<string, unknown> | null) ?? {},
  }) === 'exercise'
}

function normalizeTagIds(tagIds?: unknown): number[] {
  if (!Array.isArray(tagIds)) return []
  return Array.from(new Set(tagIds.map((id) => Number(id)).filter((id) => Number.isInteger(id) && id > 0)))
}

function replaceEntryTags(entryId: number, tagIds?: unknown): void {
  if (!Array.isArray(tagIds)) return
  const normalized = normalizeTagIds(tagIds)
  db().prepare('DELETE FROM entries_to_tags WHERE entry_id = ?').run(entryId)
  if (normalized.length === 0) return
  const insert = db().prepare('INSERT INTO entries_to_tags (entry_id, tag_id) VALUES (?, ?)')
  for (const tagId of normalized) {
    insert.run(entryId, tagId)
  }
}

function getEntryTags(entryId: number): Array<{ id: number; name: string; color: string | null }> {
  const rows = db().prepare(`
    SELECT t.*
    FROM tags t
    INNER JOIN entries_to_tags ett ON ett.tag_id = t.id
    WHERE ett.entry_id = ?
    ORDER BY t.name ASC
  `).all(entryId) as JsonRecord[]
  return rows.map((row) => ({
    id: Number(row.id),
    name: String(row.name ?? ''),
    color: row.color == null ? null : String(row.color),
  }))
}

function mapWorkoutSession(entryRow: JsonRecord): WorkoutSessionReadModel | undefined {
  const sessionId = entryRow.session_id ?? entryRow.sessionId
  if (sessionId == null) return undefined

  const sessionExerciseRows = db().prepare(`
    SELECT *
    FROM workout_session_exercises
    WHERE session_entry_id = ?
    ORDER BY order_index ASC, id ASC
  `).all(Number(entryRow.id)) as JsonRecord[]

  const sessionSets = sessionExerciseRows.length > 0
    ? db().prepare(`
      SELECT *
      FROM workout_sets
      WHERE session_exercise_id IN (${sessionExerciseRows.map(() => '?').join(',')})
      ORDER BY set_index ASC, id ASC
    `).all(...sessionExerciseRows.map((row) => Number(row.id))) as JsonRecord[]
    : []

  const routineId = entryRow.routine_id == null ? null : Number(entryRow.routine_id)
  const routineRow = routineId == null
    ? null
    : db().prepare('SELECT * FROM workout_routines WHERE id = ? LIMIT 1').get(routineId) as JsonRecord | undefined
  const routineExercises = routineId == null
    ? []
    : db().prepare('SELECT * FROM workout_routine_exercises WHERE routine_id = ? ORDER BY order_index ASC, id ASC').all(routineId) as JsonRecord[]

  return buildWorkoutSessionReadModel({
    entryId: Number(entryRow.id),
    trackerId: Number(entryRow.tracker_id ?? entryRow.trackerId),
    timestamp: Number(entryRow.timestamp),
    dateStr: String(entryRow.date_str ?? entryRow.dateStr),
    note: entryRow.note == null ? null : String(entryRow.note),
    value: entryRow.value == null ? null : Number(entryRow.value),
    sessionRow: {
      entryId: Number(entryRow.id),
      routineId,
      sessionName: entryRow.session_name == null ? null : String(entryRow.session_name),
      durationMinutes: entryRow.duration_minutes == null ? null : Number(entryRow.duration_minutes),
      loadUnit: validateWorkoutWeightUnit(entryRow.load_unit),
      createdAt: entryRow.created_at == null ? null : Number(entryRow.created_at),
      updatedAt: entryRow.updated_at == null ? null : Number(entryRow.updated_at),
    },
    routineRow: routineRow ? {
      id: routineRow.id,
      trackerId: routineRow.tracker_id,
      name: routineRow.name,
      notes: routineRow.notes,
      loadUnit: routineRow.load_unit,
      createdAt: routineRow.created_at,
      updatedAt: routineRow.updated_at,
    } : null,
    sessionExercises: sessionExerciseRows,
    sessionSets,
    routineExercises,
  })
}

function loadSessionByEntryId(entryId: number): WorkoutSessionReadModel | null {
  const entryRow = db().prepare(`
    SELECT e.*, ws.routine_id, ws.session_name, ws.duration_minutes, ws.load_unit, ws.created_at, ws.updated_at, ws.entry_id AS session_id
    FROM entries e
    LEFT JOIN workout_sessions ws ON ws.entry_id = e.id
    WHERE e.id = ?
    LIMIT 1
  `).get(entryId) as JsonRecord | undefined
  if (!entryRow) return null
  return mapWorkoutSession(entryRow) ?? null
}

function workoutTagsForEntry(entryId: number) {
  return getEntryTags(entryId)
}

function validateSessionExercises(exercises: WorkoutSessionExerciseInput[]): WorkoutSessionExerciseInput[] {
  if (!Array.isArray(exercises) || exercises.length === 0) throw new Error('At least one exercise is required')
  return exercises.map((exercise, index) => {
    if (!exercise.exerciseId?.trim() || !exercise.name?.trim()) throw new Error('Exercise name and id are required')
    if (!Array.isArray(exercise.sets) || exercise.sets.length === 0) throw new Error('At least one set is required for each exercise')
    return {
      ...exercise,
      orderIndex: index,
      bodyPartSnapshot: exercise.bodyPartSnapshot ?? [],
      secondaryBodyPartSnapshot: exercise.secondaryBodyPartSnapshot ?? [],
      sets: exercise.sets.map((set, setIndex) => ({
        setIndex: Number.isInteger(set.setIndex) && set.setIndex > 0 ? set.setIndex : setIndex + 1,
        reps: set.reps == null ? null : validateWorkoutReps(set.reps),
        load: set.load == null ? null : validateWorkoutLoad(set.load),
        notes: set.notes ?? null,
        isWarmup: set.isWarmup ?? false,
      })),
    }
  })
}

function validateRoutineExercises(exercises: WorkoutRoutineExerciseInput[]): WorkoutRoutineExerciseInput[] {
  if (!Array.isArray(exercises) || exercises.length === 0) throw new Error('At least one exercise is required')
  return exercises.map((exercise, index) => {
    if (!exercise.exerciseId?.trim() || !exercise.name?.trim()) throw new Error('Exercise name and id are required')
    return {
      ...exercise,
      orderIndex: Number.isInteger(exercise.orderIndex) ? exercise.orderIndex : index,
      targetSets: Number.isInteger(exercise.targetSets) && exercise.targetSets > 0 ? Math.trunc(exercise.targetSets) : 1,
      targetReps: exercise.targetReps == null ? null : validateWorkoutReps(exercise.targetReps),
      defaultLoad: exercise.defaultLoad == null ? null : validateWorkoutLoad(exercise.defaultLoad),
    }
  })
}

function buildMetadata(session: WorkoutSessionReadModel): JsonRecord {
  return {
    trackerKind: 'exercise',
    workoutSession: {
      structured: true,
      title: session.title,
      note: session.note,
      sessionName: session.sessionName,
      startedAt: session.timestamp,
      completedAt: session.completedAt,
      totalSets: session.totalSets,
      loadUnit: session.loadUnit,
      routine: session.routine ? { id: session.routine.id, name: session.routine.name, notes: session.routine.notes, loadUnit: session.routine.loadUnit } : null,
      exercises: session.exercises.map((exercise) => ({
        exerciseId: exercise.exerciseId,
        sourceExerciseId: exercise.sourceExerciseId ?? null,
        name: exercise.exerciseName,
        category: exercise.category,
        level: exercise.level,
        equipment: exercise.equipment,
        bodyPartSnapshot: exercise.bodyPartSnapshot ?? [],
        secondaryBodyPartSnapshot: exercise.secondaryBodyPartSnapshot ?? [],
        force: exercise.force,
        mechanic: exercise.mechanic,
        notes: exercise.notes ?? null,
        sets: exercise.sets.map((set) => ({
          setIndex: set.setIndex,
          reps: set.reps,
          load: set.load,
          weight: set.weight,
          weightUnit: set.weightUnit,
        })),
      })),
    },
  }
}

function getWorkoutHistoryEntries(trackerId: number, limit = 365): { structuredSessions: WorkoutSessionReadModel[]; legacySessions: LegacyExerciseEntryReadModel[] } {
  const rows = db().prepare(`
    SELECT e.*, ws.routine_id, ws.session_name, ws.duration_minutes, ws.load_unit, ws.created_at, ws.updated_at, ws.entry_id AS session_id
    FROM entries e
    LEFT JOIN workout_sessions ws ON ws.entry_id = e.id
    WHERE e.tracker_id = ?
    ORDER BY e.timestamp DESC
    LIMIT ?
  `).all(trackerId, limit) as JsonRecord[]

  const structuredSessions: WorkoutSessionReadModel[] = []
  const legacySessions: LegacyExerciseEntryReadModel[] = []
  for (const row of rows) {
    const session = mapWorkoutSession(row)
    if (session) {
      structuredSessions.push(session)
    } else {
      const metadata = parseJsonObject(row.metadata) as Record<string, any>
      const loadUnit = normalizeWorkoutWeightUnit(metadata.workoutSession?.loadUnit ?? metadata.workout?.loadUnit ?? metadata.unit) ?? null
      legacySessions.push(buildWorkoutLegacyEntryReadModel({
        id: Number(row.id),
        trackerId: Number(row.tracker_id),
        timestamp: Number(row.timestamp),
        dateStr: row.date_str == null ? null : String(row.date_str),
        note: row.note == null ? null : String(row.note),
        loadUnit,
      }))
    }
  }
  return { structuredSessions, legacySessions }
}

export function getWorkoutSession(entryId: number): WorkoutSessionDetailResponse | null {
  const session = loadSessionByEntryId(entryId)
  if (!session) return null
  return { session, tags: workoutTagsForEntry(entryId) }
}

export function createWorkoutSession(data: CreateWorkoutSessionRequest): WorkoutSessionDetailResponse | null {
  if (!isExerciseTracker(data.trackerId)) {
    throw new Error('Workout sessions can only be created for the Exercise tracker')
  }
  const timestamp = Number(data.timestamp)
  if (!Number.isFinite(timestamp)) throw new Error('Timestamp must be finite')
  const loadUnit = validateWorkoutWeightUnit(data.loadUnit)
  const exercises = validateSessionExercises(data.exercises)
  const totalSets = exercises.reduce((sum, exercise) => sum + exercise.sets.length, 0)
  const dateStr = formatDateStr(timestamp)

  const inserted = db().transaction(() => {
    const entryResult = db().prepare(`
      INSERT INTO entries (tracker_id, value, note, metadata, timestamp, date_str, asset_id)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(data.trackerId, totalSets, data.note ?? data.sessionName ?? null, JSON.stringify({
      trackerKind: 'exercise',
      workoutSession: {
        structured: true,
        title: data.sessionName ?? data.note ?? null,
        note: data.note ?? null,
        sessionName: data.sessionName ?? null,
        startedAt: timestamp,
        completedAt: timestamp,
        totalSets,
        loadUnit,
        routine: null,
        exercises,
      },
    }), timestamp, dateStr, data.assetId ?? null)
    const entryId = Number(entryResult.lastInsertRowid)

    db().prepare(`
      INSERT INTO workout_sessions (entry_id, routine_id, session_name, duration_minutes, load_unit)
      VALUES (?, ?, ?, ?, ?)
    `).run(entryId, data.routineId ?? null, data.sessionName ?? null, data.durationMinutes ?? null, loadUnit)

    const sessionExerciseStmt = db().prepare(`
      INSERT INTO workout_session_exercises (
        session_entry_id, exercise_key, source_exercise_id, exercise_name,
        category_snapshot, level_snapshot, equipment_snapshot, body_part_snapshot,
        secondary_body_part_snapshot, force_snapshot, mechanic_snapshot, order_index
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `)
    const setStmt = db().prepare('INSERT INTO workout_sets (session_exercise_id, set_index, reps, load) VALUES (?, ?, ?, ?)')

    for (const [exerciseIndex, exercise] of exercises.entries()) {
      const result = sessionExerciseStmt.run(
        entryId,
        exercise.exerciseId,
        exercise.sourceExerciseId ?? null,
        exercise.name,
        exercise.category ?? null,
        exercise.level ?? null,
        exercise.equipment ?? null,
        JSON.stringify(exercise.bodyPartSnapshot ?? []),
        JSON.stringify(exercise.secondaryBodyPartSnapshot ?? []),
        exercise.force ?? null,
        exercise.mechanic ?? null,
        exerciseIndex,
      )
      const sessionExerciseId = Number(result.lastInsertRowid)
      for (const set of exercise.sets) {
        setStmt.run(sessionExerciseId, set.setIndex, set.reps ?? null, set.load ?? null)
      }
    }

    replaceEntryTags(entryId, data.tagIds)
    return entryId
  })()

  return getWorkoutSession(inserted)
}

export function updateWorkoutSession(entryId: number, updates: UpdateWorkoutSessionRequest): WorkoutSessionDetailResponse | null {
  const existing = loadSessionByEntryId(entryId)
  if (!existing) throw new Error('Workout session not found')
  const exercises = updates.exercises ? validateSessionExercises(updates.exercises) : existing.exercises.map((exercise, index) => ({
    exerciseId: exercise.exerciseId,
    sourceExerciseId: exercise.sourceExerciseId ?? null,
    name: exercise.exerciseName,
    category: exercise.category,
    level: exercise.level,
    equipment: exercise.equipment,
    bodyPartSnapshot: exercise.bodyPartSnapshot ?? [],
    secondaryBodyPartSnapshot: exercise.secondaryBodyPartSnapshot ?? [],
    force: exercise.force,
    mechanic: exercise.mechanic,
    sets: exercise.sets.map((set) => ({
      setIndex: set.setIndex,
      reps: set.reps ?? null,
      load: set.load ?? null,
      notes: set.notes ?? null,
      isWarmup: set.isWarmup ?? false,
    })),
  }))
  const timestamp = updates.timestamp ?? existing.timestamp
  const loadUnit = updates.loadUnit ? validateWorkoutWeightUnit(updates.loadUnit) : existing.loadUnit
  const dateStr = formatDateStr(timestamp)
  const totalSets = exercises.reduce((sum, exercise) => sum + exercise.sets.length, 0)

  db().transaction(() => {
    const metadataExercises = exercises.map((exercise) => ({
      exerciseId: exercise.exerciseId,
      sourceExerciseId: exercise.sourceExerciseId ?? null,
      exerciseName: exercise.name,
      category: exercise.category ?? null,
      level: exercise.level ?? null,
      equipment: exercise.equipment ?? null,
      bodyPartSnapshot: exercise.bodyPartSnapshot ?? [],
      secondaryBodyPartSnapshot: exercise.secondaryBodyPartSnapshot ?? [],
      force: exercise.force ?? null,
      mechanic: exercise.mechanic ?? null,
      notes: null,
      sets: exercise.sets.map((set) => ({
        setIndex: set.setIndex,
        reps: set.reps ?? null,
        load: set.load ?? null,
        weight: set.load ?? null,
        weightUnit: loadUnit,
        notes: set.notes ?? null,
        isWarmup: set.isWarmup ?? false,
      })),
    }))

    db().prepare('UPDATE entries SET value = ?, note = ?, metadata = ?, timestamp = ?, date_str = ?, asset_id = COALESCE(?, asset_id) WHERE id = ?').run(
      totalSets,
      updates.note ?? existing.note,
      JSON.stringify(buildMetadata({
        ...existing,
        timestamp,
        dateStr,
        note: updates.note ?? existing.note,
        sessionName: updates.sessionName ?? existing.sessionName,
        durationMinutes: updates.durationMinutes ?? existing.durationMinutes,
        loadUnit,
        exercises: metadataExercises,
      })),
      timestamp,
      dateStr,
      updates.assetId ?? null,
      entryId,
    )
    db().prepare('UPDATE workout_sessions SET routine_id = ?, session_name = ?, duration_minutes = ?, load_unit = ? WHERE entry_id = ?').run(
      updates.routineId === undefined ? existing.routineId : updates.routineId,
      updates.sessionName === undefined ? existing.sessionName : updates.sessionName,
      updates.durationMinutes === undefined ? existing.durationMinutes : updates.durationMinutes,
      loadUnit,
      entryId,
    )
    const oldExerciseIds = db().prepare('SELECT id FROM workout_session_exercises WHERE session_entry_id = ?').all(entryId) as Array<{ id: number }>
    if (oldExerciseIds.length > 0) {
      const placeholders = oldExerciseIds.map(() => '?').join(',')
      db().prepare(`DELETE FROM workout_sets WHERE session_exercise_id IN (${placeholders})`).run(...oldExerciseIds.map((row) => row.id))
      db().prepare('DELETE FROM workout_session_exercises WHERE session_entry_id = ?').run(entryId)
    }
    const sessionExerciseStmt = db().prepare(`
      INSERT INTO workout_session_exercises (
        session_entry_id, exercise_key, source_exercise_id, exercise_name,
        category_snapshot, level_snapshot, equipment_snapshot, body_part_snapshot,
        secondary_body_part_snapshot, force_snapshot, mechanic_snapshot, order_index
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `)
    const setStmt = db().prepare('INSERT INTO workout_sets (session_exercise_id, set_index, reps, load) VALUES (?, ?, ?, ?)')
    for (const [exerciseIndex, exercise] of exercises.entries()) {
      const result = sessionExerciseStmt.run(
        entryId,
        exercise.exerciseId,
        exercise.sourceExerciseId ?? null,
        exercise.name,
        exercise.category ?? null,
        exercise.level ?? null,
        exercise.equipment ?? null,
        JSON.stringify(exercise.bodyPartSnapshot ?? []),
        JSON.stringify(exercise.secondaryBodyPartSnapshot ?? []),
        exercise.force ?? null,
        exercise.mechanic ?? null,
        exerciseIndex,
      )
      const sessionExerciseId = Number(result.lastInsertRowid)
      for (const set of exercise.sets) {
        setStmt.run(sessionExerciseId, set.setIndex, set.reps ?? null, set.load ?? null)
      }
    }
    if (updates.tagIds !== undefined) replaceEntryTags(entryId, updates.tagIds)
  })

  return getWorkoutSession(entryId)
}

export function deleteWorkoutSession(entryId: number): boolean {
  db().prepare('DELETE FROM entries_to_tags WHERE entry_id = ?').run(entryId)
  db().prepare('DELETE FROM entries WHERE id = ?').run(entryId)
  return true
}

export function getWorkoutRoutines(trackerId: number): { routines: WorkoutRoutineReadModel[] } {
  if (!isExerciseTracker(trackerId)) throw new Error('Workout routines can only be read for the Exercise tracker')
  const rows = db().prepare('SELECT * FROM workout_routines WHERE tracker_id = ? ORDER BY updated_at DESC, created_at DESC, id DESC').all(trackerId) as JsonRecord[]
  const routines = rows.map((row) => {
    const exercises = db().prepare('SELECT * FROM workout_routine_exercises WHERE routine_id = ? ORDER BY order_index ASC, id ASC').all(Number(row.id)) as JsonRecord[]
    return buildWorkoutRoutineReadModel(row, exercises)
  })
  return { routines }
}

export function getWorkoutRoutine(routineId: number): WorkoutRoutineDetailResponse | null {
  const row = db().prepare('SELECT * FROM workout_routines WHERE id = ? LIMIT 1').get(routineId) as JsonRecord | undefined
  if (!row) return null
  const exercises = db().prepare('SELECT * FROM workout_routine_exercises WHERE routine_id = ? ORDER BY order_index ASC, id ASC').all(routineId) as JsonRecord[]
  return { routine: buildWorkoutRoutineReadModel(row, exercises) }
}

export function createWorkoutRoutine(data: CreateWorkoutRoutineRequest): WorkoutRoutineDetailResponse | null {
  if (!isExerciseTracker(data.trackerId)) throw new Error('Workout routines can only be created for the Exercise tracker')
  const name = data.name.trim()
  if (!name) throw new Error('Routine name is required')
  const loadUnit = validateWorkoutWeightUnit(data.loadUnit)
  const exercises = validateRoutineExercises(data.exercises)
  const routineId = db().transaction(() => {
    const result = db().prepare('INSERT INTO workout_routines (tracker_id, name, notes, load_unit) VALUES (?, ?, ?, ?)').run(data.trackerId, name, data.notes ?? null, loadUnit)
    const id = Number(result.lastInsertRowid)
    const insert = db().prepare(`
      INSERT INTO workout_routine_exercises (
        routine_id, exercise_key, source_exercise_id, exercise_name, category_snapshot, level_snapshot, equipment_snapshot,
        body_part_snapshot, secondary_body_part_snapshot, force_snapshot, mechanic_snapshot, order_index, target_sets, target_reps, default_load
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `)
    for (const [exerciseIndex, exercise] of exercises.entries()) {
      insert.run(
        id,
        exercise.exerciseId,
        exercise.sourceExerciseId ?? null,
        exercise.name,
        exercise.category ?? null,
        exercise.level ?? null,
        exercise.equipment ?? null,
        JSON.stringify(exercise.bodyPartSnapshot ?? []),
        JSON.stringify(exercise.secondaryBodyPartSnapshot ?? []),
        exercise.force ?? null,
        exercise.mechanic ?? null,
        exercise.orderIndex ?? exerciseIndex,
        exercise.targetSets,
        exercise.targetReps ?? null,
        exercise.defaultLoad ?? null,
      )
    }
    return id
  })()
  return getWorkoutRoutine(routineId)
}

export function updateWorkoutRoutine(routineId: number, updates: UpdateWorkoutRoutineRequest): WorkoutRoutineDetailResponse | null {
  const existing = getWorkoutRoutine(routineId)
  if (!existing) return null
  const exercises = updates.exercises ? validateRoutineExercises(updates.exercises) : existing.routine.exercises.map((exercise, index) => ({
    exerciseId: exercise.exerciseId,
    sourceExerciseId: exercise.sourceExerciseId ?? null,
    name: exercise.exerciseName,
    category: exercise.category,
    level: exercise.level,
    equipment: exercise.equipment,
    bodyPartSnapshot: exercise.bodyPartSnapshot ?? [],
    secondaryBodyPartSnapshot: exercise.secondaryBodyPartSnapshot ?? [],
    force: exercise.force,
    mechanic: exercise.mechanic,
      orderIndex: index,
    targetSets: exercise.targetSets,
    targetReps: exercise.targetReps,
    defaultLoad: exercise.defaultLoad,
    sets: [],
  }))
  const loadUnit = updates.loadUnit ? validateWorkoutWeightUnit(updates.loadUnit) : existing.routine.loadUnit
  db().transaction(() => {
    db().prepare('UPDATE workout_routines SET name = ?, notes = ?, load_unit = ?, updated_at = ? WHERE id = ?').run(
      updates.name?.trim() || existing.routine.name,
      updates.notes === undefined ? existing.routine.notes : updates.notes,
      loadUnit,
      Date.now(),
      routineId,
    )
    db().prepare('DELETE FROM workout_routine_exercises WHERE routine_id = ?').run(routineId)
    const insert = db().prepare(`
      INSERT INTO workout_routine_exercises (
        routine_id, exercise_key, source_exercise_id, exercise_name, category_snapshot, level_snapshot, equipment_snapshot,
        body_part_snapshot, secondary_body_part_snapshot, force_snapshot, mechanic_snapshot, order_index, target_sets, target_reps, default_load
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `)
    for (const [exerciseIndex, exercise] of exercises.entries()) {
      insert.run(
        routineId,
        exercise.exerciseId,
        exercise.sourceExerciseId ?? null,
        exercise.name,
        exercise.category ?? null,
        exercise.level ?? null,
        exercise.equipment ?? null,
        JSON.stringify(exercise.bodyPartSnapshot ?? []),
        JSON.stringify(exercise.secondaryBodyPartSnapshot ?? []),
        exercise.force ?? null,
        exercise.mechanic ?? null,
        exercise.orderIndex ?? exerciseIndex,
        exercise.targetSets ?? 1,
        exercise.targetReps ?? null,
        exercise.defaultLoad ?? null,
      )
    }
  })
  return getWorkoutRoutine(routineId)
}

export function deleteWorkoutRoutine(routineId: number): DeleteWorkoutRoutineResponse {
  db().prepare('DELETE FROM workout_routines WHERE id = ?').run(routineId)
  return { success: true }
}

export function instantiateWorkoutFromRoutine(data: InstantiateWorkoutFromRoutineRequest): CreateWorkoutSessionRequest | null {
  const routine = getWorkoutRoutine(data.routineId)
  if (!routine) return null
  return {
    trackerId: routine.routine.trackerId,
    timestamp: data.timestamp,
    sessionName: routine.routine.name,
    note: routine.routine.notes ?? null,
    routineId: routine.routine.id,
    durationMinutes: null,
    loadUnit: routine.routine.loadUnit,
    exercises: routine.routine.exercises.map((exercise) => ({
      exerciseId: exercise.exerciseId,
      sourceExerciseId: exercise.sourceExerciseId ?? null,
      name: exercise.exerciseName,
      category: exercise.category,
      level: exercise.level,
      equipment: exercise.equipment,
      bodyPartSnapshot: exercise.bodyPartSnapshot ?? [],
      secondaryBodyPartSnapshot: exercise.secondaryBodyPartSnapshot ?? [],
      force: exercise.force,
      mechanic: exercise.mechanic,
      sets: Array.from({ length: exercise.targetSets }, (_, index) => ({
        setIndex: index + 1,
        reps: exercise.targetReps ?? null,
        load: exercise.defaultLoad ?? null,
      })),
    })),
  }
}

export function saveWorkoutAsRoutine(data: SaveWorkoutAsRoutineRequest): WorkoutRoutineDetailResponse | null {
  const session = loadSessionByEntryId(data.sessionEntryId)
  if (!session) return null
  return createWorkoutRoutine({
    trackerId: session.trackerId,
    name: data.name,
    notes: data.notes ?? session.note ?? null,
    loadUnit: session.loadUnit,
    exercises: session.exercises.map((exercise, index) => ({
      exerciseId: exercise.exerciseId,
      sourceExerciseId: exercise.sourceExerciseId ?? null,
      name: exercise.exerciseName,
      category: exercise.category,
      level: exercise.level,
      equipment: exercise.equipment,
      bodyPartSnapshot: exercise.bodyPartSnapshot ?? [],
      secondaryBodyPartSnapshot: exercise.secondaryBodyPartSnapshot ?? [],
      force: exercise.force,
      mechanic: exercise.mechanic,
      orderIndex: index,
      targetSets: exercise.sets.length,
      targetReps: exercise.sets[0]?.reps ?? null,
      defaultLoad: exercise.sets[0]?.load ?? null,
    })),
  })
}

export function getWorkoutHistory(trackerId: number, limit = 365): { trackerId: number; structuredSessions: WorkoutSessionReadModel[]; legacySessions: LegacyExerciseEntryReadModel[]; totalSessions: number; totalStructuredSessions: number; totalLegacySessions: number } {
  if (!isExerciseTracker(trackerId)) throw new Error('Workout history can only be read for the Exercise tracker')
  const { structuredSessions, legacySessions } = getWorkoutHistoryEntries(trackerId, limit)
  return {
    trackerId,
    structuredSessions,
    legacySessions,
    totalSessions: structuredSessions.length + legacySessions.length,
    totalStructuredSessions: structuredSessions.length,
    totalLegacySessions: legacySessions.length,
  }
}

export function getWorkoutHome(trackerId: number): WorkoutHomeReadModel {
  const history = getWorkoutHistory(trackerId, 30)
  const routines = getWorkoutRoutines(trackerId)
  return buildWorkoutHomeReadModel({
    trackerId,
    title: 'Exercise',
    sessions: history.structuredSessions,
    routines: routines.routines,
    loadUnit: history.structuredSessions[0]?.loadUnit ?? routines.routines[0]?.loadUnit ?? null,
  })
}

export function getWorkoutStatistics(trackerId: number): WorkoutStatisticsReadModel {
  const history = getWorkoutHistory(trackerId, 365)
  return buildWorkoutStatisticsReadModel({ trackerId, sessions: history.structuredSessions })
}

export function getWorkoutGraph(trackerId: number): WorkoutGraphReadModel {
  const history = getWorkoutHistory(trackerId, 365)
  return buildWorkoutGraphReadModel({ trackerId, sessions: history.structuredSessions })
}

export function getWorkoutCalendar(trackerId: number, year: number, month: number): WorkoutCalendarReadModel {
  const history = getWorkoutHistory(trackerId, 120)
  return buildWorkoutCalendarReadModel({
    year,
    month,
    sessions: history.structuredSessions.filter((session) => {
      const date = new Date(session.timestamp)
      return date.getFullYear() === year && date.getMonth() === month
    }),
  })
}

export function getExerciseProgress(trackerId: number, exerciseId: string): ExerciseProgressReadModel {
  const history = getWorkoutHistory(trackerId, 365)
  const exercise = history.structuredSessions.flatMap((session) => session.exercises).find((item) => item.exerciseId === exerciseId)
  return buildExerciseProgressReadModel({
    exerciseId,
    exerciseName: exercise?.exerciseName ?? exerciseId,
    loadUnit: history.structuredSessions[0]?.loadUnit ?? 'kg',
    sessions: history.structuredSessions,
  })
}
