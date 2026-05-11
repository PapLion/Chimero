export interface Exercise {
  id: string
  name: string
  category: string
  level: string
  equipment: string | null
  primaryMuscles: string[]
  secondaryMuscles: string[]
  force: string | null
  mechanic: string | null
}

export type ExerciseDbStatus = 'idle' | 'loading' | 'ready' | 'error'

export interface ExerciseDbSnapshot {
  status: ExerciseDbStatus
  count: number
  error: string | null
  progress: number
}
