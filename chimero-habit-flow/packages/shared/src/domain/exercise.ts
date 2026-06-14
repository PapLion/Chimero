import type {
  Entry,
  WorkoutExerciseReadModel,
  WorkoutRoutineReadModel,
  WorkoutSessionReadModel,
  WorkoutSetReadModel,
  WorkoutWeightUnit,
} from '../contracts/app-types'

type WorkoutMetadata = Record<string, unknown>

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function readMetadata(entry: Pick<Entry, 'metadata'> | WorkoutMetadata): WorkoutMetadata {
  const metadata = 'metadata' in entry ? entry.metadata : entry
  if (typeof metadata === 'string') {
    try {
      const parsed = JSON.parse(metadata)
      return isRecord(parsed) ? parsed : {}
    } catch {
      return {}
    }
  }
  return isRecord(metadata) ? metadata : {}
}

function readStringCandidate(value: unknown): string | null {
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : null
}

function readNumberCandidate(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number(value)
    return Number.isFinite(parsed) ? parsed : null
  }
  return null
}

function readBooleanCandidate(value: unknown): boolean {
  return value === true || value === 'true' || value === 1
}

function readStringArrayCandidate(value: unknown): string[] {
  if (!Array.isArray(value)) return []
  return value
    .map((item) => (typeof item === 'string' ? item.trim() : String(item).trim()))
    .filter((item) => item.length > 0)
}

function normalizeWorkoutWeightUnit(value: unknown): WorkoutWeightUnit | null {
  if (value === 'kg' || value === 'lb') return value
  if (value === 'lbs') return 'lb'
  return null
}

function buildWorkoutSets(rawSets: unknown, fallback: WorkoutSetReadModel): WorkoutSetReadModel[] {
  if (typeof rawSets === 'number' && Number.isFinite(rawSets) && rawSets > 0) {
    return Array.from({ length: Math.floor(rawSets) }, (_, index) => ({
      ...fallback,
      setIndex: index + 1,
    }))
  }

  if (Array.isArray(rawSets) && rawSets.length > 0) {
    return rawSets.map((set, index) => {
      if (!isRecord(set)) {
        return {
          ...fallback,
          setIndex: index + 1,
        }
      }

      return {
        setIndex: readNumberCandidate(set.setIndex ?? set.setNumber ?? set.index) ?? index + 1,
        reps: readNumberCandidate(set.reps ?? set.repetitions ?? set.count),
        load: readNumberCandidate(set.load ?? set.weight ?? set.weightValue),
        weight: readNumberCandidate(set.weight ?? set.load ?? set.weightValue),
        weightUnit: normalizeWorkoutWeightUnit(set.weightUnit ?? set.unit ?? fallback.weightUnit),
        notes: readStringCandidate(set.notes ?? set.note),
        isWarmup: readBooleanCandidate(set.isWarmup ?? set.warmup),
      }
    })
  }

  return [
    {
      ...fallback,
      setIndex: 1,
    },
  ]
}

function buildExerciseFallback(payload: WorkoutMetadata, index: number): WorkoutExerciseReadModel {
  const exerciseName =
    readStringCandidate(payload.exerciseName) ??
    readStringCandidate(payload.name) ??
    readStringCandidate(payload.title) ??
    `Exercise ${index + 1}`

  const reps = readNumberCandidate(payload.reps)
  const weight = readNumberCandidate(payload.weight)
  const weightUnit = normalizeWorkoutWeightUnit(payload.weightUnit ?? payload.unit)
  const setTemplate: WorkoutSetReadModel = {
    setIndex: 1,
    reps,
    load: weight,
    weight,
    weightUnit,
  }

  return {
    exerciseId: readStringCandidate(payload.exerciseId) ?? readStringCandidate(payload.id) ?? exerciseName.toLowerCase().replace(/\s+/g, '-'),
    exerciseName,
    category: readStringCandidate(payload.category) ?? null,
    level: readStringCandidate(payload.level) ?? null,
    equipment: readStringCandidate(payload.equipment) ?? null,
    bodyPartSnapshot: readStringArrayCandidate(payload.bodyPartSnapshot ?? payload.primaryMuscles ?? payload.muscles ?? payload.primaryMuscle),
    secondaryBodyPartSnapshot: readStringArrayCandidate(payload.secondaryBodyPartSnapshot ?? payload.secondaryMuscles ?? payload.secondaryMuscle),
    force: readStringCandidate(payload.force) ?? null,
    mechanic: readStringCandidate(payload.mechanic) ?? null,
    notes: readStringCandidate(payload.notes ?? payload.note),
    sets: buildWorkoutSets(payload.sets, setTemplate),
  }
}

function buildRoutine(payload: WorkoutMetadata): Pick<WorkoutRoutineReadModel, 'name' | 'notes'> | null {
  const routinePayload = [
    payload.routine,
    payload.workoutRoutine,
    payload.template,
    payload.plan,
  ].find(isRecord)

  if (!routinePayload) return null

  return {
    name:
      readStringCandidate(routinePayload.name) ??
      readStringCandidate(routinePayload.title) ??
      readStringCandidate(routinePayload.routineName) ??
      'Workout routine',
    notes: readStringCandidate(routinePayload.notes ?? routinePayload.note),
  }
}

export function buildLegacyWorkoutSessionReadModel(entry: Pick<Entry, 'id' | 'trackerId' | 'timestamp' | 'dateStr' | 'note' | 'metadata' | 'value'>): WorkoutSessionReadModel | undefined {
  const metadata = readMetadata(entry)
  const rawSession = [
    metadata.workoutSession,
    metadata.workout,
    metadata.exerciseSession,
    metadata.session,
  ].find(isRecord)

  const rawExercises = rawSession?.exercises ?? rawSession?.workoutExercises ?? metadata.exercises ?? metadata.workoutExercises
  const exercisePayloads = Array.isArray(rawExercises)
    ? rawExercises.filter(isRecord)
    : []

  const exercises = exercisePayloads.map((payload, index) => buildExerciseFallback(payload, index))
  const loadUnit = normalizeWorkoutWeightUnit(rawSession?.loadUnit ?? rawSession?.load_unit ?? metadata.loadUnit ?? metadata.load_unit ?? metadata.unit)
  if (exercises.length === 0 || !loadUnit) return undefined

  const startedAt =
    readNumberCandidate(rawSession?.startedAt ?? rawSession?.startAt ?? rawSession?.timestamp ?? metadata.startedAt) ??
    entry.timestamp
  const completedAt =
    readNumberCandidate(rawSession?.completedAt ?? rawSession?.finishedAt ?? rawSession?.endedAt ?? metadata.completedAt)

  const title =
    readStringCandidate(rawSession?.title) ??
    readStringCandidate(rawSession?.name) ??
    readStringCandidate(metadata.title) ??
    readStringCandidate(metadata.name) ??
    buildRoutine(rawSession ?? metadata)?.name ??
    null

  const sessionNote =
    readStringCandidate(rawSession?.note) ??
    readStringCandidate(rawSession?.notes) ??
    entry.note ??
    null

  const totalSets = exercises.reduce((sum, exercise) => sum + exercise.sets.length, 0)
  let totalVolume = 0
  let hasVolume = false
  for (const exercise of exercises) {
    for (const set of exercise.sets) {
      if (set.reps == null || set.load == null) continue
      totalVolume += set.reps * set.load
      hasVolume = true
    }
  }

  return {
    structured: true,
    entryId: entry.id,
    trackerId: entry.trackerId,
    routineId: null,
    timestamp: startedAt,
    dateStr: entry.dateStr,
    sessionName: title,
    title,
    note: sessionNote,
    loadUnit,
    durationMinutes: null,
    totalSets,
    totalVolume: hasVolume && Number.isFinite(totalVolume) ? totalVolume : null,
    completedAt: completedAt ?? null,
    routine: null,
    exercises,
  }
}
