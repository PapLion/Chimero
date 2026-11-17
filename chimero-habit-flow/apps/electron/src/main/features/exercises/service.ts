/**
 * Exercise catalogue. A slimmed copy of the public-domain free-exercise-db ships
 * with the app (resources/exercises.json), so searching never touches the network.
 */
import { existsSync, readFileSync } from 'fs'
import { resolve } from 'path'
import type { Exercise, ExerciseDbSnapshot, ExerciseDbStatus } from '@contracts/features/exercises'

let exercises: Exercise[] = []
let status: ExerciseDbStatus = 'idle'
let error: string | null = null

function mapExercise(item: Record<string, unknown>): Exercise {
  return {
    id: (item.id as string) || '',
    name: (item.name as string) || '',
    category: (item.category as string) || '',
    level: (item.level as string) || '',
    equipment: (item.equipment as string) || null,
    primaryMuscles: Array.isArray(item.primaryMuscles) ? (item.primaryMuscles as string[]) : [],
    secondaryMuscles: Array.isArray(item.secondaryMuscles) ? (item.secondaryMuscles as string[]) : [],
    force: (item.force as string) || null,
    mechanic: (item.mechanic as string) || null,
  }
}

export function catalogPath(): string {
  return resolve(__dirname, '..', '..', 'resources', 'exercises.json')
}

/** Load the bundled catalogue. Safe to call more than once. */
export async function initExerciseDb(path = catalogPath()): Promise<void> {
  if (status === 'ready') return
  try {
    if (!existsSync(path)) throw new Error('The bundled exercise catalogue is missing')
    const parsed = JSON.parse(readFileSync(path, 'utf-8')) as Record<string, unknown>[]
    exercises = parsed.map(mapExercise).filter((exercise) => exercise.id && exercise.name)
    status = 'ready'
    error = null
  } catch (cause) {
    // Logging a workout still works: any exercise can be typed in as a custom one.
    exercises = []
    status = 'error'
    error = cause instanceof Error ? cause.message : String(cause)
    console.error('[Exercises] catalogue unavailable:', error)
  }
}

/**
 * The everyday version of the most common lifts. Without it, "bench press" would
 * rank "Bench Press with Chains" above the barbell bench press most people mean.
 */
const PRIMARY = [
  'Barbell_Bench_Press_-_Medium_Grip',
  'Barbell_Squat',
  'Barbell_Deadlift',
  'Pullups',
  'Bent_Over_Barbell_Row',
  'Standing_Military_Press',
  'Pushups',
  'Leg_Press',
  'Barbell_Curl',
  'Triceps_Pushdown',
  'Plank',
  'Running_Treadmill',
]
const SECONDARY = [
  'Dumbbell_Bench_Press',
  'Incline_Dumbbell_Press',
  'Front_Barbell_Squat',
  'Goblet_Squat',
  'Romanian_Deadlift',
  'Chin-Up',
  'Seated_Cable_Rows',
  'Wide-Grip_Lat_Pulldown',
  'Dumbbell_Shoulder_Press',
  'Dips_-_Triceps_Version',
  'Barbell_Lunge',
  'Dumbbell_Lunges',
  'Barbell_Hip_Thrust',
  'Leg_Extensions',
  'Lying_Leg_Curls',
  'Standing_Calf_Raises',
  'Face_Pull',
  'Crunches',
  'Hanging_Leg_Raise',
]
const COMMON = new Map<string, number>([...PRIMARY.map((id) => [id, 3] as const), ...SECONDARY.map((id) => [id, 2] as const)])

/** Every word of the query must match somewhere; names that start with the query come first. */
export function searchExercises(query: string, limit = 20): Exercise[] {
  const words = query.toLowerCase().trim().split(/\s+/).filter(Boolean)
  if (words.length === 0) return getAllExercises(limit)
  const phrase = words.join(' ')
  const scored: Array<{ exercise: Exercise; score: number }> = []
  for (const exercise of exercises) {
    const name = exercise.name.toLowerCase()
    const rest = `${exercise.category} ${exercise.equipment ?? ''} ${exercise.primaryMuscles.join(' ')}`.toLowerCase()
    let score = 0
    let matched = true
    for (const word of words) {
      if (name.includes(word)) score += 2
      else if (rest.includes(word)) score += 1
      else {
        matched = false
        break
      }
    }
    if (!matched) continue
    if (name === phrase) score += 6
    else if (name.startsWith(phrase)) score += 4
    else if (name.includes(phrase)) score += 2
    score += COMMON.get(exercise.id) ?? 0
    if (exercise.level === 'expert') score -= 1
    scored.push({ exercise, score: score - name.length / 200 })
  }
  return scored.sort((a, b) => b.score - a.score || a.exercise.name.localeCompare(b.exercise.name)).slice(0, limit).map((item) => item.exercise)
}

export function getAllExercises(limit = 50): Exercise[] {
  return exercises.slice(0, limit)
}

export function getExerciseDbStatus(): ExerciseDbSnapshot {
  return { status, count: exercises.length, error, progress: status === 'ready' ? 100 : 0 }
}
