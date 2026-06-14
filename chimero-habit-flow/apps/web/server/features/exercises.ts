import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { getWebDataDir } from '../db'
import type { Exercise, ExerciseDbSnapshot, ExerciseDbStatus } from '../../../../packages/shared/src/features/exercises'

const EXERCISE_DB_URL = 'https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/dist/exercises.json'
const CACHE_FILENAME = 'exercise-db-cache.json'
const FETCH_TIMEOUT_MS = 15000

let exercises: Exercise[] = []
let isInitialized = false
let dbStatus: ExerciseDbStatus = 'idle'
let dbError: string | null = null
let dbProgress = 0

function getCachePath(): string {
  return resolve(getWebDataDir(), CACHE_FILENAME)
}

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

export async function initExerciseDb(): Promise<void> {
  if (isInitialized) return
  dbStatus = 'loading'
  dbProgress = 0

  try {
    const cachePath = getCachePath()
    if (existsSync(cachePath)) {
      const raw = readFileSync(cachePath, 'utf-8')
      const parsed = JSON.parse(raw) as Record<string, unknown>[]
      if (Array.isArray(parsed) && parsed.length > 0) {
        exercises = parsed.map(mapExercise)
        isInitialized = true
        dbStatus = 'ready'
        dbProgress = 100
        return
      }
    }
  } catch (error) {
    console.warn('[WebExerciseDB] Cache load failed, will download:', error)
  }

  try {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS)
    const response = await fetch(EXERCISE_DB_URL, { signal: controller.signal })
    clearTimeout(timeoutId)
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`)
    const rawData = await response.json() as Record<string, unknown>[]
    exercises = rawData.map(mapExercise)
    try {
      const cachePath = getCachePath()
      mkdirSync(resolve(cachePath, '..'), { recursive: true })
      writeFileSync(cachePath, JSON.stringify(rawData), 'utf-8')
    } catch (saveError) {
      console.warn('[WebExerciseDB] Could not save cache:', saveError)
    }
    isInitialized = true
    dbStatus = 'ready'
    dbProgress = 100
  } catch (error) {
    exercises = []
    isInitialized = true
    dbStatus = 'error'
    dbError = error instanceof Error && error.name === 'AbortError'
      ? 'Download timed out. Check your internet connection.'
      : (error instanceof Error ? error.message : 'Unknown error')
    dbProgress = 0
  }
}

export function searchExercises(query: string, limit = 20): Exercise[] {
  if (!isInitialized) return []
  const normalizedQuery = query.toLowerCase().trim()
  if (!normalizedQuery) return getAllExercises(limit)
  return exercises.filter((exercise) => {
    if (exercise.name.toLowerCase().includes(normalizedQuery)) return true
    if (exercise.category.toLowerCase().includes(normalizedQuery)) return true
    if (exercise.primaryMuscles.some((muscle) => muscle.toLowerCase().includes(normalizedQuery))) return true
    if (exercise.equipment && exercise.equipment.toLowerCase().includes(normalizedQuery)) return true
    return false
  }).slice(0, limit)
}

export function getAllExercises(limit = 50): Exercise[] {
  if (!isInitialized) return []
  return exercises.slice(0, limit)
}

export function getExerciseDbStatus(): ExerciseDbSnapshot {
  return {
    status: dbStatus,
    count: exercises.length,
    error: dbError,
    progress: dbProgress,
  }
}
