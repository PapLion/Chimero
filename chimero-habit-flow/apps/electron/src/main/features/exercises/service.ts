/**
 * Exercise DB Service - downloads and searches exercises from free-exercise-db.
 * Data is stored in memory (not persisted to DB).
 * Uses local cache file for instant loading on subsequent app starts.
 */
import { net, app } from 'electron'
import { existsSync, readFileSync, writeFileSync } from 'fs'
import { join } from 'path'
import type { Exercise, ExerciseDbSnapshot, ExerciseDbStatus } from '@contracts/features/exercises'

const EXERCISE_DB_URL = 'https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/dist/exercises.json'
const CACHE_FILENAME = 'exercise-db-cache.json'
const FETCH_TIMEOUT_MS = 15000

function getCachePath(): string {
  return join(app.getPath('userData'), CACHE_FILENAME)
}

let exercises: Exercise[] = []
let isInitialized = false

let dbStatus: ExerciseDbStatus = 'idle'
let dbError: string | null = null
let dbProgress = 0

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

  console.log('[ExerciseDB] Initializing...')
  dbStatus = 'loading'
  dbProgress = 0

  try {
    const cachePath = getCachePath()
    if (existsSync(cachePath)) {
      console.log('[ExerciseDB] Loading from local cache...')
      dbProgress = 50
      const raw = readFileSync(cachePath, 'utf-8')
      const parsed = JSON.parse(raw) as Record<string, unknown>[]
      if (Array.isArray(parsed) && parsed.length > 0) {
        exercises = parsed.map(mapExercise)
        isInitialized = true
        dbStatus = 'ready'
        dbProgress = 100
        console.log(`[ExerciseDB] Loaded ${exercises.length} exercises from cache`)
        return
      }
    }
  } catch (cacheError) {
    console.warn('[ExerciseDB] Cache load failed, will download:', cacheError)
  }

  console.log('[ExerciseDB] Downloading from GitHub...')
  dbProgress = 10

  try {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => {
      controller.abort()
    }, FETCH_TIMEOUT_MS)

    const response = await net.fetch(EXERCISE_DB_URL, {
      method: 'GET',
      signal: controller.signal,
    })

    clearTimeout(timeoutId)

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }

    dbProgress = 60
    const rawData = await response.json() as Record<string, unknown>[]
    dbProgress = 80

    exercises = rawData.map(mapExercise)

    try {
      const cachePath = getCachePath()
      writeFileSync(cachePath, JSON.stringify(rawData), 'utf-8')
      console.log('[ExerciseDB] Cache saved to disk')
    } catch (saveError) {
      console.warn('[ExerciseDB] Could not save cache:', saveError)
    }

    isInitialized = true
    dbStatus = 'ready'
    dbProgress = 100
    console.log(`[ExerciseDB] Downloaded and cached ${exercises.length} exercises`)
  } catch (error) {
    const isTimeout = error instanceof Error && error.name === 'AbortError'
    console.error('[ExerciseDB] Failed to load:', isTimeout ? 'Request timed out after 15s' : error)
    exercises = []
    isInitialized = true
    dbStatus = 'error'
    dbError = isTimeout
      ? 'Download timed out. Check your internet connection.'
      : (error instanceof Error ? error.message : 'Unknown error')
    dbProgress = 0
  }
}

export function searchExercises(query: string, limit = 20): Exercise[] {
  if (!isInitialized) {
    console.warn('[ExerciseDB] Not initialized, returning empty array')
    return []
  }

  const normalizedQuery = query.toLowerCase().trim()
  if (!normalizedQuery) {
    return getAllExercises(limit)
  }

  const results = exercises.filter((exercise) => {
    if (exercise.name.toLowerCase().includes(normalizedQuery)) return true
    if (exercise.category.toLowerCase().includes(normalizedQuery)) return true
    if (exercise.primaryMuscles.some((muscle) => muscle.toLowerCase().includes(normalizedQuery))) return true
    if (exercise.equipment && exercise.equipment.toLowerCase().includes(normalizedQuery)) return true
    return false
  })

  return results.slice(0, limit)
}

export function getAllExercises(limit = 50): Exercise[] {
  if (!isInitialized) {
    console.warn('[ExerciseDB] Not initialized, returning empty array')
    return []
  }
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
