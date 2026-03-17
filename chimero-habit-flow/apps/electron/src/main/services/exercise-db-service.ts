/**
 * Exercise DB Service - downloads and searches exercises from free-exercise-db.
 * Data is stored in memory (not persisted to DB).
 * Uses local cache file for instant loading on subsequent app starts.
 */
import { net, app } from 'electron';
import { existsSync, readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

const EXERCISE_DB_URL = 'https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/dist/exercises.json'
const CACHE_FILENAME = 'exercise-db-cache.json';
const FETCH_TIMEOUT_MS = 15000; // 15 seconds

function getCachePath(): string {
  return join(app.getPath('userData'), CACHE_FILENAME);
}

export interface Exercise {
  id: string;
  name: string;
  category: string;
  level: string;
  equipment: string | null;
  primaryMuscles: string[];
  secondaryMuscles: string[];
  force: string | null;
  mechanic: string | null;
}

// In-memory storage
let exercises: Exercise[] = [];
let isInitialized = false;

// DB status tracking
type ExerciseDbStatus = 'idle' | 'loading' | 'ready' | 'error';
let dbStatus: ExerciseDbStatus = 'idle';
let dbError: string | null = null;
let dbProgress: number = 0; // 0-100

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
  };
}

/**
 * Initialize the exercise database.
 * Priority: 1) Load from local cache (instant), 2) Download from GitHub
 * Only downloads on first run or if cache doesn't exist.
 */
export async function initExerciseDb(): Promise<void> {
  if (isInitialized) return;

  console.log('[ExerciseDB] Initializing...');
  dbStatus = 'loading';
  dbProgress = 0;

  // STEP 1: Try to load from local cache first (instant)
  try {
    const cachePath = getCachePath();
    if (existsSync(cachePath)) {
      console.log('[ExerciseDB] Loading from local cache...');
      dbProgress = 50;
      const raw = readFileSync(cachePath, 'utf-8');
      const parsed = JSON.parse(raw) as Record<string, unknown>[];
      if (Array.isArray(parsed) && parsed.length > 0) {
        exercises = parsed.map(mapExercise);
        isInitialized = true;
        dbStatus = 'ready';
        dbProgress = 100;
        console.log(`[ExerciseDB] Loaded ${exercises.length} exercises from cache`);
        return;
      }
    }
  } catch (cacheError) {
    console.warn('[ExerciseDB] Cache load failed, will download:', cacheError);
    // Continue to download
  }

  // STEP 2: No cache — download from GitHub with timeout
  console.log('[ExerciseDB] Downloading from GitHub...');
  dbProgress = 10;

  try {
    // Create AbortController for timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => {
      controller.abort();
    }, FETCH_TIMEOUT_MS);

    const response = await net.fetch(EXERCISE_DB_URL, {
      method: 'GET',
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    dbProgress = 60;
    const rawData = await response.json() as Record<string, unknown>[];
    dbProgress = 80;

    exercises = rawData.map(mapExercise);

    // STEP 3: Save to local cache for future instant loads
    try {
      const cachePath = getCachePath();
      writeFileSync(cachePath, JSON.stringify(rawData), 'utf-8');
      console.log('[ExerciseDB] Cache saved to disk');
    } catch (saveError) {
      console.warn('[ExerciseDB] Could not save cache:', saveError);
      // Non-fatal — continue anyway
    }

    isInitialized = true;
    dbStatus = 'ready';
    dbProgress = 100;
    console.log(`[ExerciseDB] Downloaded and cached ${exercises.length} exercises`);

  } catch (error) {
    const isTimeout = error instanceof Error && error.name === 'AbortError';
    console.error('[ExerciseDB] Failed to load:', isTimeout ? 'Request timed out after 15s' : error);
    exercises = [];
    isInitialized = true;
    dbStatus = 'error';
    dbError = isTimeout
      ? 'Download timed out. Check your internet connection.'
      : (error instanceof Error ? error.message : 'Unknown error');
    dbProgress = 0;
  }
}

/**
 * Search exercises by query string.
 * Searches in: name, category, primaryMuscles, equipment.
 * Case-insensitive matching.
 */
export function searchExercises(query: string, limit = 20): Exercise[] {
  if (!isInitialized) {
    console.warn('[ExerciseDB] Not initialized, returning empty array');
    return [];
  }

  const normalizedQuery = query.toLowerCase().trim();
  if (!normalizedQuery) {
    return getAllExercises(limit);
  }

  const results = exercises.filter((exercise) => {
    if (exercise.name.toLowerCase().includes(normalizedQuery)) return true;
    if (exercise.category.toLowerCase().includes(normalizedQuery)) return true;
    if (exercise.primaryMuscles.some((muscle) => muscle.toLowerCase().includes(normalizedQuery))) return true;
    if (exercise.equipment && exercise.equipment.toLowerCase().includes(normalizedQuery)) return true;
    return false;
  });

  return results.slice(0, limit);
}

/**
 * Get all exercises.
 */
export function getAllExercises(limit = 50): Exercise[] {
  if (!isInitialized) {
    console.warn('[ExerciseDB] Not initialized, returning empty array');
    return [];
  }
  return exercises.slice(0, limit);
}

/**
 * Get the current status of the exercise database.
 */
export function getExerciseDbStatus(): {
  status: ExerciseDbStatus;
  count: number;
  error: string | null;
  progress: number;
} {
  return {
    status: dbStatus,
    count: exercises.length,
    error: dbError,
    progress: dbProgress,
  };
}
