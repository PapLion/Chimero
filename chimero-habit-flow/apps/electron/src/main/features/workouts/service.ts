import { desc, eq, inArray } from 'drizzle-orm'
import {
  entries,
  entriesToTags,
  trackers,
  workoutRoutineExercises,
  workoutRoutines,
  workoutSessionExercises,
  workoutSessions,
  workoutSets,
} from '@packages/db'
import { getDb } from '@packages/db/database'
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
  validateWorkoutLoad,
  validateWorkoutReps,
  validateWorkoutWeightUnit,
} from '@contracts/domain'
import type {
  CreateWorkoutRoutineRequest,
  CreateWorkoutSessionRequest,
  DeleteWorkoutRoutineResponse,
  ExerciseProgressReadModel,
  InstantiateWorkoutFromRoutineRequest,
  ListWorkoutRoutinesResponse,
  LegacyExerciseEntryReadModel,
  SaveWorkoutAsRoutineRequest,
  Tag,
  UpdateWorkoutRoutineRequest,
  UpdateWorkoutSessionRequest,
  WorkoutSessionExerciseInput,
  WorkoutCalendarReadModel,
  WorkoutGraphReadModel,
  WorkoutHomeReadModel,
  WorkoutRoutineDetailResponse,
  WorkoutRoutineExerciseInput,
  WorkoutRoutineReadModel,
  WorkoutSessionDetailResponse,
  WorkoutSessionReadModel,
  WorkoutStatisticsReadModel,
} from '@contracts/contracts'
import { mapEntry, mapTracker } from '../../shared/mappers'
import { getTrackerIdentity } from '@contracts/features/tracking'
import { getEntryTagIds, getTags, replaceEntryTags } from '../tags/service'

type JsonRecord = Record<string, unknown>

function formatDateStr(timestamp: number): string {
  const date = new Date(timestamp)
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

function assertFiniteNumber(value: number, label: string): void {
  if (!Number.isFinite(value)) {
    throw new Error(`${label} must be a finite number`)
  }
}

async function isExerciseTracker(trackerId: number): Promise<boolean> {
  const [row] = await getDb()
    .select()
    .from(trackers)
    .where(eq(trackers.id, trackerId))
    .limit(1)

  if (!row) return false
  return getTrackerIdentity(mapTracker(row as Record<string, unknown>)) === 'exercise'
}

function mapRoutineRow(row: JsonRecord, exercises: JsonRecord[] = []): WorkoutRoutineReadModel {
  return buildWorkoutRoutineReadModel(row, exercises)
}

function groupBy<T, K extends string | number>(items: T[], getKey: (item: T) => K): Map<K, T[]> {
  const map = new Map<K, T[]>()
  for (const item of items) {
    const key = getKey(item)
    const list = map.get(key) ?? []
    list.push(item)
    map.set(key, list)
  }
  return map
}

async function tagsForEntry(entryId: number): Promise<Tag[]> {
  const [allTags, tagIdsByEntry] = await Promise.all([getTags(), getEntryTagIds([entryId])])
  const tagIds = new Set(tagIdsByEntry.get(entryId) ?? [])
  return allTags.filter((tag) => tagIds.has(tag.id))
}

async function getWorkoutRoutineRows(routineIds: number[]): Promise<Map<number, { routine: JsonRecord; exercises: JsonRecord[] }>> {
  if (routineIds.length === 0) return new Map()

  const db = getDb()
  const routineRows = await db
    .select()
    .from(workoutRoutines)
    .where(inArray(workoutRoutines.id, routineIds))

  const exerciseRows = await db
    .select()
    .from(workoutRoutineExercises)
    .where(inArray(workoutRoutineExercises.routineId, routineIds))
    .orderBy(workoutRoutineExercises.orderIndex, workoutRoutineExercises.id)

  const exercisesByRoutine = groupBy(exerciseRows as JsonRecord[], (row) => Number(row.routineId ?? row.routine_id))
  const result = new Map<number, { routine: JsonRecord; exercises: JsonRecord[] }>()
  for (const row of routineRows as JsonRecord[]) {
    const id = Number(row.id)
    result.set(id, { routine: row, exercises: exercisesByRoutine.get(id) ?? [] })
  }
  return result
}

async function getWorkoutSessionBundle(entryId: number): Promise<{
  entry: JsonRecord
  session: JsonRecord | null
  routine: JsonRecord | null
  sessionExercises: JsonRecord[]
  sessionSets: JsonRecord[]
  routineExercises: JsonRecord[]
}> {
  const [entryRow] = await getDb()
    .select({
      id: entries.id,
      trackerId: entries.trackerId,
      value: entries.value,
      note: entries.note,
      metadata: entries.metadata,
      timestamp: entries.timestamp,
      dateStr: entries.dateStr,
      assetId: entries.assetId,
      routineId: workoutSessions.routineId,
      sessionName: workoutSessions.sessionName,
      durationMinutes: workoutSessions.durationMinutes,
      loadUnit: workoutSessions.loadUnit,
      sessionCreatedAt: workoutSessions.createdAt,
      sessionUpdatedAt: workoutSessions.updatedAt,
      routineRowId: workoutRoutines.id,
      routineTrackerId: workoutRoutines.trackerId,
      routineName: workoutRoutines.name,
      routineNotes: workoutRoutines.notes,
      routineLoadUnit: workoutRoutines.loadUnit,
      routineCreatedAt: workoutRoutines.createdAt,
      routineUpdatedAt: workoutRoutines.updatedAt,
    })
    .from(entries)
    .leftJoin(workoutSessions, eq(workoutSessions.entryId, entries.id))
    .leftJoin(workoutRoutines, eq(workoutRoutines.id, workoutSessions.routineId))
    .where(eq(entries.id, entryId))
    .limit(1)

  if (!entryRow) {
    throw new Error('Workout session not found')
  }

  const session = (entryRow.routineId != null || entryRow.sessionName != null || entryRow.loadUnit != null)
    ? {
        entryId: Number(entryRow.id),
        routineId: entryRow.routineId == null ? null : Number(entryRow.routineId),
        sessionName: entryRow.sessionName ?? null,
        durationMinutes: entryRow.durationMinutes == null ? null : Number(entryRow.durationMinutes),
        loadUnit: validateWorkoutWeightUnit(entryRow.loadUnit),
        createdAt: entryRow.sessionCreatedAt == null ? null : Number(entryRow.sessionCreatedAt),
        updatedAt: entryRow.sessionUpdatedAt == null ? null : Number(entryRow.sessionUpdatedAt),
      }
    : null

  const sessionExerciseRows = await getDb()
    .select()
    .from(workoutSessionExercises)
    .where(eq(workoutSessionExercises.sessionEntryId, entryId))
    .orderBy(workoutSessionExercises.orderIndex, workoutSessionExercises.id)

  const sessionSets = sessionExerciseRows.length === 0
    ? []
    : await getDb()
      .select()
      .from(workoutSets)
      .where(inArray(workoutSets.sessionExerciseId, sessionExerciseRows.map((row) => row.id)))
      .orderBy(workoutSets.setIndex, workoutSets.id)

  const routineId = entryRow.routineId == null ? null : Number(entryRow.routineId)
  const routineBundle = routineId != null
    ? await getWorkoutRoutineRows([routineId])
    : new Map()
  const routineBundleRow = routineId != null ? routineBundle.get(routineId) ?? null : null
  const routineExercises = routineBundleRow?.exercises ?? []

  return {
    entry: entryRow as JsonRecord,
    session,
    routine: routineBundleRow
      ? {
          id: routineId,
          trackerId: Number(routineBundleRow.routine.trackerId),
          name: String(routineBundleRow.routine.name ?? ''),
          notes: routineBundleRow.routine.notes ?? null,
          loadUnit: validateWorkoutWeightUnit(routineBundleRow.routine.loadUnit),
          createdAt: routineBundleRow.routine.createdAt == null ? null : Number(routineBundleRow.routine.createdAt),
          updatedAt: routineBundleRow.routine.updatedAt == null ? null : Number(routineBundleRow.routine.updatedAt),
        }
      : null,
    sessionExercises: sessionExerciseRows as JsonRecord[],
    sessionSets: sessionSets as JsonRecord[],
    routineExercises,
  }
}

function buildSessionReadModel(bundle: Awaited<ReturnType<typeof getWorkoutSessionBundle>>): WorkoutSessionReadModel | undefined {
  const entry = mapEntry(bundle.entry as Record<string, unknown>)
  const session = buildWorkoutSessionReadModel({
    entryId: entry.id,
    trackerId: entry.trackerId,
    timestamp: entry.timestamp,
    dateStr: entry.dateStr,
    note: entry.note,
    value: entry.value,
    sessionRow: bundle.session,
    routineRow: bundle.routine,
    sessionExercises: bundle.sessionExercises,
    sessionSets: bundle.sessionSets,
    routineExercises: bundle.routineExercises,
  })
  return session
}

function normalizeWorkoutSessionExercises(exercises: WorkoutSessionExerciseInput[]): WorkoutSessionExerciseInput[] {
  return exercises.map((exercise) => {
    if (!exercise.exerciseId.trim() || !exercise.name.trim()) {
      throw new Error('Exercise name and id are required')
    }
    if (!Array.isArray(exercise.sets) || exercise.sets.length === 0) {
      throw new Error('At least one set is required for each exercise')
    }
    return {
      ...exercise,
      sets: exercise.sets.map((set, setIndex) => ({
        setIndex: Number.isInteger(set.setIndex) && set.setIndex > 0 ? set.setIndex : setIndex + 1,
        reps: set.reps == null ? null : validateWorkoutReps(set.reps),
        load: set.load == null ? null : validateWorkoutLoad(set.load),
        notes: set.notes ?? null,
        isWarmup: set.isWarmup ?? false,
      })),
      bodyPartSnapshot: exercise.bodyPartSnapshot ?? [],
      secondaryBodyPartSnapshot: exercise.secondaryBodyPartSnapshot ?? [],
    }
  })
}

function normalizeWorkoutRoutineExercises(exercises: WorkoutRoutineExerciseInput[]): WorkoutRoutineExerciseInput[] {
  return exercises
    .map((exercise, index) => ({
      ...exercise,
      orderIndex: Number.isInteger(exercise.orderIndex) ? exercise.orderIndex : index,
      targetSets: Number.isInteger(exercise.targetSets) && exercise.targetSets > 0 ? Math.trunc(exercise.targetSets) : 1,
      targetReps: exercise.targetReps == null ? null : validateWorkoutReps(exercise.targetReps),
      defaultLoad: exercise.defaultLoad == null ? null : validateWorkoutLoad(exercise.defaultLoad),
    }))
    .filter((exercise) => exercise.exerciseId.trim().length > 0 && exercise.name.trim().length > 0)
}

function assertWorkoutSessionExercises(exercises: WorkoutSessionExerciseInput[]): WorkoutSessionExerciseInput[] {
  if (!Array.isArray(exercises) || exercises.length === 0) {
    throw new Error('At least one exercise is required')
  }
  const normalized = normalizeWorkoutSessionExercises(exercises)
  if (normalized.length === 0) {
    throw new Error('At least one exercise is required')
  }
  return normalized
}

function assertWorkoutRoutineExercises(exercises: WorkoutRoutineExerciseInput[]): WorkoutRoutineExerciseInput[] {
  if (!Array.isArray(exercises) || exercises.length === 0) {
    throw new Error('At least one exercise is required')
  }
  const normalized = normalizeWorkoutRoutineExercises(exercises)
  if (normalized.length === 0) {
    throw new Error('At least one exercise is required')
  }
  return normalized
}

function buildSessionMetadata(session: WorkoutSessionReadModel): JsonRecord {
  return {
    trackerKind: 'exercise',
    workoutSession: {
      structured: true,
      routine: session.routine
        ? {
            id: session.routine.id,
            name: session.routine.name,
            notes: session.routine.notes,
            loadUnit: session.routine.loadUnit,
          }
        : null,
      title: session.title,
      note: session.note,
      sessionName: session.sessionName,
      startedAt: session.timestamp,
      completedAt: session.completedAt,
      totalSets: session.totalSets,
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
        notes: exercise.notes,
        sets: exercise.sets.map((set) => ({
          setIndex: set.setIndex,
          reps: set.reps,
          load: set.load,
          weight: set.weight,
          weightUnit: set.weightUnit,
          notes: set.notes ?? null,
          isWarmup: set.isWarmup ?? false,
        })),
      })),
    },
  }
}

async function persistSessionTags(tx: any, entryId: number, tagIds?: number[]): Promise<void> {
  await replaceEntryTags(entryId, tagIds, tx)
}

async function getWorkoutSessionReadModelByEntryId(entryId: number): Promise<WorkoutSessionReadModel | null> {
  const bundle = await getWorkoutSessionBundle(entryId)
  const session = buildSessionReadModel(bundle)
  return session ?? null
}

async function getWorkoutHistoryEntries(trackerId: number, limit = 365): Promise<{ structuredSessions: WorkoutSessionReadModel[]; legacySessions: LegacyExerciseEntryReadModel[] }> {
  const rows = await getDb()
    .select({
      id: entries.id,
      trackerId: entries.trackerId,
      value: entries.value,
      note: entries.note,
      metadata: entries.metadata,
      timestamp: entries.timestamp,
      dateStr: entries.dateStr,
      assetId: entries.assetId,
      routineId: workoutSessions.routineId,
      sessionName: workoutSessions.sessionName,
      durationMinutes: workoutSessions.durationMinutes,
      loadUnit: workoutSessions.loadUnit,
    })
    .from(entries)
    .leftJoin(workoutSessions, eq(workoutSessions.entryId, entries.id))
    .where(eq(entries.trackerId, trackerId))
    .orderBy(desc(entries.timestamp))
    .limit(limit)

  const structuredSessions: WorkoutSessionReadModel[] = []
  const legacySessions: LegacyExerciseEntryReadModel[] = []

  for (const row of rows as JsonRecord[]) {
    if (row.routineId != null || row.sessionName != null || row.loadUnit != null) {
      const session = await getWorkoutSessionReadModelByEntryId(Number(row.id))
      if (session) structuredSessions.push(session)
      continue
    }

    const mapped = mapEntry(row as Record<string, unknown>)
    if (mapped.workout) {
      legacySessions.push(buildWorkoutLegacyEntryReadModel({
        id: mapped.id,
        trackerId: mapped.trackerId,
        timestamp: mapped.timestamp,
        dateStr: mapped.dateStr,
        note: mapped.note,
        loadUnit: normalizeWorkoutWeightUnit(mapped.workout.loadUnit) ?? null,
      }))
      continue
    }

    legacySessions.push(buildWorkoutLegacyEntryReadModel({
      id: mapped.id,
      trackerId: mapped.trackerId,
      timestamp: mapped.timestamp,
      dateStr: mapped.dateStr,
      note: mapped.note,
      loadUnit: null,
    }))
  }

  return { structuredSessions, legacySessions }
}

export async function getWorkoutSession(entryId: number): Promise<WorkoutSessionDetailResponse | null> {
  const session = await getWorkoutSessionReadModelByEntryId(entryId)
  if (!session) return null
  return {
    session,
    tags: await tagsForEntry(entryId),
  }
}

export async function createWorkoutSession(data: CreateWorkoutSessionRequest): Promise<WorkoutSessionDetailResponse | null> {
  if (!(await isExerciseTracker(data.trackerId))) {
    throw new Error('Workout sessions can only be created for the Exercise tracker')
  }
  assertFiniteNumber(data.timestamp, 'Timestamp')
  const loadUnit = validateWorkoutWeightUnit(data.loadUnit)
  const exercises = assertWorkoutSessionExercises(data.exercises)
  const dateStr = formatDateStr(data.timestamp)

  const db = getDb()
  const entryId = await db.transaction(async (tx) => {
    const totalSets = exercises.reduce((sum, exercise) => sum + exercise.sets.length, 0)
    const [entryRow] = await tx
      .insert(entries)
      .values({
        trackerId: data.trackerId,
        value: totalSets,
        note: data.note ?? data.sessionName ?? null,
        metadata: JSON.stringify({
          trackerKind: 'exercise',
          workoutSession: {
            structured: true,
            title: data.sessionName ?? data.note ?? null,
            note: data.note ?? null,
            sessionName: data.sessionName ?? null,
            startedAt: data.timestamp,
            completedAt: data.timestamp,
            totalSets,
            routine: null,
            exercises,
            loadUnit,
          },
        }),
        timestamp: data.timestamp,
        dateStr,
        assetId: data.assetId ?? null,
      })
      .returning()

    if (!entryRow) return null
    const entryId = Number(entryRow.id)

    await tx.insert(workoutSessions).values({
      entryId,
      routineId: data.routineId ?? null,
      sessionName: data.sessionName ?? null,
      durationMinutes: data.durationMinutes ?? null,
      loadUnit,
    })

    for (const [exerciseIndex, exercise] of exercises.entries()) {
      const [sessionExerciseRow] = await tx.insert(workoutSessionExercises).values({
        sessionEntryId: entryId,
        exerciseKey: exercise.exerciseId,
        sourceExerciseId: exercise.sourceExerciseId ?? null,
        exerciseName: exercise.name,
        categorySnapshot: exercise.category ?? null,
        levelSnapshot: exercise.level ?? null,
        equipmentSnapshot: exercise.equipment ?? null,
        bodyPartSnapshot: JSON.stringify(exercise.bodyPartSnapshot ?? []),
        secondaryBodyPartSnapshot: JSON.stringify(exercise.secondaryBodyPartSnapshot ?? []),
        forceSnapshot: exercise.force ?? null,
        mechanicSnapshot: exercise.mechanic ?? null,
        orderIndex: exerciseIndex,
      }).returning({ id: workoutSessionExercises.id })

      if (!sessionExerciseRow) continue
      for (const set of exercise.sets) {
        await tx.insert(workoutSets).values({
          sessionExerciseId: Number(sessionExerciseRow.id),
          setIndex: set.setIndex,
          reps: set.reps ?? null,
          load: set.load ?? null,
        })
      }
    }

    await persistSessionTags(tx, entryId, data.tagIds)
    return entryId
  })

  if (entryId == null) return null
  return getWorkoutSession(entryId)
}

export async function updateWorkoutSession(entryId: number, updates: UpdateWorkoutSessionRequest): Promise<WorkoutSessionDetailResponse | null> {
  const existing = await getWorkoutSessionReadModelByEntryId(entryId)
  if (!existing) {
    throw new Error('Workout session not found')
  }

  const exercises = updates.exercises ? assertWorkoutSessionExercises(updates.exercises) : existing.exercises.map((exercise, index) => ({
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
    sets: exercise.sets.map((set) => ({
      setIndex: set.setIndex,
      reps: set.reps,
      load: set.load,
      notes: set.notes ?? null,
      isWarmup: set.isWarmup ?? false,
    })),
  }))

  const timestamp = updates.timestamp ?? existing.timestamp
  assertFiniteNumber(timestamp, 'Timestamp')
  const loadUnit = updates.loadUnit ? validateWorkoutWeightUnit(updates.loadUnit) : existing.loadUnit
  const dateStr = formatDateStr(timestamp)

  await getDb().transaction(async (tx) => {
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
        reps: set.reps,
        load: set.load,
        weight: set.load,
        weightUnit: loadUnit,
        notes: set.notes ?? null,
        isWarmup: set.isWarmup ?? false,
      })),
    }))

    const entryPatch: Record<string, unknown> = {
      timestamp,
      dateStr,
      note: updates.note ?? existing.note,
      value: exercises.reduce((sum, exercise) => sum + exercise.sets.length, 0),
      metadata: JSON.stringify(buildSessionMetadata({
        ...existing,
        timestamp,
        dateStr,
        note: updates.note ?? existing.note,
        sessionName: updates.sessionName ?? existing.sessionName,
        durationMinutes: updates.durationMinutes ?? existing.durationMinutes,
        loadUnit,
        routine: existing.routine,
        exercises: metadataExercises,
      } as WorkoutSessionReadModel)),
    }
    if (updates.assetId !== undefined) {
      entryPatch.assetId = updates.assetId
    }

    await tx.update(entries).set(entryPatch).where(eq(entries.id, entryId))
    await tx.update(workoutSessions).set({
      routineId: updates.routineId === undefined ? existing.routineId : updates.routineId,
      sessionName: updates.sessionName === undefined ? existing.sessionName : updates.sessionName,
      durationMinutes: updates.durationMinutes === undefined ? existing.durationMinutes : updates.durationMinutes,
      loadUnit,
    }).where(eq(workoutSessions.entryId, entryId))

    const existingSessionExercises = await tx
      .select({ id: workoutSessionExercises.id })
      .from(workoutSessionExercises)
      .where(eq(workoutSessionExercises.sessionEntryId, entryId))

    if (existingSessionExercises.length > 0) {
      await tx.delete(workoutSets).where(inArray(workoutSets.sessionExerciseId, existingSessionExercises.map((row) => row.id)))
      await tx.delete(workoutSessionExercises).where(eq(workoutSessionExercises.sessionEntryId, entryId))
    }

    for (const [exerciseIndex, exercise] of exercises.entries()) {
      const [sessionExerciseRow] = await tx.insert(workoutSessionExercises).values({
        sessionEntryId: entryId,
        exerciseKey: exercise.exerciseId,
        sourceExerciseId: exercise.sourceExerciseId ?? null,
        exerciseName: exercise.name,
        categorySnapshot: exercise.category ?? null,
        levelSnapshot: exercise.level ?? null,
        equipmentSnapshot: exercise.equipment ?? null,
        bodyPartSnapshot: JSON.stringify(exercise.bodyPartSnapshot ?? []),
        secondaryBodyPartSnapshot: JSON.stringify(exercise.secondaryBodyPartSnapshot ?? []),
        forceSnapshot: exercise.force ?? null,
        mechanicSnapshot: exercise.mechanic ?? null,
        orderIndex: exerciseIndex,
      }).returning({ id: workoutSessionExercises.id })

      if (!sessionExerciseRow) continue
      for (const set of exercise.sets) {
        await tx.insert(workoutSets).values({
          sessionExerciseId: Number(sessionExerciseRow.id),
          setIndex: set.setIndex,
          reps: set.reps ?? null,
          load: set.load ?? null,
        })
      }
    }

    if (updates.tagIds !== undefined) {
      await persistSessionTags(tx, entryId, updates.tagIds)
    }
  })

  return getWorkoutSession(entryId)
}

export async function deleteWorkoutSession(entryId: number): Promise<boolean> {
  await getDb().transaction(async (tx) => {
    await tx.delete(entriesToTags).where(eq(entriesToTags.entryId, entryId))
    await tx.delete(entries).where(eq(entries.id, entryId))
  })
  return true
}

export async function getWorkoutRoutines(trackerId: number): Promise<ListWorkoutRoutinesResponse> {
  if (!(await isExerciseTracker(trackerId))) {
    throw new Error('Workout routines can only be read for the Exercise tracker')
  }

  const rows = await getDb()
    .select()
    .from(workoutRoutines)
    .where(eq(workoutRoutines.trackerId, trackerId))
    .orderBy(desc(workoutRoutines.updatedAt), desc(workoutRoutines.createdAt), desc(workoutRoutines.id))

  const routineIds = rows.map((row) => Number(row.id))
  const exercisesRows = routineIds.length > 0
    ? await getDb()
      .select()
      .from(workoutRoutineExercises)
      .where(inArray(workoutRoutineExercises.routineId, routineIds))
      .orderBy(workoutRoutineExercises.orderIndex, workoutRoutineExercises.id)
    : []
  const exercisesByRoutine = groupBy(exercisesRows as JsonRecord[], (row) => Number(row.routineId ?? row.routine_id))

  return {
    routines: (rows as JsonRecord[]).map((row) => mapRoutineRow(row, exercisesByRoutine.get(Number(row.id)) ?? [])),
  }
}

export async function getWorkoutRoutine(routineId: number): Promise<WorkoutRoutineDetailResponse | null> {
  const rows = await getDb()
    .select()
    .from(workoutRoutines)
    .where(eq(workoutRoutines.id, routineId))
    .limit(1)

  const row = rows[0] as JsonRecord | undefined
  if (!row) return null
  const exercises = await getDb()
    .select()
    .from(workoutRoutineExercises)
    .where(eq(workoutRoutineExercises.routineId, routineId))
    .orderBy(workoutRoutineExercises.orderIndex, workoutRoutineExercises.id)

  return {
    routine: mapRoutineRow(row, exercises as JsonRecord[]),
  }
}

export async function createWorkoutRoutine(data: CreateWorkoutRoutineRequest): Promise<WorkoutRoutineDetailResponse | null> {
  if (!(await isExerciseTracker(data.trackerId))) {
    throw new Error('Workout routines can only be created for the Exercise tracker')
  }
  const name = data.name.trim()
  if (!name) throw new Error('Routine name is required')
  const loadUnit = validateWorkoutWeightUnit(data.loadUnit)
  const exercises = assertWorkoutRoutineExercises(data.exercises)

  const routineId = await getDb().transaction(async (tx) => {
    const [row] = await tx
      .insert(workoutRoutines)
      .values({
        trackerId: data.trackerId,
        name,
        notes: data.notes ?? null,
        loadUnit,
      })
      .returning({ id: workoutRoutines.id })
    if (!row) return null
    const id = Number(row.id)
    for (const [exerciseIndex, exercise] of exercises.entries()) {
      await tx.insert(workoutRoutineExercises).values({
        routineId: id,
        exerciseKey: exercise.exerciseId,
        sourceExerciseId: exercise.sourceExerciseId ?? null,
        exerciseName: exercise.name,
        categorySnapshot: exercise.category ?? null,
        levelSnapshot: exercise.level ?? null,
        equipmentSnapshot: exercise.equipment ?? null,
        bodyPartSnapshot: JSON.stringify(exercise.bodyPartSnapshot ?? []),
        secondaryBodyPartSnapshot: JSON.stringify(exercise.secondaryBodyPartSnapshot ?? []),
        forceSnapshot: exercise.force ?? null,
        mechanicSnapshot: exercise.mechanic ?? null,
        orderIndex: exercise.orderIndex ?? exerciseIndex,
        targetSets: exercise.targetSets,
        targetReps: exercise.targetReps ?? null,
        defaultLoad: exercise.defaultLoad ?? null,
      })
    }
    return id
  })

  if (routineId == null) return null
  return getWorkoutRoutine(routineId)
}

export async function updateWorkoutRoutine(routineId: number, updates: UpdateWorkoutRoutineRequest): Promise<WorkoutRoutineDetailResponse | null> {
  const existing = await getWorkoutRoutine(routineId)
  if (!existing) return null
  const exercises = updates.exercises ? assertWorkoutRoutineExercises(updates.exercises) : existing.routine.exercises.map((exercise, index) => ({
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
    orderIndex: exercise.orderIndex ?? index,
    targetSets: exercise.targetSets,
    targetReps: exercise.targetReps,
    defaultLoad: exercise.defaultLoad,
  }))
  const loadUnit = updates.loadUnit ? validateWorkoutWeightUnit(updates.loadUnit) : existing.routine.loadUnit

  await getDb().transaction(async (tx) => {
    await tx.update(workoutRoutines).set({
      name: updates.name?.trim() || existing.routine.name,
      notes: updates.notes === undefined ? existing.routine.notes : updates.notes,
      loadUnit,
      updatedAt: Date.now(),
    }).where(eq(workoutRoutines.id, routineId))

    await tx.delete(workoutRoutineExercises).where(eq(workoutRoutineExercises.routineId, routineId))
    for (const [exerciseIndex, exercise] of exercises.entries()) {
      await tx.insert(workoutRoutineExercises).values({
        routineId,
        exerciseKey: exercise.exerciseId,
        sourceExerciseId: exercise.sourceExerciseId ?? null,
        exerciseName: exercise.name,
        categorySnapshot: exercise.category ?? null,
        levelSnapshot: exercise.level ?? null,
        equipmentSnapshot: exercise.equipment ?? null,
        bodyPartSnapshot: JSON.stringify(exercise.bodyPartSnapshot ?? []),
        secondaryBodyPartSnapshot: JSON.stringify(exercise.secondaryBodyPartSnapshot ?? []),
        forceSnapshot: exercise.force ?? null,
        mechanicSnapshot: exercise.mechanic ?? null,
        orderIndex: exercise.orderIndex ?? exerciseIndex,
        targetSets: exercise.targetSets,
        targetReps: exercise.targetReps ?? null,
        defaultLoad: exercise.defaultLoad ?? null,
      })
    }
  })

  return getWorkoutRoutine(routineId)
}

export async function deleteWorkoutRoutine(routineId: number): Promise<DeleteWorkoutRoutineResponse> {
  await getDb().delete(workoutRoutines).where(eq(workoutRoutines.id, routineId))
  return { success: true }
}

export async function instantiateWorkoutFromRoutine(data: InstantiateWorkoutFromRoutineRequest): Promise<CreateWorkoutSessionRequest | null> {
  const routine = await getWorkoutRoutine(data.routineId)
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

export async function saveWorkoutAsRoutine(data: SaveWorkoutAsRoutineRequest): Promise<WorkoutRoutineDetailResponse | null> {
  const session = await getWorkoutSessionReadModelByEntryId(data.sessionEntryId)
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

export async function getWorkoutHistory(trackerId: number, options?: { limit?: number }): Promise<{ trackerId: number; structuredSessions: WorkoutSessionReadModel[]; legacySessions: LegacyExerciseEntryReadModel[]; totalSessions: number; totalStructuredSessions: number; totalLegacySessions: number }> {
  if (!(await isExerciseTracker(trackerId))) {
    throw new Error('Workout history can only be read for the Exercise tracker')
  }
  const { structuredSessions, legacySessions } = await getWorkoutHistoryEntries(trackerId, options?.limit ?? 365)
  return {
    trackerId,
    structuredSessions,
    legacySessions,
    totalSessions: structuredSessions.length + legacySessions.length,
    totalStructuredSessions: structuredSessions.length,
    totalLegacySessions: legacySessions.length,
  }
}

export async function getWorkoutHome(trackerId: number): Promise<WorkoutHomeReadModel> {
  const history = await getWorkoutHistory(trackerId, { limit: 30 })
  const routines = await getWorkoutRoutines(trackerId)
  return buildWorkoutHomeReadModel({
    trackerId,
    title: 'Exercise',
    sessions: history.structuredSessions,
    routines: routines.routines,
    loadUnit: history.structuredSessions[0]?.loadUnit ?? routines.routines[0]?.loadUnit ?? null,
  })
}

export async function getWorkoutStatistics(trackerId: number): Promise<WorkoutStatisticsReadModel> {
  const history = await getWorkoutHistory(trackerId, { limit: 365 })
  return buildWorkoutStatisticsReadModel({
    trackerId,
    sessions: history.structuredSessions,
  })
}

export async function getWorkoutGraph(trackerId: number): Promise<WorkoutGraphReadModel> {
  const history = await getWorkoutHistory(trackerId, { limit: 365 })
  return buildWorkoutGraphReadModel({
    trackerId,
    sessions: history.structuredSessions,
  })
}

export async function getWorkoutCalendar(trackerId: number, year: number, month: number): Promise<WorkoutCalendarReadModel> {
  const history = await getWorkoutHistory(trackerId, { limit: 120 })
  return buildWorkoutCalendarReadModel({
    year,
    month,
    sessions: history.structuredSessions.filter((session) => {
      const date = new Date(session.timestamp)
      return date.getFullYear() === year && date.getMonth() === month
    }),
  })
}

export async function getExerciseProgress(trackerId: number, exerciseId: string): Promise<ExerciseProgressReadModel> {
  const history = await getWorkoutHistory(trackerId, { limit: 365 })
  const session = history.structuredSessions.find((item) => item.exercises.some((exercise) => exercise.exerciseId === exerciseId))
  const exerciseName = session?.exercises.find((exercise) => exercise.exerciseId === exerciseId)?.exerciseName ?? exerciseId
  return buildExerciseProgressReadModel({
    exerciseId,
    exerciseName,
    loadUnit: session?.loadUnit ?? 'kg',
    sessions: history.structuredSessions,
  })
}
