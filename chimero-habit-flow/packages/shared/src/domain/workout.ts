import type {
  ExerciseProgressReadModel,
  LegacyExerciseEntryReadModel,
  WorkoutCalendarReadModel,
  WorkoutExerciseReadModel,
  WorkoutGraphPoint,
  WorkoutGraphReadModel,
  WorkoutHomeReadModel,
  WorkoutRoutineExerciseReadModel,
  WorkoutRoutineReadModel,
  WorkoutSessionReadModel,
  WorkoutSetReadModel,
  WorkoutStatisticsReadModel,
  WorkoutWeightUnit,
} from '../contracts/app-types'

type JsonRecord = Record<string, unknown>

function isRecord(value: unknown): value is JsonRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

export function normalizeWorkoutWeightUnit(value: unknown): WorkoutWeightUnit | null {
  if (value === 'kg' || value === 'lb') return value
  if (value === 'lbs') return 'lb'
  return null
}

export function validateWorkoutWeightUnit(value: unknown): WorkoutWeightUnit {
  const unit = normalizeWorkoutWeightUnit(value)
  if (!unit) throw new Error('Load unit must be kg or lb')
  return unit
}

export function validateWorkoutLoad(value: unknown): number | null {
  if (value == null || value === '') return null
  const numeric = typeof value === 'number' ? value : Number(value)
  if (!Number.isFinite(numeric) || numeric < 0) {
    throw new Error('Load must be a finite, non-negative number or null')
  }
  return numeric
}

export function validateWorkoutReps(value: unknown): number | null {
  if (value == null || value === '') return null
  const numeric = typeof value === 'number' ? value : Number(value)
  if (!Number.isInteger(numeric) || numeric <= 0) {
    throw new Error('Reps must be a positive integer or null')
  }
  return numeric
}

export function validateWorkoutSetIndex(value: unknown, fallback: number): number {
  const numeric = typeof value === 'number' ? value : Number(value)
  return Number.isInteger(numeric) && numeric > 0 ? numeric : fallback
}

export function parseStringArray(value: unknown): string[] | null {
  if (value == null) return null
  if (Array.isArray(value)) {
    return value
      .map((item) => (typeof item === 'string' ? item.trim() : String(item).trim()))
      .filter((item) => item.length > 0)
  }
  if (typeof value !== 'string') return null
  try {
    const parsed = JSON.parse(value)
    return Array.isArray(parsed)
      ? parsed
        .map((item) => (typeof item === 'string' ? item.trim() : String(item).trim()))
        .filter((item) => item.length > 0)
      : null
  } catch {
    return null
  }
}

export function parseJsonObject(value: unknown): JsonRecord {
  if (!value) return {}
  if (isRecord(value)) return value
  if (typeof value !== 'string') return {}
  try {
    const parsed = JSON.parse(value)
    return isRecord(parsed) ? parsed : {}
  } catch {
    return {}
  }
}

function toArray(value: unknown): JsonRecord[] {
  if (!Array.isArray(value)) return []
  return value.filter(isRecord)
}

function toNumber(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number(value)
    return Number.isFinite(parsed) ? parsed : null
  }
  return null
}

function toString(value: unknown): string | null {
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : null
}

function computeSetVolume(reps: number | null, load: number | null): number | null {
  if (reps == null || load == null) return null
  return reps * load
}

function computeExerciseVolume(exercise: WorkoutExerciseReadModel): number | null {
  let total = 0
  let hasVolume = false
  for (const set of exercise.sets) {
    const setVolume = computeSetVolume(set.reps, set.load)
    if (setVolume == null) continue
    total += setVolume
    hasVolume = true
  }
  return hasVolume ? total : null
}

export function buildWorkoutSetReadModel(row: JsonRecord, loadUnit: WorkoutWeightUnit | null): WorkoutSetReadModel {
  const load = toNumber(row.load ?? row.weight ?? row.value)
  const reps = toNumber(row.reps ?? row.repetitions ?? row.count)
  const setIndex = validateWorkoutSetIndex(row.setIndex ?? row.set_index ?? row.index, 1)
  return {
    setIndex,
    reps: reps == null ? null : Math.trunc(reps),
    load,
    weight: load,
    weightUnit: loadUnit,
    notes: toString(row.notes ?? row.note),
    isWarmup: row.isWarmup === true || row.warmup === true,
  }
}

export function buildWorkoutExerciseReadModel(
  row: JsonRecord,
  loadUnit: WorkoutWeightUnit | null,
  setRows: JsonRecord[] = [],
  fallbackKey: string = 'unknown-exercise',
): WorkoutExerciseReadModel {
  const exerciseId = toString(row.exerciseId ?? row.exercise_id ?? row.sourceExerciseId ?? row.source_exercise_id ?? row.id) ?? fallbackKey
  const exerciseName = toString(row.exerciseName ?? row.exercise_name ?? row.name) ?? exerciseId
  return {
    exerciseId,
    sourceExerciseId: toString(row.sourceExerciseId ?? row.source_exercise_id),
    exerciseName,
    category: toString(row.categorySnapshot ?? row.category_snapshot ?? row.category),
    level: toString(row.levelSnapshot ?? row.level_snapshot ?? row.level),
    equipment: toString(row.equipmentSnapshot ?? row.equipment_snapshot ?? row.equipment),
    bodyPartSnapshot: parseStringArray(row.bodyPartSnapshot ?? row.body_part_snapshot) ?? [],
    secondaryBodyPartSnapshot: parseStringArray(row.secondaryBodyPartSnapshot ?? row.secondary_body_part_snapshot) ?? [],
    force: toString(row.forceSnapshot ?? row.force_snapshot ?? row.force),
    mechanic: toString(row.mechanicSnapshot ?? row.mechanic_snapshot ?? row.mechanic),
    notes: toString(row.notes ?? row.note),
    sets: setRows.length > 0
      ? setRows.map((setRow, index) => buildWorkoutSetReadModel({ ...setRow, setIndex: setRow.setIndex ?? setRow.set_index ?? index + 1 }, loadUnit))
      : [],
  }
}

export function buildWorkoutRoutineExerciseReadModel(row: JsonRecord, fallbackKey: string = 'unknown-exercise'): WorkoutRoutineExerciseReadModel {
  const orderIndex = Number(row.orderIndex ?? row.order_index ?? 0)
  const targetSets = Number(row.targetSets ?? row.target_sets ?? 1)
  const targetReps = toNumber(row.targetReps ?? row.target_reps)
  const defaultLoad = toNumber(row.defaultLoad ?? row.default_load)
  return {
    id: Number(row.id ?? 0),
    exerciseId: toString(row.exerciseId ?? row.exercise_key ?? row.sourceExerciseId ?? row.source_exercise_id ?? row.id) ?? fallbackKey,
    sourceExerciseId: toString(row.sourceExerciseId ?? row.source_exercise_id),
    exerciseName: toString(row.exerciseName ?? row.exercise_name ?? row.name) ?? 'Exercise',
    category: toString(row.categorySnapshot ?? row.category_snapshot ?? row.category),
    level: toString(row.levelSnapshot ?? row.level_snapshot ?? row.level),
    equipment: toString(row.equipmentSnapshot ?? row.equipment_snapshot ?? row.equipment),
    bodyPartSnapshot: parseStringArray(row.bodyPartSnapshot ?? row.body_part_snapshot) ?? [],
    secondaryBodyPartSnapshot: parseStringArray(row.secondaryBodyPartSnapshot ?? row.secondary_body_part_snapshot) ?? [],
    force: toString(row.forceSnapshot ?? row.force_snapshot ?? row.force),
    mechanic: toString(row.mechanicSnapshot ?? row.mechanic_snapshot ?? row.mechanic),
    orderIndex: Number.isFinite(orderIndex) ? orderIndex : 0,
    targetSets: Number.isFinite(targetSets) && targetSets > 0 ? Math.trunc(targetSets) : 1,
    targetReps: targetReps == null ? null : Math.trunc(targetReps),
    defaultLoad,
  }
}

export function buildWorkoutRoutineReadModel(row: JsonRecord, exercises: JsonRecord[] = []): WorkoutRoutineReadModel {
  const loadUnit = normalizeWorkoutWeightUnit(row.loadUnit ?? row.load_unit) ?? 'kg'
  return {
    id: Number(row.id ?? 0),
    trackerId: Number(row.trackerId ?? row.tracker_id ?? 0),
    name: toString(row.name) ?? 'Routine',
    notes: toString(row.notes),
    loadUnit,
    createdAt: row.createdAt == null && row.created_at == null ? null : Number(row.createdAt ?? row.created_at),
    updatedAt: row.updatedAt == null && row.updated_at == null ? null : Number(row.updatedAt ?? row.updated_at),
    exercises: exercises.map((exercise, index) => buildWorkoutRoutineExerciseReadModel(exercise, `unknown-exercise-${index + 1}`)),
  }
}

export function buildWorkoutSessionReadModel(input: {
  entryId: number
  trackerId: number
  timestamp: number
  dateStr: string
  note?: string | null
  value?: number | null
  sessionRow?: JsonRecord | null
  routineRow?: JsonRecord | null
  routineExercises?: JsonRecord[]
  sessionExercises?: JsonRecord[]
  sessionSets?: JsonRecord[]
}): WorkoutSessionReadModel | undefined {
  const sessionRow = input.sessionRow ?? null
  const sessionExercises = input.sessionExercises ?? []
  const sessionSets = input.sessionSets ?? []
  const exercisesSource = sessionExercises.length > 0 ? sessionExercises : toArray(parseJsonObject(sessionRow?.exercises))
  const routineExercises = input.routineExercises ?? []

  const loadUnit = normalizeWorkoutWeightUnit(sessionRow?.loadUnit ?? sessionRow?.load_unit ?? input.routineRow?.loadUnit ?? input.routineRow?.load_unit) ?? null
  if (!loadUnit && exercisesSource.length === 0 && routineExercises.length === 0) return undefined
  if (!loadUnit) return undefined

  const exercises = (exercisesSource.length > 0 ? exercisesSource : routineExercises).map((exerciseRow, index) => {
    const exerciseSets = sessionSets.filter((setRow) => Number(setRow.sessionExerciseId ?? setRow.session_exercise_id) === Number(exerciseRow.id ?? exerciseRow.sessionExerciseId ?? exerciseRow.session_exercise_id))
    return buildWorkoutExerciseReadModel(exerciseRow, loadUnit, exerciseSets, `unknown-exercise-${index + 1}`)
  })

  const totalSets = exercises.reduce((sum, exercise) => sum + exercise.sets.length, 0)
  let totalVolume = 0
  let hasVolume = false
  for (const exercise of exercises) {
    const exerciseVolume = computeExerciseVolume(exercise)
    if (exerciseVolume == null) continue
    totalVolume += exerciseVolume
    hasVolume = true
  }

  const routine = input.routineRow
    ? buildWorkoutRoutineReadModel(input.routineRow, routineExercises)
    : null

  const sessionName = toString(sessionRow?.sessionName ?? sessionRow?.session_name)
    ?? toString(sessionRow?.title)
    ?? toString(input.note)
    ?? routine?.name
    ?? null

  return {
    structured: true,
    entryId: input.entryId,
    trackerId: input.trackerId,
    routineId: sessionRow?.routineId == null && sessionRow?.routine_id == null ? null : Number(sessionRow?.routineId ?? sessionRow?.routine_id),
    timestamp: Number(sessionRow?.timestamp ?? input.timestamp),
    dateStr: String(sessionRow?.dateStr ?? sessionRow?.date_str ?? input.dateStr),
    sessionName,
    title: sessionName,
    note: toString(sessionRow?.note ?? sessionRow?.notes ?? input.note),
    loadUnit,
    durationMinutes: sessionRow?.durationMinutes == null && sessionRow?.duration_minutes == null
      ? null
      : Number(sessionRow?.durationMinutes ?? sessionRow?.duration_minutes),
    totalSets,
    totalVolume: hasVolume && Number.isFinite(totalVolume) ? totalVolume : null,
    completedAt: sessionRow?.completedAt == null && sessionRow?.completed_at == null ? null : Number(sessionRow?.completedAt ?? sessionRow?.completed_at),
    routine,
    exercises,
  }
}

export function buildWorkoutLegacyEntryReadModel(entry: {
  id: number
  trackerId: number
  timestamp: number
  dateStr: string | null
  note: string | null
  loadUnit?: WorkoutWeightUnit | null
}): LegacyExerciseEntryReadModel {
  return {
    entryId: entry.id,
    trackerId: entry.trackerId,
    timestamp: entry.timestamp,
    dateStr: entry.dateStr ?? null,
    note: entry.note,
    loadUnit: entry.loadUnit ?? null,
    structured: false,
  }
}

export function buildWorkoutHomeReadModel(input: {
  trackerId: number
  title: string
  sessions: WorkoutSessionReadModel[]
  routines: WorkoutRoutineReadModel[]
  loadUnit?: WorkoutWeightUnit | null
}): WorkoutHomeReadModel {
  const sortedSessions = [...input.sessions].sort((a, b) => b.timestamp - a.timestamp)
  const lastSession = sortedSessions[0] ?? null
  const now = Date.now()
  const msPerDay = 24 * 60 * 60 * 1000
  const daysSinceLastSession = lastSession ? Math.floor((now - lastSession.timestamp) / msPerDay) : null
  const sessionsThisWeek = sortedSessions.filter((session) => now - session.timestamp <= 7 * msPerDay).length
  const activeWeekStreak = computeWeekStreak(sortedSessions)
  const latestVolume = lastSession?.totalVolume ?? null

  return {
    trackerId: input.trackerId,
    title: input.title,
    loadUnit: input.loadUnit ?? lastSession?.loadUnit ?? input.routines[0]?.loadUnit ?? null,
    lastSession,
    daysSinceLastSession,
    sessionsThisWeek,
    activeWeekStreak,
    latestVolume,
    recentRoutines: input.routines.slice(0, 5),
  }
}

function computeWeekStreak(sessions: WorkoutSessionReadModel[]): number {
  if (sessions.length === 0) return 0
  const weekKeys = new Set<string>()
  for (const session of sessions) {
    const d = new Date(session.timestamp)
    const monday = new Date(d)
    const day = monday.getDay()
    const diff = monday.getDate() - day + (day === 0 ? -6 : 1)
    monday.setDate(diff)
    monday.setHours(0, 0, 0, 0)
    weekKeys.add(monday.toISOString().slice(0, 10))
  }
  return weekKeys.size
}

export function buildWorkoutStatisticsReadModel(input: {
  trackerId: number
  sessions: WorkoutSessionReadModel[]
}): WorkoutStatisticsReadModel {
  const sortedSessions = [...input.sessions].sort((a, b) => b.timestamp - a.timestamp)
  const baseUnit = sortedSessions[0]?.loadUnit ?? null
  const unitMatchedSessions = baseUnit ? sortedSessions.filter((session) => session.loadUnit === baseUnit) : sortedSessions
  const now = Date.now()
  const msPerDay = 24 * 60 * 60 * 1000
  const sessionsThisWeek = unitMatchedSessions.filter((session) => now - session.timestamp <= 7 * msPerDay).length
  const lastSession = unitMatchedSessions[0] ?? null
  const volumeSessions = unitMatchedSessions.filter((session) => session.totalVolume != null)
  const weeklyVolume = volumeSessions
    .filter((session) => now - session.timestamp <= 7 * msPerDay)
    .reduce((sum, session) => sum + (session.totalVolume ?? 0), 0)
  const totalVolume = volumeSessions.reduce((sum, session) => sum + (session.totalVolume ?? 0), 0)
  const averageSessionVolume = volumeSessions.length > 0 ? totalVolume / volumeSessions.length : null
  const durationSessions = unitMatchedSessions.filter((session) => session.durationMinutes != null)
  const averageDurationMinutes = durationSessions.length > 0
    ? durationSessions.reduce((sum, session) => sum + (session.durationMinutes ?? 0), 0) / durationSessions.length
    : null

  const exerciseCounts = new Map<string, { exerciseId: string; exerciseName: string; sessions: number }>()
  const heaviestLoads = new Map<string, { exerciseId: string; exerciseName: string; value: number; loadUnit: WorkoutWeightUnit }>()
  const bestSetVolumes = new Map<string, { exerciseId: string; exerciseName: string; value: number; loadUnit: WorkoutWeightUnit }>()
  for (const session of unitMatchedSessions) {
    for (const exercise of session.exercises) {
      const count = exerciseCounts.get(exercise.exerciseId) ?? { exerciseId: exercise.exerciseId, exerciseName: exercise.exerciseName, sessions: 0 }
      count.sessions += 1
      exerciseCounts.set(exercise.exerciseId, count)
      for (const set of exercise.sets) {
        if (set.load != null && session.loadUnit) {
          const existing = heaviestLoads.get(exercise.exerciseId)
          if (!existing || set.load > existing.value) {
            heaviestLoads.set(exercise.exerciseId, {
              exerciseId: exercise.exerciseId,
              exerciseName: exercise.exerciseName,
              value: set.load,
              loadUnit: session.loadUnit,
            })
          }
        }
        if (set.reps != null && set.load != null && session.loadUnit) {
          const value = set.reps * set.load
          const existing = bestSetVolumes.get(exercise.exerciseId)
          if (!existing || value > existing.value) {
            bestSetVolumes.set(exercise.exerciseId, {
              exerciseId: exercise.exerciseId,
              exerciseName: exercise.exerciseName,
              value,
              loadUnit: session.loadUnit,
            })
          }
        }
      }
    }
  }

  const recentPrs = [
    ...Array.from(heaviestLoads.values(), (item) => ({ ...item, kind: 'heaviest-load' as const })),
    ...Array.from(bestSetVolumes.values(), (item) => ({ ...item, kind: 'best-volume' as const })),
  ].slice(0, 12)

  return {
    trackerId: input.trackerId,
    totalSessions: sortedSessions.length,
    sessionsThisWeek,
    daysSinceLastWorkout: lastSession ? Math.floor((now - lastSession.timestamp) / msPerDay) : null,
    activeWeekStreak: computeWeekStreak(sortedSessions),
    weeklyVolume,
    averageSessionVolume,
    averageDurationMinutes,
    frequentExercises: [...exerciseCounts.values()].sort((a, b) => b.sessions - a.sessions).slice(0, 8),
    recentPrs,
  }
}

export function buildWorkoutGraphReadModel(input: {
  trackerId: number
  sessions: WorkoutSessionReadModel[]
}): WorkoutGraphReadModel {
  const baseUnit = input.sessions[0]?.loadUnit ?? null
  const unitMatchedSessions = baseUnit ? input.sessions.filter((session) => session.loadUnit === baseUnit) : input.sessions
  const weeklyVolumeByWeek = new Map<string, number>()
  const sessionVolume: WorkoutGraphPoint[] = []
  const heaviestLoad: WorkoutGraphReadModel['exerciseHeaviestLoad'] = []
  const bestSetVolume: WorkoutGraphReadModel['bestSetVolume'] = []
  const exerciseVolumeById = new Map<string, { exerciseId: string; exerciseName: string; points: WorkoutGraphPoint[] }>()

  for (const session of unitMatchedSessions) {
    const date = session.dateStr
    if (session.totalVolume != null) {
      sessionVolume.push({ date, value: session.totalVolume, loadUnit: session.loadUnit })
    }
    const weekDate = new Date(session.timestamp)
    const day = weekDate.getDay()
    const diff = weekDate.getDate() - day + (day === 0 ? -6 : 1)
    weekDate.setDate(diff)
    weekDate.setHours(0, 0, 0, 0)
    const weekKey = weekDate.toISOString().slice(0, 10)
    if (session.totalVolume != null) {
      weeklyVolumeByWeek.set(weekKey, (weeklyVolumeByWeek.get(weekKey) ?? 0) + session.totalVolume)
    }

    for (const exercise of session.exercises) {
      const current = exerciseVolumeById.get(exercise.exerciseId) ?? {
        exerciseId: exercise.exerciseId,
        exerciseName: exercise.exerciseName,
        points: [],
      }
      const exerciseVolume = computeExerciseVolume(exercise)
      if (exerciseVolume != null) {
        current.points.push({ date, value: exerciseVolume, loadUnit: session.loadUnit })
      }
      exerciseVolumeById.set(exercise.exerciseId, current)
      for (const set of exercise.sets) {
        if (set.load != null && session.loadUnit) {
          const existing = heaviestLoad.find((item) => item.exerciseId === exercise.exerciseId)
          if (!existing || set.load > existing.value) {
            const next = { exerciseId: exercise.exerciseId, exerciseName: exercise.exerciseName, value: set.load, loadUnit: session.loadUnit }
            const idx = heaviestLoad.findIndex((item) => item.exerciseId === exercise.exerciseId)
            if (idx >= 0) heaviestLoad[idx] = next
            else heaviestLoad.push(next)
          }
        }
        if (set.load != null && set.reps != null && session.loadUnit) {
          const value = set.load * set.reps
          const existing = bestSetVolume.find((item) => item.exerciseId === exercise.exerciseId)
          if (!existing || value > existing.value) {
            const next = { exerciseId: exercise.exerciseId, exerciseName: exercise.exerciseName, value, loadUnit: session.loadUnit }
            const idx = bestSetVolume.findIndex((item) => item.exerciseId === exercise.exerciseId)
            if (idx >= 0) bestSetVolume[idx] = next
            else bestSetVolume.push(next)
          }
        }
      }
    }
  }

  return {
    trackerId: input.trackerId,
    weeklyVolume: [...weeklyVolumeByWeek.entries()].map(([date, value]) => ({ date, value, loadUnit: baseUnit })),
    sessionVolume,
    exerciseHeaviestLoad: heaviestLoad,
    bestSetVolume,
    exerciseVolumeOverTime: [...exerciseVolumeById.values()],
  }
}

export function buildWorkoutCalendarReadModel(input: {
  year: number
  month: number
  sessions: WorkoutSessionReadModel[]
}): WorkoutCalendarReadModel {
  const entriesByDate: Record<string, WorkoutSessionReadModel[]> = {}
  const activeDays = new Set<number>()
  for (const session of input.sessions) {
    if (!entriesByDate[session.dateStr]) entriesByDate[session.dateStr] = []
    entriesByDate[session.dateStr].push(session)
    const day = Number(session.dateStr.slice(8, 10))
    if (Number.isInteger(day)) activeDays.add(day)
  }
  return {
    year: input.year,
    month: input.month,
    entriesByDate,
    activeDays: [...activeDays].sort((a, b) => a - b),
  }
}

export function buildExerciseProgressReadModel(input: {
  exerciseId: string
  exerciseName: string
  loadUnit: WorkoutWeightUnit
  sessions: WorkoutSessionReadModel[]
}): ExerciseProgressReadModel {
  const points: Array<{ date: string; value: number }> = []
  const heaviestLoadPoints: Array<{ date: string; value: number }> = []
  const bestSetVolumePoints: Array<{ date: string; value: number }> = []
  let heaviestLoad: number | null = null
  let bestSetVolume: number | null = null
  let sessionCount = 0
  const unitMatchedSessions = input.sessions.filter((session) => session.loadUnit === input.loadUnit)

  for (const session of unitMatchedSessions) {
    const exercise = session.exercises.find((item) => item.exerciseId === input.exerciseId)
    if (!exercise) continue
    sessionCount += 1
    const sessionVolume = computeExerciseVolume(exercise)
    if (sessionVolume != null) {
      points.push({ date: session.dateStr, value: sessionVolume })
    }
    let sessionHeaviestLoad: number | null = null
    let sessionBestSetVolume: number | null = null
    for (const set of exercise.sets) {
      if (set.load != null) {
        heaviestLoad = heaviestLoad == null ? set.load : Math.max(heaviestLoad, set.load)
        sessionHeaviestLoad = sessionHeaviestLoad == null ? set.load : Math.max(sessionHeaviestLoad, set.load)
      }
      if (set.load != null && set.reps != null) {
        const setVolume = set.load * set.reps
        bestSetVolume = bestSetVolume == null ? setVolume : Math.max(bestSetVolume, setVolume)
        sessionBestSetVolume = sessionBestSetVolume == null ? setVolume : Math.max(sessionBestSetVolume, setVolume)
      }
    }
    if (sessionHeaviestLoad != null) heaviestLoadPoints.push({ date: session.dateStr, value: sessionHeaviestLoad })
    if (sessionBestSetVolume != null) bestSetVolumePoints.push({ date: session.dateStr, value: sessionBestSetVolume })
  }

  return {
    exerciseId: input.exerciseId,
    exerciseName: input.exerciseName,
    loadUnit: input.loadUnit,
    points,
    heaviestLoadPoints,
    bestSetVolumePoints,
    heaviestLoad,
    bestSetVolume,
    sessionCount,
  }
}
